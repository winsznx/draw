import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';

import { configureAuth, registerOAuthClient } from '../demo/lib/auth.mjs';
import { LedgerClient } from '../demo/lib/ledger.mjs';
import { judgeBackend, judgeVerifier, summarizeRights } from '../demo/lib/rights.mjs';

// The JSON Ledger API refuses a command whose userId is not the token's user.
// A client configured by placeholder must therefore send the resolved id, or
// every submission would fail, and a probe expecting a refusal would pass for
// the wrong reason.
const jwt = (sub) => `h.${Buffer.from(JSON.stringify({ sub })).toString('base64url')}.s`;
const subjectOf = (header) => JSON.parse(Buffer.from(header.replace('Bearer ', '').split('.')[1], 'base64url').toString()).sub;
const seen = [];
const server = createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    const reply = (status, value) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(value));
    };
    if (req.url === '/token') return reply(200, { access_token: jwt('svc-backend'), expires_in: 3600 });
    const json = body ? JSON.parse(body) : {};
    const userId = json.userId ?? json.commands?.userId;
    seen.push({ path: req.url, userId, subject: subjectOf(req.headers.authorization) });
    if (userId !== subjectOf(req.headers.authorization)) return reply(403, { code: 'PERMISSION_DENIED' });
    if (req.url === '/v2/commands/submit-and-wait-for-transaction') return reply(200, { transaction: { updateId: 'u-1', events: [] } });
    if (req.url === '/v2/interactive-submission/prepare') return reply(200, { preparedTransactionHash: 'abc' });
    return reply(404, {});
  });
});
let url;

before(async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  url = `http://127.0.0.1:${server.address().port}`;
  configureAuth({ mode: 'oauth', tokenUrl: `${url}/token` });
  registerOAuthClient('__backend__', { clientId: 'backend-client', clientSecret: 'backend-secret' });
});
after(() => server.close());

test('a client configured by placeholder submits and prepares as the user its token belongs to', async () => {
  const client = new LedgerClient({ baseUrl: url, userId: '__backend__', label: 'backend' });
  await client.create({ actAs: ['admin::1220aa'], templateId: '#draw:Draw.CapitalCall:Fund', argument: {} });
  await client.prepare({ actAs: ['admin::1220aa'], commands: [] });
  assert.deepEqual(seen.map((s) => [s.userId, s.subject]), [['svc-backend', 'svc-backend'], ['svc-backend', 'svc-backend']]);
  assert.equal(await client.tokenSubject(), 'svc-backend');
});

// GET /v2/users/{user}/rights answers in this shape.
const rights = (...list) => ({ rights: list.map(([kind, party]) => ({ kind: { [kind]: party ? { value: { party } } : {} } })) });
const DEMO = ['admin::1', 'lpa::1', 'lpb::1', 'lpc::1', 'out::1'];

test('the backend client must act for every demo party and hold nothing else', () => {
  const exact = summarizeRights(rights(...DEMO.map((p) => ['CanActAs', p]), ['CanReadAs', 'admin::1']));
  assert.deepEqual(judgeBackend(exact, DEMO), []);
  assert.deepEqual(judgeBackend(summarizeRights(rights(...DEMO.slice(1).map((p) => ['CanActAs', p]))), DEMO), ['cannot act for admin']);
  assert.deepEqual(judgeBackend(summarizeRights(rights(...DEMO.map((p) => ['CanActAs', p]), ['CanActAs', 'wallet::1'])), DEMO), ['also has rights on wallet']);
  assert.deepEqual(judgeBackend(summarizeRights(rights(...DEMO.map((p) => ['CanActAs', p]), ['CanReadAsAnyParty'])), DEMO), ['also holds CanReadAsAnyParty']);
  assert.ok(judgeBackend(summarizeRights(rights()), DEMO).length > 0, 'no rights at all is not a pass');
});

test('the verifier client must read as the fund and do nothing else', () => {
  assert.deepEqual(judgeVerifier(summarizeRights(rights(['CanReadAs', 'admin::1'])), 'admin::1'), []);
  assert.deepEqual(judgeVerifier(summarizeRights(rights()), 'admin::1'), ['cannot read as the fund'], 'no rights at all is not a pass');
  assert.deepEqual(judgeVerifier(summarizeRights(rights(['CanReadAs', 'admin::1'], ['CanActAs', 'admin::1'])), 'admin::1'), ['can act for admin']);
  assert.deepEqual(judgeVerifier(summarizeRights(rights(['CanReadAs', 'admin::1'], ['CanExecuteAs', 'lpa::1'])), 'admin::1'), ['can act for lpa']);
  assert.deepEqual(judgeVerifier(summarizeRights(rights(['CanReadAs', 'admin::1'], ['CanReadAs', 'lpa::1'])), 'admin::1'), ['also reads as lpa']);
  assert.deepEqual(judgeVerifier(summarizeRights(rights(['CanReadAs', 'admin::1'], ['ParticipantAdmin'])), 'admin::1'), ['also holds ParticipantAdmin']);
});
