// `guest` is an LP that signed in with its own HackCanton login. Its browser
// reads and acts with its own token, never through DRAW's server.
export type Role = 'admin' | 'lpA' | 'lpB' | 'lpC' | 'outsider' | 'guest';
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
  // The CIP-0056 payment request a wallet funds, as the signed-in LP's own ledger read returns it.
  paymentRequest?: { contractId: string; view: AllocationRequestView } | null;
}

export interface AllocationRequestView {
  settlement: {
    executor: string;
    settlementRef: { id: string; cid: string | null };
    requestedAt: string;
    allocateBefore: string;
    settleBefore: string;
    meta: { values: Record<string, string> };
  };
  transferLegs: Record<string, {
    sender: string;
    receiver: string;
    amount: string;
    instrumentId: { admin: string; id: string };
    meta: { values: Record<string, string> };
  }>;
  meta: { values: Record<string, string> };
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

// What the API says about itself before any ledger read.
export interface SiteConfig {
  network: string;
  singleCredential: boolean;
  // Who acts for the demo seats: one person's login, DRAW's backend client,
  // another user several seats share, or a credential per seat. Older APIs
  // don't send it.
  seatCredential?: 'shared-login' | 'backend-client' | 'shared-user' | 'per-seat';
  // The read-back step acts as a ledger user none of the seats act as.
  separateVerifier?: boolean;
  browserKeys: boolean;
  // Each browser has its own demo fund. Off only with browser keys, where everyone joins one.
  tours: boolean;
  accessCodeRequired: boolean;
  // Set only when the operator chose to print the code for every visitor.
  accessCode: string | null;
  // Set when an LP can sign in with its own HackCanton login.
  signIn: SignInConfig | null;
  // The DRAW package the API submits with.
  release?: { version: string; packageId: string };
}

export interface SignInConfig {
  issuer: string;
  clientId: string;
  scope: string;
  ledgerApi: string;
  validatorApi: string;
  walletUrl: string | null;
  templates: Record<'Fund' | 'CommitmentInvitation' | 'InvestorCommitment' | 'CapitalCall' | 'CapitalCallObligation' | 'PaymentRequest', string>;
  interfaces: Record<'Holding' | 'Allocation' | 'AllocationFactory' | 'AllocationRequest', string>;
}

interface ViewBase extends SiteConfig {
  role: Role;
  autoSettle: boolean;
  accounts?: Role[];
}

export interface ViewNoSession extends ViewBase {
  session: false;
}

export interface ViewNotOnboarded extends ViewBase {
  session: true;
  onboarded: false;
  sessionTag: string;
  fingerprint: null;
}

export interface ViewNeedsFund extends ViewBase {
  session: true;
  onboarded: true;
  needsFund: true;
  sessionTag: string | null;
  fingerprint: string | null;
  queriedAs: { userId: string; party: string };
  balance: number | null;
}

// What the server says to the signed-in LP's browser: which demo fund this
// browser is in, and which party joined it. The browser reads the rest itself.
export interface GuestTour extends ViewBase {
  session: true;
  fund: { fundId: string; name: string } | null;
  fundName: string;
  guest: { party: string; joinedAt: string } | null;
}

export interface ViewWithSession extends ViewBase {
  session: true;
  onboarded: true;
  needsFund?: undefined;
  sessionTag: string | null;
  fingerprint: string | null;
  queriedAs: { userId: string; party: string };
  fund: { fundId: string; name: string } | null;
  fundName: string;
  calls: Call[];
  totals: Totals;
  invitations: Invitation[];
  commitments: Commitment[];
  payments: InboxPayment[];
  balance: number | null;
  // For a signed-in LP: whether its party is the one that joined this browser's fund.
  joined?: boolean;
}

export type View = ViewNoSession | ViewNotOnboarded | ViewNeedsFund | ViewWithSession;

// Where a notice reference sits on a seat's own ledger: in this browser's demo
// fund, in another demo fund on the same party, or nowhere.
export type NoticePlace = 'here' | 'elsewhere' | 'absent';

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
    // How the run's credentials were separated: TESTED, VERIFIER_ONLY, SEATS_ONLY or NOT_TESTED_SINGLE_CREDENTIAL.
    credentialSeparation: string | null;
    seatCredential: string | null;
    // The run's own test that the read-back credential cannot act as the fund.
    verifierCheck: { ran: boolean; ok: boolean; reason?: string | null };
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
  // The newest run of each browser journey on this network, with its steps and screenshots.
  browser?: BrowserRun[];
  campaign: { path: string; seed: number; verdict: string; commit: string; metrics: Record<string, number> } | null;
  ablation: { path: string; verdict: string; comparison: { attack: string; counterfactualA: string; treatment: string }[] } | null;
  damlCore: { path: string; verdict: string; packageId: string; tests: { name: string; result: string }[] } | null;
  mutation: { path: string; verdict: string; killed: number; total: number } | null;
  localnet: (Suites & { custody: { path: string; runId: string; gate: string; passed: number; failed: string[] } | null }) | null;
}

export type Suites = Pick<Proof, 'campaign' | 'ablation' | 'damlCore' | 'mutation'>;

export interface BrowserRun {
  journey: string;
  runId: string;
  path: string;
  test: string;
  site: string | null;
  verdict: string;
  steps: string[];
  expectedSteps: number;
  shots: string[];
}
