import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="node" />

// GitHub Pages 배포 시 리포지토리 이름을 base 경로로 사용.
// 로컬 개발(dev 서버, preview)에서는 루트('/') 유지.
// GITHUB_ACTIONS 환경에서만 base 적용 (Actions 빌드 시 자동 설정됨).
// Node 환경에서만 존재하는 process 안전 접근 (tsconfig에 node 타입 미포함 상황 대응)
const isCI = (globalThis as any).process?.env?.GITHUB_ACTIONS === 'true';
const repoName = 'book-gpt';

export default defineConfig({
  base: isCI ? `/${repoName}/` : '/',
  plugins: [react()],
});
