import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

import { ACCESS_CODE, dismissToast, evidence, hackcantonLogin, openOnboarding, startDemoIfNeeded, type Seat } from './helpers';

// An LP that has its own HackCanton login joins a demo fund as itself: it
// signs in on the node's Keycloak, accepts its commitment with its own login,
// and pays its notice from its own Canton wallet, either from DRAW or by
// pressing Accept in the node's Canton Coin wallet. The fund manager seat, on
// the demo login, issues the call and settles it, and the LP sees the notice
// verified funded. Runs only against a site with sign-in turned on, with a
// HackCanton login in HACKCANTON_USERNAME and HACKCANTON_PASSWORD or in .env.
const login = hackcantonLogin();

interface SignInConfig { walletUrl: string | null }

async function signInConfig(page: Page): Promise<SignInConfig | null> {
  return ((await (await page.request.get('/api/config')).json()) as { signIn: SignInConfig | null }).signIn;
}

// Fills the node's Keycloak form: the full one, or the password-only one it
// shows to re-authenticate a user it already knows. Skipped when the browser
// comes straight back. `done` shows once the sign-in is complete.
async function keycloak(page: Page, done: Locator) {
  const password = page.locator('#password');
  await expect(password.or(done)).toBeVisible();
  if (await password.isVisible()) {
    const username = page.locator('#username');
    if (await username.isVisible()) await username.fill(login?.username ?? '');
    await password.fill(login?.password ?? '');
    await page.click('#kc-login');
  }
  await expect(done).toBeVisible();
}

async function sitAs(page: Page, seat: Seat) {
  await openOnboarding(page);
  await page.getByRole('listitem').filter({ hasText: seat }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  const access = page.getByLabel('Access code');
  if (await access.isVisible().catch(() => false)) {
    if (ACCESS_CODE) await access.fill(ACCESS_CODE);
    await page.getByRole('button', { name: 'Save and continue' }).click();
  }
  await page.getByRole('button', { name: 'Open the app' }).click();
  await expect(page).toHaveURL(/\/app$/);
}

async function sitAsSignedInLp(page: Page) {
  await openOnboarding(page);
  await page.getByRole('button', { name: /^(Continue as HackCanton LP|Join as an LP)$/ }).click();
  await expect(page).toHaveURL(/\/app$/);
}

type Evidence = ReturnType<typeof evidence>;

// A fresh browser starts its own demo fund, signs in with HackCanton, joins
// as an LP and accepts its commitment with its own login. Then the fund
// manager seat issues a call to it. Returns the LP's notice address.
async function joinAndGetCalled(page: Page, ev: Evidence, call: string): Promise<string> {
  await ev.setup(page);
  await openOnboarding(page);
  await startDemoIfNeeded(page);
  ev.record('demo fund started');

  await page.getByRole('button', { name: 'Sign in with HackCanton' }).click();
  await keycloak(page, page.getByText('Signed in as'));
  await ev.shot(page, 'signed-in');
  ev.record('signed in on the node Keycloak');

  await page.getByRole('button', { name: 'Join as an LP' }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText('by this browser, with your own HackCanton login')).toBeVisible();
  await page.getByRole('button', { name: 'Accept commitment' }).click();
  await dismissToast(page, 'Commitment accepted with your own login.');
  await expect(page.getByRole('heading', { name: 'Your notices' })).toBeVisible();
  await ev.shot(page, 'lp-committed');
  ev.record('LP accepted with its own login');

  await sitAs(page, 'Fund manager');
  await page.getByRole('link', { name: 'Create capital call' }).first().click();
  await page.getByLabel('Name or reference').fill(call);
  await page.getByLabel('Amount called from HackCanton LP').fill('40000');
  await page.getByLabel('Canton Coin for HackCanton LP').fill('4');
  await page.getByRole('button', { name: 'Issue capital call' }).click();
  await expect(page.getByRole('heading', { level: 1, name: call })).toBeVisible();
  await ev.shot(page, 'call-issued');
  ev.record('call issued to the signed-in LP');

  await sitAsSignedInLp(page);
  await page.getByRole('link').filter({ hasText: call }).click();
  await expect(page).toHaveURL(/\/app\/notices\//);
  return page.url();
}

async function settleAndVerify(page: Page, ev: Evidence, call: string, noticeUrl: string) {
  await sitAs(page, 'Fund manager');
  await page.goto(`/app/calls/${encodeURIComponent(call)}`);
  await page.getByRole('button', { name: /^Settle 4/ }).click();
  await expect(page.getByText('Funded', { exact: true }).first()).toBeVisible();
  await ev.shot(page, 'settled');
  ev.record('fund manager settled, read-back confirmed');

  await sitAsSignedInLp(page);
  await page.goto(noticeUrl);
  await expect(page.getByText('Verified funded').first()).toBeVisible();
  await ev.shot(page, 'lp-verified');
  ev.record('LP sees verified funded');
}

async function skipUnlessSignIn(page: Page): Promise<SignInConfig> {
  test.skip(!login, 'needs a HackCanton login');
  const config = await signInConfig(page);
  test.skip(!config, 'sign-in is turned off on this site');
  return config as SignInConfig;
}

test('an LP signs in with its own HackCanton login and pays from its own Canton wallet', async ({ page }, info: TestInfo) => {
  await skipUnlessSignIn(page);
  const ev = evidence('hackcanton');
  const call = `Call ${ev.run.slice(8, 12)}`;
  try {
    const noticeUrl = await joinAndGetCalled(page, ev, call);
    await page.getByRole('button', { name: /^Pay 4 CC from your wallet$/ }).click();
    // The notice's own status, read back from the ledger, not the toast.
    await expect(page.getByText('Payment locked, waiting for the fund', { exact: true }).first()).toBeVisible();
    await ev.shot(page, 'lp-paid');
    ev.record('LP paid from its own Canton wallet');
    await settleAndVerify(page, ev, call, noticeUrl);
  } finally {
    ev.write(info, 7);
  }
});

test('an LP approves the capital call in the node\'s Canton Coin wallet', async ({ page, context }, info: TestInfo) => {
  const config = await skipUnlessSignIn(page);
  test.skip(!config.walletUrl, 'the site names no Canton wallet');
  const ev = evidence('hackcanton-wallet');
  const call = `Call ${ev.run.slice(8, 12)}`;
  try {
    const noticeUrl = await joinAndGetCalled(page, ev, call);

    const wallet = await context.newPage();
    await wallet.goto(`${config.walletUrl}/allocations`);
    await wallet.getByRole('button', { name: 'Log In with OAuth2' }).click();
    await keycloak(wallet, wallet.getByText('Total Available Balance'));
    await wallet.goto(`${config.walletUrl}/allocations`);
    const request = wallet.locator('.allocation-request').filter({ hasText: `Capital call ${call}` });
    await expect(request).toBeVisible();
    await ev.shot(wallet, 'wallet-request');
    ev.record('the Canton wallet lists the capital call as an allocation request');
    await request.locator('.allocation-request-accept').click();
    await expect(request.locator('.allocation-withdraw')).toBeVisible();
    await ev.shot(wallet, 'wallet-accepted');
    ev.record('LP pressed Accept in its Canton wallet');
    await wallet.close();

    await page.goto(noticeUrl);
    await expect(page.getByText('Payment locked, waiting for the fund', { exact: true }).first()).toBeVisible();
    await ev.shot(page, 'lp-paid');
    ev.record('DRAW reads the payment from the LP ledger');
    await settleAndVerify(page, ev, call, noticeUrl);
  } finally {
    ev.write(info, 9);
  }
});
