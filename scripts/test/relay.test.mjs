import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createRelay } from '../../app/relay.mjs';

const explain = (error) => ({ error: error.message });
const answer = (relay, id, body) => new Promise((resolve) => relay.answer(id, body, resolve));

test('an action pauses for each signature and resumes with the browser\'s answer', async () => {
  const relay = createRelay();
  const signer = relay.signerFor('admin', 'admin::1', 'fp-admin');
  const seen = [];
  const { first, done } = relay.run(async () => {
    relay.describe('match the payment');
    seen.push(await signer.sign('aGFzaDE='));
    relay.describe('settle');
    seen.push(await signer.sign('aGFzaDI='));
    return { message: 'settled' };
  }, explain);

  const ask1 = await first;
  assert.equal(ask1.status, 202);
  assert.deepEqual([ask1.body.needsSignature.hash, ask1.body.needsSignature.description, ask1.body.needsSignature.step], ['aGFzaDE=', 'match the payment', 1]);
  const ask2 = await answer(relay, ask1.body.needsSignature.id, { signature: 'c2lnMQ==' });
  assert.equal(ask2.status, 202);
  assert.deepEqual([ask2.body.needsSignature.description, ask2.body.needsSignature.step], ['settle', 2]);
  const final = await answer(relay, ask2.body.needsSignature.id, { signature: 'c2lnMg==' });
  assert.deepEqual(final, { status: 200, body: { message: 'settled' } });
  await done;
  assert.deepEqual(seen.map((s) => [s.signature, s.signedBy, s.format, s.signingAlgorithmSpec]), [
    ['c2lnMQ==', 'fp-admin', 'SIGNATURE_FORMAT_CONCAT', 'SIGNING_ALGORITHM_SPEC_ED25519'],
    ['c2lnMg==', 'fp-admin', 'SIGNATURE_FORMAT_CONCAT', 'SIGNING_ALGORITHM_SPEC_ED25519'],
  ]);
});

test('cancelling a signature fails the action and submits nothing', async () => {
  const relay = createRelay();
  const signer = relay.signerFor('lpA', 'lpA::1', 'fp-a');
  let submitted = false;
  const { first } = relay.run(async () => {
    await signer.sign('aGFzaA==');
    submitted = true;
    return { message: 'paid' };
  }, explain);
  const ask = await first;
  const reply = await answer(relay, ask.body.needsSignature.id, { cancel: true });
  assert.equal(reply.status, 422);
  assert.match(reply.body.error, /cancelled/);
  assert.equal(submitted, false);
});

test('an unknown or already answered request is refused', async () => {
  const relay = createRelay();
  const reply = await answer(relay, '00000000-0000-0000-0000-000000000000', { signature: 'eA==' });
  assert.equal(reply.status, 404);
});

test('an action that needs no signature replies once', async () => {
  const relay = createRelay();
  const { first, done } = relay.run(async () => ({ message: 'read only' }), explain);
  assert.deepEqual(await first, { status: 200, body: { message: 'read only' } });
  await done;
});
