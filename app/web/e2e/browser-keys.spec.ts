import { expect, test, type Page } from '@playwright/test';

// Non-custodial journey: every role creates its own account and key in the
// browser, and every ledger action is approved in the Sign dialog. Runs only
// with DRAW_PARTY_MODE=external (LocalNet).
test.skip(process.env.DRAW_PARTY_MODE !== 'external', 'browser keys need DRAW_PARTY_MODE=external');

const shots = `../../evidence/local/browser/${process.env.DRAW_E2E_RUN}/screens`;
let step = 0;
async function snap(page: Page, name: string): Promise<void> {
  step += 1;
  await page.screenshot({ path: `${shots}/${String(step).padStart(2, '0')}-keys-${name}.png`, fullPage: true });
}

const HOME_TAB: Record<string, string> = { 'Fund admin': 'Calls', 'Unrelated party': 'Home' };
async function viewAs(page: Page, name: string): Promise<void> {
  await page.getByRole('group', { name: 'Viewing as' }).getByRole('button', { name, exact: true }).click();
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: HOME_TAB[name] ?? 'My notices' }).click();
}

async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  const toast = page.getByRole('status').filter({ hasText: text });
  await expect(toast).toBeVisible({ timeout: 180_000 });
  await toast.getByRole('button', { name: 'Dismiss' }).click();
}

// Approves every signature the action asks for, then waits for its result.
async function signAll(page: Page, result: string | RegExp, shot?: string): Promise<number> {
  let signed = 0;
  const dialog = page.getByRole('dialog', { name: 'Sign with your key' });
  const toast = page.getByRole('status').filter({ hasText: result });
  for (;;) {
    await expect(dialog.or(toast)).toBeVisible({ timeout: 180_000 });
    if (await toast.isVisible()) break;
    if (shot && signed === 0) await snap(page, shot);
    await dialog.getByRole('button', { name: 'Sign', exact: true }).click();
    signed += 1;
    await expect(dialog).toBeHidden();
  }
  await toast.getByRole('button', { name: 'Dismiss' }).click();
  return signed;
}

function localInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

test('each person signs with their own key: onboarding, call, payments, settlement, overdue', async ({ page, request }) => {
  await request.post('/api/actions/reset', { data: {} });
  await page.goto('/?as=admin');
  await page.getByRole('button', { name: 'Start demo' }).click();
  await expectToast(page, 'Ready');

  // The fund admin creates an account: key generated here, party onboarded with it.
  await page.getByRole('button', { name: 'Create account' }).click();
  await expectToast(page, 'Account created');
  await expect(page.locator('.keychip')).toContainText('Your key');
  await page.getByRole('button', { name: 'Create fund' }).click();
  expect(await signAll(page, 'created', 'admin-sign-fund')).toBe(1);

  for (const lp of ['LP A', 'LP B', 'LP C']) {
    await viewAs(page, lp);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expectToast(page, 'Account created');
  }

  await viewAs(page, 'Fund admin');
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Investors' }).click();
  for (const amount of ['$1,000,000', '$700,000', '$500,000']) {
    await page.getByRole('button', { name: `Invite for ${amount}` }).click();
    expect(await signAll(page, 'Invitation sent')).toBe(1);
  }
  await snap(page, 'admin-investors-invited');

  for (const lp of ['LP A', 'LP B', 'LP C']) {
    await viewAs(page, lp);
    await page.getByRole('button', { name: 'Accept commitment' }).click();
    expect(await signAll(page, 'Commitment accepted')).toBe(1);
    await page.getByRole('button', { name: 'Add test Amulet' }).click();
    expect(await signAll(page, 'test Amulet')).toBe(1);
  }

  await viewAs(page, 'Fund admin');
  await page.getByRole('link', { name: 'Create capital call' }).click();
  await page.getByLabel('Due').fill(localInput(new Date(Date.now() + 4 * 60_000)));
  await page.getByRole('button', { name: 'Issue capital call' }).click();
  expect(await signAll(page, 'issued')).toBe(1);

  // LP C starts paying, then cancels at the Sign dialog: nothing is submitted.
  await viewAs(page, 'LP C');
  await page.locator('.notice-card').click();
  await page.getByRole('button', { name: 'Pay 25 Amulet' }).click();
  const dialog = page.getByRole('dialog', { name: 'Sign with your key' });
  await expect(dialog).toContainText('Lock 25 Amulet');
  await snap(page, 'lp-c-sign-dialog');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expectToast(page, 'cancelled');
  await expect(page.getByRole('button', { name: 'Pay 25 Amulet' })).toBeVisible();

  for (const [lp, units] of [['LP A', '40'], ['LP B', '35']]) {
    await viewAs(page, lp);
    await page.locator('.notice-card').click();
    await page.getByRole('button', { name: `Pay ${units} Amulet` }).click();
    expect(await signAll(page, 'locked for the fund')).toBe(1);
    await viewAs(page, 'Fund admin');
    await page.getByRole('button', { name: 'Settle', exact: true }).first().click();
    // Two signatures: match the payment, then settle it.
    expect(await signAll(page, 'independently verified')).toBe(2);
  }
  await expect(page.locator('.figure.good strong')).toHaveText('$750,000');

  await expect(page.getByRole('button', { name: 'Mark overdue' })).toBeVisible({ timeout: 360_000 });
  await page.getByRole('button', { name: 'Mark overdue' }).click();
  expect(await signAll(page, 'Marked overdue')).toBe(1);
  await expect(page.locator('.figure.bad strong')).toHaveText('$250,000');
  await snap(page, 'admin-final-totals');
});
