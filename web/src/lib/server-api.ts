import 'server-only';

import { apiBase, serviceHeaders } from './proxy';
import type { Proof, SiteConfig } from './types';

// Reads from the VPS for server-rendered pages. Pages render without the
// answer if the API is down, and say so, rather than showing numbers that
// were not read.
async function load<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${apiBase()}${path}`, { headers: serviceHeaders(), cache: 'no-store', signal: AbortSignal.timeout(6000) });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export const loadProof = (): Promise<Proof | null> => load<Proof>('/api/proof');

export const loadConfig = (): Promise<SiteConfig | null> => load<SiteConfig>('/api/config');
