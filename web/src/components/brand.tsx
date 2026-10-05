import Link from 'next/link';

// The seal: a drawdown, a full commitment ring with the called share cut out.
export function Seal({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" opacity="0.35" />
      <path d="M12 2a10 10 0 0 1 9.51 13.09" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="wordmark" aria-label="DRAW home">
      <Seal />
      <span>DRAW</span>
    </Link>
  );
}
