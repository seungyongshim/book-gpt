// Copy index.html to 404.html for GitHub Pages SPA fallback (TODO Quick Win)
// Using CommonJS syntax because file extension is .cjs while project type is module.
const { copyFileSync, existsSync } = require('node:fs');
const path = require('node:path');

const dist = path.join(process.cwd(), 'dist');
const src = path.join(dist, 'index.html');
const dest = path.join(dist, '404.html');
try {
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log('[postbuild] 404.html created');
  } else {
    console.warn('[postbuild] index.html not found');
  }
} catch (e) {
  console.error('[postbuild] failed:', e);
  process.exitCode = 1;
}