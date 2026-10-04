export type Role = 'admin' | 'lpA' | 'lpB' | 'lpC' | 'outsider';
export type Investor = Exclude<Role, 'admin' | 'outsider'>;

export type Status =
  | 'due'
  | 'submitted'
  | 'mismatched'
  | 'pending'
  | 'pending-stale'
  | 'verifying'
  | 'funded'
  | 'contradicted'
  | 'overdue'
  | 'overdue-paid'
  | 'review'
  | 'waived';

export type LedgerState = 'Issued' | 'PaymentPending' | 'Funded' | 'Overdue' | 'Waived' | 'ManualReview';

export type PaymentKind =
  | 'match'
  | 'wrong-amount'
  | 'wrong-payer'
  | 'wrong-instrument'
  | 'wrong-leg'
  | 'not-for-fund'
  | 'unknown-reference'
  | 'after-close'
  | 'duplicate'
  | 'expired';

export type Recommendation = 'settle' | 'manual-review' | 'payer-withdraws' | 'ignore';

export interface Payment {
  allocationCid: string;
  amount: number;
  from: Role | 'unknown';
  kind: PaymentKind;
  recommendation: Recommendation;
}

export interface TimelineEntry {
  at: string;
  stage: string;
  by: string;
  updateId?: string;
  amount?: string;
  error?: string;
}

export interface Check {
  name: string;
  ok: boolean;
}

export interface Receipt {
  verdict: string;
  updateId: string;
  allocationCid: string;
  receivedAmount: number;
  verifiedAt: string;
  verifierUser: string;
  recordTime: string;
  checks: Check[];
}

export interface Obligation {
  ref: string;
  obligationCid: string;
  callId: string;
  investor: Investor;
  fundName: string;
  scenarioUsd: number;
  units: number;
  instrument: string;
  dueAt: string;
  ledgerState: LedgerState;
  outcome: string;
  status: Status;
  note: string | null;
  settledAfterDue: boolean | null;
  payments: Payment[];
  receipt: Receipt | null;
  timeline: TimelineEntry[];
}

export interface Totals {
  calledUsd: number;
  fundedUsd: number;
  unresolvedUsd: number;
  waivedUsd: number;
  fundedUnits: number;
  fundedCount: number;
  count: number;
}

export interface Call {
  callId: string;
  description: string | null;
  dueAt: string;
  headerTotalUsd: number | null;
  obligations: Obligation[];
  totals: Totals;
}

export interface InboxPayment {
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
  from: Role | 'unknown';
  investor: Investor | null;
}

export interface Invitation {
  invitationCid: string;
  investor: Investor;
  fundName: string;
  committedUsd: number;
}

export interface Commitment {
  investor: Investor;
  committedUsd: number;
  calledUsd: number;
}

export interface ViewNoSession {
  network: string;
  role: Role;
  singleCredential: boolean;
  session: false;
}

export interface ViewWithSession {
  network: string;
  role: Role;
  singleCredential: boolean;
  session: true;
  queriedAs: { userId: string; party: string };
  fund: { fundId: string; name: string } | null;
  fundName: string;
  calls: Call[];
  totals: Totals;
  invitations: Invitation[];
  commitments: Commitment[];
  payments: InboxPayment[];
  balance: number | null;
}

export type View = ViewNoSession | ViewWithSession;

export interface ProofReceipt {
  payer: string;
  obligationRef: string;
  verdict: string;
  claimedUpdateId: string;
  allocationCid: string;
  stateBefore: string;
  stateAfter: string;
  receivedAmount: number;
  expected: { amount: string; scenarioAmountUsd: string; instrument: { id: string } };
  checks: number;
}

export interface Proof {
  network: string;
  canonical: {
    path: string;
    runId: string;
    commit: string;
    packageId: string;
    canton: string;
    fundId: string;
    instrument: { admin: string; id: string };
    gates: Record<string, string>;
    passed: number;
    failed: string[];
    visibility: Record<string, Record<string, string[]>> | null;
    leaks: Record<string, string[]> | null;
    receipts: ProofReceipt[];
    totals: {
      fundedScenarioUsd: number;
      unresolvedScenarioUsd: number;
      callTotalScenarioUsd: number;
      fundedUnits: number;
      adminAmuletReceived: number;
      verifiedReceiptUnits: number;
      byObligation: { lp: string; state: string; evidence: string; scenarioUsd: number; units: number }[];
    } | null;
    negative: { id: string; ok: boolean }[];
  } | null;
  campaign: { path: string; seed: number; verdict: string; commit: string; metrics: Record<string, number> } | null;
  ablation: { path: string; verdict: string; comparison: { attack: string; counterfactualA: string; treatment: string }[] } | null;
  damlCore: { path: string; verdict: string; packageId: string; tests: { name: string; result: string }[] } | null;
  mutation: { path: string; verdict: string; killed: number; total: number } | null;
}
