// Copy index.html to 404.html for GitHub Pages SPA fallback (TODO Quick Win)
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const dist = join(process.cwd(), 'dist');
const src = join(dist, 'index.html');
const dest = join(dist, '404.html');
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