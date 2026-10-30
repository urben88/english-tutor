#!/usr/bin/env node
/**
 * Automated WCAG 2.x A/AA check of one or more URLs with axe-core through Playwright.
 * Needs (project dev dependencies): npm i -D @playwright/test @axe-core/playwright, then npx playwright install chromium.
 *
 * Usage: node tools/audit-a11y.mjs <url> [<url> ...] [--tags wcag2a,wcag2aa,wcag22aa] [--json]
 * Exit code 1 when violations are found, 2 when the tooling is missing.
 */
const argv = process.argv.slice(2);
const tagsIndex = argv.indexOf('--tags');
const urls = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--tags');
const tags = tagsIndex >= 0 ? argv[tagsIndex + 1].split(',') : ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

if (urls.length === 0) {
  console.error('Usage: node tools/audit-a11y.mjs <url> [<url> ...] [--tags ...] [--json]');
  process.exit(2);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  try {
    ({ chromium } = await import('@playwright/test'));
  } catch {
    console.error('Playwright not found. Run: npm i -D @playwright/test @axe-core/playwright && npx playwright install chromium');
    process.exit(2);
  }
}
let AxeBuilder;
try {
  AxeBuilder = (await import('@axe-core/playwright')).default;
} catch {
  console.error('@axe-core/playwright not found. Run: npm i -D @axe-core/playwright');
  process.exit(2);
}

const browser = await chromium.launch();
const report = [];
for (const url of urls) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze();
  report.push({
    url,
    violations: violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, example: v.nodes[0]?.target?.join(' ') })),
  });
  await page.close();
}
await browser.close();

if (argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
else {
  for (const { url, violations } of report) {
    console.log(`${url}: ${violations.length} violation type(s)`);
    for (const v of violations) console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes} node(s), e.g. ${v.example})`);
  }
  console.log('Automated checks cover roughly a third of WCAG issues: also check keyboard, focus visibility (2.4.11), target size (2.5.8), dragging (2.5.7) and authentication (3.3.8) by hand.');
}
process.exit(report.some((r) => r.violations.length) ? 1 : 0);
