import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';

import { SettlementVerifier } from '../demo/lib/verifier.mjs';
import { activeContractsPage, party, receipt, settlementUpdate } from './fixtures/devnet-settlement.mjs';

// DRAW's read-back against LP A's recorded DevNet settlement, served by a stub
// JSON Ledger API. The stub takes LocalNet's self-signed tokens, made for the
// run's own verifier user, so nothing here calls DevNet.
const PAYER = 'payer is the obligated LP';
const READABLE = 'claimed update readable by verifier';
const failedChecks = (result) => result.checks.filter((c) => !c.ok).map((c) => c.name);

// `answer` gives the reply to update-by-id: { status, body }, or null to drop the connection.
async function readBack(t, answer = () => ({ status: 200, body: settlementUpdate() })) {
  const ledger = createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const reply = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (req.url === '/v2/state/ledger-end') return reply(200, { offset: 1 });
    if (req.url === '/v2/state/active-contracts-page') return reply(200, activeContractsPage(JSON.parse(raw)));
    if (req.url === '/v2/updates/update-by-id' && JSON.parse(raw).updateId === receipt.claimedUpdateId) {
      const answered = answer();
      return answered ? reply(answered.status, answered.body) : req.socket.destroy();
    }
    return reply(404, { code: 'NOT_FOUND' });
  });
  await new Promise((resolve) => ledger.listen(0, '127.0.0.1', resolve));
  t.after(() => ledger.close());
  const verifier = new SettlementVerifier({ baseUrl: `http://127.0.0.1:${ledger.address().port}`, userId: receipt.verifierUser, adminParty: party.admin, instrument: receipt.instrument });
  return verifier.verify({ obligationRef: receipt.obligationRef, claimedUpdateId: receipt.claimedUpdateId });
}

test('LP A\'s recorded DevNet settlement reads back as verified funded, with the same 14 checks and LP A as the payer', async (t) => {
  const result = await readBack(t);
  assert.equal(result.verdict, 'VERIFIED_FUNDED', JSON.stringify(failedChecks(result)));
  assert.equal(result.checks.length, 14);
  assert.deepEqual(result.checks.map((c) => c.name), receipt.checks.map((c) => c.name));
  assert.deepEqual(result.checks.find((c) => c.name === PAYER).detail, { payers: [party.lpA], lp: party.lpA });
  assert.equal(result.verifierUser, receipt.verifierUser);
  assert.equal(result.receivedAmount, receipt.receivedAmount);
});

test('a settlement whose transfer another LP authorized fails only the payer check', async (t) => {
  const result = await readBack(t, () => ({ status: 200, body: settlementUpdate({ actingParties: [party.admin, party.lpB] }) }));
  assert.equal(result.verdict, 'CONTRADICTED');
  assert.deepEqual(failedChecks(result), [PAYER]);
  assert.deepEqual(result.checks.find((c) => c.name === PAYER).detail, { payers: [party.lpB], lp: party.lpA });
});

test('an execution event without its acting parties fails the payer check', async (t) => {
  const result = await readBack(t, () => ({ status: 200, body: settlementUpdate({ actingParties: null }) }));
  assert.equal(result.verdict, 'CONTRADICTED');
  assert.deepEqual(failedChecks(result), [PAYER]);
  assert.deepEqual(result.checks.find((c) => c.name === PAYER).detail, { payers: [], lp: party.lpA });
});

test('a read the ledger did not answer throws, and only a refused read counts against the settlement', async (t) => {
  for (const status of [401, 429, 500, 503]) {
    await assert.rejects(readBack(t, () => ({ status, body: { code: 'UNAVAILABLE' } })), (error) => error.status === status, `HTTP ${status}`);
  }
  await assert.rejects(readBack(t, () => null), (error) => error.status === undefined, 'a dropped connection');

  for (const status of [400, 403, 404]) {
    const result = await readBack(t, () => ({ status, body: { code: 'NOT_FOUND' } }));
    assert.equal(result.verdict, 'CONTRADICTED', `HTTP ${status}`);
    assert.equal(result.checks.find((c) => c.name === READABLE)?.ok, false, `HTTP ${status}`);
  }
});
