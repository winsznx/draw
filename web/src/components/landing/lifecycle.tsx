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
        <div className={styles.kv}><span>Pay</span><b>40 CC</b><span>Due</span><b>In 10 days</b></div>
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
        <div className={styles.kv}><span>Amount</span><b>40 CC</b><span>Reference</span><b className={styles.mono}>DRAW-example</b><span>To</span><b>Fund manager</b></div>
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
    who: 'Read-back step',
    text: 'A read-back step reads the settlement from the ledger and checks it. Only then does it count as deployable. In the LocalNet runs it had a read-only login of its own.',
    stage: (
      <div className={`${styles.card} ${styles.cardDark}`}>
        <div className={styles.cardHead}><span className={styles.icon}><IconCheckCircle size={18} /></span><span>Verified funded<small>Read back by DRAW</small></span></div>
        <p className={styles.huge}>14 of 14</p>
        <p className={styles.caption}>checks passed on the settlement transaction</p>
      </div>
    ),
  },
];

// readBack names the login the live site's read-back uses. It's null when the
// site's setup didn't load, so the Verify step then says nothing about it.
export function Lifecycle({ readBack }: { readBack?: string | null }) {
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
                <span className={styles.stepBody}>{s.title === 'Verify' && readBack ? `${s.text} ${readBack}` : s.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className={styles.stage} aria-live="polite">
        <p className={styles.stageLabel}>Example record: {step?.title}</p>
        <div key={active} className={styles.stageCard}>{step?.stage}</div>
      </div>
    </div>
  );
}
