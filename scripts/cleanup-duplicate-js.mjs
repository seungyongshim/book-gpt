#!/usr/bin/env node
/**
 * cleanup-duplicate-js.mjs
 *
 * 목적:
 *  - src/ 아래 TypeScript(.ts/.tsx)와 basename이 동일한 legacy .js / .test.js 파일들을 정리.
 *  - 기본은 dry-run (실제 삭제 없음)으로 안전하게 영향 확인.
 *
 * 옵션:
 *  --dry        : (기본) 실제 변경 없이 계획 출력
 *  --yes        : 확인 질문 없이 실행(force)
 *  --empty      : 삭제 대신 파일 내용을 'export {}; // removed' 로 비움 (Git 히스토리 추적 유지)
 *  --keep=<glob>: 특정 경로 패턴(쉼표 구분 다중) 유지(삭제/비우기 제외)
 *  --tests      : *.test.js 도 함께 처리 (기본 포함)
 *  --no-tests   : *.test.js 는 무시
 *  --verbose    : 추가 로그 출력
 *
 * 예시:
 *  node scripts/cleanup-duplicate-js.mjs              # dry-run
 *  node scripts/cleanup-duplicate-js.mjs --yes         # 실제 삭제
 *  node scripts/cleanup-duplicate-js.mjs --empty --yes # 삭제 대신 비우기
 *  node scripts/cleanup-duplicate-js.mjs --keep=src/services/gpt.js --yes
 */

import { readdir, stat, writeFile, rm } from 'fs/promises';
import { resolve, extname, basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');
const SRC = join(root, 'src');

// ---- 옵션 파싱 ----
const args = process.argv.slice(2);
const flags = new Set();
const opts = { keep: [], mode: 'delete', tests: true, verbose: false, dry: true, autoYes: false };
for (const a of args) {
  if (a === '--dry') opts.dry = true;
  else if (a === '--yes') opts.autoYes = true;
  else if (a === '--empty') opts.mode = 'empty';
  else if (a === '--no-tests') opts.tests = false;
  else if (a === '--tests') opts.tests = true;
  else if (a === '--verbose') opts.verbose = true;
  else if (a.startsWith('--keep=')) {
    const globs = a.substring(7).split(',').map(s=>s.trim()).filter(Boolean);
    opts.keep.push(...globs);
  } else if (a === '--help' || a === '-h') {
    console.log('See script header for usage.');
    process.exit(0);
  } else {
    flags.add(a);
  }
}
if (flags.size) {
  console.warn('[WARN] Unknown flags:', [...flags].join(', '));
}

// Simple glob matcher (supports * wildcard only)
function matchSimple(pattern, value) {
  if (pattern === value) return true;
  // escape regex special then replace *
  const re = new RegExp('^' + pattern.split('*').map(p=>p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*') + '$');
  return re.test(value);
}
function isKept(relPath) {
  return opts.keep.some(p => matchSimple(p, relPath));
}

async function walk(dir, acc=[]) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) await walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function rel(p) { return p.replace(root + '\\', '').replace(root + '/', ''); }

function logVerbose(...m){ if (opts.verbose) console.log('[V]', ...m); }

(async function main(){
  // 1. 수집
  const all = await walk(SRC);
  const tsOrTsx = all.filter(f => ['.ts','.tsx'].includes(extname(f)));
  const jsFiles   = all.filter(f => extname(f) === '.js');

  // 2. 베이스명 인덱스 (디렉토리+basename)
  const tsIndex = new Set(tsOrTsx.map(f => dirname(f)+'::'+basename(f, extname(f))));

  // 3. 대상 선별
  const candidates = [];
  for (const jf of jsFiles) {
    const base = basename(jf, '.js');
    const key  = dirname(jf)+'::'+base;
    const relPath = rel(jf);
    const isTest = /\.test\.js$/i.test(jf);
    if (!tsIndex.has(key)) { logVerbose('skip(no ts twin)', relPath); continue; }
    if (!opts.tests && isTest) { logVerbose('skip(test ignored)', relPath); continue; }
    if (isKept(relPath)) { logVerbose('skip(kept)', relPath); continue; }
    candidates.push({ path: jf, rel: relPath, isTest });
  }

  if (!candidates.length) {
    console.log('No duplicate .js files found. Nothing to do.');
    return;
  }

  console.log(`Found ${candidates.length} duplicate JS file(s).`);
  for (const c of candidates) {
    console.log('  -', c.rel, c.isTest ? '(test)' : '');
  }

  if (opts.dry) {
    console.log('\n[DRY-RUN] No changes made. Use --yes to apply (implies non-dry).');
    console.log('Examples:\n  node scripts/cleanup-duplicate-js.mjs --yes\n  node scripts/cleanup-duplicate-js.mjs --empty --yes');
    return;
  }

  if (!opts.autoYes) {
    process.stdout.write(`\nProceed to ${opts.mode === 'delete' ? 'delete' : 'empty'} these files? (y/N) `);
    const answer = await new Promise(r=>{
      process.stdin.setEncoding('utf8');
      process.stdin.once('data', d=> r(d.trim().toLowerCase()));
    });
    if (answer !== 'y' && answer !== 'yes') {
      console.log('Aborted by user.');
      return;
    }
  }

  let removed=0, emptied=0;
  for (const c of candidates) {
    if (opts.mode === 'empty') {
      await writeFile(c.path, "// removed duplicate of TS source\nexport {};\n");
      emptied++;
    } else {
      await rm(c.path, { force: true });
      removed++;
    }
  }
  console.log(`\nDone. Removed: ${removed}, Emptied: ${emptied}`);
})();
