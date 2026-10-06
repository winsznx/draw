'use client';

import { useSyncExternalStore } from 'react';

import { identity, subscribeIdentity, type Identity } from '@/lib/hackcanton';

// The HackCanton identity this tab signed in with. `undefined` while
// rendering on the server, before the tab is known.
export function useSignedIn(): Identity | null | undefined {
  return useSyncExternalStore(subscribeIdentity, identity, () => undefined);
}
