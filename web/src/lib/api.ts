import type { Proof, Role, View } from './types';

export class ActionError extends Error {
  readonly detail: string | undefined;

  constructor(message: string, detail?: string) {
    super(message);
    this.detail = detail;
  }
}

export class AccessCodeNeeded extends ActionError {}

export interface SignatureRequest {
  id: string;
  role: string;
  party: string;
  hash: string;
  description: string;
  step: number;
}

export type ActionReply = { kind: 'done'; message: string } | { kind: 'sign'; request: SignatureRequest };

const ACCESS_KEY = 'draw-access-code';

export function accessCode(): string | null {
  try {
    return window.localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function rememberAccessCode(code: string): void {
  try {
    window.localStorage.setItem(ACCESS_KEY, code);
  } catch {
    // Storage is blocked. The code then lasts until the next prompt.
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string; detail?: string };
  if (!response.ok) throw new ActionError(body.error ?? 'The request failed.', body.detail);
  return body;
}

export async function fetchView(role: Role, signal?: AbortSignal): Promise<View> {
  return readJson<View>(await fetch(`/api/view?role=${role}`, { signal, cache: 'no-store' }));
}

export async function fetchProof(signal?: AbortSignal): Promise<Proof> {
  return readJson<Proof>(await fetch('/api/proof', { signal }));
}

async function post(path: string, body: Record<string, unknown>): Promise<ActionReply> {
  const code = accessCode();
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(code ? { 'x-draw-access': code } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ActionError('Could not reach DRAW. Check your connection and try again.');
  }
  const json = (await response.json()) as { message?: string; needsSignature?: SignatureRequest; error?: string; detail?: string };
  if (response.status === 401) throw new AccessCodeNeeded(json.error ?? 'Actions on this demo need an access code.');
  if (response.status === 202 && json.needsSignature) return { kind: 'sign', request: json.needsSignature };
  if (!response.ok) throw new ActionError(json.error ?? 'The request failed.', json.detail);
  return { kind: 'done', message: json.message ?? 'Done.' };
}

export const postAction = (name: string, body: Record<string, unknown>): Promise<ActionReply> => post(`/api/actions/${name}`, body);

export const postSignature = (id: string, body: { signature: string } | { cancel: true }): Promise<ActionReply> => post(`/api/sign/${id}`, body);

// Starts sign-up with a browser key: the node builds the onboarding
// transactions for this public key and returns the hash to sign.
export async function startOnboarding(role: Role, publicKeySpki: string): Promise<{ partyId: string; fingerprint: string; multiHash: string }> {
  const code = accessCode();
  const response = await fetch('/api/actions/onboardstart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(code ? { 'x-draw-access': code } : {}) },
    body: JSON.stringify({ role, publicKeySpki }),
  });
  if (response.status === 401) throw new AccessCodeNeeded('Creating an account on this demo needs an access code.');
  return readJson(response);
}
