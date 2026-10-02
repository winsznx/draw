import { useState, type ReactElement } from 'react';

import { ActionButton, Empty, LedgerDetails, ReceiptView, StatusBadge, Timeline } from '../components';
import { LP_STATUS, PAYMENT_KIND, dateTime, relative, roleName, units, usd } from '../format';
import { href } from '../state';
import type { Obligation, Status, ViewWithSession } from '../types';

const PAYABLE: Status[] = ['due', 'mismatched', 'pending-stale', 'overdue'];

function Wallet({ view }: { view: ViewWithSession }): ReactElement {
  return (
    <div className="wallet">
      <span>Your Amulet balance: <strong>{units(view.balance ?? 0)}</strong></span>
      <ActionButton className="link" name="faucet" body={{ role: view.role }}>Add test Amulet</ActionButton>
    </div>
  );
}

export function InvestorHome({ view }: { view: ViewWithSession }): ReactElement {
  const name = roleName(view.role);
  const invitation = view.invitations[0];
  const commitment = view.commitments[0];
  const notices = view.calls.flatMap((c) => c.obligations).sort((a, b) => Date.parse(b.dueAt) - Date.parse(a.dueAt));

  if (invitation) {
    return (
      <>
        <article className="notice">
          <div className="letterhead">{invitation.fundName}<small>For {name}</small></div>
          <h1>Invitation to commit</h1>
          <p>You are invited to commit capital to {invitation.fundName}. The fund may call this capital over time. Only you and the fund admin can see this commitment.</p>
          <div className="amount">{usd(invitation.committedUsd)}</div>
          <p className="sub">Commitment</p>
          <div className="actions" style={{ marginTop: 24 }}>
            <ActionButton name="accept" body={{ role: view.role }}>Accept commitment</ActionButton>
          </div>
        </article>
        <Wallet view={view} />
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Capital call notices</h1>
          <p className="muted">
            {commitment
              ? `${name} has committed ${usd(commitment.committedUsd)} to ${view.fundName}. ${usd(commitment.calledUsd)} has been called so far.`
              : 'The fund admin has not invited this investor.'}
          </p>
        </div>
      </div>
      {notices.length === 0 ? (
        <Empty title={commitment ? 'No capital called yet' : 'Nothing for you here yet'}>
          <p>{commitment ? 'When the fund calls capital, your notice appears here.' : 'Notices appear here once the fund invites you and calls capital.'}</p>
        </Empty>
      ) : (
        <div className="notice-list">
          {notices.map((o) => (
            <a key={o.ref} className="notice-card" href={href('notices', o.ref)}>
              <span>
                <span className="sub">{o.fundName}, {o.callId}</span>
                <strong>{usd(o.scenarioUsd)}</strong>
                <span className="sub">Due {dateTime(o.dueAt)}, {relative(o.dueAt)}</span>
              </span>
              <StatusBadge status={o.status} audience="lp" />
            </a>
          ))}
        </div>
      )}
      <Wallet view={view} />
    </>
  );
}

function Steps({ o }: { o: Obligation }): ReactElement {
  const locked = o.payments.some((p) => p.kind === 'match') || ['pending', 'verifying', 'funded', 'overdue-paid'].includes(o.status);
  const settled = o.ledgerState === 'Funded';
  const verified = o.status === 'funded';
  const cls = (done: boolean, now: boolean) => (done ? 'done' : now ? 'now' : '');
  return (
    <ol className="steps" aria-label="Payment progress">
      <li className={cls(locked || settled, !locked && !settled)}>Payment locked for the fund</li>
      <li className={cls(settled, locked && !settled)}>Settled by the fund</li>
      <li className={cls(verified, settled && !verified)}>Independently verified</li>
    </ol>
  );
}

const CALLOUT: Partial<Record<Status, { tone: string; text: string }>> = {
  mismatched: { tone: 'bad', text: 'Your payment does not match the amount due. The fund cannot settle it. Withdraw it below and pay the exact amount.' },
  submitted: { tone: 'wait', text: 'Your payment is locked for the fund. Nothing has moved yet. It counts as funded only after the fund settles it and an independent check confirms it.' },
  pending: { tone: 'wait', text: 'The fund is settling your payment. It is not funded until the transfer is verified.' },
  'overdue-paid': { tone: 'wait', text: 'This is past due, but your payment is locked and waiting for the fund to settle it.' },
  overdue: { tone: 'bad', text: 'This is past due. You can still pay. The fund decides how to handle late capital.' },
  verifying: { tone: 'wait', text: 'The fund settled your payment. Independent verification has not confirmed it yet.' },
  review: { tone: 'plain', text: 'The fund is reviewing this obligation. You will see the outcome here.' },
  waived: { tone: 'plain', text: 'The fund waived this obligation. Nothing is owed.' },
  contradicted: { tone: 'bad', text: 'The fund is checking this settlement. It is not shown as funded until verification passes.' },
};

export function Notice({ view, obligationRef }: { view: ViewWithSession; obligationRef: string }): ReactElement {
  const [otherOpen, setOtherOpen] = useState(false);
  const o = view.calls.flatMap((c) => c.obligations).find((x) => x.ref === obligationRef);
  const [other, setOther] = useState(() => (o ? String(Math.max(o.units - 5, 1)) : ''));
  if (!o) {
    return (
      <Empty title="Not visible to you">
        <p>No obligation with this reference is visible to {roleName(view.role)}'s ledger login. Notices belong to the investor who owes them.</p>
        <a href={href()}>Your notices</a>
      </Empty>
    );
  }
  const canPay = PAYABLE.includes(o.status) && !o.payments.some((p) => p.kind === 'match');
  const callout = CALLOUT[o.status];
  return (
    <>
      <p className="small" style={{ maxWidth: 680, margin: '0 auto 12px' }}><a href={href()}>All notices</a></p>
      <article className="notice">
        <div className="letterhead">{o.fundName}<small>For {roleName(o.investor)}</small></div>
        <h1>Capital call notice</h1>
        <div className="amount">{usd(o.scenarioUsd)}</div>
        <p className="sub">Your share of {o.callId}</p>
        <dl className="terms">
          <dt>Settle with</dt><dd>{units(o.units)} {o.instrument} to the fund</dd>
          <dt>Due</dt><dd>{dateTime(o.dueAt)} <span className="sub">{relative(o.dueAt)}</span></dd>
          <dt>Status</dt><dd>{LP_STATUS[o.status]}</dd>
        </dl>
        <Steps o={o} />
        {callout && <p className={`callout ${callout.tone}`}>{callout.text}</p>}
        {o.status === 'funded' && o.receipt && <ReceiptView receipt={o.receipt} />}

        {canPay && (
          <>
            <div className="actions">
              <ActionButton name="pay" body={{ role: view.role, ref: o.ref }} busyKey={`pay:${o.ref}`}>Pay {units(o.units)} {o.instrument}</ActionButton>
              <button type="button" className="link" onClick={() => setOtherOpen(!otherOpen)}>Pay a different amount</button>
            </div>
            {otherOpen && (
              <div className="other-amount">
                <input aria-label="Amount in Amulet" inputMode="decimal" value={other} onChange={(e) => setOther(e.target.value)} />
                <ActionButton className="btn quiet" name="pay" body={{ role: view.role, ref: o.ref, amount: Number(other) }} busyKey={`pay-other:${o.ref}`}>Pay this amount</ActionButton>
                <span className="sub">The fund only accepts the exact amount due. The ledger refuses anything else, and you can withdraw it.</span>
              </div>
            )}
          </>
        )}

        {o.payments.length > 0 && o.ledgerState !== 'Funded' && (
          <div style={{ marginTop: 16 }}>
            <h3>Your payments for this notice</h3>
            {o.payments.map((p) => (
              <p key={p.allocationCid} className="actions">
                <span>{units(p.amount)} {o.instrument}: {p.kind === 'match' ? 'locked, waiting for the fund' : PAYMENT_KIND[p.kind].toLowerCase()}</span>
                <ActionButton className="link" name="withdraw" body={{ role: view.role, allocationCid: p.allocationCid }}>Withdraw it</ActionButton>
              </p>
            ))}
          </div>
        )}

        <details className="ledger">
          <summary>Payment history</summary>
          <Timeline entries={o.timeline} />
        </details>
        <LedgerDetails obligation={o} />
      </article>
      <Wallet view={view} />
    </>
  );
}

export function OutsiderHome({ view }: { view: ViewWithSession }): ReactElement {
  const seen = view.calls.length + view.commitments.length + view.invitations.length + (view.fund ? 1 : 0) + view.payments.length;
  return seen ? (
    <Empty title="This party can see fund data">
      <p>This should not happen. Check the visibility evidence on the proof page.</p>
    </Empty>
  ) : (
    <Empty title="The ledger returned nothing">
      <p>This party is on the same network as the fund, but it is not a signatory or observer on any fund, call, commitment, obligation, or payment, so its ledger queries come back empty.</p>
    </Empty>
  );
}
