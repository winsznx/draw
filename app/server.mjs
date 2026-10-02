// DRAW app server. Every view is built from ledger reads made with the
// selected role's own ledger user, and every action is submitted by the role
// that takes it. FUNDED is shown only after the independent verifier issues a
// VERIFIED_FUNDED receipt for that obligation.
// Usage: node app/server.mjs   then open http://localhost:4173
import { createServer } from 'node:http';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TEMPLATES } from '../scripts/demo/lib/ledger.mjs';
import { DrawSession, LPS, eventually, newRef, packageInfo, sum } from '../scripts/demo/lib/draw.mjs';
import { ROLES, ROOT, network } from '../scripts/demo/lib/network.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 4173);
const SESSION_FILE = join(HERE, `.session-${network.name}.json`);
const NETWORK_LABEL = { localnet: 'LocalNet', devnet: 'DevNet' }[network.name] ?? network.name;
const COMMITMENTS = { lpA: '1000000.0', lpB: '700000.0', lpC: '500000.0' };

let session = existsSync(SESSION_FILE) ? JSON.parse(readFileSync(SESSION_FILE, 'utf8')) : null;
let draw = session ? await DrawSession.resume(session) : null;

const evidenceDir = () => join(ROOT, 'evidence', network.name === 'localnet' ? 'local' : network.name, 'app', session.fundId);
function record(action, detail) {
  mkdirSync(evidenceDir(), { recursive: true });
  appendFileSync(join(evidenceDir(), 'actions.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), action, ...detail })}\n`);
}
function receiptFor(obligationRef) {
  if (!session) return null;
  const file = join(evidenceDir(), `receipt-${obligationRef}.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

// Ledger rejections carry the Daml assertion text. Show that, not the envelope.
function ledgerReason(error) {
  const message = error.message ?? String(error);
  const assertion = message.match(/\(error category \d+\):\s*([^"\\]+)/);
  if (assertion) return assertion[1].trim();
  if (message.includes('CONTRACT_NOT_FOUND')) return 'the contract is no longer active on the ledger';
  if (message.includes('HTTP 403')) return 'this ledger user is not allowed to do that';
  return message.slice(0, 300);
}

// ---------------------------------------------------------------- views
function obligationStatus(payload, allocations) {
  const receipt = receiptFor(payload.obligationRef);
  if (payload.state === 'Funded') return receipt?.verdict === 'VERIFIED_FUNDED' ? 'funded' : 'unverified';
  if (payload.state === 'PaymentPending') return 'pending';
  if (payload.state === 'Overdue') return allocations.length ? 'submitted-late' : 'overdue';
  if (payload.state === 'Waived') return 'waived';
  if (payload.state === 'ManualReview') return 'review';
  return allocations.length ? 'submitted' : 'awaiting';
}

async function viewFor(role) {
  const base = { network: NETWORK_LABEL, partyMode: network.partyMode, role };
  if (!session) return { ...base, session: false };

  const { fundId } = session;
  const read = (templateId) => draw.contracts(role, templateId, fundId);
  const [funds, calls, invitations, commitments, obligations, allocations, balance] = await Promise.all([
    read(TEMPLATES.Fund), read(TEMPLATES.CapitalCall), read(TEMPLATES.CommitmentInvitation),
    read(TEMPLATES.InvestorCommitment), read(TEMPLATES.CapitalCallObligation), draw.allocations(role),
    role === 'outsider' ? Promise.resolve(null) : draw.balance(role),
  ]);

  const allocationsFor = (ref) => allocations
    .filter((a) => a.interfaceView.allocation.settlement.settlementRef.id === ref)
    .map((a) => ({ allocationCid: a.contractId, amount: Number(a.interfaceView.allocation.transferLeg.amount), from: draw.roleOf(a.interfaceView.allocation.transferLeg.sender) }));

  const rows = obligations.map(({ payload }) => {
    const own = allocationsFor(payload.obligationRef);
    const receipt = receiptFor(payload.obligationRef);
    return {
      ref: payload.obligationRef,
      investor: draw.roleOf(payload.lp),
      fundName: payload.fundName,
      callId: payload.callId,
      scenarioUsd: Number(payload.scenarioAmount),
      units: Number(payload.amountDue),
      dueAt: payload.dueAt,
      ledgerState: payload.state,
      status: obligationStatus(payload, own),
      allocations: own,
      receipt: receipt && {
        verdict: receipt.verdict,
        updateId: receipt.claimedUpdateId,
        receivedAmount: receipt.receivedAmount,
        verifiedAt: receipt.verifiedAt,
        verifierUser: receipt.verifierUser,
        checks: receipt.checks.length,
        passed: receipt.checks.filter((c) => c.ok).length,
      },
    };
  }).sort((a, b) => a.investor.localeCompare(b.investor));

  const funded = rows.filter((r) => r.status === 'funded');
  const call = calls[0]?.payload;
  return {
    ...base,
    session: true,
    queriedAs: { userId: draw.users[role], party: draw.party[role] },
    fund: funds[0] ? { fundId, name: funds[0].payload.fundName } : null,
    call: call && { callId: call.callId, description: call.description, dueAt: call.dueAt, totalUsd: Number(call.totalScenarioAmount) },
    totals: call && {
      fundedUsd: sum(funded.map((r) => r.scenarioUsd)),
      unresolvedUsd: sum(rows.filter((r) => r.status !== 'funded' && r.status !== 'waived').map((r) => r.scenarioUsd)),
      fundedUnits: sum(funded.map((r) => r.units)),
    },
    invitations: invitations.map(({ contractId, payload }) => ({ invitationCid: contractId, investor: draw.roleOf(payload.lp), fundName: payload.fundName, committedUsd: Number(payload.committedScenarioAmount) })),
    commitments: commitments.map(({ payload }) => ({ investor: draw.roleOf(payload.lp), committedUsd: Number(payload.committedScenarioAmount), calledUsd: Number(payload.calledScenarioAmount) })),
    obligations: rows,
    balance,
  };
}

// ---------------------------------------------------------------- actions
async function obligationByRef(ref) {
  const [obligation] = (await draw.contracts('admin', TEMPLATES.CapitalCallObligation, session.fundId)).filter((o) => o.payload.obligationRef === ref);
  if (!obligation) throw new Error('obligation not found for the admin');
  return obligation;
}

async function lpObligation(role) {
  const [obligation] = await draw.contracts(role, TEMPLATES.CapitalCallObligation, session.fundId);
  if (!obligation) throw new Error('no capital call obligation is visible to this investor');
  return obligation;
}

const actions = {
  async setup({ fundName = 'Example Ventures I' }) {
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

  async accept({ role }) {
    const [invitation] = await draw.contracts(role, TEMPLATES.CommitmentInvitation, session.fundId);
    if (!invitation) throw new Error('there is no invitation for this investor');
    const result = await draw.acceptInvitation(role, invitation.contractId);
    record('accept', { role, updateId: result.transaction.updateId });
    return { message: 'Commitment accepted.' };
  },

  async issue({ dueMinutes = 3, rows }) {
    const commitments = await draw.contracts('admin', TEMPLATES.InvestorCommitment, session.fundId);
    const requests = rows.map(({ role, scenarioUsd, units }) => {
      const commitment = commitments.find((c) => c.payload.lp === draw.party[role]);
      if (!commitment) throw new Error(`${role} has not accepted its commitment yet`);
      return { commitmentCid: commitment.contractId, obligationRef: newRef(), amountDue: String(units), scenarioAmount: String(scenarioUsd) };
    });
    const dueAt = new Date(Date.now() + Number(dueMinutes) * 60_000).toISOString();
    const result = await draw.issueCall(session.fundCid, { callId: 'CALL-1', description: 'Initial close drawdown', dueAt, requests });
    record('issue', { dueAt, requests, updateId: result.transaction.updateId });
    return { message: 'Capital call issued. Each investor now sees only its own notice.' };
  },

  async pay({ role, amount }) {
    const { payload } = await lpObligation(role);
    const value = String(amount ?? payload.amountDue);
    const allocation = await draw.allocate(role, { obligationRef: payload.obligationRef, amount: value });
    record('pay', { role, ref: payload.obligationRef, amount: value, ...allocation });
    return { message: `Payment of ${Number(value)} Amulet locked for the fund. The admin can now settle it.` };
  },

  async withdraw({ role, allocationCid }) {
    const result = await draw.withdraw(role, allocationCid);
    record('withdraw', { role, allocationCid, updateId: result.transaction.updateId });
    return { message: 'Payment withdrawn. The Amulet is back in your balance.' };
  },

  async faucet({ role }) {
    const updateId = await draw.tap(role, network.tapAmount);
    record('faucet', { role, updateId });
    return { message: `Added ${Number(network.tapAmount)} test Amulet.` };
  },

  async settle({ ref, allocationCid }) {
    let obligation = await obligationByRef(ref);
    if (obligation.payload.state === 'Issued') {
      await draw.markPending(obligation.contractId, allocationCid);
      obligation = await eventually(() => obligationByRef(ref), (o) => o.payload.state === 'PaymentPending');
    }
    const settled = await draw.settle(obligation.contractId, allocationCid);
    const updateId = settled.transaction.updateId;
    record('settle', { ref, allocationCid, updateId });

    const receipt = await draw.verifier.verify({ obligationRef: ref, claimedUpdateId: updateId });
    writeFileSync(join(evidenceDir(), `receipt-${ref}.json`), `${JSON.stringify({
      environment: network.name, fundId: session.fundId, packageId: session.packageId, ...receipt, verifiedAt: new Date().toISOString(),
    }, null, 2)}\n`);
    record('verify', { ref, verdict: receipt.verdict });
    if (receipt.verdict !== 'VERIFIED_FUNDED') {
      return { message: `Settled on the ledger, but the verifier did not confirm it: ${receipt.checks.filter((c) => !c.ok).map((c) => c.name).join(', ')}` };
    }
    return { message: `Settled and independently verified. ${receipt.receivedAmount} Amulet received.` };
  },

  async overdue({ ref }) {
    const obligation = await obligationByRef(ref);
    const result = await draw.markOverdue(obligation.contractId);
    record('overdue', { ref, updateId: result.transaction.updateId });
    return { message: 'Marked overdue.' };
  },

  async reset() {
    rmSync(SESSION_FILE, { force: true });
    session = null;
    draw = null;
    return { message: 'Cleared. Start a new demo fund.' };
  },
};

// One ledger action at a time keeps demo clicks from racing each other.
let queue = Promise.resolve();
const serialized = (fn) => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
};

// ---------------------------------------------------------------- http
const page = () => readFileSync(join(HERE, 'index.html'), 'utf8').replaceAll('__NETWORK__', NETWORK_LABEL);

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(page());
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/view') {
      const role = url.searchParams.get('role');
      if (!ROLES.includes(role)) return send(res, 400, { error: 'unknown role' });
      return send(res, 200, await viewFor(role));
    }
    const action = url.pathname.match(/^\/api\/actions\/([a-z]+)$/)?.[1];
    if (req.method === 'POST' && Object.hasOwn(actions, action)) {
      const body = await readBody(req);
      if (action !== 'setup' && action !== 'reset' && !session) return send(res, 409, { error: 'Start a demo fund first.' });
      try {
        return send(res, 200, await serialized(() => actions[action](body)));
      } catch (error) {
        return send(res, 422, { error: ledgerReason(error) });
      }
    }
    res.writeHead(404).end();
  } catch (error) {
    send(res, 502, { error: ledgerReason(error) });
  }
}).listen(PORT, () => console.log(`DRAW on ${NETWORK_LABEL}: http://localhost:${PORT}`));
