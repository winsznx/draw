'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { ROLE_NAME } from '@/lib/format';
import type { ViewWithSession } from '@/lib/types';

import { CreateFund, StartFund } from './admin';
import { useSeatView } from './shell';
import { ZeroState } from './ui';

// Resolves the states every screen shares (no fund yet, no party yet, wrong
// seat for this page) and renders the screen once the seat has a fund to show.
export function Screen({ adminOnly = false, children }: { adminOnly?: boolean; children: (view: ViewWithSession) => ReactNode }) {
  const { role, view } = useSeatView();
  if (!view.session) {
    if (role === 'admin') return <StartFund network={view.network} browserKeys={view.browserKeys} />;
    return view.tours ? (
      <ZeroState title="This browser has no demo fund yet" action={<Link href="/onboard" className="btn btn-primary">Create the demo fund</Link>}>
        <p>
          Each browser gets its own demo fund, so nobody else will create this one.{' '}
          {role === 'outsider' ? 'Create it, then come back to see what an unrelated party can read about it.' : `Create it, then come back as ${ROLE_NAME[role]} to accept your invitation.`}
        </p>
      </ZeroState>
    ) : (
      <ZeroState title="The fund is not set up yet"><p>The fund manager creates the demo fund first. Your invitation appears here once they do.</p></ZeroState>
    );
  }
  if (!view.onboarded) {
    return <ZeroState title="This seat has no party yet" action={<Link href="/onboard" className="btn btn-primary">Create your party</Link>}><p>Create your party and key first.</p></ZeroState>;
  }
  if (view.needsFund) {
    return role === 'admin'
      ? <CreateFund />
      : <ZeroState title="Your party is ready"><p>The fund manager has not created the fund yet. Your invitation appears here once they do and invite you.</p></ZeroState>;
  }
  if (adminOnly && role !== 'admin') {
    return (
      <ZeroState title="This page is for the fund manager" action={<Link href="/app" className="btn">Back to your notices</Link>}>
        <p>{ROLE_NAME[role]}&rsquo;s ledger has no access to the fund&rsquo;s calls, payments or investor list. It returns only this party&rsquo;s own records.</p>
      </ZeroState>
    );
  }
  return <>{children(view)}</>;
}
