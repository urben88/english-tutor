#!/usr/bin/env node
/**
 * get — full decision card for one catalog entry, including how to install it.
 *
 * Usage:
 *   node tools/get.mjs <entry-id> [--json]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = join(__dirname, '..', 'catalog');
const SOURCES_DIR = join(CATALOG_DIR, 'sources');

const id = process.argv[2];
const asJson = process.argv.includes('--json');

if (!id || id.startsWith('--')) {
  console.error('Usage: node tools/get.mjs <entry-id> [--json]');
  process.exit(1);
}

if (!existsSync(SOURCES_DIR)) {
  console.error('Catalog not found. Run this script from the ai-frontend-guide-kit folder.');
  process.exit(1);
}

let found = null;
for (const file of readdirSync(SOURCES_DIR).filter((name) => name.endsWith('.json'))) {
  const data = JSON.parse(readFileSync(join(SOURCES_DIR, file), 'utf8'));
  found = data.entries.find((entry) => entry.id === id) ?? null;
  if (found) break;
}

if (!found) {
  console.error(`Entry "${id}" not found. Use find.mjs to get a valid id.`);
  process.exit(1);
}

if (asJson) {
  console.log(JSON.stringify(found, null, 2));
  process.exit(0);
}

const lines = [];
lines.push(`# ${found.name}`);
lines.push(`id: ${found.id}`);
lines.push(`source: ${found.source} | type: ${found.entry_type} | category: ${found.category}`);
lines.push('');
lines.push(`what: ${found.description}`);
lines.push(`use when: ${found.use_case}`);
if (found.decision_hints?.length) {
  lines.push(`hints: ${found.decision_hints.join(' | ')}`);
}
lines.push('');
lines.push(`license: ${found.license_type} | commercial: ${found.commercial_use} | free: ${found.free} | quality: ${found.quality ?? 'n/a'}`);
if (found.limits) lines.push(`limits: ${found.limits}`);
lines.push(`stack: ${(found.stack ?? []).join(', ')}`);
if (found.dependencies?.length) lines.push(`dependencies: ${found.dependencies.join(', ')}`);
lines.push('');
lines.push(`where: ${found.docs_url}`);
if (found.registry_url) lines.push(`registry: ${found.registry_url}`);
if (found.install_command) lines.push(`install: ${found.install_command}`);
if (found.install_method) lines.push(`method: ${found.install_method}`);
if (found.manual_steps?.length) {
  lines.push('manual steps:');
  for (const step of found.manual_steps) lines.push(`  - ${step}`);
}
lines.push(`verified: ${found.verified_at}`);
console.log(lines.join('\n'));
