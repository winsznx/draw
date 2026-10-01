// Canonical LocalNet run: one fund, one call, three private obligations, real
// Amulet allocations, independent verification, one unpaid LP, admin totals.
// Every check result is computed here from ledger reads and written to
// evidence/local/runs/<runId>/. Nothing in that directory is edited by hand.
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LedgerClient, TEMPLATES, INTERFACES, transactionEvents, templateName } from './lib/ledger.mjs';
import { allocationFactory, amuletInstrument, executeTransferContext, tapContext, withdrawContext } from './lib/registry.mjs';
import { SettlementVerifier } from './lib/verifier.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DAR = join(ROOT, 'contracts/daml/.daml/dist/draw-0.1.0.dar');
const PROVIDER_API = process.env.APP_PROVIDER_JSON_API ?? 'http://localhost:3975';
const USER_API = process.env.APP_USER_JSON_API ?? 'http://localhost:2975';
const OPERATOR_USER = 'ledger-api-user';
const DUE_SECONDS = Number(process.env.DRAW_DUE_SECONDS ?? 90);
const TAP_AMOUNT = '100.0';

const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const runTag = runId.toLowerCase().replace(/[^a-z0-9]/g, '');
const OUT = join(ROOT, 'evidence/local/runs', runId);
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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sum = (values) => values.reduce((a, b) => a + Number(b), 0);

// Admin and LPs sit on different participants, so a read right after another
// party's commit can briefly lag. Retries a read until `accept` holds.
async function eventually(read, accept = Boolean, attempts = 30) {
  let value;
  for (let i = 0; i < attempts; i += 1) {
    value = await read();
    if (accept(value)) return value;
    await sleep(500);
  }
  return value;
}

async function expectRejection(id, action, expectedFragment) {
  try {
    const result = await action();
    return check(id, false, { unexpectedSuccess: result?.transaction?.updateId ?? true });
  } catch (error) {
    const message = error.message ?? String(error);
    const ok = expectedFragment ? message.includes(expectedFragment) : true;
    return check(id, ok, { rejected: message.slice(0, 600) });
  }
}

// ---------------------------------------------------------------- setup
const operatorProvider = new LedgerClient({ baseUrl: PROVIDER_API, userId: OPERATOR_USER, label: 'operator@app-provider' });
const operatorUser = new LedgerClient({ baseUrl: USER_API, userId: OPERATOR_USER, label: 'operator@app-user' });

const packageId = JSON.parse(execFileSync(join(process.env.HOME, '.dpm/bin/dpm'), ['damlc', 'inspect-dar', '--json', DAR], {
  env: { ...process.env, JAVA_HOME: process.env.JAVA_HOME ?? '/opt/homebrew/opt/openjdk@21' },
  stdio: ['ignore', 'pipe', 'ignore'],
}).toString()).main_package_id;
const darSha256 = createHash('sha256').update(readFileSync(DAR)).digest('hex');

await operatorProvider.uploadDar(DAR);
await operatorUser.uploadDar(DAR);
step('dar uploaded to app-provider and app-user participants', { packageId, darSha256 });

const roles = [
  { role: 'admin', api: PROVIDER_API, operator: operatorProvider },
  { role: 'lpA', api: USER_API, operator: operatorUser },
  { role: 'lpB', api: USER_API, operator: operatorUser },
  { role: 'lpC', api: USER_API, operator: operatorUser },
  { role: 'outsider', api: USER_API, operator: operatorUser },
];
const party = {};
const client = {};
for (const { role, api, operator } of roles) {
  party[role] = await operator.allocateParty(`draw-${role}-${runTag}`);
  const userId = `draw-${role}-${runTag}`;
  await operator.createUser(userId, { actAs: [party[role]], readAs: [party[role]] });
  client[role] = new LedgerClient({ baseUrl: api, userId, label: role });
}
const verifierUserId = `draw-verifier-${runTag}`;
await operatorProvider.createUser(verifierUserId, { readAs: [party.admin] });
step('parties and party-scoped users created', { party, verifierUser: verifierUserId, verifierRights: 'readAs admin only' });

const instrument = await amuletInstrument();
const verifier = new SettlementVerifier({ baseUrl: PROVIDER_API, userId: verifierUserId, adminParty: party.admin, instrument });

// Credentials are scoped: LP A's token cannot read or act as LP B.
await expectRejection('credential: lpA token cannot read as lpB',
  () => client.lpA.activeContracts(party.lpB, { templateId: TEMPLATES.CapitalCallObligation }), 'HTTP 403');
await expectRejection('credential: verifier token cannot submit as admin',
  () => verifier.client.create({ actAs: [party.admin], templateId: TEMPLATES.Fund, argument: { admin: party.admin, fundId: 'X', fundName: 'X' } }),
  'HTTP 403');

// ---------------------------------------------------------------- faucet
const tap = await tapContext();
for (const role of ['lpA', 'lpB', 'lpC']) {
  const result = await client[role].exercise({
    actAs: [party[role]],
    templateId: tap.amuletRules.templateId,
    contractId: tap.amuletRules.contractId,
    choice: 'AmuletRules_DevNet_Tap',
    argument: { receiver: party[role], amount: TAP_AMOUNT, openRound: tap.openRound.contractId },
    disclosedContracts: [tap.amuletRules, tap.openRound],
    synchronizerId: tap.synchronizerId,
  });
  step(`${role} tapped ${TAP_AMOUNT} Amulet through AmuletRules_DevNet_Tap`, { updateId: result.transaction.updateId });
}

async function amuletBalance(role) {
  const holdings = await client[role].activeContracts(party[role], { interfaceId: INTERFACES.Holding });
  return sum(holdings
    .filter((h) => h.interfaceView.owner === party[role] && h.interfaceView.instrumentId.id === instrument.id && !h.interfaceView.lock)
    .map((h) => h.interfaceView.amount));
}
const balancesBefore = Object.fromEntries(await Promise.all(['admin', 'lpA', 'lpB', 'lpC'].map(async (r) => [r, await amuletBalance(r)])));
step('unlocked Amulet balances before', balancesBefore);

// ---------------------------------------------------------------- fund and call
const fundId = `FUND-${runTag}`;
const fundName = 'Example Ventures I (demo)';
const fundCreate = await client.admin.create({ actAs: [party.admin], templateId: TEMPLATES.Fund, argument: { admin: party.admin, fundId, fundName } });
const fundCid = transactionEvents(fundCreate.transaction).find((e) => e.kind === 'created').contractId;

const commitments = { lpA: '1000000.0', lpB: '700000.0', lpC: '500000.0' };
for (const [role, committed] of Object.entries(commitments)) {
  await client.admin.exercise({
    actAs: [party.admin], templateId: TEMPLATES.Fund, contractId: fundCid, choice: 'Fund_InviteInvestor',
    argument: { lp: party[role], committedScenarioAmount: committed, instrumentId: instrument },
  });
  const [invitation] = await eventually(() => client[role].activeContracts(party[role], { templateId: TEMPLATES.CommitmentInvitation }), (l) => l.length === 1);
  await client[role].exercise({
    actAs: [party[role]], templateId: TEMPLATES.CommitmentInvitation, contractId: invitation.contractId, choice: 'Invitation_Accept', argument: {},
  });
}
const adminCommitments = await eventually(() => client.admin.activeContracts(party.admin, { templateId: TEMPLATES.InvestorCommitment }), (l) => l.length === 3);
const commitmentOf = (role) => adminCommitments.find((c) => c.payload.lp === party[role]).contractId;
step('fund created, three commitments accepted by each LP with its own credential', { fundId, commitments });

// References are opaque so the token registry's view of an allocation does not name the LP.
const ref = Object.fromEntries(['lpA', 'lpB', 'lpC'].map((role) => [role, `DRAW-${randomBytes(8).toString('hex')}`]));
const plan = {
  lpA: { amountDue: '40.0', scenarioAmount: '400000.0' },
  lpB: { amountDue: '35.0', scenarioAmount: '350000.0' },
  lpC: { amountDue: '25.0', scenarioAmount: '250000.0' },
};
const dueAt = new Date(Date.now() + DUE_SECONDS * 1000).toISOString();
const issue = await client.admin.exercise({
  actAs: [party.admin], templateId: TEMPLATES.Fund, contractId: fundCid, choice: 'Fund_IssueCall',
  argument: {
    callId: 'CALL-1',
    description: 'Initial close drawdown',
    dueAt,
    requests: ['lpA', 'lpB', 'lpC'].map((role) => ({
      commitmentCid: commitmentOf(role), obligationRef: ref[role], ...plan[role],
    })),
  },
});
step('capital call issued by admin', { updateId: issue.transaction.updateId, dueAt, ref, plan });

async function obligationFor(role, reader = 'admin', expectedState) {
  return eventually(async () => {
    const all = await client[reader].activeContracts(party[reader], { templateId: TEMPLATES.CapitalCallObligation });
    return all.find((o) => o.payload.obligationRef === ref[role]);
  }, (o) => o && (!expectedState || o.payload.state === expectedState));
}

// ---------------------------------------------------------------- visibility
async function visibilityMatrix(label) {
  const matrix = {};
  for (const reader of ['admin', 'lpA', 'lpB', 'lpC', 'outsider']) {
    const row = {};
    for (const [name, templateId] of Object.entries(TEMPLATES)) {
      const contracts = await client[reader].activeContracts(party[reader], { templateId });
      row[name] = contracts.map((c) => {
        const lpRole = Object.keys(party).find((r) => party[r] === c.payload.lp);
        return name === 'CapitalCallObligation' ? `obligation:${lpRole}` : name === 'InvestorCommitment' ? `commitment:${lpRole}` : name;
      }).sort();
    }
    const allocations = await client[reader].activeContracts(party[reader], { interfaceId: INTERFACES.Allocation });
    row.Allocation = allocations.map((a) => {
      const sender = a.interfaceView.allocation.transferLeg.sender;
      return `allocation:${Object.keys(party).find((r) => party[r] === sender) ?? 'other'}`;
    }).sort();
    matrix[reader] = row;
  }
  writeJson(`visibility-${label}.json`, matrix);
  return matrix;
}

function assertMatrix(label, matrix) {
  const obligations = (reader) => matrix[reader].CapitalCallObligation;
  check(`privacy[${label}]: admin sees all three obligations`,
    JSON.stringify(obligations('admin')) === JSON.stringify(['obligation:lpA', 'obligation:lpB', 'obligation:lpC']), obligations('admin'));
  for (const lp of ['lpA', 'lpB', 'lpC']) {
    check(`privacy[${label}]: ${lp} sees only its own obligation`, JSON.stringify(obligations(lp)) === JSON.stringify([`obligation:${lp}`]), obligations(lp));
    check(`privacy[${label}]: ${lp} sees only its own commitment`,
      JSON.stringify(matrix[lp].InvestorCommitment) === JSON.stringify([`commitment:${lp}`]), matrix[lp].InvestorCommitment);
    check(`privacy[${label}]: ${lp} sees no Fund or CapitalCall`, matrix[lp].Fund.length === 0 && matrix[lp].CapitalCall.length === 0);
    check(`privacy[${label}]: ${lp} sees no other LP's allocation`, matrix[lp].Allocation.every((a) => a === `allocation:${lp}`), matrix[lp].Allocation);
  }
  check(`privacy[${label}]: outsider sees nothing`, Object.values(matrix.outsider).every((v) => v.length === 0), matrix.outsider);
}

for (const role of ['lpA', 'lpB', 'lpC']) await obligationFor(role, role);
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
  const now = Date.now();
  const iso = (offsetMs) => new Date(now + offsetMs).toISOString();
  const holdings = await client[role].activeContracts(party[role], { interfaceId: INTERFACES.Holding });
  const inputHoldingCids = holdings
    .filter((h) => h.interfaceView.owner === party[role] && h.interfaceView.instrumentId.id === instrument.id && !h.interfaceView.lock)
    .map((h) => h.contractId);
  const choiceArguments = {
    expectedAdmin: instrument.admin,
    allocation: {
      settlement: {
        executor: party.admin,
        settlementRef: { id: obligationRef, cid: null },
        requestedAt: iso(-60_000),
        allocateBefore: iso(3_600_000),
        settleBefore: iso(7_200_000),
        meta: { values: {} },
      },
      transferLegId: obligationRef,
      transferLeg: { sender: party[role], receiver: party.admin, amount, instrumentId: instrument, meta: { values: {} } },
    },
    requestedAt: iso(-60_000),
    inputHoldingCids,
    extraArgs: { context: { values: {} }, meta: { values: {} } },
  };
  const factory = await allocationFactory(choiceArguments);
  const result = await client[role].exercise({
    actAs: [party[role]],
    templateId: INTERFACES.AllocationFactory,
    contractId: factory.factoryId,
    choice: 'AllocationFactory_Allocate',
    argument: { ...choiceArguments, extraArgs: { context: factory.choiceContext.choiceContextData, meta: { values: {} } } },
    disclosedContracts: factory.choiceContext.disclosedContracts,
    synchronizerId: factory.choiceContext.disclosedContracts[0].synchronizerId,
  });
  const root = transactionEvents(result.transaction).find((e) => e.kind === 'exercised' && e.choice === 'AllocationFactory_Allocate');
  const output = root.exerciseResult.output;
  if (output.tag !== 'AllocationInstructionResult_Completed') throw new Error(`allocation not completed: ${JSON.stringify(output)}`);
  step(`${role} allocated ${amount} Amulet for ${obligationRef}`, { updateId: result.transaction.updateId, allocationCid: output.value.allocationCid });
  return { allocationCid: output.value.allocationCid, updateId: result.transaction.updateId };
}

// The admin finds the allocation in its own ACS. It does not take the LP's word for it.
async function adminObservedAllocation(allocationCid) {
  const visible = await eventually(() => client.admin.activeContracts(party.admin, { interfaceId: INTERFACES.Allocation }),
    (l) => l.some((a) => a.contractId === allocationCid));
  return visible.find((a) => a.contractId === allocationCid);
}

async function settle(role, allocationCid) {
  const obligation = await obligationFor(role);
  const context = await executeTransferContext(allocationCid);
  return client.admin.exercise({
    actAs: [party.admin],
    templateId: TEMPLATES.CapitalCallObligation,
    contractId: obligation.contractId,
    choice: 'Obligation_Settle',
    argument: { allocationCid, extraArgs: { context: context.choiceContextData, meta: { values: {} } } },
    disclosedContracts: context.disclosedContracts,
    synchronizerId: context.disclosedContracts[0]?.synchronizerId,
  });
}

const receipts = {};
async function settleAndVerify(role) {
  const allocation = await allocate(role, { obligationRef: ref[role], amount: plan[role].amountDue });
  const observed = await adminObservedAllocation(allocation.allocationCid);
  check(`settlement[${role}]: admin observes allocation in its own ACS`, observed, observed?.interfaceView?.allocation?.settlement?.settlementRef);

  const pending = await client.admin.exercise({
    actAs: [party.admin], templateId: TEMPLATES.CapitalCallObligation, contractId: (await obligationFor(role)).contractId,
    choice: 'Obligation_MarkPaymentPending', argument: { allocationCid: allocation.allocationCid },
  });
  const pendingState = (await obligationFor(role, role, 'PaymentPending'))?.payload?.state;
  check(`settlement[${role}]: obligation is PaymentPending, not Funded, before execution`, pendingState === 'PaymentPending',
    { state: pendingState, updateId: pending.transaction.updateId });

  const settled = await settle(role, allocation.allocationCid);
  step(`admin executed Obligation_Settle for ${role}`, { updateId: settled.transaction.updateId });

  const receipt = await verifier.verify({ obligationRef: ref[role], claimedUpdateId: settled.transaction.updateId });
  receipts[role] = {
    environment: 'LocalNet (Splice 0.8.4, Canton 3.5.19)',
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

const wrongRef = await allocate('lpB', { obligationRef: `DRAW-${randomBytes(8).toString('hex')}`, amount: plan.lpB.amountDue });
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

// Rejected allocations stay locked LP funds until the LP withdraws them.
async function withdraw(role, allocationCid) {
  const context = await withdrawContext(allocationCid);
  return client[role].exercise({
    actAs: [party[role]],
    templateId: INTERFACES.Allocation,
    contractId: allocationCid,
    choice: 'Allocation_Withdraw',
    argument: { extraArgs: { context: context.choiceContextData, meta: { values: {} } } },
    disclosedContracts: context.disclosedContracts,
    synchronizerId: context.disclosedContracts[0]?.synchronizerId,
  });
}
for (const [role, rejected] of [['lpB', wrongAmount], ['lpC', wrongParty], ['lpB', wrongRef]]) {
  const result = await withdraw(role, rejected.allocationCid);
  step(`${role} withdrew rejected allocation`, { allocationCid: rejected.allocationCid, updateId: result.transaction.updateId });
}
const lockedAfterWithdraw = await client.admin.activeContracts(party.admin, { interfaceId: INTERFACES.Allocation });
check('negative: rejected allocations withdrawn, none left for admin to execute', lockedAfterWithdraw.length === 0,
  lockedAfterWithdraw.map((a) => a.contractId));

// ---------------------------------------------------------------- LP B pays correctly
await settleAndVerify('lpB');

// ---------------------------------------------------------------- LP C never pays
await expectRejection('deadline: overdue refused before due time',
  async () => client.admin.exercise({ actAs: [party.admin], templateId: TEMPLATES.CapitalCallObligation,
    contractId: (await obligationFor('lpC')).contractId, choice: 'Obligation_MarkOverdue', argument: {} }),
  'obligation is not yet due');
const waitMs = Date.parse(dueAt) - Date.now() + 5_000;
if (waitMs > 0) {
  step(`waiting ${Math.ceil(waitMs / 1000)}s for the due time to pass`, { dueAt });
  await sleep(waitMs);
}
const overdue = await client.admin.exercise({ actAs: [party.admin], templateId: TEMPLATES.CapitalCallObligation,
  contractId: (await obligationFor('lpC')).contractId, choice: 'Obligation_MarkOverdue', argument: {} });
const stateC = (await obligationFor('lpC', 'lpC', 'Overdue'))?.payload?.state;
check('unpaid: lpC obligation is Overdue after the due time, not Funded', stateC === 'Overdue', { state: stateC, updateId: overdue.transaction.updateId });

// ---------------------------------------------------------------- admin totals
const adminObligations = await client.admin.activeContracts(party.admin, { templateId: TEMPLATES.CapitalCallObligation });
const verifiedRefs = new Set(Object.values(receipts).filter((r) => r.verdict === 'VERIFIED_FUNDED').map((r) => r.obligationRef));
const fundedDisplay = adminObligations.filter((o) => o.payload.state === 'Funded' && verifiedRefs.has(o.payload.obligationRef));
const unresolved = adminObligations.filter((o) => !fundedDisplay.includes(o) && o.payload.state !== 'Waived');
const [call] = await client.admin.activeContracts(party.admin, { templateId: TEMPLATES.CapitalCall });
const balancesAfter = Object.fromEntries(await Promise.all(['admin', 'lpA', 'lpB', 'lpC'].map(async (r) => [r, await amuletBalance(r)])));
const totals = {
  fundedScenarioUsd: sum(fundedDisplay.map((o) => o.payload.scenarioAmount)),
  unresolvedScenarioUsd: sum(unresolved.map((o) => o.payload.scenarioAmount)),
  callTotalScenarioUsd: Number(call.payload.totalScenarioAmount),
  fundedUnits: sum(fundedDisplay.map((o) => o.payload.amountDue)),
  adminAmuletReceived: balancesAfter.admin - balancesBefore.admin,
  verifiedReceiptUnits: sum(Object.values(receipts).map((r) => r.receivedAmount)),
  byObligation: adminObligations.map((o) => ({
    lp: Object.keys(party).find((r) => party[r] === o.payload.lp),
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
for (const role of ['lpA', 'lpB', 'lpC']) {
  const paid = fundedDisplay.some((o) => o.payload.lp === party[role]) ? Number(plan[role].amountDue) : 0;
  const delta = balancesBefore[role] - balancesAfter[role];
  check(`totals: ${role} unlocked balance fell by exactly what it settled (${paid})`, Math.abs(delta - paid) < 1e-9, { delta, paid });
}
check('totals: admin Amulet balance grew by exactly the funded units', Math.abs(totals.adminAmuletReceived - totals.fundedUnits) < 1e-9,
  { received: totals.adminAmuletReceived, funded: totals.fundedUnits });

assertMatrix('final', await visibilityMatrix('final'));

// ---------------------------------------------------------------- verdicts
const group = (prefix) => checks.filter((c) => prefix.some((p) => c.id.startsWith(p)));
const verdict = (list) => (list.length > 0 && list.every((c) => c.ok) ? 'PASS' : 'FAIL');
const result = {
  runId,
  environment: 'LocalNet',
  splice: '0.8.4',
  canton: (await operatorProvider.request('GET', '/v2/version')).version,
  commit: execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD']).toString().trim(),
  uncommittedFiles: execFileSync('git', ['-C', ROOT, 'status', '--porcelain']).toString().split('\n').filter(Boolean).length,
  packageId,
  darSha256,
  instrument,
  parties: party,
  participants: { admin: 'app-provider', lpA: 'app-user', lpB: 'app-user', lpC: 'app-user', outsider: 'app-user' },
  verifierUser: verifierUserId,
  gates: {
    LOCAL_SETTLEMENT: verdict(group(['settlement', 'negative', 'unpaid', 'deadline', 'totals'])),
    PRIVACY_CAMPAIGN: verdict(group(['privacy', 'authority', 'credential'])),
  },
  passed: checks.filter((c) => c.ok).length,
  failed: checks.filter((c) => !c.ok).map((c) => c.id),
  checks,
};
writeJson('result.json', result);
console.log(JSON.stringify({ runId, gates: result.gates, passed: result.passed, failed: result.failed }, null, 2));
process.exitCode = result.failed.length === 0 ? 0 : 1;
