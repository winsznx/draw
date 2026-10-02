import { useEffect, useState, type ReactElement } from 'react';

import { fetchProof } from '../api';
import { roleName, shortId, units, usd } from '../format';
import type { Proof } from '../types';

const CONTRACTS = ['Fund', 'CapitalCall', 'InvestorCommitment', 'CapitalCallObligation', 'Allocation'] as const;
const CONTRACT_NAME: Record<(typeof CONTRACTS)[number], string> = {
  Fund: 'Fund',
  CapitalCall: 'Call header',
  InvestorCommitment: 'Commitments',
  CapitalCallObligation: 'Obligations',
  Allocation: 'Payments',
};
const ATTACK_NAME: Record<string, string> = {
  'mark-unpaid-funded': 'Mark an unpaid investor funded',
  'read-without-role-filter': 'Read another investor\'s obligation',
  'replay-payment-evidence': 'Reuse one payment for another obligation',
  'funded-without-asset-movement': 'Funded with no asset moved',
  'lp-mutates-own-obligation': 'Investor changes its own obligation',
};
const METRIC_NAME: Record<string, string> = {
  cases: 'Cases',
  obligations: 'Obligations',
  passed: 'Cases passed',
  failed: 'Cases failed',
  falseFunded: 'Falsely funded',
  missedFunded: 'Paid but not funded',
  privacyViolations: 'Privacy violations',
  replayAcceptances: 'Replays accepted',
  aggregateMismatches: 'Total mismatches',
  classifierMismatches: 'Payments misclassified',
  manualReview: 'Sent to manual review',
  contradictions: 'False claims contradicted',
  pendingNotFunded: 'Pending, correctly not funded',
  overdueRefusedEarly: 'Early overdue refused',
  settleRefusals: 'Bad payments refused',
  errors: 'Errors',
};

const evidenceLink = (path: string, file: string): string => `/${path}/${file}`;

export function ProofPage(): ReactElement {
  const [proof, setProof] = useState<Proof | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchProof(controller.signal).then(setProof).catch((e: unknown) => {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load the evidence.');
    });
    return () => controller.abort();
  }, []);

  if (error) return <div className="empty"><h1>Evidence unavailable</h1><p>{error}</p></div>;
  if (!proof) return <div className="empty"><p>Loading evidence…</p></div>;
  const c = proof.canonical;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Proof</h1>
          <p className="muted">What the scripted runs on {proof.network} produced. Every number here comes from a result file a script wrote. Open any file to check it.</p>
        </div>
      </div>

      {!c ? <p className="panel">No canonical run on {proof.network} yet. Run <code>node scripts/demo/run.mjs</code>.</p> : (
        <>
          <section className="panel">
            <h2>Canonical run</h2>
            <dl className="kv">
              <dt>Environment</dt><dd>{proof.network}, Canton {c.canton}</dd>
              <dt>Run</dt><dd><a href={evidenceLink(c.path, 'result.json')}>{c.runId}</a></dd>
              <dt>Commit</dt><dd>{c.commit.slice(0, 12)}</dd>
              <dt>Package</dt><dd>{shortId(c.packageId)}</dd>
              <dt>Fund</dt><dd>{c.fundId}</dd>
              <dt>Instrument</dt><dd>{c.instrument.id}, registry {shortId(c.instrument.admin)}</dd>
              <dt>Gates</dt><dd>{Object.entries(c.gates).map(([gate, verdict]) => `${gate} ${verdict}`).join(', ')}. {c.passed} checks passed, {c.failed.length} failed.</dd>
            </dl>
          </section>

          {c.visibility && (
            <section className="proof-section panel">
              <h2>Who could read what</h2>
              <p className="muted small">Each row is one party reading the ledger with its own login, after the call settled. Leaks counts any contract a party could see that it is not a party to, from any run.</p>
              <table className="matrix">
                <thead><tr><th>Reader</th>{CONTRACTS.map((k) => <th key={k}>{CONTRACT_NAME[k]}</th>)}<th>Leaks</th></tr></thead>
                <tbody>
                  {Object.entries(c.visibility).map(([reader, row]) => (
                    <tr key={reader}>
                      <td>{roleName(reader)}</td>
                      {CONTRACTS.map((k) => {
                        const seen = row[k] ?? [];
                        return <td key={k} className={seen.length ? 'yes' : 'no'}>{seen.length ? seen.map((s) => s.split(':')[1] ? roleName(s.split(':')[1]) : 'yes').join(', ') : 'none'}</td>;
                      })}
                      <td>{c.leaks?.[reader]?.length ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="small"><a href={evidenceLink(c.path, 'visibility-final.json')}>visibility-final.json</a></p>
            </section>
          )}

          <section className="proof-section panel">
            <h2>Settlements, independently verified</h2>
            <table>
              <thead><tr><th>Payer</th><th>Expected</th><th>Before → after</th><th>Verifier</th><th>Update</th></tr></thead>
              <tbody>
                {c.receipts.map((r) => (
                  <tr key={r.obligationRef}>
                    <td>{shortId(r.payer)}<span className="sub">{r.obligationRef}</span></td>
                    <td>{units(Number(r.expected.amount))} {r.expected.instrument.id}<span className="sub">{usd(Number(r.expected.scenarioAmountUsd))} scenario</span></td>
                    <td>{r.stateBefore} → {r.stateAfter}</td>
                    <td>{r.verdict}<span className="sub">{r.checks} checks, {units(r.receivedAmount)} received</span></td>
                    <td className="id">{shortId(r.claimedUpdateId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {c.totals && (
            <section className="proof-section panel">
              <h2>Admin totals, recomputed</h2>
              <dl className="kv">
                <dt>Funded</dt><dd>{usd(c.totals.fundedScenarioUsd)}</dd>
                <dt>Unresolved</dt><dd>{usd(c.totals.unresolvedScenarioUsd)}</dd>
                <dt>Call total</dt><dd>{usd(c.totals.callTotalScenarioUsd)}</dd>
                <dt>Amulet the admin received</dt><dd>{units(c.totals.adminAmuletReceived)}, verified receipts {units(c.totals.verifiedReceiptUnits)}</dd>
              </dl>
              <p className="small"><a href={evidenceLink(c.path, 'totals.json')}>totals.json</a></p>
            </section>
          )}

          <section className="proof-section panel">
            <h2>Refused without funding</h2>
            <ul>
              {c.negative.map((n) => <li key={n.id}>{n.ok ? 'Held' : 'FAILED'}: {n.id.replace(/^[a-z]+(\[[a-z-]+\])?: /, '')}</li>)}
            </ul>
          </section>
        </>
      )}

      {proof.campaign && (
        <section className="proof-section panel">
          <h2>Generalization campaign</h2>
          <p className="muted small">Seeded run of generated capital calls on the same ledger, compared against an independent reference model. Seed {proof.campaign.seed}, verdict {proof.campaign.verdict}.</p>
          <table>
            <tbody>
              {Object.entries(proof.campaign.metrics).map(([k, v]) => <tr key={k}><td>{METRIC_NAME[k] ?? k}</td><td className="num">{v}</td></tr>)}
            </tbody>
          </table>
          <p className="small"><a href={evidenceLink(proof.campaign.path, 'result.json')}>result.json</a>, <a href={evidenceLink(proof.campaign.path, 'cases.jsonl')}>cases.jsonl</a></p>
        </section>
      )}

      {proof.ablation && (
        <section className="proof-section panel">
          <h2>Same attacks, operator database versus DRAW</h2>
          <table>
            <thead><tr><th>Attack</th><th>Operator database with a paid flag</th><th>DRAW on the ledger</th></tr></thead>
            <tbody>
              {proof.ablation.comparison.map((row) => (
                <tr key={row.attack}><td>{ATTACK_NAME[row.attack] ?? row.attack}</td><td>{row.counterfactualA === 'LANDED' ? 'Succeeds' : 'Stopped'}</td><td>{row.treatment === 'LANDED' ? 'Succeeds' : 'Stopped'}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="small"><a href={evidenceLink(proof.ablation.path, 'result.json')}>result.json</a></p>
        </section>
      )}

      {(proof.damlCore || proof.mutation) && (
        <section className="proof-section panel">
          <h2>Contract tests</h2>
          {proof.damlCore && <p>Daml Script suites: {proof.damlCore.verdict}, {proof.damlCore.tests.length} suites. <a href={evidenceLink(proof.damlCore.path, 'result.json')}>result.json</a></p>}
          {proof.mutation && <p>Deliberately broken guards caught by the tests: {proof.mutation.killed} of {proof.mutation.total}. <a href={evidenceLink(proof.mutation.path, 'result.json')}>result.json</a></p>}
        </section>
      )}
    </>
  );
}
