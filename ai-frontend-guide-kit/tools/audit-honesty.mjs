#!/usr/bin/env node
/**
 * Static scan for deceptive-pattern tells in UI source (no dependencies).
 * Heuristic: it flags things to review, it does not prove intent.
 *
 * Usage: node tools/audit-honesty.mjs [dir ...] [--strict] [--json]
 * Default dirs: src app pages components public index.html (those that exist).
 * --strict exits 1 when any "high" finding exists.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXT = new Set(['.html', '.htm', '.tsx', '.jsx', '.vue', '.svelte', '.astro', '.mdx']);
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'ai-frontend-guide-kit', 'ai-frontend-output']);

export const RULES = [
  { id: 'fake-scarcity', severity: 'high', pattern: /\bonly\s+\d+\s+(left|remaining|spots?|seats?)\b/i, why: 'Scarcity claim; must be backed by real inventory data.' },
  { id: 'urgency-copy', severity: 'medium', pattern: /\b(hurry|last chance|offer ends (in|soon)|limited[- ]time|act now|don'?t miss out)\b/i, why: 'Urgency copy; remove unless the deadline is real and shown.' },
  { id: 'confirmshaming', severity: 'high', pattern: /\bno thanks,?\s*i\s*(don'?t|do not|hate|prefer|like|would rather|already)\b|\bi'?ll pay full price\b/i, why: 'Decline option worded to shame the user.' },
  { id: 'prechecked-extra', severity: 'high', pattern: /<input[^>]*type=["']checkbox["'][^>]*\b(defaultChecked|checked)\b/i, why: 'Pre-checked checkbox; paid or data-sharing options must be opt-in.' },
  { id: 'placeholder-proof', severity: 'high', pattern: /\b(lorem ipsum|john doe|jane doe|acme (corp|inc))\b/i, why: 'Placeholder text/testimonials must not ship as social proof.' },
  { id: 'unverified-metric', severity: 'medium', pattern: /\btrusted by\s+\d[\d,.]*\+?|\b\d[\d,.]*\+?\s+(happy )?(customers|users|teams)\b/i, why: 'Metric claim; verify it is real and sourced.' },
  {
    id: 'consent-asymmetry',
    severity: 'high',
    file: (text) => /accept( all)?( cookies)?/i.test(text) && !/(reject|decline|deny|refuse|necessary only|essential only|manage)/i.test(text),
    pattern: /accept( all)?( cookies)?/i,
    why: 'Accept without an equally visible reject/manage option.',
  },
];

function walk(path, out) {
  if (!existsSync(path)) return;
  const stat = statSync(path);
  if (stat.isFile()) {
    if (EXT.has(extname(path))) out.push(path);
    return;
  }
  for (const name of readdirSync(path)) {
    if (!SKIP.has(name)) walk(join(path, name), out);
  }
}

export function scanText(text, file = '<text>') {
  const findings = [];
  const lines = text.split('\n');
  for (const rule of RULES) {
    if (rule.file && !rule.file(text)) continue;
    lines.forEach((line, index) => {
      if (rule.pattern.test(line)) findings.push({ file, line: index + 1, rule: rule.id, severity: rule.severity, why: rule.why, text: line.trim().slice(0, 100) });
    });
  }
  return findings;
}

function main() {
  const argv = process.argv.slice(2);
  const dirs = argv.filter((a) => !a.startsWith('--'));
  const targets = dirs.length ? dirs : ['src', 'app', 'pages', 'components', 'public', 'index.html'];
  const files = [];
  for (const target of targets) walk(target, files);
  const findings = files.flatMap((file) => scanText(readFileSync(file, 'utf8'), file));

  if (argv.includes('--json')) console.log(JSON.stringify({ scanned: files.length, findings }, null, 2));
  else {
    console.log(`audit-honesty: scanned ${files.length} files, ${findings.length} findings`);
    for (const f of findings) console.log(`  [${f.severity}] ${f.file}:${f.line} ${f.rule} - ${f.why}\n      ${f.text}`);
    if (findings.length) console.log('Review each: see experience/references/reference-deceptive-patterns.md');
  }
  if (argv.includes('--strict') && findings.some((f) => f.severity === 'high')) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
