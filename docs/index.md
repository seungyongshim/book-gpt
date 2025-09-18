---
layout: none
---

# SPA 배포 안내

이 리포지토리는 React + Vite SPA 입니다. 정적 사이트 빌드는 `npm run build` 로 생성된 `dist/` 디렉터리를 GitHub Actions (`.github/workflows/deploy.yml`)가 Pages에 업로드합니다.

`docs/` 디렉터리는 과거 Jekyll Pages 빌드를 시도하는 워크플로 / 설정에서 발생하는 `No such file or directory` 오류를 무해화하기 위한 placeholder 입니다.

> 권장: Repository Settings > Pages > "Build and deployment" Source 를 반드시 `GitHub Actions` 로 설정하고, 다른 Jekyll 관련 워크플로는 제거하세요.

이 파일은 CI 오류 제거 후 언제든 삭제 가능합니다.
