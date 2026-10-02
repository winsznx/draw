import type { Proof, Role, View } from './types';

export class ActionError extends Error {
  readonly detail: string | undefined;

  constructor(message: string, detail?: string) {
    super(message);
    this.detail = detail;
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string; detail?: string };
  if (!response.ok) throw new ActionError(body.error ?? 'The request failed.', body.detail);
  return body;
}

export async function fetchView(role: Role, signal?: AbortSignal): Promise<View> {
  return readJson<View>(await fetch(`/api/view?role=${role}`, { signal }));
}

export async function fetchProof(signal?: AbortSignal): Promise<Proof> {
  return readJson<Proof>(await fetch('/api/proof', { signal }));
}

export async function runAction(name: string, body: Record<string, unknown>): Promise<string> {
  try {
    const response = await fetch(`/api/actions/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return (await readJson<{ message: string }>(response)).message;
  } catch (error) {
    if (error instanceof ActionError) throw error;
    throw new ActionError('Could not reach the DRAW server. Check that it is running.');
  }
}
