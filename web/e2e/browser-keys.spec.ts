import { expect, test, type Page } from '@playwright/test';

import { dismissToast, evidence, openOnboarding, signAll, startDemoIfNeeded, type Seat } from './helpers';

// Non-custodial journey on LocalNet: every person creates their own party with
// a key generated in this browser, backs it up, and approves each ledger action
// in the Sign dialog. Runs only with DRAW_PARTY_MODE=external.
test.skip(process.env.DRAW_PARTY_MODE !== 'external', 'browser keys need DRAW_PARTY_MODE=external');

const API = 'http://localhost:4173';
const ev = evidence('browser-keys');

async function join(page: Page, seat: Seat) {
  await openOnboarding(page);
  await page.getByRole('listitem').filter({ hasText: seat }).click();
  await page.getByRole('button', { name: 'Create key and party' }).click();
  await dismissToast(page, 'Account created');
  await expect(page.getByRole('heading', { name: 'Back up your key' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download key backup' }).click();
  expect((await download).suggestedFilename()).toMatch(/^draw-.*-key\.pem$/);
  await page.getByLabel('I saved the backup somewhere safe.').check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Open the app' }).click();
  await expect(page).toHaveURL(/\/app$/);
}

async function seatAs(page: Page, seat: Seat) {
  await openOnboarding(page);
  await page.getByRole('listitem').filter({ hasText: seat }).click();
  // The party exists already, so the seat opens straight away for its key holder.
  await page.goto('/app');
}

test('each person signs with their own key', async ({ page, request }, info) => {
  try {
    await request.post(`${API}/api/actions/reset`, { data: {} });
    await openOnboarding(page);
    await startDemoIfNeeded(page);
    ev.record('demo started');

    await join(page, 'Fund manager');
    await page.getByRole('button', { name: 'Create fund' }).click();
    expect(await signAll(page, 'created')).toBeGreaterThanOrEqual(1);
    await ev.shot(page, 'fund-created');
    ev.record('fund manager created its party and the fund');

    for (const lp of ['LP A', 'LP B'] as const) {
      await join(page, lp);
      await page.getByRole('button', { name: 'Add test CC' }).first().click();
      await signAll(page, 'Added');
    }
    ev.record('LP A and LP B created their parties');

    await seatAs(page, 'Fund manager');
    await page.goto('/app/investors');
    for (const amount of ['$1,000,000', '$700,000']) {
      await page.getByRole('button', { name: `Invite for ${amount}` }).click();
      await signAll(page, 'Invitation sent');
    }
    ev.record('fund manager invited both LPs');

    for (const lp of ['LP A', 'LP B'] as const) {
      await seatAs(page, lp);
      await page.getByRole('button', { name: 'Accept commitment' }).click();
      await signAll(page, 'Commitment accepted');
    }
    ev.record('both LPs accepted');

    await seatAs(page, 'Fund manager');
    await page.goto('/app/calls/new');
    await page.getByRole('button', { name: 'Issue capital call' }).click();
    await signAll(page, 'issued');
    await expect(page.getByRole('heading', { level: 1, name: 'Call 1' })).toBeVisible();
    await ev.shot(page, 'call-issued');
    ev.record('call issued');

    await seatAs(page, 'LP A');
    await page.getByRole('link').filter({ hasText: 'Call 1' }).click();
    await expect(page).toHaveURL(/\/app\/notices\//);
    const noticeUrl = page.url();
    await page.getByRole('button', { name: /^Pay 40 / }).click();
    await signAll(page, 'locked');
    await ev.shot(page, 'lp-paid');
    ev.record('LP A paid with its key');

    await seatAs(page, 'LP B');
    await page.goto(noticeUrl);
    await expect(page.getByRole('heading', { name: 'Not on your ledger' })).toBeVisible();
    ev.record('LP B cannot open LP A notice');

    await seatAs(page, 'Fund manager');
    await page.goto('/app/calls/Call%201');
    await page.getByRole('button', { name: /^Settle 40/ }).click();
    await signAll(page, 'verified');
    ev.record('fund manager settled with its key');

    await seatAs(page, 'LP A');
    await page.goto(noticeUrl);
    await expect(page.getByText('Verified funded').first()).toBeVisible();
    await ev.shot(page, 'lp-verified');
    ev.record('LP A sees verified funded');
  } finally {
    ev.write(info, 10);
  }
});
