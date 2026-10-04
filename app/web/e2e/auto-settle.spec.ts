import { expect, test } from '@playwright/test';

// Runs only with DRAW_AUTO_SETTLE=true on the server: an exact payment becomes
// funded with no admin click, and a wrong amount is left alone.
test.skip(process.env.DRAW_AUTO_SETTLE !== 'true' || process.env.DRAW_PARTY_MODE === 'external', 'automatic settlement is off');

test('an exact payment settles without an admin click, a wrong one does not', async ({ page, request }) => {
  await request.post('/api/actions/reset', { data: {} });
  expect((await request.post('/api/actions/setup', { data: {} })).ok()).toBe(true);
  for (const role of ['lpA', 'lpB']) expect((await request.post('/api/actions/accept', { data: { role } })).ok()).toBe(true);
  const due = new Date(Date.now() + 30 * 60_000).toISOString();
  expect((await request.post('/api/actions/issue', { data: { callId: 'Auto 1', dueAt: due, rows: [
    { role: 'lpA', scenarioUsd: 400000, units: 40 },
    { role: 'lpB', scenarioUsd: 350000, units: 35 },
  ] } })).ok()).toBe(true);

  const refOf = async (role: string) => {
    const view = await (await request.get(`/api/view?role=${role}`)).json();
    return view.calls[0].obligations[0].ref as string;
  };
  expect((await request.post('/api/actions/pay', { data: { role: 'lpA', ref: await refOf('lpA') } })).ok()).toBe(true);
  expect((await request.post('/api/actions/pay', { data: { role: 'lpB', ref: await refOf('lpB'), amount: 30 } })).ok()).toBe(true);

  await page.goto('/?as=admin');
  await expect(page.getByText('Automatic settlement is on')).toBeVisible();
  await expect(page.locator('.figure.good strong')).toHaveText('$400,000', { timeout: 120_000 });
  await page.waitForTimeout(15_000);
  await expect(page.locator('.figure.good strong')).toHaveText('$400,000');
});
