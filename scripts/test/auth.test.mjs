import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';

import { configureAuth, ledgerUserOf, registerOAuthClient, sharedUserId, tokenFor } from '../demo/lib/auth.mjs';

// A stand-in for the Keycloak token endpoint: password and refresh grants.
const grants = [];
const clients = [];
let expiresIn = 3600;
const jwt = (sub, n) => `h.${Buffer.from(JSON.stringify({ sub, n })).toString('base64url')}.s`;
const server = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const form = new URLSearchParams(body);
    const grant = form.get('grant_type');
    grants.push(grant);
    clients.push(form.get('client_id'));
    // Two machine clients, each with a subject no other test uses.
    const machines = { 'verifier-client': ['verifier-secret', 'verifier-1'], 'backend-client': ['backend-secret', 'svc-backend'] };
    const known = machines[form.get('client_id')];
    const machine = grant === 'client_credentials' && known?.[0] === form.get('client_secret');
    const ok = machine
      || (grant === 'password' && form.get('password') === 'right' && form.get('client_id') === 'web-app')
      || (grant === 'refresh_token' && form.get('refresh_token')?.startsWith('rt-'));
    res.writeHead(ok ? 200 : 401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ok
      ? { access_token: jwt(machine ? known[1] : 'user-123', grants.length), ...(machine ? {} : { refresh_token: `rt-${grants.length}` }), expires_in: expiresIn }
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

test('logs in with a password once, and answers for itself by placeholder and by its real id', async () => {
  grants.length = 0;
  expiresIn = 3600;
  shared();
  const first = await tokenFor('__shared__');
  assert.equal(await sharedUserId(), 'user-123');
  const second = await tokenFor('user-123');
  assert.equal(first, second);
  assert.deepEqual(grants, ['password']);
});

test('the shared login refuses an id it does not know, rather than standing in for it', async () => {
  grants.length = 0;
  expiresIn = 3600;
  shared();
  await assert.rejects(tokenFor('svc-verifier'), /the shared login acts only as itself/);
});

test('refreshes instead of sending the password again when the token is about to expire', async () => {
  grants.length = 0;
  expiresIn = 30;
  shared();
  await tokenFor('__shared__');
  await tokenFor('__shared__');
  assert.deepEqual(grants, ['password', 'refresh_token']);
});

test('falls back to the password when a stored refresh token is rejected', async () => {
  grants.length = 0;
  expiresIn = 3600;
  shared({ refreshToken: 'revoked' });
  await tokenFor('__shared__');
  assert.deepEqual(grants, ['refresh_token', 'password']);
});

test('a wrong password fails with the server\'s reason', async () => {
  shared({ password: 'wrong' });
  await assert.rejects(tokenFor('__shared__'), /login failed: HTTP 401 invalid_grant Invalid user credentials/);
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
  const party = await tokenFor('__shared__');
  const verifier = await tokenFor('verifier-1');
  assert.notEqual(party, verifier);
  assert.equal(JSON.parse(Buffer.from(verifier.split('.')[1], 'base64url').toString()).sub, 'verifier-1');
  assert.deepEqual(grants.sort(), ['client_credentials', 'password']);
});

test('a client named by a placeholder resolves to its token\'s subject, and its client then answers to that id', async () => {
  grants.length = 0;
  clients.length = 0;
  expiresIn = 3600;
  configureAuth({ mode: 'oauth', tokenUrl });
  registerOAuthClient('__backend__', { clientId: 'backend-client', clientSecret: 'backend-secret' });
  await assert.rejects(tokenFor('svc-backend'), /no OAuth client configured for ledger user svc-backend/, 'unknown until resolved');
  assert.equal(await ledgerUserOf('__backend__'), 'svc-backend');
  assert.equal(await ledgerUserOf('__backend__'), 'svc-backend');
  assert.ok((await tokenFor('svc-backend')).startsWith('h.'));
  assert.deepEqual(clients, ['backend-client', 'backend-client'], 'the real id gets the backend client\'s own token');
  assert.equal(await ledgerUserOf('someone-real'), 'someone-real', 'a real id needs no lookup');
});

test('a new configuration forgets earlier clients and resolutions, as a restarted process would', async () => {
  configureAuth({ mode: 'oauth', tokenUrl });
  registerOAuthClient('__backend__', { clientId: 'backend-client', clientSecret: 'backend-secret' });
  await ledgerUserOf('__backend__');
  configureAuth({ mode: 'oauth', tokenUrl });
  await assert.rejects(tokenFor('svc-backend'), /no OAuth client configured/);
  shared();
  await assert.rejects(tokenFor('svc-backend'), /the shared login acts only as itself/, 'and the shared login never stands in for it');
});

test('the shared login placeholder resolves to the logged-in user', async () => {
  grants.length = 0;
  expiresIn = 3600;
  shared();
  assert.equal(await ledgerUserOf('__shared__'), 'user-123');
});
