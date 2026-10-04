// Canonical run: one fund, one call, three private obligations, real Amulet
// allocations, independent verification, one unpaid LP, admin totals. Every
// check result is computed here from ledger reads and written to
// evidence/<network>/runs/<runId>/. Nothing there is edited by hand.
// The network comes from DRAW_NETWORK and `.env` (see lib/network.mjs).
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { TEMPLATES, transactionEvents } from './lib/ledger.mjs';
import { DrawSession, LPS, eventually, newRef, packageInfo, sleep, sum } from './lib/draw.mjs';
import { ROLES, ROOT, network } from './lib/network.mjs';

const DUE_SECONDS = Number(process.env.DRAW_DUE_SECONDS ?? 90);

const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const runTag = runId.toLowerCase().replace(/[^a-z0-9]/g, '');
const OUT = join(network.evidenceDir, runId);
mkdirSync(OUT, { recursive: true });

const checks = [];
function check(id, ok, detail) {
  checks.push({ id, ok: Boolean(ok), detail });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}`);
  appendFileSync(join(OUT, 'steps.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), check: id, ok: Boolean(ok), detail })}\n`);
  return Boolean(ok);
}
function step(name, detail) {
  console.log(`--   ${name}`);
  appendFileSync(join(OUT, 'steps.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), step: name, detail })}\n`);
}
const writeJson = (file, value) => writeFileSync(join(OUT, file), `${JSON.stringify(value, null, 2)}\n`);

async function expectRejection(id, action, expectedFragment) {
  try {
    const result = await action();
    return check(id, false, { unexpectedSuccess: result?.transaction?.updateId ?? true });
  } catch (error) {
    const message = error.message ?? String(error);
    // A shared node may answer with only a trace id. That is still a refusal,
    // but the reason is unknown and the evidence says so.
    const reasonHidden = network.errorsMayBeHidden && !message.includes(expectedFragment ?? '')
      && /inquire about the request|with tid [0-9a-f]{16,}/i.test(message);
    const ok = expectedFragment ? message.includes(expectedFragment) || reasonHidden : true;
    return check(id, ok, { rejected: message.slice(0, 600), ...(reasonHidden ? { reasonHidden: true, expectedReason: expectedFragment } : {}) });
  }
}

const skipped = [];
function skip(id, reason) {
  skipped.push({ id, reason });
  step(`skipped: ${id}`, { reason });
}

// ---------------------------------------------------------------- setup
const { packageId, darSha256 } = packageInfo();
const draw = await DrawSession.open({ tag: runTag, packageId, onStep: step });
const { party, client, users, instrument, verifier } = draw;
// Each participant numbers its own offsets, so each reader remembers where it started.
const streamStart = Object.fromEntries(await Promise.all(ROLES.map(async (role) => [role, await client[role].ledgerEnd()])));
step('party-scoped users ready', { network: network.name, partyMode: network.partyMode, party, users, verifierRights: 'readAs admin only' });

if (network.singleCredential) {
  const reason = 'one shared login acts for every party on this node, so credential separation cannot be tested here';
  skip('credential: lpA token cannot read as lpB', reason);
  skip('credential: verifier token cannot submit as admin', reason);
} else {
  await expectRejection('credential: lpA token cannot read as lpB',
    () => client.lpA.activeContracts(party.lpB, { templateId: TEMPLATES.CapitalCallObligation }), 'HTTP 403');
  await expectRejection('credential: verifier token cannot submit as admin',
    () => verifier.client.create({ actAs: [party.admin], templateId: TEMPLATES.Fund, argument: { admin: party.admin, fundId: 'X', fundName: 'X' } }),
    'HTTP 403');
}

// ---------------------------------------------------------------- faucet
for (const role of LPS) {
  const updateId = await draw.tap(role, network.tapAmount);
  step(`${role} tapped ${network.tapAmount} Amulet through AmuletRules_DevNet_Tap`, { updateId });
}
const balances = async () => Object.fromEntries(await Promise.all(['admin', ...LPS].map(async (r) => [r, await draw.balance(r)])));
const balancesBefore = await balances();
step('unlocked Amulet balances before', balancesBefore);

// ---------------------------------------------------------------- fund and call
const fundId = `FUND-${runTag}`;
const fundCid = await draw.createFund({ fundId, fundName: 'Example Ventures I (demo)' });

const commitments = { lpA: '1000000.0', lpB: '700000.0', lpC: '500000.0' };
for (const [role, committed] of Object.entries(commitments)) {
  await draw.invite(fundCid, role, committed);
  const [invitation] = await eventually(() => draw.contracts(role, TEMPLATES.CommitmentInvitation, fundId), (l) => l.length === 1);
  await draw.acceptInvitation(role, invitation.contractId);
}
const adminCommitments = await eventually(() => draw.contracts('admin', TEMPLATES.InvestorCommitment, fundId), (l) => l.length === 3);
const commitmentOf = (role) => adminCommitments.find((c) => c.payload.lp === party[role]).contractId;
step('fund created, three commitments accepted by each LP with its own credential', { fundId, commitments });

const ref = Object.fromEntries(LPS.map((role) => [role, newRef()]));
const runRefs = new Set(Object.values(ref));
const plan = {
  lpA: { amountDue: '40.0', scenarioAmount: '400000.0' },
  lpB: { amountDue: '35.0', scenarioAmount: '350000.0' },
  lpC: { amountDue: '25.0', scenarioAmount: '250000.0' },
};
const dueAt = new Date(Date.now() + DUE_SECONDS * 1000).toISOString();
const issue = await draw.issueCall(fundCid, {
  callId: 'CALL-1',
  description: 'Initial close drawdown',
  dueAt,
  requests: LPS.map((role) => ({ commitmentCid: commitmentOf(role), obligationRef: ref[role], ...plan[role] })),
});
step('capital call issued by admin', { updateId: issue.transaction.updateId, dueAt, ref, plan });

async function obligationFor(role, reader = 'admin', expectedState) {
  return eventually(
    async () => (await draw.contracts(reader, TEMPLATES.CapitalCallObligation)).find((o) => o.payload.obligationRef === ref[role]),
    (o) => o && (!expectedState || o.payload.state === expectedState),
  );
}

// ---------------------------------------------------------------- visibility
// The matrix shows this run's contracts. The leak check looks at everything the
// reader can see, from any run, and requires every DRAW contract to involve it.
async function visibilityMatrix(label) {
  const matrix = {};
  const leaks = {};
  for (const reader of ROLES) {
    const row = {};
    leaks[reader] = [];
    for (const [name, templateId] of Object.entries(TEMPLATES)) {
      const everything = await draw.contracts(reader, templateId);
      leaks[reader].push(...everything
        .filter((c) => c.payload.admin !== party[reader] && c.payload.lp !== party[reader])
        .map((c) => `${name}:${c.contractId}`));
      row[name] = everything.filter((c) => c.payload.fundId === fundId).map((c) => {
        const lpRole = draw.roleOf(c.payload.lp);
        return name === 'CapitalCallObligation' ? `obligation:${lpRole}` : name === 'InvestorCommitment' ? `commitment:${lpRole}` : name;
      }).sort();
    }
    const allocations = (await draw.allocations(reader)).filter((a) => {
      const { settlement, transferLeg } = a.interfaceView.allocation;
      if (![settlement.executor, transferLeg.sender, transferLeg.receiver].includes(party[reader])) leaks[reader].push(`Allocation:${a.contractId}`);
      return runRefs.has(settlement.settlementRef.id);
    });
    row.Allocation = allocations.map((a) => `allocation:${draw.roleOf(a.interfaceView.allocation.transferLeg.sender) ?? 'other'}`).sort();
    matrix[reader] = row;
  }
  writeJson(`visibility-${label}.json`, { matrix, leaks });
  return { matrix, leaks };
}

function assertMatrix(label, { matrix, leaks }) {
  for (const reader of ROLES) {
    check(`privacy[${label}]: ${reader} sees no DRAW or allocation contract it is not party to, from any run`, leaks[reader].length === 0, leaks[reader]);
  }
  const obligations = (reader) => matrix[reader].CapitalCallObligation;
  check(`privacy[${label}]: admin sees all three obligations`,
    JSON.stringify(obligations('admin')) === JSON.stringify(['obligation:lpA', 'obligation:lpB', 'obligation:lpC']), obligations('admin'));
  for (const lp of LPS) {
    check(`privacy[${label}]: ${lp} sees only its own obligation`, JSON.stringify(obligations(lp)) === JSON.stringify([`obligation:${lp}`]), obligations(lp));
    check(`privacy[${label}]: ${lp} sees only its own commitment`,
      JSON.stringify(matrix[lp].InvestorCommitment) === JSON.stringify([`commitment:${lp}`]), matrix[lp].InvestorCommitment);
    check(`privacy[${label}]: ${lp} sees no Fund or CapitalCall`, matrix[lp].Fund.length === 0 && matrix[lp].CapitalCall.length === 0);
    check(`privacy[${label}]: ${lp} sees no other LP's allocation`, matrix[lp].Allocation.every((a) => a === `allocation:${lp}`), matrix[lp].Allocation);
  }
  check(`privacy[${label}]: outsider sees nothing`, Object.values(matrix.outsider).every((v) => v.length === 0), matrix.outsider);
}

// Checked right after issue, while the due time is certainly still ahead.
await expectRejection('deadline: overdue refused before due time',
  async () => draw.markOverdue((await obligationFor('lpC')).contractId), 'obligation is not yet due');

for (const role of LPS) await obligationFor(role, role);
assertMatrix('after-issue', await visibilityMatrix('after-issue'));

const obligationB0 = await obligationFor('lpB');
await expectRejection('privacy: lpA cannot fetch lpB obligation by contract id',
  () => client.lpA.eventsByContractId(party.lpA, obligationB0.contractId), 'CONTRACT_EVENTS_NOT_FOUND');
await expectRejection('authority: lpA cannot exercise on lpB obligation',
  () => client.lpA.exercise({ actAs: [party.lpA], templateId: TEMPLATES.CapitalCallObligation, contractId: obligationB0.contractId,
    choice: 'Obligation_FlagManualReview', argument: { note: 'meddle' } }), 'CONTRACT_NOT_FOUND');
const obligationA0 = await obligationFor('lpA', 'lpA');
await expectRejection('authority: lpA cannot change its own obligation state',
  () => client.lpA.exercise({ actAs: [party.lpA], templateId: TEMPLATES.CapitalCallObligation, contractId: obligationA0.contractId,
    choice: 'Obligation_FlagManualReview', argument: { note: 'self' } }), 'DAML_AUTHORIZATION_ERROR');

// ---------------------------------------------------------------- settlement helpers
async function allocate(role, { obligationRef, amount }) {
  const allocation = await draw.allocate(role, { obligationRef, amount });
  step(`${role} allocated ${amount} Amulet for ${obligationRef}`, allocation);
  return allocation;
}

// The admin finds the allocation in its own ACS. It does not take the LP's word for it.
async function adminObservedAllocation(allocationCid) {
  const visible = await eventually(() => draw.allocations('admin'), (l) => l.some((a) => a.contractId === allocationCid));
  return visible.find((a) => a.contractId === allocationCid);
}

const settle = async (role, allocationCid) => draw.settle((await obligationFor(role)).contractId, allocationCid);

const receipts = {};
async function settleAndVerify(role) {
  const allocation = await allocate(role, { obligationRef: ref[role], amount: plan[role].amountDue });
  const observed = await adminObservedAllocation(allocation.allocationCid);
  check(`settlement[${role}]: admin observes allocation in its own ACS`, observed, observed?.interfaceView?.allocation?.settlement?.settlementRef);

  const pending = await draw.markPending((await obligationFor(role)).contractId, allocation.allocationCid);
  const pendingState = (await obligationFor(role, role, 'PaymentPending'))?.payload?.state;
  check(`settlement[${role}]: obligation is PaymentPending, not Funded, before execution`, pendingState === 'PaymentPending',
    { state: pendingState, updateId: pending.transaction.updateId });

  const settled = await settle(role, allocation.allocationCid);
  step(`admin executed Obligation_Settle for ${role}`, { updateId: settled.transaction.updateId });

  const receipt = await verifier.verify({ obligationRef: ref[role], claimedUpdateId: settled.transaction.updateId });
  receipts[role] = {
    environment: network.name,
    fundId, callId: 'CALL-1', packageId,
    payer: party[role],
    expected: { amount: plan[role].amountDue, instrument, scenarioAmountUsd: plan[role].scenarioAmount },
    allocationRequestUpdateId: allocation.updateId,
    stateBefore: pendingState,
    stateAfter: (await obligationFor(role, role, 'Funded'))?.payload?.state,
    ...receipt,
    verifiedAt: new Date().toISOString(),
    commit: execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD']).toString().trim(),
  };
  writeJson(`receipt-${role}.json`, receipts[role]);
  check(`settlement[${role}]: independent verifier returns VERIFIED_FUNDED`, receipt.verdict === 'VERIFIED_FUNDED',
    receipt.checks.filter((c) => !c.ok));
  check(`settlement[${role}]: LP sees its own obligation as Funded`, receipts[role].stateAfter === 'Funded', receipts[role].stateAfter);
  return { allocation, settled };
}

// ---------------------------------------------------------------- LP A pays
const { allocation: allocationA, settled: settledA } = await settleAndVerify('lpA');

// ---------------------------------------------------------------- negative cases on LP B
const wrongAmount = await allocate('lpB', { obligationRef: ref.lpB, amount: '30.0' });
await expectRejection('negative: wrong amount does not fund', () => settle('lpB', wrongAmount.allocationCid),
  'allocation amount does not equal amount due');

const wrongParty = await allocate('lpC', { obligationRef: ref.lpB, amount: plan.lpB.amountDue });
await expectRejection('negative: wrong payer does not fund', () => settle('lpB', wrongParty.allocationCid),
  'allocation sender is not the obligated LP');

const strayRef = newRef();
runRefs.add(strayRef);
const wrongRef = await allocate('lpB', { obligationRef: strayRef, amount: plan.lpB.amountDue });
await expectRejection('negative: wrong reference does not fund', () => settle('lpB', wrongRef.allocationCid),
  'allocation settlement reference does not match obligation');

await expectRejection('negative: replayed allocation from lpA does not fund lpB', () => settle('lpB', allocationA.allocationCid),
  `Contract could not be found with id ${allocationA.allocationCid}`);
await expectRejection('negative: replayed allocation does not fund lpA twice', () => settle('lpA', allocationA.allocationCid),
  'obligation is not open for settlement');

const replayReceipt = await verifier.verify({ obligationRef: ref.lpB, claimedUpdateId: settledA.transaction.updateId });
writeJson('receipt-replay-attempt-lpB.json', replayReceipt);
check('negative: verifier rejects lpA settlement evidence offered for lpB', replayReceipt.verdict !== 'VERIFIED_FUNDED',
  replayReceipt.checks.filter((c) => !c.ok).map((c) => c.name));

const stateB = (await obligationFor('lpB', 'lpB')).payload.state;
check('negative: lpB still unfunded after every bad attempt', stateB === 'Issued', stateB);

for (const [role, rejected] of [['lpB', wrongAmount], ['lpC', wrongParty], ['lpB', wrongRef]]) {
  const result = await draw.withdraw(role, rejected.allocationCid);
  step(`${role} withdrew rejected allocation`, { allocationCid: rejected.allocationCid, updateId: result.transaction.updateId });
}
const lockedAfterWithdraw = (await draw.allocations('admin')).filter((a) => runRefs.has(a.interfaceView.allocation.settlement.settlementRef.id));
check('negative: rejected allocations withdrawn, none left for admin to execute', lockedAfterWithdraw.length === 0,
  lockedAfterWithdraw.map((a) => a.contractId));

// ---------------------------------------------------------------- LP B pays correctly
await settleAndVerify('lpB');

// ---------------------------------------------------------------- LP C never pays
const waitMs = Date.parse(dueAt) - Date.now() + 5_000;
if (waitMs > 0) {
  step(`waiting ${Math.ceil(waitMs / 1000)}s for the due time to pass`, { dueAt });
  await sleep(waitMs);
}
const overdue = await draw.markOverdue((await obligationFor('lpC')).contractId);
const stateC = (await obligationFor('lpC', 'lpC', 'Overdue'))?.payload?.state;
check('unpaid: lpC obligation is Overdue after the due time, not Funded', stateC === 'Overdue', { state: stateC, updateId: overdue.transaction.updateId });

// ---------------------------------------------------------------- admin totals
const adminObligations = await draw.contracts('admin', TEMPLATES.CapitalCallObligation, fundId);
const verifiedRefs = new Set(Object.values(receipts).filter((r) => r.verdict === 'VERIFIED_FUNDED').map((r) => r.obligationRef));
const fundedDisplay = adminObligations.filter((o) => o.payload.state === 'Funded' && verifiedRefs.has(o.payload.obligationRef));
const unresolved = adminObligations.filter((o) => !fundedDisplay.includes(o) && o.payload.state !== 'Waived');
const [call] = await draw.contracts('admin', TEMPLATES.CapitalCall, fundId);
const balancesAfter = await balances();
const totals = {
  fundedScenarioUsd: sum(fundedDisplay.map((o) => o.payload.scenarioAmount)),
  unresolvedScenarioUsd: sum(unresolved.map((o) => o.payload.scenarioAmount)),
  callTotalScenarioUsd: Number(call.payload.totalScenarioAmount),
  fundedUnits: sum(fundedDisplay.map((o) => o.payload.amountDue)),
  adminAmuletReceived: balancesAfter.admin - balancesBefore.admin,
  verifiedReceiptUnits: sum(Object.values(receipts).map((r) => r.receivedAmount)),
  byObligation: adminObligations.map((o) => ({
    lp: draw.roleOf(o.payload.lp),
    state: o.payload.state,
    evidence: verifiedRefs.has(o.payload.obligationRef) ? 'VERIFIED_FUNDED' : 'NONE',
    scenarioUsd: Number(o.payload.scenarioAmount),
    units: Number(o.payload.amountDue),
  })),
  balancesBefore,
  balancesAfter,
};
writeJson('totals.json', totals);
check('totals: funded is 750,000 USD scenario', totals.fundedScenarioUsd === 750000, totals.fundedScenarioUsd);
check('totals: unresolved is 250,000 USD scenario', totals.unresolvedScenarioUsd === 250000, totals.unresolvedScenarioUsd);
check('totals: funded + unresolved equals the call total', totals.fundedScenarioUsd + totals.unresolvedScenarioUsd === totals.callTotalScenarioUsd);
check('totals: funded units equal verified receipt units', totals.fundedUnits === totals.verifiedReceiptUnits, totals);
for (const role of LPS) {
  const paid = fundedDisplay.some((o) => o.payload.lp === party[role]) ? Number(plan[role].amountDue) : 0;
  const delta = balancesBefore[role] - balancesAfter[role];
  check(`totals: ${role} unlocked balance fell by exactly what it settled (${paid})`, Math.abs(delta - paid) < 1e-9, { delta, paid });
}
check('totals: admin Amulet balance grew by exactly the funded units', Math.abs(totals.adminAmuletReceived - totals.fundedUnits) < 1e-9,
  { received: totals.adminAmuletReceived, funded: totals.fundedUnits });

assertMatrix('final', await visibilityMatrix('final'));

// ---------------------------------------------------------------- transaction streams
// The ACS shows only contracts a party is a stakeholder on. This reads every
// transaction each party received during the run, including events it only
// witnessed, and flags any DRAW or payment event that does not involve it.
const DRAW_TEMPLATES = new Set(Object.values(TEMPLATES).map((t) => t.split(':').slice(-2).join(':')));
const streams = {};
for (const reader of ROLES) {
  const transactions = await client[reader].transactions(party[reader], streamStart[reader], await client[reader].ledgerEnd());
  const created = new Map();
  const foreign = [];
  let events = 0;
  for (const event of transactions.flatMap((t) => transactionEvents(t))) {
    events += 1;
    const name = event.templateId.split(':').slice(-2).join(':');
    if (event.kind === 'created') created.set(event.contractId, event.createArgument);
    const args = event.createArgument ?? created.get(event.contractId);
    if (DRAW_TEMPLATES.has(name)) {
      const involved = args ? [args.admin, args.lp].includes(party[reader]) : false;
      if (!involved) foreign.push(`${event.kind} ${name} ${event.contractId}`);
    }
    const leg = args?.allocation?.transferLeg ?? args?.transferLeg;
    if (leg && ![leg.sender, leg.receiver, args.allocation?.settlement?.executor].includes(party[reader])) foreign.push(`${event.kind} ${name} ${event.contractId}`);
  }
  streams[reader] = { transactions: transactions.length, events, foreign };
  check(`privacy[stream]: ${reader} received no transaction event about another party's fund records or payments`, foreign.length === 0,
    { transactions: transactions.length, events, foreign: foreign.slice(0, 10) });
}
writeJson('streams.json', streams);

// ---------------------------------------------------------------- verdicts
const group = (prefix) => checks.filter((c) => prefix.some((p) => c.id.startsWith(p)));
const verdict = (list) => (list.length > 0 && list.every((c) => c.ok) ? 'PASS' : 'FAIL');
const result = {
  runId,
  environment: network.name,
  authMode: network.authMode,
  partyMode: network.partyMode,
  credentialSeparation: network.singleCredential ? 'NOT_TESTED_SINGLE_CREDENTIAL' : 'TESTED',
  reasonsHidden: checks.filter((c) => c.detail?.reasonHidden).map((c) => c.id),
  skipped,
  canton: (await client.admin.request('GET', '/v2/version')).version,
  commit: execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD']).toString().trim(),
  uncommittedFiles: execFileSync('git', ['-C', ROOT, 'status', '--porcelain', '--', '.', ':!evidence']).toString().split('\n').filter(Boolean).length,
  packageId,
  darSha256,
  instrument,
  parties: party,
  fundId,
  users,
  participants: Object.fromEntries(ROLES.map((role) => [role, network.participantLabel(role)])),
  verifierUser: users.verifier,
  gates: {
    [network.name === 'localnet' ? 'LOCAL_SETTLEMENT' : 'DEVNET_E2E']: verdict(group(['settlement', 'negative', 'unpaid', 'deadline', 'totals'])),
    PRIVACY_CAMPAIGN: verdict(group(['privacy', 'authority', 'credential'])),
  },
  passed: checks.filter((c) => c.ok).length,
  failed: checks.filter((c) => !c.ok).map((c) => c.id),
  checks,
};
writeJson('result.json', result);
console.log(JSON.stringify({ runId, gates: result.gates, passed: result.passed, failed: result.failed }, null, 2));
process.exitCode = result.failed.length === 0 ? 0 : 1;
