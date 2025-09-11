## Book-GPT (React SPA)

GitHub Pages 배포는 GitHub Actions 워크플로(`.github/workflows/deploy.yml`)를 통해 자동으로 이루어집니다.

### 주요 명령

````bash
# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 로컬 프리뷰
npm run preview
````

### GitHub Pages 설정 체크리스트

1. Repository Settings > Pages > Build and deployment > Source 를 `GitHub Actions` 로 선택합니다.
2. 워크플로 실행 후 `Deploy to GitHub Pages` job 이 성공하면 Pages URL 이 environment 출력에 표시됩니다.
3. `public/.nojekyll` 파일을 추가해 Jekyll 파이프라인이 불필요하게 SCSS 로딩 경로(`/docs`)를 요구하지 않도록 했습니다.

### `base` 경로

`vite.config.ts` 는 GitHub Actions 환경에서 `GITHUB_REPOSITORY` 를 읽어 자동으로 `/<repo-name>/` 를 `base` 로 설정합니다.

로컬 개발 시에는 `/` 로 동작하며, 커스텀 도메인이나 루트 레벨(Organization pages) 로 배포하려면 수동으로 `base: '/'` 로 고정하거나 환경 변수를 조정하세요.

```ts
// vite.config.ts 발췌
const ghBase = process.env.GITHUB_REPOSITORY
  ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
  : '/';
```

### 오류(Jekyll `No such file or directory /docs`) 원인

Pages 가 예전 설정(정적 Jekyll 빌드) 혹은 별도 워크플로(`actions/jekyll-build-pages`)를 트리거하면서 `_config.yml` 또는 `docs` 디렉터리를 찾으려 했으나 SPA 구조에는 존재하지 않아 실패했습니다. 현재는 전용 Node 빌드 워크플로만 유지하면 됩니다.

해결 조치:
- `.github/workflows/deploy.yml` 만 유지
- `public/.nojekyll` 추가 (완료)
- Settings > Pages > Source 확인
- 과거 Pages 빌드용 브랜치(`gh-pages`)가 있다면 정리(선택 사항)

### 추가 개선 아이디어

- Lighthouse 검사 자동화 (actions/workflow 추가)
- Cache 무효화를 위한 빌드 파일 이름 hash 유지 (기본 Vite 출력 사용 중)
- PR 미리보기: `actions/deploy-pages` 를 PR 환경에 연결하거나 `vercel`/`netlify` 병행

---

MIT License.

---

### VS Code 디버깅 (F5)

`.vscode/` 폴더에 다음 구성이 추가되었습니다.

- `tasks.json`: `vite dev server` (백그라운드 실행, 준비 문구 `ready in ...ms` 감지)
- `launch.json`:
  - `Run & Debug App (Chrome)`: F5 기본 실행으로 Vite + Chrome 디버깅
  - `Run & Debug App (Edge)`: Edge 브라우저에서 동일
  - `Attach to Running Chrome`: 수동으로 `chrome --remote-debugging-port=9222` 실행 후 attach
  - `Vitest Debug (UI)`: 단위 테스트 UI + 인스펙트 모드
  - `Playwright E2E (Debug)`: E2E 테스트 디버그 세션
  - 복합: `App + Playwright`

#### 사용 방법

1. 코드에 브레이크포인트 설정
2. `F5` (기본 Chrome 구성) 실행 → 첫 실행 시 종속성 설치 완료 상태 확인
3. 페이지가 열리고 중단점에서 실행 정지
4. 빠른 재시작: `Ctrl + Shift + F5`

#### Vitest 디버깅

단위 테스트를 작성 후 `Vitest Debug (UI)` 구성 선택 → 테스트 목록/상태를 UI에서 확인하며 브레이크포인트로 코드 흐름 추적.

CLI 스크립트:

```bash
npm run test:unit        # 한 번 실행
npm run test:unit:watch  # 감시 모드
npm run test:unit:ui     # UI 실행
npm run test:unit:debug  # --inspect-brk 포함 (launch.json 사용 권장)
```

#### Playwright E2E 디버깅

`Playwright E2E (Debug)` 구성은 `--debug` 플래그를 지정하여 Inspector UI를 띄웁니다.

#### Attach 시나리오

수동 Attach가 필요한 경우 (예: PWA DevTools 플래그 커스터마이징):

```bash
"C:/Program Files/Google/Chrome/Application/chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:/temp/chrome-debug" http://localhost:5173
```

그 후 `Attach to Running Chrome` 실행.

---
