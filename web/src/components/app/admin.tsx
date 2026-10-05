'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useActions } from '@/components/session';
import { PAYMENT_KIND, coin, dateTime, isPast, relative, roleName, units, usd } from '@/lib/format';
import type { Call, Investor, Obligation, ViewWithSession } from '@/lib/types';

import { IconCheck } from '@/components/icons';

import { Identicon } from './shell';
import { ActionButton, LedgerDetails, NoteAction, PageHead, ReceiptCard, Spinner, StatusMark, Timeline, ZeroState } from './ui';
import styles from './screens.module.css';

const INVESTORS: Investor[] = ['lpA', 'lpB', 'lpC'];
const DEFAULT_COMMITMENT: Record<Investor, number> = { lpA: 1000000, lpB: 700000, lpC: 500000 };
const FIRST_CALL: Record<Investor, { usd: number; units: number }> = {
  lpA: { usd: 400000, units: 40 },
  lpB: { usd: 350000, units: 35 },
  lpC: { usd: 250000, units: 25 },
};

const OPEN = new Set(['Issued', 'PaymentPending', 'Overdue']);
const hasMatch = (o: Obligation) => o.payments.some((p) => p.kind === 'match');
const canMarkOverdue = (o: Obligation) => (o.ledgerState === 'Issued' || o.ledgerState === 'PaymentPending') && isPast(o.dueAt) && !hasMatch(o);

// ---------------------------------------------------------------- no fund yet
export function StartFund({ network, browserKeys }: { network: string; browserKeys: boolean }) {
  return (
    <ZeroState
      title="Start the demo fund"
      action={<ActionButton name="setup" body={{}} busyLabel="Creating the fund on the ledger…">{browserKeys ? 'Start the demo' : 'Create the demo fund'}</ActionButton>}
    >
      {browserKeys ? (
        <p>Each person in the demo creates their own party with a key in their browser. You create the fund next, then invite investors once they have joined.</p>
      ) : (
        <p>This creates the fund on {network}, gives each of the three LPs test Canton Coin, and sends each one a private invitation to commit. It takes about a minute.</p>
      )}
    </ZeroState>
  );
}

export function CreateFund() {
  const [name, setName] = useState('Example Ventures I');
  return (
    <ZeroState title="Name your fund" action={<ActionButton name="fund" body={{ fundName: name }} busyLabel="Creating…">Create fund</ActionButton>}>
      <p>The fund is a contract only you sign. LPs see it only through their own commitment.</p>
      <div className="field" style={{ maxWidth: 360 }}>
        <label htmlFor="fund-name">Fund name</label>
        <input id="fund-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
    </ZeroState>
  );
}

// ---------------------------------------------------------------- overview
export function Overview({ view }: { view: ViewWithSession }) {
  const obligations = view.calls.flatMap((c) => c.obligations);
  const ready = view.payments.filter((p) => p.recommendation === 'settle' && p.investor);
  const exceptions = view.payments.filter((p) => p.recommendation === 'manual-review' || p.recommendation === 'payer-withdraws');
  const overdue = obligations.filter(canMarkOverdue);
  const review = obligations.filter((o) => o.ledgerState === 'ManualReview');
  const pendingInvites = view.invitations.length;
  const callOf = (ref: string) => obligations.find((o) => o.ref === ref)?.callId ?? '';
  const nothingToDo = !ready.length && !exceptions.length && !overdue.length && !review.length && !pendingInvites;
  const t = view.totals;

  return (
    <>
      <PageHead
        title={view.fund?.name ?? view.fundName}
        lead="What is deployable now, and what is still unresolved."
        actions={<Link href="/app/calls/new" className="btn btn-primary">Create capital call</Link>}
      />

      <Figures
        items={[
          { label: 'Deployable now', value: usd(t.fundedUsd), note: 'Funded and independently verified', tone: 'good' },
          { label: 'Unresolved', value: usd(t.unresolvedUsd), note: 'Called, not yet verified funded', tone: t.unresolvedUsd ? 'wait' : undefined },
          { label: 'Called', value: usd(t.calledUsd), note: `${t.fundedCount} of ${t.count} notices funded` },
        ]}
      />

      <div className={styles.twoCol}>
        <section className="module module-pad">
          <div className={styles.moduleHead}>
            <h2 className="t-h3">Capital calls</h2>
            {view.calls.length > 0 && <Link href="/app/calls" className="link t-sm">All calls</Link>}
          </div>
          {view.calls.length === 0 ? (
            <div className="stack-3">
              <p className="muted">
                {view.commitments.length
                  ? `${view.commitments.length} of 3 investors have committed. Call capital from them when you are ready.`
                  : 'No investor has accepted a commitment yet. Calls can go out once they do.'}
              </p>
              {view.commitments.length > 0 && <Link href="/app/calls/new" className="btn">Create the first call</Link>}
            </div>
          ) : <CallsTable calls={view.calls.slice(0, 5)} />}
        </section>

        <section className="module module-pad">
          <div className={styles.moduleHead}><h2 className="t-h3">Needs your attention</h2></div>
          {nothingToDo ? (
            <div className={styles.calm}>
              <span className={styles.calmIcon}><IconCheck size={18} /></span>
              <p className="t-h4">Nothing is waiting on you</p>
              <p className="t-sm muted">Payments to settle, overdue notices and open invitations show up here.</p>
            </div>
          ) : (
            <ul className={styles.attention}>
              {ready.map((p) => (
                <li key={p.allocationCid}>
                  <p>{roleName(p.from)} locked {units(p.amount)} CC for {callOf(p.obligationRef)}</p>
                  <ActionButton className="btn btn-sm btn-primary" name="settle" body={{ ref: p.obligationRef, allocationCid: p.allocationCid }} busyLabel="Settling…">Settle</ActionButton>
                </li>
              ))}
              {exceptions.length > 0 && (
                <li><p>{exceptions.length} payment{exceptions.length > 1 ? 's' : ''} cannot be settled as sent</p><Link href="/app/payments" className="btn btn-sm">Review</Link></li>
              )}
              {overdue.map((o) => (
                <li key={o.ref}>
                  <p>{roleName(o.investor)} is past due on {o.callId}</p>
                  <ActionButton className="btn btn-sm" name="overdue" body={{ ref: o.ref }} busyLabel="Marking…">Mark overdue</ActionButton>
                </li>
              ))}
              {review.map((o) => (
                <li key={o.ref}><p>{roleName(o.investor)} on {o.callId} is in review</p><Link href={`/app/calls/${encodeURIComponent(o.callId)}`} className="btn btn-sm">Open</Link></li>
              ))}
              {pendingInvites > 0 && (
                <li><p>{pendingInvites} invitation{pendingInvites > 1 ? 's' : ''} not accepted yet</p><Link href="/app/investors" className="btn btn-sm">Investors</Link></li>
              )}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

export function Figures({ items }: { items: { label: string; value: string; note: string; tone?: 'good' | 'wait' }[] }) {
  return (
    <div className={styles.figures}>
      {items.map((item, index) => (
        <div key={item.label} className={`${styles.figure} ${index === 0 ? styles.figureLead : ''}`}>
          <p className={styles.figureLabel}>{item.label}</p>
          <p className={`${styles.figureValue} ${index > 0 && item.tone === 'wait' ? styles.wait : ''}`}>{item.value}</p>
          <p className={styles.figureNote}>{item.note}</p>
        </div>
      ))}
    </div>
  );
}

function CallsTable({ calls }: { calls: Call[] }) {
  return (
    <table className="table table-stack">
      <thead>
        <tr><th>Call</th><th className="hide-sm">Due</th><th className="num">Called</th><th className="num">Funded</th></tr>
      </thead>
      <tbody>
        {calls.map((call) => (
          <tr key={call.callId}>
            <td>
              <Link className={styles.rowLink} href={`/app/calls/${encodeURIComponent(call.callId)}`}>{call.callId}</Link>
              <span className="sub">{call.totals.fundedCount} of {call.totals.count} funded{call.totals.unresolvedUsd === 0 ? ', closed' : ''}</span>
              <span className={styles.callBar} aria-hidden="true"><span style={{ width: `${call.totals.calledUsd ? (call.totals.fundedUsd / call.totals.calledUsd) * 100 : 0}%` }} /></span>
            </td>
            <td className="hide-sm">{dateTime(call.dueAt)}<span className="sub">{relative(call.dueAt)}</span></td>
            <td className="num">{usd(call.totals.calledUsd)}</td>
            <td className="num">{usd(call.totals.fundedUsd)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CallsPage({ view }: { view: ViewWithSession }) {
  return (
    <>
      <PageHead title="Capital calls" lead="Every call this fund has issued, newest first." actions={<Link href="/app/calls/new" className="btn btn-primary">Create capital call</Link>} />
      {view.calls.length === 0
        ? <ZeroState title="No calls yet" action={<Link href="/app/calls/new" className="btn btn-primary">Create the first call</Link>}><p>A call becomes one private notice per investor.</p></ZeroState>
        : <section className="module module-pad"><CallsTable calls={view.calls} /></section>}
    </>
  );
}

// ---------------------------------------------------------------- create call
function defaultDue(): string {
  const at = new Date(Date.now() + 10 * 60_000);
  at.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

export function CreateCall({ view }: { view: ViewWithSession }) {
  const router = useRouter();
  const { act, busy } = useActions();
  const first = view.calls.length === 0;
  const accepted = INVESTORS.filter((r) => view.commitments.some((c) => c.investor === r));
  const [name, setName] = useState(`Call ${view.calls.length + 1}`);
  const [description, setDescription] = useState(first ? 'Initial close drawdown' : '');
  const [dueAt, setDueAt] = useState(defaultDue);
  const [rows, setRows] = useState(() => Object.fromEntries(INVESTORS.map((r) => [r, first ? { usd: String(FIRST_CALL[r].usd), units: String(FIRST_CALL[r].units) } : { usd: '', units: '' }])));
  const [problem, setProblem] = useState<string | null>(null);
  const updateRow = (role: Investor, field: 'usd' | 'units', value: string) =>
    setRows((prev) => ({ ...prev, [role]: { usd: prev[role]?.usd ?? '', units: prev[role]?.units ?? '', [field]: value } }));

  const total = accepted.reduce((s, r) => s + (Number(rows[r]?.usd) || 0), 0);
  const remaining = (r: Investor) => {
    const c = view.commitments.find((x) => x.investor === r);
    return c ? c.committedUsd - c.calledUsd : 0;
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const overCommitted = accepted.find((r) => (Number(rows[r]?.usd) || 0) > remaining(r));
    if (overCommitted) {
      setProblem(`${roleName(overCommitted)} only has ${usd(remaining(overCommitted))} left to call.`);
      return;
    }
    setProblem(null);
    const payload = accepted.map((r) => ({ role: r, scenarioUsd: Number(rows[r]?.usd) || 0, units: Number(rows[r]?.units) || 0 }));
    if (await act('issue', { callId: name, description, dueAt, rows: payload }, 'issue')) router.push(`/app/calls/${encodeURIComponent(name.trim())}`);
  }

  if (!accepted.length) {
    return (
      <ZeroState title="No investor has committed yet" action={<Link href="/app/investors" className="btn">See invitations</Link>}>
        <p>Each investor accepts its commitment from its own seat. Once one has, you can call capital from it.</p>
      </ZeroState>
    );
  }

  return (
    <>
      <PageHead title="Create capital call" back={{ href: '/app/calls', label: 'Calls' }} lead={`Each investor receives a private notice for its own amount only. Dollar amounts are the business figure. Canton Coin is what each investor pays on ${view.network}.`} />
      <form className="module module-pad stack-6" onSubmit={submit}>
        <div className={styles.formGrid}>
          <div className="field">
            <label htmlFor="call-name">Name or reference</label>
            <input id="call-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="call-due">Due</label>
            <input id="call-due" className="input" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required />
            <span className="hint">{dueAt ? relative(new Date(dueAt).toISOString()) : ''}</span>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="call-note">Note to investors</label>
            <input id="call-note" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What the capital is for" />
          </div>
        </div>
        <table className="table">
          <thead><tr><th>Investor</th><th className="num hide-sm">Left to call</th><th className="num">Amount ($)</th><th className="num">Pays (CC)</th></tr></thead>
          <tbody>
            {accepted.map((r) => (
              <tr key={r}>
                <td><strong>{roleName(r)}</strong></td>
                <td className="num hide-sm">{usd(remaining(r))}</td>
                <td className="num"><input className={`input input-num ${styles.cellInput}`} aria-label={`Amount called from ${roleName(r)}`} inputMode="numeric" value={rows[r]?.usd ?? ''} onChange={(e) => updateRow(r, 'usd', e.target.value)} /></td>
                <td className="num"><input className={`input input-num ${styles.cellInputSm}`} aria-label={`Canton Coin for ${roleName(r)}`} inputMode="decimal" value={rows[r]?.units ?? ''} onChange={(e) => updateRow(r, 'units', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={styles.summary}>
          <div className="stack-1">
            <p className="t-sm muted">Total called</p>
            <p className={styles.summaryFig}>{usd(total)}</p>
          </div>
          <p className="t-sm muted" style={{ maxWidth: '34ch' }}>Each investor sees only its own line. Nobody sees this total but you.</p>
        </div>
        {problem && <p className="form-error">{problem}</p>}
        <div className="row">
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy !== null}>{busy === 'issue' ? <><Spinner />Issuing on the ledger…</> : 'Issue capital call'}</button>
          <Link href="/app/calls" className="btn btn-quiet">Cancel</Link>
        </div>
      </form>
    </>
  );
}

// ---------------------------------------------------------------- call detail
function RowActions({ o }: { o: Obligation }) {
  const matches = o.payments.filter((p) => p.kind === 'match');
  return (
    <div className="row" style={{ gap: 8 }}>
      {matches.map((p) => (
        <ActionButton key={p.allocationCid} className="btn btn-sm btn-primary" name="settle" body={{ ref: o.ref, allocationCid: p.allocationCid }} busyLabel="Settling…">
          Settle {units(p.amount)} CC
        </ActionButton>
      ))}
      {canMarkOverdue(o) && <ActionButton className="btn btn-sm" name="overdue" body={{ ref: o.ref }} busyLabel="Marking…">Mark overdue</ActionButton>}
      {o.status === 'pending-stale' && <NoteAction name="release" obligationRef={o.ref} label="Release" placeholder="Why the payment went away" />}
      {OPEN.has(o.ledgerState) && !matches.length && <NoteAction name="flag" obligationRef={o.ref} label="Send to review" placeholder="What needs checking" />}
      {o.ledgerState === 'ManualReview' && <NoteAction name="reopen" obligationRef={o.ref} label="Reopen" placeholder="What the review found" />}
      {(o.ledgerState === 'Overdue' || o.ledgerState === 'ManualReview') && <NoteAction name="waive" obligationRef={o.ref} label="Waive" placeholder="Why this is waived" danger />}
    </div>
  );
}

export function CallDetail({ view, callId }: { view: ViewWithSession; callId: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const call = view.calls.find((c) => c.callId === callId);
  if (!call) {
    return <ZeroState title="No such call" action={<Link href="/app/calls" className="btn">All calls</Link>}><p>No capital call named {callId} is visible to the fund manager.</p></ZeroState>;
  }
  const t = call.totals;
  const share = (n: number) => (t.calledUsd ? `${(n / t.calledUsd) * 100}%` : '0%');
  const waiting = t.calledUsd - t.fundedUsd - t.waivedUsd;
  return (
    <>
      <PageHead title={call.callId} back={{ href: '/app/calls', label: 'Calls' }} lead={`${call.description && call.description !== call.callId ? `${call.description}. ` : ''}Due ${dateTime(call.dueAt)}, ${relative(call.dueAt)}.`} />
      <Figures
        items={[
          { label: 'Funded and verified', value: usd(t.fundedUsd), note: `${units(t.fundedUnits)} CC received`, tone: 'good' },
          { label: 'Unresolved', value: usd(t.unresolvedUsd), note: `${t.count - t.fundedCount} of ${t.count} notices`, tone: t.unresolvedUsd ? 'wait' : undefined },
          { label: 'Called', value: usd(t.calledUsd), note: t.waivedUsd ? `${usd(t.waivedUsd)} waived` : 'Nothing waived' },
        ]}
      />
      <section className="module module-pad">
        <div className={styles.moduleHead}><h2 className="t-h3">Notices</h2><span className="t-sm muted">{t.fundedCount} of {t.count} funded</span></div>
        <div className={styles.progress} role="img" aria-label={`${usd(t.fundedUsd)} of ${usd(t.calledUsd)} funded`}>
          <span className={styles.pGood} style={{ width: share(t.fundedUsd) }} />
          <span className={styles.pWait} style={{ width: share(waiting) }} />
          <span className={styles.pPlain} style={{ width: share(t.waivedUsd) }} />
        </div>
        <div className={styles.legend}>
          <span><i style={{ background: 'var(--funded)' }} />Funded {usd(t.fundedUsd)}</span>
          <span><i style={{ background: 'var(--waiting)' }} />Waiting {usd(waiting)}</span>
          {t.waivedUsd > 0 && <span><i style={{ background: 'var(--ink-3)' }} />Waived {usd(t.waivedUsd)}</span>}
        </div>
        <ul className={styles.obligations}>
          {call.obligations.map((o) => (
            <li key={o.ref} className={styles.obligation}>
              <div className={styles.obligationHead}>
                <Identicon seed={o.investor} size={36} />
                <div>
                  <p className="t-h3">{roleName(o.investor)}</p>
                  <p className="t-xs faint">{units(o.units)} {coin(o.instrument)}</p>
                </div>
                <p className={styles.amount}>{usd(o.scenarioUsd)}</p>
                <StatusMark status={o.status} audience="admin" />
              </div>
              <div className="row between">
                <RowActions o={o} />
                <button type="button" className="link t-sm" aria-expanded={open === o.ref} onClick={() => setOpen(open === o.ref ? null : o.ref)}>
                  {open === o.ref ? 'Hide details' : 'Details'}
                </button>
              </div>
              {open === o.ref && (
                <div className={`panel stack-4 ${styles.detail}`}>
                  {o.note && <p><strong>Note on record:</strong> {o.note}</p>}
                  {o.payments.length > 0 && (
                    <div className="stack-2">
                      <p className="t-sm" style={{ fontWeight: 650 }}>Payments the fund can see for this notice</p>
                      <ul className="t-sm muted" style={{ margin: 0, paddingLeft: 18 }}>
                        {o.payments.map((p) => <li key={p.allocationCid}>{units(p.amount)} CC from {roleName(p.from)}: {PAYMENT_KIND[p.kind]}</li>)}
                      </ul>
                    </div>
                  )}
                  {o.receipt && <ReceiptCard receipt={o.receipt} />}
                  <div className="stack-3">
                    <p className="t-sm" style={{ fontWeight: 650 }}>Settlement timeline</p>
                    <Timeline entries={o.timeline} />
                  </div>
                  <LedgerDetails obligation={o} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

// ---------------------------------------------------------------- payments
const NEXT_STEP: Record<string, string> = {
  settle: 'Ready to settle',
  'manual-review': 'Needs a decision',
  'payer-withdraws': 'The ledger will refuse it. The payer withdraws it.',
  ignore: 'Not for this fund',
};

export function PaymentsPage({ view }: { view: ViewWithSession }) {
  const obligations = view.calls.flatMap((c) => c.obligations);
  const byRef = new Map(obligations.map((o) => [o.ref, o]));
  return (
    <>
      <PageHead title="Incoming payments" lead="Every Canton Coin allocation the fund can see, matched against open notices. Only an exact match can settle, and the ledger is what decides that." />
      {view.payments.length === 0 ? (
        <ZeroState title="No payments waiting"><p>When an LP locks coin against a notice, it shows up here.</p></ZeroState>
      ) : (
        <section className="module module-pad">
          <table className="table table-stack">
            <thead><tr><th>From</th><th>Against</th><th className="num">Amount</th><th>What it is</th><th>Next step</th></tr></thead>
            <tbody>
              {view.payments.map((p) => {
                const o = byRef.get(p.obligationRef);
                return (
                  <tr key={p.allocationCid}>
                    <td><strong>{roleName(p.from)}</strong><span className="sub">{dateTime(p.requestedAt)}</span></td>
                    <td>{o ? <Link href={`/app/calls/${encodeURIComponent(o.callId)}`} className={styles.rowLink}>{roleName(o.investor)}, {o.callId}</Link> : <span className="muted">Unknown reference</span>}</td>
                    <td className="num">{units(p.amount)} CC{p.amountDue !== null && p.amountDue !== p.amount ? <span className="sub">due {units(p.amountDue)}</span> : null}</td>
                    <td className="wide">{p.kind === 'match' ? <span className="mark mark-good">{PAYMENT_KIND[p.kind]}</span> : <span className="mark mark-bad">{PAYMENT_KIND[p.kind]}</span>}</td>
                    <td className="wide">
                      <div className="row" style={{ gap: 8 }}>
                        {p.recommendation === 'settle' && o
                          ? <ActionButton className="btn btn-sm btn-primary" name="settle" body={{ ref: o.ref, allocationCid: p.allocationCid }} busyLabel="Settling…">Settle</ActionButton>
                          : <span className="t-sm muted">{NEXT_STEP[p.recommendation]}</span>}
                        {p.recommendation === 'manual-review' && o && OPEN.has(o.ledgerState) && (
                          <NoteAction name="flag" obligationRef={o.ref} label="Send notice to review" placeholder="What needs checking" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}

// ---------------------------------------------------------------- investors
export function InvestorsPage({ view }: { view: ViewWithSession }) {
  return (
    <>
      <PageHead title="Investors" lead="Each commitment is a separate contract between the fund and one investor. No investor can see another's." />
      <section className="module module-pad">
        <table className="table table-stack">
          <thead><tr><th>Investor</th><th className="num">Committed</th><th className="num">Called</th><th className="num">Left to call</th></tr></thead>
          <tbody>
            {INVESTORS.map((r) => {
              const c = view.commitments.find((x) => x.investor === r);
              const invited = view.invitations.find((x) => x.investor === r);
              const canInvite = view.browserKeys && !c && !invited && view.accounts?.includes(r);
              return (
                <tr key={r}>
                  <td className="wide">
                    <span className="row" style={{ gap: 12, flexWrap: 'nowrap' }}><Identicon seed={r} size={32} /><strong>{roleName(r)}</strong></span>
                    {!c && <span className="sub">{invited ? 'Invitation not accepted yet' : view.browserKeys && !view.accounts?.includes(r) ? 'Has not joined yet' : 'Not invited'}</span>}
                    {canInvite && (
                      <div style={{ marginTop: 8 }}>
                        <ActionButton className="btn btn-sm btn-primary" name="invite" body={{ role: r, committedUsd: DEFAULT_COMMITMENT[r] }} busyLabel="Inviting…">Invite for {usd(DEFAULT_COMMITMENT[r])}</ActionButton>
                      </div>
                    )}
                  </td>
                  <td className="num">{c ? usd(c.committedUsd) : invited ? usd(invited.committedUsd) : 'None'}</td>
                  <td className="num">{c ? usd(c.calledUsd) : 'None'}</td>
                  <td className="num">{c ? usd(c.committedUsd - c.calledUsd) : 'None'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <details className="more" style={{ marginTop: 32 }}>
        <summary>Start over</summary>
        <div className="stack-3">
          <p className="t-sm muted">Starts a new demo fund. The current one stays on the ledger, but the app stops showing it.</p>
          <ActionButton className="btn btn-sm btn-danger" name="reset" body={{}} confirm="Start over with a new demo fund?" busyLabel="Clearing…">Start a new demo fund</ActionButton>
        </div>
      </details>
    </>
  );
}
