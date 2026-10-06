import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';

import { startFakeLedger } from './fake-ledger.mjs';

// A demo fund saved by one API process is resumed by the next one, after a
// deploy or a watchdog restart. Each case runs in a fresh child process, the
// way a restarted server starts, and checks whose token each seat and the
// read-back verifier carry. A stored id must never decide that.
const jwt = (sub) => `h.${Buffer.from(JSON.stringify({ sub })).toString('base64url')}.s`;
const idp = createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    const form = new URLSearchParams(body);
    const machines = { 'verifier-client': ['verifier-secret', 'svc-verifier'], 'backend-client': ['backend-secret', 'svc-backend'] };
    const machine = machines[form.get('client_id')];
    const sub = form.get('grant_type') === 'client_credentials'
      ? (machine?.[0] === form.get('client_secret') ? machine[1] : null)
      : (form.get('grant_type') === 'password' && form.get('password') === 'right' ? 'user-123' : null);
    res.writeHead(sub ? 200 : 401, { 'content-type': 'application/json' });
    res.end(JSON.stringify(sub ? { access_token: jwt(sub), refresh_token: 'rt-1', expires_in: 3600 } : { error: 'invalid_grant' }));
  });
});
let tokenUrl;
let fake;

before(async () => {
  idp.listen(0, '127.0.0.1');
  await once(idp, 'listening');
  tokenUrl = `http://127.0.0.1:${idp.address().port}/token`;
  fake = await startFakeLedger();
});
after(async () => {
  idp.close();
  await fake.close();
});

const PARTIES = { DRAW_ADMIN_PARTY: 'admin::1220aa', DRAW_LPA_PARTY: 'lpa::1220aa', DRAW_LPB_PARTY: 'lpb::1220aa', DRAW_LPC_PARTY: 'lpc::1220aa', DRAW_OUTSIDER_PARTY: 'out::1220aa' };
const base = () => ({ DRAW_NETWORK: 'devnet', DRAW_JSON_API: fake.url, OAUTH_TOKEN_URL: tokenUrl, REGISTRY_URL: `${fake.url}/registry`, ...PARTIES });
const PASSWORD = { LEDGER_AUTH_MODE: 'password', OAUTH_CLIENT_ID: 'web-app', HACKCANTON_USERNAME: 'me', HACKCANTON_PASSWORD: 'right' };
const VERIFIER = { DRAW_VERIFIER_CLIENT_ID: 'verifier-client', DRAW_VERIFIER_CLIENT_SECRET: 'verifier-secret' };
const BACKEND = { LEDGER_AUTH_MODE: 'oauth', DRAW_BACKEND_CLIENT_ID: 'backend-client', DRAW_BACKEND_CLIENT_SECRET: 'backend-secret' };

// Resumes a session with the stored users in a fresh process and reports the
// subject of every token the session would send. Asynchronous, since the fake
// IdP and ledger answer from this process.
async function resumeIn(env, storedUsers) {
  const { stdout } = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', `
    const { DrawSession } = await import('./scripts/demo/lib/draw.mjs');
    const roles = ['admin', 'lpA', 'lpB', 'lpC', 'outsider'];
    const party = Object.fromEntries(roles.map((r) => [r, r]));
    const session = await DrawSession.resume({ party, users: ${JSON.stringify(storedUsers)}, external: {} });
    const seats = Object.fromEntries(await Promise.all(roles.map(async (r) => [r, await session.client[r].tokenSubject()])));
    console.log(JSON.stringify({ users: session.users, seats, verifier: await session.verifier.client.tokenSubject() }));
  `], { cwd: new URL('../..', import.meta.url).pathname, env: { PATH: process.env.PATH, HOME: process.env.HOME, DRAW_ENV_FILE: 'none', ...env }, timeout: 60_000 });
  return JSON.parse(stdout);
}

const stored = (verifier) => ({ admin: 'user-123', lpA: 'user-123', lpB: 'user-123', lpC: 'user-123', outsider: 'user-123', verifier });

test('after a restart, a verifier client still reads as itself on a shared login, never as the shared login', async () => {
  const resumed = await resumeIn({ ...base(), ...PASSWORD, ...VERIFIER }, stored('svc-verifier'));
  assert.equal(resumed.verifier, 'svc-verifier');
  assert.ok(Object.values(resumed.seats).every((sub) => sub === 'user-123'));
});

test('a fund saved before the verifier client existed reads back with the client configured now', async () => {
  const resumed = await resumeIn({ ...base(), ...PASSWORD, ...VERIFIER }, stored('user-123'));
  assert.equal(resumed.users.verifier, '__verifier__', 'the configured user, resolved only when used');
  assert.equal(resumed.verifier, 'svc-verifier');
});

test('after a restart, every seat acts through the backend client and the verifier through its own', async () => {
  const resumed = await resumeIn({ ...base(), ...BACKEND, ...VERIFIER }, { ...stored('svc-verifier'), admin: 'svc-backend', lpA: 'svc-backend', lpB: 'svc-backend', lpC: 'svc-backend', outsider: 'svc-backend' });
  assert.ok(Object.values(resumed.seats).every((sub) => sub === 'svc-backend'));
  assert.equal(resumed.verifier, 'svc-verifier');
});

test('a fund saved on the shared login moves to the backend client once that is configured', async () => {
  const resumed = await resumeIn({ ...base(), ...BACKEND, ...VERIFIER }, stored('user-123'));
  assert.ok(Object.values(resumed.seats).every((sub) => sub === 'svc-backend'));
  assert.equal(resumed.verifier, 'svc-verifier');
});

// Runs a snippet in a fresh process with the given configuration.
async function inFreshProcess(env, code) {
  try {
    const { stdout } = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', code], {
      cwd: new URL('../..', import.meta.url).pathname, env: { PATH: process.env.PATH, HOME: process.env.HOME, DRAW_ENV_FILE: 'none', ...env }, timeout: 60_000,
    });
    return { ok: true, out: JSON.parse(stdout) };
  } catch (error) {
    return { ok: false, error: String(error.stderr ?? error.message) };
  }
}

const PROVIDED = `
  const { credentialFacts, providedUsers } = await import('./scripts/demo/lib/draw.mjs');
  const users = await providedUsers();
  console.log(JSON.stringify({ users, facts: credentialFacts(users) }));
`;

test('a configured verifier id that is not who its token belongs to stops before anything is labelled', async () => {
  const typed = await inFreshProcess({ ...base(), ...BACKEND, ...VERIFIER, DRAW_VERIFIER_USER: 'xidoncapitals-verifier' }, PROVIDED);
  assert.equal(typed.ok, false);
  assert.match(typed.error, /configured as ledger user xidoncapitals-verifier, but its token belongs to svc-verifier/);
});

test('a verifier pointed at the backend client resolves to the backend user, so it counts as one of the seats', async () => {
  const slip = await inFreshProcess({ ...base(), ...BACKEND, DRAW_VERIFIER_CLIENT_ID: 'backend-client', DRAW_VERIFIER_CLIENT_SECRET: 'backend-secret' }, PROVIDED);
  assert.ok(slip.ok, slip.error);
  assert.equal(slip.out.users.verifier, 'svc-backend');
  assert.deepEqual(slip.out.facts, { seatsSeparate: false, verifierSeparate: false });
});

test('a broken verifier client fails the read-back, not the resumed fund', async () => {
  const broken = await inFreshProcess({ ...base(), ...BACKEND, DRAW_VERIFIER_CLIENT_ID: 'verifier-client', DRAW_VERIFIER_CLIENT_SECRET: 'wrong' }, `
    const { DrawSession } = await import('./scripts/demo/lib/draw.mjs');
    const roles = ['admin', 'lpA', 'lpB', 'lpC', 'outsider'];
    const session = await DrawSession.resume({ party: Object.fromEntries(roles.map((r) => [r, r])), users: {}, external: {} });
    const seat = await session.client.admin.tokenSubject();
    const verifier = await session.verifier.client.tokenSubject().then(() => 'worked', (error) => error.message);
    console.log(JSON.stringify({ seat, verifier }));
  `);
  assert.ok(broken.ok, broken.error);
  assert.equal(broken.out.seat, 'svc-backend');
  assert.match(broken.out.verifier, /token request for __verifier__ failed: HTTP 401/);
});
