import { tourHeaders } from './tour';
import type { NoticePlace, Proof, Role, View } from './types';

export class ActionError extends Error {
  readonly detail: string | undefined;

  constructor(message: string, detail?: string) {
    super(message);
    this.detail = detail;
  }
}

export class AccessCodeNeeded extends ActionError {}

// The server turned the action away for now: too many came in a short time,
// too many are already waiting, or the demo is full. Nothing was submitted,
// and reading still works.
export class SlowDown extends ActionError {}

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

const SLOW_DOWN = 'Too many actions came in a short time. Wait a minute, then try again.';

// A read that hangs would leave the last one on screen as if it were current,
// so the page stops waiting after this long. An action can wait in DRAW's
// queue behind other visitors' actions, so it gets longer.
const READ_LIMIT_MS = 15_000;
const ACTION_LIMIT_MS = 120_000;

interface Answer {
  response: Response;
  text: string;
}

// Sends one request and reads its whole answer within `limitMs`. A cancel from
// the caller, such as react-query dropping a read nobody needs, passes through
// unchanged.
async function send(path: string, init: RequestInit, limitMs: number, tooSlow: string, unreachable: string): Promise<Answer> {
  const limit = AbortSignal.timeout(limitMs);
  // Browsers from before 2024 have no AbortSignal.any. They keep the caller's
  // signal alone, and the site's proxy still ends a request that hangs.
  const signal = init.signal ? (AbortSignal.any?.([init.signal, limit]) ?? init.signal) : limit;
  try {
    const response = await fetch(path, { ...init, signal });
    return { response, text: await response.text() };
  } catch (error) {
    if (limit.aborted && !init.signal?.aborted) throw new ActionError(tooSlow);
    if (error instanceof TypeError) throw new ActionError(unreachable);
    throw error;
  }
}

// Checks the status before it trusts the body. A body that isn't JSON, such as
// the empty 502 a web server sends for a stopped API, reads as none.
function readJson<T>({ response, text }: Answer): T {
  let body: (T & { error?: string; detail?: string }) | null;
  try {
    body = JSON.parse(text) as T & { error?: string; detail?: string };
  } catch {
    body = null;
  }
  if (response.status === 401) throw new AccessCodeNeeded(body?.error ?? 'Actions on this demo need an access code.');
  if (response.status === 429 || response.status === 503) throw new SlowDown(body?.error ?? SLOW_DOWN);
  if (!response.ok) throw new ActionError(body?.error ?? 'DRAW is not answering right now. Try again in a minute.', body?.detail);
  if (body === null) throw new ActionError('DRAW sent an answer this page could not read. Try again in a minute.');
  return body;
}

// A read from DRAW's API for this browser's demo fund.
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return readJson<T>(await send(path, { signal, cache: 'no-store', headers: tourHeaders() }, READ_LIMIT_MS, 'DRAW did not answer within 15 seconds.', 'Could not reach DRAW. Check your connection.'));
}

export async function fetchView(role: Role, signal?: AbortSignal): Promise<View> {
  return getJson<View>(`/api/view?role=${role}`, signal);
}

// Where a notice reference sits on this seat's own ledger, for a notice that
// is not in this browser's demo fund.
export async function fetchNoticePlace(role: Role, ref: string, signal?: AbortSignal): Promise<NoticePlace> {
  const query = new URLSearchParams({ role, ref });
  return (await getJson<{ place: NoticePlace }>(`/api/notice?${query}`, signal)).place;
}

export async function fetchProof(signal?: AbortSignal): Promise<Proof> {
  return getJson<Proof>('/api/proof', signal);
}

function actionHeaders(): Record<string, string> {
  const code = accessCode();
  return { 'Content-Type': 'application/json', ...tourHeaders(), ...(code ? { 'x-draw-access': code } : {}) };
}

const sendAction = (path: string, body: Record<string, unknown>): Promise<Answer> =>
  send(
    path,
    { method: 'POST', headers: actionHeaders(), body: JSON.stringify(body) },
    ACTION_LIMIT_MS,
    'DRAW did not answer within 2 minutes. The action may still finish, so check this page before you try again.',
    'Could not reach DRAW. Check your connection and try again.',
  );

async function post(path: string, body: Record<string, unknown>): Promise<ActionReply> {
  const answer = await sendAction(path, body);
  const json = readJson<{ message?: string; needsSignature?: SignatureRequest }>(answer);
  if (answer.response.status === 202 && json.needsSignature) return { kind: 'sign', request: json.needsSignature };
  return { kind: 'done', message: json.message ?? 'Done.' };
}

export const postAction = (name: string, body: Record<string, unknown>): Promise<ActionReply> => post(`/api/actions/${name}`, body);

export const postSignature = (id: string, body: { signature: string } | { cancel: true }): Promise<ActionReply> => post(`/api/sign/${id}`, body);

// Starts sign-up with a browser key: the node builds the onboarding
// transactions for this public key and returns the hash to sign.
export async function startOnboarding(role: Role, publicKeySpki: string): Promise<{ partyId: string; fingerprint: string; multiHash: string }> {
  const answer = await sendAction('/api/actions/onboardstart', { role, publicKeySpki });
  if (answer.response.status === 401) throw new AccessCodeNeeded('Creating an account on this demo needs an access code.');
  return readJson(answer);
}
