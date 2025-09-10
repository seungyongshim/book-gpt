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
