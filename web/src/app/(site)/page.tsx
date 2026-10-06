import Link from 'next/link';

import { IconCheckCircle, IconCoin, IconEyeOff, IconLayers, IconLock, IconNotice, IconShield, IconSpark } from '@/components/icons';
import { CallSheet } from '@/components/landing/call-sheet';
import { Lifecycle } from '@/components/landing/lifecycle';
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

function seen(proof: Proof | null, party: string, record: string): number | null {
  const list = proof?.canonical?.visibility?.[party]?.[record];
  return list ? list.length : null;
}

function Cell({ count, total }: { count: number | null; total: number }) {
  if (count === null) return <td className="num faint">Not loaded</td>;
  if (count === 0) return <td className="num"><span className={styles.none}><IconEyeOff size={15} />None</span></td>;
  const word = total > 1 && count === total ? `All ${count}` : total > 1 && count === 1 ? 'Own only' : 'Yes';
  return <td className="num"><span className={styles.seen}>{word}</span></td>;
}

export default async function Landing() {
  const [proof, config] = await Promise.all([loadProof(), loadConfig()]);
  const run = proof?.canonical ?? null;
  const receipt = run?.receipts[0] ?? null;
  const local = proof?.localnet ?? null;
  const clean = run?.leaks ? Object.values(run.leaks).every((l) => l.length === 0) : null;

  const record = [
    { figure: run ? `${run.passed}/${run.passed + run.failed.length}` : 'Not loaded', label: 'checks on DevNet', text: 'Two LPs funded with real test Canton Coin, bad payments refused, the unpaid LP marked overdue.', env: 'DevNet' },
    { figure: local?.campaign ? `${local.campaign.metrics.passed ?? 0}/${local.campaign.metrics.cases ?? 0}` : 'Not loaded', label: 'generated capital calls', text: `${local?.campaign?.metrics.obligations ?? 0} notices. Nothing falsely funded, no party saw another’s records.`, env: 'LocalNet' },
    { figure: local?.ablation ? `${local.ablation.comparison.filter((c) => c.treatment === 'stopped').length}/${local.ablation.comparison.length}` : 'Not loaded', label: 'attacks stopped', text: `The same flow on a database with a paid flag let ${local?.ablation?.comparison.filter((c) => c.counterfactualA === 'LANDED').length ?? 0} through.`, env: 'LocalNet' },
    { figure: local?.custody ? `${local.custody.passed}/${local.custody.passed + local.custody.failed.length}` : 'Not loaded', label: 'checks, each party holding its key', text: 'The participant cannot act for a party without that party’s signature.', env: 'LocalNet' },
  ];

  return (
    <>
      <section className={styles.heroWrap}>
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.heroEyebrow}><IconLayers size={15} />Private capital calls on Canton</span>
            <h1 className={styles.heroTitle}>Capital calls only the right investor can read.</h1>
            <p className={styles.heroLead}>
              Each LP gets a private notice and pays it in Canton Coin. The fund counts the money as deployable only after a separate
              read-back step confirms it arrived.
            </p>
            <div className={styles.ctas}>
              <Link href="/onboard" className="btn btn-light btn-lg">Take a seat in the demo fund</Link>
              <Link href="/proof" className="btn btn-ghost-light btn-lg">See the DevNet proof</Link>
            </div>
            {config?.accessCode && (
              <p className={styles.accessCode}>Demo access code: <code>{config.accessCode}</code></p>
            )}
          </div>

          <div className={styles.scene}>
            <div className={styles.floatLeft}>
              <p className={styles.floatLabel}>LP B&rsquo;s ledger</p>
              <div className={styles.floatRow}><span>LP A&rsquo;s notice</span><b><IconEyeOff size={14} />Not visible</b></div>
              <div className={styles.floatRow}><span>Fund totals</span><b><IconEyeOff size={14} />Not visible</b></div>
            </div>
            <div className={styles.sheetSlot}>
              <CallSheet />
            </div>
            <div className={styles.floatRight}>
              <p className={styles.floatLabel}>Settlement receipt</p>
              <p className={styles.floatFig}>{receipt ? `${receipt.receivedAmount} CC` : '40 CC'}</p>
              <span className="mark mark-good">Verified, {receipt?.checks ?? 14} of {receipt?.checks ?? 14}</span>
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
          <li><span className={styles.stripMark}><IconCheckCircle size={16} /></span>Separate read-back</li>
        </ul>
      </section>

      <section id="how" className={styles.section}>
        <div className={styles.split}>
          <div className="stack-4">
            <span className="eyebrow"><IconNotice size={15} />How a call moves</span>
            <h2 className="t-h2">Issue once. Every LP pays its own notice.</h2>
          </div>
          <p className="t-lead">
            A capital call on DRAW is five steps on one ledger. Pick a step to see the record it leaves behind. Nothing is a status someone
            ticks by hand.
          </p>
        </div>
        <Lifecycle />
      </section>

      <section className={styles.section}>
        <div className={styles.center}>
          <span className="eyebrow"><IconSpark size={15} />Why it holds</span>
          <h2 className="t-h2">Three things a spreadsheet can&rsquo;t promise</h2>
          <p className="t-lead">The ledger enforces each one. The app only shows what the ledger already decided.</p>
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
            <p className={styles.tileText}>A separate verifier step reads each settlement back from the ledger. Deployable means it agreed, not that a button was pressed.</p>
            <div className={styles.mini}>
              <div className={styles.miniRow}><span>Deployable now</span><b className={styles.miniGood}>$750,000</b></div>
              <div className={styles.miniRow}><span>Unresolved</span><b>$250,000</b></div>
              <div className={styles.miniBar}><i style={{ width: '75%' }} /></div>
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
              These are the records each party&rsquo;s own query returned at the end of the DevNet run. DRAW doesn&rsquo;t hide rows. The
              ledger never sends them.
            </p>
            {run && <p className="t-sm faint">DevNet run {run.runId}.{clean ? ' No party saw a record it should not.' : ''}</p>}
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
                    {RECORDS.map((r) => <Cell key={r.id} count={seen(proof, p.id, r.id)} total={seen(proof, 'admin', r.id) ?? 0} />)}
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
              <span className={styles.env}>{item.env}</span>
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
                <dt>Standard</dt><dd>CIP-0056 allocations</dd>
                <dt>Contracts</dt><dd>Daml package draw 0.2.0</dd>
              </dl>
            </div>
          </div>
          <div className={styles.faq}>
            {[
              ['Is this real money?', 'No. It runs on the Canton DevNet with test Canton Coin. Dollar figures are the business scenario; the coin is what actually moves.'],
              ['Who holds the keys?', 'On LocalNet each person creates a key in their own browser and signs every action. On the shared HackCanton DevNet node, parties with their own keys are not enabled for teams yet, so one hackathon login acts for the demo parties there. The app says which mode you are in.'],
              ['Why Canton?', 'Canton gives each contract a fixed set of parties who can read it, and settles a token transfer and a state change in one transaction. Those two properties are what make a private notice and a provable funded status possible.'],
              ['What does the fund manager see?', 'Every notice in its fund, the payments waiting against them, and two totals: deployable now and unresolved.'],
              ['Can an LP see the other LPs?', 'No. An LP’s ledger returns its own commitment and notices only. Opening another LP’s notice link shows nothing, because the ledger returns nothing.'],
              ['Who can see the payment?', 'The notice and the commitment are private. Only the fund’s party and that LP’s party can read them, plus the node that hosts them. On DevNet one hackathon login reads for every seat. They don’t appear in the network’s Scan service. The Canton Coin transfer that pays a notice is visible to Scan, under a random reference, with both party ids. Those ids carry readable hints such as draw-lpa. In production the fund would settle in a tokenized dollar through the same Token Standard allocation interface. The USDCx registry lists that interface, but DRAW hasn’t been run with USDCx.'],
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
          <p>Take a seat as the fund manager or one of three LPs. It takes about a minute.</p>
          <Link href="/onboard" className="btn btn-light btn-lg">Take a seat</Link>
        </div>
      </section>
    </>
  );
}
