import Link from 'next/link';

import { CallSheet } from '@/components/landing/call-sheet';
import { loadProof } from '@/lib/server-proof';
import type { Proof } from '@/lib/types';

import styles from './landing.module.css';

export const dynamic = 'force-dynamic';

const STEPS = [
  { title: 'Invite', who: 'Fund manager', text: 'Each LP gets a private commitment invitation and accepts it with its own party.' },
  { title: 'Call', who: 'Fund manager', text: 'One capital call becomes a separate notice per LP, for that LP’s amount only.' },
  { title: 'Pay', who: 'LP', text: 'The LP locks the exact amount of Canton Coin for the fund against its notice reference.' },
  { title: 'Settle', who: 'Fund manager', text: 'Settling moves the coin and marks the notice funded in the same transaction. A wrong amount, payer or reference is refused by the ledger.' },
  { title: 'Verify', who: 'Independent verifier', text: 'A read-only verifier reads the settlement back. Only then does the money count as deployable.' },
];

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
  { id: 'CapitalCall', name: 'Call header' },
  { id: 'CapitalCallObligation', name: 'Notices' },
] as const;

function visibleCount(proof: Proof | null, party: string, record: string): number | null {
  const matrix = proof?.canonical?.visibility;
  const seen = matrix?.[party]?.[record];
  return seen ? seen.length : null;
}

function Cell({ count, total }: { count: number | null; total: number }) {
  if (count === null) return <td className="num faint">?</td>;
  if (count === 0) return <td className="num"><span className={styles.none}>None</span></td>;
  const word = total > 1 && count === total ? `All ${count}` : total > 1 && count === 1 ? 'Own only' : 'Yes';
  return <td className="num"><span className={styles.seen}>{word}</span></td>;
}

export default async function Landing() {
  const proof = await loadProof();
  const run = proof?.canonical ?? null;
  const receipt = run?.receipts[0] ?? null;
  const local = proof?.localnet ?? null;

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1 className="t-display">Capital calls that only the right investor can read.</h1>
          <p className="t-lead">
            DRAW sends each LP a private notice, lets it pay in Canton Coin, and counts the money as deployable only after an
            independent check confirms it reached the fund.
          </p>
          <div className={styles.ctas}>
            <Link href="/app" className="btn btn-primary btn-lg">Open the app</Link>
            <Link href="/proof" className="btn btn-lg">See the DevNet proof</Link>
          </div>
          <p className="t-sm faint">Running on the Canton DevNet with test Canton Coin.</p>
        </div>
        <div className={styles.heroSheet}>
          <CallSheet />
          <p className={styles.sheetCaption}>Switch parties to see what each one&rsquo;s ledger returns.</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.compare}>
          <div>
            <h2 className="t-h2">A capital call today is a PDF, a wire and a spreadsheet.</h2>
          </div>
          <div className={styles.compareCols}>
            <div className="stack-3">
              <p className={styles.colHead}>Today</p>
              <ul className={styles.list}>
                <li>Notices go out by email, so every LP&rsquo;s amount sits in someone&rsquo;s inbox.</li>
                <li>Ops matches wires to LPs by hand from bank statements.</li>
                <li>&ldquo;Paid&rdquo; is a checkbox someone ticks.</li>
              </ul>
            </div>
            <div className="stack-3">
              <p className={styles.colHead}>With DRAW</p>
              <ul className={`${styles.list} ${styles.listGood}`}>
                <li>Each notice is a contract only the fund and that LP can read.</li>
                <li>The payment carries the notice reference, so matching is exact.</li>
                <li>Funded is set by the settlement itself and then checked by a separate verifier.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className={styles.section}>
        <h2 className="t-h2">How a call moves</h2>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.stepNum}>{index + 1}</span>
              <p className="t-h3">{step.title}</p>
              <p className={styles.stepWho}>{step.who}</p>
              <p className="t-sm muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="privacy" className={styles.section}>
        <div className={styles.split}>
          <div className="stack-4">
            <h2 className="t-h2">Who sees what</h2>
            <p className="muted prose">
              Privacy is enforced by the ledger, not by the app hiding rows. Each column below is what that party&rsquo;s own ledger
              query returned at the end of the DevNet run. Asking for another LP&rsquo;s notice by its contract id returns nothing.
            </p>
            {run && <p className="t-sm faint">DevNet run {run.runId}. {run.leaks && Object.values(run.leaks).every((l) => l.length === 0) ? 'No party saw a record it should not.' : ''}</p>}
          </div>
          <div className={`sheet sheet-pad ${styles.matrixWrap}`}>
            <table className={`table ${styles.matrix}`}>
              <caption className="sr-only">Records each party can read</caption>
              <thead>
                <tr>
                  <th scope="col">Party</th>
                  {RECORDS.map((r) => <th key={r.id} scope="col" className="num">{r.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {PARTIES.map((p) => (
                  <tr key={p.id}>
                    <th scope="row">{p.name}</th>
                    {RECORDS.map((r) => {
                      const total = visibleCount(proof, 'admin', r.id) ?? 0;
                      return <Cell key={r.id} count={visibleCount(proof, p.id, r.id)} total={total} />;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {!run && <p className="t-sm faint">The run record could not be loaded right now.</p>}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.split}>
          <div className="stack-4">
            <h2 className="t-h2">Funded means someone else checked</h2>
            <p className="muted prose">
              A submitted payment is not funded. A signed transaction is not funded. A notice counts as funded only when the
              settlement transaction moved the exact coin from that LP to the fund, and a separate read-only verifier fetched that
              transaction and agreed.
            </p>
            <Link href="/proof" className="link">Read every check</Link>
          </div>
          {receipt ? (
            <div className={`sheet sheet-pad ${styles.receipt}`}>
              <div className="row between">
                <p className="t-h3">Settlement receipt</p>
                <span className="mark mark-good">Verified funded</span>
              </div>
              <p className={styles.receiptAmt}>{receipt.receivedAmount} CC<span> received by the fund</span></p>
              <dl className="kv">
                <dt>Notice</dt><dd className="mono">{receipt.obligationRef}</dd>
                <dt>State</dt><dd>{receipt.stateBefore} to {receipt.stateAfter}</dd>
                <dt>Checks</dt><dd>{receipt.checks} of {receipt.checks} passed</dd>
                <dt>Update</dt><dd className="mono">{receipt.claimedUpdateId.slice(0, 28)}…</dd>
              </dl>
              <p className="t-xs faint">From DevNet run {run?.runId}.</p>
            </div>
          ) : (
            <div className="panel"><p className="muted">The receipt could not be loaded right now. The proof page has the full record.</p></div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className="t-h2">The record so far</h2>
        <div className={styles.record}>
          <RecordItem
            figure={run ? `${run.passed}/${run.passed + run.failed.length}` : 'Not loaded'}
            label="checks passed on DevNet"
            text="Two LPs funded with real test Canton Coin, bad payments refused, the unpaid LP marked overdue."
            env="DevNet"
          />
          <RecordItem
            figure={local?.campaign ? `${local.campaign.metrics.passed ?? 0}/${local.campaign.metrics.cases ?? 0}` : 'Not loaded'}
            label="seeded capital calls"
            text={local?.campaign ? `${local.campaign.metrics.obligations ?? 0} obligations, nothing falsely funded, no party saw another’s records.` : 'Seeded campaign record unavailable.'}
            env="LocalNet"
          />
          <RecordItem
            figure={local?.ablation ? `${local.ablation.comparison.filter((c) => c.treatment === 'stopped').length}/${local.ablation.comparison.length}` : 'Not loaded'}
            label="attacks stopped"
            text={local?.ablation ? `The same flow on a database with a paid flag let ${local.ablation.comparison.filter((c) => c.counterfactualA === 'LANDED').length} of them through.` : 'Ablation record unavailable.'}
            env="LocalNet"
          />
          <RecordItem
            figure={local?.custody ? `${local.custody.passed}/${local.custody.passed + local.custody.failed.length}` : 'Not loaded'}
            label="checks with keys held by each party"
            text="Every party signs its own transactions. The participant cannot act for a party without its signature."
            env="LocalNet"
          />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.split}>
          <h2 className="t-h2">Questions</h2>
          <div className={styles.faq}>
            <details className="more">
              <summary>Is this real money?</summary>
              <p className="muted">No. It runs on the Canton DevNet with test Canton Coin. Dollar figures are the business scenario; the coin is what actually moves.</p>
            </details>
            <details className="more">
              <summary>Who holds the keys?</summary>
              <p className="muted">
                On LocalNet each party creates a key in its own browser and signs every action. On the shared HackCanton DevNet node,
                parties with their own keys are not enabled for teams yet, so one hackathon login acts for the demo parties there.
                The app tells you which mode you are in.
              </p>
            </details>
            <details className="more">
              <summary>Why Canton?</summary>
              <p className="muted">
                Canton gives each contract a fixed set of parties who can read it, and settles token transfers and state changes in one
                transaction. Those two properties are what make a private notice and a provable &ldquo;funded&rdquo; possible.
              </p>
            </details>
            <details className="more">
              <summary>What does the fund manager see?</summary>
              <p className="muted">Every notice in its fund, the payments waiting against them, and two totals: deployable now and unresolved.</p>
            </details>
          </div>
        </div>
      </section>

      <section className={styles.closing}>
        <h2 className="t-h2">Open the demo fund</h2>
        <p className="muted">Take a seat as the fund manager or one of three LPs and run a call end to end.</p>
        <Link href="/app" className="btn btn-primary btn-lg">Open the app</Link>
      </section>
    </>
  );
}

function RecordItem({ figure, label, text, env }: { figure: string; label: string; text: string; env: string }) {
  return (
    <div className={styles.recordItem}>
      <p className="t-figure">{figure}</p>
      <p className="t-h3">{label}</p>
      <p className="t-sm muted">{text}</p>
      <p className={styles.env}>{env}</p>
    </div>
  );
}
