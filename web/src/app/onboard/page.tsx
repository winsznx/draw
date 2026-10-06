'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Seal, Wordmark } from '@/components/brand';
import { leaveSeat, takeSeat, useActions, useSeat, useView } from '@/components/session';
import { useSignedIn } from '@/components/signin';
import { ThemeSwitch } from '@/components/theme-switch';
import { IconArrowRight, IconBuilding, IconEyeOff, IconUser } from '@/components/icons';
import { ActionButton, AccessDialog, SignDialog, Spinner, Toasts } from '@/components/app/ui';
import { AccessCodeNeeded, accessCode, rememberAccessCode, startOnboarding } from '@/lib/api';
import { networkNote, shortParty, signInNote, usd } from '@/lib/format';
import { fetchGuestTour } from '@/lib/guest';
import { signOut, startSignIn } from '@/lib/hackcanton';
import { backupPem, createKey, hasKey, signHash } from '@/lib/keys';
import { CALL_USD } from '@/lib/scenario';
import type { Role, SignInConfig, View } from '@/lib/types';

import styles from './onboard.module.css';

type Step = 'seat' | 'party' | 'backup' | 'access' | 'done';

const SEATS: { role: Role; name: string; what: string }[] = [
  { role: 'admin', name: 'Fund manager', what: 'Issue capital calls, settle payments, and see what is deployable.' },
  { role: 'lpA', name: 'LP A', what: 'An investor with a $1,000,000 commitment.' },
  { role: 'lpB', name: 'LP B', what: 'An investor with a $700,000 commitment.' },
  { role: 'lpC', name: 'LP C', what: 'An investor with a $500,000 commitment.' },
];

const seatName = (role: Role | null) => (role === 'outsider' ? 'Unrelated party' : role === 'guest' ? 'HackCanton LP' : SEATS.find((s) => s.role === role)?.name ?? '');

// `askAccess` is false when actions need no code, or when the operator prints
// it for every visitor and this browser keeps it without asking.
function stepsFor(browserKeys: boolean, askAccess: boolean): { id: Step; label: string }[] {
  const steps: { id: Step; label: string }[] = browserKeys
    ? [{ id: 'seat', label: 'Choose your seat' }, { id: 'party', label: 'Create your key' }, { id: 'backup', label: 'Back up your key' }, { id: 'done', label: 'Open the app' }]
    : [{ id: 'seat', label: 'Choose your seat' }, { id: 'party', label: 'Your party' }, { id: 'access', label: 'Access' }, { id: 'done', label: 'Open the app' }];
  return steps.filter((s) => askAccess || s.id !== 'access');
}

function seatState(view: View | undefined, role: Role, held: boolean): string | null {
  if (!view?.session) return null;
  if (view.browserKeys) return view.accounts?.includes(role) ? (held ? 'Your key is in this browser' : 'Joined from another browser') : 'Open';
  if (role === 'admin' || role === 'outsider' || !('commitments' in view)) return null;
  const committed = view.commitments.find((c) => c.investor === role);
  if (committed) return `Committed ${usd(committed.committedUsd)}`;
  return view.invitations.some((i) => i.investor === role) ? 'Invitation waiting' : 'Not invited yet';
}

export default function Onboard() {
  const router = useRouter();
  const current = useSeat();
  const admin = useView('admin');
  const [step, setStep] = useState<Step>('seat');
  const [role, setRole] = useState<Role | null>(null);
  const chosen = useView(role);
  const view = admin.data;
  const browserKeys = view?.browserKeys ?? false;
  const askAccess = Boolean(view?.accessCodeRequired && !view.accessCode);
  const steps = stepsFor(browserKeys, askAccess);
  const at = steps.findIndex((s) => s.id === step);

  const tag = view?.session ? view.sessionTag : null;
  const held = useQuery({
    queryKey: ['held-keys', view?.network, tag],
    queryFn: async () => Object.fromEntries(await Promise.all(SEATS.map(async (seat) => [seat.role, await hasKey(view?.network ?? '', tag ?? '', seat.role)] as const))),
    enabled: browserKeys && Boolean(tag),
  }).data ?? {};

  const finish = () => {
    if (role) takeSeat(role);
    router.push('/app');
  };

  return (
    <div className={styles.page}>
      <aside className={styles.brandPanel} aria-label="Progress">
        <Link href="/" className={styles.brandMark} aria-label="DRAW home"><Seal size={28} inverse /><span>draw</span></Link>
        <div className={styles.brandCopy}>
          <p className={styles.brandTitle}>Every seat reads its own ledger.</p>
          <ol className={styles.stepper}>
            {steps.map((s, index) => (
              <li key={s.id} className={index < at ? styles.done : index === at ? styles.now : ''} aria-current={index === at ? 'step' : undefined}>
                <span className={styles.dot}>{index < at ? '' : index + 1}</span>
                <span>
                  {s.label}
                  {index < at && s.id === 'seat' && role && <small>{seatName(role)}</small>}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <SeatPreview role={role ?? 'admin'} />
        {view && <p className={styles.network}>{!admin.isError && <span className="live-dot" />}<span>{view.signIn ? signInNote(view) : networkNote(view)}</span></p>}
      </aside>

      <main id="main" className={styles.main}>
        <header className={styles.header}>
          <span className={styles.mobileMark}><Wordmark /></span>
          <div className={styles.progressMobile} aria-hidden="true">
            {steps.map((s, index) => <i key={s.id} className={index <= at ? styles.on : ''} />)}
          </div>
          <div className="row" style={{ gap: 4, marginLeft: 'auto', flexWrap: 'nowrap' }}>
            <ThemeSwitch />
            <Link href="/" className="btn btn-quiet btn-sm">Back to site</Link>
          </div>
        </header>

        <section className={styles.content}>
          {current && step === 'seat' && (
            <div className={styles.resume}>
              <p>This browser is already set up as <strong>{seatName(current)}</strong>.</p>
              <div className="row">
                <Link href="/app" className="btn btn-primary btn-sm">Continue as {seatName(current)}</Link>
                <button type="button" className="btn btn-sm" onClick={leaveSeat}>Sign out</button>
              </div>
            </div>
          )}

          {step === 'seat' && (
            <SeatStep
              view={view}
              held={held}
              loading={admin.isPending}
              failed={admin.isError}
              onPick={(next) => {
                // A party this browser already holds the key for opens straight away.
                if (browserKeys && view?.accounts?.includes(next) && held[next]) {
                  takeSeat(next);
                  router.push('/app');
                  return;
                }
                setRole(next);
                setStep('party');
              }}
            />
          )}

          {step === 'seat' && view?.signIn && (
            <SignInCard
              config={view.signIn}
              hasFund={view.session}
              onJoined={() => {
                takeSeat('guest');
                router.push('/app');
              }}
            />
          )}

          {step === 'party' && role && !browserKeys && (
            <SharedPartyStep
              role={role}
              view={chosen.data}
              site={view}
              onBack={() => setStep('seat')}
              onNext={() => {
                if (view?.accessCode) rememberAccessCode(view.accessCode);
                setStep(askAccess && !accessCode() ? 'access' : 'done');
              }}
            />
          )}

          {step === 'party' && role && browserKeys && view?.session && (
            <KeyStep role={role} network={view.network} tag={view.sessionTag ?? ''} onBack={() => setStep('seat')} onNext={() => setStep('backup')} />
          )}

          {step === 'backup' && role && view?.session && (
            <BackupStep role={role} network={view.network} tag={view.sessionTag ?? ''} onNext={() => setStep('done')} />
          )}

          {step === 'access' && <AccessStep publicCode={view?.accessCode ?? null} onNext={() => setStep('done')} />}

          {step === 'done' && role && (
            <div className="stack-6">
              <div className="stack-3">
                <h1 className="t-h1">You&rsquo;re set up as {seatName(role)}</h1>
                <p className="t-lead">
                  {role === 'admin'
                    ? 'Your overview shows what is deployable now and what is still unresolved. Start by creating a capital call.'
                    : role === 'outsider'
                      ? 'You will see exactly what this party’s ledger returns for the fund. That should be nothing.'
                      : 'Your notices appear here as soon as the fund calls capital. You pay each one from your own balance.'}
                </p>
              </div>
              <button type="button" className="btn btn-primary btn-lg" onClick={finish}>Open the app</button>
            </div>
          )}
        </section>
      </main>
      <Toasts />
      <SignDialog />
      <AccessDialog publicCode={view?.accessCode} />
    </div>
  );
}

// An LP with its own HackCanton login joins this browser's demo fund as an
// extra investor. Its browser signs in with Keycloak, then reads and acts with
// that login. The server only learns the party id and invites it. Without a
// fund yet, joining starts this browser's demo fund first.
function SignInCard({ config, hasFund, onJoined }: { config: SignInConfig; hasFund: boolean; onJoined: () => void }) {
  const me = useSignedIn();
  const { act, busy } = useActions();
  const [opening, setOpening] = useState(false);
  // Set while starting the fund and joining it, two actions that leave the
  // page idle for a moment in between.
  const [starting, setStarting] = useState(false);
  const tour = useQuery({ queryKey: ['guest-tour'], queryFn: ({ signal }) => fetchGuestTour(signal), enabled: Boolean(me) });
  const joined = Boolean(me && tour.data?.session && tour.data.guest?.party === me.party);
  if (me === undefined) return null;

  async function join(party: string) {
    if (hasFund) {
      if (await act('join', { party }, 'join')) onJoined();
      return;
    }
    setStarting(true);
    try {
      if ((await act('setup', {}, 'join')) && (await act('join', { party }, 'join'))) onJoined();
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className={styles.callout}>
      <p className="t-h3">Have a HackCanton login?</p>
      {me ? (
        <>
          <p className="t-sm muted">
            Signed in as <span className="mono" title={me.party}>{shortParty(me.party)}</span>. Join {hasFund ? 'this' : 'a new'} demo fund as
            an LP: you accept with your own login and pay each notice from your own Canton wallet.
          </p>
          <div className="row">
            {joined ? (
              <button type="button" className="btn btn-primary" onClick={onJoined}>Continue as HackCanton LP</button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={busy !== null || starting || tour.isPending} onClick={() => void join(me.party)}>
                {busy === 'join' || starting
                  ? <><Spinner />{starting ? 'Starting the fund and inviting your party…' : 'Inviting your party…'}</>
                  : hasFund ? 'Join as an LP' : 'Start a demo fund and join as an LP'}
              </button>
            )}
            <button type="button" className="btn btn-quiet" disabled={busy !== null || starting} onClick={signOut}>Sign out</button>
          </div>
        </>
      ) : (
        <>
          <p className="t-sm muted">
            Take a seat as yourself instead of a demo LP. Your browser reads your notices with your own login, and you pay from your
            own Canton wallet. DRAW&rsquo;s server never sees your login.{hasFund ? '' : ' Joining starts this browser’s demo fund first.'}
          </p>
          <div>
            <button
              type="button"
              className="btn"
              disabled={opening}
              onClick={() => {
                setOpening(true);
                startSignIn(config, '/onboard').catch(() => setOpening(false));
              }}
            >
              {opening ? <><Spinner />Opening HackCanton sign-in…</> : 'Sign in with HackCanton'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SeatPreview({ role }: { role: Role }) {
  return (
    <div className={styles.preview} key={role}>
      <p className={styles.previewLabel}>{role === 'admin' ? 'Example: what the fund manager sees' : role === 'outsider' ? 'Example: what an outsider sees' : `Example: what ${seatName(role)} sees`}</p>
      {role === 'admin' ? (
        <>
          <div className={styles.previewRow}><span>LP A</span><b>{usd(CALL_USD.lpA)}</b><em className="mark mark-good">Funded</em></div>
          <div className={styles.previewRow}><span>LP B</span><b>{usd(CALL_USD.lpB)}</b><em className="mark mark-wait">Locked</em></div>
          <div className={styles.previewRow}><span>LP C</span><b>{usd(CALL_USD.lpC)}</b><em className="mark">Due</em></div>
          <div className={styles.previewTotal}><span>Deployable now</span><b>{usd(CALL_USD.lpA)}</b></div>
        </>
      ) : role === 'outsider' ? (
        <div className={styles.previewEmpty}><IconEyeOff size={18} />The ledger returns nothing about this fund.</div>
      ) : (
        <>
          <div className={styles.previewRow}><span>{seatName(role)}</span><b>{usd(CALL_USD[role])}</b><em className="mark mark-wait">Due</em></div>
          {['lpA', 'lpB', 'lpC'].filter((r) => r !== role).map((r) => (
            <div key={r} className={`${styles.previewRow} ${styles.previewHidden}`}><i /><span>Not on your ledger</span></div>
          ))}
        </>
      )}
    </div>
  );
}

function SeatStep({ view, held, loading, failed, onPick }: { view: View | undefined; held: Partial<Record<Role, boolean>>; loading: boolean; failed: boolean; onPick: (role: Role) => void }) {
  return (
    <div className="stack-6">
      <div className="stack-3">
        <h1 className="t-h1">Who are you in this fund?</h1>
        <p className="t-lead">
          Each seat is a different Canton party. What you see after this comes from that party&rsquo;s own ledger, so an LP never sees
          another LP&rsquo;s notice.
        </p>
      </div>
      {failed && <p className="form-error">DRAW could not reach the ledger. Try again in a minute.</p>}
      {view && !view.session && (
        <div className={styles.callout}>
          <p className="t-h3">{view.tours ? 'This browser has no demo fund yet' : 'No demo fund is running'}</p>
          <p className="t-sm muted">
            {view.browserKeys
              ? 'Start the demo first. Then each person, the fund manager first, creates their own party and key.'
              : `Start one first. It creates a fund for this browser, sends each LP a private invitation, and tops up their test Canton Coin if it is low. Other visitors get their own.${view.accessCodeRequired && !view.accessCode ? ' Creating it needs an access code from the DRAW team.' : ''}`}
          </p>
          <div><ActionButton name="setup" body={{}} busyLabel="Starting on the ledger…">{view.browserKeys ? 'Start the demo' : 'Create the demo fund'}</ActionButton></div>
        </div>
      )}
      <div className={styles.seats} role="list">
        {SEATS.map((seat) => {
          const state = seatState(view, seat.role, Boolean(held[seat.role]));
          const taken = view?.browserKeys && view.accounts?.includes(seat.role) && !held[seat.role];
          return (
            <button key={seat.role} type="button" role="listitem" className={styles.seat} disabled={loading || Boolean(taken) || !view?.session} onClick={() => onPick(seat.role)}>
              <span className={styles.seatTop}>
                <span className={styles.seatIcon}>{seat.role === 'admin' ? <IconBuilding size={20} /> : <IconUser size={20} />}</span>
                <span className={styles.seatArrow}><IconArrowRight size={18} /></span>
              </span>
              <span className={styles.seatName}>{seat.name}</span>
              <span className="t-sm muted">{seat.what}</span>
              {loading ? <span className="sk" style={{ width: 120, height: 14 }} /> : state && <span className={styles.seatState}>{state}</span>}
            </button>
          );
        })}
      </div>
      {view?.session && !view.browserKeys && (
        <p className="t-sm muted">
          Just looking? <button type="button" className="link" onClick={() => onPick('outsider')}>Sit as an unrelated party</button> to see what
          someone outside the fund can read.
        </p>
      )}
    </div>
  );
}

// `view` is the chosen seat's own read, for its party. `site` is the view the
// seat list already loaded, which says how this site signs.
function SharedPartyStep({ role, view, site, onBack, onNext }: { role: Role; view: View | undefined; site: View | undefined; onBack: () => void; onNext: () => void }) {
  const party = view?.session && 'queriedAs' in view ? view.queriedAs.party : null;
  if (view?.session === false) {
    return (
      <div className="stack-6">
        <div className={styles.callout}>
          <p className="t-h3">This browser has no demo fund yet</p>
          <p className="t-sm muted">Go back and create the demo fund first. Then each seat reads its own ledger.</p>
        </div>
        <div className="row">
          <button type="button" className="btn btn-quiet" onClick={onBack}>Choose another seat</button>
        </div>
      </div>
    );
  }
  return (
    <div className="stack-6">
      <div className="stack-3">
        <h1 className="t-h1">Your party on {view?.network ?? 'the network'}</h1>
        <p className="t-lead">You will act as this Canton party. Every screen is read from the ledger with its identity.</p>
      </div>
      <div className="sheet sheet-pad stack-4">
        <dl className="kv">
          <dt>Seat</dt><dd>{seatName(role)}</dd>
          <dt>Party</dt><dd>{party ? <span className="mono">{party}</span> : <span className="sk" style={{ width: 220, height: 14 }} />}</dd>
          <dt>Network</dt><dd>{view?.network ?? ''}</dd>
        </dl>
      </div>
      <div className={styles.callout}>
        <p className="t-h3">How signing works here</p>
        {!site ? (
          <span className="sk" style={{ width: '100%', height: 42 }} />
        ) : site.seatCredential === 'per-seat' && !site.singleCredential ? (
          <p className="t-sm muted">This party has its own ledger login on {site.network}, and every read and action uses it.</p>
        ) : (
          <p className="t-sm muted">
            {site.network === 'DevNet' ? 'The shared HackCanton node does not let teams create parties that hold their own keys yet, so ' : 'On this network '}
            {site.seatCredential === 'backend-client' ? 'DRAW’s backend login' : site.network === 'DevNet' ? 'one hackathon login' : 'one login'} submits
            for every demo party.{site.separateVerifier ? ' A different login reads each settlement back.' : ' The same login reads each settlement back.'} Privacy still comes from the
            ledger: each party&rsquo;s reads return only its own records.{site.signIn ? ' To act as yourself, sign in with your own HackCanton login as an LP.' : ''}{' '}
            On LocalNet a scripted run had every party sign with its own key.
          </p>
        )}
      </div>
      <div className="row">
        <button type="button" className="btn btn-primary" disabled={!party} onClick={onNext}>Continue</button>
        <button type="button" className="btn btn-quiet" onClick={onBack}>Choose another seat</button>
      </div>
    </div>
  );
}

function KeyStep({ role, network, tag, onBack, onNext }: { role: Role; network: string; tag: string; onBack: () => void; onNext: () => void }) {
  const { act, notify } = useActions();
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function create() {
    setWorking(true);
    setProblem(null);
    try {
      const publicKeySpki = await createKey(network, tag, role);
      const started = await startOnboarding(role, publicKeySpki);
      const signature = await signHash(network, tag, role, started.multiHash);
      if (await act('onboardfinish', { role, signature }, 'onboard')) onNext();
    } catch (error) {
      if (error instanceof AccessCodeNeeded) notify(error.message, 'bad');
      setProblem(error instanceof Error ? error.message : 'Creating the account failed.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="stack-6">
      <div className="stack-3">
        <h1 className="t-h1">Create your signing key</h1>
        <p className="t-lead">
          This browser generates an Ed25519 key and registers a {seatName(role)} party for it on {network}. The key never leaves this
          browser. Every action this party takes needs your signature, so DRAW cannot act for you.
        </p>
      </div>
      <ol className={styles.substeps}>
        <li>Generate the key here</li>
        <li>The node prepares your party for that public key</li>
        <li>You sign once to create it</li>
      </ol>
      {problem && <p className="form-error">{problem}</p>}
      <div className="row">
        <button type="button" className="btn btn-primary btn-lg" disabled={working} onClick={() => void create()}>
          {working ? 'Creating your party…' : 'Create key and party'}
        </button>
        <button type="button" className="btn btn-quiet" disabled={working} onClick={onBack}>Choose another seat</button>
      </div>
    </div>
  );
}

function BackupStep({ role, network, tag, onNext }: { role: Role; network: string; tag: string; onNext: () => void }) {
  const [saved, setSaved] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  async function download() {
    const pem = await backupPem(network, tag, role);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([pem], { type: 'application/x-pem-file' }));
    link.download = `draw-${role}-key.pem`;
    link.click();
    URL.revokeObjectURL(link.href);
    setDownloaded(true);
  }

  return (
    <div className="stack-6">
      <div className="stack-3">
        <h1 className="t-h1">Back up your key</h1>
        <p className="t-lead">
          Your party exists now and only this key controls it. If you clear this browser&rsquo;s data without a backup, nobody can
          recover the party, including DRAW.
        </p>
      </div>
      <button type="button" className="btn btn-lg" onClick={() => void download()}>{downloaded ? 'Download again' : 'Download key backup'}</button>
      <label className={styles.check}>
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        <span>I saved the backup somewhere safe.</span>
      </label>
      <div><button type="button" className="btn btn-primary" disabled={!saved} onClick={onNext}>Continue</button></div>
    </div>
  );
}

// `publicCode` is set when the operator prints the code for every visitor.
function AccessStep({ publicCode, onNext }: { publicCode: string | null; onNext: () => void }) {
  const [code, setCode] = useState(publicCode ?? '');
  return (
    <form
      className="stack-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (code.trim()) rememberAccessCode(code.trim());
        onNext();
      }}
    >
      <div className="stack-3">
        <h1 className="t-h1">Access code</h1>
        <p className="t-lead">
          {publicCode ? (
            <>
              The demo fund lives on a shared network, so actions need an access code. This demo&rsquo;s code is public, and it is
              filled in below: <strong className="mono">{publicCode}</strong>
            </>
          ) : (
            'The demo fund lives on a shared network, so actions need an access code from the DRAW team. Without one you can still read everything your seat can see.'
          )}
        </p>
      </div>
      <div className="field" style={{ maxWidth: 360 }}>
        <label htmlFor="access-code">Access code</label>
        <input id="access-code" className="input" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={!code.trim()}>Save and continue</button>
        <button type="button" className="btn btn-quiet" onClick={onNext}>Continue read-only</button>
      </div>
    </form>
  );
}

