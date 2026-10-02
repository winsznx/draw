import { expect, test, type Page } from '@playwright/test';

// The directive's primary journey, driven through the real UI against the real
// ledger: admin issues a call, LP A and LP B fund, LP B's wrong amount is
// refused, LP C does nothing and goes overdue, other parties see nothing.
const shots = `../../evidence/local/browser/${process.env.DRAW_E2E_RUN}/screens`;
let step = 0;

async function snap(page: Page, name: string): Promise<void> {
  step += 1;
  await page.screenshot({ path: `${shots}/${String(step).padStart(2, '0')}-${name}.png`, fullPage: true });
}

const HOME_TAB: Record<string, string> = { 'Fund admin': 'Calls', 'Unrelated party': 'Home' };

// Switch the ledger login with the switcher, then go to that party's home tab.
async function viewAs(page: Page, name: string): Promise<void> {
  await page.getByRole('group', { name: 'Viewing as' }).getByRole('button', { name, exact: true }).click();
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: HOME_TAB[name] ?? 'My notices' }).click();
  await expect(page.getByText(`with ${name}'s own login`)).toBeVisible();
}

async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  const toast = page.getByRole('status').filter({ hasText: text });
  await expect(toast).toBeVisible({ timeout: 180_000 });
  await toast.getByRole('button', { name: 'Dismiss' }).click();
}

function localInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

test('capital call from issue to verified funding, with privacy and an unpaid investor', async ({ page, request }) => {
  await request.post('/api/actions/reset', { data: {} });

  // Admin sets up the demo fund.
  await page.goto('/?as=admin');
  await page.getByRole('button', { name: 'Create demo fund' }).click();
  await expectToast(page, 'is set up');

  // Each investor accepts its own commitment with its own login.
  for (const lp of ['LP A', 'LP B', 'LP C']) {
    await viewAs(page, lp);
    await expect(page.getByRole('heading', { name: 'Invitation to commit' })).toBeVisible();
    if (lp === 'LP A') await snap(page, 'lp-a-invitation');
    await page.getByRole('button', { name: 'Accept commitment' }).click();
    await expectToast(page, 'Commitment accepted');
  }

  // Admin issues the call, due a little over two minutes from now.
  await viewAs(page, 'Fund admin');
  await page.getByRole('link', { name: 'Create capital call' }).click();
  const due = new Date(Date.now() + 3 * 60_000);
  await page.getByLabel('Due').fill(localInput(due));
  await snap(page, 'admin-create-call');
  await page.getByRole('button', { name: 'Issue capital call' }).click();
  await expectToast(page, 'issued');
  await expect(page.getByRole('heading', { name: 'Call 1' })).toBeVisible();
  await expect(page.getByText('Awaiting payment')).toHaveCount(3);
  await snap(page, 'admin-call-issued');

  // LP A sees exactly one notice, its own, and pays it.
  await viewAs(page, 'LP A');
  const cardsA = page.locator('.notice-card');
  await expect(cardsA).toHaveCount(1);
  await expect(cardsA).toContainText('$400,000');
  const noticeA = await cardsA.getAttribute('href');
  await cardsA.click();
  await page.getByRole('button', { name: 'Pay 40 Amulet' }).click();
  await expectToast(page, 'locked for the fund');
  await expect(page.locator('.terms')).toContainText('Payment locked, waiting for the fund');
  await snap(page, 'lp-a-payment-locked');

  // Same page, LP B's login: the notice is not visible. Then the same with a fresh load of the link.
  await page.getByRole('group', { name: 'Viewing as' }).getByRole('button', { name: 'LP B', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Not visible to you' })).toBeVisible();
  await expect(page.getByText('$400,000')).toHaveCount(0);
  await snap(page, 'lp-b-cannot-open-lp-a');
  await page.goto(`/?as=lpB${noticeA}`);
  await expect(page.getByRole('heading', { name: 'Not visible to you' })).toBeVisible();

  // Admin settles LP A. Funded appears only after the verifier's receipt.
  await page.goto('/?as=admin');
  await page.getByRole('button', { name: 'Settle', exact: true }).first().click();
  await expectToast(page, 'independently verified');
  await expect(page.locator('.figure.good strong')).toHaveText('$400,000');

  // LP B pays the wrong amount. The fund cannot settle it. LP B withdraws and pays exactly.
  await viewAs(page, 'LP B');
  await page.locator('.notice-card').click();
  await page.getByRole('button', { name: 'Pay a different amount' }).click();
  await page.getByLabel('Amount in Amulet').fill('30');
  await page.getByRole('button', { name: 'Pay this amount' }).click();
  await expectToast(page, 'locked for the fund');
  await expect(page.locator('.callout.bad')).toContainText('does not match the amount due');
  await snap(page, 'lp-b-wrong-amount');

  await page.goto('/?as=admin#/payments');
  const wrongRow = page.locator('tr', { hasText: 'Wrong amount' });
  await expect(wrongRow).toBeVisible();
  await expect(wrongRow.getByRole('button', { name: 'Settle' })).toHaveCount(0);
  await snap(page, 'admin-payments-wrong-amount');

  await page.goto(`/?as=lpB`);
  await page.locator('.notice-card').click();
  await page.getByRole('button', { name: 'Withdraw it' }).click();
  await expectToast(page, 'withdrawn');
  await page.getByRole('button', { name: 'Pay 35 Amulet' }).click();
  await expectToast(page, 'locked for the fund');

  await page.goto('/?as=admin');
  await page.getByRole('button', { name: 'Settle', exact: true }).first().click();
  await expectToast(page, 'independently verified');
  await expect(page.locator('.figure.good strong')).toHaveText('$750,000');

  // LP C does nothing. After the due time the admin marks it overdue.
  await expect(page.getByRole('button', { name: 'Mark overdue' })).toBeVisible({ timeout: 300_000 });
  await page.getByRole('button', { name: 'Mark overdue' }).click();
  await expectToast(page, 'Marked overdue');
  await expect(page.locator('.figure.good strong')).toHaveText('$750,000');
  await expect(page.locator('.figure.bad strong')).toHaveText('$250,000');
  await snap(page, 'admin-final-totals');

  await page.getByRole('link', { name: 'Call 1' }).click();
  await expect(page.getByText('Funded', { exact: true })).toHaveCount(2);
  await expect(page.getByText('Overdue', { exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Details' }).first().click();
  await expect(page.getByText('An independent read-only verifier confirmed')).toBeVisible();
  await snap(page, 'admin-call-detail-receipt');

  // LP C sees its own overdue notice and nothing else.
  await viewAs(page, 'LP C');
  await expect(page.locator('.notice-card')).toHaveCount(1);
  await expect(page.locator('.notice-card')).toContainText('Overdue');

  // The unrelated party gets nothing, and admin pages refuse it.
  await viewAs(page, 'Unrelated party');
  await expect(page.getByRole('heading', { name: 'The ledger returned nothing' })).toBeVisible();
  await snap(page, 'outsider-empty');
  await page.goto('/?as=outsider#/calls');
  await expect(page.getByRole('heading', { name: 'This page is for the fund admin' })).toBeVisible();

  // The judge proof surface renders from evidence files.
  await page.goto('/?as=admin#/proof');
  await expect(page.getByRole('heading', { name: 'Proof', exact: true })).toBeVisible();
  await expect(page.getByText('Who could read what')).toBeVisible();
  await snap(page, 'proof');
});
