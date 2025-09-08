import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { addSystemMessage } from '../stores/chatStore';
import { usePagesStore } from '../stores/pagesStore';
import { useGPTStream } from '../hooks/useGPTStream';
import { buildChatPromptLayer } from '../utils/promptAssembler';
import useActiveEditorContext from '../hooks/useActiveEditorContext';
import { useToastStore } from '../stores/toastStore';

// Simple @ref pattern (e.g., @3, @3-5) extraction (MVP)
const REF_REGEX = /@\d+(?:-\d+)?/g;

const GPTChatPanel: React.FC = () => {
  const { session, append, setMode } = useChatStore();
  const setStreamRunning = useChatStore(s=>s.setStreamRunning);
  const setAbortHandler = useChatStore(s=>s.setAbortHandler);
  const { bookId, pageId, selectionText, pageTail } = useActiveEditorContext();
  const pagesStore = usePagesStore();
  const pushToast = useToastStore(s=>s.push);
  const [input, setInput] = useState('');
  const stream = useGPTStream();
  const listRef = useRef<HTMLDivElement|null>(null);
  const lastLayerRef = useRef<any | null>(null);

  // Debounced stream text for aria-live polite (250ms)
  const [debouncedStreamText, setDebouncedStreamText] = useState('');
  useEffect(()=>{
    if (!stream.running) { setDebouncedStreamText(stream.text); return; }
    const t = setTimeout(()=> setDebouncedStreamText(stream.text), 250);
    return ()=> clearTimeout(t);
  }, [stream.text, stream.running]);

  // auto scroll on new content
  useEffect(()=>{ if(listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [session.messages.length, stream.text]);

  const currentMode = session.mode;

  const parseCommand = (raw: string) => {
    const trimmed = raw.trim();
    const m = trimmed.match(/^\/(assist|extend|ref)\s*(.*)$/);
    if (m) return { mode: m[1] as typeof session.mode, instruction: m[2] || '(개선)' };
    return { mode: session.mode, instruction: trimmed };
  };

  const handleSend = useCallback(async ()=>{
    if (!input.trim()) return;
    if (stream.running) { pushToast({ type:'warn', message:'이전 응답 중입니다.', ttl:3000 }); return; }
    let { mode, instruction } = parseCommand(input);
    // /extend fallback: pageTail 없으면 assist로 강제 전환 (gpt.md 섹션 8 규칙)
    if (mode === 'extend' && !pageTail) {
      mode = 'assist';
      append({ role:'system', content:'`/extend` 모드에 필요한 최근 페이지 tail 이 없어 assist 모드로 대체되었습니다.' });
    }
    if (mode !== session.mode) setMode(mode);
  const selectionHash = selectionText ? hash(selectionText) : undefined;
  append({ role:'user', content: instruction, meta:{ mode, selectionHash } as any });

    // gather reference summaries if /ref with explicit refs
    let referenceSummaries: { ref:string; summary:string }[] | undefined;
    if (mode === 'ref') {
      const refs = instruction.match(REF_REGEX) || [];
      if (refs.length) {
        referenceSummaries = [];
        for (const r of refs.slice(0,10)) { // limit 10 for MVP
          const body = r.replace('@','');
          if (body.includes('-')) {
            const [startS, endS] = body.split('-');
            const start = parseInt(startS,10); const end = parseInt(endS,10);
            if (!isNaN(start) && !isNaN(end) && end >= start && end - start <= 12) { // range size cap
              const bullets: string[] = [];
              for (let i=start;i<=end;i++) {
                const page = pagesStore.pages.find(p=>p.bookId===bookId && p.index===i);
                if (page) {
                  const sum = page.summary || (page.rawContent ? page.rawContent.slice(0,280) : '');
                  if (sum) bullets.push(`- #${i} ${sum.replace(/\n+/g,' ').slice(0,200)}`);
                }
              }
              let merged = bullets.join('\n');
              if (merged.length > 300) merged = merged.slice(0,300) + '…';
              if (merged) referenceSummaries.push({ ref: r, summary: merged });
              continue;
            }
          }
          const num = parseInt(body.split('-')[0],10);
          const page = pagesStore.pages.find(p=>p.bookId===bookId && p.index===num);
          if (page) {
            let summary = page.summary || (page.rawContent ? page.rawContent.slice(0,300) : '');
            if (summary.length > 300) summary = summary.slice(0,300) + '…';
            referenceSummaries.push({ ref: r, summary });
          }
        }
      }
    }
  const layer = buildChatPromptLayer({ mode, selectionText, pageTail, referenceSummaries, instruction });
  lastLayerRef.current = layer;
    // placeholder assistant message (will be appended to as stream arrives)
  const assistantId = append({ role:'assistant', content:'', meta:{ mode, selectionHash } });
    setInput('');
    // 등록: abort 핸들러 / running flag
    setStreamRunning(true);
    setAbortHandler(()=>stream.abort);
    stream.start(layer as any);
  }, [input, selectionText, pageTail, session.mode, append, setMode, stream, pagesStore.pages, bookId, pushToast]);

  // when streaming text updates, patch last assistant message & detect simple actions after stream ends
  useEffect(()=>{
    if (!stream.running && !stream.text) return; // nothing yet
    const msgs = useChatStore.getState().session.messages;
    const last = msgs.filter(m=>m.role==='assistant').slice(-1)[0];
    if (!last) return;
    last.content = stream.text; // mutate then force state update by shallow copy
    if (!stream.running) {
      setStreamRunning(false);
      setAbortHandler(undefined);
      // Simple heuristic: if selection existed -> offer replace, always offer insert
      const actions: any[] = [];
      if (selectionText) actions.push({ type:'replace', label:'치환' });
      actions.push({ type:'insert', label:'삽입' });
      if (/새 페이지|신규 페이지|New Page/i.test(last.content)) actions.push({ type:'newPage', label:'새 페이지 생성' });
      last.actions = actions.length? actions: undefined;
    }
    useChatStore.setState({ session: { ...useChatStore.getState().session, messages: [...msgs] } });
  }, [stream.text, stream.running, selectionText, setStreamRunning, setAbortHandler]);

  // error classification system message (섹션 12)
  useEffect(()=>{
    if (!stream.error) return;
    const code = stream.error;
    let msg = '';
    switch(code){
      case 'auth': msg = '인증 오류: API Key 또는 권한을 확인해주세요.'; break;
      case 'rate-limit': msg = '요청이 너무 빈번합니다. 잠시 후 다시 시도하세요.'; break;
      case 'network-error': msg = '네트워크 오류: 연결을 확인 후 재시도.'; break;
      case 'server': msg = '서버 오류가 발생했습니다. 잠시 후 재시도.'; break;
      case 'aborted': msg = '사용자 중단됨.'; break;
      default: msg = `알 수 없는 오류(${code})`; break;
    }
    const actions = code === 'aborted' ? undefined : ([{ type:'retry', label:'재시도' }] as any);
    append({ role:'system', content: msg, actions: actions as any, meta:{ mode: session.mode, errorType: code } as any });
  }, [stream.error, append, session.mode]);

  const handleAction = async (actionType: string, content: string) => {
    if (!pageId) { pushToast({ type:'warn', message:'페이지 컨텍스트 없음', ttl:3000 }); return; }
    const page = pagesStore.pages.find(p=>p.id===pageId);
    if (!page) return;
    if (actionType === 'retry') {
      if (stream.running) { pushToast({ type:'warn', message:'이미 실행중', ttl:2000 }); return; }
      if (!lastLayerRef.current) { pushToast({ type:'warn', message:'재시도할 레이어 없음', ttl:2500 }); return; }
      // append user 재시도 안내
      append({ role:'system', content:'재시도 중…', meta:{ mode: session.mode } });
      const assistantId = append({ role:'assistant', content:'', meta:{ mode: session.mode } });
      setStreamRunning(true); setAbortHandler(()=>stream.abort);
      stream.start(lastLayerRef.current);
      return;
    }
    if (actionType === 'insert') {
      await pagesStore.preApplySnapshot(page.id, 'user');
      const next = (page.rawContent || '') + '\n' + content;
      await pagesStore.updatePage(page.id, { rawContent: next });
      pushToast({ type:'success', message:'본문에 삽입 완료', ttl:2500 });
    } else if (actionType === 'replace' && selectionText) {
      const raw = page.rawContent || '';
      const msgs = useChatStore.getState().session.messages;
      const relatedUser = [...msgs].reverse().find(m=>m.role==='user' && m.meta?.selectionHash);
      const expectedHash = relatedUser?.meta?.selectionHash;
      if (expectedHash && expectedHash !== hash(selectionText)) {
        addSystemMessage('원본 선택 텍스트가 변경되어 안전 치환을 중단했습니다. (해시 불일치)');
        pushToast({ type:'warn', message:'선택 내용 바뀜', ttl:3000 });
        return;
      }
      // 1) Exact match search
      let replaced = false;
      const exactIdx = raw.indexOf(selectionText);
      if (exactIdx >= 0) {
        await pagesStore.preApplySnapshot(page.id, 'user');
        const next = raw.slice(0, exactIdx) + content + raw.slice(exactIdx + selectionText.length);
        await pagesStore.updatePage(page.id, { rawContent: next });
        replaced = true;
      } else {
        // 2) Normalized whitespace match
        const norm = (s:string)=> s.replace(/\s+/g,' ').trim();
        const normSel = norm(selectionText);
        const normRaw = norm(raw);
        const normIdx = normRaw.indexOf(normSel);
        if (normIdx >= 0) {
          // Fallback: simple snippet heuristic around first 20 chars
          const snippet = selectionText.slice(0, 20);
          const sloppyIdx = raw.indexOf(snippet);
          if (sloppyIdx >= 0) {
            await pagesStore.preApplySnapshot(page.id, 'user');
            const next = raw.slice(0, sloppyIdx) + content + raw.slice(sloppyIdx + selectionText.length);
            await pagesStore.updatePage(page.id, { rawContent: next });
            replaced = true;
          }
        }
      }
      if (!replaced) {
        addSystemMessage('선택 텍스트 치환 실패: 정확/정규화 매칭 모두 실패. 수동 확인 필요.');
        pushToast({ type:'warn', message:'치환 실패', ttl:3000 });
        return;
      }
      pushToast({ type:'success', message:'치환 완료', ttl:2500 });
    } else if (actionType === 'newPage') {
      if (!bookId) return;
      const newPage = await pagesStore.createPage(bookId);
      await pagesStore.updatePage(newPage.id, { rawContent: content });
      pushToast({ type:'success', message:'새 페이지 생성', ttl:2500 });
    }
    // mark last assistant message applied
    const msgs = useChatStore.getState().session.messages;
    const lastAssistant = [...msgs].reverse().find(m=>m.role==='assistant');
    if (lastAssistant) {
      useChatStore.getState().updateMessage(lastAssistant.id, { actions: undefined, meta: { ...lastAssistant.meta, applied: true } as any });
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 text-sm" id="gptChatHeading">
        <span className="font-semibold">GPT Assistant</span>
        <span className="text-xs text-text-dim">mode: {currentMode}</span>
        {stream.running && <span className="ml-auto text-xs text-primary animate-pulse">Streaming...</span>}
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-sm" aria-live="polite" aria-atomic="false">
        {session.messages.map(m=> (
          <div key={m.id} className={m.role==='assistant'? 'bg-surface-alt p-2 rounded-md': m.role==='system'? 'text-text-dim italic':'p-1'}>
            {m.role==='user' && <div className="text-[11px] text-text-dim mb-1">/ {m.meta?.mode}</div>}
            <pre className="whitespace-pre-wrap font-sans leading-relaxed">{m.role==='assistant' && stream.running && m === session.messages.filter(x=>x.role==='assistant').slice(-1)[0] ? (debouncedStreamText || '…') : (m.content || (m.role==='assistant'?'…':'' ))}</pre>
            {m.actions && m.actions.length>0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {m.actions.map(a=> (
                  <button key={a.type} onClick={()=>handleAction(a.type, m.content)} className="px-2 py-0.5 text-[11px] bg-primary/80 hover:bg-primary text-white rounded">
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-border p-3">
        <textarea
          className="w-full resize-none h-24 text-sm bg-surface border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="지시문 또는 /assist /extend /ref"
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={stream.running}
        />
        <div className="flex justify-between mt-2 items-center">
          <div className="text-[11px] text-text-dim">Enter 전송 / Shift+Enter 줄바꿈</div>
          <div className="flex gap-2">
            {stream.running && <button onClick={stream.abort} className="px-3 py-1 text-xs bg-warn text-white rounded">중단</button>}
            <button onClick={handleSend} disabled={!input.trim() || stream.running} className="px-3 py-1 text-xs bg-primary text-white rounded disabled:opacity-50">전송</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPTChatPanel;

// simple string hash (djb2)
function hash(str: string) {
  let h = 5381;
  for (let i=0;i<str.length;i++) h = ((h<<5)+h) + str.charCodeAt(i);
  return (h>>>0).toString(36);
}
