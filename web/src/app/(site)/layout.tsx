import Link from 'next/link';
import type { ReactNode } from 'react';

import { Wordmark } from '@/components/brand';
import { ThemeSwitch } from '@/components/theme-switch';

import styles from './site.module.css';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Wordmark />
          <nav className={styles.nav} aria-label="Site">
            <Link href="/#how">How it works</Link>
            <Link href="/#privacy">Privacy</Link>
            <Link href="/proof">Proof</Link>
          </nav>
          <div className={styles.headerEnd}>
            <ThemeSwitch />
            <Link href="/app" className="btn btn-primary btn-sm">Open the app</Link>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className="stack-3">
            <Wordmark />
            <p className="t-sm muted">Private capital calls, settled in Canton Coin and verified on the Canton Network. Built for HackCanton Season 3.</p>
          </div>
          <nav className={styles.footerLinks} aria-label="Footer">
            <div className="stack-2">
              <p className="t-sm">Product</p>
              <Link href="/app">Open the app</Link>
              <Link href="/#how">How it works</Link>
              <Link href="/#privacy">Who sees what</Link>
            </div>
            <div className="stack-2">
              <p className="t-sm">Evidence</p>
              <Link href="/proof">Proof</Link>
              <Link href="/proof#runs">Run records</Link>
            </div>
          </nav>
        </div>
        <p className={styles.fineprint}>
          Demo software on test networks. Dollar amounts are example figures; what moves is test Canton Coin. Nothing here is an offer of securities.
        </p>
      </footer>
    </>
  );
}
