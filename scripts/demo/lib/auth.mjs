// Bearer tokens for ledger users. LocalNet signs its own HS256 tokens with the
// documented `unsafe` secret. DevNet uses OAuth client credentials, one client
// per ledger user, so no single credential can act for every party.
import { createHmac } from 'node:crypto';

const oauthClients = new Map();
const tokenCache = new Map();
let settings = { mode: 'hs256', secret: 'unsafe', audience: 'https://canton.network.global' };

export function configureAuth(next) {
  settings = { ...settings, ...next };
  tokenCache.clear();
}

export function registerOAuthClient(userId, { clientId, clientSecret }) {
  oauthClients.set(userId, { clientId, clientSecret });
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
    ...(settings.scope ? { scope: settings.scope } : {}),
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

export async function tokenFor(userId) {
  return settings.mode === 'oauth' ? oauthToken(userId) : hs256Token(userId);
}
