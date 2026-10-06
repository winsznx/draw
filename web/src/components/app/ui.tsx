'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

import { useActions, type ToastTone } from '@/components/session';
import { ADMIN_STATUS, LP_STATUS, STAGE_NAME, TONE, dateTime, roleName, units } from '@/lib/format';
import type { Obligation, Receipt, Status, TimelineEntry } from '@/lib/types';

import styles from './ui.module.css';

const MARK: Record<string, string> = { good: 'mark mark-good', wait: 'mark mark-wait', bad: 'mark mark-bad', plain: 'mark' };

export function StatusMark({ status, audience }: { status: Status; audience: 'admin' | 'lp' }) {
  const words = audience === 'admin' ? ADMIN_STATUS : LP_STATUS;
  return <span className={MARK[TONE[status]]}>{words[status]}</span>;
}

export function ActionButton({
  name, body, busyKey, children, className = 'btn btn-primary', confirm, busyLabel = 'Submitting…',
}: {
  name: string;
  body: Record<string, unknown>;
  busyKey?: string;
  children: ReactNode;
  className?: string;
  confirm?: string;
  busyLabel?: string;
}) {
  const { act, busy } = useActions();
  const key = busyKey ?? `${name}:${JSON.stringify(body)}`;
  const working = busy === key;
  return (
    <button
      type="button"
      className={className}
      disabled={busy !== null}
      aria-busy={working}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        void act(name, body, key);
      }}
    >
      {working ? <><Spinner />{busyLabel}</> : children}
    </button>
  );
}

export function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

// A decision that puts a note on the record before it is submitted.
export function NoteAction({ name, obligationRef, label, placeholder, danger = false }: {
  name: 'flag' | 'waive' | 'reopen' | 'release';
  obligationRef: string;
  label: string;
  placeholder: string;
  danger?: boolean;
}) {
  const { act, busy } = useActions();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const key = `${name}:${obligationRef}`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!note.trim()) return;
    if (await act(name, { ref: obligationRef, note }, key)) {
      setOpen(false);
      setNote('');
    }
  }

  if (!open) {
    return (
      <button type="button" className={`btn btn-sm ${danger ? 'btn-danger' : ''}`} disabled={busy !== null} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }
  return (
    <form className={styles.noteForm} onSubmit={submit}>
      <input autoFocus className="input" aria-label={`Note for ${label.toLowerCase()}`} placeholder={placeholder} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="row">
        <button type="submit" className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy !== null || !note.trim()}>
          {busy === key ? <><Spinner />Submitting…</> : label}
        </button>
        <button type="button" className="btn btn-sm btn-quiet" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (!entries.length) return <p className="t-sm faint">No payment activity yet.</p>;
  return (
    <ol className={styles.timeline}>
      {entries.map((entry, index) => {
        const tone = entry.stage === 'VERIFIED_FUNDED' ? styles.tlGood : entry.stage === 'FAILED' || entry.stage === 'CONTRADICTED' ? styles.tlBad : '';
        return (
          <li key={`${entry.at}-${index}`} className={tone}>
            <p className={styles.tlTitle}>{STAGE_NAME[entry.stage] ?? entry.stage}{entry.amount ? `, ${units(Number(entry.amount))} CC` : ''}</p>
            <p className="t-xs faint">
              {dateTime(entry.at)} by {roleName(entry.by)}
              {entry.updateId && <>. Update <CopyId value={entry.updateId} /></>}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function CopyId({ value, length = 10 }: { value: string; length?: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={styles.copy}
      title={value}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      <span className="mono">{value.slice(0, length)}…</span>
      <span className={styles.copyHint}>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const verified = receipt.verdict === 'VERIFIED_FUNDED';
  const failed = receipt.checks.filter((c) => !c.ok);
  return (
    <div className={`${styles.receipt} ${verified ? '' : styles.receiptBad}`}>
      <div className="row between">
        <p className="t-h3">{verified ? 'Verified funded' : 'Verification failed'}</p>
        <span className={verified ? 'mark mark-good' : 'mark mark-bad'}>{receipt.checks.length - failed.length} of {receipt.checks.length} checks</span>
      </div>
      <p className="t-sm muted">
        {verified
          ? <>A separate read-back step fetched the settlement from the ledger and confirmed {units(receipt.receivedAmount)} CC reached the fund.</>
          : <>The verifier did not confirm this settlement. Failed: {failed.map((c) => c.name).join(', ')}.</>}
      </p>
      <details className="more">
        <summary>Verification details</summary>
        <dl className="kv">
          <dt>Update</dt><dd><CopyId value={receipt.updateId} length={18} /></dd>
          <dt>Allocation</dt><dd><CopyId value={receipt.allocationCid} length={18} /></dd>
          <dt>Recorded</dt><dd>{receipt.recordTime ? dateTime(receipt.recordTime) : 'Not recorded'}</dd>
          <dt>Verifier</dt><dd className="mono">{receipt.verifierUser}</dd>
        </dl>
        <ul className={styles.checks}>
          {receipt.checks.map((c) => <li key={c.name} className={c.ok ? '' : styles.checkBad}>{c.name}</li>)}
        </ul>
      </details>
    </div>
  );
}

export function LedgerDetails({ obligation }: { obligation: Obligation }) {
  return (
    <details className="more">
      <summary>Ledger details</summary>
      <dl className="kv">
        <dt>Reference</dt><dd className="mono">{obligation.ref}</dd>
        <dt>Contract</dt><dd><CopyId value={obligation.obligationCid} length={18} /></dd>
        <dt>Ledger state</dt><dd>{obligation.ledgerState}</dd>
        <dt>Evidence</dt><dd>{obligation.outcome}</dd>
        {obligation.settledAfterDue !== null && <><dt>Paid late</dt><dd>{obligation.settledAfterDue ? 'Yes' : 'No'}</dd></>}
      </dl>
    </details>
  );
}

export function PageHead({ title, lead, back, actions }: { title: string; lead?: ReactNode; back?: { href: string; label: string }; actions?: ReactNode }) {
  return (
    <div className={styles.pageHead}>
      <div className="stack-2">
        {back && <Link href={back.href} className={styles.back}>{back.label}</Link>}
        <h1 className="t-h1">{title}</h1>
        {lead && <p className="muted prose">{lead}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

export function ZeroState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.zero}>
      <h2 className="t-h2">{title}</h2>
      {children && <div className="muted prose stack-3">{children}</div>}
      {action && <div className="row">{action}</div>}
    </div>
  );
}

function Dialog({ labelledBy, children, onClose }: { labelledBy: string; children: ReactNode; onClose?: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose?.();
      }}
    >
      {children}
    </dialog>
  );
}

// Shown whenever the ledger needs this browser's key. Nothing is submitted
// until the person signs.
export function SignDialog() {
  const { signRequest, answerSign } = useActions();
  if (!signRequest) return null;
  return (
    <Dialog labelledBy="sign-title" onClose={() => answerSign(false)}>
      <div className="stack-4">
        <div className={styles.dialogIcon} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l3 3M14 9l2 2" strokeLinecap="round" /></svg>
        </div>
        <h2 id="sign-title" className="t-h3">Sign with your key</h2>
        <p>{signRequest.description || 'Authorize this transaction.'}</p>
        <p className="t-sm muted">
          Signing as {roleName(signRequest.role)}{signRequest.step > 1 ? `, signature ${signRequest.step}` : ''}. Your key stays in this
          browser. Only the signature is sent.
        </p>
        <details className="more">
          <summary>What gets signed</summary>
          <dl className="kv">
            <dt>Transaction hash</dt><dd className="mono">{signRequest.hash}</dd>
            <dt>Party</dt><dd className="mono">{signRequest.party}</dd>
          </dl>
        </details>
        <div className="row">
          <button type="button" className="btn btn-primary" autoFocus onClick={() => answerSign(true)}>Sign</button>
          <button type="button" className="btn btn-quiet" onClick={() => answerSign(false)}>Cancel</button>
        </div>
      </div>
    </Dialog>
  );
}

// `publicCode` is set when the operator prints the code for every visitor. The
// form then starts filled in with it.
export function AccessDialog({ publicCode }: { publicCode?: string | null }) {
  const { accessPrompt, answerAccess } = useActions();
  if (!accessPrompt) return null;
  return (
    <Dialog labelledBy="access-title" onClose={() => answerAccess(null)}>
      <AccessForm publicCode={publicCode ?? null} onAnswer={answerAccess} />
    </Dialog>
  );
}

function AccessForm({ publicCode, onAnswer }: { publicCode: string | null; onAnswer: (code: string | null) => void }) {
  const [code, setCode] = useState(publicCode ?? '');
  return (
    <form
      className="stack-4"
      onSubmit={(event) => {
        event.preventDefault();
        onAnswer(code.trim() || null);
      }}
    >
      <h2 id="access-title" className="t-h3">Enter the access code</h2>
      <p className="t-sm muted">
        {publicCode
          ? <>The demo fund is on a shared network, so actions need an access code. This demo&rsquo;s code is public: <strong className="mono">{publicCode}</strong>. Reading needs none.</>
          : 'The demo fund is on a shared network, so actions need a code from the DRAW team. Reading needs none.'}
      </p>
      <input autoFocus className="input" aria-label="Access code" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={!code.trim()}>Continue</button>
        <button type="button" className="btn btn-quiet" onClick={() => onAnswer(null)}>Cancel</button>
      </div>
    </form>
  );
}

// Moves this browser to a new demo fund. The current fund stays on the ledger.
export function StartOverButton({ className = 'btn btn-sm btn-danger', children }: { className?: string; children: ReactNode }) {
  const { startOver, busy } = useActions();
  return (
    <button
      type="button"
      className={className}
      disabled={busy !== null}
      aria-busy={busy === 'reset'}
      onClick={() => {
        if (window.confirm('Start over with a new demo fund?')) void startOver();
      }}
    >
      {busy === 'reset' ? <><Spinner />Clearing…</> : children}
    </button>
  );
}

const TOAST_TONE: Record<ToastTone, string> = { plain: '', bad: styles.toastBad ?? '', wait: styles.toastWait ?? '' };

export function Toasts() {
  const { toasts, dismiss } = useActions();
  return (
    <div className={styles.toasts} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${TOAST_TONE[toast.tone]}`}>
          <p>{toast.message}</p>
          {toast.detail && (
            <details className="more">
              <summary>Technical detail</summary>
              <pre className={styles.detail}>{toast.detail}</pre>
            </details>
          )}
          <button type="button" className={styles.toastClose} aria-label="Dismiss" onClick={() => dismiss(toast.id)}>
            <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
}
