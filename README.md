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
GitHub Pages는 라우팅이 없는 경로 새로고침 시 404를 반환합니다. 해결을 위해 `index.html`을 복사한 `404.html`을 제공하는 방법을 사용할 수 있습니다. (현재 워크플로에는 미포함)

추가하려면 빌드 후 스크립트 예:
```bash
cp dist/index.html dist/404.html
```
필요 시 `package.json`에:
```jsonc
"scripts": {
	"postbuild": "cp dist/index.html dist/404.html"
}
```
Windows PowerShell 호환:
```powershell
Copy-Item dist/index.html dist/404.html
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
- `src/services/gpt.ts` (모의) 스트리밍 생성
- `src/hooks/usePageGeneration.ts` 생성 훅

## 추후 작업 (설계 문서 대비)
- 실제 OpenAI 호환 Chat Completions SSE 연동
- worldDerived 캐시 생성 & 무효화 파이프라인
- referenceSummaries 요약 생성 로직
- TokenMeter & Prompt Preview UI
- VersionTimeline 실제 데이터 조회 & Diff
- 압축/축약 레벨 알고리즘

## 라이선스
MIT
