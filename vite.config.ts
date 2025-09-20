import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// Node 전역에 대한 타입 경고 억제
declare const process: any;

// Sass deprecation warnings silencing for build output cleanliness
// Note: We already migrated code; these silence messages from upstream tooling (legacy-js-api, mixed-decls)
process.env.SASS_SILENCE_DEPRECATIONS = [
  'legacy-js-api',
  'mixed-decls',
].join(',');

// GitHub Actions에서 빌드되는 경우 리포지토리 이름을 base로 사용
// 예: seungyongshim/chatgpt-like -> /chatgpt-like/
// PR 환경의 경우 PR 번호를 포함한 경로 사용 -> /chatgpt-like/pr-123/
const getBasePath = () => {
  if (!process.env.GITHUB_REPOSITORY) {
    // 로컬 개발 환경
    return '/';
  }
  
  const repoName = process.env.GITHUB_REPOSITORY.split('/')[1];
  const baseRepoPath = `/${repoName}/`;
  
  // PR 환경인지 확인 (GITHUB_HEAD_REF는 PR에서만 설정됨)
  // PR_NUMBER는 PR preview workflow에서 설정됨
  if (process.env.GITHUB_HEAD_REF && process.env.PR_NUMBER) {
    return `${baseRepoPath}pr-${process.env.PR_NUMBER}/`;
  }
  
  // 메인 브랜치 또는 기본 환경
  return baseRepoPath;
};

const ghBase = getBasePath();

// 디버그 정보 출력 (빌드 시에만)
if (process.env.NODE_ENV !== 'development') {
  console.log(`🔧 Vite base path: ${ghBase}`);
  if (process.env.PR_NUMBER) {
    console.log(`📋 Building for PR #${process.env.PR_NUMBER}`);
  }
}

export default defineConfig({
  base: ghBase,
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: [
            'react',
            'react-dom',
            'zustand'
          ],
          markdown: [
            'react-markdown',
            'remark-gfm',
            'rehype-highlight',
            'highlight.js'
          ]
        }
      }
    }
  }
})