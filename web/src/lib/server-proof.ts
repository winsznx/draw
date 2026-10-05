import 'server-only';

import { apiBase, serviceHeaders } from './proxy';
import type { Proof } from './types';

// The proof summary from the VPS. Pages render without it if the API is down,
// and say so, rather than showing numbers that were not read.
export async function loadProof(): Promise<Proof | null> {
  try {
    const response = await fetch(`${apiBase()}/api/proof`, { headers: serviceHeaders(), cache: 'no-store', signal: AbortSignal.timeout(6000) });
    return response.ok ? ((await response.json()) as Proof) : null;
  } catch {
    return null;
  }
}
