import Link from 'next/link';

// The seal: a commitment ring with the called share drawn, on a solid tile.
export function Seal({ size = 26, inverse = false }: { size?: number; inverse?: boolean }) {
  const mark = inverse ? '#134a3d' : 'var(--on-intaglio)';
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="8" fill={inverse ? '#f3f8f6' : 'currentColor'} />
      <circle cx="14" cy="14" r="7.5" fill="none" stroke={mark} strokeWidth="1.6" opacity="0.35" />
      <path d="M14 6.5a7.5 7.5 0 0 1 7.13 9.82" fill="none" stroke={mark} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="14" cy="14" r="2.6" fill={mark} />
    </svg>
  );
}

export function Wordmark({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="wordmark" aria-label="DRAW home">
      <Seal />
      <span>draw</span>
    </Link>
  );
}
