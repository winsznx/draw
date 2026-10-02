# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey.spec.ts >> capital call from issue to verified funding, with privacy and an unpaid investor
- Location: e2e/journey.spec.ts:30:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('status').filter({ hasText: 'is set up' })
Expected: visible
Timeout: 180000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('status').filter({ hasText: 'is set up' }) with timeout 180000ms
  - waiting for getByRole('status').filter({ hasText: 'is set up' })

```

```yaml
- banner:
  - link "DRAW":
    - /url: "#/"
  - text: Viewing as
  - group "Viewing as":
    - button "Fund admin" [pressed]
    - button "LP A"
    - button "LP B"
    - button "LP C"
    - button "Unrelated party"
  - strong: LocalNet
  - text: demo environment
  - navigation "Sections":
    - link "Calls":
      - /url: "#/"
    - link "Payments":
      - /url: "#/payments"
    - link "Investors":
      - /url: "#/investors"
    - link "Proof":
      - /url: "#/proof"
- main:
  - heading "Start a demo fund" [level=1]
  - paragraph: This creates a fund admin, three investors, and an unrelated party on LocalNet, each with its own ledger login. Investors get test Amulet and an invitation to commit. All names are demo data.
  - button "Create demo fund"
- contentinfo
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | 
  3   | // The directive's primary journey, driven through the real UI against the real
  4   | // ledger: admin issues a call, LP A and LP B fund, LP B's wrong amount is
  5   | // refused, LP C does nothing and goes overdue, other parties see nothing.
  6   | const shots = `../../evidence/local/browser/${process.env.DRAW_E2E_RUN}/screens`;
  7   | let step = 0;
  8   | 
  9   | async function snap(page: Page, name: string): Promise<void> {
  10  |   step += 1;
  11  |   await page.screenshot({ path: `${shots}/${String(step).padStart(2, '0')}-${name}.png`, fullPage: true });
  12  | }
  13  | 
  14  | async function viewAs(page: Page, name: string): Promise<void> {
  15  |   await page.getByRole('group', { name: 'Viewing as' }).getByRole('button', { name, exact: true }).click();
  16  |   await expect(page.getByText(`with ${name}'s own login`)).toBeVisible();
  17  | }
  18  | 
  19  | async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  20  |   const toast = page.getByRole('status').filter({ hasText: text });
> 21  |   await expect(toast).toBeVisible({ timeout: 180_000 });
      |                       ^ Error: expect(locator).toBeVisible() failed
  22  |   await toast.getByRole('button', { name: 'Dismiss' }).click();
  23  | }
  24  | 
  25  | function localInput(date: Date): string {
  26  |   const pad = (n: number) => String(n).padStart(2, '0');
  27  |   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  28  | }
  29  | 
  30  | test('capital call from issue to verified funding, with privacy and an unpaid investor', async ({ page, request }) => {
  31  |   await request.post('/api/actions/reset', { data: {} });
  32  | 
  33  |   // Admin sets up the demo fund.
  34  |   await page.goto('/?as=admin');
  35  |   await page.getByRole('button', { name: 'Create demo fund' }).click();
  36  |   await expectToast(page, 'is set up');
  37  | 
  38  |   // Each investor accepts its own commitment with its own login.
  39  |   for (const lp of ['LP A', 'LP B', 'LP C']) {
  40  |     await viewAs(page, lp);
  41  |     await expect(page.getByRole('heading', { name: 'Invitation to commit' })).toBeVisible();
  42  |     if (lp === 'LP A') await snap(page, 'lp-a-invitation');
  43  |     await page.getByRole('button', { name: 'Accept commitment' }).click();
  44  |     await expectToast(page, 'Commitment accepted');
  45  |   }
  46  | 
  47  |   // Admin issues the call, due a little over two minutes from now.
  48  |   await viewAs(page, 'Fund admin');
  49  |   await page.getByRole('link', { name: 'Create capital call' }).click();
  50  |   const due = new Date(Date.now() + 3 * 60_000);
  51  |   await page.getByLabel('Due').fill(localInput(due));
  52  |   await snap(page, 'admin-create-call');
  53  |   await page.getByRole('button', { name: 'Issue capital call' }).click();
  54  |   await expectToast(page, 'issued');
  55  |   await expect(page.getByRole('heading', { name: 'Call 1' })).toBeVisible();
  56  |   await expect(page.getByText('Awaiting payment')).toHaveCount(3);
  57  |   await snap(page, 'admin-call-issued');
  58  | 
  59  |   // LP A sees exactly one notice, its own, and pays it.
  60  |   await viewAs(page, 'LP A');
  61  |   const cardsA = page.locator('.notice-card');
  62  |   await expect(cardsA).toHaveCount(1);
  63  |   await expect(cardsA).toContainText('$400,000');
  64  |   const noticeA = await cardsA.getAttribute('href');
  65  |   await cardsA.click();
  66  |   await page.getByRole('button', { name: 'Pay 40 Amulet' }).click();
  67  |   await expectToast(page, 'locked for the fund');
  68  |   await expect(page.locator('.terms')).toContainText('Payment locked, waiting for the fund');
  69  |   await snap(page, 'lp-a-payment-locked');
  70  | 
  71  |   // LP B cannot open LP A's notice, even with the exact link.
  72  |   await page.goto(`/?as=lpB${noticeA}`);
  73  |   await expect(page.getByRole('heading', { name: 'Not visible to you' })).toBeVisible();
  74  |   await expect(page.getByText('$400,000')).toHaveCount(0);
  75  |   await snap(page, 'lp-b-cannot-open-lp-a');
  76  | 
  77  |   // Admin settles LP A. Funded appears only after the verifier's receipt.
  78  |   await page.goto('/?as=admin');
  79  |   await page.getByRole('button', { name: 'Settle', exact: true }).first().click();
  80  |   await expectToast(page, 'independently verified');
  81  |   await expect(page.locator('.figure.good strong')).toHaveText('$400,000');
  82  | 
  83  |   // LP B pays the wrong amount. The fund cannot settle it. LP B withdraws and pays exactly.
  84  |   await viewAs(page, 'LP B');
  85  |   await page.locator('.notice-card').click();
  86  |   await page.getByRole('button', { name: 'Pay a different amount' }).click();
  87  |   await page.getByLabel('Amount in Amulet').fill('30');
  88  |   await page.getByRole('button', { name: 'Pay this amount' }).click();
  89  |   await expectToast(page, 'locked for the fund');
  90  |   await expect(page.locator('.callout.bad')).toContainText('does not match the amount due');
  91  |   await snap(page, 'lp-b-wrong-amount');
  92  | 
  93  |   await page.goto('/?as=admin#/payments');
  94  |   const wrongRow = page.locator('tr', { hasText: 'Wrong amount' });
  95  |   await expect(wrongRow).toBeVisible();
  96  |   await expect(wrongRow.getByRole('button', { name: 'Settle' })).toHaveCount(0);
  97  |   await snap(page, 'admin-payments-wrong-amount');
  98  | 
  99  |   await page.goto(`/?as=lpB`);
  100 |   await page.locator('.notice-card').click();
  101 |   await page.getByRole('button', { name: 'Withdraw it' }).click();
  102 |   await expectToast(page, 'withdrawn');
  103 |   await page.getByRole('button', { name: 'Pay 35 Amulet' }).click();
  104 |   await expectToast(page, 'locked for the fund');
  105 | 
  106 |   await page.goto('/?as=admin');
  107 |   await page.getByRole('button', { name: 'Settle', exact: true }).first().click();
  108 |   await expectToast(page, 'independently verified');
  109 |   await expect(page.locator('.figure.good strong')).toHaveText('$750,000');
  110 | 
  111 |   // LP C does nothing. After the due time the admin marks it overdue.
  112 |   await expect(page.getByRole('button', { name: 'Mark overdue' })).toBeVisible({ timeout: 300_000 });
  113 |   await page.getByRole('button', { name: 'Mark overdue' }).click();
  114 |   await expectToast(page, 'Marked overdue');
  115 |   await expect(page.locator('.figure.good strong')).toHaveText('$750,000');
  116 |   await expect(page.locator('.figure.bad strong')).toHaveText('$250,000');
  117 |   await snap(page, 'admin-final-totals');
  118 | 
  119 |   await page.getByRole('link', { name: 'Call 1' }).click();
  120 |   await expect(page.getByText('Funded', { exact: true })).toHaveCount(2);
  121 |   await expect(page.getByText('Overdue', { exact: true })).toHaveCount(1);
```