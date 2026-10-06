// Sign in with HackCanton. The browser runs the OIDC authorization code flow
// with PKCE against the node's Keycloak, keeps the token in this tab only, and
// uses it directly against the node's JSON Ledger API and the LP's own Canton
// wallet. DRAW's server never receives the token or acts for this party.
import type { AllocationRequestView, SignInConfig } from './types';

const PENDING_KEY = 'draw-signin-pending';
const SESSION_KEY = 'draw-signin';
// Renew the token this long before it expires.
const REFRESH_MARGIN_MS = 30_000;
const ACS_PAGE_SIZE = 500;

export interface Identity {
  userId: string;
  party: string;
}

interface Stored extends Identity {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

interface TokenReply {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

// The token expired, was revoked, or this tab never signed in.
export class SignedOut extends Error {
  constructor() {
    super('Your HackCanton sign-in has ended. Sign in again to continue.');
  }
}

export class NodeRefused extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(
      /insufficient/i.test(detail)
        ? 'Your wallet does not hold enough Canton Coin for this payment. Add test CC from your seat card, then pay again.'
        : status === 403 ? 'The node did not allow your login to do that.' : 'The node refused the request.',
    );
    this.status = status;
    this.detail = detail;
  }
}

// ---------------------------------------------------------------- storage
const listeners = new Set<() => void>();

function readStored(): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function writeStored(value: Stored | null): void {
  try {
    if (value) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage is blocked, so the sign-in cannot outlive this page.
  }
  cachedIdentity = undefined;
  listeners.forEach((notify) => notify());
}

let cachedIdentity: Identity | null | undefined;

// The signed-in identity, stable between calls so React can subscribe to it.
export function identity(): Identity | null {
  if (cachedIdentity === undefined) {
    const stored = readStored();
    cachedIdentity = stored ? { userId: stored.userId, party: stored.party } : null;
  }
  return cachedIdentity;
}

export function subscribeIdentity(notify: () => void): () => void {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export const signOut = (): void => writeStored(null);

// ---------------------------------------------------------------- sign-in
const base64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomToken = (length: number): string => base64url(crypto.getRandomValues(new Uint8Array(length)));
const redirectUri = (): string => `${window.location.origin}/auth/callback`;
const endpoint = (config: SignInConfig, name: 'auth' | 'token'): string => `${config.issuer}/protocol/openid-connect/${name}`;

export async function startSignIn(config: SignInConfig, returnTo: string): Promise<void> {
  const verifier = randomToken(48);
  const state = randomToken(16);
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  window.sessionStorage.setItem(PENDING_KEY, JSON.stringify({ verifier, state, returnTo }));
  const url = new URL(endpoint(config, 'auth'));
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: config.scope,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  }).toString();
  window.location.assign(url.toString());
}

async function requestToken(config: SignInConfig, body: Record<string, string>): Promise<TokenReply> {
  const response = await fetch(endpoint(config, 'token'), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: config.clientId, ...body }),
  });
  if (!response.ok) throw new NodeRefused(response.status, await response.text());
  return (await response.json()) as TokenReply;
}

// Completes the redirect back from Keycloak and returns where to go next.
export async function finishSignIn(config: SignInConfig, params: URLSearchParams): Promise<string> {
  const raw = window.sessionStorage.getItem(PENDING_KEY);
  window.sessionStorage.removeItem(PENDING_KEY);
  const pending = raw ? (JSON.parse(raw) as { verifier: string; state: string; returnTo: string }) : null;
  const error = params.get('error');
  if (error) throw new Error(params.get('error_description') ?? `Sign-in did not finish (${error}).`);
  const code = params.get('code');
  if (!pending || !code || params.get('state') !== pending.state) throw new Error('This sign-in did not start in this tab. Start it again.');

  const token = await requestToken(config, { grant_type: 'authorization_code', code, redirect_uri: redirectUri(), code_verifier: pending.verifier });
  const response = await fetch(`${config.ledgerApi}/v2/authenticated-user`, { headers: { authorization: `Bearer ${token.access_token}` } });
  if (!response.ok) throw new NodeRefused(response.status, await response.text());
  const { user } = (await response.json()) as { user: { id: string; primaryParty?: string } };
  if (!user.primaryParty) {
    throw new Error('Your login has no Canton party on this node yet. Open the Canton wallet once to onboard, then sign in again.');
  }
  writeStored({
    userId: user.id,
    party: user.primaryParty,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? null,
    expiresAt: Date.now() + token.expires_in * 1000,
  });
  return pending.returnTo;
}

let refreshing: Promise<string> | null = null;

// A token that is valid for at least the refresh margin, renewed when needed.
async function bearer(config: SignInConfig): Promise<string> {
  const stored = readStored();
  if (!stored) throw new SignedOut();
  if (stored.expiresAt - Date.now() > REFRESH_MARGIN_MS) return stored.accessToken;
  if (!stored.refreshToken) {
    signOut();
    throw new SignedOut();
  }
  refreshing ??= requestToken(config, { grant_type: 'refresh_token', refresh_token: stored.refreshToken })
    .then((token) => {
      writeStored({ ...stored, accessToken: token.access_token, refreshToken: token.refresh_token ?? stored.refreshToken, expiresAt: Date.now() + token.expires_in * 1000 });
      return token.access_token;
    })
    .catch(() => {
      signOut();
      throw new SignedOut();
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function call<T>(config: SignInConfig, url: string, { method = 'GET', json }: { method?: string; json?: unknown } = {}): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${await bearer(config)}`, ...(json === undefined ? {} : { 'content-type': 'application/json' }) },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
  if (response.status === 401) {
    signOut();
    throw new SignedOut();
  }
  const text = await response.text();
  if (!response.ok) throw new NodeRefused(response.status, text);
  return (text ? JSON.parse(text) : null) as T;
}

// ---------------------------------------------------------------- ledger, as the signed-in party
export interface Contract<P = Record<string, unknown>, V = unknown> {
  contractId: string;
  templateId: string;
  payload: P;
  interfaceView: V | undefined;
}

interface AcsEntry {
  contractEntry?: { JsActiveContract?: { createdEvent: { contractId: string; templateId: string; createArgument: unknown; interfaceViews?: { viewValue: unknown }[] } } };
}

// Active contracts this party can see, read with its own token.
export async function activeContracts<P, V = unknown>(config: SignInConfig, party: string, filter: { templateId: string } | { interfaceId: string }): Promise<Contract<P, V>[]> {
  const { offset } = await call<{ offset: number }>(config, `${config.ledgerApi}/v2/state/ledger-end`);
  const identifierFilter = 'interfaceId' in filter
    ? { InterfaceFilter: { value: { interfaceId: filter.interfaceId, includeInterfaceView: true, includeCreatedEventBlob: false } } }
    : { TemplateFilter: { value: { templateId: filter.templateId, includeCreatedEventBlob: false } } };
  const eventFormat = { verbose: false, filtersByParty: { [party]: { cumulative: [{ identifierFilter }] } } };
  const entries: AcsEntry[] = [];
  let pageToken: string | undefined;
  do {
    const page = await call<{ activeContracts?: AcsEntry[]; nextPageToken?: string }>(config, `${config.ledgerApi}/v2/state/active-contracts-page`, {
      method: 'POST',
      json: { activeAtOffset: offset, eventFormat, maxPageSize: ACS_PAGE_SIZE, ...(pageToken ? { pageToken } : {}) },
    });
    entries.push(...(page.activeContracts ?? []));
    pageToken = page.nextPageToken || undefined;
  } while (pageToken);
  return entries.flatMap((entry) => {
    const event = entry.contractEntry?.JsActiveContract?.createdEvent;
    return event ? [{ contractId: event.contractId, templateId: event.templateId, payload: event.createArgument as P, interfaceView: event.interfaceViews?.[0]?.viewValue as V | undefined }] : [];
  });
}

// Exercises a choice as the signed-in party, with its own token.
export async function exercise(config: SignInConfig, identityNow: Identity, command: { templateId: string; contractId: string; choice: string; argument: Record<string, unknown> }): Promise<{ updateId: string }> {
  const reply = await call<{ transaction: { updateId: string } }>(config, `${config.ledgerApi}/v2/commands/submit-and-wait-for-transaction`, {
    method: 'POST',
    json: {
      commands: {
        commands: [{ ExerciseCommand: { templateId: command.templateId, contractId: command.contractId, choice: command.choice, choiceArgument: command.argument } }],
        commandId: `draw-${crypto.randomUUID()}`,
        userId: identityNow.userId,
        actAs: [identityNow.party],
      },
      transactionFormat: {
        eventFormat: { verbose: false, filtersByParty: { [identityNow.party]: { cumulative: [{ identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: false } } } }] } } },
        transactionShape: 'TRANSACTION_SHAPE_ACS_DELTA',
      },
    },
  });
  return { updateId: reply.transaction.updateId };
}

// ---------------------------------------------------------------- the LP's own Canton wallet
export interface WalletBalance {
  effective_unlocked_qty: string;
  effective_locked_qty: string;
}

export const walletBalance = (config: SignInConfig): Promise<WalletBalance> => call(config, `${config.validatorApi}/v0/wallet/balance`);

export const walletTap = (config: SignInConfig, amount: string): Promise<unknown> =>
  call(config, `${config.validatorApi}/v0/wallet/tap`, { method: 'POST', json: { amount, command_id: `draw-tap-${crypto.randomUUID()}` } });

// How long a late payment's lock waits to be settled.
const LATE_ALLOCATE_WINDOW_MS = 60 * 60_000;

// The wallet API takes times as microseconds since the epoch.
function micros(iso: string): number {
  const fraction = iso.match(/\.(\d+)Z$/)?.[1] ?? '';
  return Date.parse(iso) * 1000 + Number(fraction.padEnd(6, '0').slice(3, 6));
}

// Funds a payment request from the LP's own wallet: the same call the Canton
// wallet makes when its user accepts the request. The wallet picks the coin,
// locks the amount, and returns the new allocation. The request asks for the
// allocation before the notice's due time. A late LP can still pay: the
// fund's settlement checks the reference, payer, amount and asset, not that
// time, so a late payment gets a fresh hour to be settled in.
export async function walletAllocate(config: SignInConfig, request: AllocationRequestView, sender: string): Promise<{ allocationCid: string | null }> {
  const legs = Object.entries(request.transferLegs).filter(([, leg]) => leg.sender === sender);
  const [first] = legs;
  if (!first || legs.length > 1) throw new Error('This payment request has no single transfer leg for your party.');
  const [transferLegId, leg] = first;
  const { settlement } = request;
  const lateBy = Date.now() + 60_000 - Date.parse(settlement.allocateBefore);
  const allocateBefore = lateBy > 0 ? new Date(Date.now() + LATE_ALLOCATE_WINDOW_MS).toISOString() : settlement.allocateBefore;
  const settleBefore = Date.parse(settlement.settleBefore) > Date.parse(allocateBefore) ? settlement.settleBefore : new Date(Date.parse(allocateBefore) + LATE_ALLOCATE_WINDOW_MS).toISOString();
  const reply = await call<{ output?: { allocation_cid?: string } }>(config, `${config.validatorApi}/v0/allocations`, {
    method: 'POST',
    json: {
      settlement: {
        executor: settlement.executor,
        settlement_ref: { id: settlement.settlementRef.id, ...(settlement.settlementRef.cid ? { cid: settlement.settlementRef.cid } : {}) },
        requested_at: micros(settlement.requestedAt),
        allocate_before: micros(allocateBefore),
        settle_before: micros(settleBefore),
        meta: { ...settlement.meta.values, ...leg.meta.values },
      },
      transfer_leg_id: transferLegId,
      transfer_leg: { receiver: leg.receiver, amount: leg.amount, meta: leg.meta.values },
    },
  });
  return { allocationCid: reply?.output?.allocation_cid ?? null };
}

export const walletWithdraw = (config: SignInConfig, allocationCid: string): Promise<unknown> =>
  call(config, `${config.validatorApi}/v0/allocations/${encodeURIComponent(allocationCid)}/withdraw`, { method: 'POST' });
