import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

// network.mjs reads the environment once at import, so each case runs in a child process.
function load(env) {
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    const { network } = await import('./scripts/demo/lib/network.mjs');
    console.log(JSON.stringify({ name: network.name, authMode: network.authMode, partyMode: network.partyMode,
      singleCredential: network.singleCredential, errorsMayBeHidden: network.errorsMayBeHidden,
      users: network.provisioned && Object.values(network.provisioned).map((p) => p.userId) }));
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
