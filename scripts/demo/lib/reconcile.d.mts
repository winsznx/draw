// Types for reconcile.mjs, which the web app imports so a signed-in LP's
// browser classifies its own payments exactly the way the server does.

export type PaymentKind =
  | 'match' | 'wrong-amount' | 'wrong-payer' | 'wrong-instrument' | 'wrong-leg'
  | 'not-for-fund' | 'unknown-reference' | 'after-close' | 'duplicate' | 'expired';

export type Recommendation = 'settle' | 'manual-review' | 'payer-withdraws' | 'ignore';

export type Outcome = 'NONE' | 'ACKNOWLEDGED' | 'PARTIAL' | 'CLAIMED_FUNDED' | 'VERIFIED_FUNDED' | 'CONTRADICTED' | 'UNKNOWN';

export type BusinessStatus =
  | 'due' | 'submitted' | 'mismatched' | 'pending' | 'pending-stale' | 'verifying'
  | 'funded' | 'contradicted' | 'overdue' | 'overdue-paid' | 'review' | 'waived';

export interface InstrumentId { admin: string; id: string }

export interface ObligationContract {
  contractId: string;
  payload: { obligationRef: string; lp: string; state: string; amountDue: string; instrumentId: InstrumentId };
}

export interface AllocationContract {
  contractId: string;
  interfaceView: {
    allocation: {
      settlement: { executor: string; settlementRef: { id: string }; requestedAt: string; settleBefore: string };
      transferLegId: string;
      transferLeg: { sender: string; receiver: string; amount: string; instrumentId: InstrumentId };
    };
  };
}

export interface ClassifiedPayment {
  allocationCid: string;
  obligationRef: string;
  obligationCid: string | null;
  sender: string;
  amount: number;
  amountDue: number | null;
  requestedAt: string;
  settleBefore: string;
  kind: PaymentKind;
  recommendation: Recommendation;
}

export const PAYMENT: Readonly<Record<'MATCH' | 'WRONG_AMOUNT' | 'WRONG_PAYER' | 'WRONG_INSTRUMENT' | 'WRONG_LEG' | 'NOT_FOR_FUND' | 'UNKNOWN_REFERENCE' | 'AFTER_CLOSE' | 'DUPLICATE' | 'EXPIRED', PaymentKind>>;
export const OUTCOME: Readonly<Record<Outcome, Outcome>>;

export function classifyPayments(args: { adminParty: string; obligations: ObligationContract[]; allocations: AllocationContract[]; now?: number }): ClassifiedPayment[];
export function obligationOutcome(obligation: ObligationContract, payments: ClassifiedPayment[], receipt: { verdict: string } | null): Outcome;
export function businessStatus(state: string, outcome: Outcome, payments: { kind: PaymentKind }[]): BusinessStatus;
