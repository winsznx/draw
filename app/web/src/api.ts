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

function accessCode(): string | null {
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
    // Storage blocked: the code then lasts only until the next prompt.
  }
}

export class AccessCodeNeeded extends ActionError {}

export const accessHeaders = (): Record<string, string> => {
  const code = accessCode();
  return code ? { 'x-draw-access': code } : {};
};

async function post(path: string, body: Record<string, unknown>): Promise<ActionReply> {
  let response: Response;
  const code = accessCode();
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(code ? { 'x-draw-access': code } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ActionError('Could not reach the DRAW server. Check that it is running.');
  }
  const json = (await response.json()) as { message?: string; needsSignature?: SignatureRequest; error?: string; detail?: string };
  if (response.status === 401) throw new AccessCodeNeeded(json.error ?? 'This demo needs an access code for actions.');
  if (response.status === 202 && json.needsSignature) return { kind: 'sign', request: json.needsSignature };
  if (!response.ok) throw new ActionError(json.error ?? 'The request failed.', json.detail);
  return { kind: 'done', message: json.message ?? 'Done.' };
}

export const postAction = (name: string, body: Record<string, unknown>): Promise<ActionReply> => post(`/api/actions/${name}`, body);

// The answer to a signature request: a signature, or a cancellation.
export const postSignature = (id: string, body: { signature: string } | { cancel: true }): Promise<ActionReply> => post(`/api/sign/${id}`, body);
