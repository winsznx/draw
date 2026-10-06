import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

// network.mjs reads the environment once at import, so each case runs in a child process.
function load(env) {
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    const { network } = await import('./scripts/demo/lib/network.mjs');
    console.log(JSON.stringify({ name: network.name, authMode: network.authMode, partyMode: network.partyMode,
      singleCredential: network.singleCredential, seatCredential: network.seatCredential, errorsMayBeHidden: network.errorsMayBeHidden,
      users: network.provisioned && Object.values(network.provisioned).map((p) => p.userId),
      externalKeys: network.externalKeys, separateVerifier: network.separateVerifier, scanAuthUser: network.scanAuthUser ?? null,
      external: network.provisionedExternal && Object.fromEntries(Object.entries(network.provisionedExternal).map(([role, p]) => [role, p.party ?? p.userId])),
      keyNames: network.provisionedExternal && Object.values(network.provisionedExternal).map((p) => p.keyName).filter(Boolean) }));
  `], { env: { PATH: process.env.PATH, HOME: process.env.HOME, DRAW_ENV_FILE: 'none', ...env }, encoding: 'utf8' });
  return child.status === 0 ? { ok: true, value: JSON.parse(child.stdout) } : { ok: false, error: child.stderr };
}

const DEVNET = {
  DRAW_NETWORK: 'devnet',
  LEDGER_AUTH_MODE: 'password',
  DRAW_JSON_API: 'https://ledger.example',
  OAUTH_TOKEN_URL: 'https://idp.example/token',
  OAUTH_CLIENT_ID: 'web-app',
  HACKCANTON_USERNAME: 'me@example.com',
  HACKCANTON_PASSWORD: 'secret',
  DRAW_ADMIN_PARTY: 'a', DRAW_LPA_PARTY: 'b', DRAW_LPB_PARTY: 'c', DRAW_LPC_PARTY: 'd', DRAW_OUTSIDER_PARTY: 'e',
};

test('LocalNet needs no configuration', () => {
  const { ok, value } = load({});
  assert.ok(ok);
  assert.deepEqual([value.name, value.authMode, value.partyMode, value.singleCredential, value.errorsMayBeHidden], ['localnet', 'hs256', 'allocate', false, false]);
});

test('the HackCanton shared-login setup is labelled single-credential', () => {
  const { ok, value } = load(DEVNET);
  assert.ok(ok);
  assert.equal(value.singleCredential, true);
  assert.equal(value.errorsMayBeHidden, true);
  assert.ok(value.users.every((u) => u === '__shared__'));
});

test('a missing party id fails before any ledger call, naming the variable', () => {
  const { ok, error } = load({ ...DEVNET, DRAW_LPB_PARTY: '' });
  assert.equal(ok, false);
  assert.match(error, /DRAW_LPB_PARTY is required/);
});

test('shared login without credentials fails with a clear message', () => {
  const { ok, error } = load({ ...DEVNET, HACKCANTON_USERNAME: '', HACKCANTON_PASSWORD: '' });
  assert.equal(ok, false);
  assert.match(error, /needs HACKCANTON_USERNAME and HACKCANTON_PASSWORD/);
});

test('DevNet without a ledger URL fails', () => {
  const { ok, error } = load({ ...DEVNET, DRAW_JSON_API: '' });
  assert.equal(ok, false);
  assert.match(error, /DRAW_JSON_API is required/);
});

test('a verifier with its own client stays off the shared login', () => {
  const { ok, value } = load({ ...DEVNET, DRAW_VERIFIER_USER: 'verifier-1', DRAW_VERIFIER_CLIENT_ID: 'vc', DRAW_VERIFIER_CLIENT_SECRET: 'vs' });
  assert.ok(ok);
  assert.equal(value.singleCredential, true);
  assert.equal(value.separateVerifier, true);
  assert.deepEqual(value.users, ['__shared__', '__shared__', '__shared__', '__shared__', '__shared__', 'verifier-1']);
});

test('external parties allocated by the operator are read from the summary file, keys by role', () => {
  const dir = mkdtempSync(join(tmpdir(), 'draw-ext-'));
  const file = join(dir, 'summary.json');
  const roles = ['admin', 'lpA', 'lpB', 'lpC', 'outsider'];
  writeFileSync(file, JSON.stringify({ parties: roles.map((role, i) => ({ role, partyId: `p${i}::1220`, fingerprint: `f${i}` })) }));
  const { ok, value } = load({ ...DEVNET, DRAW_PARTY_MODE: 'external-provisioned', DRAW_EXTERNAL_PARTIES_FILE: file });
  assert.ok(ok, value?.error);
  assert.equal(value.externalKeys, true);
  assert.deepEqual(Object.values(value.external).slice(0, 5), ['p0::1220', 'p1::1220', 'p2::1220', 'p3::1220', 'p4::1220']);
  assert.equal(value.external.verifier, '__shared__');
  assert.deepEqual(value.keyNames, roles.map((r) => `devnet-ext-${r}`));
});

test('a summary file missing a role fails, naming the role', () => {
  const dir = mkdtempSync(join(tmpdir(), 'draw-ext-'));
  const file = join(dir, 'summary.json');
  writeFileSync(file, JSON.stringify({ parties: [{ role: 'admin', partyId: 'p0::1220', fingerprint: 'f0' }] }));
  const { ok, error } = load({ ...DEVNET, DRAW_PARTY_MODE: 'external-provisioned', DRAW_EXTERNAL_PARTIES_FILE: file });
  assert.equal(ok, false);
  assert.match(error, /has no external party for lpA/);
});

// The HackCanton node with one backend client for the demo seats and a
// read-only client for the verifier, instead of a person's login.
const BACKEND = {
  DRAW_NETWORK: 'devnet',
  LEDGER_AUTH_MODE: 'oauth',
  DRAW_JSON_API: 'https://ledger.example',
  OAUTH_TOKEN_URL: 'https://idp.example/token',
  DRAW_BACKEND_CLIENT_ID: 'backend-client',
  DRAW_BACKEND_CLIENT_SECRET: 'backend-secret',
  DRAW_ADMIN_PARTY: 'a', DRAW_LPA_PARTY: 'b', DRAW_LPB_PARTY: 'c', DRAW_LPC_PARTY: 'd', DRAW_OUTSIDER_PARTY: 'e',
};

test('one backend client acts for every demo seat, and a verifier client of its own stays separate', () => {
  const { ok, value, error } = load({ ...BACKEND, DRAW_VERIFIER_CLIENT_ID: 'verifier-client', DRAW_VERIFIER_CLIENT_SECRET: 'verifier-secret' });
  assert.ok(ok, error);
  assert.equal(value.authMode, 'oauth');
  assert.equal(value.seatCredential, 'backend-client');
  assert.equal(value.singleCredential, true, 'seats on one client cannot prove LP-from-LP separation');
  assert.equal(value.separateVerifier, true);
  assert.deepEqual(value.users, ['__backend__', '__backend__', '__backend__', '__backend__', '__backend__', '__verifier__']);
});

test('without a verifier client the verifier reads through the backend client', () => {
  const { ok, value, error } = load(BACKEND);
  assert.ok(ok, error);
  assert.equal(value.separateVerifier, false);
  assert.ok(value.users.every((u) => u === '__backend__'));
});

test('a backend client named by its ledger user id keeps that id', () => {
  const { ok, value, error } = load({ ...BACKEND, DRAW_BACKEND_USER: 'service-account-1' });
  assert.ok(ok, error);
  assert.ok(value.users.every((u) => u === 'service-account-1'));
});

test('a client per seat is labelled per-seat, with nothing shared', () => {
  const seats = Object.fromEntries(['ADMIN', 'LPA', 'LPB', 'LPC', 'OUTSIDER', 'VERIFIER'].flatMap((key) => [[`DRAW_${key}_USER`, `user-${key}`], [`DRAW_${key}_CLIENT_ID`, `client-${key}`], [`DRAW_${key}_CLIENT_SECRET`, `secret-${key}`]]));
  const { ok, value, error } = load({ ...BACKEND, DRAW_BACKEND_CLIENT_ID: '', DRAW_BACKEND_CLIENT_SECRET: '', ...seats });
  assert.ok(ok, error);
  assert.equal(value.seatCredential, 'per-seat');
  assert.equal(value.singleCredential, false);
  assert.equal(value.separateVerifier, true);
});

test('a backend client without its secret fails before any ledger call, naming the variable', () => {
  const { ok, error } = load({ ...BACKEND, DRAW_BACKEND_CLIENT_SECRET: '' });
  assert.equal(ok, false);
  assert.match(error, /DRAW_BACKEND_CLIENT_SECRET is required/);
});

test('the shared HackCanton login is labelled shared-login', () => {
  const { ok, value } = load(DEVNET);
  assert.ok(ok);
  assert.equal(value.seatCredential, 'shared-login');
});

test('Scan through the validator proxy authenticates as whoever acts for the demo seats', () => {
  assert.equal(load({ ...DEVNET, SCAN_AUTH_USER: 'shared' }).value.scanAuthUser, '__shared__');
  assert.equal(load({ ...BACKEND, SCAN_AUTH_USER: 'shared' }).value.scanAuthUser, '__backend__');
  assert.equal(load({ ...BACKEND, SCAN_AUTH_USER: 'someone' }).value.scanAuthUser, 'someone');
});

test('external parties on the backend client act through it, labelled backend-client', () => {
  const dir = mkdtempSync(join(tmpdir(), 'draw-ext-'));
  const file = join(dir, 'summary.json');
  writeFileSync(file, JSON.stringify({ parties: ['admin', 'lpA', 'lpB', 'lpC', 'outsider'].map((role, i) => ({ role, partyId: `p${i}::1220`, fingerprint: `f${i}` })) }));
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    const { network } = await import('./scripts/demo/lib/network.mjs');
    console.log(JSON.stringify({ seatCredential: network.seatCredential, users: Object.values(network.provisionedExternal).map((p) => p.userId) }));
  `], { env: { PATH: process.env.PATH, HOME: process.env.HOME, DRAW_ENV_FILE: 'none', ...BACKEND, DRAW_PARTY_MODE: 'external-provisioned', DRAW_EXTERNAL_PARTIES_FILE: file }, encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  const value = JSON.parse(child.stdout);
  assert.equal(value.seatCredential, 'backend-client');
  assert.deepEqual(value.users, ['__backend__', '__backend__', '__backend__', '__backend__', '__backend__', '__backend__']);
});

test('backend-client only when the backend client serves every seat', () => {
  const own = { DRAW_LPA_USER: 'lpa-user', DRAW_LPA_CLIENT_ID: 'lpa-client', DRAW_LPA_CLIENT_SECRET: 'lpa-secret' };
  const { ok, value, error } = load({ ...BACKEND, ...own });
  assert.ok(ok, error);
  assert.equal(value.users[1], 'lpa-user', 'a seat with its own client keeps it');
  assert.equal(value.seatCredential, 'shared-user', 'the other four still share the backend user');
  assert.equal(value.singleCredential, true);
});

test('seats that share a plain user id are labelled shared-user, not per-seat', () => {
  const users = { DRAW_ADMIN_USER: 'same', DRAW_LPA_USER: 'same', DRAW_LPB_USER: 'b', DRAW_LPC_USER: 'c', DRAW_OUTSIDER_USER: 'o', DRAW_VERIFIER_USER: 'v' };
  const { ok, value, error } = load({ DRAW_PARTY_MODE: 'provisioned', ...users, DRAW_ADMIN_PARTY: 'a', DRAW_LPA_PARTY: 'b', DRAW_LPB_PARTY: 'c', DRAW_LPC_PARTY: 'd', DRAW_OUTSIDER_PARTY: 'e' });
  assert.ok(ok, error);
  assert.equal(value.seatCredential, 'shared-user');
  assert.equal(value.singleCredential, true);
});
