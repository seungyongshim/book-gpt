<!--
	gpt.md
	중앙 GPT 어시스턴트 / Chat / Prompt Layer 경량 설계 문서
	최신 상태: 2025-09-08
	이 문서는 `AGENTS.md`의 거대 맥락 중 "전역 GPT 상호작용" 부분을 분리·요약한 운영 가이드입니다.
-->

# GPT 통합 문서 (재작성)

## 0. Changelog (최근 3회)
| Date | Type | Summary |
|------|------|---------|
| 2025-09-08 | rewrite | 문서 구조 전면 재정비 (컴포넌트/모드/오류/접근성/백로그 재정렬) |
| 2025-09-07 | feature | `/assist /extend /ref` 모드 + selection/pageTail 컨텍스트 스트리밍 연동 |
| 2025-09-06 | init | Floating GPT FAB + 기본 chat panel 골격 추가 |

> 더 오래된 변경은 `git log -- gpt.md` 참고. 주요 시스템 레이어 변화는 `AGENTS.md` 우선 기록.

## 1. 목적(Purpose)
앱 어디서든 호출 가능한 단일 GPT 패널을 통해: (1) 선택 텍스트 개선, (2) 이어쓰기, (3) 과거 페이지 요약 참조 기반 변형을 신속히 수행. 페이지 생성 파이프라인과 동일한 공용 스트림/토큰 추정 경로를 재사용해 품질/일관성을 확보.

## 2. 범위(Scope)
MVP 포함:
1. Floating FAB + 단일 세션 Chat
2. `/assist`, `/extend`, `/ref` 명령 파서
3. 선택 텍스트 & 페이지 tail 자동 컨텍스트 수집
4. 참조(@id / @a-b) 요약 캐시 로딩 (존재시)
5. 응답 결과: 삽입 / 치환 / 새 페이지 생성 액션

비포함(후속/별도 문서): 멀티 세션, 고급 Tool Orchestrator (world/style/ethics/characters), 세션 Export/Import, 고급 토큰 압축 UI.

## 3. 상위 연계 (Cross References)
- 전체 Prompt/토큰 전략: `AGENTS.md` 섹션 4, 5
- World / Reference Summaries 캐시 정의: `AGENTS.md` 섹션 2, 3
- GPT 클라이언트 단일 진입점: `src/services/gptClient.ts`
- Prompt 조립 공통: `src/utils/promptAssembler.ts`, `promptToMessages.ts`

## 4. 아키텍처 개요
```
User → FloatingGPTButton → GPTOverlay(GPTChatPanel) → chatStore (Zustand)
	 ↘ useActiveEditorContext() ──┐
																├─ prompt builder (모드별 ChatPromptLayer)
Page/World Stores (pagesStore, worldStore) ────────┘

ChatPromptLayer → promptToMessages → gptClient.streamChat (SSE) → useGPTStream Hook → UI incremental render
```
단일 세션(MVP)은 메모리 상주. 새로고침 시 초기화 허용 (undo 등은 페이지 버전 기능 활용).

## 5. 주요 컴포넌트 / 책임
| Component | Responsibility | Notes |
|-----------|----------------|-------|
| `FloatingGPTButton` | 패널 열기/닫기, 이동 위치 저장 | dragging / localStorage key `fab:pos` |
| `GPTOverlay` | 포털 + dim + ESC 닫기 | 접근성 focus trap 예정(A11) |
| `GPTChatPanel` | 메시지 목록 + 입력/명령 파서 | /명령 → mode 설정 |
| `ContextChipsBar` | 현재 수집된 context 표시/토글 | book/page/selection/reference count |
| `chatStore` | 단일 세션 상태(Zustand) | persist 제외 (후속 B26) |
| `useActiveEditorContext` | selection/pageTail/inferred refs 수집 | 1.5K 선택 상한, tail 800자 |
| `useGPTStream` | SSE 관리/Abort | gptClient 래퍼 |
| Action Chips | 삽입/치환/새 페이지 생성 | 휴리스틱 파싱 결과 |

## 6. 상태 모델
```ts
interface ChatMessage { id:string; role:'user'|'assistant'|'system'; content:string; meta?:{ mode?:ChatMode; applied?:boolean; errorType?:string } }
type ChatMode = 'assist'|'extend'|'ref';
interface ChatContext { bookId?:string; pageId?:string; selection?:string; references?:string[]; worldDirty?:boolean; pageTail?:string; }
interface ChatSession { id:string; mode:ChatMode; messages:ChatMessage[]; context:ChatContext; createdAt:number; }
interface ChatStore { session:ChatSession; setMode(m:ChatMode):void; setContext(p:Partial<ChatContext>):void; append(msg:ChatMessage):void; replaceMessage(id:string, patch:Partial<ChatMessage>):void; reset():void; }
```
Persist 필요 시: localStorage snapshot + message length cap (최신 N=80) 고려.

## 7. 컨텍스트 수집 규칙
- selection: 1,500자 초과 → 앞 600 + '…' + 끝 600 (문자 경계 유지)
- pageTail: 현재 페이지 `rawContent` 끝 800자 (상수 `EXTEND_CONTEXT_TAIL_CHARS`)
- references: instruction 내 `@` 패턴 파싱 & 요약 캐시 존재 시 attach
- worldDirty: worldSetting 변경 플래그 → 향후 /world 모드 재요약 트리거 힌트

## 8. 명령(/) 모드
| Mode | Trigger | Context Blocks | 실패 Fallback |
|------|---------|----------------|---------------|
| assist | (기본) 혹은 `/assist` | selection(optional) | 없음 |
| extend | `/extend` | pageTail 필수 | assist |
| ref | `/ref` | reference summaries | assist |

파싱: `/(assist|extend|ref)\b` 선두 매치 후 remainder → userInstruction. 미매치면 `assist`.

## 9. Prompt Layer (경량)
```ts
interface ChatPromptLayer {
	system: string;            // 전역 안전/스타일 최소 규칙
	contextBlocks: string[];   // selection, pageTail, references bullet 등
	userInstruction: string;   // 사용자가 입력한 remainder
}
```
기본 system 패턴:
```
You are a focused Korean novel writing assistant.
Return only content unless explicitly asked for explanation.
Follow given context strictly without contradicting earlier facts.
```
`promptToMessages(layer)` → [{role:'system',content:...}, {role:'user',content: contextJoin + '\n\n지시:\n' + userInstruction}]

## 10. 스트리밍 & 수명주기
1. 사용자 입력 → 명령 파싱 → ChatMessage(user) append
2. PromptLayer 구성 → messages 변환 → `useGPTStream.start`
3. SSE chunk 수신 시 assistant 진행 메시지 업데이트
4. 완료 시 최종 assistant 메시지 확정 + 액션 후보 산출
5. Abort: 현재 controller abort → system 메시지 기록

Partial flush는 page 생성 경로에서만 필요; chat은 메모리 유지 (장문 이어쓰기에도 tail만 사용하므로 저장 부담 낮음).

## 11. 응답 액션 (적용 로직)
휴리스틱:
- selection 존재 & assistant 전체가 개선안(코드블록 1개 또는 일반 텍스트) → 치환
- selection 없음 & pageTail 모드(extend) → 현재 페이지 rawContent 뒤 append
- 헤더 `# 새 페이지` / `새 페이지:` / length > 4K & selection 없음 → 새 페이지 생성
적용 시:
1) pagesStore 업데이트
2) rollback 보존 필요 시(후속 B24) 사전 snapshot
3) 적용 성공 후 assistant 메시지 meta.applied=true 패치

## 12. 오류 & 예외 처리
오류 분류(`classifyGPTError` 결과 매핑):
| type | UX 처리 |
|------|---------|
| auth | system 메시지 + 재설정 안내 |
| rate_limit | 재시도 버튼 + 지연 제안 |
| network | 임시 오류 안내 + retry |
| aborted | 사용자 중단 로그 |
| server | fallback assist 안내 |

재시도는 마지막 user 메시지 + 동일 PromptLayer 재구성. assistant 실패 메시지는 유지.

## 13. 접근성 (A11y) 계획
- Focus Trap: panel open 시 첫 interactive → 마지막 → 순환
- ESC: overlay 닫기; 스트리밍 중이면 한번 ESC=Abort, 두번째 ESC=닫기 (확인 토스트?)
- aria-live: 스트리밍 텍스트 영역 `aria-live=polite` (chunk flood 완화 위해 250ms debounce)
- 키보드: `Ctrl+Enter` 전송, `Alt+Shift+.` 패널 토글 (충돌 미검출 단축키)

## 14. 보안 / 프라이버시
- API Key 클라이언트 저장 회피 (현재 로컬 개발 모드 제외) → 서버 프록시 도입 시 전환
- 전송 로그 민감 세계관 비밀 포함 가능 → 추후 redaction 옵션(키워드 마스킹) 검토
- 로컬 세션 persist 도입 시 PII/비밀 필터 리스트 적용

## 15. 성능 고려
- 단일 세션이므로 메모리 메시지 수 ≥ 120 시 oldest 20 제거 (후속 B26)
- selection truncate & reference summaries 재사용으로 prompt 폭 최소화
- Abort 후 즉시 GC: stream controller nullify

## 16. 백로그 (이 문서 관점)
### Near (A*)
| ID | 작업 | 설명 |
|----|------|------|
| A11 | Focus Trap & ARIA | 접근성 핵심(포커스 순환, 라벨) |
| A12 | FAB 진행 인디케이터 | 패널 닫힘 중 상태 가시화 |
| A13 | 선택 치환 정밀도 | selection hash+range 검증, 실패시 diff 미리보기 |
| A14 | 참조 요약 고도화 | 범위(@3-6) 분해 + 캐시 병합 + 길이 스케일 |
| A15 | 오류 메시지 강화 | 유형별 재시도/가이드 컴포넌트화 |

### Phase 2 (B*)
| B21 | /world 모드 | worldDerived 섹션 선택 요약/개선 |
| B22 | /style 모드 | styleGuide 규칙 위반 탐지 + 교정 |
| B23 | /summarize | 길이 파라미터 기반 다단 요약 |
| B24 | Undo Snapshot | 적용 전 페이지 버전 snapshot 자동화 |
| B25 | 명령 자동완성 | '/' 입력시 suggestion palette |
| B26 | 세션 persist | localStorage + 오래된 메시지 prune |

### Phase 3+ (C*)
| C31 | 멀티 세션 탭 | 병렬 컨텍스트 저장/전환 |
| C32 | Tool Orchestrator | world/style/refs 동적 계획 |
| C33 | /diff 모드 | 선택 vs 제안 diff 하이라이트 |
| C34 | /tonecheck | 최근 N 페이지 문체 편차 분석 |
| C35 | 세션 Export | JSON 구조화 내보내기 |

### Deferred / 재평가
- 고급 토큰 압축 UI (L1~L4) 전면화
- 혼합언어 세밀 추정(call-by-call calibration) UI 노출

## 17. 마이그레이션 & 확장 노트
| 변경 예정 | 영향 | 대응 |
|-----------|------|------|
| 다중 세션 구조 | chatStore 스키마 변화 | sessionList[], activeId 추가, persist 전략 | 
| Tool Orchestrator 편입 | PromptLayer 확장 | contextBlocks → typed blocks (world/style/etc) | 
| Undo Snapshot | 액션 적용 경로 | pagesStore.preApplySnapshot(pageId) 필요 | 
| Persist 도입 | 개인정보 처리 | redaction hook + allow list | 

## 18. 품질 체크리스트 (Done Definition - Chat 기능)
1. 타입 오류 0 (tsc)
2. 선택 1.5K 자 초과 시 truncation 정상 (앞/뒤 유지)
3. `/extend` tail 미존재 → system 경고 후 assist fallback
4. Abort → 1초 내 controller 해제 & no further chunks
5. 치환 적용 후 메시지 meta.applied=true 설정
6. 오류 분류 5유형(auth/rate/network/aborted/server) 시나리오 수동 테스트

## 19. 예시 Prompt Layer(JSON)
```json
{
	"system": "You are a focused Korean novel writing assistant.",
	"contextBlocks": ["선택된 텍스트:\n...", "참조 요약:\n- @3 ..."],
	"userInstruction": "문장의 긴장감을 높여 다듬어줘"
}
```

## 20. 향후 측정 지표(옵셔널)
- 응답 평균 대기(ms) (입력→첫 토큰)
- 평균 Abort 비율
- selection 치환 실패율
- /ref 모드 평균 참조 수 & 평균 요약 길이
- 적용 후 manual rollback 비율 (Undo 도입 후)

---
문서 유지 원칙: 간결(≤ ~400 줄), 중복 최소화, 심층 토큰/도구 전략은 `AGENTS.md`에만 존재. 변경 시 Changelog 상단 1줄 추가.
