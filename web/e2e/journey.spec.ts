import { expect, test, type Page } from '@playwright/test';

import { ACCESS_CODE, dismissToast, evidence, openOnboarding, startDemoIfNeeded, type Seat } from './helpers';

// A capital call the way people use the site: each person takes their seat,
// the fund manager issues a call, LP A pays its notice, LP B opening LP A's
// link sees nothing, the fund manager settles, and LP A's notice shows
// verified funded. Every run is a fresh browser, so it starts its own demo
// fund, and a second browser at the end must not see that fund. Last, the
// fund manager starts over, which withdraws the invitations nobody accepted,
// and LP A's old notice link then asks for a new demo fund. Skipped in
// browser-key mode, which has its own journey.
test.skip(process.env.DRAW_PARTY_MODE === 'external', 'browser-key mode runs browser-keys.spec.ts');

const ev = evidence('journey');
const CALL = `Call ${ev.run.slice(8, 12)}`;

async function sit(page: Page, seat: Seat) {
  await openOnboarding(page);
  await startDemoIfNeeded(page);
  await page.getByRole('listitem').filter({ hasText: seat }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  const access = page.getByLabel('Access code');
  if (await access.isVisible().catch(() => false)) {
    // A public code is already filled in. DRAW_ACCESS_CODE, when set, replaces it.
    if (ACCESS_CODE) await access.fill(ACCESS_CODE);
    await page.getByRole('button', { name: 'Save and continue' }).click();
  }
  await page.getByRole('button', { name: 'Open the app' }).click();
  await expect(page).toHaveURL(/\/app$/);
}

async function acceptIfInvited(page: Page) {
  const accept = page.getByRole('button', { name: 'Accept commitment' });
  await expect(accept.or(page.getByRole('heading', { name: 'Your notices' }))).toBeVisible();
  if (await accept.isVisible()) {
    await accept.click();
    await dismissToast(page, 'Commitment accepted');
  }
}

test('capital call journey', async ({ page, browser }, info) => {
  try {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Capital calls');
    await ev.shot(page, 'landing');
    ev.record('landing loads');

    await sit(page, 'LP A');
    await acceptIfInvited(page);
    ev.record('LP A committed');

    await sit(page, 'Fund manager');
    await expect(page.getByText('Deployable now', { exact: true })).toBeVisible();
    await ev.shot(page, 'manager-overview');
    ev.record('fund manager onboarded');

    await page.getByRole('link', { name: 'Create capital call' }).first().click();
    await page.getByLabel('Name or reference').fill(CALL);
    await page.getByLabel('Amount called from LP A').fill('100000');
    await page.getByLabel('Canton Coin for LP A').fill('10');
    for (const lp of ['LP B', 'LP C']) {
      const amount = page.getByLabel(`Amount called from ${lp}`);
      if (await amount.isVisible()) {
        await amount.fill('0');
        await page.getByLabel(`Canton Coin for ${lp}`).fill('0');
      }
    }
    await page.getByRole('button', { name: 'Issue capital call' }).click();
    await expect(page.getByRole('heading', { level: 1, name: CALL })).toBeVisible();
    await ev.shot(page, 'call-issued');
    ev.record('call issued');

    await sit(page, 'LP A');
    await page.getByRole('link').filter({ hasText: CALL }).click();
    await expect(page).toHaveURL(/\/app\/notices\//);
    const noticeUrl = page.url();
    await page.getByRole('button', { name: /^Pay 10 / }).click();
    // The notice's own status, read back from the ledger, not the toast.
    await expect(page.getByText('Payment locked, waiting for the fund', { exact: true }).first()).toBeVisible();
    await ev.shot(page, 'lp-paid');
    ev.record('LP A locked its payment');

    await sit(page, 'LP B');
    await page.goto(noticeUrl);
    await expect(page.getByRole('heading', { name: 'Not on your ledger' })).toBeVisible();
    await ev.shot(page, 'lpb-cannot-read');
    ev.record('LP B cannot open LP A notice');

    await sit(page, 'Fund manager');
    await page.goto(`/app/calls/${encodeURIComponent(CALL)}`);
    await page.getByRole('button', { name: /^Settle 10/ }).click();
    await expect(page.getByText('Funded', { exact: true }).first()).toBeVisible();
    await ev.shot(page, 'settled');
    ev.record('fund manager settled, verifier confirmed');

    await sit(page, 'LP A');
    await page.goto(noticeUrl);
    await expect(page.getByText('Verified funded').first()).toBeVisible();
    await ev.shot(page, 'lp-verified');
    ev.record('LP A sees verified funded');

    const visitor = await browser.newContext();
    try {
      const other = await visitor.newPage();
      await other.goto('/onboard');
      await expect(other.getByText('This browser has no demo fund yet')).toBeVisible();
      await ev.shot(other, 'second-browser');
    } finally {
      await visitor.close();
    }
    ev.record('a second browser gets its own demo fund');

    await sit(page, 'Fund manager');
    await page.goto('/app/investors');
    await page.getByText('Start over', { exact: true }).click();
    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('button', { name: 'Start a new demo fund' }).click();
    await dismissToast(page, 'Cleared. Start a new demo fund.');
    await expect(page.getByRole('heading', { name: 'Start the demo fund' })).toBeVisible();
    await page.evaluate(() => localStorage.setItem('draw-seat', 'lpA'));
    await page.goto(noticeUrl);
    await expect(page.getByRole('heading', { name: 'This browser has no demo fund yet' })).toBeVisible();
    await ev.shot(page, 'started-over');
    ev.record('starting over leaves this browser without a fund');
  } finally {
    ev.write(info, 10);
  }
});
