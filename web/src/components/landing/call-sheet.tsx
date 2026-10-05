'use client';

import { useEffect, useId, useState } from 'react';

import styles from './call-sheet.module.css';

type Viewer = 'manager' | 'lpA' | 'lpB' | 'lpC' | 'outsider';
type Stage = 'due' | 'locked' | 'settled' | 'verified';

const VIEWERS: { id: Viewer; label: string }[] = [
  { id: 'manager', label: 'Fund manager' },
  { id: 'lpA', label: 'LP A' },
  { id: 'lpB', label: 'LP B' },
  { id: 'lpC', label: 'LP C' },
  { id: 'outsider', label: 'Anyone else' },
];

const ROWS: { lp: Exclude<Viewer, 'manager' | 'outsider'>; name: string; usd: number; cc: number }[] = [
  { lp: 'lpA', name: 'LP A', usd: 400_000, cc: 40 },
  { lp: 'lpB', name: 'LP B', usd: 350_000, cc: 35 },
  { lp: 'lpC', name: 'LP C', usd: 250_000, cc: 25 },
];

const STAGE_WORD: Record<Stage, string> = { due: 'Due', locked: 'Payment locked', settled: 'Settled, checking', verified: 'Verified funded' };
const STAGE_TONE: Record<Stage, string> = { due: '', locked: 'mark-wait', settled: 'mark-wait', verified: 'mark-good' };

// One orchestrated moment on load: LP A pays and is verified, LP B locks a
// payment, LP C has not paid. The final frame is the same story the DevNet
// run tells, so reduced motion starts there.
const SEQUENCE: { at: number; lp: string; stage: Stage }[] = [
  { at: 700, lp: 'lpA', stage: 'locked' },
  { at: 1500, lp: 'lpB', stage: 'locked' },
  { at: 1900, lp: 'lpA', stage: 'settled' },
  { at: 2900, lp: 'lpA', stage: 'verified' },
];
const FINAL: Record<string, Stage> = { lpA: 'verified', lpB: 'locked', lpC: 'due' };
const START: Record<string, Stage> = { lpA: 'due', lpB: 'due', lpC: 'due' };

const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

function Guilloche() {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={styles.guilloche} aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <pattern id={`g${id}`} width="28" height="14" patternUnits="userSpaceOnUse">
          {[0, 4.6, 9.3].map((phase) => (
            <path key={phase} d={`M${-28 + phase} 7 q7 -7 14 0 t14 0 t14 0 t14 0`} fill="none" stroke="currentColor" strokeWidth="0.7" />
          ))}
          {[0, 4.6, 9.3].map((phase) => (
            <path key={`r${phase}`} d={`M${-28 + phase} 7 q7 7 14 0 t14 0 t14 0 t14 0`} fill="none" stroke="currentColor" strokeWidth="0.7" />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#g${id})`} />
    </svg>
  );
}

export function CallSheet() {
  const [viewer, setViewer] = useState<Viewer>('manager');
  const [stages, setStages] = useState<Record<string, Stage>>(START);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStages(FINAL);
      return;
    }
    const timers = SEQUENCE.map(({ at, lp, stage }) => window.setTimeout(() => setStages((s) => ({ ...s, [lp]: stage })), at));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const funded = ROWS.filter((r) => stages[r.lp] === 'verified').reduce((s, r) => s + r.usd, 0);
  const called = ROWS.reduce((s, r) => s + r.usd, 0);
  const viewerName = VIEWERS.find((v) => v.id === viewer)?.label ?? '';
  const canSee = (lp: string) => viewer === 'manager' || viewer === lp;

  return (
    <figure className={styles.frame} aria-label="Example capital call, shown from each party's ledger">
      <Guilloche />
      <div className={styles.sheet}>
        <div className={styles.viewers} role="tablist" aria-label="Whose ledger to show">
          {VIEWERS.map((v) => (
            <button key={v.id} type="button" role="tab" aria-selected={viewer === v.id} className={styles.viewer} onClick={() => setViewer(v.id)}>
              {v.label}
            </button>
          ))}
        </div>

        <div className={styles.head}>
          <div>
            <p className={styles.fund}>Example Ventures I</p>
            <p className={styles.title}>{viewer === 'manager' ? 'Call 3, initial close' : viewer === 'outsider' ? 'No records' : `Notice for ${viewerName}`}</p>
          </div>
          <p className={styles.due}>Due Oct 9</p>
        </div>

        <ul className={styles.rows}>
          {ROWS.map((row) => (canSee(row.lp) ? (
            <li key={row.lp} className={styles.row}>
              <span className={styles.who}>{row.name}<small>{row.cc} CC</small></span>
              <span className={styles.amt}>{usd(row.usd)}</span>
              <span className={`mark ${STAGE_TONE[stages[row.lp] ?? 'due']}`}>{STAGE_WORD[stages[row.lp] ?? 'due']}</span>
            </li>
          ) : (
            <li key={row.lp} className={`${styles.row} ${styles.hidden}`}>
              <span className={styles.redact} aria-hidden="true" />
              <span className={styles.hiddenNote}>Not on {viewerName}&rsquo;s ledger</span>
            </li>
          )))}
        </ul>

        <div className={styles.foot}>
          {viewer === 'manager' ? (
            <>
              <div><span className={styles.label}>Deployable now</span><span className={styles.big}>{usd(funded)}</span></div>
              <div><span className={styles.label}>Unresolved</span><span className={styles.small}>{usd(called - funded)}</span></div>
            </>
          ) : viewer === 'outsider' ? (
            <p className={styles.note}>This party shares the network with the fund, but nothing about the fund exists on its ledger.</p>
          ) : (
            <p className={styles.note}>{viewerName} sees its own notice and nothing about the other investors or the fund&rsquo;s totals.</p>
          )}
        </div>
      </div>
    </figure>
  );
}
