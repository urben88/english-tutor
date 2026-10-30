#!/usr/bin/env node
/**
 * find — query the component catalog with minimal output.
 *
 * Usage:
 *   node tools/find.mjs [--category hero] [--stack react] [--license MIT]
 *                       [--commercial] [--free] [--licensed] [--source magicui]
 *                       [--type component|block|design-system|icon] [--text <query>]
 *                       [--min-quality N] [--sort relevance|quality|name]
 *                       [--all] [--limit N] [--json]
 *
 * Behavior:
 *   --text splits into words (all must match) and ranks by weighted relevance (name > tags > category > description).
 *   Results are ranked by quality (license clarity, install effort, dependencies, source tier) unless --sort says otherwise.
 *   Near-identical entries (same name, category and framework across sources) are collapsed to the best one; --all shows every copy.
 *   Icons are hidden unless --type icon or --all.
 *   --licensed drops entries whose license is unknown.
 *   --source takes a source id (mui, shadcn, reactaria, ...) for an exact match, or part of a source name.
 *
 * Examples:
 *   node tools/find.mjs --category hero --stack react --commercial
 *   node tools/find.mjs --text "marquee logos" --min-quality 60
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = process.env.KIT_CATALOG_DIR ?? join(__dirname, '..', 'catalog');
const SOURCES_DIR = join(CATALOG_DIR, 'sources');

export function parseArgs(argv) {
  const args = { limit: 12, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--json') args.json = true;
    else if (token.startsWith('--')) {
      const key = token.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = value;
    }
  }
  return args;
}

export function loadEntries() {
  if (!existsSync(SOURCES_DIR)) {
    console.error('Catalog not found. Run this script from the ai-frontend-guide-kit folder or rebuild the kit.');
    process.exit(1);
  }
  const entries = [];
  for (const file of readdirSync(SOURCES_DIR).filter((name) => name.endsWith('.json')).sort()) {
    const data = JSON.parse(readFileSync(join(SOURCES_DIR, file), 'utf8'));
    entries.push(...data.entries);
  }
  return entries;
}

const squash = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const words = (value) => String(value).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

export function relevance(entry, query) {
  const terms = words(query);
  if (terms.length === 0) return 0;
  const name = String(entry.name).toLowerCase();
  const tags = (entry.search_tags ?? []).join(' ').toLowerCase();
  const category = String(entry.category).toLowerCase();
  const description = `${entry.description ?? ''} ${entry.use_case ?? ''}`.toLowerCase();
  const source = String(entry.source).toLowerCase();
  let score = 0;
  for (const term of terms) {
    const hit = (name.includes(term) ? 5 : 0) + (tags.includes(term) ? 3 : 0) + (category.includes(term) ? 2 : 0) + (source.includes(term) ? 1 : 0) + (description.includes(term) ? 1 : 0);
    if (hit === 0) return 0; // every word must match somewhere
    score += hit;
  }
  return score;
}

export function matches(entry, args) {
  if (args.category && entry.category !== args.category) return false;
  if (args.type) {
    if (entry.entry_type !== args.type) return false;
  } else if (!args.all && entry.entry_type === 'icon') return false;
  if (args.source) {
    // A source id (the id prefix, e.g. mui, shadcn, reactaria) matches exactly; otherwise fall back to a name substring.
    if (args._exactSource) {
      if (!entry.id.startsWith(`${args.source}-`)) return false;
    } else if (!squash(entry.source).includes(squash(args.source))) return false;
  }
  if (args.stack && !(entry.stack ?? []).some((item) => String(item).toLowerCase() === String(args.stack).toLowerCase())) return false;
  if (args.license && entry.license_type !== args.license) return false;
  if (args.licensed && entry.license_type === 'unknown') return false;
  if (args.commercial && entry.commercial_use === false) return false;
  if (args.free && entry.free !== true) return false;
  if (args['min-quality'] && (entry.quality ?? 0) < Number(args['min-quality'])) return false;
  if (args.text && relevance(entry, args.text) === 0) return false;
  return true;
}

function frameworkOf(entry) {
  const stack = (entry.stack ?? []).map((s) => String(s).toLowerCase());
  return ['react', 'vue', 'svelte', 'html'].find((f) => stack.includes(f)) ?? stack[0] ?? 'any';
}

function dedupeKey(entry) {
  const base = squash(String(entry.name).replace(new RegExp(`^${String(entry.source).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i'), '').replace(/\b(demo|example)\b/gi, ''));
  return `${entry.category}|${frameworkOf(entry)}|${base}`;
}

export function search(entries, args) {
  if (args.source && args._exactSource === undefined) args = { ...args, _exactSource: entries.some((entry) => entry.id.startsWith(`${args.source}-`)) };
  const filtered = entries.filter((entry) => matches(entry, args));
  const sort = args.sort ?? (args.text ? 'relevance' : 'quality');
  const rel = new Map(filtered.map((entry) => [entry, args.text ? relevance(entry, args.text) : 0]));
  const compare = {
    relevance: (a, b) => rel.get(b) - rel.get(a) || (b.quality ?? 0) - (a.quality ?? 0) || a.id.localeCompare(b.id),
    quality: (a, b) => (b.quality ?? 0) - (a.quality ?? 0) || a.id.localeCompare(b.id),
    name: (a, b) => a.name.localeCompare(b.name),
  }[sort] ?? ((a, b) => a.id.localeCompare(b.id));
  const ranked = [...filtered].sort(compare);
  if (args.all) return { total: ranked.length, hidden: 0, results: ranked };
  const seen = new Set();
  const results = [];
  for (const entry of ranked) {
    const key = dedupeKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(entry);
  }
  return { total: results.length, hidden: ranked.length - results.length, results };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { total, hidden, results } = search(loadEntries(), args);
  const limited = results.slice(0, Number(args.limit));

  if (args.json) {
    console.log(JSON.stringify({ total, hidden_duplicates: hidden, shown: limited.length, results: limited }, null, 2));
    return;
  }

  const note = hidden > 0 ? `, ${hidden} near-duplicates hidden (use --all)` : '';
  console.log(`# ${total} matches (showing ${limited.length}${note}) — use get <id> for details`);
  for (const entry of limited) {
    const license = entry.license_type + (entry.commercial_use === false ? ' (non-commercial)' : entry.commercial_use === 'conditional' ? ' (verify)' : '');
    console.log(`${entry.id} | ${entry.name} | ${entry.source} | ${entry.category} | ${license} | q${entry.quality ?? '-'}`);
  }
  if (total === 0) {
    console.log('No matches. Broaden filters or check the category list in catalog/component-manifest.md.');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
