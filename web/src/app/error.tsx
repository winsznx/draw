'use client';

import Link from 'next/link';

import { Seal } from '@/components/brand';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" style={{ minHeight: '100dvh', display: 'grid', placeContent: 'center', justifyItems: 'start', gap: 16, padding: 'var(--gutter)', maxWidth: 520, margin: '0 auto' }}>
      <span style={{ color: 'var(--intaglio)' }}><Seal size={32} /></span>
      <h1 className="t-h1">This page failed to load</h1>
      <p className="muted">Your notices and payments live on the ledger. Try again to read them.</p>
      {error.digest && <p className="t-xs faint mono">{error.digest}</p>}
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={reset}>Try again</button>
        <Link href="/" className="btn">Home</Link>
      </div>
    </main>
  );
}
