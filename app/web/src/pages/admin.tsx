import { useState, type FormEvent } from 'react';

import { ActionButton, Empty, LedgerDetails, NoteAction, ReceiptView, StatusBadge, Timeline } from '../components';
import { PAYMENT_KIND, dateTime, isPast, relative, roleName, units, usd } from '../format';
import { href, navigate, useApp } from '../state';
import type { Call, Investor, Obligation, ViewWithSession } from '../types';

const INVESTORS: Investor[] = ['lpA', 'lpB', 'lpC'];
const FIRST_CALL: Record<Investor, { usd: number; units: number }> = {
  lpA: { usd: 400000, units: 40 },
  lpB: { usd: 350000, units: 35 },
  lpC: { usd: 250000, units: 25 },
};

const OPEN = new Set(['Issued', 'PaymentPending', 'Overdue']);
const hasMatch = (o: Obligation) => o.payments.some((p) => p.kind === 'match');
const canMarkOverdue = (o: Obligation) => (o.ledgerState === 'Issued' || o.ledgerState === 'PaymentPending') && isPast(o.dueAt) && !hasMatch(o);

// ---------------------------------------------------------------- setup
export function SetupPage({ network }: { network: string }) {
  return (
    <Empty title="Start a demo fund">
      <p>
        This creates a fund admin, three investors, and an unrelated party on {network}, each with its own ledger login.
        Investors get test Amulet and an invitation to commit. All names are demo data.
      </p>
      <ActionButton name="setup" body={{}}>Create demo fund</ActionButton>
    </Empty>
  );
}

// ---------------------------------------------------------------- dashboard
export function AdminHome({ view }: { view: ViewWithSession }) {
  const obligations = view.calls.flatMap((c) => c.obligations);
  const ready = view.payments.filter((p) => p.recommendation === 'settle' && p.investor);
  const exceptions = view.payments.filter((p) => p.recommendation === 'manual-review' || p.recommendation === 'payer-withdraws');
  const overdue = obligations.filter(canMarkOverdue);
  const review = obligations.filter((o) => o.ledgerState === 'ManualReview');
  const pendingInvites = view.invitations.length;
  const callOf = (ref: string) => obligations.find((o) => o.ref === ref)?.callId ?? '';
  const nothingToDo = !ready.length && !exceptions.length && !overdue.length && !review.length && !pendingInvites;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{view.fund?.name ?? view.fundName}</h1>
          <p className="muted">How much called capital is deployable now, and what is still unresolved.</p>
        </div>
        <a className="btn" href={href('calls', 'new')}>Create capital call</a>
      </div>

      <div className="figures">
        <div className="figure good"><span>Deployable now</span><strong>{usd(view.totals.fundedUsd)}</strong><small>funded and independently verified</small></div>
        <div className="figure bad"><span>Unresolved</span><strong>{usd(view.totals.unresolvedUsd)}</strong><small>called, not yet verified funded</small></div>
        <div className="figure"><span>Called</span><strong>{usd(view.totals.calledUsd)}</strong><small>{view.totals.fundedCount} of {view.totals.count} obligations funded</small></div>
      </div>

      <div className="grid">
        <section className="panel">
          <h2>Capital calls</h2>
          {view.calls.length === 0 ? (
            <p className="muted">No capital has been called yet. Once investors accept their commitments, create a call.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Call</th><th className="hide-sm">Due</th><th className="num">Called</th><th className="num">Funded</th><th className="num">Unresolved</th></tr>
              </thead>
              <tbody>
                {view.calls.map((call) => (
                  <tr key={call.callId}>
                    <td>
                      <a className="row-link" href={href('calls', call.callId)}>{call.callId}</a>
                      <span className="sub">{call.totals.fundedCount} of {call.totals.count} funded{call.totals.unresolvedUsd === 0 ? ', closed' : ''}</span>
                    </td>
                    <td className="hide-sm"><span className="nowrap">{dateTime(call.dueAt)}</span><span className="sub">{relative(call.dueAt)}</span></td>
                    <td className="num">{usd(call.totals.calledUsd)}</td>
                    <td className="num">{usd(call.totals.fundedUsd)}</td>
                    <td className="num">{usd(call.totals.unresolvedUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <aside className="panel">
          <h2>Needs attention</h2>
          {nothingToDo ? <p className="muted small">Nothing waiting on you.</p> : (
            <ul className="attention">
              {ready.map((p) => (
                <li key={p.allocationCid}>
                  <span>{roleName(p.from)} paid {units(p.amount)} Amulet for {callOf(p.obligationRef)}</span>
                  <ActionButton className="btn small" name="settle" body={{ ref: p.obligationRef, allocationCid: p.allocationCid }}>Settle</ActionButton>
                </li>
              ))}
              {exceptions.length > 0 && (
                <li><span>{exceptions.length} payment{exceptions.length > 1 ? 's' : ''} that cannot be settled as sent</span><a href={href('payments')}>Review</a></li>
              )}
              {overdue.map((o) => (
                <li key={o.ref}>
                  <span>{roleName(o.investor)} is past due on {o.callId}</span>
                  <ActionButton className="btn small quiet" name="overdue" body={{ ref: o.ref }}>Mark overdue</ActionButton>
                </li>
              ))}
              {review.map((o) => (
                <li key={o.ref}><span>{roleName(o.investor)} on {o.callId} is in manual review</span><a href={href('calls', o.callId)}>Open</a></li>
              ))}
              {pendingInvites > 0 && (
                <li><span>{pendingInvites} investor invitation{pendingInvites > 1 ? 's' : ''} not accepted yet</span><a href={href('investors')}>Investors</a></li>
              )}
            </ul>
          )}
        </aside>
      </div>
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
  const { act, busy } = useApp();
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
    if (await act('issue', { callId: name, description, dueAt, rows: payload }, 'issue')) navigate('calls', name.trim());
  }

  if (!accepted.length) {
    return (
      <Empty title="No investor has accepted yet">
        <p>Each investor accepts its commitment from its own login. Switch to an investor to accept, then come back.</p>
        <a href={href('investors')}>See invitations</a>
      </Empty>
    );
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h1>Create capital call</h1>
      <p className="muted">Each investor receives a private notice for its own amount only. Dollar amounts are the business scenario. Amulet is what each investor actually pays on {view.network}.</p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="call-name">Name or reference</label>
          <input id="call-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="call-due">Due</label>
          <input id="call-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required />
          <span className="sub">{dueAt ? relative(new Date(dueAt).toISOString()) : ''}</span>
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="call-note">Note to investors</label>
          <input id="call-note" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What the capital is for" />
        </div>
      </div>
      <table>
        <thead><tr><th>Investor</th><th className="num hide-sm">Left to call</th><th className="num">Amount called</th><th className="num">Settles in Amulet</th></tr></thead>
        <tbody>
          {accepted.map((r) => (
            <tr key={r}>
              <td>{roleName(r)}</td>
              <td className="num hide-sm">{usd(remaining(r))}</td>
              <td className="num"><input aria-label={`Amount called from ${roleName(r)}`} inputMode="numeric" value={rows[r]?.usd ?? ''} onChange={(e) => updateRow(r, 'usd', e.target.value)} /></td>
              <td className="num"><input aria-label={`Amulet for ${roleName(r)}`} inputMode="decimal" value={rows[r]?.units ?? ''} onChange={(e) => updateRow(r, 'units', e.target.value)} /></td>
            </tr>
          ))}
          <tr><td><strong>Total</strong></td><td className="hide-sm" /><td className="num"><strong>{usd(total)}</strong></td><td /></tr>
        </tbody>
      </table>
      {problem && <p className="form-error">{problem}</p>}
      <div className="actions" style={{ marginTop: 20 }}>
        <button type="submit" className="btn" disabled={busy !== null}>{busy === 'issue' ? 'Issuing on the ledger…' : 'Issue capital call'}</button>
        <a href={href()}>Cancel</a>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- call detail
function RowActions({ o }: { o: Obligation }) {
  const matches = o.payments.filter((p) => p.kind === 'match');
  return (
    <div className="actions">
      {matches.map((p) => (
        <ActionButton key={p.allocationCid} className="btn small" name="settle" body={{ ref: o.ref, allocationCid: p.allocationCid }}>
          Settle {units(p.amount)} Amulet
        </ActionButton>
      ))}
      {canMarkOverdue(o) && <ActionButton className="btn small quiet" name="overdue" body={{ ref: o.ref }}>Mark overdue</ActionButton>}
      {o.status === 'pending-stale' && <NoteAction name="release" obligationRef={o.ref} label="Release" placeholder="Why the payment went away" />}
      {OPEN.has(o.ledgerState) && !matches.length && <NoteAction name="flag" obligationRef={o.ref} label="Send to review" placeholder="What needs checking" />}
      {o.ledgerState === 'ManualReview' && <NoteAction name="reopen" obligationRef={o.ref} label="Reopen" placeholder="What the review found" />}
      {(o.ledgerState === 'Overdue' || o.ledgerState === 'ManualReview') && <NoteAction name="waive" obligationRef={o.ref} label="Waive" placeholder="Why this is waived" tone="danger" />}
    </div>
  );
}

function ObligationDetail({ o }: { o: Obligation }) {
  return (
    <div className="detail">
      {o.note && <p><strong>Note on record:</strong> {o.note}</p>}
      {o.payments.length > 0 && (
        <>
          <h3>Payments the fund can see for this obligation</h3>
          <ul>
            {o.payments.map((p) => (
              <li key={p.allocationCid}>{units(p.amount)} Amulet from {roleName(p.from)}: {PAYMENT_KIND[p.kind]}</li>
            ))}
          </ul>
        </>
      )}
      {o.receipt && <ReceiptView receipt={o.receipt} />}
      <h3 style={{ marginTop: 12 }}>Settlement timeline</h3>
      <Timeline entries={o.timeline} />
      <LedgerDetails obligation={o} />
    </div>
  );
}

export function CallDetail({ view, callId }: { view: ViewWithSession; callId: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const call: Call | undefined = view.calls.find((c) => c.callId === callId);
  if (!call) {
    return <Empty title="No such call"><p>No capital call named {callId} is visible to the fund admin.</p><a href={href()}>Back to calls</a></Empty>;
  }
  const t = call.totals;
  const share = (n: number) => (t.calledUsd ? `${(n / t.calledUsd) * 100}%` : '0%');
  const waiting = t.calledUsd - t.fundedUsd - t.waivedUsd;
  return (
    <>
      <div className="page-head">
        <div>
          <p className="small"><a href={href()}>All calls</a></p>
          <h1>{call.callId}</h1>
          <p className="muted">{call.description} Due {dateTime(call.dueAt)}, {relative(call.dueAt)}.</p>
        </div>
      </div>
      <div className="figures">
        <div className="figure good"><span>Funded and verified</span><strong>{usd(t.fundedUsd)}</strong><small>{units(t.fundedUnits)} Amulet received</small></div>
        <div className="figure bad"><span>Unresolved</span><strong>{usd(t.unresolvedUsd)}</strong><small>{t.count - t.fundedCount} of {t.count} obligations</small></div>
        <div className="figure"><span>Called</span><strong>{usd(t.calledUsd)}</strong><small>{t.waivedUsd ? `${usd(t.waivedUsd)} waived` : 'nothing waived'}</small></div>
      </div>
      <section className="panel">
        <h2>Investor obligations</h2>
        <div className="progress" aria-label={`${usd(t.fundedUsd)} of ${usd(t.calledUsd)} funded`}>
          <span className="p-good" style={{ width: share(t.fundedUsd) }} />
          <span className="p-wait" style={{ width: share(waiting) }} />
          <span className="p-plain" style={{ width: share(t.waivedUsd) }} />
        </div>
        <table>
          <thead><tr><th>Investor</th><th className="num">Called</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {call.obligations.map((o) => (
              <ObligationRows key={o.ref} o={o} expanded={open === o.ref} onToggle={() => setOpen(open === o.ref ? null : o.ref)} />
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function ObligationRows({ o, expanded, onToggle }: { o: Obligation; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className={expanded ? 'expanded' : ''}>
        <td>
          <strong>{roleName(o.investor)}</strong>
          <span className="sub">{units(o.units)} {o.instrument}</span>
        </td>
        <td className="num">{usd(o.scenarioUsd)}</td>
        <td>
          <StatusBadge status={o.status} audience="admin" />
          <span className="sub"><button type="button" className="link small" aria-expanded={expanded} onClick={onToggle}>{expanded ? 'Hide details' : 'Details'}</button></span>
        </td>
        <td><RowActions o={o} /></td>
      </tr>
      {expanded && (
        <tr><td colSpan={4}><ObligationDetail o={o} /></td></tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------- payments inbox
const NEXT_STEP: Record<string, string> = {
  settle: 'Ready to settle',
  'manual-review': 'Needs a decision',
  'payer-withdraws': 'The ledger will refuse it. The payer withdraws it',
  ignore: 'Not for this fund',
};

export function PaymentsInbox({ view }: { view: ViewWithSession }) {
  const obligations = view.calls.flatMap((c) => c.obligations);
  const byRef = new Map(obligations.map((o) => [o.ref, o]));
  return (
    <section className="panel">
      <h1>Incoming payments</h1>
      <p className="muted">Every Token Standard allocation the fund admin's ledger login can see, matched against open obligations. Only a matching payment can settle, and only the ledger decides that.</p>
      {view.payments.length === 0 ? <p className="muted">No payments are waiting.</p> : (
        <table>
          <thead><tr><th>From</th><th>Against</th><th className="num">Amount</th><th>What it is</th><th>Next step</th></tr></thead>
          <tbody>
            {view.payments.map((p) => {
              const o = byRef.get(p.obligationRef);
              return (
                <tr key={p.allocationCid}>
                  <td>{roleName(p.from)}<span className="sub">{dateTime(p.requestedAt)}</span></td>
                  <td>{o ? <a href={href('calls', o.callId)}>{roleName(o.investor)}, {o.callId}</a> : <span className="muted">Unknown reference</span>}</td>
                  <td className="num">{units(p.amount)}{p.amountDue !== null && p.amountDue !== p.amount ? <span className="sub">due {units(p.amountDue)}</span> : null}</td>
                  <td>{PAYMENT_KIND[p.kind]}</td>
                  <td>
                    {p.recommendation === 'settle' && o
                      ? <ActionButton className="btn small" name="settle" body={{ ref: o.ref, allocationCid: p.allocationCid }}>Settle</ActionButton>
                      : <span className="small">{NEXT_STEP[p.recommendation]}</span>}
                    {p.recommendation === 'manual-review' && o && OPEN.has(o.ledgerState) && (
                      <NoteAction name="flag" obligationRef={o.ref} label="Send obligation to review" placeholder="What needs checking" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- investors
export function InvestorsPage({ view }: { view: ViewWithSession }) {
  return (
    <section className="panel">
      <h1>Investors</h1>
      <p className="muted">Each commitment is a separate contract between the fund and one investor. No investor can see another's.</p>
      <table>
        <thead><tr><th>Investor</th><th className="num">Committed</th><th className="num">Called to date</th><th className="num">Left to call</th></tr></thead>
        <tbody>
          {INVESTORS.map((r) => {
            const c = view.commitments.find((x) => x.investor === r);
            const invited = view.invitations.find((x) => x.investor === r);
            return (
              <tr key={r}>
                <td>{roleName(r)}{!c && <span className="sub">{invited ? 'Invitation not accepted yet' : 'Not invited'}</span>}</td>
                <td className="num">{c ? usd(c.committedUsd) : invited ? usd(invited.committedUsd) : '-'}</td>
                <td className="num">{c ? usd(c.calledUsd) : '-'}</td>
                <td className="num">{c ? usd(c.committedUsd - c.calledUsd) : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="small" style={{ marginTop: 16 }}>
        <ActionButton className="link" name="reset" body={{}} confirm="Start over with a new demo fund? The current fund stays on the ledger but the app will stop showing it.">Start over with a new demo fund</ActionButton>
      </p>
    </section>
  );
}
