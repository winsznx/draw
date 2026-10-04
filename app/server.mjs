// DRAW application server. Every view is built from ledger reads made with the
// selected role's own ledger user, and every action is submitted by the role
// that takes it. FUNDED is shown only after the independent verifier issues a
// VERIFIED_FUNDED receipt for that obligation.
// Usage: node app/server.mjs   (serves app/web/dist, build it with `npm run build` in app/web)
import { createServer } from 'node:http';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TEMPLATES } from '../scripts/demo/lib/ledger.mjs';
import { DAR, DrawSession, LPS, eventually, newRef, packageInfo, sum } from '../scripts/demo/lib/draw.mjs';
import { ROLES, ROOT, network } from '../scripts/demo/lib/network.mjs';
import { OUTCOME, classifyPayments, obligationOutcome } from '../scripts/demo/lib/reconcile.mjs';
import { LedgerClient } from '../scripts/demo/lib/ledger.mjs';
import { createRelay } from './relay.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, 'web/dist');
const EVIDENCE = join(ROOT, 'evidence');
const NETWORK_DIR = network.name === 'localnet' ? 'local' : network.name;
const PORT = Number(process.env.PORT ?? 4173);
const SESSION_FILE = join(HERE, `.session-${network.name}.json`);
const NETWORK_LABEL = { localnet: 'LocalNet', devnet: 'DevNet' }[network.name] ?? network.name;
const COMMITMENTS = { lpA: '1000000.0', lpB: '700000.0', lpC: '500000.0' };
// Off by default. When on, the server settles matching payments as the fund
// admin through the same path as the Settle button.
// With DRAW_PARTY_MODE=external each party's key lives in the user's browser,
// so the server can only relay. Automatic settlement needs the admin's
// signature and is therefore off in that mode.
const BROWSER_KEYS = network.partyMode === 'external';
const relay = createRelay();
const AUTO_SETTLE = process.env.DRAW_AUTO_SETTLE === 'true' && !BROWSER_KEYS;
const AUTO_SETTLE_MS = Number(process.env.DRAW_AUTO_SETTLE_MS ?? 5000);

const browserSigners = (s) => Object.fromEntries(Object.entries(s.external ?? {})
  .map(([role, { fingerprint }]) => [role, relay.signerFor(role, s.party[role], fingerprint)]));
const openSession = async (s) => DrawSession.resume({ ...s, signers: BROWSER_KEYS ? browserSigners(s) : undefined });
const saveSession = () => writeFileSync(SESSION_FILE, `${JSON.stringify(session, null, 2)}\n`);

let session = existsSync(SESSION_FILE) ? JSON.parse(readFileSync(SESSION_FILE, 'utf8')) : null;
let draw = session ? await openSession(session) : null;

// ---------------------------------------------------------------- app evidence
const appEvidenceDir = () => join(EVIDENCE, NETWORK_DIR, 'app', session.fundId ?? `session-${session.tag}`);
function record(action, detail) {
  mkdirSync(appEvidenceDir(), { recursive: true });
  appendFileSync(join(appEvidenceDir(), 'actions.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), action, ...detail })}\n`);
}
function actionLog() {
  const file = join(appEvidenceDir(), 'actions.jsonl');
  return existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [];
}
function receiptFor(ref) {
  const file = join(appEvidenceDir(), `receipt-${ref}.json`);
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
function businessStatus(state, outcome, payments) {
  if (state === 'Funded') return outcome === OUTCOME.VERIFIED_FUNDED ? 'funded' : outcome === OUTCOME.CONTRADICTED ? 'contradicted' : 'verifying';
  if (state === 'Waived') return 'waived';
  if (state === 'ManualReview') return 'review';
  if (state === 'PaymentPending') return payments.some((p) => p.kind === 'match') ? 'pending' : 'pending-stale';
  const matched = payments.some((p) => p.kind === 'match');
  const mismatched = payments.some((p) => p.kind !== 'match');
  if (state === 'Overdue') return matched ? 'overdue-paid' : 'overdue';
  if (matched) return 'submitted';
  if (mismatched) return 'mismatched';
  return 'due';
}

async function viewFor(role) {
  const base = { network: NETWORK_LABEL, role, singleCredential: network.singleCredential, autoSettle: AUTO_SETTLE, browserKeys: BROWSER_KEYS };
  if (!session) return { ...base, session: false };
  // Which roles have created accounts. The admin uses it to know whom to invite;
  // in a real deployment an investor would share its party id with the fund.
  const keyInfo = { sessionTag: session.tag ?? null, fingerprint: session.external?.[role]?.fingerprint ?? null, accounts: Object.keys(session.party ?? {}) };
  if (BROWSER_KEYS && !session.party?.[role]) return { ...base, ...keyInfo, session: true, onboarded: false };
  if (!session.fundId) {
    return { ...base, ...keyInfo, session: true, onboarded: true, needsFund: true, queriedAs: { userId: draw.users[role], party: draw.party[role] }, balance: role === 'outsider' ? null : await draw.balance(role) };
  }

  const { fundId } = session;
  const read = (templateId) => draw.contracts(role, templateId, fundId);
  const [funds, calls, invitations, commitments, obligations, allocations, balance] = await Promise.all([
    read(TEMPLATES.Fund), read(TEMPLATES.CapitalCall), read(TEMPLATES.CommitmentInvitation),
    read(TEMPLATES.InvestorCommitment), read(TEMPLATES.CapitalCallObligation), draw.allocations(role),
    role === 'outsider' ? Promise.resolve(null) : draw.balance(role),
  ]);
  const log = actionLog();
  // The classifier runs over this role's own reads. An LP's view classifies its
  // own payments against its own obligations.
  const payments = classifyPayments({ adminParty: draw.party.admin, obligations, allocations });

  const rows = obligations.map((o) => {
    const p = o.payload;
    const own = payments.filter((x) => x.obligationRef === p.obligationRef);
    const receipt = receiptFor(p.obligationRef);
    const outcome = obligationOutcome(o, payments, receipt);
    return {
      ref: p.obligationRef,
      obligationCid: o.contractId,
      callId: p.callId,
      investor: draw.roleOf(p.lp),
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
      payments: own.map((x) => ({ allocationCid: x.allocationCid, amount: x.amount, from: draw.roleOf(x.sender) ?? 'unknown', kind: x.kind, recommendation: x.recommendation })),
      receipt: receipt && {
        verdict: receipt.verdict,
        updateId: receipt.claimedUpdateId,
        allocationCid: receipt.allocationCid,
        receivedAmount: receipt.receivedAmount,
        verifiedAt: receipt.verifiedAt,
        verifierUser: receipt.verifierUser,
        recordTime: receipt.recordTime,
        checks: receipt.checks,
      },
      timeline: timelineFor(p.obligationRef, log),
    };
  }).sort((a, b) => a.investor.localeCompare(b.investor));

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
    invitations: invitations.map(({ contractId, payload }) => ({ invitationCid: contractId, investor: draw.roleOf(payload.lp), fundName: payload.fundName, committedUsd: Number(payload.committedScenarioAmount) })),
    commitments: commitments.map(({ payload }) => ({ investor: draw.roleOf(payload.lp), committedUsd: Number(payload.committedScenarioAmount), calledUsd: Number(payload.calledScenarioAmount) })),
    payments: payments.map((x) => ({ ...x, from: draw.roleOf(x.sender) ?? 'unknown', investor: draw.roleOf(obligations.find((o) => o.payload.obligationRef === x.obligationRef)?.payload.lp) ?? null })),
    balance,
  };
}

// ---------------------------------------------------------------- actions
async function adminObligation(ref) {
  const obligation = (await draw.contracts('admin', TEMPLATES.CapitalCallObligation, session.fundId)).find((o) => o.payload.obligationRef === ref);
  if (!obligation) throw new Error('That obligation was not found for the fund admin.');
  return obligation;
}

async function ownObligation(role, ref) {
  const obligation = (await draw.contracts(role, TEMPLATES.CapitalCallObligation, session.fundId)).find((o) => o.payload.obligationRef === ref);
  if (!obligation) throw new Error('No such obligation is visible to this investor.');
  return obligation;
}

const resolution = (choice, verb) => async ({ ref, note }) => {
  if (!note?.trim()) throw new Error('Add a note so the decision is on the record.');
  relay.describe(`${verb[0].toUpperCase()}${verb.slice(1)} notice ${ref} with the note "${note.trim()}", as the fund admin`);
  const result = await draw.resolve((await adminObligation(ref)).contractId, choice, note.trim());
  record(verb, { ref, note, updateId: result.transaction.updateId });
  return { message: { flag: 'Sent to manual review.', waive: 'Waived.', reopen: 'Reopened.', release: 'Released. It can take a new payment.' }[verb] };
};

const pendingOnboarding = new Map();

const actions = {
  async setup({ fundName = 'Example Ventures I (demo)' }) {
    if (BROWSER_KEYS) {
      // No parties yet: each person creates their own account and key in the browser.
      const tag = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
      const { packageId } = packageInfo();
      const apis = [...new Set(ROLES.map((role) => network.apiFor(role)))];
      for (const api of apis) await new LedgerClient({ baseUrl: api, userId: network.operators.provider }).uploadDar(DAR);
      session = { network: network.name, tag, fundName, packageId, party: {}, users: {}, external: {} };
      draw = await openSession(session);
      saveSession();
      record('setup', { mode: 'browser-keys', packageId });
      return { message: 'Ready. The fund admin creates an account first, then each investor.' };
    }
    const tag = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const { packageId } = packageInfo();
    const next = await DrawSession.open({ tag, packageId });
    for (const role of LPS) await next.tap(role, network.tapAmount);
    const fundId = `FUND-${tag}`;
    const fundCid = await next.createFund({ fundId, fundName });
    for (const role of LPS) await next.invite(fundCid, role, COMMITMENTS[role]);
    draw = next;
    session = { ...next.state, fundId, fundCid, fundName, packageId };
    writeFileSync(SESSION_FILE, `${JSON.stringify(session, null, 2)}\n`);
    record('setup', { fundId, parties: next.party, users: next.users, packageId });
    return { message: `${fundName} is set up. Each investor has an invitation to accept.` };
  },

  // Step 1 of sign-up: the participant builds the onboarding transactions for
  // the public key the browser generated. Nothing is allocated yet.
  async onboardstart({ role, publicKeySpki }) {
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
  async onboardfinish({ role, signature }) {
    const pending = pendingOnboarding.get(role);
    if (!pending) throw new Error('Start creating the account again.');
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
    saveSession();
    draw = await openSession(session);
    record('onboard', { role, party: allocated.partyId, fingerprint: topology.publicKeyFingerprint });
    return { message: 'Account created. Your key stays in this browser. Download a backup from the header.' };
  },

  async fund({ fundName }) {
    if (!session.party.admin) throw new Error('The fund admin needs an account first.');
    const name = fundName?.trim() || session.fundName;
    const fundId = `FUND-${session.tag}`;
    relay.describe(`Create the fund "${name}" as the fund admin`);
    const fundCid = await draw.createFund({ fundId, fundName: name });
    Object.assign(session, { fundId, fundCid, fundName: name });
    saveSession();
    record('fund', { fundId, fundName: name });
    return { message: `${name} created. Invite investors once they have accounts.` };
  },

  async invite({ role, committedUsd }) {
    if (!session.party[role]) throw new Error(`${role} has not created an account yet.`);
    relay.describe(`Invite ${role} to commit $${Number(committedUsd).toLocaleString('en-US')} to ${session.fundName}, as the fund admin`);
    const result = await draw.invite(session.fundCid, role, String(committedUsd));
    record('invite', { role, committedUsd, updateId: result.transaction.updateId });
    return { message: `Invitation sent to ${role}.` };
  },

  async accept({ role }) {
    relay.describe(`Accept the commitment to ${session.fundName} as ${role}`);
    const [invitation] = await draw.contracts(role, TEMPLATES.CommitmentInvitation, session.fundId);
    if (!invitation) throw new Error('There is no invitation for this investor.');
    const result = await draw.acceptInvitation(role, invitation.contractId);
    record('accept', { role, updateId: result.transaction.updateId });
    return { message: 'Commitment accepted.' };
  },

  async issue({ callId, description, dueAt, rows }) {
    if (!callId?.trim()) throw new Error('Give the call a name or reference.');
    if (!Date.parse(dueAt)) throw new Error('Pick a due date and time.');
    const existing = await draw.contracts('admin', TEMPLATES.CapitalCall, session.fundId);
    if (existing.some((c) => c.payload.callId === callId.trim())) throw new Error('A call with this name already exists. Use a different name.');
    const included = rows.filter((r) => Number(r.scenarioUsd) > 0);
    if (!included.length) throw new Error('Call at least one investor.');
    const commitments = await draw.contracts('admin', TEMPLATES.InvestorCommitment, session.fundId);
    const requests = included.map(({ role, scenarioUsd, units }) => {
      const commitment = commitments.find((c) => c.payload.lp === draw.party[role]);
      if (!commitment) throw new Error(`${role} has not accepted its commitment yet.`);
      if (!(Number(units) > 0)) throw new Error('Every called investor needs a settlement amount above zero.');
      return { commitmentCid: commitment.contractId, obligationRef: newRef(), amountDue: String(units), scenarioAmount: String(scenarioUsd) };
    });
    relay.describe(`Issue capital call "${callId.trim()}" to ${requests.length} investor(s) as the fund admin`);
    const result = await draw.issueCall(session.fundCid, { callId: callId.trim(), description: description?.trim() || callId.trim(), dueAt: new Date(dueAt).toISOString(), requests });
    record('issue', { callId, dueAt, requests, updateId: result.transaction.updateId });
    return { message: `${callId.trim()} issued. Each investor now sees only its own notice.` };
  },

  async pay({ role, ref, amount }) {
    const { payload } = await ownObligation(role, ref);
    const value = String(amount ?? payload.amountDue);
    record('pay', { role, ref, amount: value });
    relay.describe(`Lock ${Number(value)} Amulet for the fund against notice ${ref}, as ${role}`);
    try {
      const allocation = await draw.allocate(role, { obligationRef: ref, amount: value });
      record('pay-locked', { role, ref, amount: value, ...allocation });
    } catch (error) {
      record('pay-failed', { role, ref, amount: value, error: error.message.slice(0, 300) });
      throw error;
    }
    return { message: `${Number(value)} Amulet locked for the fund. The fund admin settles it next.` };
  },

  async withdraw({ role, allocationCid }) {
    relay.describe(`Withdraw your locked payment back to your balance, as ${role}`);
    const result = await draw.withdraw(role, allocationCid);
    record('withdraw', { role, allocationCid, updateId: result.transaction.updateId });
    return { message: 'Payment withdrawn. The Amulet is back in your balance.' };
  },

  async faucet({ role }) {
    relay.describe(`Receive ${Number(network.tapAmount)} test Amulet from the DevNet faucet, as ${role}`);
    const updateId = await draw.tap(role, network.tapAmount);
    record('faucet', { role, updateId });
    return { message: `Added ${Number(network.tapAmount)} test Amulet.` };
  },

  async settle({ ref, allocationCid }) {
    let obligation = await adminObligation(ref);
    const stateBefore = obligation.payload.state;
    if (stateBefore === 'Issued') {
      relay.describe(`Match the payment to notice ${ref} (it stays unfunded until settled), as the fund admin`);
      await draw.markPending(obligation.contractId, allocationCid);
      obligation = await eventually(() => adminObligation(ref), (o) => o.payload.state === 'PaymentPending');
    }
    relay.describe(`Settle notice ${ref}: move the payment to the fund and mark it funded, as the fund admin`);
    const settled = await draw.settle(obligation.contractId, allocationCid);
    const updateId = settled.transaction.updateId;
    record('settle', { ref, allocationCid, updateId });

    const receipt = await draw.verifier.verify({ obligationRef: ref, claimedUpdateId: updateId });
    if (receipt.checks.find((c) => c.name === 'claimed update is a transaction')?.ok) record('observed', { ref, updateId, recordTime: receipt.recordTime });
    writeFileSync(join(appEvidenceDir(), `receipt-${ref}.json`), `${JSON.stringify({
      environment: network.name, fundId: session.fundId, callId: obligation.payload.callId, packageId: session.packageId,
      stateBefore, ...receipt, verifiedAt: new Date().toISOString(),
    }, null, 2)}\n`);
    record('verify', { ref, verdict: receipt.verdict, updateId });
    if (receipt.verdict !== 'VERIFIED_FUNDED') {
      return { message: `Settled on the ledger, but the verifier did not confirm it: ${receipt.checks.filter((c) => !c.ok).map((c) => c.name).join(', ')}` };
    }
    return { message: `Settled and independently verified. ${receipt.receivedAmount} Amulet received.` };
  },

  async overdue({ ref }) {
    relay.describe(`Mark notice ${ref} overdue, as the fund admin`);
    const result = await draw.markOverdue((await adminObligation(ref)).contractId);
    record('overdue', { ref, updateId: result.transaction.updateId });
    return { message: 'Marked overdue.' };
  },

  flag: resolution('Obligation_FlagManualReview', 'flag'),
  waive: resolution('Obligation_Waive', 'waive'),
  reopen: resolution('Obligation_Reopen', 'reopen'),
  release: resolution('Obligation_ReleasePending', 'release'),

  async reset() {
    rmSync(SESSION_FILE, { force: true });
    session = null;
    draw = null;
    return { message: 'Cleared. Start a new demo fund.' };
  },
};

// One ledger action at a time keeps clicks from racing each other. With
// browser keys an action can pause for a signature, and the queue waits for
// the action itself, not for its first reply.
let queue = Promise.resolve();
const serialized = (fn) => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
};
function relayed(fn) {
  let first;
  const started = new Promise((resolve) => { first = resolve; });
  queue = queue.then(() => {
    const handle = relay.run(fn, explain);
    handle.first.then(first);
    return handle.done;
  }).catch(() => {});
  return started;
}

// ---------------------------------------------------------------- proof
function latest(dir) {
  if (!existsSync(dir)) return null;
  const runs = readdirSync(dir).filter((d) => existsSync(join(dir, d, 'result.json'))).sort();
  if (!runs.length) return null;
  const id = runs.at(-1);
  return { id, path: relative(ROOT, join(dir, id)), result: JSON.parse(readFileSync(join(dir, id, 'result.json'), 'utf8')) };
}

function proof() {
  const base = join(EVIDENCE, NETWORK_DIR);
  const run = latest(join(base, 'runs'));
  const runFile = (name) => (run && existsSync(join(ROOT, run.path, name)) ? JSON.parse(readFileSync(join(ROOT, run.path, name), 'utf8')) : null);
  const campaign = latest(join(base, 'campaign'));
  const ablation = latest(join(base, 'ablation'));
  const core = latest(join(base, 'daml_core'));
  const mutation = latest(join(base, 'mutation'));
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
    campaign: campaign && { path: campaign.path, seed: campaign.result.seed, verdict: campaign.result.verdict, metrics: campaign.result.metrics, commit: campaign.result.commit },
    ablation: ablation && { path: ablation.path, verdict: ablation.result.verdict, comparison: ablation.result.comparison },
    damlCore: core && { path: core.path, verdict: core.result.verdict, packageId: core.result.packageId, tests: core.result.tests },
    mutation: mutation && { path: mutation.path, verdict: mutation.result.verdict, killed: mutation.result.mutants.filter((m) => m.status === 'KILLED').length, total: mutation.result.mutants.length },
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

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
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
// retried, so a bad payment cannot loop.
const autoTried = new Set();
async function autoSettleOnce() {
  if (!session) return;
  const obligations = await draw.contracts('admin', TEMPLATES.CapitalCallObligation, session.fundId);
  const payments = classifyPayments({ adminParty: draw.party.admin, obligations, allocations: await draw.allocations('admin') });
  for (const payment of payments.filter((p) => p.kind === 'match' && !autoTried.has(p.allocationCid))) {
    autoTried.add(payment.allocationCid);
    try {
      const { message } = await serialized(() => actions.settle({ ref: payment.obligationRef, allocationCid: payment.allocationCid }));
      record('auto-settle', { ref: payment.obligationRef, allocationCid: payment.allocationCid, message });
    } catch (error) {
      record('auto-settle-refused', { ref: payment.obligationRef, allocationCid: payment.allocationCid, error: error.message.slice(0, 300) });
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
    if (req.method === 'GET' && url.pathname === '/api/view') {
      const role = url.searchParams.get('role');
      if (!ROLES.includes(role)) return send(res, 400, { error: 'Unknown role.' });
      return send(res, 200, await viewFor(role));
    }
    if (req.method === 'GET' && url.pathname === '/api/proof') return send(res, 200, proof());
    const action = url.pathname.match(/^\/api\/actions\/([a-z]+)$/)?.[1];
    if (req.method === 'POST' && action && Object.hasOwn(actions, action)) {
      const body = await readBody(req);
      if (action !== 'setup' && action !== 'reset' && !session) return send(res, 409, { error: 'Start a demo fund first.' });
      if (BROWSER_KEYS) {
        const reply = await relayed(() => actions[action](body));
        return send(res, reply.status, reply.body);
      }
      try {
        return send(res, 200, await serialized(() => actions[action](body)));
      } catch (error) {
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
    if (req.method === 'GET' && !url.pathname.startsWith('/api/')) {
      if (url.pathname !== '/' && sendFile(res, WEB, url.pathname)) return;
      if (sendFile(res, WEB, 'index.html')) return;
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      return res.end('The web app is not built. Run `npm run build` in app/web.');
    }
    send(res, 404, { error: 'Not found.' });
  } catch (error) {
    send(res, 502, explain(error));
  }
}).listen(PORT, () => console.log(`DRAW on ${NETWORK_LABEL}: http://localhost:${PORT}${AUTO_SETTLE ? ' (automatic settlement on)' : ''}`));
