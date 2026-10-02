// Deterministic generalization campaign on a real participant. Generates
// seeded capital calls with varied LP counts, sizes, due times, and payment
// behaviour, drives them through the same DrawSession the app uses, then
// compares ledger truth against an independent reference model.
//   node scripts/eval/campaign.mjs            (DRAW_EVAL_SEED, DRAW_EVAL_CASES)
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { TEMPLATES } from '../demo/lib/ledger.mjs';
import { DrawSession, eventually, newRef, packageInfo, sum } from '../demo/lib/draw.mjs';
import { ROOT, network } from '../demo/lib/network.mjs';
import { PAYMENT, classifyPayments } from '../demo/lib/reconcile.mjs';

const SEED = Number(process.env.DRAW_EVAL_SEED ?? 20261002);
const CASES = Number(process.env.DRAW_EVAL_CASES ?? 100);
const POOL = ['lpA', 'lpB', 'lpC'];

const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const OUT = join(ROOT, 'evidence', network.name === 'localnet' ? 'local' : network.name, 'campaign', runId);
mkdirSync(OUT, { recursive: true });

// mulberry32: small, seedable, good enough to make the case mix reproducible.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = rng(SEED);
const pick = (list) => list[Math.floor(random() * list.length)];
const between = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));

// ---------------------------------------------------------------- reference model
// Expected final ledger state per behaviour. Written from the rules, not from runs.
const BEHAVIOURS = {
  future: ['pay', 'pay', 'pay', 'none-early', 'wrong-amount', 'wrong-payer', 'unknown-ref', 'pending', 'duplicate', 'replay', 'contradiction'],
  past: ['late-pay', 'late-pay', 'none-late', 'waive', 'wrong-amount', 'replay'],
};
const EXPECTED_STATE = {
  pay: 'Funded',
  'late-pay': 'Funded',
  'none-early': 'Issued',
  'none-late': 'Overdue',
  waive: 'Waived',
  'wrong-amount': 'Issued',
  'wrong-payer': 'ManualReview',
  'unknown-ref': 'Issued',
  pending: 'PaymentPending',
  duplicate: 'Funded',
  replay: 'Issued',
  contradiction: 'Funded',
};
const EXPECTED_PAYMENT_KIND = {
  'wrong-amount': PAYMENT.WRONG_AMOUNT,
  'wrong-payer': PAYMENT.WRONG_PAYER,
  'unknown-ref': PAYMENT.UNKNOWN_REFERENCE,
  duplicate: PAYMENT.DUPLICATE,
};

function referenceAggregate(obligations) {
  const funded = obligations.filter((o) => EXPECTED_STATE[o.behaviour] === 'Funded');
  const open = obligations.filter((o) => !['Funded', 'Waived'].includes(EXPECTED_STATE[o.behaviour]));
  return { fundedUsd: sum(funded.map((o) => o.scenarioUsd)), unresolvedUsd: sum(open.map((o) => o.scenarioUsd)) };
}

function generateCases() {
  return Array.from({ length: CASES }, (_, index) => {
    const duePast = random() < 0.35;
    const lps = [...POOL].sort(() => random() - 0.5).slice(0, between(1, POOL.length));
    return {
      index,
      duePast,
      obligations: lps.map((role) => {
        const units = between(1, 9);
        return { role, units, scenarioUsd: units * between(5, 50) * 1000, behaviour: pick(duePast ? BEHAVIOURS.past : BEHAVIOURS.future) };
      }),
    };
  });
}

// ---------------------------------------------------------------- run
const { packageId } = packageInfo();
const draw = await DrawSession.open({ tag: `eval${runId.toLowerCase().replace(/[^a-z0-9]/g, '')}`, packageId });
const { party } = draw;
for (const role of POOL) await draw.tap(role, '2000.0');
const fundId = `EVAL-${runId}`;
const fundCid = await draw.createFund({ fundId, fundName: 'Campaign Fund (generated)' });
for (const role of POOL) {
  await draw.invite(fundCid, role, '1000000000000.0');
  const [invitation] = await eventually(() => draw.contracts(role, TEMPLATES.CommitmentInvitation, fundId), (l) => l.length === 1);
  await draw.acceptInvitation(role, invitation.contractId);
}
await eventually(() => draw.contracts('admin', TEMPLATES.InvestorCommitment, fundId), (l) => l.length === POOL.length);

const metrics = {
  cases: 0, obligations: 0, passed: 0, failed: 0,
  falseFunded: 0, missedFunded: 0, privacyViolations: 0, replayAcceptances: 0,
  aggregateMismatches: 0, classifierMismatches: 0, manualReview: 0, contradictions: 0,
  pendingNotFunded: 0, overdueRefusedEarly: 0, settleRefusals: 0, errors: 0,
};
const consumedSettlements = [];

async function refused(action) {
  try {
    await action();
    return false;
  } catch {
    return true;
  }
}

async function adminObligation(ref, state) {
  return eventually(
    async () => (await draw.contracts('admin', TEMPLATES.CapitalCallObligation, fundId)).find((o) => o.payload.obligationRef === ref),
    (o) => o && (!state || o.payload.state === state),
  );
}

async function payments() {
  return classifyPayments({
    adminParty: party.admin,
    obligations: await draw.contracts('admin', TEMPLATES.CapitalCallObligation, fundId),
    allocations: await draw.allocations('admin'),
  });
}

async function settleAndVerify(o, allocationCid) {
  const obligation = await adminObligation(o.ref);
  const settled = await draw.settle(obligation.contractId, allocationCid);
  const receipt = await draw.verifier.verify({ obligationRef: o.ref, claimedUpdateId: settled.transaction.updateId });
  consumedSettlements.push({ ref: o.ref, allocationCid, updateId: settled.transaction.updateId });
  return receipt;
}

async function runCase(spec) {
  const notes = [];
  const commitments = await draw.contracts('admin', TEMPLATES.InvestorCommitment, fundId);
  const obligations = spec.obligations.map((o) => ({ ...o, ref: newRef() }));
  const dueAt = new Date(Date.now() + (spec.duePast ? -60_000 : 30 * 60_000)).toISOString();
  await draw.issueCall(fundCid, {
    callId: `CASE-${spec.index}`,
    description: `generated case ${spec.index}`,
    dueAt,
    requests: obligations.map((o) => ({
      commitmentCid: commitments.find((c) => c.payload.lp === party[o.role]).contractId,
      obligationRef: o.ref, amountDue: String(o.units), scenarioAmount: String(o.scenarioUsd),
    })),
  });
  for (const o of obligations) await adminObligation(o.ref);

  const verified = new Set();
  for (const o of obligations) {
    const due = String(o.units);
    const other = POOL.find((r) => r !== o.role);
    switch (o.behaviour) {
      case 'pay':
      case 'late-pay': {
        const { allocationCid } = await draw.allocate(o.role, { obligationRef: o.ref, amount: due });
        if (o.behaviour === 'pay') await draw.markPending((await adminObligation(o.ref)).contractId, allocationCid);
        const receipt = await settleAndVerify(o, allocationCid);
        if (receipt.verdict === 'VERIFIED_FUNDED') verified.add(o.ref);
        break;
      }
      case 'none-early': {
        if (await refused(async () => draw.markOverdue((await adminObligation(o.ref)).contractId))) metrics.overdueRefusedEarly += 1;
        else notes.push('overdue accepted before due');
        break;
      }
      case 'none-late':
        await draw.markOverdue((await adminObligation(o.ref)).contractId);
        break;
      case 'waive': {
        await draw.markOverdue((await adminObligation(o.ref)).contractId);
        await draw.waive((await adminObligation(o.ref, 'Overdue')).contractId, 'generated waiver');
        break;
      }
      case 'wrong-amount': {
        const wrong = Math.max(o.units + pick([-1, 1, 2]), 0.5);
        const { allocationCid } = await draw.allocate(o.role, { obligationRef: o.ref, amount: String(wrong === o.units ? o.units + 1 : wrong) });
        o.injected = allocationCid;
        if (await refused(async () => draw.settle((await adminObligation(o.ref)).contractId, allocationCid))) metrics.settleRefusals += 1;
        else notes.push('wrong amount settled');
        break;
      }
      case 'wrong-payer': {
        const { allocationCid } = await draw.allocate(other, { obligationRef: o.ref, amount: due });
        o.injected = allocationCid;
        if (await refused(async () => draw.settle((await adminObligation(o.ref)).contractId, allocationCid))) metrics.settleRefusals += 1;
        else notes.push('wrong payer settled');
        break;
      }
      case 'unknown-ref': {
        const { allocationCid } = await draw.allocate(o.role, { obligationRef: newRef(), amount: due });
        o.injected = allocationCid;
        break;
      }
      case 'pending': {
        const { allocationCid } = await draw.allocate(o.role, { obligationRef: o.ref, amount: due });
        await draw.markPending((await adminObligation(o.ref)).contractId, allocationCid);
        o.lockedPending = allocationCid;
        break;
      }
      case 'duplicate': {
        const first = await draw.allocate(o.role, { obligationRef: o.ref, amount: due });
        const second = await draw.allocate(o.role, { obligationRef: o.ref, amount: due });
        o.injected = second.allocationCid;
        o.firstAllocation = first.allocationCid;
        break;
      }
      case 'replay': {
        const previous = consumedSettlements.at(-1);
        if (previous) {
          if (!(await refused(async () => draw.settle((await adminObligation(o.ref)).contractId, previous.allocationCid)))) metrics.replayAcceptances += 1;
          const receipt = await draw.verifier.verify({ obligationRef: o.ref, claimedUpdateId: previous.updateId });
          if (receipt.verdict === 'VERIFIED_FUNDED') metrics.replayAcceptances += 1;
          else metrics.contradictions += 1;
        }
        break;
      }
      case 'contradiction': {
        const { allocationCid } = await draw.allocate(o.role, { obligationRef: o.ref, amount: due });
        const previous = consumedSettlements.at(-1);
        const receipt = await settleAndVerify(o, allocationCid);
        if (receipt.verdict === 'VERIFIED_FUNDED') verified.add(o.ref);
        if (previous) {
          const wrongClaim = await draw.verifier.verify({ obligationRef: o.ref, claimedUpdateId: previous.updateId });
          if (wrongClaim.verdict === 'VERIFIED_FUNDED') metrics.replayAcceptances += 1;
          else metrics.contradictions += 1;
        }
        break;
      }
      default:
        throw new Error(`unknown behaviour ${o.behaviour}`);
    }
  }

  // Reconcile what is left, the way the admin screen does.
  let classified = await payments();
  for (const o of obligations) {
    const expectedKind = EXPECTED_PAYMENT_KIND[o.behaviour];
    if (!expectedKind) continue;
    const found = classified.find((p) => p.allocationCid === o.injected);
    if (found?.kind !== expectedKind) {
      metrics.classifierMismatches += 1;
      notes.push(`${o.behaviour}: classified ${found?.kind ?? 'missing'}`);
    }
  }
  for (const o of obligations.filter((x) => x.behaviour === 'duplicate')) {
    const receipt = await settleAndVerify(o, o.firstAllocation);
    if (receipt.verdict === 'VERIFIED_FUNDED') verified.add(o.ref);
    if (await refused(async () => draw.settle((await adminObligation(o.ref)).contractId, o.injected))) metrics.settleRefusals += 1;
    else notes.push('duplicate settled twice');
  }
  for (const o of obligations.filter((x) => x.behaviour === 'wrong-payer')) {
    await draw.flagReview((await adminObligation(o.ref)).contractId, 'payment from a different investor against this reference');
  }
  // Payers take back anything the fund will not settle.
  classified = await payments();
  for (const payment of classified.filter((p) => p.recommendation !== 'settle' && obligations.some((o) => o.injected === p.allocationCid))) {
    const payer = POOL.find((r) => party[r] === payment.sender);
    await draw.withdraw(payer, payment.allocationCid);
  }

  // ---------------------------------------------------------------- compare
  const ledger = await draw.contracts('admin', TEMPLATES.CapitalCallObligation, fundId);
  const rows = obligations.map((o) => {
    const actual = ledger.find((l) => l.payload.obligationRef === o.ref)?.payload.state;
    const expected = EXPECTED_STATE[o.behaviour];
    const isVerified = verified.has(o.ref);
    if (actual === 'Funded' && expected !== 'Funded') metrics.falseFunded += 1;
    if (isVerified && expected !== 'Funded') metrics.falseFunded += 1;
    if (expected === 'Funded' && !(actual === 'Funded' && isVerified)) metrics.missedFunded += 1;
    if (o.behaviour === 'pending' && actual === 'PaymentPending' && !isVerified) metrics.pendingNotFunded += 1;
    if (actual === 'ManualReview') metrics.manualReview += 1;
    return { role: o.role, behaviour: o.behaviour, units: o.units, scenarioUsd: o.scenarioUsd, expected, actual, verified: isVerified, ok: actual === expected && isVerified === (expected === 'Funded') };
  });

  const reference = referenceAggregate(obligations);
  const appAggregate = {
    fundedUsd: sum(rows.filter((r) => r.actual === 'Funded' && r.verified).map((r) => r.scenarioUsd)),
    unresolvedUsd: sum(rows.filter((r) => !(r.actual === 'Funded' && r.verified) && r.actual !== 'Waived').map((r) => r.scenarioUsd)),
  };
  const aggregateOk = reference.fundedUsd === appAggregate.fundedUsd && reference.unresolvedUsd === appAggregate.unresolvedUsd;
  if (!aggregateOk) metrics.aggregateMismatches += 1;

  // Privacy: every party's own read, across everything it can see.
  let violations = 0;
  for (const reader of [...POOL, 'outsider']) {
    const seen = await draw.contracts(reader, TEMPLATES.CapitalCallObligation);
    violations += seen.filter((c) => c.payload.lp !== party[reader] && c.payload.admin !== party[reader]).length;
    const allocations = await draw.allocations(reader);
    violations += allocations.filter((a) => {
      const { settlement, transferLeg } = a.interfaceView.allocation;
      return ![settlement.executor, transferLeg.sender, transferLeg.receiver].includes(party[reader]);
    }).length;
  }
  const adminSeesAll = obligations.every((o) => ledger.some((l) => l.payload.obligationRef === o.ref));
  if (!adminSeesAll) violations += 1;
  metrics.privacyViolations += violations;

  const ok = rows.every((r) => r.ok) && aggregateOk && violations === 0 && notes.length === 0;
  return { index: spec.index, duePast: spec.duePast, ok, rows, reference, appAggregate, privacyViolations: violations, notes };
}

const started = Date.now();
for (const spec of generateCases()) {
  let outcome;
  try {
    outcome = await runCase(spec);
  } catch (error) {
    metrics.errors += 1;
    outcome = { index: spec.index, ok: false, error: error.message.slice(0, 500), spec };
  }
  metrics.cases += 1;
  metrics.obligations += spec.obligations.length;
  metrics[outcome.ok ? 'passed' : 'failed'] += 1;
  appendFileSync(join(OUT, 'cases.jsonl'), `${JSON.stringify(outcome)}\n`);
  console.log(`${outcome.ok ? 'ok  ' : 'FAIL'} case ${spec.index} ${spec.obligations.map((o) => o.behaviour).join(',')}${outcome.error ? ` ${outcome.error.slice(0, 160)}` : ''}`);
}

const result = {
  campaign: 'draw-generalization',
  environment: network.name,
  seed: SEED,
  runId,
  commit: execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD']).toString().trim(),
  packageId,
  fundId,
  parties: party,
  durationSeconds: Math.round((Date.now() - started) / 1000),
  behaviours: EXPECTED_STATE,
  metrics,
  verdict: metrics.failed === 0 && metrics.falseFunded === 0 && metrics.privacyViolations === 0
    && metrics.replayAcceptances === 0 && metrics.aggregateMismatches === 0 && metrics.classifierMismatches === 0 ? 'PASS' : 'FAIL',
};
writeFileSync(join(OUT, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ runId, verdict: result.verdict, metrics }, null, 2));
process.exitCode = result.verdict === 'PASS' ? 0 : 1;
