// Prints the judge view of one evidence run. Reads only files the run wrote.
// Usage: node scripts/demo/summary.mjs [runId]   (defaults to the latest run)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { network } from './lib/network.mjs';

const RUNS = network.evidenceDir;
const runId = process.argv[2] ?? readdirSync(RUNS).sort().at(-1);
const read = (file) => JSON.parse(readFileSync(join(RUNS, runId, file), 'utf8'));

const result = read('result.json');
const totals = read('totals.json');
const finalView = read('visibility-final.json');
const visibility = finalView.matrix ?? finalView;
const usd = (n) => `$${Number(n).toLocaleString('en-US')}`;
const short = (id) => (id ? `${id.slice(0, 12)}…` : '-');

console.log(`DRAW capital call, ${result.environment} run ${runId}`);
console.log(`commit ${result.commit.slice(0, 7)}, package ${short(result.packageId)}, Canton ${result.canton}`);
console.log(`instrument ${result.instrument.id} (registry admin ${short(result.instrument.admin)})\n`);

console.log(result.credentialSeparation === 'TESTED' ? 'What each party can read through its own ledger credential' : 'What each party can read through its own party-scoped reads');
for (const [reader, row] of Object.entries(visibility)) {
  const leaked = finalView.leaks?.[reader]?.length ?? 0;
  console.log(`  ${reader.padEnd(9)} leaks: ${leaked}  obligations: ${(row.CapitalCallObligation.join(', ') || 'none').padEnd(52)} fund/call: ${row.Fund.length + row.CapitalCall.length > 0 ? 'yes' : 'no'}`);
}

console.log('\nObligations, admin view, recomputed from the ledger');
for (const o of totals.byObligation) {
  const label = o.state === 'Funded' && o.evidence === 'VERIFIED_FUNDED' ? 'FUNDED (verified)' : o.state.toUpperCase();
  console.log(`  ${o.lp.padEnd(4)} ${usd(o.scenarioUsd).padStart(9)}  ${String(o.units).padStart(3)} Amulet  ${label}`);
}

// What the run itself recorded about the read-back step's credential.
const readBack = result.credentialSeparation === 'TESTED' || result.credentialSeparation === 'VERIFIER_ONLY'
  ? 'read-back step with a login of its own'
  : 'read-back step on the same login as the seats';
console.log(`\nSettlement receipts (${readBack})`);
for (const role of ['lpA', 'lpB']) {
  const r = read(`receipt-${role}.json`);
  console.log(`  ${role}: ${r.verdict}, ${r.receivedAmount} ${r.instrument.id}, update ${short(r.claimedUpdateId)}, allocation ${short(r.allocationCid)}, ${r.stateBefore} -> ${r.stateAfter}`);
}

console.log('\nRejected without funding');
for (const c of result.checks.filter((c) => c.id.startsWith('negative') || c.id.startsWith('deadline'))) {
  console.log(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.id.replace(/^(negative|deadline): /, '')}`);
}

console.log('\nAdmin totals');
console.log(`  funded     ${usd(totals.fundedScenarioUsd)}`);
console.log(`  unresolved ${usd(totals.unresolvedScenarioUsd)}`);
console.log(`  call total ${usd(totals.callTotalScenarioUsd)}`);
console.log(`  admin received ${totals.adminAmuletReceived} Amulet, verified receipts ${totals.verifiedReceiptUnits}`);
console.log(`  (USD figures are the business scenario. Amulet figures are what actually moved on ${result.environment}.)`);

console.log(`\nGates: ${Object.entries(result.gates).map(([g, v]) => `${g} ${v}`).join(', ')}. ${result.passed} checks passed, ${result.failed.length} failed.`);
