// Reconciliation and outcome truth. Pure functions over what the fund admin's
// own ledger reads returned. Nothing here moves state or decides FUNDED. It
// tells the admin what each incoming payment is and what each obligation's
// evidence currently supports.

// What DRAW can do with a payment the admin's ledger shows it.
export const PAYMENT = {
  MATCH: 'match',                     // settle it
  WRONG_AMOUNT: 'wrong-amount',       // the ledger will refuse, LP should withdraw and repay
  WRONG_PAYER: 'wrong-payer',         // someone else paid against this reference
  WRONG_INSTRUMENT: 'wrong-instrument',
  WRONG_LEG: 'wrong-leg',             // settlement reference and transfer leg id disagree
  NOT_FOR_FUND: 'not-for-fund',       // not executed by or paid to this admin
  UNKNOWN_REFERENCE: 'unknown-reference',
  AFTER_CLOSE: 'after-close',         // obligation already funded or waived
  DUPLICATE: 'duplicate',             // a second matching payment for the same obligation
  EXPIRED: 'expired',                 // settle-before has passed
};

const RECOMMENDATION = {
  [PAYMENT.MATCH]: 'settle',
  [PAYMENT.DUPLICATE]: 'manual-review',
  [PAYMENT.UNKNOWN_REFERENCE]: 'manual-review',
  [PAYMENT.WRONG_PAYER]: 'manual-review',
  [PAYMENT.WRONG_AMOUNT]: 'payer-withdraws',
  [PAYMENT.WRONG_INSTRUMENT]: 'payer-withdraws',
  [PAYMENT.WRONG_LEG]: 'payer-withdraws',
  [PAYMENT.AFTER_CLOSE]: 'payer-withdraws',
  [PAYMENT.EXPIRED]: 'payer-withdraws',
  [PAYMENT.NOT_FOR_FUND]: 'ignore',
};

const OPEN_STATES = new Set(['Issued', 'PaymentPending', 'Overdue', 'ManualReview']);

// obligations: admin ACS CapitalCallObligation payloads with contractId.
// allocations: admin ACS Allocation interface views with contractId.
export function classifyPayments({ adminParty, obligations, allocations, now = Date.now() }) {
  const byRef = new Map(obligations.map((o) => [o.payload.obligationRef, o]));
  const matchedOnce = new Set();
  const results = [];

  // Oldest first, so the earliest matching payment is the one to settle.
  const ordered = [...allocations].sort((a, b) =>
    Date.parse(a.interfaceView.allocation.settlement.requestedAt) - Date.parse(b.interfaceView.allocation.settlement.requestedAt));

  for (const allocation of ordered) {
    const { settlement, transferLeg, transferLegId } = allocation.interfaceView.allocation;
    const ref = settlement.settlementRef.id;
    const obligation = byRef.get(ref);
    let kind;
    if (settlement.executor !== adminParty || transferLeg.receiver !== adminParty) kind = PAYMENT.NOT_FOR_FUND;
    else if (!obligation) kind = PAYMENT.UNKNOWN_REFERENCE;
    else if (!OPEN_STATES.has(obligation.payload.state)) kind = PAYMENT.AFTER_CLOSE;
    else if (Date.parse(settlement.settleBefore) <= now) kind = PAYMENT.EXPIRED;
    else if (transferLegId !== ref) kind = PAYMENT.WRONG_LEG;
    else if (transferLeg.sender !== obligation.payload.lp) kind = PAYMENT.WRONG_PAYER;
    else if (transferLeg.instrumentId.admin !== obligation.payload.instrumentId.admin
      || transferLeg.instrumentId.id !== obligation.payload.instrumentId.id) kind = PAYMENT.WRONG_INSTRUMENT;
    else if (Number(transferLeg.amount) !== Number(obligation.payload.amountDue)) kind = PAYMENT.WRONG_AMOUNT;
    else if (matchedOnce.has(ref)) kind = PAYMENT.DUPLICATE;
    else {
      kind = PAYMENT.MATCH;
      matchedOnce.add(ref);
    }
    results.push({
      allocationCid: allocation.contractId,
      obligationRef: ref,
      obligationCid: obligation?.contractId ?? null,
      sender: transferLeg.sender,
      amount: Number(transferLeg.amount),
      amountDue: obligation ? Number(obligation.payload.amountDue) : null,
      requestedAt: settlement.requestedAt,
      settleBefore: settlement.settleBefore,
      kind,
      recommendation: RECOMMENDATION[kind],
    });
  }
  return results;
}

// Outcome-truth stage for one obligation, from ledger state plus the
// verifier's receipt. Only VERIFIED_FUNDED may be shown as funded.
export const OUTCOME = {
  NONE: 'NONE',
  ACKNOWLEDGED: 'ACKNOWLEDGED',           // a matching payment is locked for the fund
  PARTIAL: 'PARTIAL',                     // a payment exists but does not match
  CLAIMED_FUNDED: 'CLAIMED_FUNDED',       // ledger says Funded, not yet independently verified
  VERIFIED_FUNDED: 'VERIFIED_FUNDED',
  CONTRADICTED: 'CONTRADICTED',           // verifier read disagrees with the claim
  UNKNOWN: 'UNKNOWN',                     // in manual review
};

export function obligationOutcome(obligation, payments, receipt) {
  const state = obligation.payload.state;
  if (state === 'Funded') {
    if (receipt?.verdict === 'VERIFIED_FUNDED') return OUTCOME.VERIFIED_FUNDED;
    if (receipt) return OUTCOME.CONTRADICTED;
    return OUTCOME.CLAIMED_FUNDED;
  }
  if (state === 'ManualReview') return OUTCOME.UNKNOWN;
  const own = payments.filter((p) => p.obligationRef === obligation.payload.obligationRef);
  if (own.some((p) => p.kind === PAYMENT.MATCH)) return OUTCOME.ACKNOWLEDGED;
  if (own.length) return OUTCOME.PARTIAL;
  return OUTCOME.NONE;
}

// What the app shows for an obligation, from its ledger state, its outcome and
// the payments classified against it. Only a verified outcome reads as funded.
export function businessStatus(state, outcome, payments) {
  if (state === 'Funded') return outcome === OUTCOME.VERIFIED_FUNDED ? 'funded' : outcome === OUTCOME.CONTRADICTED ? 'contradicted' : 'verifying';
  if (state === 'Waived') return 'waived';
  if (state === 'ManualReview') return 'review';
  if (state === 'PaymentPending') return payments.some((p) => p.kind === PAYMENT.MATCH) ? 'pending' : 'pending-stale';
  const matched = payments.some((p) => p.kind === PAYMENT.MATCH);
  const mismatched = payments.some((p) => p.kind !== PAYMENT.MATCH);
  if (state === 'Overdue') return matched ? 'overdue-paid' : 'overdue';
  if (matched) return 'submitted';
  if (mismatched) return 'mismatched';
  return 'due';
}
