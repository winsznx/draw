import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { startFakeLedger } from './fake-ledger.mjs';

// The real app server in a child process. Without a ledger behind it, these
// cover everything decided before a ledger call: the access code, the tour id,
// the action limits, the config, and health. Against the stand-in ledger in
// fake-ledger.mjs they cover actions on provisioned parties shared by every
// tour. Evidence goes to a temporary folder, never the repository's.
const SERVER = join(dirname(fileURLToPath(import.meta.url)), '../../app/server.mjs');
const TOUR = '3f2b8c1e-9d4a-4f6b-8a7e-2c1d0b9a8f7e';
const OTHER_TOUR = '9a1c4d7e-2b5f-4e8a-9c3d-6f0e1b2a3c4d';
const NAMESPACE = `1220${'ab'.repeat(32)}`;
const party = (key) => `draw-${key.toLowerCase()}::${NAMESPACE}`;

async function freePort() {
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

async function startApp(t, env = {}) {
  const port = await freePort();
  const state = mkdtempSync(join(tmpdir(), 'draw-app-'));
  const evidence = join(state, 'evidence');
  // A ledger address nothing listens on, unless the test brings its own.
  const ledger = `http://127.0.0.1:${await freePort()}`;
  const child = spawn(process.execPath, [SERVER], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME, DRAW_ENV_FILE: 'none', PORT: String(port), DRAW_STATE_DIR: state, DRAW_EVIDENCE_DIR: evidence, APP_PROVIDER_JSON_API: ledger, APP_USER_JSON_API: ledger, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  t.after(() => {
    child.kill();
    rmSync(state, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`the server did not start: ${output}`)), 15_000);
    const watch = () => {
      if (output.includes('DRAW on')) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout.on('data', watch);
    child.on('exit', (code) => reject(new Error(`the server exited with ${code}: ${output}`)));
  });
  const call = async (path, { method = 'GET', headers = {}, body } = {}) => {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, headers: response.headers, body: await response.json() };
  };
  call.evidence = evidence;
  call.output = () => output;
  return call;
}

// Provisioned parties, shared by every tour, on the stand-in ledger.
const provisioned = (fake, extra = {}) => ({
  DRAW_PARTY_MODE: 'provisioned',
  ...Object.fromEntries(['ADMIN', 'LPA', 'LPB', 'LPC', 'OUTSIDER'].flatMap((key) => [[`DRAW_${key}_USER`, `user-${key.toLowerCase()}`], [`DRAW_${key}_PARTY`, party(key)]])),
  DRAW_VERIFIER_USER: 'user-verifier',
  APP_PROVIDER_JSON_API: fake.url,
  APP_USER_JSON_API: fake.url,
  REGISTRY_URL: `${fake.url}/registry`,
  DRAW_TAP_AMOUNT: '0',
  ...extra,
});

const tour = (id = TOUR, headers = {}) => ({ 'x-draw-tour': id, ...headers });
const act = (call, action, { id = TOUR, headers = {}, body = {} } = {}) => call(`/api/actions/${action}`, { method: 'POST', headers: tour(id, headers), body });
const reset = (call, headers = {}) => act(call, 'reset', { headers });
const setup = (call, id = TOUR, headers = {}) => act(call, 'setup', { id, headers });

const notice = ({ fundId, ref, lp }) => ({
  templateId: '#draw:Draw.CapitalCall:CapitalCallObligation',
  payload: {
    admin: party('ADMIN'), lp, fundId, fundName: 'Earlier fund', callId: 'Call 1', obligationRef: ref, amountDue: '10.0', scenarioAmount: '100000.0',
    instrumentId: { admin: 'DSO::1220dso', id: 'Amulet' }, dueAt: new Date(Date.now() + 3_600_000).toISOString(), state: 'Issued', pendingAllocationCid: null, settlement: null, reviewNote: null,
  },
});
const fundOf = (fake) => fake.acs.find((c) => c.templateId?.endsWith(':Fund')).payload.fundId;
const count = (fake, name) => fake.acs.filter((c) => c.templateId?.endsWith(`:${name}`)).length;

test('each browser names its own tour, and a browser that names none has no fund', async (t) => {
  const call = await startApp(t);
  const view = await call('/api/view?role=admin');
  assert.equal(view.status, 200);
  assert.equal(view.body.session, false);
  assert.equal(view.body.tours, true);
  assert.equal((await call('/api/view?role=lpA', { headers: tour() })).body.session, false);

  const missing = await call('/api/actions/reset', { method: 'POST', body: {} });
  assert.equal(missing.status, 400);
  assert.match(missing.body.error, /Reload the page/);
  assert.equal((await act(call, 'reset', { id: 'not a tour' })).status, 400);
  assert.equal((await act(call, 'pay')).status, 409);
  assert.deepEqual((await reset(call)).body, { message: 'Cleared. Start a new demo fund.' });
});

test('a tour id that names a built-in object property is just an unknown tour', async (t) => {
  const call = await startApp(t);
  const id = 'propertyIsEnumerable';
  assert.equal((await call('/api/view?role=admin', { headers: tour(id) })).body.session, false);
  assert.equal((await act(call, 'pay', { id })).status, 409);
  assert.equal((await act(call, 'reset', { id })).status, 200);
});

test('actions need the access code, and the code is shown only when the operator makes it public', async (t) => {
  const hidden = await startApp(t, { DRAW_ACCESS_CODE: 'harbor-7781' });
  assert.equal((await reset(hidden)).status, 401);
  assert.equal((await reset(hidden, { 'x-draw-access': 'harbor-7781' })).status, 200);
  const config = (await hidden('/api/config')).body;
  assert.equal(config.accessCodeRequired, true);
  assert.equal(config.accessCode, null);

  const shown = await startApp(t, { DRAW_ACCESS_CODE: 'harbor-7781', DRAW_ACCESS_CODE_PUBLIC: 'true' });
  assert.equal((await shown('/api/config')).body.accessCode, 'harbor-7781');
  assert.equal((await shown('/api/view?role=admin')).body.accessCode, 'harbor-7781');
  assert.equal((await reset(shown)).status, 401);
});

test('past its limit a visitor gets a 429 in plain language, and reading still works', async (t) => {
  const call = await startApp(t, { DRAW_ACTION_LIMIT: '2/600' });
  // No ledger answers, so each setup fails, but it was sent toward the ledger and counts.
  assert.equal((await setup(call)).status, 422);
  assert.equal((await setup(call)).status, 422);
  const refused = await setup(call);
  assert.equal(refused.status, 429);
  assert.match(refused.body.error, /^That is a lot of actions from your connection/);
  assert.match(refused.body.error, /Wait about 10 minutes, then try again\. Reading still works\./);
  assert.equal(refused.headers.get('retry-after'), String(refused.body.retryAfterSeconds));
  assert.equal((await call('/api/view?role=admin', { headers: tour() })).status, 200);
});

test('behind the proxy each visitor address has its own limit, and the shared limit holds them all', async (t) => {
  const call = await startApp(t, { DRAW_SERVICE_TOKEN: 'proxy-token', DRAW_ACTION_LIMIT: '1/600', DRAW_ACTION_LIMIT_GLOBAL: '3/600', DRAW_SETUP_LIMIT: 'off', DRAW_SETUP_LIMIT_GLOBAL: 'off' });
  assert.equal((await setup(call)).status, 403);
  const from = (address) => setup(call, TOUR, { 'x-draw-service': 'proxy-token', 'x-draw-client-ip': address });
  assert.equal((await from('198.51.100.1')).status, 422);
  assert.equal((await from('198.51.100.1')).status, 429);
  assert.equal((await from('198.51.100.2')).status, 422);
  // One /64 is one visitor, whichever address in it a request comes from.
  assert.equal((await from('2001:db8:5:6::1')).status, 422);
  assert.equal((await from('2001:db8:5:6:ffff::9')).status, 429);
  const crowd = await from('198.51.100.4');
  assert.equal(crowd.status, 429);
  assert.match(crowd.body.error, /^Many visitors are using the demo right now/);
});

test('only actions that reach the ledger count toward the limits', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake, { DRAW_ACTION_LIMIT: '2/600' }));
  for (let i = 0; i < 5; i += 1) assert.equal((await reset(call)).status, 200);
  assert.equal((await setup(call)).status, 200);
  const again = await setup(call);
  assert.equal(again.status, 200);
  assert.match(again.body.message, /already set up for this browser/);
  assert.equal((await reset(call)).status, 200);
  const third = await setup(call);
  assert.equal(third.status, 429);
});

test('starting demo funds has its own hourly limit per visitor', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake, { DRAW_SETUP_LIMIT: '1/3600' }));
  assert.equal((await setup(call)).status, 200);
  const refused = await setup(call, OTHER_TOUR);
  assert.equal(refused.status, 429);
  assert.match(refused.body.error, /^Your connection has started several demo funds in the last hour\. Wait about an hour/);
  assert.equal(count(fake, 'Fund'), 1);
});

test('issuing calls has its own hourly limit per visitor', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake, { DRAW_ISSUE_LIMIT: '1/3600' }));
  assert.equal((await setup(call)).status, 200);
  assert.equal((await act(call, 'accept', { body: { role: 'lpA' } })).status, 200);
  const issue = (callId) => act(call, 'issue', { body: { callId, dueAt: new Date(Date.now() + 3_600_000).toISOString(), rows: [{ role: 'lpA', scenarioUsd: 100000, units: 10 }] } });
  const first = await issue('Call 1');
  assert.equal(first.status, 200, JSON.stringify(first.body));
  const second = await issue('Call 2');
  assert.equal(second.status, 429);
  assert.match(second.body.error, /^Your connection has issued many capital calls in the last hour\./);
  assert.equal(count(fake, 'CapitalCall'), 1);
});

test('starting a fund creates it with one invitation per LP on the shared parties', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake));
  const started = await setup(call);
  assert.equal(started.status, 200);
  assert.match(started.body.message, /is set up\. Each investor has an invitation to accept\./);
  assert.equal(count(fake, 'Fund'), 1);
  assert.deepEqual(fake.acs.filter((c) => c.templateId?.endsWith(':CommitmentInvitation')).map((c) => c.payload.lp).sort(), [party('LPA'), party('LPB'), party('LPC')]);
  const view = await call('/api/view?role=lpA', { headers: tour() });
  assert.equal(view.body.queriedAs.party, party('LPA'));
  assert.equal(view.body.invitations.length, 1);
  assert.equal((await call('/api/view?role=lpA', { headers: tour(OTHER_TOUR) })).body.session, false);
});

test('a notice in another demo fund is told apart from one this party cannot see', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake));
  assert.equal((await setup(call)).status, 200);
  fake.add(notice({ fundId: fundOf(fake), ref: 'DRAW-00000000000000a1', lp: party('LPA') }));
  fake.add(notice({ fundId: 'FUND-from-another-browser', ref: 'DRAW-00000000000000b2', lp: party('LPA') }));
  const place = (role, ref, id = TOUR) => call(`/api/notice?role=${role}&ref=${encodeURIComponent(ref)}`, { headers: tour(id) });

  assert.equal((await place('lpA', 'DRAW-00000000000000a1')).body.place, 'here');
  assert.equal((await place('lpA', 'DRAW-00000000000000b2')).body.place, 'elsewhere');
  assert.equal((await place('lpB', 'DRAW-00000000000000b2')).body.place, 'absent');
  assert.equal((await place('outsider', 'DRAW-00000000000000a1')).body.place, 'absent');
  assert.equal((await place('lpA', 'not a reference!')).status, 400);
  assert.equal((await place('lpA', 'DRAW-00000000000000b2', OTHER_TOUR)).status, 409);

  const view = await call('/api/view?role=lpA', { headers: tour() });
  assert.deepEqual(view.body.calls.flatMap((c) => c.obligations.map((o) => o.ref)), ['DRAW-00000000000000a1']);
});

test('an action that would pass the list ceiling is refused in plain language, and nothing is written', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const commitment = (n) => fake.add({ templateId: '#draw:Draw.CapitalCall:InvestorCommitment', payload: { admin: party('ADMIN'), lp: party('LPA'), fundId: `FUND-old-${n}`, fundName: 'Old', committedScenarioAmount: '1000.0', calledScenarioAmount: '0.0' } });
  for (let n = 0; n < 4; n += 1) commitment(n);
  const call = await startApp(t, provisioned(fake, { DRAW_LIST_CEILING: '6' }));

  const refused = await setup(call);
  assert.equal(refused.status, 503);
  assert.equal(refused.body.full, true);
  assert.match(refused.body.error, /^The demo is full right now, so no new demo funds can start\./);
  assert.equal(count(fake, 'Fund'), 0);
  assert.equal(count(fake, 'CommitmentInvitation'), 0);

  // Four commitments plus three invitations pass six. With one fewer it fits exactly.
  fake.acs.splice(fake.acs.findIndex((c) => c.templateId?.endsWith(':InvestorCommitment')), 1);
  assert.equal((await setup(call)).status, 200);
});

test('the faucet stops while an LP holds its coin in many pieces', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake));
  assert.equal((await setup(call)).status, 200);
  for (let i = 0; i < 40; i += 1) fake.holding(party('LPA'), '1.0');
  const refused = await act(call, 'faucet', { body: { role: 'lpA' } });
  assert.equal(refused.status, 503);
  assert.match(refused.body.error, /^This LP holds its coin in many small pieces\. Paying a notice merges them/);
});

test('a list longer than the ledger returns in one read never crashes a view', async (t) => {
  const fake = await startFakeLedger({ listLimit: 3 });
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake));
  assert.equal((await setup(call)).status, 200);
  for (let i = 0; i < 4; i += 1) fake.add(notice({ fundId: `FUND-old-${i}`, ref: `DRAW-00000000000000c${i}`, lp: party('LPA') }));
  const view = await call('/api/view?role=lpA', { headers: tour() });
  // While ledger reads ask for the whole list at once, the ledger refuses it
  // and the view says why in plain words. Once reads go a page at a time, the
  // view loads, still showing only this browser's fund.
  if (view.status === 200) {
    assert.deepEqual(view.body.calls, []);
  } else {
    assert.equal(view.status, 502);
    assert.match(view.body.error, /more records for this party than DRAW reads at once/);
  }
  assert.equal((await call('/api/view?role=lpB', { headers: tour() })).status, 200);
});

test('starting over withdraws the fund\'s open invitations and unsettled payments, and never records the tour id', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake));
  assert.equal((await setup(call)).status, 200);
  const fundId = fundOf(fake);
  fake.add(notice({ fundId, ref: 'DRAW-00000000000000d1', lp: party('LPA') }));
  fake.allocation({ sender: party('LPA'), receiver: party('ADMIN'), ref: 'DRAW-00000000000000d1', amount: '10.0' });
  const elsewhere = fake.allocation({ sender: party('LPB'), receiver: party('ADMIN'), ref: 'DRAW-00000000000000e9', amount: '5.0' });

  const before = fake.exercised.length;
  assert.deepEqual((await reset(call)).body, { message: 'Cleared. Start a new demo fund.' });
  assert.deepEqual(fake.exercised.slice(before).map((e) => e.choice).sort(), ['Allocation_Withdraw', 'Invitation_Withdraw', 'Invitation_Withdraw', 'Invitation_Withdraw']);
  assert.equal(count(fake, 'CommitmentInvitation'), 0);
  assert.ok(fake.acs.includes(elsewhere), 'a payment for another fund stays');
  assert.equal((await call('/api/view?role=admin', { headers: tour() })).body.session, false);

  const log = readFileSync(join(call.evidence, 'local', 'app', fundId, 'actions.jsonl'), 'utf8');
  assert.match(log, /"action":"close","invitations":3,"payments":1,"requests":0,"failures":\[\]/);
  assert.equal(log.includes(TOUR), false);
});

test('with too many actions waiting, more are turned away with a time to retry', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake, { DRAW_ACTION_LIMIT: 'off', DRAW_ACTION_LIMIT_GLOBAL: 'off', DRAW_SETUP_LIMIT: 'off', DRAW_SETUP_LIMIT_GLOBAL: 'off' }));
  let release;
  fake.gate.hold = new Promise((resolve) => { release = resolve; });
  const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const pending = [];
  for (let n = 1; n <= 20; n += 1) {
    pending.push(setup(call, id(n)));
    // Each request joins the queue before the next is sent.
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  const busy = await setup(call, id(21));
  assert.equal(busy.status, 503);
  assert.equal(busy.headers.get('retry-after'), '30');
  assert.match(busy.body.error, /^The demo is busy with other visitors right now\./);
  release();
  assert.deepEqual((await Promise.all(pending)).map((r) => r.status), Array(20).fill(200));
});

test('health fails when the ledger does not answer', async (t) => {
  const call = await startApp(t);
  const health = await call('/api/health');
  assert.equal(health.status, 503);
  assert.equal(health.body.ok, false);
  assert.equal(health.body.checks.ledger.ok, false);
  assert.equal(health.body.checks.state.ok, true);
  assert.equal(health.body.tours, 0);
  assert.equal(health.body.capacity, null);
});

test('health passes when the ledger answers', async (t) => {
  const ledger = createServer((req, res) => {
    res.writeHead(req.url === '/v2/state/ledger-end' ? 200 : 404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ offset: 42 }));
  });
  await new Promise((resolve) => ledger.listen(0, '127.0.0.1', resolve));
  t.after(() => ledger.close());
  const address = `http://127.0.0.1:${ledger.address().port}`;
  const call = await startApp(t, { APP_PROVIDER_JSON_API: address, APP_USER_JSON_API: address });
  const health = await call('/api/health');
  assert.equal(health.status, 200);
  assert.deepEqual(health.body.checks, { ledger: { ok: true }, state: { ok: true } });
  assert.equal(health.body.network, 'LocalNet');
});

test('on shared parties health reports how full each list is', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  for (let i = 0; i < 3; i += 1) fake.add(notice({ fundId: `FUND-old-${i}`, ref: `DRAW-00000000000000f${i}`, lp: party('LPA') }));
  const call = await startApp(t, provisioned(fake, { DRAW_LIST_CEILING: '5' }));
  let capacity = (await call('/api/health')).body.capacity;
  for (let i = 0; i < 50 && !capacity.countedAt; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    capacity = (await call('/api/health')).body.capacity;
  }
  assert.equal(capacity.ceiling, 5);
  assert.equal(capacity.ledgerLimit, 200);
  assert.deepEqual(capacity.lists[0], { role: 'admin', list: 'CapitalCallObligation', count: 3 });
  // The fund manager's eight lists (payment requests included) and each LP's holdings.
  assert.equal(capacity.lists.length, 11);
  assert.equal(capacity.warning, false);
  assert.equal(capacity.full, false);
});

// ---------------------------------------------------------------- sign in with HackCanton
const SIGN_IN = {
  DRAW_SIGN_IN: 'true',
  OAUTH_TOKEN_URL: 'https://login.example/realms/hack/protocol/openid-connect/token',
  OAUTH_CLIENT_ID: 'web-app',
  SCAN_PROXY_URL: 'https://validator.example/api/validator/v0/scan-proxy',
};
const GUEST = `hackcanton-user::1220${'cd'.repeat(32)}`;

// What the LP's own browser does with its own token, straight against the ledger.
async function acceptAsGuest(fake, party = GUEST) {
  const invitation = fake.acs.find((c) => c.templateId?.endsWith(':CommitmentInvitation') && c.payload.lp === party);
  const response = await fetch(`${fake.url}/v2/commands/submit-and-wait-for-transaction`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ commands: { commands: [{ ExerciseCommand: { templateId: invitation.templateId, contractId: invitation.contractId, choice: 'Invitation_Accept', choiceArgument: {} } }], actAs: [party] } }),
  });
  assert.equal(response.status, 200);
}

test('sign-in is off unless the operator turns it on, and then names the node login and APIs', async (t) => {
  const off = await startApp(t);
  assert.equal((await off('/api/config')).body.signIn, null);
  assert.equal((await off('/api/view?role=guest', { headers: tour() })).status, 400);

  const on = await startApp(t, SIGN_IN);
  const { signIn } = (await on('/api/config')).body;
  assert.equal(signIn.issuer, 'https://login.example/realms/hack');
  assert.equal(signIn.clientId, 'web-app');
  assert.equal(signIn.scope, 'openid daml_ledger_api');
  assert.equal(signIn.validatorApi, 'https://validator.example/api/validator');
  assert.ok(signIn.ledgerApi.startsWith('http://127.0.0.1:'));
  assert.equal(signIn.templates.CapitalCallObligation, '#draw:Draw.CapitalCall:CapitalCallObligation');
  assert.equal(signIn.interfaces.AllocationRequest, '#splice-api-token-allocation-request-v1:Splice.Api.Token.AllocationRequestV1:AllocationRequest');
});

test('a signed-in LP joins this browser\'s fund by its party id, and only its own browser acts for it', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake, SIGN_IN));
  assert.equal((await act(call, 'join', { body: { party: GUEST } })).status, 409);
  await setup(call);

  assert.match((await act(call, 'join', { body: { party: 'not-a-party' } })).body.error, /not a Canton party id/);
  assert.match((await act(call, 'join', { body: { party: party('LPA') } })).body.error, /one of the demo seats/);
  const joined = await act(call, 'join', { body: { party: GUEST } });
  assert.equal(joined.status, 200);
  assert.match(joined.body.message, /Accept the commitment with your HackCanton login/);
  assert.equal(fake.acs.filter((c) => c.templateId?.endsWith(':CommitmentInvitation') && c.payload.lp === GUEST).length, 1);
  assert.match((await act(call, 'join', { body: { party: GUEST } })).body.message, /already has its invitation/);
  assert.equal(fake.acs.filter((c) => c.payload?.lp === GUEST).length, 1, 'joining twice sends one invitation');
  assert.match((await act(call, 'join', { body: { party: `someone-else::1220${'ef'.repeat(32)}` } })).body.error, /Another HackCanton login already joined/);

  const guest = (await call('/api/view?role=guest', { headers: tour() })).body;
  assert.equal(guest.session, true);
  assert.equal(guest.guest.party, GUEST);
  assert.equal(guest.fund.fundId, fundOf(fake));
  assert.equal(guest.calls, undefined, 'the server reads nothing as the signed-in LP');
  assert.equal((await call('/api/view?role=guest', { headers: tour(OTHER_TOUR) })).body.session, false);

  const admin = (await call('/api/view?role=admin', { headers: tour() })).body;
  assert.deepEqual(admin.invitations.filter((i) => i.investor === 'guest').map((i) => i.committedUsd), [200000]);

  const refused = await act(call, 'accept', { body: { role: 'guest' } });
  assert.equal(refused.status, 422);
  assert.match(refused.body.error, /acts from its own browser/);
  assert.equal(fake.exercised.filter((e) => e.choice === 'Invitation_Accept').length, 0);
});

test('once the signed-in LP accepts, the fund manager can call it, and its notice is its own', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake, SIGN_IN));
  await setup(call);
  await act(call, 'join', { body: { party: GUEST } });
  const early = await act(call, 'issue', { body: { callId: 'Call 1', dueAt: new Date(Date.now() + 3_600_000).toISOString(), rows: [{ role: 'guest', scenarioUsd: 40000, units: 4 }] } });
  assert.match(early.body.error, /HackCanton LP has not accepted its commitment yet/);

  await acceptAsGuest(fake);
  const issued = await act(call, 'issue', { body: { callId: 'Call 1', dueAt: new Date(Date.now() + 3_600_000).toISOString(), rows: [{ role: 'guest', scenarioUsd: 40000, units: 4 }, { role: 'outsider', scenarioUsd: 10000, units: 1 }] } });
  assert.match(issued.body.error, /Call only the investors of this fund/);
  assert.equal(count(fake, 'CapitalCallObligation'), 0);

  assert.equal((await act(call, 'issue', { body: { callId: 'Call 1', dueAt: new Date(Date.now() + 3_600_000).toISOString(), rows: [{ role: 'guest', scenarioUsd: 40000, units: 4 }] } })).status, 200);
  const [obligation] = fake.acs.filter((c) => c.templateId?.endsWith(':CapitalCallObligation'));
  assert.equal(obligation.payload.lp, GUEST);
  assert.equal(obligation.payload.amountDue, '4');

  const admin = (await call('/api/view?role=admin', { headers: tour() })).body;
  const row = admin.calls[0].obligations[0];
  assert.equal(row.investor, 'guest');
  assert.equal(row.status, 'due');
  assert.deepEqual(admin.commitments.find((c) => c.investor === 'guest'), { investor: 'guest', committedUsd: 200000, calledUsd: 40000 });
  for (const lp of ['lpA', 'lpB', 'lpC']) {
    assert.equal((await call(`/api/view?role=${lp}`, { headers: tour() })).body.calls.length, 0, `${lp} sees no notice of the signed-in LP`);
  }

  const record = await call(`/api/record?ref=${obligation.payload.obligationRef}`, { headers: tour() });
  assert.equal(record.status, 200);
  assert.equal(record.body.receipt, null);
  assert.deepEqual(record.body.timeline, []);
  assert.equal((await call('/api/record?ref=../../etc', { headers: tour() })).status, 400);
  assert.equal((await call(`/api/record?ref=${obligation.payload.obligationRef}`, { headers: tour(OTHER_TOUR) })).status, 409);
});

test('starting over withdraws the fund\'s open payment requests, so no LP\'s wallet keeps offering them', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake, SIGN_IN));
  await setup(call);
  await act(call, 'join', { body: { party: GUEST } });
  await acceptAsGuest(fake);
  await act(call, 'issue', { body: { callId: 'Call 1', dueAt: new Date(Date.now() + 3_600_000).toISOString(), rows: [{ role: 'guest', scenarioUsd: 40000, units: 4 }] } });
  const elsewhere = fake.add({ templateId: '#draw:Draw.CapitalCall:PaymentRequest', payload: { admin: party('ADMIN'), lp: GUEST, fundName: 'Earlier fund', callId: 'Call 9', obligationRef: 'DRAW-00000000000000f3', amountDue: '1.0' } });
  assert.equal(count(fake, 'PaymentRequest'), 2);

  const before = fake.exercised.length;
  await reset(call);
  assert.deepEqual(fake.exercised.slice(before).map((e) => e.choice).filter((c) => c === 'AllocationRequest_Withdraw'), ['AllocationRequest_Withdraw']);
  assert.deepEqual(fake.acs.filter((c) => c.templateId?.endsWith(':PaymentRequest')), [elsewhere], 'only the request of another fund stays');
  assert.equal(count(fake, 'CapitalCallObligation'), 1, 'the notice itself stays, signed by both');
});

test('a payment for no notice of this fund names no investor, with or without a signed-in LP', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake, SIGN_IN));
  await setup(call);
  fake.allocation({ sender: party('LPA'), receiver: party('ADMIN'), ref: 'DRAW-00000000000000a7', amount: '3.0' });
  const unknown = (await call('/api/view?role=admin', { headers: tour() })).body.payments.find((p) => p.obligationRef === 'DRAW-00000000000000a7');
  assert.equal(unknown.kind, 'unknown-reference');
  assert.equal(unknown.investor, null);

  await act(call, 'join', { body: { party: GUEST } });
  const after = (await call('/api/view?role=admin', { headers: tour() })).body.payments.find((p) => p.obligationRef === 'DRAW-00000000000000a7');
  assert.equal(after.investor, null);
  assert.equal(after.from, 'lpA');
});

test('the config says who signs for the demo seats and whether the read-back step has its own login', async (t) => {
  const plain = await startApp(t);
  const config = (await plain('/api/config')).body;
  assert.equal(config.seatCredential, 'per-seat');
  assert.equal(config.separateVerifier, false);

  const fake = await startFakeLedger();
  t.after(fake.close);
  const provisionedApp = await startApp(t, provisioned(fake));
  const seats = (await provisionedApp('/api/config')).body;
  assert.equal(seats.seatCredential, 'per-seat');
  assert.equal(seats.separateVerifier, true, 'user-verifier is none of the seats');
  assert.equal(seats.singleCredential, false);
});

// ---------------------------------------------------------------- settling and the read-back
const dueSoon = () => new Date(Date.now() + 3_600_000).toISOString();
const issueToLpA = (call) => act(call, 'issue', { body: { callId: 'Call 1', dueAt: dueSoon(), rows: [{ role: 'lpA', scenarioUsd: 100000, units: 10 }] } });
const noticeRef = (fake) => fake.acs.find((c) => c.templateId?.endsWith(':CapitalCallObligation')).payload.obligationRef;
const settle = (call, notice) => act(call, 'settle', { body: notice });
const readBackAgain = (call, ref) => act(call, 'verify', { body: { ref } });
const receiptFile = (call, fake, ref) => join(call.evidence, 'local', 'app', fundOf(fake), `receipt-${ref}.json`);
const adminRow = async (call, ref) => (await call('/api/view?role=admin', { headers: tour() })).body.calls.flatMap((c) => c.obligations).find((o) => o.ref === ref);
const stages = (row) => row.timeline.map(({ stage, by }) => [stage, by]);

// A fund in which LP A has locked 10 CC, from the 100 CC it holds, against its notice.
async function paidNotice(call, fake) {
  fake.holding(party('LPA'), '100.0');
  assert.equal((await setup(call)).status, 200);
  assert.equal((await act(call, 'accept', { body: { role: 'lpA' } })).status, 200);
  assert.equal((await issueToLpA(call)).status, 200);
  const ref = noticeRef(fake);
  const paid = await act(call, 'pay', { body: { role: 'lpA', ref } });
  assert.equal(paid.status, 200, JSON.stringify(paid.body));
  const { allocationCid } = (await call('/api/view?role=admin', { headers: tour() })).body.payments.find((p) => p.obligationRef === ref);
  return { ref, allocationCid };
}

test('settling reads the settlement back, and the receipt names who settled and who read it', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake));
  const notice = await paidNotice(call, fake);

  const settled = await settle(call, notice);
  assert.equal(settled.status, 200, JSON.stringify(settled.body));
  assert.equal(settled.body.message, 'Settled and verified funded by a read-back with a login of its own. 10 CC received.');
  const receipt = JSON.parse(readFileSync(receiptFile(call, fake, notice.ref), 'utf8'));
  assert.equal(receipt.verdict, 'VERIFIED_FUNDED');
  assert.equal(receipt.settledBy, 'user-admin');
  assert.equal(receipt.verifierUser, 'user-verifier');

  const row = await adminRow(call, notice.ref);
  assert.equal(row.status, 'funded');
  assert.equal(row.receipt.settledBy, 'user-admin');
  assert.deepEqual(stages(row), [['ACTION_REQUESTED', 'lpA'], ['ACKNOWLEDGED', 'lpA'], ['TRANSFER_EXECUTED', 'admin'], ['SETTLEMENT_OBSERVED', 'read-back'], ['VERIFIED_FUNDED', 'read-back']]);
});

test('a read-back on the login that settled says so', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake, { DRAW_VERIFIER_USER: 'user-admin' }));
  const settled = await settle(call, await paidNotice(call, fake));
  assert.equal(settled.status, 200, JSON.stringify(settled.body));
  assert.equal(settled.body.message, 'Settled and verified funded. The read-back ran on the same login that settled. 10 CC received.');
});

test('a read-back that does not finish leaves the notice unverified until it is read back again, once', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake));
  const notice = await paidNotice(call, fake);

  fake.failNext('/v2/updates/update-by-id', 503);
  const settled = await settle(call, notice);
  assert.equal(settled.status, 200, JSON.stringify(settled.body));
  assert.equal(settled.body.message, 'Settled on the ledger, but the read-back did not finish, so this notice does not count as funded yet. Press Read back again on the notice.');
  assert.equal(existsSync(receiptFile(call, fake, notice.ref)), false);
  const waiting = await adminRow(call, notice.ref);
  assert.equal(waiting.ledgerState, 'Funded');
  assert.equal(waiting.status, 'verifying');
  assert.equal(waiting.receipt, null);
  assert.deepEqual(stages(waiting).at(-1), ['READ_BACK_INCOMPLETE', 'read-back']);
  assert.match(waiting.timeline.at(-1).error, /HTTP 503/);

  const verified = await readBackAgain(call, notice.ref);
  assert.equal(verified.status, 200, JSON.stringify(verified.body));
  assert.equal(verified.body.message, 'Read back and verified funded. 10 CC received.');
  assert.equal((await adminRow(call, notice.ref)).status, 'funded');
  const written = readFileSync(receiptFile(call, fake, notice.ref));
  assert.equal(JSON.parse(written).settledBy, 'user-admin', 'taken from the settlement DRAW recorded');

  const again = await readBackAgain(call, notice.ref);
  assert.equal(again.status, 200);
  assert.equal(again.body.message, 'This notice already has a read-back receipt, so nothing was read again.');
  assert.ok(readFileSync(receiptFile(call, fake, notice.ref)).equals(written), 'the receipt is never rewritten');
});

test('only a settled notice of this fund with a settlement on record can be read back', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake));
  const { ref } = await paidNotice(call, fake);
  const refusal = async (body) => {
    const reply = await act(call, 'verify', { body });
    assert.equal(reply.status, 422, JSON.stringify(reply.body));
    return reply.body.error;
  };

  assert.equal(await refusal({ ref }), 'Only a notice that settled on the ledger can be read back.');
  assert.equal(await refusal({ ref: '../x' }), 'That is not a notice reference.');
  assert.equal(await refusal({}), 'That is not a notice reference.');
  assert.equal(await refusal({ ref: 'DRAW-00000000000000b1' }), 'That obligation was not found for the fund manager.');
  const fundedUnrecorded = notice({ fundId: fundOf(fake), ref: 'DRAW-00000000000000b2', lp: party('LPA') });
  fake.add({ ...fundedUnrecorded, payload: { ...fundedUnrecorded.payload, state: 'Funded' } });
  assert.equal(await refusal({ ref: 'DRAW-00000000000000b2' }), 'DRAW has no settlement on record for this notice, so there is nothing to read back.');
  assert.equal(fake.exercised.filter((e) => e.choice === 'Obligation_Settle').length, 0);
});

test('faucet top-ups show in the replies and on the notice they paid for', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake, { DRAW_TAP_AMOUNT: '100.0', SCAN_URL: `${fake.url}/api/scan` }));
  const started = await setup(call);
  assert.equal(started.status, 200, JSON.stringify(started.body));
  assert.match(started.body.message, /is set up\. Each investor has an invitation to accept\. LP A, LP B and LP C got 100 test CC from the faucet first\.$/);

  assert.equal((await act(call, 'accept', { body: { role: 'lpA' } })).status, 200);
  assert.equal((await issueToLpA(call)).status, 200);
  const ref = noticeRef(fake);
  // Another visitor's payment spent LP A's coin since this fund started.
  for (const spent of fake.acs.filter((c) => c.interface?.endsWith(':Holding') && c.view.owner === party('LPA'))) fake.acs.splice(fake.acs.indexOf(spent), 1);
  const paid = await act(call, 'pay', { body: { role: 'lpA', ref } });
  assert.equal(paid.status, 200, JSON.stringify(paid.body));
  assert.equal(paid.body.message, 'Added 100 test CC from the faucet, then locked 10 CC for the fund. The fund manager settles it next.');

  const row = await adminRow(call, ref);
  assert.deepEqual(stages(row), [['FAUCET_TOP_UP', 'lpA'], ['ACTION_REQUESTED', 'lpA'], ['ACKNOWLEDGED', 'lpA']]);
  assert.equal(row.timeline[0].amount, '100.0');
  assert.ok(row.timeline[0].updateId);
});

test('a failed ledger read says DRAW could not read it, and a 5xx on an action is never called a refusal', async (t) => {
  const fake = await startFakeLedger();
  t.after(fake.close);
  const call = await startApp(t, provisioned(fake));
  assert.equal((await setup(call)).status, 200);

  fake.failNext('/v2/state/active-contracts-page', 500);
  const view = await call('/api/view?role=admin', { headers: tour() });
  assert.equal(view.status, 502);
  assert.equal(view.body.error, 'DRAW could not read the ledger just now. Try again in a minute.');
  assert.match(view.body.detail, /HTTP 500/);
  assert.equal((await call('/api/view?role=admin', { headers: tour() })).status, 200);

  assert.equal((await act(call, 'accept', { body: { role: 'lpA' } })).status, 200);
  fake.failNext('/v2/commands/submit-and-wait-for-transaction', 503);
  const issued = await issueToLpA(call);
  assert.equal(issued.status, 422);
  assert.equal(issued.body.error, 'The ledger did not answer as expected, so DRAW cannot tell whether this went through. Refresh in a minute to see.');
  assert.match(issued.body.detail, /HTTP 503/);
});

// ---------------------------------------------------------------- proof
// The API on DevNet without any credential: it signs its own tokens and
// allocates parties only when asked, so the proof needs no ledger.
const DEVNET_OFFLINE = { DRAW_NETWORK: 'devnet', DRAW_JSON_API: 'http://127.0.0.1:1', LEDGER_AUTH_MODE: 'hs256', DRAW_PARTY_MODE: 'allocate' };
// The package id in the committed draw-0.2.0.dar.
const DRAW_0_2_0 = 'a006197eb6af19a5f50b09f70cf084898de9925ddd2b984bac347b1658537496';
const writeJson = (file, value) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const PASSING = {
  gates: { DEVNET_E2E: 'PASS', PRIVACY_CAMPAIGN: 'PASS' },
  passed: 2,
  failed: [],
  custody: 'SERVER_SUBMITS_FOR_PARTIES',
  skipped: [{ id: 'credential: lpA token cannot read as lpB', reason: 'one backend client acts for every demo seat on this node, so LP credentials cannot be separated here' }],
  reasonsHidden: ['negative: wrong payer does not fund'],
  checks: [{ id: 'negative: wrong payer does not fund', ok: true }, { id: 'totals: funded is 750,000 USD scenario', ok: true }],
};

test('the proof leads with the newest run that passed every check, and lists every newer run that did not', async (t) => {
  const call = await startApp(t, DEVNET_OFFLINE);
  const { release } = (await call('/api/config')).body;
  const runs = join(call.evidence, 'devnet', 'runs');
  const check = (name, ok) => ({ name, ok });
  writeJson(join(runs, '20261005T100000Z', 'result.json'), { ...PASSING, packageId: release.packageId, verifierUser: 'user-verifier' });
  writeJson(join(runs, '20261005T100000Z', 'receipt-lpA.json'), { verdict: 'VERIFIED_FUNDED', checks: [check('a', true), check('b', true), check('c', true)] });
  writeJson(join(runs, '20261005T100000Z', 'receipt-lpB.json'), { verdict: 'CONTRADICTED', checks: [check('a', true), check('b', false), check('c', true)] });
  writeJson(join(runs, '20261005T110000Z', 'result.json'), { ...PASSING, gates: { DEVNET_E2E: 'FAIL', PRIVACY_CAMPAIGN: 'PASS' }, passed: 80, failed: ['totals: funded is 750,000 USD scenario', 'settlement[lpA]: read-back verifier returns VERIFIED_FUNDED'] });
  mkdirSync(join(runs, '20261005T120000Z'));
  writeFileSync(join(runs, '20261005T120000Z', 'steps.jsonl'), '{"step":"party-scoped users ready"}\n');
  // Only folders named for a run count, wherever another name sorts.
  writeJson(join(runs, 'scratch', 'result.json'), PASSING);
  const probes = join(call.evidence, 'devnet', 'probes');
  writeJson(join(probes, '20261005T090000Z', 'result.json'), { asExpected: true, probes: [] });
  const verifierProbe = { id: 'credentials: the verifier\'s client only reads, as the fund\'s party', expectation: 'SUCCEEDED', outcome: 'FAILED' };
  writeJson(join(probes, '20261005T130000Z', 'result.json'), { asExpected: false, users: { admin: 'user-backend', verifier: 'user-verifier' }, probes: [{ ...verifierProbe, status: 200, detail: 'it acted for another party' }] });
  writeJson(join(call.evidence, 'local', 'campaign', '20261002T193724Z', 'result.json'), { verdict: 'PASS', seed: 1, metrics: {}, packageId: DRAW_0_2_0 });
  writeJson(join(call.evidence, 'local', 'daml_core', '20261006T081605Z', 'result.json'), { verdict: 'PASS', packageId: 'f'.repeat(64), tests: [] });

  const proof = (await call('/api/proof')).body;
  assert.equal(proof.canonical.runId, '20261005T100000Z');
  assert.equal(proof.canonical.packageVersion, release.version);
  assert.equal(proof.canonical.custody, 'SERVER_SUBMITS_FOR_PARTIES');
  assert.equal(proof.canonical.verifierUser, 'user-verifier');
  assert.deepEqual(proof.canonical.skipped, PASSING.skipped);
  assert.deepEqual(proof.canonical.reasonsHidden, PASSING.reasonsHidden);
  assert.deepEqual(proof.canonical.receipts.map(({ verdict, checksPassed, checks }) => [verdict, checksPassed, checks]), [['VERIFIED_FUNDED', 3, 3], ['CONTRADICTED', 2, 3]]);
  assert.deepEqual(proof.newerRuns, [
    { runId: '20261005T120000Z', path: 'evidence/devnet/runs/20261005T120000Z', status: 'INCOMPLETE', passed: null, total: null, file: 'steps.jsonl' },
    { runId: '20261005T110000Z', path: 'evidence/devnet/runs/20261005T110000Z', status: 'FAIL', passed: 80, total: 82, file: 'result.json' },
  ]);
  assert.deepEqual(proof.probe, { runId: '20261005T130000Z', path: 'evidence/devnet/probes/20261005T130000Z', asExpected: false, checks: [verifierProbe], verifierUser: 'user-verifier' });
  assert.deepEqual([proof.localnet.campaign.packageId, proof.localnet.campaign.packageVersion], [DRAW_0_2_0, '0.2.0']);
  assert.equal(proof.localnet.damlCore.packageVersion, null, 'no known DAR has this package');
});

test('with no run that passed every check there is no canonical run, and every run folder is listed', async (t) => {
  const call = await startApp(t, DEVNET_OFFLINE);
  const runs = join(call.evidence, 'devnet', 'runs');
  writeJson(join(runs, '20261005T110000Z', 'result.json'), { ...PASSING, passed: 1, failed: ['totals: funded is 750,000 USD scenario'] });
  writeJson(join(runs, '20261005T100000Z', 'result.json'), { ...PASSING, gates: {} });
  mkdirSync(join(runs, '20261005T120000Z'));

  const proof = (await call('/api/proof')).body;
  assert.equal(proof.canonical, null);
  assert.deepEqual(proof.newerRuns.map(({ runId, status, passed, total, file }) => [runId, status, passed, total, file]), [
    ['20261005T120000Z', 'INCOMPLETE', null, null, null],
    ['20261005T110000Z', 'FAIL', 1, 2, 'result.json'],
    ['20261005T100000Z', 'FAIL', 2, 2, 'result.json'],
  ]);
  assert.equal(proof.probe, null);
});
