import type { PaymentKind, Role, SiteConfig, Status } from './types';

export const ROLE_NAME: Record<Role, string> = {
  admin: 'Fund manager',
  lpA: 'LP A',
  lpB: 'LP B',
  lpC: 'LP C',
  outsider: 'Unrelated party',
  guest: 'HackCanton LP',
};

export const roleName = (role: string | null | undefined): string =>
  role && role in ROLE_NAME ? ROLE_NAME[role as Role] : 'Unknown party';

export const usd = (n: number): string => `$${n.toLocaleString('en-US')}`;

export const units = (n: number): string => n.toLocaleString('en-US', { maximumFractionDigits: 4 });

export const shortId = (id: string | null | undefined): string => (id ? `${id.slice(0, 14)}…` : '');

// A party id is a readable hint, "::", then the namespace fingerprint. The hint
// and the start of the fingerprint are enough to tell parties apart.
export function shortParty(party: string): string {
  const [hint, namespace] = party.split('::');
  return namespace ? `${hint}::${namespace.slice(0, 8)}…` : shortId(party);
}

// How this network signs, in one sentence shown on every app screen.
export function networkNote({ network, singleCredential, browserKeys }: Pick<SiteConfig, 'network' | 'singleCredential' | 'browserKeys'>): string {
  if (browserKeys) return `${network}. Each party signs with its own key.`;
  if (singleCredential) return network === 'DevNet' ? 'DevNet, HackCanton shared node. One hackathon login signs for every seat.' : `${network}. One login signs for every seat.`;
  return `${network}. Each party reads and acts with its own ledger login.`;
}

// The same, for a site where an LP can also sign in with its own HackCanton login.
export const signInNote = (network: string): string =>
  `${network}, HackCanton shared node. One demo login signs for the demo seats. An LP that signs in with its own HackCanton login signs only for its own party.`;

export const assetNote = (network: string): string => `Settles in Canton Coin from the ${network} faucet. Dollar figures are the scenario.`;

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function relative(iso: string, now = Date.now()): string {
  const minutes = Math.round((Date.parse(iso) - now) / 60000);
  if (minutes === 0) return 'now';
  const abs = Math.abs(minutes);
  const span = abs < 120 ? `${abs} min` : abs < 48 * 60 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} days`;
  return minutes > 0 ? `in ${span}` : `${span} ago`;
}

export const isPast = (iso: string): boolean => Date.parse(iso) <= Date.now();

// The fund admin's words for an obligation.
export const ADMIN_STATUS: Record<Status, string> = {
  due: 'Awaiting payment',
  submitted: 'Payment received, ready to settle',
  mismatched: 'Payment does not match',
  pending: 'Settling',
  'pending-stale': 'Payment withdrawn',
  verifying: 'Settled, verification pending',
  funded: 'Funded',
  contradicted: 'Verification failed',
  overdue: 'Overdue',
  'overdue-paid': 'Overdue, payment received',
  review: 'In manual review',
  waived: 'Waived',
};

// The investor's words for its own obligation.
export const LP_STATUS: Record<Status, string> = {
  due: 'Due',
  submitted: 'Payment locked, waiting for the fund',
  mismatched: 'Your payment does not match the amount due',
  pending: 'Payment locked, the fund is settling it',
  'pending-stale': 'Due',
  verifying: 'Settled, verification pending',
  funded: 'Funded',
  contradicted: 'Under review by the fund',
  overdue: 'Overdue',
  'overdue-paid': 'Overdue, payment locked',
  review: 'Under review by the fund',
  waived: 'Waived by the fund',
};

export const TONE: Record<Status, 'good' | 'wait' | 'bad' | 'plain'> = {
  due: 'plain',
  submitted: 'wait',
  mismatched: 'bad',
  pending: 'wait',
  'pending-stale': 'wait',
  verifying: 'wait',
  funded: 'good',
  contradicted: 'bad',
  overdue: 'bad',
  'overdue-paid': 'wait',
  review: 'wait',
  waived: 'plain',
};

export const PAYMENT_KIND: Record<PaymentKind, string> = {
  match: 'Matches the obligation',
  'wrong-amount': 'Wrong amount',
  'wrong-payer': 'Paid by a different investor',
  'wrong-instrument': 'Wrong asset',
  'wrong-leg': 'Reference fields disagree',
  'not-for-fund': 'Not addressed to this fund',
  'unknown-reference': 'No obligation has this reference',
  'after-close': 'Obligation already closed',
  duplicate: 'Second payment for the same obligation',
  expired: 'Payment window expired',
};

export const STAGE_NAME: Record<string, string> = {
  ACTION_REQUESTED: 'Investor asked to pay',
  ACKNOWLEDGED: 'Payment locked for the fund',
  FAILED: 'Payment failed',
  TRANSFER_EXECUTED: 'Fund executed the transfer',
  SETTLEMENT_OBSERVED: 'Verifier read the settlement',
  VERIFIED_FUNDED: 'Verified funded',
  CONTRADICTED: 'Verifier contradicted the claim',
};

// Canton Coin's instrument id on the ledger is "Amulet". People know it as CC.
export const coin = (instrument: string): string => (instrument === 'Amulet' ? 'CC' : instrument);
