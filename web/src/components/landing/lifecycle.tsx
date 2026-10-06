'use client';

import { useState, type ReactNode } from 'react';

import { IconCheckCircle, IconCoin, IconLock, IconNotice, IconUser } from '@/components/icons';

import styles from './lifecycle.module.css';

const STEPS: { title: string; who: string; text: string; stage: ReactNode }[] = [
  {
    title: 'Invite',
    who: 'Fund manager',
    text: 'Each LP gets a private invitation to commit and accepts it with its own Canton party.',
    stage: (
      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.icon}><IconUser size={18} /></span><span>Invitation to commit<small>Example Ventures I, for LP A</small></span></div>
        <p className={styles.big}>$1,000,000</p>
        <span className={styles.fakeBtn}>Accept commitment</span>
      </div>
    ),
  },
  {
    title: 'Call',
    who: 'Fund manager',
    text: 'One capital call becomes a separate notice for each LP, for that LP’s amount and nobody else’s.',
    stage: (
      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.icon}><IconNotice size={18} /></span><span>Capital call notice<small>Call 3, for LP A only</small></span></div>
        <p className={styles.big}>$400,000</p>
        <div className={styles.kv}><span>Pay</span><b>40 CC</b><span>Due</span><b>Oct 9, 17:00</b></div>
      </div>
    ),
  },
  {
    title: 'Pay',
    who: 'LP',
    text: 'The LP locks the exact amount of Canton Coin for the fund, tagged with its notice reference.',
    stage: (
      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.icon}><IconLock size={18} /></span><span>Payment locked<small>Canton Coin allocation</small></span></div>
        <div className={styles.kv}><span>Amount</span><b>40 CC</b><span>Reference</span><b className={styles.mono}>DRAW-c287df72</b><span>To</span><b>Fund manager</b></div>
        <span className="mark mark-wait">Waiting for the fund</span>
      </div>
    ),
  },
  {
    title: 'Settle',
    who: 'Fund manager',
    text: 'One transaction moves the coin and marks the notice funded. A wrong amount, payer or reference is refused by the ledger.',
    stage: (
      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.icon}><IconCoin size={18} /></span><span>Settled in one transaction<small>Allocation executed</small></span></div>
        <div className={styles.flow}><span>LP A</span><i /><b>40 CC</b><i /><span>Fund</span></div>
        <div className={styles.kv}><span>Notice</span><b>Payment pending to Funded</b></div>
      </div>
    ),
  },
  {
    title: 'Verify',
    who: 'Verifier',
    text: 'A separate step reads the settlement back from the ledger. Only then does it count as deployable. On LocalNet that step has its own read-only login.',
    stage: (
      <div className={`${styles.card} ${styles.cardDark}`}>
        <div className={styles.cardHead}><span className={styles.icon}><IconCheckCircle size={18} /></span><span>Verified funded<small>Read back by the verifier</small></span></div>
        <p className={styles.huge}>14 of 14</p>
        <p className={styles.caption}>checks passed on the settlement transaction</p>
      </div>
    ),
  },
];

export function Lifecycle() {
  const [active, setActive] = useState(0);
  const step = STEPS[active] ?? STEPS[0];
  return (
    <div className={styles.wrap}>
      <ol className={styles.steps}>
        {STEPS.map((s, index) => (
          <li key={s.title}>
            <button type="button" className={styles.step} aria-pressed={active === index} onClick={() => setActive(index)}>
              <span className={styles.num}>{String(index + 1).padStart(2, '0')}</span>
              <span className={styles.stepText}>
                <span className={styles.stepTitle}>{s.title}<small>{s.who}</small></span>
                <span className={styles.stepBody}>{s.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className={styles.stage} aria-live="polite">
        <p className={styles.stageLabel}>{step?.title}, as it appears on the ledger</p>
        <div key={active} className={styles.stageCard}>{step?.stage}</div>
      </div>
    </div>
  );
}
