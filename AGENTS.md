## 0. 개요 (Concise Overview)
모바일 우선 React + Vite SPA. OpenAI Chat Completions 호환 GPT 엔드포인트 `http://localhost:4141/v1` 사용.
목표: 장편 소설을 Book → Page 단위로 AI 보조 생성/편집. 핵심 4축:
1) 구조화된 세계관(World Setting) 관리 & 캐시(worldDerived)
2) 다층 Prompt Layer(System / Book / World / Page / Dynamic @References / User Instruction)
3) `@` 참조를 통한 과거 페이지 요약 재활용 (referenceSummaries 캐시)
4) 토큰 예산 기반 자동 축약/재요약 파이프라인 (L0~L4)

용어 정리: `worldDerived` = 세계관 요약 캐시 레코드, 동일 내용을 Tool 레벨에서 `world.summary`로 노출. `referenceSummaries` = 과거 페이지 300자(최대 800자) 요약 캐시.

## 1. 요구사항 (정제)
주요 요구: 모바일 SPA, 세계관 편집, 12K자 수준 장문 페이지 생성, 다층 시스템 프롬프트, @참조 요약 재활용.
추가 요구: Draft/Pub 상태, 캐시 무효화, 토큰 축약 단계, 버전 이력.
비범위: 실시간 협업, 권한 관리, 멀티 디바이스 동기화.
가정: OpenAI 호환 SSE; 한글 12K자 ≈ 6~9K 토큰; 모델 총 context 16K 이상.

## 2. 도메인 모델 (요약)
Book: 식별/메타 + book-level systemPrompt + worldSettingId.
WorldSetting: premise, timeline, geography, factions, characters, magicOrTech, constraints, styleGuide, version.
Page: index, status(DRAFT|PUBLISHED|ARCHIVED), systemPrompt, rawContent, refinedContent, summary, tokens( prompt/completion ), references[], modelMeta, created/updated.
PageVersion: diff + snapshot + author + timestamp.
Caches: worldDerived(요약), referenceSummaries(페이지 요약), settings(tokenCalibration 등).
관계: Book 1-1 WorldSetting / Book 1-N Page / Page 1-N PageVersion / Page N-N Page(간접 @참조).

## 3. 아키텍처 & 저장소
스택: React + Vite, TypeScript, Zustand(로컬 상태) + IndexedDB, Tailwind.
IndexedDB Stores(v1): books, worldSettings, pages, pageVersions, referenceSummaries, worldDerived, settings (미래: embeddings, exports).
쓰기 트랜잭션: 페이지 생성 시 pages + pageVersions 원자.
Partial Flush: 스트림 수신 2K자 단위 저장 → 장애 복구.
압축: >50KB 선택적 LZ-string (`compressed:true`).
보안: 완전 클라이언트 → 민감 정보 입력 지양.

## 4. 페이지 생성 파이프라인
1) Instruction 파싱(@참조) → references[]
2) referenceSummaries 확보(캐시 혹은 생성) & worldDerived 검증/재생성
3) Prompt Layer 합성 + 토큰 예측(estimateTokens + calibration factor)
4) 필요 시 L1~L4 축약 적용
5) GPT SSE 스트림 수신 → partial flush → 완료 시 Page/Version 기록
6) rawContent 요약(summary) 생성 (후순위 자동화) 및 calibration 업데이트

## 5. Prompt Layer & 토큰 전략
레이어 순서: system → bookSystem → worldDerived → pageSystem → dynamicContext(references) → userInstruction.
목표: 프롬프트 ≤ 2,800 tokens (상한 3,000), 본문 11,500~12,000자.
축약 레벨:
L0 원본 / L1 저우선 참조 50% / L2 worldDerived 1200→800자 / L3 참조 120자 bullet / L4 pageSystem 핵심 bullet.
초과 지속 시 사용자 경고 & 참조 제거 UI.
토큰 추정 보정: settings.tokenCalibration (0.7~1.3) 이동 평균.

## 6. `@` 참조 구문
형식: `@3`, `@3-5`, `@p:slug`, 혼합 가능. 범위 최대 15페이지. 중복 병합, 순환(자기) 참조 차단. 누락 slug 경고.
파서 출력: { cleanedText, references:[{pageId, weight}] }.

## 7. Tool & Orchestrator (핵심 스키마)
공통 입력: { query, select?, constraints? }
공통 결과: { tool, payload, tokensEstimated, compressionLevel? }
Tools:
- world.summary: premise, timelineKeyEvents[], factions[], geography, magicRules, constraints[], styleInfluence
- references.context: { requested[], resolved:[{ref,summary,priority}], compressionApplied }
- style.guide: narrationPOV, tone, sentencePacing, dictionRules[], prohibited[], preferredPatterns[]
- ethics.checklist: violence, sexual, discrimination, sensitive[], metaPolicy
- characters.lookup (후속): characters[{id,name,role,traits[],secret?,currentState,arcProgress?}]
오케스트레이션: 필요 툴 계획 → 호출 → 토큰 예산 평가 → 선택적 재요약 (Level1~3) → 최종 PromptLayer 조합.

## 8. 토큰 절약 규칙 (요약)
1) world.summary 1200자 상한 → 초과 시 bullet 압축(800자)
2) 참조 기본 300자, 저우선 150자
3) 긴 참조: 앞/중간/끝 분절 650자 → 필요 시 400자 하이브리드
4) 초과 시 레벨 순차 적용, L4 후에도 초과면 제거 후보 안내.

## 9. 에지 케이스 & 품질 (핵심 10)
1 Draft 참조 표기
2 순환 참조 차단
3 토큰 초과 단계 로그
4 세계관 대규모 수정 후 톤 경고
5 스트림 중단 후 partial 복구
6 조기 종료 이어쓰기 옵션
7 Quota 근접: 압축→PageVersion GC→알림
8 다중 탭 충돌: lastWrite 비교
9 Import 스키마 차이: 마이그레이션 실행
10 손상 참조: 건너뛰고 경고 리스트

## 10. 백로그 (압축)
P1: G1 SSE, G2 Partial Flush, G3 worldDerived, G4 referenceSummaries, G5 TokenMeter, G6 Prompt Preview, V1 Version List, V2 Diff, V3 Rollback, U2 Toast, Q2 referenceParser Tests.
P2: G7 Compression UI, G8 @Highlight, V4 Refined Editor, V5 Auto Page Summary, W1 Wizard 확장, W2 world.summary Tool, W3 references.context Tool, W4 style/ethics merge, C1 Token Calibration, C2 재요약 구현, P1 Export, P2 Import, U1 Common Components, U3 Shortcuts, U4 Focus Trap, Q3 promptAssembler Test, Q4 ESLint CI, W5(일부 P3 이전?), Tool Orchestrator MVP(W6) → 착수 전 핵심 캐시 안정.

## 11. 구현 규칙 & Done Definition
1 P1 선행 후 P2 (테스트 예외 병행 가능)
2 새 store 필드 추가 시 MIGRATIONS.md 갱신
3 Token/Prompt 변경 시 promptAssembler 테스트 스냅샷 업데이트
4 생성 호출 로그(요약 길이/레벨) 구조화 저장 (품질 지표)
Done: 타입 오류 0, 빌드 성공, 주요 Happy Path 수동 검증, 문서 2~5줄 요약 반영.

## 12. GPT 모듈 통합 (요약)
단일 진입점 `services/gptClient.ts`: streamChat, generateFromPromptLayer, classifyGPTError. 기존 `generatePage` 는 shim. 토큰 추정 중앙화(promptAssembler). 향후: 실제 usage 등장 시 calibration 직접 반영. JS 스텁 제거 예정.

## 13. 향후 로드맵 (요약)
Phase 2: Wizard 전체, references.context + world.summary Tool, Prompt Compression UI.
Phase 3: characters.lookup, style.guide, ethics.checklist, Embeddings(v3), 챕터 구조.
Phase 4: Consistency & Style Drift Agents, Plot Suggestions, 고급 Orchestrator.

## 14. 샘플 PromptLayer JSON
```json
{
	"system": "Global safety + Korean novel guidelines",
	"bookSystem": "장르: 다크 판타지. 1인칭 현재형 유지.",
	"worldDerived": "<세계관 요약 1200자 이내>",
	"pageSystem": "이번 페이지는 주인공의 첫 전투 장면 집중",
	"dynamicContext": [
		{"ref": "@1", "summary": "..."},
		{"ref": "@2-3", "summary": "..."}
	],
	"userInstruction": "주인공의 숨겨둔 공포를 점층적으로 드러내며 12,000자 분량 작성"
}
```

---
문서 축약 버전: 중복/장황 서술 제거, 핵심 정책/파이프라인/백로그 식별 가능 상태 유지.

## 4. 프롬프트 전략 & 토큰 관리
### 계층 합성 순서
1. system: 글로벌 안전규칙 (콘텐츠 정책, 언어 스타일 공통)
2. bookSystem: 책 고유 톤, 시점, 장르
3. worldDerived: WorldSetting을 1200~1800자 요약 (캐싱, 변경 시 재생성)
4. pageSystem: 페이지별 특수 요구(예: 전투 중심, 감정 강조)
5. dynamicContext: @참조 페이지들의 요약/발췌 (중요도 점수 기반 정렬)
6. userInstruction: 사용자 직접 프롬프트

### @참조 문법
패턴:
- `@3` 단일 페이지
- `@3-5` 연속 범위
- `@p:slug` 슬러그 지정
- 혼합: `@1 @p:intro @7-9`

파이프라인:
1. 정규식 스캔 → 토큰 리스트
2. id/slug 해석 → Page summary 로드 (없으면 요약 생성)
3. 중요도 산출 (최근성, 명시적 강조 태그, 사용자 수동 weighting)
4. 예산 토큰 내 배분 (우선순위 → 길이 축소)
5. dynamicContext 블록 생성

### 토큰/길이 정책
- (전략 목표) 페이지 본문 11,500~12,000자 (출판 전 사용자 편집 고려 3~5% 버퍼)
- 프롬프트(컨텍스트+지시) ≤ 2,800 토큰 목표 (상한 3,000)
- 남은 컨텍스트 여유는 모델 총 컨텍스트 한도(예: 16K) 대비 동적으로 재평가 (모델 교체 대비 방어적 설계)

### 토큰 절약 전략
1. world.summary 캐시(`worldDerived`) 최대 1,200자 → 초과 시 우선 bullet 재압축(800자)
2. 참조 기본 300자, 낮은 우선순위는 150자 단계 다운스케일
3. 긴 참조: 앞 300 / 중간 요약 200 / 끝 150 (650자 상한) → 초과 시 400자 하이브리드 요약
4. 길이 계산 순서: (system 계층) → world.summary → dynamicContext → userInstruction
5. 축약 레벨 동작
   - L0: 원본
   - L1: 저우선 참조 50% 축소
   - L2: world.summary 1,200→800자
   - L3: 모든 참조 120자 이하 bullet
   - L4: pageSystem bullet 핵심화
6. L4 후에도 초과 → 사용자 경고 + 참조 제거 UI
7. 스트리밍 시 10K자 돌파 예상 시 사용자 인터럽트 옵션 노출

#### (신규) 혼합 언어 토큰 추정 & 적응형 보정
MVP 이후 개선된 휴리스틱(`estimateTokens` in `promptAssembler`)은 언어/문자 종류 비율과 엔트로피(혼합도), 긴 ASCII 연속, 숫자+단위 패턴, 연속 구두점 묶음을 반영하여 추정 정밀도를 향상시켰다. 

보정(calibration) 파이프라인:
1. 페이지 생성 호출 시 프롬프트 레이어 추정 토큰 계산
2. 스트리밍 완료 후 본문 문자 길이 → 한글 중심 가중치(0.95)로 completion 근사
3. (프롬프트추정 + completion근사) / (기존 추정 합) 비율을 이동 평균(α=0.15)으로 반영
4. 결과 factor는 `settings` store (`key=tokenCalibration`)에 저장, 0.7~1.3 범위 클램프
5. 앱 초기화 시 로드되어 미래 추정에 즉시 적용

향후: 실제 모델 usage(토큰 수)가 응답에 포함될 경우 직접 ratio 계산으로 교체 예정.

### 품질용 메타 프롬프트 패턴
```
You are a professional Korean novel writing assistant.
Follow hierarchical rules in order; later rules must not violate earlier constraints.
Return only story content without meta commentary.
```

## 5. UI 플로우 & 컴포넌트
### 주요 화면
1. Book List (책 선택/생성)
2. World Builder (탭/위저드: Premise, Characters, Factions, Rules, Style)
3. Book Dashboard (페이지 목록, 검색, 필터: Draft/Published)
4. Page Editor (좌: 설정/참조 선택, 우: 생성 결과/수정 패널)
5. Prompt Preview (합성된 프롬프트 가시화, 토큰 카운터)
6. Version Diff Viewer

### 컴포넌트 구조 (요약)
- `BookCard`, `WorldSettingWizard`, `PageList`, `PageItem`, `PageEditor`, `ReferencePicker`, `PromptLayerPanel`, `TokenMeter`, `StreamingOutput`, `VersionTimeline`, `DiffView`

### 상태 다이어그램 (텍스트)
Page 상태: DRAFT -> (Publish Action) -> PUBLISHED -> (Archive) -> ARCHIVED
WorldSetting: Editing -> Saving -> Stable (변경 시 worldDerived 재생성 대기 플래그)

## 6. 특수 툴 설계
### @참조 파서
입력: 사용자 Instruction 문자열
출력: { cleanedText, references: [{type:'page', id, weight}] }
규칙:
- 중복 참조 병합 (weight 누적)
- 범위 확장 시 최대 페이지 수 제한 (예: 15)
- 슬러그 미존재 시 경고

### World Builder Wizard 단계
1. Premise (한 문단 핵심)
2. Core Conflict / Theme
3. Characters (주요 인물 카드: 이름/역할/비밀)
4. Factions & Power Structures
5. Setting (지리/문화/기술/마법 규칙)
6. Timeline (시대/사건 리스트)
7. Style Guide (어조/금지 표현/서술 시점)
8. Validation & Summarize (요약 캐시 생성)

자동 요약 생성: 변경된 섹션만 재요약 → worldDerived merge

### Prompt Preview Tool
- 각 계층을 아코디언으로 열람
- 토큰 바 (예: used 5,200 / budget 8,000)
- 초과 위험 시 단계적 축약 솔루션 제안 UI

### Versioning
- refinedContent 저장 시 이전 refinedContent 대비 diff 계산 → PageVersion append
- 롤백: 선택 snapshot을 현재 draft로 복구 + 새 버전 기록(행위 추적)

## 7. 에지 케이스 & 품질
에지 케이스 (주요 13선)
1. Draft 참조: 요약 포함 가능하나 상태 표시
2. 순환 참조: 1단계 깊이에서 중복 차단
3. 토큰 초과: 축약 로그 단계별 표기
4. 세계관 대규모 수정: 기존 페이지 톤 일치성 경고
5. 스트리밍 중 네트워크 단절: partial flush로 복구 가능
6. 조기 종료(목표 분량 미달): 이어쓰기 후속 호출 옵션
7. IndexedDB Quota: 압축 → 오래된 PageVersion GC → 경고
8. 다중 탭 충돌: lastWrite 비교 후 수동 merge
9. 손상 JSON: snapshot 롤백
10. Import 스키마 차이: 마이그레이션 러너 실행
11. Tool 타임아웃: 최소 필수 축약 fallback(world 300 + style 핵심)
12. Tool 재계획 루프: 2회 제한 후 중단 플래그
13. 손상/삭제 참조 페이지: 건너뛰고 경고 목록

품질 전략
- Lint Prompt: 금지 표현 필터
- Consistency Check: 주요 인물 속성 변이 탐지 (간단 규칙→향후 embedding)
- Auto Summary 재검증: 길이/중복 문장 제거
- 저장 전 TokenMeter 재계산(드리프트 방지)
- Storage Fault Handler: write 실패 시 단계별 폴백 (압축 → GC → 사용자 알림)
- Periodic Snapshot: 일일 1회 전체 export 자동 생성 (사용자 opt-in)

## 8. 로드맵
MVP (Phase 1)
- Book CRUD, WorldSetting 기본 5필드
- Page 생성 + 스트리밍 + @단일/범위 참조 요약
- Prompt Preview, TokenMeter
- Version 저장 (최소)

Phase 2
- World Wizard 전체 단계 확장
- Diff Viewer + 롤백 UI
- 참조 가중치 UI (중요도 수동 조정)
- world.summary 부분 갱신 / referenceSummaries 캐시 확장 (Schema v2)
- Tool Orchestrator 1차(world.summary + references.context)

Phase 3
- Embedding 기반 유사 페이지 추천 (Schema v3: embeddings)
- 협업 코멘트, 다국어 전환 준비(i18n layer)
- 챕터(Section) 계층
- Tool Orchestrator 2차(characters.lookup + style.guide + ethics.checklist)

Phase 4
- Consistency Agent (인물 사실 검증)
- Style Drift Detector
- 플롯 자동 제안
- Orchestrator 고도화(Drift 재요약 + 정책 교정 Loop)

## 9. 로컬 데이터 액션 (현행)
모든 조작은 클라이언트 함수/스토어 액션으로 처리.

스토어 인터페이스 (개념 / Promise):
- listBooks(): BookMeta[]
- createBook(payload): Book
- updateBook(id, patch)
- getWorld(bookId): WorldSetting
- updateWorld(bookId, patch) → worldDerived 무효화 플래그
- listPages(bookId, filter?): PageMeta[]
- createPage(bookId, draftInstruction) → @파싱 → PromptLayer → 스트림 저장
- updatePage(pageId, patch)
- saveRefined(pageId, refinedContent) → diff → PageVersion
- getVersions(pageId): PageVersion[]
- rollbackVersion(versionId)
- exportAll() / importAll(json)

GPT 호출 유틸:
- `generatePage(promptLayer, onToken)` → SSE 처리, 길이 감시(>11,500자 경고)

선택적 향후 백엔드(BFF) (로드맵 Phase Future):
- 목적: API 키 보호, 서버 측 요약 캐시, 임베딩 인덱스
- 예상 엔드포인트: 이전 섹션의 API 스케치 재활용
 
IndexedDB 트랜잭션 원칙:
- createPage: pages + pageVersions 원자 커밋 (실패 시 전체 rollback)
- rollbackVersion: 복구 후 새 버전 append (역사 유지)
- exportAll: read-only 커서 순회 → 메모리 집계 → Blob(JSON)

에러 처리 패턴:
- NotFound: 목록 재로딩 안내
- Duplicate slug: 자동 번호 후행 부여
- QuotaError: 압축 → 재시도 → 오래된 PageVersion GC → 안내

## 10. 데이터 예시 (PromptLayer 합성)
```json
{
	"system": "Global safety + Korean novel guidelines",
	"bookSystem": "장르: 다크 판타지. 1인칭 현재형 유지.",
	"worldDerived": "<압축된 세계관 요약 1500자>",
	"pageSystem": "이번 페이지는 주인공의 첫 전투 장면 집중",
	"dynamicContext": [
		{"ref":"@1","summary":"..."},
		{"ref":"@2-3","summary":"..."}
	],
	"userInstruction": "주인공이 숨겨둔 공포를 점층적으로 드러내며 12,000자 분량 작성"
}
```

## 11. 보안 & 성능
- OpenAI Key 서버측 보관, 프론트는 세션 토큰
- Rate Limit: 사용자당 분당 n회, 초과 시 429
- Streaming: 서버 SSE -> 클라이언트 incremental append
- 캐시: worldDerived + page summaries (LRU)

## 12. 테스트 전략(개략)
- 파서 단위 테스트(@참조 패턴, 중복/범위/슬러그)
- PromptLayer 합성 스냅샷 테스트
- 토큰 예산 시뮬레이션 (가짜 길이 매핑)
- 회귀: WorldSetting 변경 → 캐시 무효

## 13. 최종 요구 매핑
- 모바일 React SPA → 섹션 3, 5
- 세계관 설정 도구 → 섹션 6 Wizard
- 12K자 페이지 생성 → 섹션 3, 4 (토큰 전략)
- @참조 파서 → 섹션 4, 6
- 다층 시스템 프롬프트 → 섹션 4, 15
- GPT 엔드포인트 연동 → 섹션 3, 9

## 14. 향후 확장 아이디어

본 문서는 초기 설계 초안이며 구현 중 검증/조정 과정을 거쳐 갱신된다.

## 15. Tool Interface & Orchestrator (World / Guides 활용)
모델이 단순 컨텍스트 주입이 아닌 “도구 호출” 개념으로 세계관 요소(월드 요약, 인물 정보, 스타일 가이드, 윤리/검열 가이드)를 선택적으로 질의·압축 후 본문 생성에 활용하도록 하는 추상 계층.

### 목적
- 거대한 세계관/인물 데이터 전체를 매번 프롬프트에 실지 않고 필요한 조각만 on-demand 조회
- 인물/스타일/윤리 정책을 명확한 구조화 응답(JSON)으로 재확인 → 드리프트 감시
- 2-Phase Generation: (A) 정보 수집 / 정렬 → (B) 본문 생성

### Tool 추상 구조
Common Shape:
```ts
interface ToolCallInput {
	query: string;              // 호출 목적/설명 (모델이 스스로 생성 or 시스템 지시)
	select?: string[];          // 필드 선택 (예: ['characters.main','style.tone'])
	constraints?: Record<string, any>; // 길이/요약 레벨 등
}

interface ToolCallResult {
	tool: string;               // tool 이름
	usageHint?: string;         // 후속 프롬프트 삽입시 참고 코멘트(메타)
	payload: any;               // 구조화 데이터 (아래 툴별 스키마 참고)
	tokensEstimated: number;    // 삽입 예상 토큰 추정
	compressionLevel?: number;  // 0=원본, 1=요약, 2=강압축
}
```

### 툴 목록 및 스키마 (worldDerived 캐시를 활용하는 world.summary 중심)
1. `world.summary`
```json
{
	"premise": "...",
	"timelineKeyEvents": [ {"year":"...","event":"..."} ],
	"factions": [ {"name":"...","goal":"..."} ],
	"geography": "핵심 지리 300자",
	"magicRules": "주요 규칙 bullet",
	"constraints": ["금지 표현 A","금지 설정 B"],
	"styleInfluence": "세계관이 문체에 주는 영향 간단 설명"
}
```

2. `characters.lookup`
```json
{
	"characters": [
		{"id":"char_1","name":"...","role":"주인공","traits":["침착","내성적"],"secret":"...","currentState":"최근 사건 후 정서"},
		{"id":"char_2","name":"...","role":"조력자","traits":["경박","충성"],"arcProgress":"행동 변화 단계"}
	]
}
```

3. `style.guide`
```json
{
	"narrationPOV": "1인칭 현재형",
	"tone": "어둡고 점층적 긴장",
	"sentencePacing": "중요 장면 짧은 문장, 전환부는 중간 길이",
	"dictionRules": ["과도한 영어 표현 금지","고유명사 첫 등장 설명"],
	"prohibited": ["직접적 선정 묘사", "현대 슬랭"],
	"preferredPatterns": ["감각 3중 묘사(시각/청각/촉각)"]
}
```

4. `ethics.checklist`
```json
{
	"violence": {"allowedLevel":"중간","notes":"불필요한 고문 장면 금지"},
	"sexual": {"allowedLevel":"암시적","notes":"세부 묘사 배제"},
	"discrimination": {"filter":"혐오/차별 직접 발화 우회 서술"},
	"sensitive": ["아동 피해 직접 묘사 금지"],
	"metaPolicy": "정책 위반 요소 감지 시 완곡 재구성"
}
```

5. `references.context`
```json
{
	"requested": ["@3","@5-6"],
	"resolved": [
		 {"ref":"@3","summary":"300자 요약","priority":0.9},
		 {"ref":"@5-6","summary":"550자 합산 요약","priority":0.7}
	],
	"compressionApplied": false
}
```

### Orchestrator 단계 (Phase 2~4 확장 경로 반영)
1. Instruction 파싱 → @참조, 키워드(전투/감정/복선 등) 추출
2. Tool Plan 작성 (필요 툴: world.summary, characters.lookup(등장 인물 후보), style.guide, ethics.checklist, references.context)
3. 순차 또는 병렬 호출 (우선 world & style, 이후 characters/ref)
4. Tool 결과 집계 → 토큰 예산 평가 → 필요 시 재요약(compressionLevel 증가)
5. 최종 PromptLayer 조합:
```
system + bookSystem + worldDerived(또는 world.summary 결과) + style.guide + ethics.checklist 압축 + dynamicContext(references.context) + pageSystem + userInstruction
```
6. 모델 최종 생성 호출 (stream) → 결과 저장

### 압축/재요약 정책
- 각 ToolCallResult는 `tokensEstimated` 기반 정렬 후 예산 초과 시 낮은 우선순위 결과부터 요약 레벨 증가
- 재요약 시 요약 규칙:
	- Level 1: 구문 단순화, 문장 60% 유지
	- Level 2: bullet 형태, 핵심 noun phrase만
	- Level 3: 필드 축소 (예: characters → name+role+currentState만)

### 실패/복구 전략
- 툴 호출 실패(IndexedDB 읽기 오류) → 재시도 1회 → fallback: 빈 구조 + 경고 플래그
- 재요약 실패(토큰 측정 불가) → 보수 추정치(문자 길이/1) 재계산
- 순환 호출 방지: Tool Plan 최대 2회 재계획 제한

### Edge Integration
- WorldSetting 대규모 수정 시 다음 첫 Tool Plan에 `world.summary` 강제 재호출 플래그
- 인물 속성 변화 감지 시(이전 snapshot diff) → `characters.lookup` 결과에 `changed:true` 필드 부가

### 로드맵 반영 추가
- Phase 2: Tool Orchestrator MVP (world.summary + references.context)
- Phase 3: characters.lookup + style.guide + ethics.checklist 통합
- Phase 4: 자동 Drift Detector → 재요약 자동 트리거 + 정책 위반 자가 교정

### 예시 Tool 호출 시퀀스(Log 형태)
```
[Plan] tools=[world.summary, references.context, style.guide]
[Call] world.summary (compression=0) → 870 tokensEstimated
[Call] references.context (@3,@4-5) → 620 tokensEstimated
[Call] style.guide → 190 tokensEstimated
[Budget] total=1680 (<3000 OK)
[Assemble] Final prompt tokens≈2450 (body allowance ≈ 9550)
```

### 장점
- 재사용 가능한 구조화 레이어 → 미래 다국어/분석 에이전트 확장 용이
- 토큰 낭비 감소 (선택적/우선순위 기반 삽입)
- 품질/일관성 모듈화(윤리/스타일 검증 별도 확장 쉬움)

### 구현 우선순위 (정리)
1. references.context (@파서 재사용)
2. world.summary (캐시: worldDerived)
3. style.guide / ethics.checklist (정적 + 사용자 편집 병합)
4. characters.lookup (태깅 UI 이후)
5. 재요약 파이프라인 (compressionLevel 증가 로직)

## 16. Implementation Backlog (Post-MVP 세부 작업)
본 섹션은 현재 코드베이스(MVP 스켈레톤) 대비 향후 구현해야 할 구체 과업을 Phase / Theme 별로 정리한 실행 백로그이다. 각 아이템은 (우선순위: P1>P2>P3) 및 간단한 완료 기준(Acceptance Criteria)을 포함한다.

### 16.1 Core Generation & Context (Phase 1 확장)
| ID | Task | Priority | Acceptance Criteria |
|----|------|---------|---------------------|
| G1 | OpenAI 호환 SSE 연동 (`services/gpt.ts`) | P1 | 실제 엔드포인트로 fetch; Stream 완료 후 done 이벤트; AbortSignal 지원 |
| G2 | Partial Flush 저장 | P1 | 2,000자 단위 `rawContent` 업데이트; 새로고침 후 이어보기 가능 |
| G3 | worldDerived 생성 로직 | P1 | WorldSetting 변경 후 최초 페이지 진입 시 요약 재생성; 캐시 레코드 `worldDerived` 저장 |
| G4 | referenceSummaries 생성 | P1 | 참조 페이지 없을 시 원문 → 300자 요약 생성 후 캐시 저장 |
| G5 | TokenMeter 컴포넌트 | P1 | 프롬프트 레이어별 길이/총합/예산(기본 3000) 표기, 초과 시 경고 배지 |
| G6 | Prompt Preview Drawer | P1 | Layer Accordion + Raw text 복사 버튼 + TokenMeter 연동 |
| G7 | Compression Suggestions | P2 | 예산 초과 시 L1~L4 전략 버튼 노출, 적용 후 토큰 재계산 |
| G8 | Instruction @참조 하이라이트 | P2 | textarea 내 매칭 토큰 스타일 적용 (단축키 팔레트 준비) |

### 16.2 Versioning & Editing
| ID | Task | Priority | Acceptance Criteria |
|----|------|---------|---------------------|
| V1 | PageVersion 목록 조회 | P1 | 특정 pageId에 대한 time-desc 정렬 목록 렌더 |
| V2 | Diff 계산 (jsdiff) | P1 | 선택한 두 snapshot 간 추가/삭제/변경 마크업 표시 |
| V3 | 롤백 기능 | P1 | 선택 버전 snapshot을 현재 draft(raw/refined 중 정의)로 복구 + 새 버전 append |
| V4 | refinedContent 편집기 | P2 | 별도 textarea & 저장 시 diff 생성 |
| V5 | 자동 페이지 요약 | P2 | 생성 완료 후 rawContent → 1차 요약 300~400자 저장 |

### 16.3 World / Characters / Tools (Phase 2~3)
| ID | Task | Priority | Acceptance Criteria |
|----|------|---------|---------------------|
| W1 | World Wizard 확장 (8단계) | P2 | Premise~Validation 단계 UI 전환, 진행률 표시 |
| W2 | world.summary Tool Wrapper | P2 | Tool 호출 형태로 worldDerived 반환 + tokensEstimated 계산 |
| W3 | references.context Tool | P2 | 파서 결과 + 요약 압축 결과 JSON shape 제공 |
| W4 | style.guide / ethics.checklist 정적 병합 | P2 | 사용자 스타일 입력 + 기본 정책 merge 후 Prompt 삽입 |
| W5 | characters.lookup (기본) | P3 | Characters 필드(간단 JSON) 파싱 후 등장 후보 목록 필드화 |
| W6 | Tool Orchestrator MVP | P3 | 선택된 Tool 호출 로그 패널 표시, 실패/재시도 로직 |

### 16.4 Compression & Token Strategy
| ID | Task | Priority | Acceptance Criteria |
|----|------|---------|---------------------|
| C1 | 토큰 추정 계수 보정 | P2 | 실제 usage vs 추정값 기록 후 이동평균 보정 factor 적용 |
| C2 | L1~L4 재요약 구현 | P2 | 선택 레벨 적용 시 worldDerived / references text 길이 감축률 기록 |
| C3 | 축약 로그 기록 | P3 | 각 페이지 생성 시 어떤 레벨이 적용되었는지 메타 저장 |

### 16.5 Persistence & Export
| ID | Task | Priority | Acceptance Criteria |
|----|------|---------|---------------------|
| P1 | Export All (JSON zip) | P2 | 버튼 클릭 → 모든 store dump → Blob 다운로드 |
| P2 | Import (Schema v1) | P2 | JSON 선택 → 구조 검증 → 삽입(중복 ID 충돌 시 재할당) |
| P3 | Quota 경고 & GC | P3 | 용량 추정 > 80% 시 경고 토스트 + 오래된 PageVersion 30% 삭제 옵션 |

### 16.6 UI/UX & A11y
| ID | Task | Priority | Acceptance Criteria |
|----|------|---------|---------------------|
| U1 | 공통 Button/Panel 컴포넌트 | P2 | 코드 중복 ≥3곳 제거, Story-like 문서 주석 |
| U2 | Toast 시스템 | P1 | 성공/오류/경고 3색 + 자동 dismiss, aria-live=polite |
| U3 | Keyboard Shortcuts | P2 | Ctrl+Enter 생성, Alt+P 프롬프트, Ctrl+K 참조 팔레트 |
| U4 | Focus Trap (Drawer/Modal) | P2 | Tab 순환, ESC 닫기 |
| U5 | Light/Dark 토글 | P3 | 로컬 스토리지 theme 저장 |

### 16.7 Observability & Quality
| ID | Task | Priority | Acceptance Criteria |
|----|------|---------|---------------------|
| Q1 | 간단 로깅 래퍼 | P2 | generation 시작/완료/에러 콘솔+메모리 구조 기록 |
| Q2 | referenceParser 테스트 | P1 | 경계(@1-100 초과, 중복, slug) 6케이스 통과 |
| Q3 | promptAssembler 스냅샷 테스트 | P2 | 레이어 조합 결과 Jest 스냅샷 3개 |
| Q4 | ESLint + CI 워크플로우(yml) | P2 | push 시 tsc & lint 통과 배지 |
| Q5 | 성능 측정(간단) | P3 | 페이지 생성 평균 ms (stream 시작까지) 로깅 |

### 16.8 Future (얼리 메모)
| ID | Task | Priority | Acceptance Criteria |
|----|------|---------|---------------------|
| F1 | Embeddings (Schema v3) | Backlog | referenceSummaries → 벡터 인덱스 별도 store |
| F2 | Consistency Agent Stub | Backlog | 인물 속성 diff 감지 후 경고 패널 |
| F3 | 스타일 드리프트 감시 | Backlog | 최근 5 페이지 문체 특성 비교 결과 배지 |
| F4 | 다국어 i18n Layer | Backlog | 라벨 키-값 JSON + 언어 전환 상태 저장 |

### 16.9 진행 규칙
1. P1 항목을 완수하기 전 P2 착수 금지 (병렬 가능 예외: 단위 테스트 작성).
2. Tool Orchestrator(MVP) 이전에 worldDerived / references.context 파이프라인 안정화.
3. 각 생성 호출 로그(요약 길이·축약 단계)를 구조화 저장 → 향후 품질 지표로 활용.

### 16.10 Done Definition (공통)
- 타입 오류 0, 빌드 성공, 기본 happy path 수동 테스트 OK
- 신규 store 필드 추가 시 마이그레이션 전략 문서(AGENTS.md 섹션 3 보강) 반영
- 문서화: README 또는 AGENTS.md 내 해당 기능 2~5줄 기술

> 본 백로그는 구현 진행에 따라 재우선순위화(Reprioritization) 가능하며, 완료 항목은 CHANGELOG 혹은 별도 Release Notes로 이동 권장.

## 16.a GPT 모듈 통합 (Refactor 기록)
### 배경
기존 GPT 연동 로직이 `services/gpt.ts`(generatePage), `services/gptClient.ts`(streamChat), 두 훅(`useGPTStream`, `usePageGeneration`)과 중복 토큰 추정 유틸(여러 곳의 단순 char*0.9)로 분산되어 유지보수 비용이 증가.

### 변경 요약 (2025-09-07)
1. 단일 진입점: `services/gptClient.ts`
	- `streamChat` (SSE 파서)
	- `generateFromPromptLayer` (예전 `generatePage` 대체 high-level 래퍼)
	- `classifyGPTError` 에러 분류 기능
2. `services/gpt.ts` 는 Deprecated shim (`generatePage` -> `generateFromPromptLayer` 위임)
3. JS 이중 소스 제거: `.js` 파일은 TS 재-export 스텁으로 단순화 (향후 제거 가능)
4. 토큰 단순 추정 로직 중앙화: `promptAssembler.estimateCompletionTokens` (= `simpleCharTokenEstimate`) 사용
5. 훅 정리:
	- `useGPTStream` 중복 추정 함수 제거 → 공용 estimator 사용
	- `usePageGeneration` 는 wrapper 교체 (`generatePage` → `generateFromPromptLayer`)
6. 신규 테스트: `src/services/gptClient.test.ts` 스트리밍/에러/추정 검증

### 마이그레이션 가이드
| 이전 | 이후 | 비고 |
|------|------|------|
| `import { generatePage } from 'services/gpt'` | (그대로 동작) | 내부 위임, 점진 제거 예정 |
| `streamChat` 직접 사용 | 유지 | 권장: 필요 시 wrapper 없이 바로 사용 |
| 직접 char*0.9 계산 | `estimateCompletionTokens(chars)` | `promptAssembler` 재사용 |

### 제거 예정 (추후 PR)
- JS 스텁 (`gpt.js`, `gptClient.js`) 완전 삭제
- `generatePage` shim 제거 및 검색/교체 자동화 스크립트

### 추가 고려 (Backlog)
- 실제 모델 usage 토큰 등장 시: wrapper 내부에서 calibration 자동 업데이트 (현재는 completion length *0.95 근사 사용)
- 스트림 중 중간 메타(usage.partial) 지원 시 확장 포인트 마련

### 테스트 포커스
- SSE 조각 경계 분할(line buffering) 안정성
- 에러 상태 코드(401/429/500) 분류 회귀 테스트 필요 시 추가

---

## 17. Generic GPT Client Reuse (추가 메모)
`src/services/gptClient.ts`에 범용 스트리밍 클라이언트를 도입하여 기존 `generatePage` 로직을 내부적으로 재사용하도록 리팩터링하였다. 이제 다음과 같이 어디서든 간단히 사용 가능:

```ts
import { useGPTStream } from '../hooks/useGPTStream';

const gpt = useGPTStream();
gpt.start({ system: '컨텍스트', userInstruction: '질문 또는 작성 지시' });
```

필드 단위(예: WorldBuilder 각 섹션)에서 즉석 AI 제안을 받고 적용할 수 있으며, PromptLayer 또는 직접 messages 배열( `directMessages: true` 옵션 )을 전달해도 된다.

### 17.1 Reusable GPTComposer UI
`src/components/GPTComposer.tsx`는 어떤 화면에서도 동일한 인터랙션 패턴(지시문 입력 → 스트리밍 표시 → 적용)을 빠르게 붙일 수 있는 범용 UI 래퍼이다.

간단 사용 예:
```tsx
<GPTComposer
	seed={currentText}
	buildPrompt={(instr)=>({ system: '도움말', userInstruction: instr + '\n현재:' + currentText })}
	onApply={(newText)=> setCurrentText(newText)}
	initialInstruction="더 구체적으로 개선"
	compact
	showTokenApprox
/> 
```

WorldBuilder는 각 필드별로 이 컴포넌트를 토글 렌더하여 재활용 구현.

### 17.2 모델 & 온도 선택 (신규)
`GPTComposer`는 이제 사용자에게 모델과 temperature(창의성) 값을 직접 선택할 수 있는 UI를 제공한다.

추가 Props:
```
defaultModel?: string;                 // 기본 모델 (기본값 'gpt-4o-mini')
modelOptions?: string[];               // 드롭다운에 표시할 모델 리스트
defaultTemperature?: number;           // 초기 temperature (기본 0.8)
showTemperature?: boolean;             // 슬라이더/입력 표시 여부 (기본 true)
onConfigChange?: (cfg:{model:string;temperature:number})=>void; // 변경 콜백
```

예시:
```tsx
<GPTComposer
	modelOptions={["gpt-4o-mini","gpt-4o","gpt-4.1"]}
	defaultModel="gpt-4o-mini"
	defaultTemperature={0.7}
	onConfigChange={(c)=> console.log('cfg', c)}
	buildPrompt={(instr)=>({ system:'테스트', userInstruction: instr })}
	onApply={(text)=> console.log(text)}
/>
```

선택된 `model` / `temperature`는 내부적으로 `useGPTStream({ model, temperature })`에 전달되어 `gptClient` 호출 시 `chat/completions` 요청 payload에 반영된다.


