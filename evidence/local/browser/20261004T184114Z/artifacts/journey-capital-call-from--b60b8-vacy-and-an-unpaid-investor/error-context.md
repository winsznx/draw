# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey.spec.ts >> capital call from issue to verified funding, with privacy and an unpaid investor
- Location: e2e/journey.spec.ts:36:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('An independent read-only verifier confirmed')
Expected: visible
Error: strict mode violation: getByText('An independent read-only verifier confirmed') resolved to 2 elements:
    1) <div class="receipt ">…</div> aka getByText('An independent read-only verifier confirmed 40 Amulet reached the fund, 14 of')
    2) <p>…</p> aka getByText('Everything above was read')

Call log:
  - Expect "toBeVisible" getByText('An independent read-only verifier confirmed') with timeout 60000ms
  - waiting for getByText('An independent read-only verifier confirmed')

```

# Page snapshot

```yaml
- generic [ref=f4e2]:
  - banner [ref=f4e3]:
    - generic [ref=f4e4]:
      - link "DRAW" [ref=f4e5] [cursor=pointer]:
        - /url: "#/"
      - generic [ref=f4e6]:
        - generic [ref=f4e7]: Viewing as
        - group "Viewing as" [ref=f4e8]:
          - button "Fund admin" [pressed] [ref=f4e9] [cursor=pointer]
          - button "LP A" [ref=f4e10] [cursor=pointer]
          - button "LP B" [ref=f4e11] [cursor=pointer]
          - button "LP C" [ref=f4e12] [cursor=pointer]
          - button "Unrelated party" [ref=f4e13] [cursor=pointer]
      - generic [ref=f4e14]:
        - strong [ref=f4e15]: LocalNet
        - text: demo environment
    - navigation "Sections" [ref=f4e16]:
      - link "Calls" [ref=f4e17] [cursor=pointer]:
        - /url: "#/"
      - link "Payments" [ref=f4e18] [cursor=pointer]:
        - /url: "#/payments"
      - link "Investors" [ref=f4e19] [cursor=pointer]:
        - /url: "#/investors"
      - link "Proof" [ref=f4e20] [cursor=pointer]:
        - /url: "#/proof"
  - main [ref=f4e21]:
    - generic [ref=f4e23]:
      - paragraph [ref=f4e24]:
        - link "All calls" [ref=f4e25] [cursor=pointer]:
          - /url: "#/"
      - heading "Call 1" [level=1] [ref=f4e26]
      - paragraph [ref=f4e27]: Initial close drawdown Due Oct 4, 07:44 PM, now.
    - generic [ref=f4e28]:
      - generic [ref=f4e29]:
        - generic [ref=f4e30]: Funded and verified
        - strong [ref=f4e31]: $750,000
        - generic [ref=f4e32]: 75 Amulet received
      - generic [ref=f4e33]:
        - generic [ref=f4e34]: Unresolved
        - strong [ref=f4e35]: $250,000
        - generic [ref=f4e36]: 1 of 3 obligations
      - generic [ref=f4e37]:
        - generic [ref=f4e38]: Called
        - strong [ref=f4e39]: $1,000,000
        - generic [ref=f4e40]: nothing waived
    - generic [ref=f4e41]:
      - heading "Investor obligations" [level=2] [ref=f4e42]
      - generic "$750,000 of $1,000,000 funded" [ref=f4e43]
      - table [ref=f4e46]:
        - rowgroup [ref=f4e47]:
          - row [ref=f4e48]:
            - columnheader "Investor" [ref=f4e49]
            - columnheader "Called" [ref=f4e50]
            - columnheader "Status" [ref=f4e51]
            - columnheader "Actions" [ref=f4e52]
        - rowgroup [ref=f4e53]:
          - row [ref=f4e54]:
            - cell "LP A 40 Amulet" [ref=f4e55]:
              - strong [ref=f4e56]: LP A
              - generic [ref=f4e57]: 40 Amulet
            - cell "$400,000" [ref=f4e58]
            - cell "Funded Hide details" [ref=f4e59]:
              - generic [ref=f4e60]: Funded
              - button "Hide details" [expanded] [active] [ref=f4e62] [cursor=pointer]
            - cell [ref=f4e63]
          - row [ref=f4e64]:
            - cell "An independent read-only verifier confirmed 40 Amulet reached the fund, 14 of 14 checks. Settlement timeline Investor asked to pay, 40 Amulet Oct 4, 07:41 PM by LP A Payment locked for the fund, 40 Amulet Oct 4, 07:41 PM by LP A. Update 12208adcdf5a05… Fund executed the transfer Oct 4, 07:41 PM by Fund admin. Update 12204b3211ef50… Verifier read the settlement Oct 4, 07:41 PM by Fund admin. Update 12204b3211ef50… Verified funded Oct 4, 07:41 PM by Fund admin. Update 12204b3211ef50…" [ref=f4e65]:
              - generic [ref=f4e66]:
                - generic [ref=f4e67]:
                  - text: An independent read-only verifier confirmed
                  - strong [ref=f4e68]: 40 Amulet
                  - text: reached the fund, 14 of 14 checks.
                  - group [ref=f4e69]:
                    - generic "Verification details" [ref=f4e70] [cursor=pointer]
                - heading "Settlement timeline" [level=3] [ref=f4e71]
                - list [ref=f4e72]:
                  - listitem [ref=f4e73]:
                    - strong [ref=f4e74]: Investor asked to pay
                    - text: ", 40 Amulet"
                    - generic [ref=f4e75]: Oct 4, 07:41 PM by LP A
                  - listitem [ref=f4e76]:
                    - strong [ref=f4e77]: Payment locked for the fund
                    - text: ", 40 Amulet"
                    - generic [ref=f4e78]: Oct 4, 07:41 PM by LP A. Update 12208adcdf5a05…
                  - listitem [ref=f4e79]:
                    - strong [ref=f4e80]: Fund executed the transfer
                    - generic [ref=f4e81]: Oct 4, 07:41 PM by Fund admin. Update 12204b3211ef50…
                  - listitem [ref=f4e82]:
                    - strong [ref=f4e83]: Verifier read the settlement
                    - generic [ref=f4e84]: Oct 4, 07:41 PM by Fund admin. Update 12204b3211ef50…
                  - listitem [ref=f4e85]:
                    - strong [ref=f4e86]: Verified funded
                    - generic [ref=f4e87]: Oct 4, 07:41 PM by Fund admin. Update 12204b3211ef50…
                - group [ref=f4e88]:
                  - generic "Ledger details" [ref=f4e89] [cursor=pointer]
          - row [ref=f4e90]:
            - cell "LP B 35 Amulet" [ref=f4e91]:
              - strong [ref=f4e92]: LP B
              - generic [ref=f4e93]: 35 Amulet
            - cell "$350,000" [ref=f4e94]
            - cell "Funded Details" [ref=f4e95]:
              - generic [ref=f4e96]: Funded
              - button "Details" [ref=f4e98] [cursor=pointer]
            - cell [ref=f4e99]
          - row [ref=f4e100]:
            - cell "LP C 25 Amulet" [ref=f4e101]:
              - strong [ref=f4e102]: LP C
              - generic [ref=f4e103]: 25 Amulet
            - cell "$250,000" [ref=f4e104]
            - cell "Overdue Details" [ref=f4e105]:
              - generic [ref=f4e106]: Overdue
              - button "Details" [ref=f4e108] [cursor=pointer]
            - cell [ref=f4e109]:
              - generic [ref=f4e110]:
                - button "Send to review" [ref=f4e111] [cursor=pointer]
                - button "Waive" [ref=f4e112] [cursor=pointer]
  - contentinfo [ref=f4e113]:
    - paragraph [ref=f4e114]: "Everything above was read from the ledger with Fund admin's own login: user draw-admin-20261004184117, party draw-admin-202….Dollar amounts are the business scenario. Amulet amounts are what moves on LocalNet. Funded means an independent read-only verifier confirmed the settlement. Switching role here switches the ledger login. It is a demo convenience, not production sign-in."
```

# Test source

```ts
  31  |   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  32  | }
  33  | 
  34  | test.skip(process.env.DRAW_PARTY_MODE === 'external', 'covered by browser-keys.spec.ts in external mode');
  35  | 
  36  | test('capital call from issue to verified funding, with privacy and an unpaid investor', async ({ page, request }) => {
  37  |   await request.post('/api/actions/reset', { data: {} });
  38  | 
  39  |   // Admin sets up the demo fund.
  40  |   await page.goto('/?as=admin');
  41  |   await page.getByRole('button', { name: 'Create demo fund' }).click();
  42  |   await expectToast(page, 'is set up');
  43  | 
  44  |   // Each investor accepts its own commitment with its own login.
  45  |   for (const lp of ['LP A', 'LP B', 'LP C']) {
  46  |     await viewAs(page, lp);
  47  |     await expect(page.getByRole('heading', { name: 'Invitation to commit' })).toBeVisible();
  48  |     if (lp === 'LP A') await snap(page, 'lp-a-invitation');
  49  |     await page.getByRole('button', { name: 'Accept commitment' }).click();
  50  |     await expectToast(page, 'Commitment accepted');
  51  |   }
  52  | 
  53  |   // Admin issues the call, due a little over two minutes from now.
  54  |   await viewAs(page, 'Fund admin');
  55  |   await page.getByRole('link', { name: 'Create capital call' }).click();
  56  |   const due = new Date(Date.now() + 3 * 60_000);
  57  |   await page.getByLabel('Due').fill(localInput(due));
  58  |   await snap(page, 'admin-create-call');
  59  |   await page.getByRole('button', { name: 'Issue capital call' }).click();
  60  |   await expectToast(page, 'issued');
  61  |   await expect(page.getByRole('heading', { name: 'Call 1' })).toBeVisible();
  62  |   await expect(page.getByText('Awaiting payment')).toHaveCount(3);
  63  |   await snap(page, 'admin-call-issued');
  64  | 
  65  |   // LP A sees exactly one notice, its own, and pays it.
  66  |   await viewAs(page, 'LP A');
  67  |   const cardsA = page.locator('.notice-card');
  68  |   await expect(cardsA).toHaveCount(1);
  69  |   await expect(cardsA).toContainText('$400,000');
  70  |   const noticeA = await cardsA.getAttribute('href');
  71  |   await cardsA.click();
  72  |   await page.getByRole('button', { name: 'Pay 40 Amulet' }).click();
  73  |   await expectToast(page, 'locked for the fund');
  74  |   await expect(page.locator('.terms')).toContainText('Payment locked, waiting for the fund');
  75  |   await snap(page, 'lp-a-payment-locked');
  76  | 
  77  |   // Same page, LP B's login: the notice is not visible. Then the same with a fresh load of the link.
  78  |   await page.getByRole('group', { name: 'Viewing as' }).getByRole('button', { name: 'LP B', exact: true }).click();
  79  |   await expect(page.getByRole('heading', { name: 'Not visible to you' })).toBeVisible();
  80  |   await expect(page.getByText('$400,000')).toHaveCount(0);
  81  |   await snap(page, 'lp-b-cannot-open-lp-a');
  82  |   await page.goto(`/?as=lpB${noticeA}`);
  83  |   await expect(page.getByRole('heading', { name: 'Not visible to you' })).toBeVisible();
  84  | 
  85  |   // Admin settles LP A. Funded appears only after the verifier's receipt.
  86  |   await page.goto('/?as=admin');
  87  |   await page.getByRole('button', { name: 'Settle', exact: true }).first().click();
  88  |   await expectToast(page, 'independently verified');
  89  |   await expect(page.locator('.figure.good strong')).toHaveText('$400,000');
  90  | 
  91  |   // LP B pays the wrong amount. The fund cannot settle it. LP B withdraws and pays exactly.
  92  |   await viewAs(page, 'LP B');
  93  |   await page.locator('.notice-card').click();
  94  |   await page.getByRole('button', { name: 'Pay a different amount' }).click();
  95  |   await page.getByLabel('Amount in Amulet').fill('30');
  96  |   await page.getByRole('button', { name: 'Pay this amount' }).click();
  97  |   await expectToast(page, 'locked for the fund');
  98  |   await expect(page.locator('.callout.bad')).toContainText('does not match the amount due');
  99  |   await snap(page, 'lp-b-wrong-amount');
  100 | 
  101 |   await page.goto('/?as=admin#/payments');
  102 |   const wrongRow = page.locator('tr', { hasText: 'Wrong amount' });
  103 |   await expect(wrongRow).toBeVisible();
  104 |   await expect(wrongRow.getByRole('button', { name: 'Settle' })).toHaveCount(0);
  105 |   await snap(page, 'admin-payments-wrong-amount');
  106 | 
  107 |   await page.goto(`/?as=lpB`);
  108 |   await page.locator('.notice-card').click();
  109 |   await page.getByRole('button', { name: 'Withdraw it' }).click();
  110 |   await expectToast(page, 'withdrawn');
  111 |   await page.getByRole('button', { name: 'Pay 35 Amulet' }).click();
  112 |   await expectToast(page, 'locked for the fund');
  113 | 
  114 |   await page.goto('/?as=admin');
  115 |   await page.getByRole('button', { name: 'Settle', exact: true }).first().click();
  116 |   await expectToast(page, 'independently verified');
  117 |   await expect(page.locator('.figure.good strong')).toHaveText('$750,000');
  118 | 
  119 |   // LP C does nothing. After the due time the admin marks it overdue.
  120 |   await expect(page.getByRole('button', { name: 'Mark overdue' })).toBeVisible({ timeout: 300_000 });
  121 |   await page.getByRole('button', { name: 'Mark overdue' }).click();
  122 |   await expectToast(page, 'Marked overdue');
  123 |   await expect(page.locator('.figure.good strong')).toHaveText('$750,000');
  124 |   await expect(page.locator('.figure.bad strong')).toHaveText('$250,000');
  125 |   await snap(page, 'admin-final-totals');
  126 | 
  127 |   await page.getByRole('link', { name: 'Call 1' }).click();
  128 |   await expect(page.getByText('Funded', { exact: true })).toHaveCount(2);
  129 |   await expect(page.getByText('Overdue', { exact: true })).toHaveCount(1);
  130 |   await page.getByRole('button', { name: 'Details' }).first().click();
> 131 |   await expect(page.getByText('An independent read-only verifier confirmed')).toBeVisible();
      |                                                                               ^ Error: expect(locator).toBeVisible() failed
  132 |   await snap(page, 'admin-call-detail-receipt');
  133 | 
  134 |   // LP C sees its own overdue notice and nothing else.
  135 |   await viewAs(page, 'LP C');
  136 |   await expect(page.locator('.notice-card')).toHaveCount(1);
  137 |   await expect(page.locator('.notice-card')).toContainText('Overdue');
  138 | 
  139 |   // The unrelated party gets nothing, and admin pages refuse it.
  140 |   await viewAs(page, 'Unrelated party');
  141 |   await expect(page.getByRole('heading', { name: 'The ledger returned nothing' })).toBeVisible();
  142 |   await snap(page, 'outsider-empty');
  143 |   await page.goto('/?as=outsider#/calls');
  144 |   await expect(page.getByRole('heading', { name: 'This page is for the fund admin' })).toBeVisible();
  145 | 
  146 |   // The judge proof surface renders from evidence files.
  147 |   await page.goto('/?as=admin#/proof');
  148 |   await expect(page.getByRole('heading', { name: 'Proof', exact: true })).toBeVisible();
  149 |   await expect(page.getByText('Who could read what')).toBeVisible();
  150 |   await snap(page, 'proof');
  151 | });
  152 | 
```