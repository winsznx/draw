'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, type ReactNode } from 'react';

import { Seal, Wordmark } from '@/components/brand';
import { leaveSeat, useSeat, useView } from '@/components/session';
import { ThemeSwitch } from '@/components/theme-switch';
import { ROLE_NAME, units } from '@/lib/format';
import { backupPem } from '@/lib/keys';
import type { Role, View } from '@/lib/types';

import { AccessDialog, ActionButton, CopyId, SignDialog, Toasts } from './ui';
import styles from './shell.module.css';

interface SeatView {
  role: Role;
  view: View;
  refreshing: boolean;
  lastError: string | null;
}

const SeatContext = createContext<SeatView | null>(null);

export function useSeatView(): SeatView {
  const value = useContext(SeatContext);
  if (!value) throw new Error('useSeatView outside AppShell');
  return value;
}

type NavItem = { href: string; label: string; icon: ReactNode; match: (path: string) => boolean; count?: number };

const icon = (d: string) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

const ICONS = {
  overview: icon('M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z'),
  calls: icon('M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6'),
  payments: icon('M3 7h18v10H3zM3 11h18M7 15h3'),
  investors: icon('M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 3.5 6'),
  notices: icon('M5 4h14v16H5zM9 8h6M9 12h6M9 16h3'),
  proof: icon('M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6zM9 12l2 2 4-4'),
};

function navFor(role: Role, view: View): NavItem[] {
  const proof: NavItem = { href: '/proof', label: 'Proof', icon: ICONS.proof, match: (p) => p.startsWith('/proof') };
  if (role === 'admin') {
    const waiting = view.session && 'payments' in view ? view.payments.filter((p) => p.recommendation !== 'ignore').length : 0;
    return [
      { href: '/app', label: 'Overview', icon: ICONS.overview, match: (p) => p === '/app' },
      { href: '/app/calls', label: 'Calls', icon: ICONS.calls, match: (p) => p.startsWith('/app/calls') },
      { href: '/app/payments', label: 'Payments', icon: ICONS.payments, match: (p) => p.startsWith('/app/payments'), count: waiting },
      { href: '/app/investors', label: 'Investors', icon: ICONS.investors, match: (p) => p.startsWith('/app/investors') },
      proof,
    ];
  }
  return [
    { href: '/app', label: role === 'outsider' ? 'Ledger' : 'Notices', icon: ICONS.notices, match: (p) => p === '/app' || p.startsWith('/app/notices') },
    proof,
  ];
}

function Identicon({ seed }: { seed: string }) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const cells = Array.from({ length: 15 }, (_, i) => (hash >> i) & 1);
  return (
    <svg width="34" height="34" viewBox="0 0 5 5" className={styles.identicon} aria-hidden="true">
      {cells.map((on, i) => {
        const x = i % 3;
        const y = Math.floor(i / 3);
        return on ? [<rect key={`${i}a`} x={x} y={y} width="1" height="1" />, x < 2 && <rect key={`${i}b`} x={4 - x} y={y} width="1" height="1" />] : null;
      })}
    </svg>
  );
}

function SeatCard({ role, view }: { role: Role; view: View }) {
  const router = useRouter();
  const party = view.session && 'queriedAs' in view ? view.queriedAs.party : null;
  const balance = view.session && 'balance' in view ? view.balance : null;
  const keyTag = view.session ? view.sessionTag : null;
  const fingerprint = view.session ? view.fingerprint : null;

  async function backup() {
    if (!keyTag) return;
    const pem = await backupPem(view.network, keyTag, role);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([pem], { type: 'application/x-pem-file' }));
    link.download = `draw-${role}-key.pem`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className={styles.seatCard}>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <Identicon seed={party ?? role} />
        <div style={{ minWidth: 0 }}>
          <p className={styles.seatName}>{ROLE_NAME[role]}</p>
          {party ? <CopyId value={party} length={14} /> : <span className="t-xs faint">No party yet</span>}
        </div>
      </div>
      {balance !== null && role !== 'admin' && (
        <div className={styles.balance}>
          <span className="t-xs faint">Balance</span>
          <span className={styles.balanceFig}>{units(balance)} CC</span>
          <ActionButton name="faucet" body={{ role }} className="link t-sm" busyLabel="Adding…">Add test CC</ActionButton>
        </div>
      )}
      <p className={styles.signing}>
        {view.browserKeys
          ? <>Signs with your browser key{fingerprint ? <span className="mono"> {fingerprint.slice(4, 12)}</span> : null}</>
          : view.singleCredential ? 'Shared DevNet login signs for this party' : 'Signs with this party’s own ledger login'}
      </p>
      <div className="row">
        {view.browserKeys && fingerprint && <button type="button" className="btn btn-sm" onClick={() => void backup()}>Back up key</button>}
        <button
          type="button"
          className="btn btn-sm btn-quiet"
          onClick={() => {
            leaveSeat();
            router.push('/onboard');
          }}
        >
          Switch seat
        </button>
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}><Wordmark href="/app" /></aside>
      <main className={styles.main}>
        <div className={styles.content}>
          <span className="sk" style={{ width: 280, height: 36, marginBottom: 24 }} />
          <span className="sk" style={{ width: '100%', height: 140, marginBottom: 16 }} />
          <span className="sk" style={{ width: '100%', height: 260 }} />
        </div>
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const seat = useSeat();
  const router = useRouter();
  const pathname = usePathname();
  const query = useView(seat);

  useEffect(() => {
    if (seat === null) router.replace('/onboard');
  }, [seat, router]);

  if (!seat) return <ShellSkeleton />;
  if (!query.data) {
    if (query.isError) {
      return (
        <div className={styles.fatal}>
          <Seal size={32} />
          <h1 className="t-h2">DRAW could not read the ledger</h1>
          <p className="muted">{query.error.message}</p>
          <button type="button" className="btn btn-primary" onClick={() => void query.refetch()}>Try again</button>
        </div>
      );
    }
    return <ShellSkeleton />;
  }

  const view = query.data;
  const nav = navFor(seat, view);
  const fundName = view.session && 'fundName' in view ? view.fundName : null;

  return (
    <SeatContext.Provider value={{ role: seat, view, refreshing: query.isFetching, lastError: query.isError ? query.error.message : null }}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <Wordmark href="/app" />
          {fundName && <p className={styles.fund}>{fundName}</p>}
          <nav className={styles.nav} aria-label="App">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={styles.navItem} aria-current={item.match(pathname) ? 'page' : undefined}>
                {item.icon}
                <span>{item.label}</span>
                {item.count ? <span className={styles.count}>{item.count}</span> : null}
              </Link>
            ))}
          </nav>
          <SeatCard role={seat} view={view} />
        </aside>

        <div className={styles.topbar}>
          <Wordmark href="/app" />
          <div className="row" style={{ gap: 4 }}>
            <span className={styles.netChip}><span className={styles.live} />{view.network}</span>
            <ThemeSwitch />
          </div>
        </div>

        <main id="main" className={styles.main}>
          <div className={styles.desktopBar}>
            <span className={styles.netChip}><span className={styles.live} />{view.network}</span>
            {query.isError && <span className="t-xs" style={{ color: 'var(--waiting)' }}>Last refresh failed. Showing the previous read.</span>}
            <span style={{ marginLeft: 'auto' }}><ThemeSwitch /></span>
          </div>
          <div className={styles.content}>{children}</div>
          <div className={styles.mobileSeat}><SeatCard role={seat} view={view} /></div>
        </main>

        <nav className={styles.tabbar} aria-label="App">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={styles.tab} aria-current={item.match(pathname) ? 'page' : undefined}>
              {item.icon}
              <span>{item.label}</span>
              {item.count ? <span className={styles.tabCount}>{item.count}</span> : null}
            </Link>
          ))}
        </nav>
      </div>
      <Toasts />
      <SignDialog />
      <AccessDialog />
    </SeatContext.Provider>
  );
}
