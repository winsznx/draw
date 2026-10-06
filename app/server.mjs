// DRAW application server. Every view is built from ledger reads made with the
// selected role's own ledger user, and every action is submitted by the role
// that takes it. FUNDED is shown only after the verifier's read-back issues a
// VERIFIED_FUNDED receipt for that obligation.
// Usage: node app/server.mjs   (the web app in web/ proxies its /api and /evidence requests here)
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { INTERFACES, TEMPLATES } from '../scripts/demo/lib/ledger.mjs';
import { DAR, DrawSession, LPS, eventually, newRef, packageInfo, sum } from '../scripts/demo/lib/draw.mjs';
import { ROLES, ROOT, network } from '../scripts/demo/lib/network.mjs';
import { businessStatus, classifyPayments, obligationOutcome } from '../scripts/demo/lib/reconcile.mjs';
import { LedgerClient } from '../scripts/demo/lib/ledger.mjs';
import { NoRoom, createCapacity, parseCeiling, provisionedReader } from './capacity.mjs';
import { createLimiter, parseLimit } from './limiter.mjs';
import { createRelay } from './relay.mjs';
import { createTourStore, isTourId } from './tours.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
// DRAW_EVIDENCE_DIR moves the evidence the app writes and serves, so tests can
// run the app without touching the repository's evidence.
const EVIDENCE = process.env.DRAW_EVIDENCE_DIR || join(ROOT, 'evidence');
const NETWORK_DIR = network.name === 'localnet' ? 'local' : network.name;
const PORT = Number(process.env.PORT ?? 4173);
// DRAW_STATE_DIR puts the session files on a volume when the app runs in a container.
const STATE_DIR = process.env.DRAW_STATE_DIR ?? HERE;
const SESSION_FILE = join(STATE_DIR, `.session-${network.name}.json`);
const TOURS_FILE = join(STATE_DIR, `.session-${network.name}-tours.json`);
const NETWORK_LABEL = { localnet: 'LocalNet', devnet: 'DevNet' }[network.name] ?? network.name;
const COMMITMENTS = { lpA: '1000000.0', lpB: '700000.0', lpC: '500000.0' };
// The web app's default first call, in CC. Starting a tour tops an LP up from
// the faucet only when its balance is below this.
const FIRST_CALL_UNITS = { lpA: 40, lpB: 35, lpC: 25 };
const ROLE_LABEL = { admin: 'the fund manager', lpA: 'LP A', lpB: 'LP B', lpC: 'LP C', outsider: 'the unrelated party', guest: 'the HackCanton LP' };
// What an LP that signs in with its own HackCanton login commits to the demo fund.
const GUEST_COMMITMENT = '200000.0';
// Off by default. When on, the server settles matching payments as the fund
// admin through the same path as the Settle button.
// With DRAW_PARTY_MODE=external each party's key lives in the user's browser,
// so the server can only relay. Automatic settlement needs the admin's
// signature and is therefore off in that mode.
const BROWSER_KEYS = network.partyMode === 'external';
// Every browser gets its own demo fund (a "tour"), so visitors never share one.
// With browser keys everyone joins one fund with their own key, so that mode
// keeps the single shared session it always had.
const TOURS = !BROWSER_KEYS;
const TOUR_HEADER = 'x-draw-tour';
const relay = createRelay();
const AUTO_SETTLE = process.env.DRAW_AUTO_SETTLE === 'true' && !BROWSER_KEYS;
const AUTO_SETTLE_MS = Number(process.env.DRAW_AUTO_SETTLE_MS ?? 5000);
// When set, anyone can read every view and the proof page, but actions need
// this code. Use it whenever the server is reachable from the internet.
const ACCESS_CODE = process.env.DRAW_ACCESS_CODE || null;
// Off by default. When on, the site prints the code for every visitor, so it
// keeps scripts out without keeping people out.
const PUBLIC_ACCESS_CODE = process.env.DRAW_ACCESS_CODE_PUBLIC === 'true' ? ACCESS_CODE : null;
// When set, the API answers only requests that carry this token. The web app
// on Cloudflare adds it in its proxy, so browsers reach the API only through
// the site and never directly.
const SERVICE_TOKEN = process.env.DRAW_SERVICE_TOKEN || null;
const digest = (value) => createHash('sha256').update(String(value ?? '')).digest();
const fromProxy = (req) => timingSafeEqual(digest(req.headers['x-draw-service']), digest(SERVICE_TOKEN));
// Ledger actions allowed per visitor address and for everyone together. Every
// action counts toward `action`. Starting a demo fund, issuing a call and
// tapping the faucet each add records that stay on the shared parties, so they
// also count toward tighter hourly buckets of their own.
const bucket = (name, perClient, global) => ({
  perClient: parseLimit(process.env[`DRAW_${name}_LIMIT`], perClient),
  global: parseLimit(process.env[`DRAW_${name}_LIMIT_GLOBAL`], global),
});
const limiter = createLimiter({
  buckets: {
    action: bucket('ACTION', '30/600', '120/600'),
    setup: bucket('SETUP', '3/3600', '20/3600'),
    issue: bucket('ISSUE', '10/3600', '40/3600'),
    faucet: bucket('FAUCET', '5/3600', '30/3600'),
  },
});
// Sign in with HackCanton (DRAW_SIGN_IN=true, DevNet). An LP signs in with
// its own login on the node's Keycloak, from the browser, with an
// authorization code and PKCE. Its browser then reads its own ledger and pays
// from its own Canton wallet with that token. This server learns only the
// LP's party id: it invites that party as the fund manager and settles what
// the LP pays. It never receives the LP's token.
const signIn = (() => {
  if (process.env.DRAW_SIGN_IN !== 'true' || !TOURS) return null;
  const scanProxy = process.env.SCAN_PROXY_URL;
  const settings = {
    issuer: process.env.DRAW_SIGN_IN_ISSUER || process.env.OAUTH_TOKEN_URL?.replace(/\/protocol\/openid-connect\/token$/, ''),
    clientId: process.env.DRAW_SIGN_IN_CLIENT_ID || process.env.OAUTH_CLIENT_ID,
    scope: process.env.DRAW_SIGN_IN_SCOPE || 'openid daml_ledger_api',
    ledgerApi: process.env.DRAW_SIGN_IN_LEDGER_API || network.apiFor('admin'),
    validatorApi: process.env.DRAW_SIGN_IN_VALIDATOR_API || (scanProxy ? `${new URL(scanProxy).origin}/api/validator` : null),
    walletUrl: process.env.DRAW_SIGN_IN_WALLET_URL || null,
  };
  const missing = Object.entries(settings).filter(([key, value]) => !value && key !== 'walletUrl').map(([key]) => key);
  if (missing.length) {
    console.error(`DRAW_SIGN_IN is on but ${missing.join(', ')} could not be worked out, so sign-in stays off.`);
    return null;
  }
  return { ...settings, templates: TEMPLATES, interfaces: INTERFACES };
})();
// The DRAW package this server submits with.
const RELEASE = (({ version, packageId }) => ({ version, packageId }))(packageInfo());
// A Canton party id: a hint, "::", and the namespace's SHA-256 fingerprint.
const isPartyId = (value) => typeof value === 'string' && /^[\w:.-]{1,185}::1220[0-9a-f]{64}$/.test(value);

const bucketsFor = (action) => (['setup', 'issue', 'faucet'].includes(action) ? ['action', action] : ['action']);

// Every list DRAW reads stays within this many records, below the ledger's
// 200-record limit per read, with room left for scripted runs on the same
// parties. See capacity.mjs.
const capacity = createCapacity({ ceiling: parseCeiling(process.env.DRAW_LIST_CEILING) });
// A payment spends all of an LP's unlocked holdings at once, and Amulet refuses
// a transfer with more than 100 inputs (maxNumInputs, 100 by default), so the
// faucet stops well before an LP gets near that.
const LP_HOLDINGS_CEILING = 40;
const FULL = {
  setup: 'The demo is full right now, so no new demo funds can start. Funds already running keep working, and the proof page shows every run.',
  issue: 'The demo is full right now, so no new calls can go out. Notices already issued can still be paid and settled.',
  pay: 'The demo is full right now, so no new payments can be locked. Payments already locked can still be settled.',
  invite: 'The demo is full right now, so no new invitations can go out.',
  fund: 'The demo is full right now, so no new funds can start.',
  faucet: 'This LP holds its coin in many small pieces. Paying a notice merges them, and then the faucet works again.',
};

const browserSigners = (s) => Object.fromEntries(Object.entries(s.external ?? {})
  .map(([role, { fingerprint }]) => [role, relay.signerFor(role, s.party[role], fingerprint)]));
const openSession = async (s) => DrawSession.resume({ ...s, signers: BROWSER_KEYS ? browserSigners(s) : undefined });

// ---------------------------------------------------------------- tours
// Ledger sessions already opened, by tour id. Oldest first, so the cap drops the oldest.
const opened = new Map();
const OPENED_MAX = 200;
// Tours the store dropped for being idle or past its cap. Their funds are
// closed once the server is running, through the action queue.
const evicted = [];
// A tour is one demo fund and the ledger session that acts on it:
// { id, session, draw }, where `session` is null until the fund is set up.
// With browser keys there is a single tour, id null, kept in SESSION_FILE.
const tours = TOURS
  ? createTourStore({
    file: TOURS_FILE,
    cap: Number(process.env.DRAW_TOUR_CAP || 300),
    onEvict: (id, session) => {
      evicted.push({ id, session });
      setImmediate(closeEvicted);
    },
  })
  : null;
let sharedSession = !TOURS && existsSync(SESSION_FILE) ? JSON.parse(readFileSync(SESSION_FILE, 'utf8')) : null;

const stored = (id) => (TOURS ? (isTourId(id) ? tours.get(id) : null) : sharedSession);

// Saves a tour's session, or forgets the tour when `session` is null. Its
// ledger session reopens on next use, with any parties that joined since.
function store(id, session) {
  opened.delete(id);
  if (TOURS) {
    if (session) tours.put(id, session);
    else tours.remove(id);
    return;
  }
  sharedSession = session;
  if (session) writeFileSync(SESSION_FILE, `${JSON.stringify(session, null, 2)}\n`);
  else rmSync(SESSION_FILE, { force: true });
}

async function tourFor(id) {
  const session = stored(id);
  if (!session) return { id, session: null, draw: null };
  let draw = opened.get(id);
  if (!draw) {
    draw = openSession(session);
    opened.set(id, draw);
    if (opened.size > OPENED_MAX) opened.delete(opened.keys().next().value);
    draw.catch(() => { if (opened.get(id) === draw) opened.delete(id); });
  }
  return { id, session, draw: await draw };
}

// ---------------------------------------------------------------- app evidence
const appEvidenceDir = (session) => join(EVIDENCE, NETWORK_DIR, 'app', session.fundId ?? `session-${session.tag}`);
function record(session, action, detail) {
  mkdirSync(appEvidenceDir(session), { recursive: true });
  appendFileSync(join(appEvidenceDir(session), 'actions.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), action, ...detail })}\n`);
}
function actionLog(session) {
  const file = join(appEvidenceDir(session), 'actions.jsonl');
  return existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [];
}
function receiptFor(session, ref) {
  const file = join(appEvidenceDir(session), `receipt-${ref}.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

// Execution stages from the app's own log. Outcome truth comes from the ledger
// and the verifier, see obligationOutcome.
const STAGE = { 'auto-settle-refused': 'FAILED', pay: 'ACTION_REQUESTED', 'pay-locked': 'ACKNOWLEDGED', 'pay-failed': 'FAILED', settle: 'TRANSFER_EXECUTED', observed: 'SETTLEMENT_OBSERVED', verify: null };
function timelineFor(ref, log) {
  return log.filter((entry) => entry.ref === ref && entry.action in STAGE).map((entry) => ({
    at: entry.at,
    stage: entry.action === 'verify' ? entry.verdict : STAGE[entry.action],
    by: entry.role ?? 'admin',
    updateId: entry.updateId,
    amount: entry.amount,
    error: entry.error,
  }));
}

// ---------------------------------------------------------------- errors
const FRIENDLY = [
  [/allocation amount does not equal amount due/, 'The payment amount does not match the amount due. The investor should withdraw it and pay the exact amount.'],
  [/allocation sender is not the obligated LP/, 'This payment came from a different investor than the one who owes it.'],
  [/allocation settlement reference does not match obligation|allocation transfer leg id does not match/, 'This payment carries a different reference than this obligation.'],
  [/allocation instrument does not match/, 'This payment is in a different asset than the one called.'],
  [/obligation is not open for settlement/, 'This obligation is already closed, so it cannot take another payment.'],
  [/obligation is not yet due/, 'The due time has not passed yet, so it cannot be marked overdue.'],
  [/only an unpaid obligation can become overdue/, 'Only an unpaid obligation can be marked overdue.'],
  [/only an overdue or reviewed obligation can be waived/, 'Only an overdue obligation or one in review can be waived.'],
  [/only an open obligation can be flagged/, 'Only an open obligation can be sent to review.'],
  [/only an obligation in manual review can be reopened/, 'Only an obligation in review can be reopened.'],
  [/only a payment-pending obligation can be released/, 'Only an obligation waiting on a payment can be released.'],
  [/only an issued obligation can become payment-pending/, 'This obligation is not waiting for a first payment.'],
  [/call exceeds remaining commitment/, 'This call is larger than what the investor has left to commit.'],
  [/CONTRACT_NOT_FOUND|Contract could not be found/, 'That record is no longer active on the ledger. It may already have been used. Refresh and try again.'],
  [/Insufficient funds|insufficient-funds/, 'This LP does not have enough test CC for this payment. Other visitors use the same LP and its coin. Add test CC from your seat card, then pay again.'],
  [/HTTP 413|MaximumNumberOfElements/, 'The ledger holds more records for this party than DRAW reads at once, so DRAW cannot use it right now. The proof page still works.'],
  [/HTTP 403/, 'This party is not allowed to do that.'],
  [/ECONNREFUSED|fetch failed/, 'The ledger is not reachable. Check that the network is running.'],
];
function explain(error) {
  const detail = error.message ?? String(error);
  const match = FRIENDLY.find(([pattern]) => pattern.test(detail));
  // Errors thrown by this server's own input checks are already plain language.
  const ownMessage = !/HTTP \d{3}|Interpretation error|https?:\/\//.test(detail) && detail.length < 200;
  return { error: match ? match[1] : ownMessage ? detail : 'The ledger refused this action.', detail: detail.slice(0, 1200) };
}

// ---------------------------------------------------------------- views
// What the site needs before any ledger read: the network, how it signs, and
// whether actions need the access code.
const config = () => ({
  network: NETWORK_LABEL,
  singleCredential: network.singleCredential,
  browserKeys: BROWSER_KEYS,
  tours: TOURS,
  accessCodeRequired: Boolean(ACCESS_CODE),
  accessCode: PUBLIC_ACCESS_CODE,
  signIn,
  release: RELEASE,
});

// Which seat a party is in this tour: a provisioned role, or the LP that
// signed in with its own login.
const investorOf = (session, draw, party) => draw.roleOf(party) ?? (party !== undefined && session.guest?.party === party ? 'guest' : undefined);

const receiptView = (receipt) => receipt && {
  verdict: receipt.verdict,
  updateId: receipt.claimedUpdateId,
  allocationCid: receipt.allocationCid,
  receivedAmount: receipt.receivedAmount,
  verifiedAt: receipt.verifiedAt,
  verifierUser: receipt.verifierUser,
  recordTime: receipt.recordTime,
  checks: receipt.checks,
};

// The signed-in LP's seat. Its ledger reads happen in its own browser with its
// own token, so this server says only which fund the browser is in and which
// party joined it.
function guestView({ session }) {
  const base = { ...config(), role: 'guest', autoSettle: AUTO_SETTLE };
  if (!session) return { ...base, session: false };
  return {
    ...base,
    session: true,
    fund: session.fundId ? { fundId: session.fundId, name: session.fundName } : null,
    fundName: session.fundName,
    guest: session.guest ?? null,
  };
}

// Only an LP's balance is on screen. The fund manager's holdings grow with
// every settlement, so its list is not read on every refresh.
const balanceShown = (draw, role) => (LPS.includes(role) ? draw.balance(role) : Promise.resolve(null));

async function viewFor({ session, draw }, role) {
  const base = { ...config(), role, autoSettle: AUTO_SETTLE };
  if (!session) return { ...base, session: false };
  // Which roles have created accounts. The admin uses it to know whom to invite;
  // in a real deployment an investor would share its party id with the fund.
  const keyInfo = { sessionTag: session.tag ?? null, fingerprint: session.external?.[role]?.fingerprint ?? null, accounts: Object.keys(session.party ?? {}) };
  if (BROWSER_KEYS && !session.party?.[role]) return { ...base, ...keyInfo, session: true, onboarded: false };
  if (!session.fundId) {
    return { ...base, ...keyInfo, session: true, onboarded: true, needsFund: true, queriedAs: { userId: draw.users[role], party: draw.party[role] }, balance: await balanceShown(draw, role) };
  }

  const { fundId } = session;
  const read = (templateId) => draw.contracts(role, templateId, fundId);
  const [funds, calls, invitations, commitments, everyObligation, everyAllocation, balance] = await Promise.all([
    read(TEMPLATES.Fund), read(TEMPLATES.CapitalCall), read(TEMPLATES.CommitmentInvitation),
    read(TEMPLATES.InvestorCommitment), draw.contracts(role, TEMPLATES.CapitalCallObligation), draw.allocations(role),
    balanceShown(draw, role),
  ]);
  const log = actionLog(session);
  // The same parties can hold notices in other tours' funds. Payments made
  // against those notices belong to those tours and are left out here, so a
  // visitor never sees another visitor's payments as unknown ones.
  const obligations = everyObligation.filter((o) => o.payload.fundId === fundId);
  const elsewhere = new Set(everyObligation.filter((o) => o.payload.fundId !== fundId).map((o) => o.payload.obligationRef));
  const allocations = everyAllocation.filter((a) => !elsewhere.has(a.interfaceView?.allocation?.settlement?.settlementRef?.id));
  // The classifier runs over this role's own reads. An LP's view classifies its
  // own payments against its own obligations.
  const payments = classifyPayments({ adminParty: draw.party.admin, obligations, allocations });

  const rows = obligations.map((o) => {
    const p = o.payload;
    const own = payments.filter((x) => x.obligationRef === p.obligationRef);
    const receipt = receiptFor(session, p.obligationRef);
    const outcome = obligationOutcome(o, payments, receipt);
    return {
      ref: p.obligationRef,
      obligationCid: o.contractId,
      callId: p.callId,
      investor: investorOf(session, draw, p.lp),
      fundName: p.fundName,
      scenarioUsd: Number(p.scenarioAmount),
      units: Number(p.amountDue),
      instrument: p.instrumentId.id,
      dueAt: p.dueAt,
      ledgerState: p.state,
      outcome,
      status: businessStatus(p.state, outcome, own),
      note: p.reviewNote,
      settledAfterDue: p.settlement?.settledAfterDue ?? null,
      payments: own.map((x) => ({ allocationCid: x.allocationCid, amount: x.amount, from: investorOf(session, draw, x.sender) ?? 'unknown', kind: x.kind, recommendation: x.recommendation })),
      receipt: receiptView(receipt),
      timeline: timelineFor(p.obligationRef, log),
    };
  }).sort((a, b) => (a.investor ?? '').localeCompare(b.investor ?? ''));

  const totalsOf = (list) => ({
    calledUsd: sum(list.map((r) => r.scenarioUsd)),
    fundedUsd: sum(list.filter((r) => r.status === 'funded').map((r) => r.scenarioUsd)),
    unresolvedUsd: sum(list.filter((r) => r.status !== 'funded' && r.status !== 'waived').map((r) => r.scenarioUsd)),
    waivedUsd: sum(list.filter((r) => r.status === 'waived').map((r) => r.scenarioUsd)),
    fundedUnits: sum(list.filter((r) => r.status === 'funded').map((r) => r.units)),
    fundedCount: list.filter((r) => r.status === 'funded').length,
    count: list.length,
  });

  const callIds = [...new Set([...calls.map((c) => c.payload.callId), ...rows.map((r) => r.callId)])];
  const callViews = callIds.map((callId) => {
    const header = calls.find((c) => c.payload.callId === callId)?.payload;
    const list = rows.filter((r) => r.callId === callId);
    return {
      callId,
      description: header?.description ?? null,
      dueAt: header?.dueAt ?? list[0]?.dueAt,
      headerTotalUsd: header ? Number(header.totalScenarioAmount) : null,
      obligations: list,
      totals: totalsOf(list),
    };
  }).sort((a, b) => Date.parse(b.dueAt) - Date.parse(a.dueAt));

  return {
    ...base,
    ...keyInfo,
    session: true,
    onboarded: true,
    queriedAs: { userId: draw.users[role], party: draw.party[role] },
    fund: funds[0] ? { fundId, name: funds[0].payload.fundName } : null,
    fundName: session.fundName,
    calls: callViews,
    totals: totalsOf(rows),
    invitations: invitations.map(({ contractId, payload }) => ({ invitationCid: contractId, investor: investorOf(session, draw, payload.lp), fundName: payload.fundName, committedUsd: Number(payload.committedScenarioAmount) })),
    commitments: commitments.map(({ payload }) => ({ investor: investorOf(session, draw, payload.lp), committedUsd: Number(payload.committedScenarioAmount), calledUsd: Number(payload.calledScenarioAmount) })),
    payments: payments.map((x) => ({ ...x, from: investorOf(session, draw, x.sender) ?? 'unknown', investor: investorOf(session, draw, obligations.find((o) => o.payload.obligationRef === x.obligationRef)?.payload.lp) ?? null })),
    balance,
  };
}

// Where a notice reference sits on this role's own ledger: in this browser's
// demo fund, in another demo fund on the same party (from another browser, or
// from before this one started over), or nowhere. A view shows only this
// browser's fund, so a notice missing from it is not yet missing from the
// ledger. This read decides which.
async function noticePlace({ session, draw }, role, ref) {
  if (!session.party?.[role]) return 'absent';
  const notice = (await draw.contracts(role, TEMPLATES.CapitalCallObligation)).find((o) => o.payload.obligationRef === ref);
  if (!notice) return 'absent';
  return notice.payload.fundId === session.fundId ? 'here' : 'elsewhere';
}

// ---------------------------------------------------------------- closing a fund
// A short, one-way label for a tour in the server log. The tour id itself
// works like a password for that visitor's fund, so it is never logged or
// written into evidence.
const tourLabel = (id) => createHash('sha256').update(String(id)).digest('hex').slice(0, 8);

// Withdraws what a discarded demo fund still has open: invitations nobody
// accepted and open payment requests, which the fund manager withdraws, so no
// LP's wallet keeps offering a notice of a closed fund, and the demo seats'
// unsettled payments, which each seat takes back into its balance. An LP that
// signed in with its own login takes back its own payment in its wallet, since
// only its login can. That keeps the shared parties' lists from growing with
// funds nobody uses. Commitments and notices stay, since the fund and the LP
// both signed them. Best effort: a step that fails is recorded and the rest go
// ahead.
async function closeFund(session, draw) {
  const closed = { invitations: 0, payments: 0, requests: 0, failures: [] };
  const attempt = async (what, step) => {
    try {
      await step();
      closed[what] += 1;
    } catch (error) {
      closed.failures.push({ what, error: error.message.slice(0, 300) });
    }
  };
  try {
    const [invitations, obligations, allocations, requests] = await Promise.all([
      draw.contracts('admin', TEMPLATES.CommitmentInvitation, session.fundId),
      draw.contracts('admin', TEMPLATES.CapitalCallObligation, session.fundId),
      draw.allocations('admin'),
      draw.paymentRequests('admin'),
    ]);
    const refs = new Set(obligations.map((o) => o.payload.obligationRef));
    for (const { contractId } of invitations) {
      await attempt('invitations', () => draw.client.admin.exercise({
        actAs: [draw.party.admin], templateId: TEMPLATES.CommitmentInvitation, contractId, choice: 'Invitation_Withdraw', argument: {},
      }));
    }
    for (const { contractId, interfaceView } of allocations) {
      const { settlement, transferLeg } = interfaceView?.allocation ?? {};
      const payer = draw.roleOf(transferLeg?.sender);
      if (payer && refs.has(settlement?.settlementRef?.id)) await attempt('payments', () => draw.withdraw(payer, contractId));
    }
    for (const { contractId, payload } of requests) {
      if (refs.has(payload.obligationRef)) await attempt('requests', () => draw.withdrawPaymentRequest(contractId));
    }
  } catch (error) {
    closed.failures.push({ what: 'read', error: error.message.slice(0, 300) });
  }
  record(session, 'close', closed);
  return closed;
}

// Closes the funds of tours the store dropped, one at a time through the action queue.
function closeEvicted() {
  while (evicted.length) {
    const { id, session } = evicted.shift();
    opened.delete(id);
    if (!session?.fundId) continue;
    serialized(async () => closeFund(session, await openSession(session)))
      .catch((error) => console.error(`closing the fund of idle tour ${tourLabel(id)}: ${error.message}`));
  }
}

// ---------------------------------------------------------------- actions
async function adminObligation({ session, draw }, ref) {
  const obligation = (await draw.contracts('admin', TEMPLATES.CapitalCallObligation, session.fundId)).find((o) => o.payload.obligationRef === ref);
  if (!obligation) throw new Error('That obligation was not found for the fund manager.');
  return obligation;
}

async function ownObligation({ session, draw }, role, ref) {
  const obligation = (await draw.contracts(role, TEMPLATES.CapitalCallObligation, session.fundId)).find((o) => o.payload.obligationRef === ref);
  if (!obligation) throw new Error('No such obligation is visible to this investor.');
  return obligation;
}

const resolution = (choice, verb) => async (tour, { ref, note }) => {
  if (!note?.trim()) throw new Error('Add a note so the decision is on the record.');
  relay.describe(`${verb[0].toUpperCase()}${verb.slice(1)} notice ${ref} with the note "${note.trim()}", as the fund manager`);
  const result = await tour.draw.resolve((await adminObligation(tour, ref)).contractId, choice, note.trim());
  record(tour.session, verb, { ref, note, updateId: result.transaction.updateId });
  return { message: { flag: 'Sent to manual review.', waive: 'Waived.', reopen: 'Reopened.', release: 'Released. It can take a new payment.' }[verb] };
};

// Taps the faucet for an LP whose unlocked balance is below `needed`, when the
// network has a faucet and the LP's holdings have room. Returns the tap's
// update id, or null when no tap was needed or possible. The provisioned LPs'
// coin is shared by every tour, so another visitor's payment may have spent it
// since this fund started. With browser keys a tap would need its own
// signature, so the LP taps from its seat card instead.
async function topUp(draw, role, needed) {
  if (BROWSER_KEYS || !(Number(network.tapAmount) > 0)) return null;
  if (await draw.balance(role) >= needed) return null;
  if (!(await capacity.fits(draw, { role, lists: ['Holding'], add: 1, ceiling: LP_HOLDINGS_CEILING }))) return null;
  return draw.tap(role, network.tapAmount);
}

const pendingOnboarding = new Map();
const timeTag = () => new Date().toISOString().replace(/\D/g, '').slice(0, 14);

const actions = {
  async setup(tour, { fundName = 'Example Ventures I (demo)' }) {
    if (BROWSER_KEYS) {
      // No parties yet: each person creates their own account and key in the browser.
      const tag = timeTag();
      const { packageId } = packageInfo();
      const apis = [...new Set(ROLES.map((role) => network.apiFor(role)))];
      for (const api of apis) await new LedgerClient({ baseUrl: api, userId: network.operators.provider }).uploadDar(DAR);
      const session = { network: network.name, tag, fundName, packageId, party: {}, users: {}, external: {} };
      store(tour.id, session);
      record(session, 'setup', { mode: 'browser-keys', packageId });
      return { message: 'Ready. The fund manager creates an account first, then each investor.' };
    }
    if (tour.session) return { message: `${tour.session.fundName} is already set up for this browser.` };
    // The suffix keeps fund ids apart when two visitors start in the same second.
    const tag = `${timeTag()}-${randomBytes(3).toString('hex')}`;
    const { packageId } = packageInfo();
    const next = await DrawSession.open({ tag, packageId });
    // A new fund needs room for itself and for one full call: an invitation
    // that becomes a commitment, a notice and a payment for each LP. Every
    // invitation becomes a commitment once accepted, so both lists share the
    // room, as do a payment and the holding it becomes.
    await capacity.ensure(next, [
      { role: 'admin', lists: ['Fund'], add: 1 },
      { role: 'admin', lists: ['CommitmentInvitation', 'InvestorCommitment'], add: LPS.length },
      { role: 'admin', lists: ['CapitalCall'], add: 1 },
      { role: 'admin', lists: ['CapitalCallObligation'], add: LPS.length },
      { role: 'admin', lists: ['PaymentRequest'], add: LPS.length },
      { role: 'admin', lists: ['Allocation', 'Holding'], add: LPS.length },
    ], FULL.setup);
    // Provisioned LPs keep their coin from one tour to the next, so each is
    // topped up only when it could not pay a first call.
    const taps = {};
    for (const role of LPS) taps[role] = await topUp(next, role, FIRST_CALL_UNITS[role]);
    const fundId = `FUND-${tag}`;
    const fundCid = await next.createFund({ fundId, fundName });
    for (const role of LPS) await next.invite(fundCid, role, COMMITMENTS[role]);
    const session = { ...next.state, tag, fundId, fundCid, fundName, packageId };
    store(tour.id, session);
    record(session, 'setup', { fundId, parties: next.party, users: next.users, packageId, taps });
    return { message: `${fundName} is set up. Each investor has an invitation to accept.` };
  },

  // Step 1 of sign-up: the participant builds the onboarding transactions for
  // the public key the browser generated. Nothing is allocated yet.
  async onboardstart({ session }, { role, publicKeySpki }) {
    if (!BROWSER_KEYS) throw new Error('Accounts with their own keys need DRAW_PARTY_MODE=external.');
    if (session.party[role]) throw new Error('This role already has an account.');
    const operator = new LedgerClient({ baseUrl: network.apiFor(role), userId: network.operators.provider });
    const user = `draw-${role}-${session.tag}`;
    await operator.createUser(user, {}).catch((error) => { if (!/409|ALREADY_EXISTS/.test(error.message)) throw error; });
    const synchronizer = await operator.synchronizerFor();
    const topology = await operator.request('POST', '/v2/parties/external/generate-topology', {
      json: { synchronizer, partyHint: `draw-${role}-${session.tag}`, publicKey: { format: 'CRYPTO_KEY_FORMAT_DER_X509_SUBJECT_PUBLIC_KEY_INFO', keyData: publicKeySpki, keySpec: 'SIGNING_KEY_SPEC_EC_CURVE25519' } },
    });
    pendingOnboarding.set(role, { topology, user, synchronizer });
    return { partyId: topology.partyId, fingerprint: topology.publicKeyFingerprint, multiHash: topology.multiHash };
  },

  // Step 2: the browser signed the onboarding hash with its key. The party now
  // exists, hosted here, and only that key can authorize its transactions.
  async onboardfinish(tour, { role, signature }) {
    const pending = pendingOnboarding.get(role);
    if (!pending) throw new Error('Start creating the account again.');
    const { session } = tour;
    const { topology, user, synchronizer } = pending;
    const operator = new LedgerClient({ baseUrl: network.apiFor(role), userId: network.operators.provider });
    const allocated = await operator.request('POST', '/v2/parties/external/allocate', {
      json: {
        synchronizer,
        onboardingTransactions: topology.topologyTransactions.map((transaction) => ({ transaction })),
        multiHashSignatures: [{ format: 'SIGNATURE_FORMAT_CONCAT', signature, signedBy: topology.publicKeyFingerprint, signingAlgorithmSpec: 'SIGNING_ALGORITHM_SPEC_ED25519' }],
        waitForAllocation: true,
        userId: user,
      },
    });
    pendingOnboarding.delete(role);
    session.party[role] = allocated.partyId;
    session.users[role] = user;
    session.external[role] = { fingerprint: topology.publicKeyFingerprint };
    if (role === 'admin') {
      session.users.verifier = `draw-verifier-${session.tag}`;
      await operator.createUser(session.users.verifier, { readAs: [allocated.partyId] });
    }
    store(tour.id, session);
    record(session, 'onboard', { role, party: allocated.partyId, fingerprint: topology.publicKeyFingerprint });
    return { message: 'Account created. Your key stays in this browser. Download a backup from the header.' };
  },

  async fund(tour, { fundName }) {
    const { session, draw } = tour;
    if (!session.party.admin) throw new Error('The fund manager needs an account first.');
    if (session.fundId) throw new Error('This demo fund already exists.');
    const name = fundName?.trim() || session.fundName;
    const fundId = `FUND-${session.tag}`;
    await capacity.ensure(draw, [{ role: 'admin', lists: ['Fund'], add: 1 }], FULL.fund);
    relay.describe(`Create the fund "${name}" as the fund manager`);
    const fundCid = await draw.createFund({ fundId, fundName: name });
    Object.assign(session, { fundId, fundCid, fundName: name });
    store(tour.id, session);
    record(session, 'fund', { fundId, fundName: name });
    return { message: `${name} created. Invite investors once they have accounts.` };
  },

  async invite({ session, draw }, { role, committedUsd }) {
    if (!session.party[role]) throw new Error(`${role} has not created an account yet.`);
    await capacity.ensure(draw, [{ role: 'admin', lists: ['CommitmentInvitation', 'InvestorCommitment'], add: 1 }], FULL.invite);
    relay.describe(`Invite ${ROLE_LABEL[role]} to commit $${Number(committedUsd).toLocaleString('en-US')} to ${session.fundName}, as the fund manager`);
    const result = await draw.invite(session.fundCid, role, String(committedUsd));
    record(session, 'invite', { role, committedUsd, updateId: result.transaction.updateId });
    return { message: `Invitation sent to ${role}.` };
  },

  async accept({ session, draw }, { role }) {
    relay.describe(`Accept the commitment to ${session.fundName} as ${ROLE_LABEL[role]}`);
    const [invitation] = await draw.contracts(role, TEMPLATES.CommitmentInvitation, session.fundId);
    if (!invitation) throw new Error('There is no invitation for this investor.');
    const result = await draw.acceptInvitation(role, invitation.contractId);
    record(session, 'accept', { role, updateId: result.transaction.updateId });
    return { message: 'Commitment accepted.' };
  },

  // An LP signed in with its own HackCanton login and sent its party id. The
  // fund manager invites that party. Accepting, paying and withdrawing happen
  // in the LP's browser with its own token, so the server never acts for it.
  async join(tour, { party }) {
    const { session, draw } = tour;
    if (!signIn) throw new Error('Signing in with HackCanton is not turned on for this demo.');
    if (!isPartyId(party)) throw new Error('That is not a Canton party id.');
    if (draw.roleOf(party)) throw new Error('That party is one of the demo seats. Sign in with your own HackCanton login.');
    if (session.guest?.party === party) return { message: 'Your party already has its invitation to this fund.' };
    if (session.guest) throw new Error('Another HackCanton login already joined this demo fund. Start a new demo fund to join with yours.');
    await capacity.ensure(draw, [{ role: 'admin', lists: ['CommitmentInvitation', 'InvestorCommitment'], add: 1 }], FULL.invite);
    relay.describe(`Invite your HackCanton party to commit $${Number(GUEST_COMMITMENT).toLocaleString('en-US')} to ${session.fundName}, as the fund manager`);
    const result = await draw.inviteParty(session.fundCid, party, GUEST_COMMITMENT);
    session.guest = { party, joinedAt: new Date().toISOString() };
    store(tour.id, session);
    record(session, 'invite', { role: 'guest', party, committedUsd: Number(GUEST_COMMITMENT), updateId: result.transaction.updateId });
    return { message: 'The fund invited your party. Accept the commitment with your HackCanton login.' };
  },

  async issue({ session, draw }, { callId, description, dueAt, rows }) {
    if (!callId?.trim()) throw new Error('Give the call a name or reference.');
    if (!Date.parse(dueAt)) throw new Error('Pick a due date and time.');
    const existing = await draw.contracts('admin', TEMPLATES.CapitalCall, session.fundId);
    if (existing.some((c) => c.payload.callId === callId.trim())) throw new Error('A call with this name already exists. Use a different name.');
    const included = rows.filter((r) => Number(r.scenarioUsd) > 0);
    if (!included.length) throw new Error('Call at least one investor.');
    const commitments = await draw.contracts('admin', TEMPLATES.InvestorCommitment, session.fundId);
    const partyOf = (role) => (role === 'guest' ? session.guest?.party : LPS.includes(role) ? draw.party[role] : undefined);
    const requests = included.map(({ role, scenarioUsd, units }) => {
      const lp = partyOf(role);
      if (!lp) throw new Error('Call only the investors of this fund.');
      const commitment = commitments.find((c) => c.payload.lp === lp);
      if (!commitment) throw new Error(`${ROLE_LABEL[role]} has not accepted its commitment yet.`);
      if (!(Number(units) > 0)) throw new Error('Every called investor needs a settlement amount above zero.');
      return { commitmentCid: commitment.contractId, obligationRef: newRef(), amountDue: String(units), scenarioAmount: String(scenarioUsd) };
    });
    await capacity.ensure(draw, [
      { role: 'admin', lists: ['CapitalCall'], add: 1 },
      { role: 'admin', lists: ['CapitalCallObligation'], add: requests.length },
      { role: 'admin', lists: ['PaymentRequest'], add: requests.length },
    ], FULL.issue);
    relay.describe(`Issue capital call "${callId.trim()}" to ${requests.length} investor(s) as the fund manager`);
    const result = await draw.issueCall(session.fundCid, { callId: callId.trim(), description: description?.trim() || callId.trim(), dueAt: new Date(dueAt).toISOString(), requests });
    record(session, 'issue', { callId, dueAt, requests, updateId: result.transaction.updateId });
    return { message: `${callId.trim()} issued. Each investor now sees only its own notice.` };
  },

  async pay(tour, { role, ref, amount }) {
    const { session, draw } = tour;
    const { payload } = await ownObligation(tour, role, ref);
    const value = String(amount ?? payload.amountDue);
    // Settling turns the payment into a holding for the fund, so the fund
    // manager's payments and holdings share the room.
    await capacity.ensure(draw, [
      { role: 'admin', lists: ['Allocation', 'Holding'], add: 1 },
      { role, lists: ['Holding'], add: 1 },
    ], FULL.pay);
    const tapped = await topUp(draw, role, Number(value));
    if (tapped) record(session, 'faucet', { role, updateId: tapped, before: 'pay' });
    record(session, 'pay', { role, ref, amount: value });
    relay.describe(`Lock ${Number(value)} CC for the fund against notice ${ref}, as ${ROLE_LABEL[role]}`);
    try {
      const allocation = await draw.allocate(role, { obligationRef: ref, amount: value });
      record(session, 'pay-locked', { role, ref, amount: value, ...allocation });
    } catch (error) {
      record(session, 'pay-failed', { role, ref, amount: value, error: error.message.slice(0, 300) });
      throw error;
    }
    return { message: `${Number(value)} CC locked for the fund. The fund manager settles it next.` };
  },

  async withdraw({ session, draw }, { role, allocationCid }) {
    relay.describe(`Withdraw your locked payment back to your balance, as ${ROLE_LABEL[role]}`);
    const result = await draw.withdraw(role, allocationCid);
    record(session, 'withdraw', { role, allocationCid, updateId: result.transaction.updateId });
    return { message: 'Payment withdrawn. The CC is back in your balance.' };
  },

  async faucet({ session, draw }, { role }) {
    await capacity.ensure(draw, [{ role, lists: ['Holding'], add: 1, ceiling: LP_HOLDINGS_CEILING }], FULL.faucet);
    relay.describe(`Receive ${Number(network.tapAmount)} test CC from the faucet, as ${ROLE_LABEL[role]}`);
    const updateId = await draw.tap(role, network.tapAmount);
    record(session, 'faucet', { role, updateId });
    return { message: `Added ${Number(network.tapAmount)} test CC.` };
  },

  async settle(tour, { ref, allocationCid }) {
    const { session, draw } = tour;
    let obligation = await adminObligation(tour, ref);
    const stateBefore = obligation.payload.state;
    if (stateBefore === 'Issued') {
      relay.describe(`Match the payment to notice ${ref} (it stays unfunded until settled), as the fund manager`);
      await draw.markPending(obligation.contractId, allocationCid);
      obligation = await eventually(() => adminObligation(tour, ref), (o) => o.payload.state === 'PaymentPending');
    }
    relay.describe(`Settle notice ${ref}: move the payment to the fund and mark it funded, as the fund manager`);
    const settled = await draw.settle(obligation.contractId, allocationCid);
    const updateId = settled.transaction.updateId;
    record(session, 'settle', { ref, allocationCid, updateId });

    const receipt = await draw.verifier.verify({ obligationRef: ref, claimedUpdateId: updateId });
    if (receipt.checks.find((c) => c.name === 'claimed update is a transaction')?.ok) record(session, 'observed', { ref, updateId, recordTime: receipt.recordTime });
    writeFileSync(join(appEvidenceDir(session), `receipt-${ref}.json`), `${JSON.stringify({
      environment: network.name, fundId: session.fundId, callId: obligation.payload.callId, packageId: session.packageId,
      stateBefore, ...receipt, verifiedAt: new Date().toISOString(),
    }, null, 2)}\n`);
    record(session, 'verify', { ref, verdict: receipt.verdict, updateId });
    if (receipt.verdict !== 'VERIFIED_FUNDED') {
      return { message: `Settled on the ledger, but the verifier did not confirm it: ${receipt.checks.filter((c) => !c.ok).map((c) => c.name).join(', ')}` };
    }
    return { message: `Settled and verified by a separate read-back. ${receipt.receivedAmount} CC received.` };
  },

  async overdue(tour, { ref }) {
    relay.describe(`Mark notice ${ref} overdue, as the fund manager`);
    const result = await tour.draw.markOverdue((await adminObligation(tour, ref)).contractId);
    record(tour.session, 'overdue', { ref, updateId: result.transaction.updateId });
    return { message: 'Marked overdue.' };
  },

  flag: resolution('Obligation_FlagManualReview', 'flag'),
  waive: resolution('Obligation_Waive', 'waive'),
  reopen: resolution('Obligation_Reopen', 'reopen'),
  release: resolution('Obligation_ReleasePending', 'release'),

  // Forgets this browser's fund after closing what it still has open on the
  // ledger. With browser keys closing would need everyone's signatures, so the
  // shared fund is only forgotten.
  async reset(tour) {
    if (TOURS && tour.session?.fundId) await closeFund(tour.session, tour.draw);
    store(tour.id, null);
    return { message: 'Cleared. Start a new demo fund.' };
  },
};

// Runs one action once its turn in the queue comes, against the tour's state
// at that moment rather than when the request arrived.
async function perform(name, tourId, body) {
  if (body.role !== undefined && !ROLES.includes(body.role)) throw new Error('This seat acts from its own browser, not through DRAW.');
  const tour = await tourFor(tourId);
  if (!tour.session && name !== 'setup' && name !== 'reset') throw new Error('Start a demo fund first.');
  if (TOURS && tour.session) tours.touch(tourId);
  return actions[name](tour, body);
}

// One ledger action at a time, across every tour. Tours have their own funds
// but share the provisioned parties and their coin, so two tours paying from
// LP A at once would race for the same holdings. A single queue keeps that
// correct, and the action limits keep it short. With browser keys an action can
// pause for a signature, and the queue waits for the action itself, not for
// its first reply.
const MAX_WAITING = 20;
let queue = Promise.resolve();
let waiting = 0;
const serialized = (fn) => {
  waiting += 1;
  const run = queue.then(fn, fn).finally(() => { waiting -= 1; });
  queue = run.catch(() => {});
  return run;
};
function relayed(fn) {
  let first;
  const started = new Promise((resolve) => { first = resolve; });
  waiting += 1;
  queue = queue.then(() => {
    const handle = relay.run(fn, explain);
    handle.first.then(first);
    return handle.done;
  }).catch(() => {}).finally(() => { waiting -= 1; });
  return started;
}

// ---------------------------------------------------------------- action limits
// Behind the site's proxy every request arrives from the proxy, which passes
// the visitor's address along. The header is trusted only because the service
// token proves the request came through that proxy. Without an address only the
// shared limit applies.
let warnedNoAddress = false;
function clientAddress(req) {
  if (!SERVICE_TOKEN) return req.socket.remoteAddress ?? null;
  const forwarded = req.headers['x-draw-client-ip'];
  if (forwarded) return String(forwarded);
  if (!warnedNoAddress) console.warn('The proxy sent no visitor address, so only the shared action limit applies.');
  warnedNoAddress = true;
  return null;
}

const WHY_SLOW = {
  action: { client: 'That is a lot of actions from your connection in a short time.', global: 'Many visitors are using the demo right now.' },
  setup: { client: 'Your connection has started several demo funds in the last hour.', global: 'Many visitors have started demo funds in the last hour.' },
  issue: { client: 'Your connection has issued many capital calls in the last hour.', global: 'Visitors have issued many capital calls in the last hour.' },
  faucet: { client: 'Your connection has asked the faucet for test CC several times in the last hour.', global: 'The faucet has given out a lot of test CC in the last hour.' },
};

function slowDown({ bucket, scope, retryAfterMs }) {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  const wait = minutes === 1 ? 'about a minute' : minutes >= 60 ? 'about an hour' : `about ${minutes} minutes`;
  return { error: `${WHY_SLOW[bucket][scope]} Wait ${wait}, then try again. Reading still works.`, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
}

// Too many actions are already waiting in the queue. Nothing was counted.
const BUSY = { error: 'The demo is busy with other visitors right now. Wait about half a minute, then try again. Reading still works.', retryAfterSeconds: 30 };

// ---------------------------------------------------------------- health
// For the watchdog in deploy/: the process answers, the ledger answers this
// server's own credential within a few seconds, and the demo state still
// reads. One check serves every caller for a few seconds.
const healthClient = new LedgerClient({ baseUrl: network.apiFor('admin'), userId: network.provisioned?.admin.userId ?? network.operators.provider, label: 'health' });
const HEALTH_TIMEOUT_MS = 4000;
const HEALTH_REUSE_MS = 5000;
let lastHealth = null;

const answersWithin = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => { setTimeout(() => reject(new Error(`no answer within ${ms / 1000} s`)), ms).unref(); }),
]);
const reasonOf = (error) => String(error.status ? `HTTP ${error.status}` : error.cause?.code ?? error.message).slice(0, 160);

async function checkHealth() {
  const checks = {};
  try {
    await answersWithin(healthClient.ledgerEnd(), HEALTH_TIMEOUT_MS);
    checks.ledger = { ok: true };
  } catch (error) {
    checks.ledger = { ok: false, reason: reasonOf(error) };
  }
  try {
    if (TOURS) tours.check();
    else if (existsSync(SESSION_FILE)) JSON.parse(readFileSync(SESSION_FILE, 'utf8'));
    checks.state = { ok: true };
  } catch (error) {
    checks.state = { ok: false, reason: reasonOf(error) };
  }
  return {
    ok: Object.values(checks).every((check) => check.ok),
    network: NETWORK_LABEL,
    uptimeSeconds: Math.round(process.uptime()),
    tours: tours?.size() ?? null,
    checks,
    checkedAt: new Date().toISOString(),
  };
}

// How full the shared parties' lists are, counted in the background at most
// once a minute, so a monitor sees the demo filling up before it refuses new
// funds. A full list does not fail the check, since a restart cannot help.
const countReader = provisionedReader();
const COUNT_EVERY_MS = 60_000;
let counting = null;
let countedAt = -Infinity;
function countLists() {
  if (!countReader || counting || Date.now() - countedAt < COUNT_EVERY_MS) return;
  counting = capacity.refresh(countReader)
    .catch((error) => console.error(`counting the ledger lists: ${error.message}`))
    .finally(() => {
      countedAt = Date.now();
      counting = null;
    });
}

async function health() {
  if (!lastHealth || Date.now() - lastHealth.at > HEALTH_REUSE_MS) lastHealth = { at: Date.now(), result: checkHealth() };
  countLists();
  return { ...(await lastHealth.result), capacity: countReader ? capacity.report() : null };
}

// ---------------------------------------------------------------- proof
// Paths as the site links them: /evidence/... is served from EVIDENCE.
const evidencePath = (file) => join('evidence', relative(EVIDENCE, file));

function latest(dir) {
  if (!existsSync(dir)) return null;
  const runs = readdirSync(dir).filter((d) => existsSync(join(dir, d, 'result.json'))).sort();
  if (!runs.length) return null;
  const id = runs.at(-1);
  return { id, dir: join(dir, id), path: evidencePath(join(dir, id)), result: JSON.parse(readFileSync(join(dir, id, 'result.json'), 'utf8')) };
}

// The test suites under one evidence directory: seeded campaign, ablation,
// Daml core tests, and mutation testing.
function suites(base) {
  const campaign = latest(join(base, 'campaign'));
  const ablation = latest(join(base, 'ablation'));
  const core = latest(join(base, 'daml_core'));
  const mutation = latest(join(base, 'mutation'));
  return {
    campaign: campaign && { path: campaign.path, seed: campaign.result.seed, verdict: campaign.result.verdict, metrics: campaign.result.metrics, commit: campaign.result.commit },
    ablation: ablation && { path: ablation.path, verdict: ablation.result.verdict, comparison: ablation.result.comparison },
    damlCore: core && { path: core.path, verdict: core.result.verdict, packageId: core.result.packageId, tests: core.result.tests },
    mutation: mutation && { path: mutation.path, verdict: mutation.result.verdict, killed: mutation.result.mutants.filter((m) => m.status === 'KILLED').length, total: mutation.result.mutants.length },
  };
}

// The newest LocalNet run where every party signed with its own key.
function custodyRun() {
  const dir = join(EVIDENCE, 'local', 'runs');
  if (!existsSync(dir)) return null;
  const id = readdirSync(dir).sort().reverse().find((d) => {
    const file = join(dir, d, 'result.json');
    return existsSync(file) && JSON.parse(readFileSync(file, 'utf8')).gates?.CUSTODY;
  });
  if (!id) return null;
  const result = JSON.parse(readFileSync(join(dir, id, 'result.json'), 'utf8'));
  return { path: evidencePath(join(dir, id)), runId: id, gate: result.gates.CUSTODY, passed: result.passed, failed: result.failed };
}

// The newest run of each browser journey on this network, passed or not, with
// the steps it recorded and the screenshots it took.
function browserRuns(base) {
  const dir = join(base, 'browser');
  if (!existsSync(dir)) return [];
  const newest = new Map();
  for (const id of readdirSync(dir).sort()) {
    const journey = id.match(/^web-([a-z-]+)-\d{14}$/)?.[1];
    if (journey && existsSync(join(dir, id, 'result.json'))) newest.set(journey, id);
  }
  return [...newest].map(([journey, id]) => {
    const result = JSON.parse(readFileSync(join(dir, id, 'result.json'), 'utf8'));
    return {
      journey,
      runId: id,
      path: evidencePath(join(dir, id)),
      test: result.test,
      site: result.site ?? null,
      verdict: result.verdict,
      steps: result.steps.map((s) => s.step),
      expectedSteps: result.expectedSteps,
      shots: readdirSync(join(dir, id)).filter((name) => name.endsWith('.png')).sort(),
    };
  });
}

function proof() {
  const base = join(EVIDENCE, NETWORK_DIR);
  const run = latest(join(base, 'runs'));
  const runFile = (name) => (run && existsSync(join(run.dir, name)) ? JSON.parse(readFileSync(join(run.dir, name), 'utf8')) : null);
  const visibility = runFile('visibility-final.json');
  return {
    network: NETWORK_LABEL,
    canonical: run && {
      path: run.path,
      runId: run.id,
      commit: run.result.commit,
      packageId: run.result.packageId,
      canton: run.result.canton,
      fundId: run.result.fundId,
      instrument: run.result.instrument,
      gates: run.result.gates,
      passed: run.result.passed,
      failed: run.result.failed,
      visibility: visibility?.matrix ?? visibility,
      leaks: visibility?.leaks ?? null,
      receipts: ['lpA', 'lpB'].map((role) => runFile(`receipt-${role}.json`)).filter(Boolean).map((r) => ({
        payer: r.payer, obligationRef: r.obligationRef, verdict: r.verdict, claimedUpdateId: r.claimedUpdateId, allocationCid: r.allocationCid,
        stateBefore: r.stateBefore, stateAfter: r.stateAfter, receivedAmount: r.receivedAmount, expected: r.expected, checks: r.checks.length,
      })),
      totals: runFile('totals.json'),
      negative: run.result.checks.filter((c) => /^(negative|deadline|unpaid|authority|credential)/.test(c.id)).map((c) => ({ id: c.id, ok: c.ok })),
    },
    browser: browserRuns(base),
    ...suites(base),
    // LocalNet evidence, shown separately and labelled as LocalNet when the
    // app runs on another network.
    localnet: NETWORK_DIR === 'local' ? null : { ...suites(join(EVIDENCE, 'local')), custody: custodyRun() },
  };
}

// ---------------------------------------------------------------- http
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jsonl': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.log': 'text/plain; charset=utf-8' };

function sendFile(res, base, requested) {
  const file = normalize(join(base, requested));
  if (!file.startsWith(base) || !existsSync(file) || !statSync(file).isFile()) return false;
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
  return true;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

// ---------------------------------------------------------------- automatic settlement
// Only payments the classifier marks as an exact match are settled, one at a
// time through the action queue. A refusal is recorded and that payment is not
// retried, so a bad payment cannot loop. With tours, only funds used in the
// last hour are watched, and each tick reads the fund manager's notices and
// payments once for every tour that shares that fund manager.
const autoTried = new Set();
const AUTO_SETTLE_ACTIVE_MS = 60 * 60_000;
async function autoSettleTour(id, session, obligations, allocations) {
  const own = obligations.filter((o) => o.payload.fundId === session.fundId);
  const refs = new Set(own.map((o) => o.payload.obligationRef));
  const payments = classifyPayments({
    adminParty: session.party.admin,
    obligations: own,
    allocations: allocations.filter((a) => refs.has(a.interfaceView?.allocation?.settlement?.settlementRef?.id)),
  });
  for (const payment of payments.filter((p) => p.kind === 'match' && !autoTried.has(p.allocationCid))) {
    autoTried.add(payment.allocationCid);
    try {
      const { message } = await serialized(() => perform('settle', id, { ref: payment.obligationRef, allocationCid: payment.allocationCid }));
      record(session, 'auto-settle', { ref: payment.obligationRef, allocationCid: payment.allocationCid, message });
    } catch (error) {
      record(session, 'auto-settle-refused', { ref: payment.obligationRef, allocationCid: payment.allocationCid, error: error.message.slice(0, 300) });
    }
  }
}
async function autoSettleOnce() {
  const byAdmin = new Map();
  for (const id of tours ? tours.recent(AUTO_SETTLE_ACTIVE_MS) : [null]) {
    const session = stored(id);
    if (session?.fundId) byAdmin.set(session.party.admin, [...(byAdmin.get(session.party.admin) ?? []), { id, session }]);
  }
  for (const group of byAdmin.values()) {
    try {
      const { draw } = await tourFor(group[0].id);
      const [obligations, allocations] = await Promise.all([draw.contracts('admin', TEMPLATES.CapitalCallObligation), draw.allocations('admin')]);
      for (const { id, session } of group) {
        await autoSettleTour(id, session, obligations, allocations).catch((error) => console.error(`auto-settle${id ? ` (tour ${tourLabel(id)})` : ''}: ${error.message}`));
      }
    } catch (error) {
      console.error(`auto-settle: ${error.message}`);
    }
  }
}
if (AUTO_SETTLE) {
  const tick = () => autoSettleOnce().catch((error) => console.error(`auto-settle: ${error.message}`)).finally(() => setTimeout(tick, AUTO_SETTLE_MS));
  setTimeout(tick, AUTO_SETTLE_MS);
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (SERVICE_TOKEN && !fromProxy(req)) {
      return send(res, 403, { error: 'Use the DRAW site. This API only answers its proxy.' });
    }
    if (req.method === 'GET' && url.pathname === '/api/health') {
      const result = await health();
      return send(res, result.ok ? 200 : 503, result);
    }
    if (req.method === 'GET' && url.pathname === '/api/config') return send(res, 200, config());
    // With tours the browser names its own tour. A browser that names none has no fund yet.
    const tourId = TOURS ? req.headers[TOUR_HEADER] : null;
    if (req.method === 'GET' && url.pathname === '/api/view') {
      const role = url.searchParams.get('role');
      if (role === 'guest' && signIn) return send(res, 200, guestView(await tourFor(tourId)));
      if (!ROLES.includes(role)) return send(res, 400, { error: 'Unknown role.' });
      return send(res, 200, await viewFor(await tourFor(tourId), role));
    }
    // DRAW's own record for one notice of this browser's fund: the read-back
    // receipt and the steps the app logged. The signed-in LP's browser reads
    // the notice itself from the ledger and asks here only for these.
    if (req.method === 'GET' && url.pathname === '/api/record') {
      const ref = url.searchParams.get('ref') ?? '';
      if (!/^[A-Za-z0-9-]{1,80}$/.test(ref)) return send(res, 400, { error: 'That is not a notice reference.' });
      const tour = await tourFor(tourId);
      if (!tour.session) return send(res, 409, { error: 'Start a demo fund first.' });
      return send(res, 200, { ref, receipt: receiptView(receiptFor(tour.session, ref)), timeline: timelineFor(ref, actionLog(tour.session)) });
    }
    if (req.method === 'GET' && url.pathname === '/api/notice') {
      const role = url.searchParams.get('role');
      const ref = url.searchParams.get('ref') ?? '';
      if (!ROLES.includes(role)) return send(res, 400, { error: 'Unknown role.' });
      if (!/^[A-Za-z0-9-]{1,80}$/.test(ref)) return send(res, 400, { error: 'That is not a notice reference.' });
      const tour = await tourFor(tourId);
      if (!tour.session) return send(res, 409, { error: 'Start a demo fund first.' });
      return send(res, 200, { role, ref, place: await noticePlace(tour, role, ref) });
    }
    if (req.method === 'GET' && url.pathname === '/api/proof') return send(res, 200, proof());
    if (req.method === 'POST' && ACCESS_CODE && req.headers['x-draw-access'] !== ACCESS_CODE) {
      return send(res, 401, { error: 'This demo is read-only without the access code.' });
    }
    const action = url.pathname.match(/^\/api\/actions\/([a-z]+)$/)?.[1];
    if (req.method === 'POST' && action && Object.hasOwn(actions, action)) {
      if (TOURS && !isTourId(tourId)) return send(res, 400, { error: 'This browser has no demo fund of its own yet. Reload the page and try again.' });
      const body = await readBody(req);
      const session = stored(tourId);
      // Neither of these touches the ledger, so they are answered here and
      // never count toward the limits.
      if (TOURS && action === 'reset' && !session) return send(res, 200, { message: 'Cleared. Start a new demo fund.' });
      if (TOURS && action === 'setup' && session) return send(res, 200, { message: `${session.fundName} is already set up for this browser.` });
      if (action !== 'setup' && action !== 'reset' && !session) return send(res, 409, { error: 'Start a demo fund first.' });
      if (waiting >= MAX_WAITING) return send(res, 503, BUSY, { 'Retry-After': String(BUSY.retryAfterSeconds) });
      const allowed = limiter.take(clientAddress(req), bucketsFor(action));
      if (!allowed.ok) {
        const reply = slowDown(allowed);
        return send(res, 429, reply, { 'Retry-After': String(reply.retryAfterSeconds) });
      }
      if (BROWSER_KEYS) {
        const reply = await relayed(() => perform(action, tourId, body));
        return send(res, reply.status, reply.body);
      }
      try {
        return send(res, 200, await serialized(() => perform(action, tourId, body)));
      } catch (error) {
        if (error instanceof NoRoom) return send(res, 503, { error: error.message, full: true });
        return send(res, 422, explain(error));
      }
    }
    const signing = url.pathname.match(/^\/api\/sign\/([0-9a-f-]{36})$/)?.[1];
    if (req.method === 'POST' && signing) {
      const body = await readBody(req);
      const reply = await new Promise((resolve) => relay.answer(signing, body, resolve));
      return send(res, reply.status, reply.body);
    }
    if (req.method === 'GET' && url.pathname.startsWith('/evidence/')) {
      if (sendFile(res, EVIDENCE, decodeURIComponent(url.pathname.slice('/evidence/'.length)))) return;
      return send(res, 404, { error: 'No such evidence file.' });
    }
    send(res, 404, { error: 'Not found.' });
  } catch (error) {
    send(res, 502, explain(error));
  }
}).listen(PORT, () => console.log(`DRAW on ${NETWORK_LABEL}: http://localhost:${PORT}, ${TOURS ? 'a demo fund per browser' : 'one shared demo fund'}${AUTO_SETTLE ? ', automatic settlement on' : ''}`));
