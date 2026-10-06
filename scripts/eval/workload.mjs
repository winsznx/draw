// Workload figures for one canonical run, computed from the run's own
// steps.jsonl. Writes evidence/<network>/workload/<runId>/result.json and never
// touches the run's own folder.
//   node scripts/eval/workload.mjs [runId]   (defaults to the latest run)
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { network } from '../demo/lib/network.mjs';

const runId = process.argv[2] ?? readdirSync(network.evidenceDir).sort().at(-1);
const dir = join(network.evidenceDir, runId);
const entries = readFileSync(join(dir, 'steps.jsonl'), 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
const at = (pattern) => entries.find((e) => pattern.test(e.step ?? e.check ?? ''))?.at;
const ms = (from, to) => (from && to ? Date.parse(to) - Date.parse(from) : null);

function settlementLatency(role) {
  const allocated = entries.filter((e) => new RegExp(`^${role} allocated`).test(e.step ?? '')).map((e) => e.at);
  const lastAllocated = allocated.at(-1);
  const observed = at(new RegExp(`^settlement\\[${role}\\]: admin observes allocation`));
  const pending = at(new RegExp(`^settlement\\[${role}\\]: obligation is PaymentPending`));
  const executed = at(new RegExp(`^admin executed Obligation_Settle for ${role}`));
  // Runs before 2026-10-06 named this check "independent verifier".
  const verified = at(new RegExp(`^settlement\\[${role}\\]: (independent|read-back) verifier`));
  return {
    paymentLockedToAdminObservedMs: ms(lastAllocated, observed),
    observedToPendingMs: ms(observed, pending),
    pendingToTransferExecutedMs: ms(pending, executed),
    transferExecutedToVerifiedMs: ms(executed, verified),
    paymentLockedToVerifiedFundedMs: ms(lastAllocated, verified),
  };
}

const ledgerActions = {
  oneTimePerFund: { createFund: 1, invitePerInvestor: 1, acceptPerInvestor: 1 },
  perCall: { issueCall: 1 },
  perFundedInvestor: { allocateByInvestor: 1, markPaymentPendingByAdmin: 1, settleByAdmin: 1 },
  perUnpaidInvestor: { markOverdueByAdmin: 1 },
  perRejectedPayment: { allocateByInvestor: 1, withdrawByInvestor: 1 },
};

const result = {
  runId,
  environment: network.name,
  source: `evidence/${network.name === 'localnet' ? 'local' : network.name}/runs/${runId}/steps.jsonl`,
  caveat: 'Single-machine LocalNet, scripted admin acting immediately. Not a production latency or cost figure.',
  ledgerActions,
  canonicalCallTransactions: {
    setupForThreeInvestors: 1 + 3 + 3,
    issueCall: 1,
    twoFundedInvestors: 2 * 3,
    oneUnpaidInvestor: 1,
  },
  settlementLatency: { lpA: settlementLatency('lpA'), lpB: settlementLatency('lpB') },
  issueCallMs: ms(at(/^fund created/), at(/^capital call issued/)),
  manualInterventions: ['admin clicks settle for each matching payment', 'admin marks overdue after the due time', 'investor withdraws a refused payment'],
};
const out = join(network.evidenceDir, '..', 'workload', runId);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result.settlementLatency, null, 2), `issue call ${result.issueCallMs} ms`);
