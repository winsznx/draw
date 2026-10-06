import Link from 'next/link';

import { IconCheckCircle, IconCoin, IconEyeOff, IconLayers, IconLock, IconNotice, IconShield, IconSpark } from '@/components/icons';
import { CallSheet } from '@/components/landing/call-sheet';
import { Lifecycle } from '@/components/landing/lifecycle';
import { usd } from '@/lib/format';
import { loadConfig, loadProof } from '@/lib/server-api';
import type { Proof } from '@/lib/types';

import styles from './landing.module.css';

export const dynamic = 'force-dynamic';

const PARTIES = [
  { id: 'admin', name: 'Fund manager' },
  { id: 'lpA', name: 'LP A' },
  { id: 'lpB', name: 'LP B' },
  { id: 'lpC', name: 'LP C' },
  { id: 'outsider', name: 'Unrelated party' },
] as const;

const RECORDS = [
  { id: 'Fund', name: 'Fund' },
  { id: 'InvestorCommitment', name: 'Commitments' },
  { id: 'CapitalCall', name: 'Call' },
  { id: 'CapitalCallObligation', name: 'Notices' },
] as const;

type Run = NonNullable<Proof['canonical']>;

// The record labels a party read, such as "obligation:lpA", where the part
// after the colon is the party the record belongs to.
function seen(proof: Proof | null, party: string, record: string): string[] | null {
  return proof?.canonical?.visibility?.[party]?.[record] ?? null;
}

function Cell({ labels, total, party }: { labels: string[] | null; total: number; party: string }) {
  if (labels === null) return <td className="num faint">Not loaded</td>;
  if (labels.length === 0) return <td className="num"><span className={styles.none}><IconEyeOff size={15} />None</span></td>;
  const own = labels.every((label) => label.split(':')[1] === party);
  const word = labels.length === total ? (total > 1 ? `All ${total}` : 'Yes') : own ? 'Own only' : `${labels.length} of ${total}`;
  return <td className="num"><span className={styles.seen}>{word}</span></td>;
}

// What LP B's own query returned, or that the run records didn't load.
function LpBSees({ visible }: { visible: boolean | null }) {
  if (visible === null) return <b>Not loaded</b>;
  return visible ? <b>Visible</b> : <b><IconEyeOff size={14} />Not visible</b>;
}

// A run id is the time the run started in UTC, such as 20261006T131900Z.
function runDay(runId: string): string {
  if (!/^\d{8}T\d{6}Z$/.test(runId)) return runId;
  const start = Date.UTC(Number(runId.slice(0, 4)), Number(runId.slice(4, 6)) - 1, Number(runId.slice(6, 8)));
  return new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const verifiedCount = (run: Run): number => run.receipts.filter((r) => r.verdict === 'VERIFIED_FUNDED').length;

function whatWorks(proof: Proof | null): string {
  if (!proof) return 'The run records didn’t load just now.';
  const run = proof.canonical;
  if (!run) return `No ${proof.network} run has passed every check yet.`;
  const skipped = run.skipped?.length ? ` and skipped ${run.skipped.length}` : '';
  const newer = proof.newerRuns?.length ?? 0;
  const newerNote =
    newer > 1 ? ` ${newer} newer runs did not pass, and the proof page lists them.` : newer === 1 ? ' A newer run did not pass, and the proof page lists it.' : '';
  return `What works on ${proof.network}: the ${runDay(run.runId)} scripted run passed ${run.passed} of ${run.passed + run.failed.length} checks${skipped}, and ${verifiedCount(run)} of ${run.receipts.length} LP payments in test Canton Coin were read back as verified funded.${newerNote}`;
}

const localNetEnv = (packageVersion: string | null | undefined): string => (packageVersion ? `LocalNet, package ${packageVersion}` : 'LocalNet');

export default async function Landing() {
  const [proof, config] = await Promise.all([loadProof(), loadConfig()]);
  const seats = !config ? 'a login DRAW’s server holds' : config.seatCredential === 'backend-client' ? 'DRAW’s backend login' : 'one shared login';
  const privateCode = Boolean(config?.accessCodeRequired && config.accessCode === null);
  const codeNote = privateCode ? ' Actions on this demo need an access code from the DRAW team.' : '';
  const readBack = !config
    ? null
    : config.separateVerifier
      ? 'On the live site it has a login of its own.'
      : config.seatCredential === 'backend-client'
        ? 'On the live site it runs on DRAW’s backend login, the same one that settles.'
        : 'On the live site it runs on the same login that settles.';
  const run = proof?.canonical ?? null;
  const verified = run && verifiedCount(run);
  const receipt = run?.receipts[0] ?? null;
  const receiptVerified = receipt?.verdict === 'VERIFIED_FUNDED';
  const receiptMark = receipt && `${receiptVerified ? 'Verified' : receipt.verdict}${receipt.checksPassed === undefined ? '' : `, ${receipt.checksPassed} of ${receipt.checks}`}`;
  const totals = run?.totals ?? null;
  const fundedShare = totals && totals.callTotalScenarioUsd > 0 ? Math.round((totals.fundedScenarioUsd / totals.callTotalScenarioUsd) * 100) : 0;
  const lpBNotices = seen(proof, 'lpB', 'CapitalCallObligation');
  const lpBFund = seen(proof, 'lpB', 'Fund');
  const lpBCall = seen(proof, 'lpB', 'CapitalCall');
  const local = proof?.localnet ?? null;
  const metrics = local?.campaign?.metrics ?? null;
  const attacks = local?.ablation?.comparison ?? null;
  const clean = run?.leaks ? Object.values(run.leaks).every((l) => l.length === 0) : null;
  const oneLogin = run?.credentialSeparation === 'VERIFIER_ONLY' || run?.credentialSeparation === 'NOT_TESTED_SINGLE_CREDENTIAL';
  // The network the API's canonical run is on, which is where these figures come from.
  const runNetwork = proof?.network ?? null;

  const record = [
    {
      figure: run ? `${run.passed}/${run.passed + run.failed.length}` : 'Not loaded',
      label: runNetwork ? `checks on ${runNetwork}` : 'checks in the newest run',
      text: verified === null
        ? 'Settlement, refused payments and overdue on the shared node.'
        : `${verified} ${verified === 1 ? 'LP' : 'LPs'} funded with test Canton Coin, bad payments refused, the unpaid LP marked overdue.`,
      env: runNetwork,
    },
    {
      figure: metrics ? `${metrics.passed}/${metrics.cases}` : 'Not loaded',
      label: 'generated capital calls',
      text: metrics ? `${metrics.obligations} notices, ${metrics.falseFunded} falsely funded, ${metrics.privacyViolations} privacy violations.` : 'Seeded calls with good and bad payments.',
      env: localNetEnv(local?.campaign?.packageVersion),
    },
    {
      figure: attacks ? `${attacks.filter((c) => c.treatment === 'stopped').length}/${attacks.length}` : 'Not loaded',
      label: 'attacks stopped',
      text: attacks ? `The same flow on a database with a paid flag let ${attacks.filter((c) => c.counterfactualA === 'LANDED').length} through.` : 'The same attacks against a database with a paid flag.',
      env: 'LocalNet',
    },
    {
      figure: local?.custody ? `${local.custody.passed}/${local.custody.passed + local.custody.failed.length}` : 'Not loaded',
      label: 'checks, each party holding its key',
      text: 'The participant cannot act for a party without that party’s signature.',
      env: localNetEnv(local?.custody?.packageVersion),
    },
  ];

  return (
    <>
      <section className={styles.heroWrap}>
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.heroEyebrow}><IconLayers size={15} />For fund operations and administrators</span>
            <h1 className={styles.heroTitle}>Capital calls where each LP sees only its own notice.</h1>
            <p className={styles.heroLead}>
              Today a fund emails each notice and matches LP wires from a bank export before it knows who has paid. On DRAW each notice is a
              Canton contract between the fund and one LP, and other LPs can&rsquo;t read it. The LP pays it from its own wallet, the notice
              turns funded in the same transaction that moves the coin, and the fund counts it only after a read-back confirms it.
            </p>
            <div className={styles.ctas}>
              <Link href="/onboard" className="btn btn-light btn-lg">Take a seat in the demo fund</Link>
              <Link href="/proof" className="btn btn-ghost-light btn-lg">See the DevNet proof</Link>
            </div>
            {privateCode && (
              <p className={styles.heroNote}>
                Actions in the demo, starting with creating the demo fund, need an access code from the DRAW team. The proof page needs none.
              </p>
            )}
            <p className={styles.heroNote}>{whatWorks(proof)}</p>
            {config?.accessCode && (
              <p className={styles.accessCode}>Demo access code: <code>{config.accessCode}</code></p>
            )}
            {config?.signIn && (
              <p className={styles.heroNote}>
                Have a HackCanton login with a wallet on its node? Sign in on the seat screen to join as an LP and pay from your own Canton wallet.
              </p>
            )}
          </div>

          <div className={styles.scene}>
            <div className={styles.floatLeft}>
              <p className={styles.floatLabel}>{run?.visibility ? `LP B’s ledger, ${runNetwork} run` : 'LP B’s ledger'}</p>
              <div className={styles.floatRow}><span>LP A&rsquo;s notice</span><LpBSees visible={lpBNotices && lpBNotices.includes('obligation:lpA')} /></div>
              <div className={styles.floatRow}><span>Fund totals</span><LpBSees visible={lpBFund && lpBCall && lpBFund.length + lpBCall.length > 0} /></div>
            </div>
            <div className={styles.sheetSlot}>
              <CallSheet />
            </div>
            <div className={styles.floatRight}>
              <p className={styles.floatLabel}>{receipt ? `Settlement receipt, ${runNetwork} run` : 'Settlement receipt'}</p>
              <p className={styles.floatFig}>{receipt ? `${receipt.receivedAmount} CC` : 'Not loaded'}</p>
              {receipt && <span className={receiptVerified ? 'mark mark-good' : 'mark mark-bad'}>{receiptMark}</span>}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.strip}>
        <p><IconLayers size={16} />Settles on the Canton Network with the CIP-0056 Token Standard</p>
        <ul>
          <li><span className={styles.stripMark}><IconCoin size={16} /></span>Canton Coin</li>
          <li><span className={styles.stripMark}><IconShield size={16} /></span>Daml contracts</li>
          <li><span className={styles.stripMark}><IconLock size={16} /></span>Token allocations</li>
          <li><span className={styles.stripMark}><IconCheckCircle size={16} /></span>Read-back receipts</li>
        </ul>
      </section>

      <section id="how" className={styles.section}>
        <div className={styles.split}>
          <div className="stack-4">
            <span className="eyebrow"><IconNotice size={15} />How a call moves</span>
            <h2 className="t-h2">Issue once. Every LP pays its own notice.</h2>
          </div>
          <p className="t-lead">
            A capital call on DRAW is four steps on the ledger and a read-back. Pick a step to see an example of the record it leaves. Nothing
            is a status someone ticks by hand.
          </p>
        </div>
        <Lifecycle readBack={readBack} />
      </section>

      <section className={styles.section}>
        <div className={styles.center}>
          <span className="eyebrow"><IconSpark size={15} />Why it runs on Canton</span>
          <h2 className="t-h2">Three things a spreadsheet can&rsquo;t promise</h2>
          <p className="t-lead">
            Canton enforces the first two: who can read a notice, and that funded moves with the money. The third is DRAW&rsquo;s read-back,
            which counts only what the ledger already settled.
          </p>
        </div>
        <div className={styles.trio}>
          <article className={styles.tile}>
            <span className={styles.tileIcon}><IconEyeOff size={18} /></span>
            <h3 className={styles.tileTitle}>Private by the ledger</h3>
            <p className={styles.tileText}>A notice is a contract only the fund and that LP can read. Another LP asking for it by its id gets nothing back.</p>
            <div className={styles.mini}>
              <div className={styles.miniRow}><span>LP A</span><b className={styles.miniGood}>Own notice</b></div>
              <div className={styles.miniRow}><span>LP B</span><b className={styles.miniGood}>Own notice</b></div>
              <div className={styles.miniRow}><span>Anyone else</span><b>Nothing</b></div>
            </div>
          </article>
          <article className={`${styles.tile} ${styles.tileBrand}`}>
            <span className={styles.tileIcon}><IconCoin size={18} /></span>
            <h3 className={styles.tileTitle}>Funded follows the money</h3>
            <p className={styles.tileText}>The notice turns funded in the same transaction that moves the coin. A wrong amount, payer or reference is refused.</p>
            <div className={styles.miniDark}>
              <p>Refused by the ledger</p>
              <ul>
                <li>Wrong amount</li>
                <li>Wrong payer</li>
                <li>Wrong reference</li>
                <li>Reused payment</li>
              </ul>
            </div>
          </article>
          <article className={styles.tile}>
            <span className={styles.tileIcon}><IconCheckCircle size={18} /></span>
            <h3 className={styles.tileTitle}>Read back before it counts</h3>
            <p className={styles.tileText}>A read-back step reads each settlement from the ledger and checks it. Only a settlement it confirms counts as deployable.</p>
            <div className={styles.mini}>
              <div className={styles.miniRow}><span>Deployable</span>{totals ? <b className={styles.miniGood}>{usd(totals.fundedScenarioUsd)}</b> : <b>Not loaded</b>}</div>
              <div className={styles.miniRow}><span>Unresolved</span><b>{totals ? usd(totals.unresolvedScenarioUsd) : 'Not loaded'}</b></div>
              <div className={styles.miniBar}><i style={{ width: `${fundedShare}%` }} /></div>
              <p className="t-xs faint">{run && totals ? `${runNetwork} run, ${runDay(run.runId)}` : 'Not loaded'}</p>
            </div>
          </article>
        </div>
      </section>

      <section id="privacy" className={styles.section}>
        <div className={styles.split}>
          <div className="stack-4">
            <span className="eyebrow"><IconShield size={15} />Who sees what</span>
            <h2 className="t-h2">Each party reads its own ledger.</h2>
            <p className="t-lead">
              These are the records each party&rsquo;s own query returned at the end of the {runNetwork ?? 'newest'} run. DRAW doesn&rsquo;t hide
              rows. The ledger never sends them.{oneLogin && ` On ${runNetwork} one login made every query, each for a single party.`}
            </p>
            {run && <p className="t-sm faint">{runNetwork} run {run.runId}.{clean ? ' No party saw a record it should not.' : ''}</p>}
          </div>
          <div className={`module module-pad ${styles.matrixWrap}`}>
            <table className={`table ${styles.matrix}`}>
              <caption className="sr-only">Records each party can read</caption>
              <thead>
                <tr><th scope="col">Party</th>{RECORDS.map((r) => <th key={r.id} scope="col" className="num">{r.name}</th>)}</tr>
              </thead>
              <tbody>
                {PARTIES.map((p) => (
                  <tr key={p.id}>
                    <th scope="row">{p.name}</th>
                    {RECORDS.map((r) => <Cell key={r.id} labels={seen(proof, p.id, r.id)} total={seen(proof, 'admin', r.id)?.length ?? 0} party={p.id} />)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.recordHead}>
          <div className="stack-4">
            <span className="eyebrow"><IconCheckCircle size={15} />The record so far</span>
            <h2 className="t-h2">Every number was written by a test.</h2>
          </div>
          <Link href="/proof" className="btn">Open the proof</Link>
        </div>
        <div className={styles.record}>
          {record.map((item) => (
            <div key={item.label} className={styles.recordItem}>
              {item.env && <span className={styles.env}>{item.env}</span>}
              <p className={styles.recordFig}>{item.figure}</p>
              <p className="t-h4">{item.label}</p>
              <p className="t-sm muted">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="questions" className={styles.section}>
        <div className={styles.faqGrid}>
          <div className="stack-4">
            <span className="eyebrow"><IconNotice size={15} />Questions</span>
            <h2 className="t-h2">Know what you&rsquo;re looking at.</h2>
            <div className={`module module-pad ${styles.brief}`}>
              <p className="t-h4">DRAW in brief</p>
              <dl className="kv">
                <dt>Network</dt><dd>Canton DevNet, HackCanton node</dd>
                <dt>Settles in</dt><dd>Test Canton Coin</dd>
                <dt>Standard</dt><dd>CIP-0056 allocations and allocation requests</dd>
                {config?.release && <><dt>Contracts</dt><dd>Daml package draw {config.release.version}, as the live site runs it</dd></>}
              </dl>
            </div>
          </div>
          <div className={styles.faq}>
            {[
              ['Is this real money?', 'No. It runs on the Canton DevNet with test Canton Coin. Dollar figures are the business scenario, and the coin is what actually moves.'],
              ['Who holds the keys?', `On LocalNet a scripted run had every party sign with its own key, and an earlier version of this web app let each person make a key in the browser. The current browser-key flow hasn’t run on LocalNet. On the shared HackCanton DevNet node, parties with their own keys aren’t enabled for teams yet, so ${seats} acts for the demo seats there. An LP that signs in with its own HackCanton login acts for its own party from its own browser instead. The app says which mode you’re in.`],
              ['Can I pay from a real Canton wallet?', `On DevNet, yes, if your HackCanton login has a wallet on the HackCanton node. Sign in on the seat screen and join as an LP. Your notice also shows up in the node’s Canton Coin wallet as an allocation request, and pressing Accept there pays it. DRAW’s server never receives your login. Every recorded run so far signed in with the team’s own login as the LP.${codeNote}`],
              ['Why Canton?', 'Canton gives each contract a fixed set of parties who can read it, and settles a token transfer and a state change in one transaction. Those two properties are what make a private notice and a provable funded status possible.'],
              ['What does the fund manager see?', 'Every notice in its fund, the payments waiting against them, and two totals: deployable now and unresolved.'],
              ['Can an LP see the other LPs?', 'No. An LP’s ledger returns its own commitment and notices only. Opening another LP’s notice link shows nothing, because the ledger returns nothing.'],
              ['Who can see the payment?', `The notice and the commitment are private. Only the fund’s party and that LP’s party can read them, plus the node that hosts them. On DevNet ${seats} reads for every demo seat. Per the Splice Scan API docs, the Canton Coin transfer that pays a notice appears in the network’s Scan service with its random reference and both party ids, whose hints such as draw-lpa are readable, while the notice and the commitment don’t. That comes from the docs, and DRAW hasn’t checked it against Scan. In production the fund would settle in a tokenized dollar through the same Token Standard allocation interface. The USDCx registry lists that interface, but DRAW hasn’t been run with USDCx.`],
            ].map(([q, a]) => (
              <details key={q} className={styles.qa}>
                <summary>{q}<span aria-hidden="true" /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.closingWrap}>
        <div className={styles.closing}>
          <h2 className={styles.closingTitle}>Run a capital call end to end.</h2>
          <p>Take a seat as the fund manager or one of three LPs.{codeNote}</p>
          <Link href="/onboard" className="btn btn-light btn-lg">Take a seat</Link>
        </div>
      </section>
    </>
  );
}
