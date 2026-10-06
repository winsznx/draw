import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, type Page, type TestInfo } from '@playwright/test';

export type Seat = 'Fund manager' | 'LP A' | 'LP B' | 'LP C';

// The demo's access code. When the site prints it, the app fills it in and this can stay empty.
export const ACCESS_CODE = process.env.DRAW_ACCESS_CODE ?? '';

// Evidence for one test run, written by the test itself, pass or fail.
export function evidence(name: string) {
  const run = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const network = (process.env.DRAW_EVIDENCE_NETWORK ?? 'devnet').toLowerCase();
  const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'evidence', network === 'localnet' ? 'local' : network, 'browser', `web-${name}-${run}`);
  const steps: { step: string; at: string }[] = [];
  return {
    run,
    out,
    steps,
    record: (step: string) => steps.push({ step, at: new Date().toISOString() }),
    shot: async (page: Page, label: string) => {
      mkdirSync(out, { recursive: true });
      await page.screenshot({ path: path.join(out, `${String(steps.length).padStart(2, '0')}-${label}.png`), fullPage: true });
    },
    write: (info: TestInfo, expected: number) => {
      mkdirSync(out, { recursive: true });
      const verdict = steps.length === expected && info.status !== 'failed' ? 'PASS' : 'FAIL';
      writeFileSync(path.join(out, 'result.json'), `${JSON.stringify({ run, test: info.title, site: info.project.use.baseURL, steps, expectedSteps: expected, verdict, error: info.error?.message?.slice(0, 600) ?? null }, null, 2)}\n`);
    },
  };
}

export async function dismissToast(page: Page, text: string | RegExp) {
  const toast = page.getByRole('status').locator('div').filter({ hasText: text }).first();
  await expect(toast).toBeVisible();
  await toast.getByRole('button', { name: 'Dismiss' }).click();
}

// Approves every signature an action asks for, then waits for its result toast.
export async function signAll(page: Page, result: string | RegExp): Promise<number> {
  let signed = 0;
  const dialog = page.getByRole('dialog', { name: 'Sign with your key' });
  const toast = page.getByRole('status').locator('div').filter({ hasText: result }).first();
  for (;;) {
    await expect(dialog.or(toast)).toBeVisible();
    if (await toast.isVisible()) break;
    await dialog.getByRole('button', { name: 'Sign', exact: true }).click();
    signed += 1;
    await expect(dialog).toBeHidden();
  }
  await toast.getByRole('button', { name: 'Dismiss' }).click();
  return signed;
}

export async function openOnboarding(page: Page) {
  await page.goto('/onboard');
  await page.evaluate(() => localStorage.removeItem('draw-seat'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Who are you in this fund?' })).toBeVisible();
}

// Each browser starts its own demo fund, so a fresh browser always starts one.
// On a site with an access code, that first action asks for the code.
export async function startDemoIfNeeded(page: Page) {
  const start = page.getByRole('button', { name: /^(Create the demo fund|Start the demo)$/ });
  const seat = page.getByRole('listitem').filter({ hasText: 'Fund manager' });
  // Seats render disabled while the page loads, so only an enabled seat means a fund exists.
  await expect(start.or(seat.and(page.locator(':enabled'))).first()).toBeVisible();
  if (await start.isVisible()) {
    await start.click();
    const access = page.getByRole('dialog', { name: 'Enter the access code' });
    const started = page.getByRole('status').locator('div').filter({ hasText: /set up|Ready/ }).first();
    await expect(access.or(started)).toBeVisible();
    if (await access.isVisible()) {
      if (ACCESS_CODE) await access.getByLabel('Access code').fill(ACCESS_CODE);
      await access.getByRole('button', { name: 'Continue' }).click();
    }
    await dismissToast(page, /set up|Ready/);
  }
  await expect(seat).toBeEnabled();
}
