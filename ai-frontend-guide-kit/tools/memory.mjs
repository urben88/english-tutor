#!/usr/bin/env node
/**
 * memory — selection memory for the AI Frontend Guide kit.
 *
 * Keeps an append-only history of component decisions, a generated summary of
 * the styles/components extracted, and named reusable combinations.
 *
 * Storage (default `<kit>/../ai-frontend-output/`, override with --dir or AI_FRONTEND_OUTPUT):
 *   selections.jsonl    append-only history (one JSON per line)
 *   combinations.json   named reusable combinations
 *   SUMMARY.md          generated summary (regenerated on every mutation)
 *
 * Usage:
 *   node tools/memory.mjs add --screen landing --block hero --need "..." --decision reuse --id <entry-id> [--style a,b] [--ref "spec:<capability>|story:<id>"] [--notes "..."]
 *   node tools/memory.mjs add --screen experience --block reference --need "..." --decision adapt --ref "reference:<slug>" [--notes "..."]
 *   node tools/memory.mjs add --screen landing --block custom-x --need "..." --decision build --name "Custom marquee"
 *   node tools/memory.mjs list [--screen landing] [--limit 15] [--json]
 *   node tools/memory.mjs summary
 *   node tools/memory.mjs combo save <name> [--all] [--note "..."]
 *   node tools/memory.mjs combo list [--json]
 *   node tools/memory.mjs combo show <name> [--json]
 *   node tools/memory.mjs combo apply <name>
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_DIR = resolve(__dirname, '..');
const SOURCES_DIR = join(KIT_DIR, 'catalog', 'sources');
const DEFAULT_OUTPUT = resolve(KIT_DIR, '..', 'ai-frontend-output');
const DECISIONS = new Set(['reuse', 'adapt', 'build']);

const OUTPUT_README = `# ai-frontend-output

Selection memory of the AI Frontend Guide kit. Created by the installer and preserved on kit refreshes.

- \`selections.jsonl\` — append-only history of component decisions.
- \`combinations.json\` — named, reusable combinations of decisions.
- \`SUMMARY.md\` — generated summary of styles and components extracted.

Managed via \`node ai-frontend-guide-kit/tools/memory.mjs\` (\`add\`, \`list\`, \`summary\`, \`combo save|list|show|apply\`).
Reuse combinations across projects by copying \`combinations.json\` or pointing \`AI_FRONTEND_OUTPUT\` to a shared folder.
Recommended: commit this folder with the project (it is project history, not build output).
`;

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      if (['json', 'all'].includes(key)) {
        args.flags[key] = true;
      } else {
        args.flags[key] = argv[++i];
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

function resolveOutputDir(flags) {
  const dir = flags.dir ? resolve(flags.dir) : process.env.AI_FRONTEND_OUTPUT ? resolve(process.env.AI_FRONTEND_OUTPUT) : DEFAULT_OUTPUT;
  mkdirSync(dir, { recursive: true });
  const readme = join(dir, 'README.md');
  if (!existsSync(readme)) writeFileSync(readme, OUTPUT_README, 'utf8');
  return dir;
}

function projectName(outputDir, flags) {
  return flags.project ?? basename(dirname(outputDir));
}

function loadCatalog() {
  const entries = new Map();
  if (!existsSync(SOURCES_DIR)) return entries;
  for (const file of readdirSync(SOURCES_DIR).filter((name) => name.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(join(SOURCES_DIR, file), 'utf8'));
    for (const entry of data.entries) entries.set(entry.id, entry);
  }
  return entries;
}

function readHistory(outputDir) {
  const file = join(outputDir, 'selections.jsonl');
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function readCombinations(outputDir) {
  const file = join(outputDir, 'combinations.json');
  if (!existsSync(file)) return { version: 1, combinations: [] };
  return JSON.parse(readFileSync(file, 'utf8'));
}

function writeCombinations(outputDir, data) {
  writeFileSync(join(outputDir, 'combinations.json'), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function latestPerBlock(history) {
  const map = new Map();
  for (const record of history) map.set(`${record.screen}/${record.block}`, record);
  return [...map.values()];
}

function regenerateSummary(outputDir) {
  const history = readHistory(outputDir);
  const combinations = readCombinations(outputDir);
  const latest = latestPerBlock(history);
  const styleCounts = {};
  const sourceCounts = {};
  for (const record of history) {
    for (const tag of record.style_tags ?? []) styleCounts[tag] = (styleCounts[tag] ?? 0) + 1;
    if (record.source) sourceCounts[record.source] = (sourceCounts[record.source] ?? 0) + 1;
  }
  const lines = [];
  lines.push('# Selection Summary');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()} · project \`${history[0]?.project ?? basename(dirname(outputDir))}\``);
  lines.push('');
  lines.push(`- Decisions recorded: **${history.length}** (latest per block: ${latest.length})`);
  lines.push(`- Blocks covered: ${latest.length}`);
  lines.push(`- Combinations saved: ${combinations.combinations.length}`);
  lines.push('');
  lines.push('## Latest decision per screen/block');
  lines.push('');
  lines.push('| Screen | Block | Decision | Component | Source | License | Ref |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const record of latest.sort((a, b) => `${a.screen}/${a.block}`.localeCompare(`${b.screen}/${b.block}`))) {
    lines.push(`| ${record.screen} | ${record.block} | ${record.decision} | ${record.entry_id ?? record.name ?? '—'} | ${record.source ?? '—'} | ${record.license_type ?? '—'} | ${record.ref ?? '—'} |`);
  }
  lines.push('');
  if (Object.keys(styleCounts).length > 0) {
    lines.push('## Styles extracted');
    lines.push('');
    lines.push(Object.entries(styleCounts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => `\`${tag}\`×${count}`).join(' · '));
    lines.push('');
  }
  if (Object.keys(sourceCounts).length > 0) {
    lines.push('## Sources used');
    lines.push('');
    lines.push(Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).map(([source, count]) => `${source} (${count})`).join(' · '));
    lines.push('');
  }
  if (combinations.combinations.length > 0) {
    lines.push('## Saved combinations');
    lines.push('');
    for (const combo of combinations.combinations) {
      lines.push(`- **${combo.name}** (${combo.decisions.length} decisions${combo.style_tags?.length ? `; styles: ${combo.style_tags.join(', ')}` : ''})${combo.note ? ` — ${combo.note}` : ''}`);
    }
    lines.push('');
  }
  lines.push('## Recent decisions');
  lines.push('');
  for (const record of history.slice(-10).reverse()) {
    lines.push(`- ${record.ts.slice(0, 10)} · ${record.screen}/${record.block} · ${record.decision} · ${record.entry_id ?? record.name ?? '—'}`);
  }
  lines.push('');
  writeFileSync(join(outputDir, 'SUMMARY.md'), lines.join('\n'), 'utf8');
}

function commandAdd(args, outputDir, catalog) {
  const { flags } = args;
  for (const required of ['screen', 'block', 'need', 'decision']) {
    if (!flags[required]) fail(`Missing --${required}. See usage in the script header.`);
  }
  if (!DECISIONS.has(flags.decision)) fail(`--decision must be one of: ${[...DECISIONS].join(', ')}`);

  const record = {
    ts: new Date().toISOString(),
    project: projectName(outputDir, flags),
    screen: flags.screen,
    block: flags.block,
    need: flags.need,
    decision: flags.decision,
    style_tags: flags.style ? String(flags.style).split(',').map((tag) => tag.trim()).filter(Boolean) : [],
    notes: flags.notes ?? '',
  };
  if (flags.ref) record.ref = flags.ref;

  if (flags.id) {
    const entry = catalog.get(flags.id);
    if (!entry) fail(`Entry "${flags.id}" not found in the catalog. Use node tools/find.mjs to get a valid id.`);
    record.entry_id = entry.id;
    record.name = entry.name;
    record.source = entry.source;
    record.category = entry.category;
    record.license_type = entry.license_type;
    record.commercial_use = entry.commercial_use;
    record.install_command = entry.install_command ?? entry.docs_url;
  } else if (flags.decision === 'build') {
    record.name = flags.name ?? `Custom ${flags.block}`;
    record.notes = [record.notes, 'custom build (no catalog entry)'].filter(Boolean).join(' · ');
  } else if (flags.ref) {
    record.name = flags.ref;
  } else {
    fail('--id (or --ref for reference/direction notes) is required unless --decision build is used.');
  }

  appendFileSync(join(outputDir, 'selections.jsonl'), `${JSON.stringify(record)}\n`, 'utf8');
  regenerateSummary(outputDir);
  console.log(`recorded: ${record.screen}/${record.block} -> ${record.entry_id ?? record.name} (${record.decision})`);
  console.log(`summary : ${join(outputDir, 'SUMMARY.md')}`);
}

function commandList(args, outputDir) {
  const history = readHistory(outputDir);
  const filtered = args.flags.screen ? history.filter((record) => record.screen === args.flags.screen) : history;
  const limit = Number.parseInt(args.flags.limit ?? '15', 10);
  const rows = filtered.slice(-limit).reverse();
  if (args.flags.json) {
    console.log(JSON.stringify({ total: filtered.length, shown: rows.length, decisions: rows }, null, 2));
    return;
  }
  console.log(`# ${filtered.length} decisions recorded (showing ${rows.length}) — memory dir: ${outputDir}`);
  for (const record of rows) {
    console.log(`${record.ts.slice(0, 10)} | ${record.screen}/${record.block} | ${record.decision} | ${record.entry_id ?? record.name} | ${record.license_type ?? '—'}${record.ref ? ` | ${record.ref}` : ''}`);
  }
}

function commandCombo(args, outputDir, catalog) {
  const [, action, name] = args._;
  const data = readCombinations(outputDir);

  if (action === 'save') {
    if (!name) fail('Usage: memory.mjs combo save <name> [--all] [--note "..."]');
    const history = readHistory(outputDir);
    const decisions = args.flags.all ? history : latestPerBlock(history);
    if (decisions.length === 0) fail('No decisions recorded yet; use memory.mjs add first.');
    const styleTags = [...new Set(decisions.flatMap((record) => record.style_tags ?? []))];
    const combo = { name, created: new Date().toISOString(), note: args.flags.note ?? '', style_tags: styleTags, decisions };
    const index = data.combinations.findIndex((item) => item.name === name);
    if (index >= 0) data.combinations[index] = combo;
    else data.combinations.push(combo);
    writeCombinations(outputDir, data);
    regenerateSummary(outputDir);
    console.log(`combination "${name}" saved with ${decisions.length} decisions${index >= 0 ? ' (replaced)' : ''}`);
    return;
  }

  if (action === 'list') {
    if (args.flags.json) {
      console.log(JSON.stringify({ combinations: data.combinations.map(({ name: comboName, created, note, style_tags, decisions }) => ({ name: comboName, created, note, styles: style_tags ?? [], decisions: decisions.length })) }, null, 2));
      return;
    }
    if (data.combinations.length === 0) {
      console.log('No combinations saved yet. Use: memory.mjs combo save <name>');
      return;
    }
    for (const combo of data.combinations) {
      console.log(`${combo.name} | ${combo.decisions.length} decisions | ${combo.style_tags?.join(', ') || 'no styles'} | ${combo.note || ''}`);
    }
    return;
  }

  if (action === 'show' || action === 'apply') {
    const combo = data.combinations.find((item) => item.name === name);
    if (!combo) fail(`Combination "${name}" not found. Use combo list.`);
    const resolved = combo.decisions.map((record) => {
      const entry = record.entry_id ? catalog.get(record.entry_id) : null;
      return {
        ...record,
        license_type: entry?.license_type ?? record.license_type,
        commercial_use: entry?.commercial_use ?? record.commercial_use,
        install_command: entry?.install_command ?? record.install_command,
      };
    });
    if (action === 'show') {
      if (args.flags.json) {
        console.log(JSON.stringify({ name: combo.name, note: combo.note, decisions: resolved }, null, 2));
        return;
      }
      console.log(`# Combination "${combo.name}" — ${resolved.length} decisions${combo.note ? ` (${combo.note})` : ''}`);
      for (const record of resolved) {
        console.log(`${record.screen}/${record.block}: ${record.entry_id ?? record.name} | ${record.license_type ?? '—'} | ${record.decision} | ${record.install_command ?? '—'}`);
      }
      console.log('\nApply with: memory.mjs combo apply ' + combo.name);
      return;
    }
    for (const record of resolved) {
      const applied = {
        ...record,
        ts: new Date().toISOString(),
        project: projectName(outputDir, args.flags),
        notes: [record.notes, `from combination ${combo.name}`].filter(Boolean).join(' · '),
      };
      appendFileSync(join(outputDir, 'selections.jsonl'), `${JSON.stringify(applied)}\n`, 'utf8');
    }
    regenerateSummary(outputDir);
    console.log(`combination "${combo.name}" applied: ${resolved.length} decisions added to ${outputDir}`);
    return;
  }

  fail('Usage: memory.mjs combo <save|list|show|apply> [...]');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const [command] = args._;
  if (!command || args.flags.help) {
    console.log('memory — selection memory for the AI Frontend Guide kit');
    console.log('Commands: add | list | summary | combo save|list|show|apply  (see script header for flags)');
    return;
  }
  const outputDir = resolveOutputDir(args.flags);

  if (command === 'add') return commandAdd(args, outputDir, loadCatalog());
  if (command === 'list') return commandList(args, outputDir);
  if (command === 'summary') {
    regenerateSummary(outputDir);
    const history = readHistory(outputDir);
    console.log(`summary regenerated: ${join(outputDir, 'SUMMARY.md')} (${history.length} decisions)`);
    return;
  }
  if (command === 'combo') return commandCombo(args, outputDir, loadCatalog());
  fail(`Unknown command "${command}". Use add, list, summary or combo.`);
}

main();
