# Book GPT (MVP Skeleton)

React + Vite 기반 장편 서사 생성 도구의 최소 골격입니다. (세계관/페이지/참조/프롬프트 계층화 설계 반영)

## 실행

```bash
npm install
npm run dev
```

## GitHub Pages 배포 (SPA)

이 리포지토리는 GitHub Actions를 통해 `main` 브랜치 푸시에 자동으로 GitHub Pages에 배포되도록 구성되어 있습니다.

### 설정 요약
- 워크플로: `.github/workflows/deploy.yml`
- 빌드 도구: Vite (`npm run build` → `dist/`)
- Pages URL: `https://<OWNER>.github.io/book-gpt/`
- Vite `base` 경로: CI 환경(`GITHUB_ACTIONS=true`)에서만 `'/book-gpt/'` 적용

### 수동 트리거
GitHub Actions 탭에서 `Deploy SPA to GitHub Pages` 워크플로를 선택 후 `Run workflow`.

### SPA 404 처리
GitHub Pages는 라우팅이 없는 경로 새로고침 시 404를 반환합니다. 해결을 위해 빌드 후 `scripts/postbuild.cjs`가 `dist/index.html`을 `dist/404.html`로 복사하도록 구성되었습니다.

`package.json`:
```jsonc
{
	"scripts": {
		"build": "tsc -b && vite build",
		"postbuild": "node scripts/postbuild.cjs"
	}
}
```
로컬에서 직접 실행하려면:
```powershell
npm run build; node scripts/postbuild.cjs
```

### 로컬 미리보기
```bash
npm run build
npm run preview
```

### 커스텀 도메인 (옵션)
`dist/CNAME` 파일을 생성하는 스텝을 워크플로에 추가하면 커스텀 도메인 사용 가능.


## 주요 폴더
- `src/types/domain.ts` 도메인 타입
- `src/db/database.ts` IndexedDB 초기화 & 헬퍼
- `src/stores/*` Zustand 상태 (책/세계관/페이지)
- `src/utils/referenceParser.ts` @참조 파서
- `src/utils/promptAssembler.ts` 프롬프트 합성 & 토큰 추정
- `src/services/gpt.ts` OpenAI Chat Completions 호환 SSE 스트리밍
- `src/hooks/usePageGeneration.ts` 생성 훅

## 환경 변수 (.env)

`.env.example` 참고:
```
VITE_OPENAI_API_KEY=sk-xxxx (선택: 프록시/BFF 사용 시 미설정)
VITE_OPENAI_BASE_URL=http://localhost:4141/v1
```

## 구현 현황 (설계 문서 대비)
- SSE 스트리밍 연동 (Chat Completions) 완료
- 기본 PromptLayer → system/user 메시지 변환 (`gpt.ts` 내부)
- Page 최초 생성 시 빈 버전 기록
- VersionTimeline & DiffView (단어 기반 diff)
- 페이지 slug & 제목 편집 UI
- 페이지 버전 diff JSON 캐시 (PageVersion.diff)
- Abort(중단) 기능
- 404 SPA fallback

### GPTComposer Chat Mode (신규)
`GPTComposer`는 이제 단일 지시문 생성뿐 아니라 간단한 채팅 인터페이스로도 사용할 수 있습니다.

```tsx
import { GPTComposer } from './src/components/GPTComposer';

<GPTComposer
	chatMode
	chatSystem="You are a helpful Korean writing assistant."
	initialMessages={[{ role:'assistant', content:'안녕하세요! 무엇을 도와드릴까요?' }]}
	onMessagesChange={(msgs)=> console.log('chat messages', msgs)}
	chatApplyStrategy="last"
	buildPrompt={(instr)=>({
		system: 'fallback system (chatMode에서는 직접 messages 사용)',
		userInstruction: instr
	})}
	onApply={(text)=> console.log('적용 내용', text)}
/>
```

주요 props:
- `chatMode`: true 시 채팅 UI 활성화 (PromptLayer 대신 전체 대화 기록을 직접 전송)
- `chatSystem`: 시스템 지침 (대화 기록 첫 메시지로만 내부에서 사용, 트랜스크립트에는 미표시)
- `initialMessages`: 최초 사용자/어시스턴트 메시지 배열
- `chatApplyStrategy`: `last` (마지막 assistant) 또는 `allAssistantMerged`
- `onMessagesChange`: 메시지 변경 시 콜백

단일 모드와 병행 사용 시 조건부 렌더링으로 선택 가능합니다.

## 향후 작업
- PromptLayer → messages 유틸 분리(export)
- worldDerived / referenceSummaries 캐시 & TTL
- Token 예측 개선 및 레이어별 토큰 UI
- 요약/축약 레벨 전략 구현

## 라이선스
MIT
