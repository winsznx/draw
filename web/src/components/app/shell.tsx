'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, type ReactNode } from 'react';

import { Seal, Wordmark } from '@/components/brand';
import { IconCall, IconDownload, IconEye, IconLayers, IconNotice, IconOverview, IconPayments, IconInvestors, IconShield, IconSwitch } from '@/components/icons';
import { leaveSeat, useSeat, useView } from '@/components/session';
import { ThemeSwitch } from '@/components/theme-switch';
import { ROLE_NAME, networkNote, shortParty, units } from '@/lib/format';
import { tapWallet } from '@/lib/guest';
import { signOut } from '@/lib/hackcanton';
import { backupPem } from '@/lib/keys';
import type { Role, View } from '@/lib/types';

import { AccessDialog, ActionButton, CopyId, RunButton, SignDialog, Toasts } from './ui';
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

function navFor(role: Role, view: View): { main: NavItem[]; evidence: NavItem[] } {
  const evidence: NavItem[] = [{ href: '/proof', label: 'Proof', icon: <IconShield />, match: (p) => p.startsWith('/proof') }];
  if (role === 'admin') {
    const waiting = view.session && 'payments' in view ? view.payments.filter((p) => p.recommendation !== 'ignore').length : 0;
    return {
      main: [
        { href: '/app', label: 'Overview', icon: <IconOverview />, match: (p) => p === '/app' },
        { href: '/app/calls', label: 'Calls', icon: <IconCall />, match: (p) => p.startsWith('/app/calls') },
        { href: '/app/payments', label: 'Payments', icon: <IconPayments />, match: (p) => p.startsWith('/app/payments'), count: waiting },
        { href: '/app/investors', label: 'Investors', icon: <IconInvestors />, match: (p) => p.startsWith('/app/investors') },
      ],
      evidence,
    };
  }
  return {
    main: [{ href: '/app', label: role === 'outsider' ? 'Ledger' : 'Notices', icon: <IconNotice />, match: (p) => p === '/app' || p.startsWith('/app/notices') }],
    evidence,
  };
}

export function Identicon({ seed, size = 36 }: { seed: string; size?: number }) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = 140 + (hash % 50);
  const cells = Array.from({ length: 15 }, (_, i) => (hash >> i) & 1);
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" className={styles.identicon} style={{ background: `oklch(0.93 0.04 ${hue})` }} aria-hidden="true">
      {cells.map((on, i) => {
        if (!on) return null;
        const x = (i % 3) + 1;
        const y = Math.floor(i / 3) + 1;
        return [
          <rect key={`${i}a`} x={x} y={y} width="1" height="1" fill={`oklch(0.42 0.09 ${hue})`} />,
          x < 3 && <rect key={`${i}b`} x={6 - x} y={y} width="1" height="1" fill={`oklch(0.42 0.09 ${hue})`} />,
        ];
      })}
    </svg>
  );
}

// The seat of an LP signed in with its own HackCanton login. Its balance and
// faucet are its own Canton wallet's, reached with its own token.
function GuestSeatCard({ view }: { view: View }) {
  const router = useRouter();
  const party = view.session && 'queriedAs' in view ? view.queriedAs.party : null;
  const balance = view.session && 'balance' in view ? view.balance : null;
  const signIn = view.signIn;
  return (
    <div className={styles.seatCard}>
      <div className={styles.seatTop}>
        <Identicon seed={party ?? 'guest'} />
        <div className={styles.seatWho}>
          <p className={styles.seatName}>{ROLE_NAME.guest}</p>
          {party ? <CopyId value={party} length={13} /> : <span className={styles.seatMuted}>Not signed in</span>}
        </div>
      </div>
      {balance !== null && (
        <div className={styles.balance}>
          <span className={styles.seatMuted}>Your wallet</span>
          <span className={styles.balanceFig}>{units(balance)} <small>CC</small></span>
        </div>
      )}
      <p className={styles.signing}>Your own HackCanton login signs for this party, from this browser. DRAW never sees it.</p>
      <div className={styles.seatActions}>
        {signIn && party && (
          <RunButton busyKey="tap" task={() => tapWallet(signIn)} className={`btn btn-sm ${styles.seatBtnLight}`} busyLabel="Adding…">Add test CC</RunButton>
        )}
        {signIn?.walletUrl && (
          <a className={`btn btn-sm ${styles.seatBtnGhost}`} href={signIn.walletUrl} target="_blank" rel="noreferrer">Open your wallet</a>
        )}
        <button
          type="button"
          className={`btn btn-sm ${styles.seatBtnGhost}`}
          onClick={() => {
            signOut();
            leaveSeat();
            router.push('/onboard');
          }}
        >
          <IconSwitch size={15} />Sign out
        </button>
      </div>
    </div>
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
      <div className={styles.seatTop}>
        <Identicon seed={party ?? role} />
        <div className={styles.seatWho}>
          <p className={styles.seatName}>{ROLE_NAME[role]}</p>
          {party ? <CopyId value={party} length={13} /> : <span className={styles.seatMuted}>No party yet</span>}
        </div>
      </div>
      {balance !== null && role !== 'admin' && (
        <div className={styles.balance}>
          <span className={styles.seatMuted}>Balance</span>
          <span className={styles.balanceFig}>{units(balance)} <small>CC</small></span>
        </div>
      )}
      <p className={styles.signing}>
        {view.browserKeys
          ? <>Signs with your browser key{fingerprint ? <span className="mono"> {fingerprint.slice(4, 12)}</span> : null}</>
          : view.singleCredential ? 'The shared DevNet login signs for this party.' : 'Signs with this party’s own ledger login.'}
      </p>
      <div className={styles.seatActions}>
        {balance !== null && role !== 'admin' && (
          <ActionButton name="faucet" body={{ role }} className={`btn btn-sm ${styles.seatBtnLight}`} busyLabel="Adding…">Add test CC</ActionButton>
        )}
        {view.browserKeys && fingerprint && (
          <button type="button" className={`btn btn-sm ${styles.seatBtnGhost}`} onClick={() => void backup()}><IconDownload size={15} />Back up key</button>
        )}
        <button
          type="button"
          className={`btn btn-sm ${styles.seatBtnGhost}`}
          onClick={() => {
            leaveSeat();
            router.push('/onboard');
          }}
        >
          <IconSwitch size={15} />Switch seat
        </button>
      </div>
    </div>
  );
}

// Which party this screen was read as, and how this network signs, so nobody
// has to guess whose ledger they are looking at.
function LedgerContext({ role, view }: { role: Role; view: View }) {
  const party = view.session && 'queriedAs' in view ? view.queriedAs.party : null;
  const guest = role === 'guest';
  return (
    <div className={styles.context}>
      {party && (
        <p>
          <IconEye size={15} />
          <span>
            Read from the ledger as <span className="mono" title={party}>{shortParty(party)}</span>
            {guest ? ' by this browser, with your own HackCanton login' : ` (${ROLE_NAME[role]})`}
          </span>
        </p>
      )}
      <p><IconLayers size={15} /><span>{guest ? `${view.network}, HackCanton shared node. Your login signs for your party, and the demo login signs for the fund manager.` : networkNote(view)}</span></p>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}><div className={styles.brand}><Wordmark href="/app" /></div></aside>
      <div className={styles.panel}>
        <div className={styles.content}>
          <span className="sk" style={{ width: 260, height: 40, marginBottom: 28 }} />
          <span className="sk" style={{ width: '100%', height: 150, marginBottom: 20, borderRadius: 22 }} />
          <span className="sk" style={{ width: '100%', height: 280, borderRadius: 22 }} />
        </div>
      </div>
    </div>
  );
}

function NavLinks({ items, pathname, className, itemClass }: { items: NavItem[]; pathname: string; className?: string; itemClass?: string }) {
  return (
    <div className={className}>
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={itemClass} aria-current={item.match(pathname) ? 'page' : undefined}>
          {item.icon}
          <span>{item.label}</span>
          {item.count ? <span className={styles.count}>{item.count}</span> : null}
        </Link>
      ))}
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
          <span className={styles.fatalSeal}><Seal size={40} /></span>
          <h1 className="t-h1">DRAW could not read the ledger</h1>
          <p className="muted">{query.error.message} Nothing was submitted.</p>
          <button type="button" className="btn btn-primary" onClick={() => void query.refetch()}>Try again</button>
        </div>
      );
    }
    return <ShellSkeleton />;
  }

  const view = query.data;
  const nav = navFor(seat, view);
  const all = [...nav.main, ...nav.evidence];
  const current = all.find((item) => item.match(pathname));
  const fundName = view.session && 'fundName' in view ? view.fundName : null;

  return (
    <SeatContext.Provider value={{ role: seat, view, refreshing: query.isFetching, lastError: query.isError ? query.error.message : null }}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}><Wordmark href="/app" /></div>
          {fundName && (
            <div className={styles.fund}>
              <span className={styles.fundTile}><Seal size={30} /></span>
              <span className={styles.fundText}><b>{fundName}</b><small>{view.network} fund</small></span>
            </div>
          )}
          <p className={styles.group}>{seat === 'admin' ? 'Fund' : 'Your seat'}</p>
          <NavLinks items={nav.main} pathname={pathname} className={styles.nav} itemClass={styles.navItem} />
          <p className={styles.group}>Evidence</p>
          <NavLinks items={nav.evidence} pathname={pathname} className={styles.nav} itemClass={styles.navItem} />
          {seat === 'guest' ? <GuestSeatCard view={view} /> : <SeatCard role={seat} view={view} />}
        </aside>

        <div className={styles.panel}>
          <header className={styles.topbar}>
            <div className={styles.mobileBrand}><Wordmark href="/app" /></div>
            <p className={styles.crumb}>{current?.label ?? 'DRAW'}</p>
            <div className={styles.topEnd}>
              {query.isError && <span className={styles.stale}>Showing the last read</span>}
              <span className="chip"><span className="live-dot" />{view.network}</span>
              <ThemeSwitch />
              <span className={styles.seatPill}><Identicon seed={(view.session && 'queriedAs' in view ? view.queriedAs.party : null) ?? seat} size={24} />{ROLE_NAME[seat]}</span>
            </div>
          </header>
          <main id="main" className={styles.content}>
            <LedgerContext role={seat} view={view} />
            {children}
          </main>
          <div className={styles.mobileSeat}>{seat === 'guest' ? <GuestSeatCard view={view} /> : <SeatCard role={seat} view={view} />}</div>
        </div>

        <nav className={styles.tabbar} aria-label="App">
          {all.map((item) => (
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
      <AccessDialog publicCode={view.accessCode} />
    </SeatContext.Provider>
  );
}
