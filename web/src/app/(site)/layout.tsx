import Link from 'next/link';
import type { ReactNode } from 'react';

import { Seal, Wordmark } from '@/components/brand';
import { IconLayers } from '@/components/icons';
import { ThemeSwitch } from '@/components/theme-switch';

import styles from './site.module.css';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.site}>
      <header className={styles.header}>
        <div className={styles.nav}>
          <Wordmark />
          <nav className={styles.links} aria-label="Site">
            <Link href="/#how">How it works</Link>
            <Link href="/#privacy">Privacy</Link>
            <Link href="/proof">Proof</Link>
            <Link href="/#questions">Questions</Link>
          </nav>
          <div className={styles.navEnd}>
            <span className={`chip ${styles.netChip}`}><span className="live-dot" />Canton DevNet</span>
            <ThemeSwitch />
            <Link href="/app" className="btn btn-invert btn-sm">Open app</Link>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Wordmark />
            <p className="t-sm muted">Private capital calls. Each investor sees and pays only its own notice, and the fund sees what is verifiably funded.</p>
            <p className={styles.builtOn}><IconLayers size={16} />Built on the Canton Network</p>
          </div>
          <nav className={styles.footerCols} aria-label="Footer">
            <div>
              <p>Product</p>
              <Link href="/app">Open the app</Link>
              <Link href="/onboard">Take a seat</Link>
              <Link href="/#how">How it works</Link>
            </div>
            <div>
              <p>Proof</p>
              <Link href="/proof">All evidence</Link>
              <Link href="/proof#privacy">Who could read what</Link>
              <Link href="/proof#settlements">Settlements</Link>
            </div>
            <div>
              <p>Learn</p>
              <Link href="/#privacy">Privacy model</Link>
              <Link href="/#questions">Questions</Link>
              <a href="https://www.canton.network" rel="noreferrer">Canton Network</a>
            </div>
          </nav>
        </div>
        <div className={styles.bottom}>
          <p>Demo software on test networks. Dollar figures are example amounts; what moves is test Canton Coin. Nothing here is an offer of securities or investment advice.</p>
          <p className={styles.made}><Seal size={16} />HackCanton Season 3</p>
        </div>
      </footer>
    </div>
  );
}
