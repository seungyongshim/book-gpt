import { useEffect, useState } from 'react';
import { usePagesStore } from '../stores/pagesStore';
import { useWorldStore } from '../stores/worldStore';
import { useLocation, useParams } from 'react-router-dom';

interface ActiveEditorContext {
  bookId?: string;
  pageId?: string;
  selectionText?: string;
  pageTail?: string;
  worldDirtyFlag?: boolean;
}

const MAX_SELECTION = 1500;
const TAIL_LEN = 800;

export function useActiveEditorContext(): ActiveEditorContext {
  const { bookId } = useParams<{ bookId: string }>();
  const location = useLocation();
  const pages = usePagesStore(s=>s.pages);
  const worldDirty = useWorldStore(s=>s.worldDerivedInvalidated);
  const [selectionText, setSelection] = useState<string | undefined>();
  const [pageTail, setTail] = useState<string | undefined>();
  const [pageId, setPageId] = useState<string | undefined>();

  // selection listener
  useEffect(()=>{
    const handler = () => {
      const sel = window.getSelection?.();
      if (!sel || sel.rangeCount === 0) return setSelection(undefined);
      const text = sel.toString();
      if (!text) return setSelection(undefined);
  if (text.length <= MAX_SELECTION) return setSelection(text);
  const head = text.slice(0, 600);
  const tail = text.slice(-600);
  setSelection(head + '\n…\n' + tail);
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, []);

  // detect current page index from route (/:bookId/pages/:pageIndex)
  useEffect(()=>{
    const match = location.pathname.match(/\/books\/(.+?)\/pages\/(\d+)/);
    if (match) {
      const idx = parseInt(match[2], 10);
      const page = pages.find(p=>p.bookId===bookId && p.index===idx);
      if (page) {
        setPageId(page.id);
        const raw = page.rawContent || '';
        if (raw) setTail(raw.slice(-TAIL_LEN)); else setTail(undefined);
      }
    } else {
      setPageId(undefined); setTail(undefined);
    }
  }, [location.pathname, pages, bookId]);

  return { bookId, pageId, selectionText, pageTail, worldDirtyFlag: worldDirty };
}

export default useActiveEditorContext;
