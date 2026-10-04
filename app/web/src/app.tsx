import type { ReactElement } from 'react';

import { Empty, ToastHost } from './components';
import { ROLE_NAME, shortId } from './format';
import { AdminHome, CallDetail, CreateCall, InvestorsPage, PaymentsInbox, SetupPage } from './pages/admin';
import { InvestorHome, Notice, OutsiderHome } from './pages/investor';
import { ProofPage } from './pages/proof';
import { href, useApp, useRoute } from './state';
import type { Role, View, ViewWithSession } from './types';

const ROLES = Object.keys(ROLE_NAME) as Role[];

function Tabs({ view, route }: { view: View | null; route: string[] }): ReactElement {
  const { role } = useApp();
  const section = route[0] ?? '';
  const waiting = view?.session ? view.payments.filter((p) => p.recommendation !== 'ignore').length : 0;
  const tabs: { label: string; target: string; match: string[]; count?: number }[] = role === 'admin'
    ? [
      { label: 'Calls', target: href(), match: ['', 'calls'] },
      { label: 'Payments', target: href('payments'), match: ['payments'], count: waiting },
      { label: 'Investors', target: href('investors'), match: ['investors'] },
      { label: 'Proof', target: href('proof'), match: ['proof'] },
    ]
    : [
      { label: role === 'outsider' ? 'Home' : 'My notices', target: href(), match: ['', 'notices'] },
      { label: 'Proof', target: href('proof'), match: ['proof'] },
    ];
  return (
    <nav className="tabs" aria-label="Sections">
      {tabs.map((tab) => (
        <a key={tab.label} href={tab.target} aria-current={tab.match.includes(section) ? 'page' : undefined}>
          {tab.label}
          {tab.count ? <span className="count">{tab.count}</span> : null}
        </a>
      ))}
    </nav>
  );
}

function Page({ view, route }: { view: ViewWithSession; route: string[] }): ReactElement {
  const [section, id] = route;
  if (view.role === 'admin') {
    if (section === 'calls' && id === 'new') return <CreateCall key={view.calls.length} view={view} />;
    if (section === 'calls' && id) return <CallDetail key={id} view={view} callId={id} />;
    if (section === 'payments') return <PaymentsInbox view={view} />;
    if (section === 'investors') return <InvestorsPage view={view} />;
    if (section === 'notices') return <Empty title="Notices belong to investors"><p>The fund admin works from the call register.</p><a href={href()}>Calls</a></Empty>;
    return <AdminHome view={view} />;
  }
  if (section === 'calls' || section === 'payments' || section === 'investors') {
    return (
      <Empty title="This page is for the fund admin">
        <p>{ROLE_NAME[view.role]} has no access to the fund's call register, payments, or investor list. Its ledger login returns only its own records.</p>
        <a href={href()}>Back</a>
      </Empty>
    );
  }
  if (view.role === 'outsider') return <OutsiderHome view={view} />;
  if (section === 'notices' && id) return <Notice key={id} view={view} obligationRef={id} />;
  return <InvestorHome view={view} />;
}

export function App(): ReactElement {
  const { role, setRole, view, loadError } = useApp();
  const route = useRoute();
  const isProof = route[0] === 'proof';

  let body: ReactElement;
  if (isProof) body = <ProofPage />;
  else if (loadError && !view) body = <Empty title="Could not read the ledger"><p>{loadError}</p></Empty>;
  else if (!view) body = <div className="empty"><p>Reading the ledger as {ROLE_NAME[role]}…</p></div>;
  else if (!view.session) body = role === 'admin' ? <SetupPage network={view.network} /> : <Empty title="No fund yet"><p>Switch to the fund admin to create the demo fund.</p></Empty>;
  else body = <Page view={view} route={route} />;

  return (
    <>
      <header className="bar">
        <div className="bar-inner">
          <a className="mark" href={href()}>DRAW</a>
          <div className="viewing">
            <span id="viewing-label">Viewing as</span>
            <div className="roles" role="group" aria-labelledby="viewing-label">
              {ROLES.map((r) => (
                <button key={r} type="button" aria-pressed={r === role} onClick={() => setRole(r)}>{ROLE_NAME[r]}</button>
              ))}
            </div>
          </div>
          <span className="env"><strong>{view?.network ?? '…'}</strong> demo environment</span>
        </div>
        <Tabs view={view} route={route} />
      </header>
      <main>{body}</main>
      <footer className="provenance">
        {view?.session && !isProof && (
          <p>
            {view.singleCredential
              ? <>Everything above was read from the ledger as party {shortId(view.queriedAs.party)} ({ROLE_NAME[role]}). On this node one shared login acts for every demo party, so this shows party-level visibility, not separate credentials.</>
              : <>Everything above was read from the ledger with {ROLE_NAME[role]}'s own login: user {view.queriedAs.userId}, party {shortId(view.queriedAs.party)}.</>}
            Dollar amounts are the business scenario. Amulet amounts are what moves on {view.network}. Funded means an independent read-only verifier confirmed the settlement.
            Switching role here switches the ledger login. It is a demo convenience, not production sign-in.
          </p>
        )}
        {loadError && view && <p>Last refresh failed: {loadError}</p>}
      </footer>
      <ToastHost />
    </>
  );
}
