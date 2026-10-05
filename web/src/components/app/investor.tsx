'use client';

import Link from 'next/link';
import { useState } from 'react';

import { LP_STATUS, PAYMENT_KIND, coin, dateTime, relative, roleName, units, usd } from '@/lib/format';
import type { Obligation, Status, ViewWithSession } from '@/lib/types';

import { IconNotice } from '@/components/icons';

import { ActionButton, LedgerDetails, PageHead, ReceiptCard, StatusMark, Timeline, ZeroState } from './ui';
import styles from './screens.module.css';

const PAYABLE: Status[] = ['due', 'mismatched', 'pending-stale', 'overdue'];

export function InvestorHome({ view }: { view: ViewWithSession }) {
  const name = roleName(view.role);
  const invitation = view.invitations[0];
  const commitment = view.commitments[0];
  const notices = view.calls.flatMap((c) => c.obligations).sort((a, b) => Date.parse(b.dueAt) - Date.parse(a.dueAt));

  if (invitation) {
    return (
      <>
        <PageHead title="You have an invitation" lead="Only you and the fund manager can see this commitment." />
        <article className={styles.notice}>
          <div className={styles.letterhead}>{invitation.fundName}<small>For {name}</small></div>
          <div className={styles.noticeBody}>
            <p className="t-h3">Invitation to commit</p>
            <div className="stack-2">
              <p className={styles.big}>{usd(invitation.committedUsd)}</p>
              <p className="t-sm muted">Commitment. The fund calls it over time, in notices addressed only to you.</p>
            </div>
            <div><ActionButton name="accept" body={{ role: view.role }} className="btn btn-primary btn-lg" busyLabel="Accepting on the ledger…">Accept commitment</ActionButton></div>
          </div>
        </article>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Your notices"
        lead={commitment
          ? `You committed ${usd(commitment.committedUsd)} to ${view.fundName}. ${usd(commitment.calledUsd)} has been called so far.`
          : 'The fund has not invited you yet.'}
      />
      {notices.length === 0 ? (
        <ZeroState title={commitment ? 'No capital called yet' : 'Nothing for you yet'}>
          <p>{commitment ? 'When the fund calls capital, your notice appears here with the exact amount to pay.' : 'Your invitation appears here once the fund manager sends it.'}</p>
        </ZeroState>
      ) : (
        <div className={styles.noticeList}>
          {notices.map((o) => (
            <Link key={o.ref} className={styles.noticeCard} href={`/app/notices/${encodeURIComponent(o.ref)}`}>
              <span className={styles.docIcon}><IconNotice size={20} /></span>
              <span className="stack-2">
                <span className="t-xs faint">{o.fundName}, {o.callId}</span>
                <span className="t-h3">Due {dateTime(o.dueAt)}<span className="t-sm faint"> {relative(o.dueAt)}</span></span>
              </span>
              <span className={styles.amount}>{usd(o.scenarioUsd)}</span>
              <StatusMark status={o.status} audience="lp" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function Steps({ o }: { o: Obligation }) {
  const locked = o.payments.some((p) => p.kind === 'match') || ['pending', 'verifying', 'funded', 'overdue-paid'].includes(o.status);
  const settled = o.ledgerState === 'Funded';
  const verified = o.status === 'funded';
  const cls = (done: boolean, now: boolean) => (done ? styles.stepDone : now ? styles.stepNow : '');
  return (
    <ol className={styles.steps} aria-label="Payment progress">
      <li className={cls(locked || settled, !locked && !settled && o.status !== 'due')}>Payment locked</li>
      <li className={cls(settled, locked && !settled)}>Settled by the fund</li>
      <li className={cls(verified, settled && !verified)}>Independently verified</li>
    </ol>
  );
}

const CALLOUT: Partial<Record<Status, { tone: 'wait' | 'bad' | 'plain'; text: string }>> = {
  mismatched: { tone: 'bad', text: 'Your payment does not match the amount due, so the fund cannot settle it. Withdraw it below and pay the exact amount.' },
  submitted: { tone: 'wait', text: 'Your coin is locked for the fund. Nothing has moved yet. It counts as funded once the fund settles it and an independent check confirms it.' },
  pending: { tone: 'wait', text: 'The fund is settling your payment. It is not funded until the transfer is verified.' },
  'overdue-paid': { tone: 'wait', text: 'This is past due, but your payment is locked and waiting for the fund to settle it.' },
  overdue: { tone: 'bad', text: 'This is past due. You can still pay. The fund decides how to handle late capital.' },
  verifying: { tone: 'wait', text: 'The fund settled your payment. The independent check has not confirmed it yet.' },
  review: { tone: 'plain', text: 'The fund is reviewing this notice. The outcome appears here.' },
  waived: { tone: 'plain', text: 'The fund waived this notice. Nothing is owed.' },
  contradicted: { tone: 'bad', text: 'The fund is checking this settlement. It does not count as funded until verification passes.' },
};

export function NoticePage({ view, obligationRef }: { view: ViewWithSession; obligationRef: string }) {
  const o = view.calls.flatMap((c) => c.obligations).find((x) => x.ref === obligationRef);
  const [otherOpen, setOtherOpen] = useState(false);
  const [other, setOther] = useState(() => (o ? String(Math.max(o.units - 5, 1)) : ''));
  if (!o) {
    return (
      <ZeroState title="Not on your ledger" action={<Link href="/app" className="btn">Your notices</Link>}>
        <p>No notice with this reference is visible to {roleName(view.role)}. A notice belongs only to the investor who owes it, so another LP&rsquo;s link opens nothing.</p>
      </ZeroState>
    );
  }
  const canPay = PAYABLE.includes(o.status) && !o.payments.some((p) => p.kind === 'match');
  const callout = CALLOUT[o.status];
  const short = view.balance !== null && view.balance < o.units;
  return (
    <>
      <PageHead title="Capital call notice" back={{ href: '/app', label: 'Your notices' }} />
      <article className={styles.notice}>
        <div className={styles.letterhead}>{o.fundName}<small>For {roleName(o.investor)}</small></div>
        <div className={styles.noticeBody}>
          <div className="row between">
            <div className="stack-2">
              <p className={styles.big}>{usd(o.scenarioUsd)}</p>
              <p className="t-sm muted">Your share of {o.callId}</p>
            </div>
            <StatusMark status={o.status} audience="lp" />
          </div>
          <dl className="kv">
            <dt>Pay</dt><dd><strong>{units(o.units)} {coin(o.instrument)}</strong> to the fund</dd>
            <dt>Due</dt><dd>{dateTime(o.dueAt)} <span className="faint">{relative(o.dueAt)}</span></dd>
            <dt>Status</dt><dd>{LP_STATUS[o.status]}</dd>
          </dl>
          <Steps o={o} />
          {callout && <p className={`${styles.callout} ${callout.tone === 'wait' ? styles.calloutWait : callout.tone === 'bad' ? styles.calloutBad : ''}`}>{callout.text}</p>}
          {o.status === 'funded' && o.receipt && <ReceiptCard receipt={o.receipt} />}

          {canPay && (
            <div className="stack-3">
              <div className="row">
                <ActionButton name="pay" body={{ role: view.role, ref: o.ref }} busyKey={`pay:${o.ref}`} className="btn btn-primary btn-lg" busyLabel="Locking coin for the fund…">
                  Pay {units(o.units)} {coin(o.instrument)}
                </ActionButton>
                <button type="button" className="btn btn-quiet" onClick={() => setOtherOpen(!otherOpen)}>Pay a different amount</button>
              </div>
              {short && <p className="t-sm" style={{ color: 'var(--waiting)' }}>Your balance is {units(view.balance ?? 0)} CC. Add test CC from your seat card first.</p>}
              {otherOpen && (
                <div className={styles.otherAmount}>
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <input className="input input-num" aria-label="Amount in Canton Coin" inputMode="decimal" value={other} onChange={(e) => setOther(e.target.value)} />
                    <ActionButton className="btn" name="pay" body={{ role: view.role, ref: o.ref, amount: Number(other) }} busyKey={`pay-other:${o.ref}`} busyLabel="Locking…">Pay this amount</ActionButton>
                  </div>
                  <p className="t-xs faint">The fund only accepts the exact amount due. The ledger refuses anything else, and you can withdraw it.</p>
                </div>
              )}
            </div>
          )}

          {o.payments.length > 0 && o.ledgerState !== 'Funded' && (
            <div className="stack-2">
              <p className="t-sm" style={{ fontWeight: 650 }}>Your payments for this notice</p>
              {o.payments.map((p) => (
                <div key={p.allocationCid} className={styles.payRow}>
                  <span className="t-sm">{units(p.amount)} {coin(o.instrument)}: {p.kind === 'match' ? 'locked, waiting for the fund' : PAYMENT_KIND[p.kind].toLowerCase()}</span>
                  <ActionButton className="btn btn-sm" name="withdraw" body={{ role: view.role, allocationCid: p.allocationCid }} busyLabel="Withdrawing…">Withdraw</ActionButton>
                </div>
              ))}
            </div>
          )}

          <details className="more">
            <summary>Payment history</summary>
            <Timeline entries={o.timeline} />
          </details>
          <LedgerDetails obligation={o} />
        </div>
      </article>
    </>
  );
}

export function OutsiderHome({ view }: { view: ViewWithSession }) {
  const seen = view.calls.length + view.commitments.length + view.invitations.length + (view.fund ? 1 : 0) + view.payments.length;
  return seen ? (
    <ZeroState title="This party can see fund records"><p>That should never happen. Check the visibility record on the proof page.</p></ZeroState>
  ) : (
    <>
      <PageHead title="Your ledger" lead="What this party's ledger query returns for the fund." />
      <ZeroState title="The ledger returned nothing" action={<Link href="/proof" className="btn">See the visibility proof</Link>}>
        <p>This party is on the same network as the fund, but it is not a signatory or observer on any fund, call, commitment, notice or payment. Its queries come back empty, and that comes from the ledger, not from DRAW filtering a list.</p>
      </ZeroState>
    </>
  );
}
