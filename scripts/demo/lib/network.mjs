// Network profile from the environment (and `.env` at the repo root when
// present). LocalNet needs no configuration. DevNet is described entirely by
// variables listed in `.env.example`.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { configureAuth, registerOAuthClient } from './auth.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
// DRAW_ENV_FILE=none skips the file, so tests see only the environment they set.
if (process.env.DRAW_ENV_FILE !== 'none' && existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));

export const ROLES = ['admin', 'lpA', 'lpB', 'lpC', 'outsider'];
export const SHARED_USER = '__shared__';
const env = (name, fallback) => {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
};
const required = (name) => {
  const value = env(name);
  if (value === undefined) throw new Error(`${name} is required for DRAW_NETWORK=${env('DRAW_NETWORK', 'localnet')}`);
  return value;
};
const envKey = (role) => role.toUpperCase();

function loadNetwork() {
  const name = env('DRAW_NETWORK', 'localnet');
  const authMode = env('LEDGER_AUTH_MODE', name === 'localnet' ? 'hs256' : 'oauth');
  const partyMode = env('DRAW_PARTY_MODE', name === 'localnet' ? 'allocate' : 'provisioned');

  const defaultApi = name === 'localnet' ? undefined : required('DRAW_JSON_API');
  const providerApi = env('APP_PROVIDER_JSON_API', defaultApi ?? 'http://localhost:3975');
  const userApi = env('APP_USER_JSON_API', defaultApi ?? 'http://localhost:2975');
  const apiFor = (role) => env(`DRAW_${envKey(role)}_JSON_API`, role === 'admin' || role === 'verifier' ? providerApi : userApi);

  if (authMode === 'password') {
    configureAuth({
      mode: 'password',
      tokenUrl: required('OAUTH_TOKEN_URL'),
      clientId: required('OAUTH_CLIENT_ID'),
      username: env('HACKCANTON_USERNAME'),
      password: env('HACKCANTON_PASSWORD'),
      refreshToken: env('HACKCANTON_REFRESH_TOKEN'),
      scope: env('OAUTH_SCOPE', 'openid daml_ledger_api offline_access'),
    });
    if (!env('HACKCANTON_REFRESH_TOKEN') && !(env('HACKCANTON_USERNAME') && env('HACKCANTON_PASSWORD'))) {
      throw new Error('LEDGER_AUTH_MODE=password needs HACKCANTON_USERNAME and HACKCANTON_PASSWORD, or HACKCANTON_REFRESH_TOKEN');
    }
  } else if (authMode === 'oauth') {
    configureAuth({
      mode: 'oauth',
      tokenUrl: required('OAUTH_TOKEN_URL'),
      audience: env('OAUTH_AUDIENCE'),
      scope: env('OAUTH_SCOPE'),
    });
  } else {
    configureAuth({
      mode: 'hs256',
      secret: env('LEDGER_AUTH_SECRET', 'unsafe'),
      audience: env('LEDGER_AUTH_AUDIENCE', 'https://canton.network.global'),
    });
  }

  // Each user's OAuth client, keyed by the ledger user id the token resolves to.
  const userIdFor = (key) => env(`DRAW_${key}_USER`);
  for (const key of [...ROLES.map(envKey), 'VERIFIER', 'OPERATOR']) {
    const userId = userIdFor(key);
    const clientId = env(`DRAW_${key}_CLIENT_ID`);
    if (userId && clientId) registerOAuthClient(userId, { clientId, clientSecret: required(`DRAW_${key}_CLIENT_SECRET`), scope: env(`DRAW_${key}_SCOPE`) });
  }
  // On a shared login, a verifier with its own client is still its own credential.
  const separateVerifier = authMode === 'password' && Boolean(userIdFor('VERIFIER') && env('DRAW_VERIFIER_CLIENT_ID'));

  const sharedOr = (role) => (role === 'verifier' && separateVerifier ? userIdFor('VERIFIER') : SHARED_USER);
  const provisioned = partyMode === 'provisioned'
    ? Object.fromEntries([...ROLES, 'verifier'].map((role) => [role, {
      // With one shared login every role is the same ledger user, resolved from the token.
      userId: authMode === 'password' ? sharedOr(role) : required(`DRAW_${envKey(role)}_USER`),
      party: role === 'verifier' ? undefined : required(`DRAW_${envKey(role)}_PARTY`),
    }]))
    : undefined;

  // External parties allocated ahead of time by the node operator from
  // topology we generated and signed. The keys stay in .keys/ on this machine.
  let provisionedExternal;
  if (partyMode === 'external-provisioned') {
    const file = env('DRAW_EXTERNAL_PARTIES_FILE', join(ROOT, 'internal/noders-external-parties/summary.json'));
    const { parties } = JSON.parse(readFileSync(file, 'utf8'));
    const keyPrefix = env('DRAW_EXTERNAL_KEY_PREFIX', 'devnet-ext-');
    provisionedExternal = Object.fromEntries(ROLES.map((role) => {
      const entry = parties.find((p) => p.role === role);
      if (!entry) throw new Error(`${file} has no external party for ${role}`);
      return [role, { party: entry.partyId, fingerprint: entry.fingerprint, keyName: `${keyPrefix}${role}` }];
    }));
    provisionedExternal.verifier = { userId: authMode === 'password' ? sharedOr('verifier') : required('DRAW_VERIFIER_USER') };
  }

  return {
    name,
    authMode,
    singleCredential: authMode === 'password',
    // Shared nodes may hide error details behind a trace id.
    errorsMayBeHidden: env('DRAW_ERRORS_HIDDEN', name === 'localnet' ? 'false' : 'true') === 'true',
    scanProxyUrl: env('SCAN_PROXY_URL'),
    partyMode,
    // Every party signs its own transactions with its own key.
    externalKeys: partyMode === 'external' || partyMode === 'external-provisioned',
    separateVerifier,
    apiFor,
    participantLabel: (role) => (apiFor(role) === providerApi ? (name === 'localnet' ? 'app-provider' : 'admin participant') : (name === 'localnet' ? 'app-user' : 'lp participant')),
    operators: {
      provider: env('DRAW_OPERATOR_USER', name === 'localnet' ? 'ledger-api-user' : undefined),
      providerApi,
      userApi,
    },
    provisioned,
    provisionedExternal,
    registryUrl: env('REGISTRY_URL', 'http://scan.localhost:4000/registry'),
    scanUrl: env('SCAN_URL', 'http://scan.localhost:4000/api/scan'),
    scanAuthUser: env('SCAN_AUTH_USER'),
    tapAmount: env('DRAW_TAP_AMOUNT', '100.0'),
    evidenceDir: join(ROOT, 'evidence', name === 'localnet' ? 'local' : name, 'runs'),
  };
}

export const network = loadNetwork();
