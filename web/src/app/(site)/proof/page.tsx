import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { coin, networkNote, roleName, units, usd } from '@/lib/format';
import { loadConfig, loadProof } from '@/lib/server-api';
import type { NewerRun, Suites } from '@/lib/types';

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
const GATE_NAME: Record<string, string> = {
  DEVNET_E2E: 'End to end',
  LOCAL_SETTLEMENT: 'Settlement',
  PRIVACY_CAMPAIGN: 'Privacy checks',
  CUSTODY: 'Custody',
};
// What a run's result.json says about its ledger logins and keys.
const SEPARATION_NOTE: Record<string, string> = {
  VERIFIER_ONLY: 'The demo seats shared one ledger login. The read-back had a login of its own.',
  TESTED: 'Each demo seat and the read-back had a ledger login of its own.',
  SEATS_ONLY: 'Each demo seat had a ledger login of its own. The read-back used one of them.',
  NOT_TESTED_SINGLE_CREDENTIAL: 'One ledger login acted for every demo seat and for the read-back.',
};
const CUSTODY_NOTE: Record<string, string> = {
  SERVER_SUBMITS_FOR_PARTIES: 'The run’s own login submitted for every party. No party held its own key.',
  EACH_PARTY_SIGNS_WITH_ITS_OWN_KEY: 'Every party signed its own transactions with its own key. All the keys sat on the machine that ran the script, so this shows the ledger needs each party’s signature, not that separate people held the keys.',
};
// With external parties one login can submit for all of them, but only what each party's key signed.
const SUBMITS_ONLY_SIGNED = 'One ledger login submitted for every party and read each settlement back. It could not act for a party without that party’s signature.';
// The probe check of the read-back's client, as scripts/demo/probe.mjs names it.
const PROBE_VERIFIER = "credentials: the verifier's client only reads, as the fund's party";

// Runs before the custom domain went through the worker's workers.dev address, the same site.
const siteName = (site: string): string => {
  const host = site.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return host.endsWith('.workers.dev') ? `${host}, this site’s address before drawcalls.xyz` : host;
};

// Browser journeys, in the order a visitor would try them.
const JOURNEY_ORDER = ['journey', 'hackcanton-wallet', 'hackcanton', 'browser-keys'];
const JOURNEY_NAME: Record<string, string> = {
  journey: 'A capital call on the demo seats',
  'hackcanton-wallet': 'An LP with its own HackCanton login approves the call in its Canton Coin wallet',
  hackcanton: 'An LP with its own HackCanton login pays from its wallet in DRAW',
  'browser-keys': 'Every person signs with a key made in the browser',
};

const file = (path: string, name: string) => `/${path}/${name}`;

// "05-lpb-cannot-read.png" reads "LP B cannot read".
const SHOT_WORD: Record<string, string> = { lp: 'LP', lpa: 'LP A', lpb: 'LP B', lpc: 'LP C' };
function caption(shot: string): string {
  const text = shot.replace(/^\d+-|\.png$/g, '').split('-').map((word) => SHOT_WORD[word] ?? word).join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
const short = (id: string, n = 14) => `${id.slice(0, n)}…`;
const packageNote = (version: string | null | undefined) => (version ? `, package ${version}` : '');

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

// Run folders that did not pass: a result that records a failure, or no result yet.
function FailedRuns({ title, runs }: { title: string; runs: NewerRun[] }) {
  return (
    <>
      <p className="t-h4">{title}</p>
      <ul className={styles.facts}>
        {runs.map((run) => (
          <li key={run.runId}>
            <span className="mark mark-bad">{run.status === 'FAIL' ? 'Did not pass' : 'Did not finish'}</span>
            <span>
              {run.file ? <a className="link" href={file(run.path, run.file)}>Run {run.runId}</a> : `Run ${run.runId}`}
              {run.passed !== null && run.total !== null && `, ${run.passed} of ${run.total} checks`}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function SuiteSections({ suites, env }: { suites: Suites; env: string }) {
  return (
    <>
      {suites.campaign && (
        <Section id={`campaign-${env}`} title={`${suites.campaign.metrics.cases} generated capital calls`} env={env} lead={`Seeded calls with good and bad payments, compared against an independent reference model. Seed ${suites.campaign.seed}, verdict ${suites.campaign.verdict}${packageNote(suites.campaign.packageVersion)}.`}>
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
            {suites.damlCore && <li>Daml Script suites {suites.damlCore.verdict}, {suites.damlCore.tests.length} suites{packageNote(suites.damlCore.packageVersion)}. <a className="link" href={file(suites.damlCore.path, 'result.json')}>result.json</a></li>}
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
  const newer = proof.newerRuns ?? [];
  const probe = proof.probe ?? null;
  const probeCredentials = probe?.checks.filter((check) => check.id.startsWith('credentials:')) ?? [];
  // The probe's check speaks for this run's read-back only when both read as the same ledger user.
  const probeVerifier = probe?.verifierUser && probe.verifierUser === c?.verifierUser ? probe.checks.find((check) => check.id === PROBE_VERIFIER) : undefined;
  const seatsShared = c?.credentialSeparation === 'VERIFIER_ONLY' || c?.credentialSeparation === 'NOT_TESTED_SINGLE_CREDENTIAL';
  const hidden = c?.reasonsHidden?.length ?? 0;
  const ownKeys = c?.custody === 'EACH_PARTY_SIGNS_WITH_ITS_OWN_KEY';
  const signing = [
    c?.credentialSeparation && (ownKeys && c.credentialSeparation === 'NOT_TESTED_SINGLE_CREDENTIAL'
      ? SUBMITS_ONLY_SIGNED
      : SEPARATION_NOTE[c.credentialSeparation] ?? c.credentialSeparation),
    c?.custody && (CUSTODY_NOTE[c.custody] ?? c.custody),
    ...(c?.skipped ?? []).map((s) => `Skipped “${s.id}”${s.reason ? `: ${s.reason.replace(/\.$/, '')}` : ''}.`),
    hidden === 1 ? '1 refusal came back with only a trace id, so the run could not check its reason.' : null,
    hidden > 1 ? `${hidden} refusals came back with only a trace id, so the run could not check their reason.` : null,
  ].filter((line): line is string => Boolean(line));

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className="t-display">Proof</h1>
        <p className="t-lead">
          What the scripted runs produced. A script wrote every number on this page into a result file, and every file is linked. LocalNet and
          DevNet results are kept apart.
        </p>
        {config && <p className="t-sm muted">The live site right now: {networkNote(config)}</p>}
      </header>

      {!c ? (
        <div className="stack-4">
          <p className="panel">No {proof.network} run has passed every check yet.</p>
          {newer.length > 0 && <FailedRuns title="Runs that did not pass" runs={newer} />}
        </div>
      ) : (
        <>
          <Section id="runs" title="The canonical run" env={proof.network} lead={`The newest ${proof.network} run that passed every check.`}>
            <div className={`sheet sheet-pad ${styles.runCard}`}>
              <div className={styles.runFig}>
                <p className="t-figure">{c.passed}/{c.passed + c.failed.length}</p>
                <p className="t-sm muted">checks passed</p>
                <div className="row" style={{ gap: 6 }}>
                  {Object.entries(c.gates).map(([gate, verdict]) => <span key={gate} className={verdict === 'PASS' ? 'mark mark-good' : 'mark mark-bad'}>{GATE_NAME[gate] ?? gate} {verdict}</span>)}
                </div>
              </div>
              <dl className="kv">
                <dt>Run</dt><dd><a className="link" href={file(c.path, 'result.json')}>{c.runId}</a></dd>
                <dt>Canton</dt><dd>{c.canton}</dd>
                <dt>Commit</dt><dd className="mono">{c.commit.slice(0, 12)}</dd>
                <dt>Package</dt><dd className="mono">{c.packageVersion ? `${c.packageVersion}, ${short(c.packageId, 20)}` : short(c.packageId, 20)}</dd>
                <dt>Fund</dt><dd className="mono">{c.fundId}</dd>
                {c.instrument.id === 'Amulet'
                  ? <><dt>Instrument</dt><dd>Amulet, the ledger&rsquo;s name for Canton Coin</dd></>
                  : <><dt>Instrument id</dt><dd>{c.instrument.id}</dd></>}
              </dl>
            </div>
            {signing.length > 0 && (
              <>
                <p className="t-h4">How this run signed</p>
                <ul className={styles.facts}>
                  {signing.map((line) => <li key={line}>{line}</li>)}
                </ul>
              </>
            )}
            {probe && probeCredentials.length > 0 && (
              <>
                <p className="t-h4">What probe {probe.runId} found about DRAW&rsquo;s logins</p>
                <ul className={styles.facts}>
                  {probeCredentials.map((check) => (
                    <li key={check.id}>
                      <span className={check.outcome === check.expectation ? 'mark mark-good' : 'mark mark-bad'}>{check.outcome === check.expectation ? 'As expected' : 'Not as expected'}</span> {check.id.replace(/^credentials: /, '')}
                    </li>
                  ))}
                </ul>
                <p className="t-sm"><a className="link" href={file(probe.path, 'result.json')}>result.json</a></p>
              </>
            )}
            {newer.length > 0 && <FailedRuns title="Newer runs that did not pass" runs={newer} />}
          </Section>

          {c.visibility && (
            <Section
              id="privacy"
              title="Who could read what"
              env={proof.network}
              lead={`Each row is one party’s own ledger query after the call settled${seatsShared ? `, made through the one login ${ownKeys ? 'that submitted for every party' : 'the demo seats shared'}` : ''}. Leaks counts any contract a party saw that it is not a party to.`}
            >
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
            title="Settlements, read back from the ledger"
            env={proof.network}
            lead={`After each settlement, a read-back step reads the transaction and the fund’s holdings from the ledger and writes the receipt before the notice counts as funded. ${
              !c.verifierCheck?.ran
                ? `In this ${proof.network} run that step read as the same ledger user that ${ownKeys ? 'submitted for every party' : 'the seats used'}.`
                : c.verifierCheck.ok
                  ? `In this ${proof.network} run that step had a login of its own, and the ledger refused it when it tried to act as the fund.`
                  : `In this ${proof.network} run that step had a login of its own, but the ledger did not refuse it when it tried to act as the fund.`
            }${
              probe && c.verifierCheck?.ran && probeVerifier && probeVerifier.outcome !== probeVerifier.expectation
                ? ` Probe ${probe.runId} did not find that login read-only.`
                : ''
            }`}
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
                    <dt>Checks</dt><dd>{r.checksPassed === undefined ? `${r.checks} recorded` : `${r.checksPassed} of ${r.checks} passed`}</dd>
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

      {proof.browser && proof.browser.length > 0 && (
        <Section
          id="browser"
          title="In a browser, on the live site"
          env={proof.network}
          lead="A real browser clicks through the deployed site against the ledger. Each journey wrote its own steps and screenshots as it ran. This is the newest run of each. The sign-in runs so far all used the team’s own HackCanton login as the LP."
        >
          <div className="stack-4">
            {[...proof.browser].sort((a, b) => JOURNEY_ORDER.indexOf(a.journey) - JOURNEY_ORDER.indexOf(b.journey)).map((run) => (
              <div key={run.journey} className={`sheet sheet-pad stack-4 ${styles.journey}`}>
                <div className="row between">
                  <p className="t-h3">{JOURNEY_NAME[run.journey] ?? run.test}</p>
                  <span className={run.verdict === 'PASS' ? 'mark mark-good' : 'mark mark-bad'}>{run.verdict} {run.steps.length}/{run.expectedSteps}</span>
                </div>
                <ol className={styles.steps}>
                  {run.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
                {run.shots.length > 0 && (
                  <div className={styles.shots}>
                    {run.shots.map((shot) => (
                      <a key={shot} href={file(run.path, shot)} className={styles.shot} target="_blank" rel="noreferrer">
                        <span className={styles.shotFrame}><img src={file(run.path, shot)} alt="" loading="lazy" /></span>
                        <span className={styles.shotLabel}>{caption(shot)}</span>
                      </a>
                    ))}
                  </div>
                )}
                <p className="t-sm muted">
                  {run.siteSetup?.network
                    ? `When it ran: ${networkNote({ network: run.siteSetup.network, browserKeys: false, singleCredential: run.siteSetup.singleCredential ?? true, seatCredential: run.siteSetup.seatCredential, separateVerifier: run.siteSetup.separateVerifier })}`
                    : 'This run did not record how the site signed.'}
                </p>
                {run.siteSetup?.separateVerifier === false && run.steps.some((step) => step.includes('verifier confirmed')) && (
                  <p className="t-sm muted">&ldquo;Verifier confirmed&rdquo; in this run means DRAW&rsquo;s read-back step on that same login.</p>
                )}
                <p className="t-sm"><a className="link" href={file(run.path, 'result.json')}>{run.runId}</a>{run.site ? <span className="muted"> against {siteName(run.site)}</span> : null}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <SuiteSections suites={proof} env={proof.network} />

      {local && (
        <>
          {local.custody && (
            <Section
              id="custody"
              title="Each party holds its own key"
              env="LocalNet"
              lead={`A LocalNet run in which every party signed its own transactions with an Ed25519 key${local.custody.packageVersion ? `, on package ${local.custody.packageVersion}` : ''}. The participant can’t act for a party without its signature, and another party’s key is refused.`}
            >
              <div className={`sheet sheet-pad ${styles.runCard}`}>
                <div className={styles.runFig}>
                  <p className="t-figure">{local.custody.passed}/{local.custody.passed + local.custody.failed.length}</p>
                  <p className="t-sm muted">checks passed</p>
                  <span className={local.custody.gate === 'PASS' ? 'mark mark-good' : 'mark mark-bad'}>{GATE_NAME.CUSTODY} {local.custody.gate}</span>
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
