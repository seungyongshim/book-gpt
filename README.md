## Book-GPT (React SPA)

GitHub Pages 배포는 GitHub Actions 워크플로(`.github/workflows/deploy.yml`)를 통해 자동으로 이루어집니다.

> 참고: 레거시 Jekyll 빌드가 트리거되어 실패하던 이슈를 방지하기 위해 `public/.nojekyll` 파일과 placeholder `docs/` 디렉터리가 추가되었습니다. Pages Source 를 `GitHub Actions` 로 설정하면 Jekyll 파이프라인은 사용되지 않으므로 추후 `docs/` 삭제 가능.

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
3. `public/.nojekyll` 이 존재하여 Jekyll 파이프라인을 우회합니다 (SPA 폴더 구조 유지). 제거해도 동작은 하나, 레거시 Pages 설정이 남아있는 경우 안전장치가 됩니다.

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
- `.github/workflows/deploy.yml` 에 `actions/configure-pages` + `upload-pages-artifact` + `deploy-pages` 구성 사용
- Settings > Pages > Source 가 `GitHub Actions` 인지 확인
- 중복되던 Jekyll 빌드(기본 `docs/` 경로 기대)를 유발하는 다른 워크플로/설정 제거
- 과거 Pages 빌드용 브랜치(`gh-pages`)가 있다면 정리(선택 사항)
- (임시 안전장치) 빈 `docs/` 디렉터리 & `public/.nojekyll` 추가

### PR 미리보기 배포

Pull Request가 생성되거나 업데이트될 때 자동으로 미리보기 배포가 생성됩니다.

- **워크플로**: `.github/workflows/pr-preview.yml`
- **배포 방식**: Netlify (추천) 또는 다른 preview 서비스
- **미리보기 URL**: PR별 고유 URL 생성
- **자동 정리**: PR이 닫히면 관련 배포 정보가 정리됩니다

#### PR 미리보기 작동 방식

1. PR 생성/업데이트 시 `pr-preview.yml` 워크플로가 트리거됩니다
2. `vite.config.ts`에서 `GITHUB_HEAD_REF`와 `PR_NUMBER` 환경변수를 감지하여 PR 전용 base 경로(`/book-gpt/pr-123/`)를 설정합니다
3. 빌드된 파일들이 preview 서비스에 배포됩니다
4. 봇이 PR에 실제 미리보기 URL이 포함된 댓글을 자동으로 작성합니다
5. PR이 닫히면 정리 작업이 수행됩니다

#### 배포 서비스 설정

**Netlify 사용 (추천):**
1. Netlify 계정 생성 및 사이트 연결
2. Repository Secrets에 추가:
   - `NETLIFY_AUTH_TOKEN`: Netlify personal access token
   - `NETLIFY_SITE_ID`: Netlify site ID
3. PR 생성 시 자동으로 preview URL 생성

**대안:**
- Vercel, Surge.sh, Firebase Hosting 등 다른 서비스 사용 가능
- GitHub Pages 환경 분리 (복잡함, 한 번에 하나의 배포만 가능)

#### 현재 상태

현재 PR preview 워크플로는 **빌드 검증만** 수행합니다. 실제 배포를 위해서는:
1. 외부 배포 서비스 설정 (Netlify 등)
2. 해당 서비스의 credentials을 repository secrets에 추가
3. 워크플로에서 실제 배포 단계 활성화

> **참고**: GitHub Pages는 repository당 하나의 활성 배포만 지원하므로, PR 미리보기를 위해서는 외부 서비스 사용을 권장합니다.

### 추가 개선 아이디어

- Lighthouse 검사 자동화 (actions/workflow 추가)
- Cache 무효화를 위한 빌드 파일 이름 hash 유지 (기본 Vite 출력 사용 중)

---

MIT License.

---

### 함수 호출(툴) 기능

모델이 대화 중 특정 작업이 필요하다고 판단하면 로컬에 등록된 "툴"(함수)을 호출하여 결과를 다시 컨텍스트로 주입한 뒤 후속 응답을 생성합니다. 현재 데모용으로 두 가지 툴이 제공됩니다.

- `get_current_time`: 현재 UTC 시간을 ISO 문자열로 반환
- `echo`: 전달된 `text` 값을 그대로 반환

구현 개요:
1. `src/services/toolService.ts` 에 로컬 툴 정의 (`LocalToolDefinition[]`).
2. `chatService.getResponseStreaming` 이 OpenAI Chat Completions API 호출 시 `tools` 배열을 포함.
3. 모델이 tool call 을 생성하면 JSON arguments 스트리밍을 조립한 뒤 각 툴을 실행하고 `role: 'tool'` 메시지를 내부 히스토리에 추가.
4. UI 렌더링에서는 `role: 'tool'` 메시지를 숨겨 사용자는 자연스러운 어시스턴트 응답만 확인.

확장 방법:
```ts
// toolService.ts 내 localTools 배열에 항목 추가
{
  name: 'get_weather',
  description: '주어진 도시의 현재 날씨를 조회',
  parameters: {
    type: 'object',
    properties: { city: { type: 'string', description: '도시명 (예: Seoul)' } },
    required: ['city']
  },
  execute: async ({ city }) => {
    // 실제 API 연동 또는 mock
    return { city, tempC: 23, condition: 'Sunny' };
  }
}
```

추가한 뒤 재빌드하면 모델이 필요 시 `get_weather` 를 호출할 수 있습니다 (프롬프트에서 사용자가 날씨를 묻고, 모델이 스키마를 인식해야 호출 가능 — 모델 특성상 항상 100% 호출 보장은 아님).

테스트: `src/services/__tests__/toolService.test.ts` 에 기본 동작 검증 포함.

---

### 입력 히스토리 (ArrowUp 지원)

채팅 입력창이 비어있을 때 키보드 `ArrowUp / ArrowDown` 으로 과거에 전송한 사용자 입력을 순환 탐색할 수 있습니다.

구현 개요:
- 저장소: IndexedDB (`chat_input_history` 오브젝트 스토어) — 브라우저가 차단된 경우 세션 메모리 fallback
- 중복 방지: 직전 입력과 동일하면 저장하지 않음
- 최대 저장 개수: 300 (초과 시 가장 오래된 항목부터 제거)
- 프리로드: 최근 200개를 메모리에 적재하여 즉시 탐색
- 전송 성공 시(사용자 메시지 전송) 현재 입력을 기록

사용 방법:
1. 새로운 입력을 여러 번 전송
2. 입력창 내용을 모두 지워 빈 상태로 둔 뒤 `ArrowUp` → 가장 최근 입력부터 역순 표시
3. `ArrowDown` → 다시 최신 방향으로 이동, 시작 지점(-1)으로 돌아오면 빈 문자열

추가 예정(옵션):
- Settings 패널에 "입력 히스토리 저장 비활성화" 토글
- 다중 탭 동기화 (BroadcastChannel)
- 히스토리 검색 패널 (단축키)

테스트: `src/components/Chat/__tests__/inputHistory.test.ts` 에 기본 동작 (기록/중복/Prune) 검증 포함.

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
