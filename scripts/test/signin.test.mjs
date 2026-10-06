import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The browser side of "Sign in with HackCanton" (web/src/lib/hackcanton.ts),
// run by Node directly from its TypeScript source. A stand-in window gives it
// session storage and a page address, and a stubbed fetch plays Keycloak, the
// JSON Ledger API and the Canton wallet.
const MODULE = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '../../web/src/lib/hackcanton.ts')).href;
const LOGOUT = 'https://login.example/realms/hack/protocol/openid-connect/logout';
const CONFIG = {
  issuer: 'https://login.example/realms/hack',
  clientId: 'web-app',
  scope: 'openid daml_ledger_api',
  ledgerApi: 'https://ledger.example',
  validatorApi: 'https://validator.example/api/validator',
  walletUrl: null,
  templates: {},
  interfaces: {},
};

let loads = 0;
// A fresh copy per test, so the module's in-memory state starts empty.
const load = () => import(`${MODULE}?case=${(loads += 1)}`);

function browser() {
  const items = new Map();
  const assigned = [];
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => (items.has(key) ? items.get(key) : null),
      setItem: (key, value) => items.set(key, String(value)),
      removeItem: (key) => items.delete(key),
    },
    location: { origin: 'https://draw.example', assign: (url) => assigned.push(url) },
  };
  return { items, assigned };
}

function signIn(items, overrides = {}) {
  items.set('draw-signin', JSON.stringify({
    userId: 'user-1', party: 'lp::1220ab', accessToken: 'access-1', refreshToken: 'refresh-1',
    expiresAt: Date.now() + 600_000, logoutUrl: LOGOUT, clientId: 'web-app', ...overrides,
  }));
}

const stored = (items) => (items.has('draw-signin') ? JSON.parse(items.get('draw-signin')) : null);
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Answers each fetch from the first route whose text the URL contains.
function network(routes) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const route = routes.find(([part]) => String(url).includes(part));
    if (!route) throw new Error(`no route for ${url}`);
    return route[1](init);
  };
  return calls;
}

const expiring = { expiresAt: Date.now() + 5_000 };
const ledgerEnd = ['/v2/state/ledger-end', () => json(200, { offset: 7 })];
const activePage = ['/v2/state/active-contracts-page', () => json(200, { activeContracts: [] })];

test('micros turns a ledger timestamp into the wallet API\'s microseconds, keeping all six digits', async () => {
  browser();
  const { micros } = await load();
  const base = Date.parse('2026-10-06T10:00:00Z') * 1000;
  assert.equal(micros('2026-10-06T10:00:00Z'), base);
  assert.equal(micros('2026-10-06T10:00:00.5Z'), base + 500_000);
  assert.equal(micros('2026-10-06T10:00:00.123Z'), base + 123_000);
  assert.equal(micros('2026-10-06T10:00:00.123456Z'), base + 123_456);
  assert.equal(micros('2026-10-06T10:00:00.1234567Z'), base + 123_456);
});

test('signing in asks for the password every time and sends a PKCE challenge', async () => {
  const { items, assigned } = browser();
  const { startSignIn } = await load();
  await startSignIn(CONFIG, '/onboard');
  const url = new URL(assigned[0]);
  const pending = JSON.parse(items.get('draw-signin-pending'));
  assert.equal(url.origin + url.pathname, 'https://login.example/realms/hack/protocol/openid-connect/auth');
  assert.equal(url.searchParams.get('prompt'), 'login');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://draw.example/auth/callback');
  assert.equal(url.searchParams.get('state'), pending.state);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('code_challenge'), createHash('sha256').update(pending.verifier).digest('base64url'));
});

test('signing out ends the Keycloak session with the refresh token', async () => {
  const { items } = browser();
  signIn(items);
  const calls = network([[LOGOUT, () => new Response(null, { status: 204 })]]);
  const { identity, signOut } = await load();
  signOut();
  assert.equal(identity(), null);
  assert.equal(stored(items), null);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, LOGOUT);
  assert.deepEqual(Object.fromEntries(new URLSearchParams(String(calls[0].init.body))), { client_id: 'web-app', refresh_token: 'refresh-1' });
});

test('a refresh that cannot reach Keycloak keeps the sign-in for the next try', async () => {
  const { items } = browser();
  signIn(items, expiring);
  network([['/protocol/openid-connect/token', () => { throw new TypeError('fetch failed'); }], ledgerEnd, activePage]);
  const { NodeUnreachable, activeContracts, identity } = await load();
  await assert.rejects(activeContracts(CONFIG, 'lp::1220ab', { templateId: 't' }), NodeUnreachable);
  assert.equal(identity()?.party, 'lp::1220ab');
  assert.equal(stored(items).refreshToken, 'refresh-1');
});

test('a refresh Keycloak refuses ends the sign-in', async () => {
  const { items } = browser();
  signIn(items, expiring);
  network([['/protocol/openid-connect/token', () => json(400, { error: 'invalid_grant' })], ledgerEnd, activePage]);
  const { SignedOut, activeContracts, identity } = await load();
  await assert.rejects(activeContracts(CONFIG, 'lp::1220ab', { templateId: 't' }), SignedOut);
  assert.equal(identity(), null);
  assert.equal(stored(items), null);
});

test('a refresh renews the token, and a sign-out while it is on its way wins', async () => {
  const { items } = browser();
  signIn(items, expiring);
  let answer;
  network([
    ['/protocol/openid-connect/token', () => new Promise((resolve) => { answer = resolve; })],
    [LOGOUT, () => new Response(null, { status: 204 })],
    ledgerEnd, activePage,
  ]);
  const { SignedOut, activeContracts, identity, signOut } = await load();
  const reading = activeContracts(CONFIG, 'lp::1220ab', { templateId: 't' });
  await new Promise((resolve) => setImmediate(resolve));
  signOut();
  answer(json(200, { access_token: 'access-2', refresh_token: 'refresh-2', expires_in: 300 }));
  await assert.rejects(reading, SignedOut);
  assert.equal(identity(), null);
  assert.equal(stored(items), null, 'the late refresh did not sign the tab back in');

  signIn(items, expiring);
  network([['/protocol/openid-connect/token', () => json(200, { access_token: 'access-3', refresh_token: 'refresh-3', expires_in: 300 })], ledgerEnd, activePage]);
  assert.deepEqual(await activeContracts(CONFIG, 'lp::1220ab', { templateId: 't' }), []);
  assert.equal(stored(items).accessToken, 'access-3');
  assert.equal(stored(items).refreshToken, 'refresh-3');
});

test('a 401 from the wallet is a refusal, while a 401 from the ledger ends the sign-in', async () => {
  const { items } = browser();
  signIn(items);
  network([['/v0/wallet/balance', () => json(401, { error: 'unauthorized' })], ['/v2/state/ledger-end', () => json(401, { error: 'unauthenticated' })]]);
  const { NodeRefused, SignedOut, activeContracts, identity, walletBalance } = await load();
  await assert.rejects(walletBalance(CONFIG), NodeRefused);
  assert.equal(identity()?.party, 'lp::1220ab');
  await assert.rejects(activeContracts(CONFIG, 'lp::1220ab', { templateId: 't' }), SignedOut);
  assert.equal(identity(), null);
});

function request({ allocateBefore, settleBefore, legs }) {
  return {
    settlement: { executor: 'fund::1220cd', settlementRef: { id: 'DRAW-0000000000000001', cid: null }, requestedAt: new Date(Date.now() - 60_000).toISOString(), allocateBefore, settleBefore, meta: { values: { reason: 'Capital call' } } },
    transferLegs: legs ?? { 'DRAW-0000000000000001': { sender: 'lp::1220ab', receiver: 'fund::1220cd', amount: '4.0', instrumentId: { admin: 'DSO::1220ef', id: 'Amulet' }, meta: { values: {} } } },
    meta: { values: {} },
  };
}

async function allocated(view) {
  const { items } = browser();
  signIn(items);
  const calls = network([['/v0/allocations', () => json(200, { output: { allocation_cid: 'alloc-1' } })]]);
  const { micros, walletAllocate } = await load();
  const reply = await walletAllocate(CONFIG, view, 'lp::1220ab');
  return { reply, body: JSON.parse(String(calls[0].init.body)), micros };
}

test('paying on time hands the wallet the request exactly as it stands', async () => {
  const allocateBefore = new Date(Date.now() + 3_600_000).toISOString();
  const settleBefore = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const { reply, body, micros } = await allocated(request({ allocateBefore, settleBefore }));
  assert.deepEqual(reply, { allocationCid: 'alloc-1' });
  assert.equal(body.transfer_leg_id, 'DRAW-0000000000000001');
  assert.deepEqual(body.transfer_leg, { receiver: 'fund::1220cd', amount: '4.0', meta: {} });
  assert.equal(body.settlement.allocate_before, micros(allocateBefore));
  assert.equal(body.settlement.settle_before, micros(settleBefore));
  assert.equal(body.settlement.settlement_ref.id, 'DRAW-0000000000000001');
});

test('paying late, or within a minute of the deadline, gets a fresh hour that still ends before settling', async () => {
  const hour = 3_600_000_000;
  const now = Date.now() * 1000;
  for (const allocateBefore of [new Date(Date.now() + 30_000).toISOString(), new Date(Date.now() - 3_600_000).toISOString()]) {
    const settleBefore = new Date(Date.now() + 6 * 86_400_000).toISOString();
    const { body, micros } = await allocated(request({ allocateBefore, settleBefore }));
    assert.ok(Math.abs(body.settlement.allocate_before - (now + hour)) < 60_000_000, 'about an hour from now');
    assert.equal(body.settlement.settle_before, micros(settleBefore));
  }
  const { body } = await allocated(request({ allocateBefore: new Date(Date.now() - 3_600_000).toISOString(), settleBefore: new Date(Date.now() - 600_000).toISOString() }));
  assert.ok(body.settlement.settle_before > body.settlement.allocate_before, 'settle-before stays after allocate-before');
});

test('the wallet funds only the signed-in party\'s own leg', async () => {
  const { items } = browser();
  signIn(items);
  network([['/v0/allocations', () => json(200, { output: { allocation_cid: 'alloc-1' } })]]);
  const { walletAllocate } = await load();
  const someoneElse = { other: { sender: 'other::1220aa', receiver: 'fund::1220cd', amount: '4.0', instrumentId: { admin: 'DSO::1220ef', id: 'Amulet' }, meta: { values: {} } } };
  const view = request({ allocateBefore: new Date(Date.now() + 3_600_000).toISOString(), settleBefore: new Date(Date.now() + 86_400_000).toISOString(), legs: someoneElse });
  await assert.rejects(walletAllocate(CONFIG, view, 'lp::1220ab'), /no single transfer leg for your party/);
});
