'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { Seal } from '@/components/brand';
import { finishSignIn } from '@/lib/hackcanton';
import type { SiteConfig } from '@/lib/types';

// One exchange per redirect. The authorization code works once, so a second
// render of this page must reuse the first exchange instead of starting another.
const exchanges = new Map<string, Promise<string>>();

async function complete(search: string): Promise<string> {
  const response = await fetch('/api/config', { cache: 'no-store' });
  const config = (await response.json()) as SiteConfig;
  if (!config.signIn) throw new Error('Signing in with HackCanton is not turned on for this demo.');
  return finishSignIn(config.signIn, new URLSearchParams(search));
}

function exchangeOnce(search: string): Promise<string> {
  let exchange = exchanges.get(search);
  if (!exchange) {
    exchange = complete(search);
    exchanges.set(search, exchange);
  }
  return exchange;
}

function Callback() {
  const router = useRouter();
  const search = useSearchParams().toString();
  const result = useQuery({ queryKey: ['sign-in', search], queryFn: () => exchangeOnce(search), retry: false, staleTime: Infinity, gcTime: Infinity });

  useEffect(() => {
    if (result.data) router.replace(result.data);
  }, [result.data, router]);

  return (
    <main id="main" className="stack-4" style={{ maxWidth: 520, margin: '18vh auto 0', padding: '0 16px', textAlign: 'center', alignItems: 'center' }}>
      <Seal size={40} />
      {result.isError ? (
        <>
          <h1 className="t-h2">Sign-in did not finish</h1>
          <p className="muted">{result.error.message}</p>
          <Link href="/onboard" className="btn btn-primary">Back to onboarding</Link>
        </>
      ) : (
        <>
          <h1 className="t-h2">Signing you in</h1>
          <p className="muted">Checking your HackCanton login and reading your party from the ledger.</p>
        </>
      )}
    </main>
  );
}

export default function SignInCallback() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}
