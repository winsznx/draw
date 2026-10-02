// Empirical ablation. The same capital call and the same five attacks run
// against two systems:
//   COUNTERFACTUAL_A  one operator database (node:sqlite) with a paid flag and
//                     role filtering in application queries
//   TREATMENT         DRAW on the participant: party-scoped contracts and
//                     Token Standard settlement
// An attack "lands" if the system ends up in a state the business rules
// forbid. Results are written by this script, never by hand.
//   node scripts/eval/ablation.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { TEMPLATES } from '../demo/lib/ledger.mjs';
import { DrawSession, LPS, eventually, newRef, packageInfo } from '../demo/lib/draw.mjs';
import { ROOT, network } from '../demo/lib/network.mjs';

const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const OUT = join(ROOT, 'evidence', network.name === 'localnet' ? 'local' : network.name, 'ablation', runId);
mkdirSync(OUT, { recursive: true });

const PLAN = { lpA: { units: 40, usd: 400000 }, lpB: { units: 35, usd: 350000 }, lpC: { units: 25, usd: 250000 } };

// ---------------------------------------------------------------- counterfactual A
// A reasonable operator database: obligations, a payments table, and the
// queries an app would write. Nothing here is deliberately broken. The attacks
// are what an operator, a compromised app server, or one missing WHERE clause
// can do.
function counterfactualA() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    create table obligations (ref text primary key, lp text not null, units real not null, usd real not null, paid integer not null default 0);
    create table payments (id integer primary key, ref text not null, payer text not null, units real not null);
  `);
  const insert = db.prepare('insert into obligations (ref, lp, units, usd) values (?, ?, ?, ?)');
  for (const [lp, { units, usd }] of Object.entries(PLAN)) insert.run(`REF-${lp}`, lp, units, usd);

  const recordPayment = (ref, payer, units) => {
    db.prepare('insert into payments (ref, payer, units) values (?, ?, ?)').run(ref, payer, units);
    const o = db.prepare('select * from obligations where ref = ?').get(ref);
    if (o && o.lp === payer && o.units === units) db.prepare('update obligations set paid = 1 where ref = ?').run(ref);
  };
  const lpView = (lp) => db.prepare('select ref, lp, usd from obligations where lp = ?').all(lp);
  const paidState = (lp) => db.prepare('select paid from obligations where lp = ?').get(lp).paid === 1;

  recordPayment('REF-lpA', 'lpA', 40);
  recordPayment('REF-lpB', 'lpB', 35);

  const attacks = [];
  // 1. Operator or app bug marks an unpaid LP funded.
  db.prepare("update obligations set paid = 1 where lp = 'lpC'").run();
  attacks.push({ id: 'mark-unpaid-funded', landed: paidState('lpC'), how: "UPDATE obligations SET paid = 1 WHERE lp = 'lpC' succeeded with no payment row" });
  db.prepare("update obligations set paid = 0 where lp = 'lpC'").run();

  // 2. A read path without the role filter.
  const leaked = db.prepare('select ref, lp, usd from obligations').all().filter((r) => r.lp !== 'lpA');
  attacks.push({ id: 'read-without-role-filter', landed: leaked.length > 0, how: `query without "where lp = ?" returned ${leaked.length} other investors' obligations`, correctlyFilteredView: lpView('lpA').length });

  // 3. Replay: a payment record re-used against another obligation.
  db.prepare("update obligations set paid = 1 where ref = 'REF-lpC' and exists (select 1 from payments where ref = 'REF-lpA')").run();
  attacks.push({ id: 'replay-payment-evidence', landed: paidState('lpC'), how: "an existing payment row was enough evidence to flip another obligation" });
  db.prepare("update obligations set paid = 0 where lp = 'lpC'").run();

  // 4. Paid flag with no money moved: payments are rows, not token movements.
  db.prepare("insert into payments (ref, payer, units) values ('REF-lpC', 'lpC', 25)").run();
  db.prepare("update obligations set paid = 1 where ref = 'REF-lpC'").run();
  attacks.push({ id: 'funded-without-asset-movement', landed: paidState('lpC'), how: 'a payment row was inserted. No asset moved anywhere the database can check' });
  db.prepare("update obligations set paid = 0 where lp = 'lpC'").run();

  // 5. Investor-side tampering: an LP cannot touch the DB directly, so this does not land.
  attacks.push({ id: 'lp-mutates-own-obligation', landed: false, how: 'LPs have no write path in this design' });

  const totals = db.prepare('select sum(case when paid = 1 then usd else 0 end) as funded, sum(case when paid = 0 then usd else 0 end) as unresolved from obligations').get();
  return { system: 'COUNTERFACTUAL_A', attacks, honestTotals: { fundedUsd: totals.funded, unresolvedUsd: totals.unresolved } };
}

// ---------------------------------------------------------------- treatment
async function treatment() {
  const { packageId } = packageInfo();
  const draw = await DrawSession.open({ tag: `abl${runId.toLowerCase().replace(/[^a-z0-9]/g, '')}`, packageId });
  const { party, client } = draw;
  for (const role of LPS) await draw.tap(role, '100.0');
  const fundId = `ABL-${runId}`;
  const fundCid = await draw.createFund({ fundId, fundName: 'Ablation Fund (demo)' });
  for (const role of LPS) {
    await draw.invite(fundCid, role, '1000000.0');
    const [inv] = await eventually(() => draw.contracts(role, TEMPLATES.CommitmentInvitation, fundId), (l) => l.length === 1);
    await draw.acceptInvitation(role, inv.contractId);
  }
  const commitments = await eventually(() => draw.contracts('admin', TEMPLATES.InvestorCommitment, fundId), (l) => l.length === 3);
  const ref = Object.fromEntries(LPS.map((r) => [r, newRef()]));
  await draw.issueCall(fundCid, {
    callId: 'CALL-1', description: 'ablation', dueAt: new Date(Date.now() + 3_600_000).toISOString(),
    requests: LPS.map((r) => ({ commitmentCid: commitments.find((c) => c.payload.lp === party[r]).contractId, obligationRef: ref[r], amountDue: String(PLAN[r].units), scenarioAmount: String(PLAN[r].usd) })),
  });
  const obligation = (role, reader = 'admin') => eventually(async () => (await draw.contracts(reader, TEMPLATES.CapitalCallObligation, fundId)).find((o) => o.payload.obligationRef === ref[role]));
  const state = async (role) => (await obligation(role)).payload.state;

  const paidA = await draw.allocate('lpA', { obligationRef: ref.lpA, amount: '40' });
  await draw.settle((await obligation('lpA')).contractId, paidA.allocationCid);
  const paidB = await draw.allocate('lpB', { obligationRef: ref.lpB, amount: '35' });
  await draw.settle((await obligation('lpB')).contractId, paidB.allocationCid);

  const attempt = async (action) => {
    try {
      await action();
      return { refused: false };
    } catch (error) {
      return { refused: true, reason: error.message.match(/"cause":"([^"]{0,200})/)?.[1] ?? error.message.slice(0, 200) };
    }
  };
  const attacks = [];

  // 1. The admin, holding full admin rights, tries to make LP C funded directly.
  const c = await obligation('lpC');
  const forge = await attempt(() => client.admin.create({ actAs: [party.admin], templateId: TEMPLATES.CapitalCallObligation,
    argument: { ...c.payload, obligationRef: newRef(), state: 'Funded' } }));
  const flagOnly = await attempt(() => client.admin.exercise({ actAs: [party.admin], templateId: TEMPLATES.CapitalCallObligation, contractId: c.contractId,
    choice: 'Obligation_Settle', argument: { allocationCid: paidA.allocationCid, extraArgs: { context: { values: {} }, meta: { values: {} } } } }));
  attacks.push({ id: 'mark-unpaid-funded', landed: !forge.refused || !flagOnly.refused || (await state('lpC')) === 'Funded',
    how: `create Funded obligation as admin: ${forge.refused ? 'refused' : 'ACCEPTED'} (${forge.reason ?? ''}). Settle with no matching payment: ${flagOnly.refused ? 'refused' : 'ACCEPTED'}` });

  // 2. LP A reads with no filter at all.
  const seenByA = await draw.contracts('lpA', TEMPLATES.CapitalCallObligation);
  const leaked = seenByA.filter((o) => o.payload.lp !== party.lpA);
  const fetchB = await attempt(async () => client.lpA.eventsByContractId(party.lpA, (await obligation('lpB')).contractId));
  attacks.push({ id: 'read-without-role-filter', landed: leaked.length > 0 || !fetchB.refused,
    how: `LP A's unfiltered ledger read returned ${leaked.length} other obligations. Fetch of LP B's obligation by id: ${fetchB.refused ? 'refused' : 'ACCEPTED'}` });

  // 3. Replay LP A's consumed allocation against LP C.
  const replay = await attempt(async () => draw.settle((await obligation('lpC')).contractId, paidA.allocationCid));
  attacks.push({ id: 'replay-payment-evidence', landed: !replay.refused || (await state('lpC')) === 'Funded', how: `settle LP C with LP A's consumed allocation: ${replay.refused ? 'refused' : 'ACCEPTED'} (${replay.reason ?? ''})` });

  // 4. Only one code path in the model writes Funded, and it executes the transfer.
  const source = readFileSync(join(ROOT, 'contracts/daml/daml/Draw/CapitalCall.daml'), 'utf8');
  const fundedWrites = (source.match(/state = Funded/g) ?? []).length;
  const insideSettle = /choice Obligation_Settle[\s\S]*?Allocation_ExecuteTransfer[\s\S]*?state = Funded/.test(source);
  const verifierOnClaim = await draw.verifier.verify({ obligationRef: ref.lpC, claimedUpdateId: (await client.admin.request('GET', '/v2/state/ledger-end')).offset.toString() });
  attacks.push({ id: 'funded-without-asset-movement', landed: !(fundedWrites === 1 && insideSettle) || verifierOnClaim.verdict === 'VERIFIED_FUNDED',
    how: `${fundedWrites} place(s) in the model set Funded, inside Obligation_Settle after Allocation_ExecuteTransfer: ${insideSettle}. Verifier on an unbacked claim: ${verifierOnClaim.verdict}` });

  // 5. LP C tries to change its own obligation.
  const self = await attempt(async () => client.lpC.exercise({ actAs: [party.lpC], templateId: TEMPLATES.CapitalCallObligation,
    contractId: (await obligation('lpC', 'lpC')).contractId, choice: 'Obligation_Waive', argument: { note: 'self' } }));
  attacks.push({ id: 'lp-mutates-own-obligation', landed: !self.refused, how: `LP C waiving its own obligation: ${self.refused ? 'refused' : 'ACCEPTED'}` });

  const all = await draw.contracts('admin', TEMPLATES.CapitalCallObligation, fundId);
  const fundedUsd = all.filter((o) => o.payload.state === 'Funded').reduce((s, o) => s + Number(o.payload.scenarioAmount), 0);
  return { system: 'TREATMENT', attacks, honestTotals: { fundedUsd, unresolvedUsd: 1_000_000 - fundedUsd }, fundId, parties: party, packageId };
}

// ---------------------------------------------------------------- counterfactual B
// A globally visible ledger: every participant replicates every obligation.
// Computed from the treatment's own contract fields, not imagined ones.
function counterfactualB() {
  const exposedFields = ['lp (investor identity)', 'amountDue', 'scenarioAmount (commitment share)', 'dueAt', 'state (who paid, who is overdue)', 'settlement holdings'];
  return { system: 'COUNTERFACTUAL_B', exposedToEveryParticipant: exposedFields, attacks: [
    { id: 'read-without-role-filter', landed: true, how: 'every obligation is replicated to every participant, including other LPs and unrelated parties' },
  ] };
}

const a = counterfactualA();
const t = await treatment();
const b = counterfactualB();
const result = {
  runId,
  environment: network.name,
  commit: execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD']).toString().trim(),
  systems: [a, b, t],
  comparison: a.attacks.map((attack) => ({
    attack: attack.id,
    counterfactualA: attack.landed ? 'LANDED' : 'stopped',
    treatment: t.attacks.find((x) => x.id === attack.id).landed ? 'LANDED' : 'stopped',
  })),
  sameInBoth: ['admin sees every obligation', 'honest-path funded and unresolved totals'],
  verdict: t.attacks.every((x) => !x.landed) ? 'TREATMENT_STOPS_ALL' : 'TREATMENT_LEAKS',
};
writeFileSync(join(OUT, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
console.table(result.comparison);
console.log(JSON.stringify({ runId, verdict: result.verdict, honest: { A: a.honestTotals, T: t.honestTotals } }));
