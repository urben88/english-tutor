#!/usr/bin/env node
/**
 * Lab performance check with Lighthouse against the Core Web Vitals budget.
 * Uses `npx lighthouse` (downloaded on demand) and a local Chrome. Lab data only: INP is approximated by Total Blocking Time.
 *
 * Usage: node tools/audit-perf.mjs <url> [--desktop]
 * Exit code 1 when LCP > 2.5 s, CLS > 0.1 or TBT > 200 ms; 2 when Lighthouse cannot run.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const url = argv.find((a) => !a.startsWith('--'));
if (!url) {
  console.error('Usage: node tools/audit-perf.mjs <url> [--desktop]');
  process.exit(2);
}
const out = join(mkdtempSync(join(tmpdir(), 'lh-')), 'report.json');
const preset = argv.includes('--desktop') ? ['--preset=desktop'] : [];
const run = spawnSync(
  'npx',
  ['--yes', 'lighthouse', url, '--only-categories=performance', '--output=json', `--output-path=${out}`, '--chrome-flags=--headless', '--quiet', ...preset],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);
if (run.status !== 0) {
  console.error('Lighthouse failed. Install Chrome and make sure the URL is reachable.');
  process.exit(2);
}
const report = JSON.parse(readFileSync(out, 'utf8'));
const a = report.audits;
const metrics = {
  LCP: { value: a['largest-contentful-paint'].numericValue / 1000, unit: 's', limit: 2.5 },
  CLS: { value: a['cumulative-layout-shift'].numericValue, unit: '', limit: 0.1 },
  TBT: { value: a['total-blocking-time'].numericValue, unit: 'ms', limit: 200 },
};
let failed = false;
for (const [name, m] of Object.entries(metrics)) {
  const ok = m.value <= m.limit;
  if (!ok) failed = true;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${m.value.toFixed(name === 'CLS' ? 3 : 2)}${m.unit} (limit ${m.limit}${m.unit})`);
}
console.log(`Performance score: ${Math.round(report.categories.performance.score * 100)}`);
process.exit(failed ? 1 : 0);
