import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { coin, networkNote, roleName, units, usd } from '@/lib/format';
import { loadConfig, loadProof } from '@/lib/server-api';
import type { Suites } from '@/lib/types';

import styles from './proof.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Proof', description: 'What the scripted DRAW runs produced, with every result file linked.' };

const CONTRACTS = ['Fund', 'CapitalCall', 'InvestorCommitment', 'CapitalCallObligation', 'Allocation'] as const;
const CONTRACT_NAME: Record<(typeof CONTRACTS)[number], string> = {
  Fund: 'Fund',
  CapitalCall: 'Call header',
  InvestorCommitment: 'Commitments',
  CapitalCallObligation: 'Notices',
  Allocation: 'Payments',
};
const ATTACK_NAME: Record<string, string> = {
  'mark-unpaid-funded': 'Mark an unpaid investor funded',
  'read-without-role-filter': 'Read another investor’s notice',
  'replay-payment-evidence': 'Reuse one payment for another notice',
  'funded-without-asset-movement': 'Funded with no coin moved',
  'lp-mutates-own-obligation': 'Investor changes its own notice',
};
const METRIC_NAME: Record<string, string> = {
  cases: 'Capital calls',
  obligations: 'Notices',
  passed: 'Calls passed',
  failed: 'Calls failed',
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

const file = (path: string, name: string) => `/${path}/${name}`;
const short = (id: string, n = 14) => `${id.slice(0, n)}…`;

function Section({ id, title, env, lead, children }: { id: string; title: string; env: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className="t-h2">{title}</h2>
        <span className={styles.env}>{env}</span>
      </div>
      {lead && <p className="muted prose">{lead}</p>}
      {children}
    </section>
  );
}

function SuiteSections({ suites, env }: { suites: Suites; env: string }) {
  return (
    <>
      {suites.campaign && (
        <Section id={`campaign-${env}`} title="100 generated capital calls" env={env} lead={`Seeded calls with good and bad payments, compared against an independent reference model. Seed ${suites.campaign.seed}, verdict ${suites.campaign.verdict}.`}>
          <div className={`sheet sheet-pad ${styles.metrics}`}>
            {Object.entries(suites.campaign.metrics).map(([k, v]) => (
              <div key={k}><p className="t-xs faint">{METRIC_NAME[k] ?? k}</p><p className={styles.metric}>{v}</p></div>
            ))}
          </div>
          <p className="t-sm"><a className="link" href={file(suites.campaign.path, 'result.json')}>result.json</a>, <a className="link" href={file(suites.campaign.path, 'cases.jsonl')}>cases.jsonl</a></p>
        </Section>
      )}
      {suites.ablation && (
        <Section id={`ablation-${env}`} title="Same attacks, database versus ledger" env={env} lead="The same capital call run on an operator database with a paid flag, and on DRAW.">
          <div className="sheet sheet-pad">
            <table className="table table-stack">
              <thead><tr><th>Attack</th><th>Database with a paid flag</th><th>DRAW on Canton</th></tr></thead>
              <tbody>
                {suites.ablation.comparison.map((row) => (
                  <tr key={row.attack}>
                    <td className="wide"><strong>{ATTACK_NAME[row.attack] ?? row.attack}</strong></td>
                    <td>{row.counterfactualA === 'LANDED' ? <span className="mark mark-bad">Succeeds</span> : <span className="mark">Stopped</span>}</td>
                    <td>{row.treatment === 'LANDED' ? <span className="mark mark-bad">Succeeds</span> : <span className="mark mark-good">Stopped</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="t-sm"><a className="link" href={file(suites.ablation.path, 'result.json')}>result.json</a></p>
        </Section>
      )}
      {(suites.damlCore || suites.mutation) && (
        <Section id={`tests-${env}`} title="Contract tests" env={env}>
          <ul className={styles.facts}>
            {suites.damlCore && <li>Daml Script suites {suites.damlCore.verdict}, {suites.damlCore.tests.length} suites. <a className="link" href={file(suites.damlCore.path, 'result.json')}>result.json</a></li>}
            {suites.mutation && <li>Deliberately broken guards caught by the tests: {suites.mutation.killed} of {suites.mutation.total}. <a className="link" href={file(suites.mutation.path, 'result.json')}>result.json</a></li>}
          </ul>
        </Section>
      )}
    </>
  );
}

export default async function ProofPage() {
  const [proof, config] = await Promise.all([loadProof(), loadConfig()]);
  if (!proof) {
    return (
      <div className={styles.page}>
        <h1 className="t-h1">Proof</h1>
        <p className="muted">The run records could not be loaded right now. Try again in a minute.</p>
      </div>
    );
  }
  const c = proof.canonical;
  const local = proof.localnet;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className="t-display">Proof</h1>
        <p className="t-lead">
          What the scripted runs produced. A script wrote every number on this page into a result file, and every file is linked. LocalNet and
          DevNet results are kept apart.
        </p>
        {config && <p className="t-sm muted">{networkNote(config)}</p>}
      </header>

      {!c ? <p className="panel">No canonical run on {proof.network} yet.</p> : (
        <>
          <Section id="runs" title="The canonical run" env={proof.network}>
            <div className={`sheet sheet-pad ${styles.runCard}`}>
              <div className={styles.runFig}>
                <p className="t-figure">{c.passed}/{c.passed + c.failed.length}</p>
                <p className="t-sm muted">checks passed</p>
                <div className="row" style={{ gap: 6 }}>
                  {Object.entries(c.gates).map(([gate, verdict]) => <span key={gate} className={verdict === 'PASS' ? 'mark mark-good' : 'mark mark-bad'}>{gate} {verdict}</span>)}
                </div>
              </div>
              <dl className="kv">
                <dt>Run</dt><dd><a className="link" href={file(c.path, 'result.json')}>{c.runId}</a></dd>
                <dt>Canton</dt><dd>{c.canton}</dd>
                <dt>Commit</dt><dd className="mono">{c.commit.slice(0, 12)}</dd>
                <dt>Package</dt><dd className="mono">{short(c.packageId, 20)}</dd>
                <dt>Fund</dt><dd className="mono">{c.fundId}</dd>
                <dt>Instrument id</dt><dd>{c.instrument.id}</dd>
              </dl>
            </div>
          </Section>

          {c.visibility && (
            <Section id="privacy" title="Who could read what" env={proof.network} lead="Each row is one party reading the ledger as itself after the call settled. Leaks counts any contract a party saw that it is not a party to.">
              <div className={`sheet sheet-pad ${styles.scroll}`}>
                <table className="table">
                  <thead><tr><th>Reader</th>{CONTRACTS.map((k) => <th key={k}>{CONTRACT_NAME[k]}</th>)}<th className="num">Leaks</th></tr></thead>
                  <tbody>
                    {Object.entries(c.visibility).map(([reader, row]) => (
                      <tr key={reader}>
                        <td><strong>{roleName(reader)}</strong></td>
                        {CONTRACTS.map((k) => {
                          const seen = row[k] ?? [];
                          return <td key={k} className={seen.length ? styles.yes : styles.no}>{seen.length ? seen.map((s) => (s.split(':')[1] ? roleName(s.split(':')[1]) : 'Yes')).join(', ') : 'None'}</td>;
                        })}
                        <td className="num">{c.leaks?.[reader]?.length ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="t-sm"><a className="link" href={file(c.path, 'visibility-final.json')}>visibility-final.json</a></p>
            </Section>
          )}

          <Section
            id="settlements"
            title="Settlements, read back by a separate step"
            env={proof.network}
            lead="After each settlement, a separate step reads the transaction and the fund's holdings back from the ledger and issues the receipt before the notice counts as funded. On DevNet that step uses the same shared login as every seat. On LocalNet it has its own read-only login."
          >
            <div className={styles.receipts}>
              {c.receipts.map((r) => (
                <div key={r.obligationRef} className={`sheet sheet-pad stack-3 ${styles.receipt}`}>
                  <div className="row between">
                    <p className="t-h3">{units(r.receivedAmount)} {coin(r.expected.instrument.id)}</p>
                    <span className={r.verdict === 'VERIFIED_FUNDED' ? 'mark mark-good' : 'mark mark-bad'}>{r.verdict === 'VERIFIED_FUNDED' ? 'Verified funded' : r.verdict}</span>
                  </div>
                  <dl className="kv">
                    <dt>Notice</dt><dd className="mono">{r.obligationRef}</dd>
                    <dt>Business amount</dt><dd>{usd(Number(r.expected.scenarioAmountUsd))}</dd>
                    <dt>State</dt><dd>{r.stateBefore} to {r.stateAfter}</dd>
                    <dt>Checks</dt><dd>{r.checks} passed</dd>
                    <dt>Update</dt><dd className="mono">{short(r.claimedUpdateId, 24)}</dd>
                  </dl>
                </div>
              ))}
            </div>
          </Section>

          {c.totals && (
            <Section id="totals" title="Fund totals, recomputed" env={proof.network} lead="The fund manager's totals equal the sum of the notices and the coin the fund actually received.">
              <div className={`sheet sheet-pad ${styles.metrics}`}>
                <div><p className="t-xs faint">Funded</p><p className={styles.metric}>{usd(c.totals.fundedScenarioUsd)}</p></div>
                <div><p className="t-xs faint">Unresolved</p><p className={styles.metric}>{usd(c.totals.unresolvedScenarioUsd)}</p></div>
                <div><p className="t-xs faint">Call total</p><p className={styles.metric}>{usd(c.totals.callTotalScenarioUsd)}</p></div>
                <div><p className="t-xs faint">Coin received</p><p className={styles.metric}>{units(c.totals.adminAmuletReceived)} CC</p></div>
              </div>
              <p className="t-sm"><a className="link" href={file(c.path, 'totals.json')}>totals.json</a></p>
            </Section>
          )}

          <Section id="refused" title="Refused without funding" env={proof.network}>
            <ul className={styles.facts}>
              {c.negative.map((n) => (
                <li key={n.id}><span className={n.ok ? 'mark mark-good' : 'mark mark-bad'}>{n.ok ? 'Held' : 'Failed'}</span> {n.id.replace(/^[a-z]+(\[[a-z-]+\])?: /, '')}</li>
              ))}
            </ul>
          </Section>
        </>
      )}

      <SuiteSections suites={proof} env={proof.network} />

      {local && (
        <>
          {local.custody && (
            <Section id="custody" title="Each party holds its own key" env="LocalNet" lead="The same run with every party signing its own transactions with an Ed25519 key. The participant cannot act for a party without its signature, and another party's key is refused.">
              <div className={`sheet sheet-pad ${styles.runCard}`}>
                <div className={styles.runFig}>
                  <p className="t-figure">{local.custody.passed}/{local.custody.passed + local.custody.failed.length}</p>
                  <p className="t-sm muted">checks passed</p>
                  <span className={local.custody.gate === 'PASS' ? 'mark mark-good' : 'mark mark-bad'}>CUSTODY {local.custody.gate}</span>
                </div>
                <dl className="kv">
                  <dt>Run</dt><dd><a className="link" href={file(local.custody.path, 'result.json')}>{local.custody.runId}</a></dd>
                </dl>
              </div>
            </Section>
          )}
          <SuiteSections suites={local} env="LocalNet" />
        </>
      )}
    </div>
  );
}
