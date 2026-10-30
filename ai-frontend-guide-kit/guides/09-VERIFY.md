# 09 — Verify

Purpose: prove the flows work and the craft holds. Two layers: business flow (E2E) and visual regression.

## Setup (once per project)

```bash
npm init playwright@latest
```

## 1. Business flow test (`tests/e2e/conversion.spec.ts`)

```ts
import { test, expect } from '@playwright/test';

test('the user completes the main funnel', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /get started/i }).click();
  await expect(page).toHaveURL(/\/signup/);
  await page.getByLabel(/work email/i).fill('partner@business.com');
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page.getByRole('heading', { name: /welcome to your dashboard/i })).toBeVisible();
});
```

Rules: drive tests from `PRODUCT.md` flows; assert user-visible outcomes, not implementation details; one spec per critical flow.

## 2. Visual regression for interactive states (`tests/visual/craft.spec.ts`)

```ts
import { test, expect } from '@playwright/test';

test('primary button holds its craft in hover state', async ({ page }) => {
  await page.goto('/components/buttons');
  const button = page.getByRole('button', { name: /save changes/i });
  await expect(button).toHaveScreenshot('button-base.png');
  await button.hover();
  await page.waitForTimeout(200); // let the spring settle
  await expect(button).toHaveScreenshot('button-hover.png', { maxDiffPixelRatio: 0.01 });
});
```

Capture the states that carry the design intent: hover, focus, loading, empty and error states.

## 3. Audit loop

```bash
npx playwright test
```

- If the `impeccable` skill is installed: `/impeccable audit <screen>` and `/impeccable polish <screen>` before closing each screen.
- Failures: fix the exact reported issue, then re-run the full suite. No screen is done with a red test.

## 4. Automated accessibility (WCAG 2.2)

Shortcut: `node ai-frontend-guide-kit/tools/audit-a11y.mjs http://localhost:3000` (needs `@axe-core/playwright`). Spec form:

```bash
npm i -D @axe-core/playwright
```

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home has no detectable WCAG 2.x A/AA violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
});
```

Automated checks catch roughly a third of issues; keep the manual pass. Check by hand what axe cannot: focus not hidden by sticky bars (2.4.11), 24px minimum targets (2.5.8), a non-drag alternative (2.5.7), login without cognitive tests (3.3.8). Reference: `experience/references/reference-wcag-22.md`.

## 5. Performance budget

Shortcut: `node ai-frontend-guide-kit/tools/audit-perf.mjs http://localhost:3000` (Lighthouse; fails above LCP 2.5 s, CLS 0.1, TBT 200 ms). Manual form:

```bash
npx lighthouse http://localhost:3000 --only-categories=performance,accessibility --output=json --output-path=./lighthouse.json --chrome-flags="--headless"
```

Targets (field, 75th percentile): LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1. If an expressive effect from the catalog breaks the budget, replace or lazy-load it. Reference: `experience/references/reference-core-web-vitals.md`.

## 6. Honesty audit (deceptive patterns)

First run the static scan: `node ai-frontend-guide-kit/tools/audit-honesty.mjs src --strict` (scarcity, urgency, confirmshaming, pre-checked boxes, placeholder proof, unverified metrics, consent asymmetry). Then confirm by hand:

For every conversion flow (signup, checkout, subscription, consent, cancel) confirm:

- [ ] Reject / cancel / decline takes about the same effort as accept / subscribe.
- [ ] Total price and recurring terms are visible before the last step; no pre-checked paid extras.
- [ ] No fake scarcity, countdowns, testimonials or metrics; copy is neutral, no confirmshaming.
- [ ] AI-generated content is labelled, sources and undo exist (`reference-shape-of-ai.md`).

Reference: `experience/references/reference-deceptive-patterns.md`.

## Done checklist

- [ ] All critical flows pass E2E.
- [ ] Visual snapshots exist for key interactive states.
- [ ] Reduced motion and keyboard focus verified manually once per screen.
- [ ] axe reports no A/AA violations; 2.2 criteria checked by hand.
- [ ] Core Web Vitals within the budget.
- [ ] Honesty audit passed for every conversion flow.
- [ ] Console free of hydration/React errors.
- [ ] License notices kept for every reused component.
- [ ] Decision log (`06-REUSE`) attached.

When all boxes are checked, the screen is ready for review/commit.
