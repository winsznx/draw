import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';

import { configureAuth, registerOAuthClient, sharedUserId, tokenFor } from '../demo/lib/auth.mjs';

// A stand-in for the Keycloak token endpoint: password and refresh grants.
const grants = [];
let expiresIn = 3600;
const jwt = (sub, n) => `h.${Buffer.from(JSON.stringify({ sub, n })).toString('base64url')}.s`;
const server = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const form = new URLSearchParams(body);
    const grant = form.get('grant_type');
    grants.push(grant);
    const machine = grant === 'client_credentials' && form.get('client_id') === 'verifier-client' && form.get('client_secret') === 'verifier-secret';
    const ok = machine
      || (grant === 'password' && form.get('password') === 'right' && form.get('client_id') === 'web-app')
      || (grant === 'refresh_token' && form.get('refresh_token')?.startsWith('rt-'));
    res.writeHead(ok ? 200 : 401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ok
      ? { access_token: jwt(machine ? 'verifier-1' : 'user-123', grants.length), ...(machine ? {} : { refresh_token: `rt-${grants.length}` }), expires_in: expiresIn }
      : { error: 'invalid_grant', error_description: 'Invalid user credentials' }));
  });
});
let tokenUrl;

before(async () => {
  server.listen(0);
  await once(server, 'listening');
  tokenUrl = `http://localhost:${server.address().port}/token`;
});
after(() => server.close());

const shared = (extra = {}) => configureAuth({ mode: 'password', tokenUrl, clientId: 'web-app', username: 'me@example.com', password: 'right', refreshToken: undefined, ...extra });

test('logs in with a password once, then reuses the token for every user id', async () => {
  grants.length = 0;
  expiresIn = 3600;
  shared();
  const first = await tokenFor('anyone');
  const second = await tokenFor('someone-else');
  assert.equal(first, second);
  assert.deepEqual(grants, ['password']);
  assert.equal(await sharedUserId(), 'user-123');
});

test('refreshes instead of sending the password again when the token is about to expire', async () => {
  grants.length = 0;
  expiresIn = 30;
  shared();
  await tokenFor('x');
  await tokenFor('x');
  assert.deepEqual(grants, ['password', 'refresh_token']);
});

test('falls back to the password when a stored refresh token is rejected', async () => {
  grants.length = 0;
  expiresIn = 3600;
  shared({ refreshToken: 'revoked' });
  await tokenFor('x');
  assert.deepEqual(grants, ['refresh_token', 'password']);
});

test('a wrong password fails with the server\'s reason', async () => {
  shared({ password: 'wrong' });
  await assert.rejects(tokenFor('x'), /login failed: HTTP 401 invalid_grant Invalid user credentials/);
});

test('LocalNet tokens are signed per user', async () => {
  configureAuth({ mode: 'hs256', secret: 'unsafe', audience: 'aud' });
  const a = await tokenFor('alice');
  const b = await tokenFor('bob');
  assert.notEqual(a, b);
  assert.equal(JSON.parse(Buffer.from(a.split('.')[1], 'base64url').toString()).sub, 'alice');
});

test('a user with its own client gets its own token even when a shared login acts for the parties', async () => {
  grants.length = 0;
  expiresIn = 3600;
  shared();
  registerOAuthClient('verifier-1', { clientId: 'verifier-client', clientSecret: 'verifier-secret', scope: 'openid daml_ledger_api' });
  const party = await tokenFor('anyone');
  const verifier = await tokenFor('verifier-1');
  assert.notEqual(party, verifier);
  assert.equal(JSON.parse(Buffer.from(verifier.split('.')[1], 'base64url').toString()).sub, 'verifier-1');
  assert.deepEqual(grants.sort(), ['client_credentials', 'password']);
});
