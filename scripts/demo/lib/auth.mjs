// Bearer tokens for ledger users. LocalNet signs its own HS256 tokens with the
// documented `unsafe` secret. DevNet uses OAuth client credentials, one client
// per ledger user, so no single credential can act for every party.
import { createHmac } from 'node:crypto';

const oauthClients = new Map();
const tokenCache = new Map();
let shared = null;
let settings = { mode: 'hs256', secret: 'unsafe', audience: 'https://canton.network.global' };

export function configureAuth(next) {
  settings = { ...settings, ...next };
  tokenCache.clear();
  shared = null;
}

export function registerOAuthClient(userId, { clientId, clientSecret, scope }) {
  oauthClients.set(userId, { clientId, clientSecret, scope });
}

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

function hs256Token(userId) {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64url({ sub: userId, aud: settings.audience, exp: Math.floor(Date.now() / 1000) + 3600 });
  const signature = createHmac('sha256', settings.secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function oauthToken(userId) {
  const cached = tokenCache.get(userId);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const client = oauthClients.get(userId);
  if (!client) throw new Error(`no OAuth client configured for ledger user ${userId}`);
  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: client.clientId,
    client_secret: client.clientSecret,
    ...(settings.audience ? { audience: settings.audience } : {}),
    ...((client.scope ?? settings.scope) ? { scope: client.scope ?? settings.scope } : {}),
  });
  const response = await fetch(settings.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error(`token request for ${userId} failed: HTTP ${response.status} ${body.error ?? ''} ${body.error_description ?? ''}`);
  }
  tokenCache.set(userId, { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 300) * 1000 });
  return body.access_token;
}

// One person's login on a shared node: password grant once, then refresh.
// Every ledger user id maps to the same token, so the caller must label the
// run as single-credential.
async function sharedToken() {
  if (shared && shared.expiresAt > Date.now() + 60_000) return shared.token;
  const refresh = shared?.refreshToken ?? settings.refreshToken;
  const form = new URLSearchParams(refresh
    ? { grant_type: 'refresh_token', client_id: settings.clientId, refresh_token: refresh }
    : { grant_type: 'password', client_id: settings.clientId, username: settings.username, password: settings.password, scope: settings.scope });
  const response = await fetch(settings.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    if (refresh && settings.password) {
      shared = null;
      settings = { ...settings, refreshToken: undefined };
      return sharedToken();
    }
    throw new Error(`login failed: HTTP ${response.status} ${body.error ?? ''} ${body.error_description ?? ''}`);
  }
  shared = { token: body.access_token, refreshToken: body.refresh_token ?? refresh, expiresAt: Date.now() + (body.expires_in ?? 300) * 1000 };
  return shared.token;
}

// The ledger user id is the token's subject.
export async function sharedUserId() {
  const payload = (await sharedToken()).split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString()).sub;
}

// A user with its own registered client (for example a read-only verifier)
// gets its own token even when one shared login acts for the parties.
export async function tokenFor(userId) {
  if (oauthClients.has(userId)) return oauthToken(userId);
  if (settings.mode === 'password') return sharedToken();
  return settings.mode === 'oauth' ? oauthToken(userId) : hs256Token(userId);
}
