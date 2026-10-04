import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OUTCOME, PAYMENT, classifyPayments, obligationOutcome } from '../demo/lib/reconcile.mjs';

const ADMIN = 'admin::1';
const LP_A = 'lpA::1';
const LP_B = 'lpB::1';
const AMULET = { admin: 'dso::1', id: 'Amulet' };
const NOW = Date.parse('2026-10-04T12:00:00Z');

function obligation(ref, { lp = LP_A, state = 'Issued', amountDue = '40.0' } = {}) {
  return { contractId: `ob-${ref}`, payload: { obligationRef: ref, lp, state, amountDue, instrumentId: AMULET } };
}

function allocation(id, ref, {
  sender = LP_A, receiver = ADMIN, executor = ADMIN, amount = '40.0', instrumentId = AMULET,
  legId = ref, requestedAt = '2026-10-04T11:00:00Z', settleBefore = '2026-10-04T14:00:00Z',
} = {}) {
  return {
    contractId: id,
    interfaceView: {
      allocation: {
        settlement: { executor, settlementRef: { id: ref }, requestedAt, settleBefore },
        transferLegId: legId,
        transferLeg: { sender, receiver, amount, instrumentId },
      },
    },
  };
}

const classify = (obligations, allocations) => classifyPayments({ adminParty: ADMIN, obligations, allocations, now: NOW });
const kindOf = (results, id) => results.find((r) => r.allocationCid === id).kind;

test('an exact payment from the obligated LP matches and is recommended for settlement', () => {
  const [result] = classify([obligation('R1')], [allocation('a1', 'R1')]);
  assert.equal(result.kind, PAYMENT.MATCH);
  assert.equal(result.recommendation, 'settle');
  assert.equal(result.obligationCid, 'ob-R1');
});

test('each way a payment can be wrong gets its own classification', () => {
  const obligations = [obligation('R1'), obligation('CLOSED', { state: 'Funded' })];
  const results = classify(obligations, [
    allocation('amount', 'R1', { amount: '30.0' }),
    allocation('payer', 'R1', { sender: LP_B }),
    allocation('instrument', 'R1', { instrumentId: { admin: 'dso::1', id: 'Other' } }),
    allocation('leg', 'R1', { legId: 'R2' }),
    allocation('unknown', 'NOPE'),
    allocation('closed', 'CLOSED'),
    allocation('expired', 'R1', { settleBefore: '2026-10-04T11:30:00Z' }),
    allocation('elsewhere', 'R1', { executor: 'other::1' }),
  ]);
  assert.equal(kindOf(results, 'amount'), PAYMENT.WRONG_AMOUNT);
  assert.equal(kindOf(results, 'payer'), PAYMENT.WRONG_PAYER);
  assert.equal(kindOf(results, 'instrument'), PAYMENT.WRONG_INSTRUMENT);
  assert.equal(kindOf(results, 'leg'), PAYMENT.WRONG_LEG);
  assert.equal(kindOf(results, 'unknown'), PAYMENT.UNKNOWN_REFERENCE);
  assert.equal(kindOf(results, 'closed'), PAYMENT.AFTER_CLOSE);
  assert.equal(kindOf(results, 'expired'), PAYMENT.EXPIRED);
  assert.equal(kindOf(results, 'elsewhere'), PAYMENT.NOT_FOR_FUND);
});

test('a wrong payer and a duplicate need a decision, a wrong amount goes back to the payer', () => {
  const results = classify([obligation('R1')], [
    allocation('first', 'R1', { requestedAt: '2026-10-04T10:00:00Z' }),
    allocation('second', 'R1', { requestedAt: '2026-10-04T10:30:00Z' }),
    allocation('payer', 'R1', { sender: LP_B }),
    allocation('amount', 'R1', { amount: '41.0' }),
  ]);
  const rec = (id) => results.find((r) => r.allocationCid === id).recommendation;
  assert.equal(rec('first'), 'settle');
  assert.equal(rec('second'), 'manual-review');
  assert.equal(rec('payer'), 'manual-review');
  assert.equal(rec('amount'), 'payer-withdraws');
});

test('the earliest matching payment is the one to settle, regardless of input order', () => {
  const results = classify([obligation('R1')], [
    allocation('late', 'R1', { requestedAt: '2026-10-04T10:30:00Z' }),
    allocation('early', 'R1', { requestedAt: '2026-10-04T10:00:00Z' }),
  ]);
  assert.equal(kindOf(results, 'early'), PAYMENT.MATCH);
  assert.equal(kindOf(results, 'late'), PAYMENT.DUPLICATE);
});

test('a payment matching an open overdue obligation still settles', () => {
  const [result] = classify([obligation('R1', { state: 'Overdue' })], [allocation('a1', 'R1')]);
  assert.equal(result.kind, PAYMENT.MATCH);
});

test('amounts compare as numbers, not strings', () => {
  const [result] = classify([obligation('R1', { amountDue: '40.0000000000' })], [allocation('a1', 'R1', { amount: '40' })]);
  assert.equal(result.kind, PAYMENT.MATCH);
});

test('funded is shown only with a VERIFIED_FUNDED receipt', () => {
  const funded = obligation('R1', { state: 'Funded' });
  assert.equal(obligationOutcome(funded, [], { verdict: 'VERIFIED_FUNDED' }), OUTCOME.VERIFIED_FUNDED);
  assert.equal(obligationOutcome(funded, [], null), OUTCOME.CLAIMED_FUNDED);
  assert.equal(obligationOutcome(funded, [], { verdict: 'CONTRADICTED' }), OUTCOME.CONTRADICTED);
});

test('an open obligation reports what its payments support, never funded', () => {
  const open = obligation('R1');
  const match = classify([open], [allocation('a1', 'R1')]);
  const wrong = classify([open], [allocation('a1', 'R1', { amount: '1.0' })]);
  assert.equal(obligationOutcome(open, match, null), OUTCOME.ACKNOWLEDGED);
  assert.equal(obligationOutcome(open, wrong, null), OUTCOME.PARTIAL);
  assert.equal(obligationOutcome(open, [], null), OUTCOME.NONE);
  assert.equal(obligationOutcome(obligation('R1', { state: 'ManualReview' }), match, null), OUTCOME.UNKNOWN);
  // A stray receipt never upgrades an obligation the ledger does not show as funded.
  assert.equal(obligationOutcome(open, match, { verdict: 'VERIFIED_FUNDED' }), OUTCOME.ACKNOWLEDGED);
});
