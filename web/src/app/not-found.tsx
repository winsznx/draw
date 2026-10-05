import Link from 'next/link';

import { Seal } from '@/components/brand';

export default function NotFound() {
  return (
    <main id="main" style={{ minHeight: '100dvh', display: 'grid', placeContent: 'center', justifyItems: 'start', gap: 16, padding: 'var(--gutter)', maxWidth: 520, margin: '0 auto' }}>
      <span style={{ color: 'var(--intaglio)' }}><Seal size={32} /></span>
      <h1 className="t-h1">There is no page here</h1>
      <p className="muted">The link may be old, or the page may belong to a different seat.</p>
      <div className="row">
        <Link href="/app" className="btn btn-primary">Open the app</Link>
        <Link href="/" className="btn">Home</Link>
      </div>
    </main>
  );
}
