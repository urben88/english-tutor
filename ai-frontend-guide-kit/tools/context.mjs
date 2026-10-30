#!/usr/bin/env node
/**
 * context — compact repository context for the direction + UX phase (guides 01-EXPERIENCE-DIRECTION + 02-UX-FLOWS).
 *
 * Scans the project (stack, routes/screens, docs, OpenSpec specs, previous UX
 * artifacts) and writes ai-frontend-output/ux/REPO-CONTEXT.md so the agent does
 * not have to explore the whole repository (token-efficient).
 *
 * Usage:
 *   node tools/context.mjs [--dir <project-root>] [--json]
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_DIR = resolve(__dirname, '..');

const IGNORED = /(^|\/)(node_modules|\.git|\.next|\.nuxt|\.svelte-kit|dist|build|coverage|\.cache|\.venv|__pycache__|\.output|out)(\/|$)/;
const MAX_ROUTES = 40;
const MAX_DOCS = 30;

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--json') flags.json = true;
    else if (token === '--dir') flags.dir = argv[++i];
  }
  return flags;
}

function resolveProjectRoot(flags) {
  if (flags.dir) return resolve(flags.dir);
  if (process.env.AI_FRONTEND_PROJECT) return resolve(process.env.AI_FRONTEND_PROJECT);
  return dirname(KIT_DIR);
}

function walk(root) {
  const files = [];
  const queue = [''];
  while (queue.length > 0) {
    const rel = queue.shift();
    const abs = join(root, rel);
    let entries;
    try {
      entries = readdirSync(abs, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (IGNORED.test(entryRel)) continue;
      if (entry.isDirectory()) queue.push(entryRel);
      else files.push(entryRel);
    }
  }
  return files;
}

function detectStack(root) {
  const manifestPath = join(root, 'package.json');
  if (!existsSync(manifestPath)) return { name: basename(root), framework: 'unknown', detected: [] };
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const deps = { ...(manifest.dependencies ?? {}), ...(manifest.devDependencies ?? {}) };
  const detected = [];
  const frameworkMap = [
    ['next', 'Next.js'],
    ['nuxt', 'Nuxt'],
    ['@sveltejs/kit', 'SvelteKit'],
    ['svelte', 'Svelte'],
    ['astro', 'Astro'],
    ['@remix-run/react', 'Remix'],
    ['vue', 'Vue'],
    ['react', 'React'],
    ['solid-js', 'Solid'],
    ['@angular/core', 'Angular'],
  ];
  const framework = frameworkMap.find(([dep]) => deps[dep])?.[1] ?? 'unknown';
  if (deps.tailwindcss) detected.push(`tailwindcss ${deps.tailwindcss.includes('4') ? 'v4' : 'v3?'}`);
  if (deps.typescript) detected.push('typescript');
  for (const [dep, label] of [['motion', 'motion'], ['framer-motion', 'framer-motion'], ['shadcn', 'shadcn'], ['preline', 'preline'], ['daisyui', 'daisyui']]) {
    if (deps[dep]) detected.push(label);
  }
  return { name: manifest.name ?? basename(root), framework, detected, dependencies: Object.keys(deps).length };
}

function routePaths(files) {
  const routes = new Set();
  for (const file of files) {
    const inApp = file.match(/(?:^|\/)(?:src\/)?app\/(.+)\/page\.(?:tsx|ts|jsx|js)$/) ?? file.match(/(?:^|\/)(?:src\/)?app\/page\.(?:tsx|ts|jsx|js)$/);
    if (inApp) {
      const segment = (inApp[1] ?? '').replace(/\(\w+\)\/?/g, '').replace(/\/?page$/, '');
      routes.add(`/${segment}`.replace(/\/+$/, '') || '/');
      continue;
    }
    const inPages = file.match(/(?:^|\/)(?:src\/)?pages\/(.+)\.(?:tsx|ts|jsx|js)$/);
    if (inPages && !/^api\//.test(inPages[1]) && !/^_/.test(inPages[1])) {
      const path = inPages[1].replace(/\/index$/, '').replace(/^index$/, '');
      routes.add(`/${path}`.replace(/\/+$/, '') || '/');
      continue;
    }
    const inRoutes = file.match(/(?:^|\/)(?:src\/)?routes\/(.+)\.(?:tsx|ts|jsx|js|vue|svelte)$/);
    if (inRoutes) routes.add(`/${inRoutes[1]}`.replace(/\/\+page$/, '').replace(/\/+$/, '') || '/');
  }
  return [...routes].sort().slice(0, MAX_ROUTES);
}

function findDocs(root, files) {
  const docs = [];
  for (const candidate of ['README.md', 'PRODUCT.md', 'DESIGN.md', 'INVENTORY.md', 'UX-SPEC.md', 'CONTRIBUTING.md']) {
    if (existsSync(join(root, candidate))) docs.push(candidate);
  }
  const docFiles = files.filter((file) => /^(docs?|documentation)\/.+\.md$/.test(file)).slice(0, MAX_DOCS);
  docs.push(...docFiles);
  return docs;
}

function findSpecs(root) {
  const specsDir = join(root, 'openspec', 'specs');
  const changesDir = join(root, 'openspec', 'changes');
  const specs = [];
  if (existsSync(specsDir)) {
    for (const entry of readdirSync(specsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) specs.push(entry.name);
    }
  }
  const activeChanges = [];
  if (existsSync(changesDir)) {
    for (const entry of readdirSync(changesDir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== 'archive') activeChanges.push(entry.name);
    }
  }
  return { specs: specs.sort(), activeChanges: activeChanges.sort() };
}

function findUxArtifacts(root) {
  const uxDir = join(root, 'ai-frontend-output', 'ux');
  const artifacts = {};
  for (const name of ['REPO-CONTEXT.md', 'UX-SPEC.md', 'UX-BASELINE.md', 'UX-DIFF.md', 'flow-report.html', 'OPEN-QUESTIONS.md']) {
    if (existsSync(join(uxDir, name))) artifacts[name] = statSync(join(uxDir, name)).mtime.toISOString().slice(0, 10);
  }
  return { dir: 'ai-frontend-output/ux', artifacts };
}

function detectFramework(root, files) {
  const evidence = [];
  for (const dir of ['.bmad-core', '_bmad', '.bmad', 'bmad']) {
    if (existsSync(join(root, dir))) evidence.push(`BMAD folder \`${dir}/\``);
  }
  for (const doc of ['prd.md', 'PRD.md', 'project-brief.md', 'product-brief.md', 'architecture.md', 'front-end-spec.md', 'ux-spec.md', 'EXPERIENCE.md']) {
    if (existsSync(join(root, doc))) evidence.push(`doc \`${doc}\``);
  }
  for (const file of files) {
    if (/(^|\/)(docs?|_bmad)\/(prd|PRD|project-brief|product-brief|architecture|front-end-spec|ux-spec|EXPERIENCE)\.md$/.test(file)) {
      evidence.push(`doc \`${file}\``);
    }
  }
  const stories = files.filter((file) => /(^|\/)(docs\/)?stories\/.+\.(md|ya?ml)$/.test(file));
  if (stories.length > 0) evidence.push(`${stories.length} story file(s)`);
  if (files.some((file) => /(^|\/)\.(agents|claude|opencode)\/skills\/bmad-/.test(file))) evidence.push('BMAD agent skills installed in repo');

  const bmad = evidence.length > 0;
  const specDriven = existsSync(join(root, 'openspec'));
  const framework = bmad && specDriven ? 'bmad + spec-driven' : bmad ? 'bmad' : specDriven ? 'spec-driven' : 'none';
  return { framework, bmad, specDriven, storyCount: stories.length, evidence };
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  const projectRoot = resolveProjectRoot(flags);
  const files = walk(projectRoot);
  const stack = detectStack(projectRoot);
  const routes = routePaths(files);
  const docs = findDocs(projectRoot, files);
  const specs = findSpecs(projectRoot);
  const ux = findUxArtifacts(projectRoot);
  const framework = detectFramework(projectRoot, files);

  const evidence = [];
  if (routes.length > 0) evidence.push(`${routes.length} route(s)/screen(s) detected`);
  if (docs.includes('PRODUCT.md')) evidence.push('PRODUCT.md present');
  if (docs.includes('DESIGN.md')) evidence.push('DESIGN.md present');
  if (Object.keys(ux.artifacts).length > 0) evidence.push(`previous UX artifacts: ${Object.keys(ux.artifacts).join(', ')}`);
  const uxPresent = evidence.length > 0;

  const result = {
    project: stack.name,
    root: projectRoot,
    framework: stack.framework,
    stack: stack.detected,
    routeCount: routes.length,
    routes,
    docs,
    specs: specs.specs,
    activeChanges: specs.activeChanges,
    uxArtifacts: ux.artifacts,
    ux_present: uxPresent,
    evidence,
    framework: framework.framework,
    bmad: framework.bmad,
    specDriven: framework.specDriven,
    storyCount: framework.storyCount,
    frameworkEvidence: framework.evidence,
    suggestedPath: uxPresent ? 'existing UX: ask the user — Summarize (as-is) or Radical redesign (UX only)' : 'no UX detected: design from scratch with userflow',
  };

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const outDir = join(projectRoot, 'ai-frontend-output', 'ux');
  mkdirSync(outDir, { recursive: true });
  const lines = [];
  lines.push('# Repository Context (for the UX phase)');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()} by \`tools/context.mjs\` — read this instead of exploring the repo.`);
  lines.push('');
  lines.push(`- **Project:** ${stack.name}${stack.framework !== 'unknown' ? ` (${stack.framework})` : ''}`);
  lines.push(`- **Stack:** ${stack.detected.length > 0 ? stack.detected.join(', ') : 'not detected from package.json'} (${stack.dependencies ?? 0} dependencies)`);
  lines.push(`- **UX present:** ${uxPresent ? 'YES' : 'no'} — ${evidence.length > 0 ? evidence.join('; ') : 'no screens or UX docs found'}`);
  lines.push(`- **Framework:** ${framework.framework}${framework.evidence.length > 0 ? ` — ${framework.evidence.join('; ')}` : ''}`);
  lines.push(`- **Suggested path:** ${result.suggestedPath}`);
  lines.push('');
  if (routes.length > 0) {
    lines.push(`## Routes / screens (${routes.length})`);
    lines.push('');
    for (const route of routes) lines.push(`- \`${route}\``);
    lines.push('');
  }
  if (docs.length > 0) {
    lines.push('## Documentation found');
    lines.push('');
    for (const doc of docs) lines.push(`- \`${doc}\``);
    lines.push('');
  }
  if (specs.specs.length > 0 || specs.activeChanges.length > 0) {
    lines.push('## OpenSpec');
    lines.push('');
    if (specs.specs.length > 0) lines.push(`- Capabilities: ${specs.specs.map((s) => `\`${s}\``).join(', ')}`);
    if (specs.activeChanges.length > 0) lines.push(`- Active changes: ${specs.activeChanges.map((s) => `\`${s}\``).join(', ')}`);
    lines.push('');
  }
  if (Object.keys(ux.artifacts).length > 0) {
    lines.push('## Previous UX artifacts');
    lines.push('');
    for (const [name, date] of Object.entries(ux.artifacts)) lines.push(`- \`${ux.dir}/${name}\` (${date})`);
    lines.push('');
  }
  if (framework.framework !== 'none') {
    lines.push('## Framework adaptation');
    lines.push('');
    if (framework.bmad) {
      lines.push('- **BMAD detected:** the PRD/brief is the business anchor (do not duplicate it in `PRODUCT.md` — point to it instead); existing UX docs are the as-is state for guide 02; map stories to screens and cite them with `--ref "story:<id>"`. See `guides/ADAPTERS.md`.');
    }
    if (framework.specDriven) {
      lines.push('- **Spec-driven detected:** `openspec/specs/` is the behavioral source of truth; UX and UI decisions must not contradict it — cite capabilities with `--ref "spec:<capability>"` (or the active change). See `guides/ADAPTERS.md`.');
    }
    lines.push('');
  }
  lines.push('## Next step');
  lines.push('');
  lines.push('Follow `ai-frontend-guide-kit/guides/01-EXPERIENCE-DIRECTION.md` (adaptive questions → archetype/philosophy → three directions → `EXPERIENCE-BRIEF.md`), then `ai-frontend-guide-kit/guides/02-UX-FLOWS.md`:');
  lines.push(uxPresent
    ? '- UX exists: **ask the user** to choose Summarize (as-is documentation + audit) or Radical redesign (baseline + ideal UX + diff, UX only, respecting PRODUCT.md).'
    : '- No UX detected: design from scratch with the `userflow` dispatcher (1–4 flow skills, anti-patterns checked).');
  lines.push('- Outputs go to `ai-frontend-output/ux/`: `EXPERIENCE-BRIEF.md` + `UX-SPEC.md` + `flow-report.html` + `ux-map.excalidraw`.');
  lines.push('');
  writeFileSync(join(outDir, 'REPO-CONTEXT.md'), lines.join('\n'), 'utf8');
  console.log(`context: ${routes.length} routes, ${docs.length} docs, ux_present=${uxPresent}`);
  console.log(`written : ${join(outDir, 'REPO-CONTEXT.md')}`);
}

main();
