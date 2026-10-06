// Network profile from the environment (and `.env` at the repo root when
// present). LocalNet needs no configuration. DevNet is described entirely by
// variables listed in `.env.example`.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SHARED_USER, configureAuth, registerOAuthClient } from './auth.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
// DRAW_ENV_FILE=none skips the file, so tests see only the environment they set.
if (process.env.DRAW_ENV_FILE !== 'none' && existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));

export const ROLES = ['admin', 'lpA', 'lpB', 'lpC', 'outsider'];
export { SHARED_USER };
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

  // Each user's OAuth client, keyed by its ledger user id, or by a placeholder
  // the token's subject resolves when only the client is given (see auth.mjs).
  const userIdFor = (key) => env(`DRAW_${key}_USER`);
  const userKeyFor = (key) => userIdFor(key) ?? (env(`DRAW_${key}_CLIENT_ID`) ? `__${key.toLowerCase()}__` : undefined);
  for (const key of [...ROLES.map(envKey), 'VERIFIER', 'OPERATOR', 'BACKEND']) {
    const user = userKeyFor(key);
    const clientId = env(`DRAW_${key}_CLIENT_ID`);
    if (user && clientId) registerOAuthClient(user, { clientId, clientSecret: required(`DRAW_${key}_CLIENT_SECRET`), scope: env(`DRAW_${key}_SCOPE`) });
  }
  // The user a key acts as when it has a client of its own.
  const ownUser = (key) => (env(`DRAW_${key}_CLIENT_ID`) ? userKeyFor(key) : undefined);
  // One backend client for every demo seat (DRAW_BACKEND_*): a seat without a
  // client of its own acts through it.
  const backendUser = authMode === 'oauth' ? ownUser('BACKEND') : undefined;
  // With one shared login every seat is the same ledger user, resolved from the
  // token. Otherwise a seat acts through its own client, then the backend
  // client, then a plain user id (LocalNet signs its own tokens for any id).
  const seatUser = (role) => (authMode === 'password'
    ? SHARED_USER
    : ownUser(envKey(role)) ?? backendUser ?? userIdFor(envKey(role)) ?? required(`DRAW_${envKey(role)}_USER`));
  // Parties made ahead of time come with users to act as them. Other modes make their own.
  const providedParties = partyMode === 'provisioned' || partyMode === 'external-provisioned';
  // A verifier with a client of its own is its own credential, even on a shared login.
  const verifierUser = providedParties
    ? ownUser('VERIFIER') ?? (authMode === 'password' ? SHARED_USER : userIdFor('VERIFIER') ?? backendUser ?? required('DRAW_VERIFIER_USER'))
    : undefined;

  const seatUsers = providedParties ? ROLES.map(seatUser) : [];
  // Seats that share a ledger user cannot prove one seat's credential is refused another's records.
  const singleCredential = authMode === 'password' || new Set(seatUsers).size < seatUsers.length;
  // As configured. Whether the verifier really is someone else is decided
  // again from the resolved ledger users (draw.mjs credentialFacts).
  const separateVerifier = seatUsers.length > 0 && verifierUser !== SHARED_USER && !seatUsers.includes(verifierUser);
  const usesBackend = Boolean(backendUser) && seatUsers.length > 0 && seatUsers.every((user) => user === backendUser);
  const seatCredential = authMode === 'password' ? 'shared-login' : usesBackend ? 'backend-client' : singleCredential ? 'shared-user' : 'per-seat';

  const provisioned = partyMode === 'provisioned'
    ? Object.fromEntries([...ROLES, 'verifier'].map((role) => [role, {
      userId: role === 'verifier' ? verifierUser : seatUser(role),
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
      return [role, { userId: seatUser(role), party: entry.partyId, fingerprint: entry.fingerprint, keyName: `${keyPrefix}${role}` }];
    }));
    provisionedExternal.verifier = { userId: verifierUser };
  }

  return {
    name,
    authMode,
    singleCredential,
    // Who acts for the demo seats: one person's login ('shared-login'), the
    // DRAW_BACKEND_* client ('backend-client'), some other user that several
    // seats share ('shared-user'), or a credential per seat ('per-seat').
    seatCredential,
    // The OAuth backend client's user, when one is configured.
    backendUser,
    // Shared nodes may hide error details behind a trace id.
    errorsMayBeHidden: env('DRAW_ERRORS_HIDDEN', name === 'localnet' ? 'false' : 'true') === 'true',
    scanProxyUrl: env('SCAN_PROXY_URL'),
    partyMode,
    // Every party signs its own transactions with its own key.
    externalKeys: partyMode === 'external' || partyMode === 'external-provisioned',
    separateVerifier,
    // Named on new funds as an independent observer (draw 0.3.0).
    verifierParty: env('DRAW_VERIFIER_PARTY'),
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
    // Scan behind a validator's proxy wants a token. `shared` means the user the
    // demo seats act as: the shared login, or the backend client.
    scanAuthUser: env('SCAN_AUTH_USER') === 'shared' && providedParties ? seatUser('admin') : env('SCAN_AUTH_USER'),
    tapAmount: env('DRAW_TAP_AMOUNT', '100.0'),
    evidenceDir: join(ROOT, 'evidence', name === 'localnet' ? 'local' : name, 'runs'),
  };
}

export const network = loadNetwork();
