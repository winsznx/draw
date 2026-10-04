import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

import { ADMIN_STATUS, LP_STATUS, STAGE_NAME, TONE, dateTime, roleName, shortId, units } from './format';
import { useApp } from './state';
import type { Obligation, Receipt, Status, TimelineEntry } from './types';

export function StatusBadge({ status, audience }: { status: Status; audience: 'admin' | 'lp' }) {
  const words = audience === 'admin' ? ADMIN_STATUS : LP_STATUS;
  return <span className={`badge t-${TONE[status]}`}>{words[status]}</span>;
}

export function ActionButton({
  name, body, busyKey, children, className = 'btn', confirm,
}: {
  name: string;
  body: Record<string, unknown>;
  busyKey?: string;
  children: ReactNode;
  className?: string;
  confirm?: string;
}) {
  const { act, busy } = useApp();
  const key = busyKey ?? `${name}:${JSON.stringify(body)}`;
  const working = busy === key;
  return (
    <button
      type="button"
      className={className}
      disabled={busy !== null}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        void act(name, body, key);
      }}
    >
      {working ? 'Working on the ledger…' : children}
    </button>
  );
}

// A decision that needs a note on the record before it is submitted.
export function NoteAction({ name, obligationRef, label, placeholder, tone = 'quiet' }: {
  name: 'flag' | 'waive' | 'reopen' | 'release';
  obligationRef: string;
  label: string;
  placeholder: string;
  tone?: 'quiet' | 'danger';
}) {
  const { act, busy } = useApp();
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
      <button type="button" className={`btn small ${tone}`} disabled={busy !== null} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }
  return (
    <form className="note-form" onSubmit={submit}>
      <input autoFocus aria-label={`Note for ${label.toLowerCase()}`} placeholder={placeholder} value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="submit" className={`btn small ${tone === 'danger' ? 'danger' : ''}`} disabled={busy !== null || !note.trim()}>
        {busy === key ? 'Working on the ledger…' : label}
      </button>
      <button type="button" className="link small" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (!entries.length) return <p className="small muted">No payment activity yet.</p>;
  return (
    <ol className="timeline">
      {entries.map((entry, index) => (
        <li key={`${entry.at}-${index}`} className={entry.stage === 'VERIFIED_FUNDED' ? 'good' : entry.stage === 'FAILED' || entry.stage === 'CONTRADICTED' ? 'bad' : ''}>
          <strong>{STAGE_NAME[entry.stage] ?? entry.stage}</strong>
          {entry.amount ? `, ${units(Number(entry.amount))} Amulet` : ''}
          <span className="sub">
            {dateTime(entry.at)} by {roleName(entry.by)}
            {entry.updateId ? `. Update ${shortId(entry.updateId)}` : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function ReceiptView({ receipt }: { receipt: Receipt }) {
  const verified = receipt.verdict === 'VERIFIED_FUNDED';
  const failed = receipt.checks.filter((c) => !c.ok);
  return (
    <div className={`receipt ${verified ? '' : 'bad'}`}>
      {verified
        ? <>An independent read-only verifier confirmed <strong>{units(receipt.receivedAmount)} Amulet</strong> reached the fund, {receipt.checks.length} of {receipt.checks.length} checks.</>
        : <>The verifier did not confirm this settlement. Failed: {failed.map((c) => c.name).join(', ')}.</>}
      <details className="ledger">
        <summary>Verification details</summary>
        <dl>
          <dt>Update</dt><dd>{receipt.updateId}</dd>
          <dt>Allocation</dt><dd>{receipt.allocationCid}</dd>
          <dt>Recorded</dt><dd>{receipt.recordTime ? dateTime(receipt.recordTime) : '-'}</dd>
          <dt>Verifier</dt><dd>{receipt.verifierUser}</dd>
        </dl>
        <ul>{receipt.checks.map((c) => <li key={c.name}>{c.ok ? 'Passed' : 'Failed'}: {c.name}</li>)}</ul>
      </details>
    </div>
  );
}

export function LedgerDetails({ obligation }: { obligation: Obligation }) {
  return (
    <details className="ledger">
      <summary>Ledger details</summary>
      <dl>
        <dt>Reference</dt><dd>{obligation.ref}</dd>
        <dt>Contract</dt><dd>{obligation.obligationCid}</dd>
        <dt>Ledger state</dt><dd>{obligation.ledgerState}</dd>
        <dt>Evidence</dt><dd>{obligation.outcome}</dd>
        {obligation.settledAfterDue !== null && <><dt>Paid late</dt><dd>{obligation.settledAfterDue ? 'Yes' : 'No'}</dd></>}
      </dl>
    </details>
  );
}

export function ToastHost() {
  const { toast, dismissToast } = useApp();
  // A toast is a transient browser-side notice, so it times itself out.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismissToast, toast.error ? 15000 : 6000);
    return () => window.clearTimeout(timer);
  }, [toast, dismissToast]);
  if (!toast) return null;
  return (
    <div className={`toast ${toast.error ? 'error' : ''}`} role="status">
      <button type="button" aria-label="Dismiss" onClick={dismissToast}>×</button>
      {toast.message}
      {toast.detail && (
        <details>
          <summary>Technical detail</summary>
          <pre>{toast.detail}</pre>
        </details>
      )}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <h1>{title}</h1>
      {children}
    </div>
  );
}

// Shown whenever the ledger needs this browser's key. Nothing is submitted
// until the user signs.
export function SignDialog(): ReactNode {
  const { signRequest, answerSign } = useApp();
  if (!signRequest) return null;
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="sign-title">
        <h2 id="sign-title">Sign with your key</h2>
        <p>{signRequest.description || 'Authorize this transaction.'}</p>
        <p className="small muted">
          Signing as {roleName(signRequest.role)}{signRequest.step > 1 ? `, signature ${signRequest.step}` : ''}. The key stays in this browser.
          Only the signature is sent.
        </p>
        <details className="ledger">
          <summary>What gets signed</summary>
          <dl><dt>Transaction hash</dt><dd>{signRequest.hash}</dd><dt>Party</dt><dd>{signRequest.party}</dd></dl>
        </details>
        <div className="actions" style={{ marginTop: 16 }}>
          <button type="button" className="btn" autoFocus onClick={() => answerSign(true)}>Sign</button>
          <button type="button" className="btn quiet" onClick={() => answerSign(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
