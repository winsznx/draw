// Network profile from the environment (and `.env` at the repo root when
// present). LocalNet needs no configuration. DevNet is described entirely by
// variables listed in `.env.example`.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { configureAuth, registerOAuthClient } from './auth.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));

export const ROLES = ['admin', 'lpA', 'lpB', 'lpC', 'outsider'];
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

  if (authMode === 'oauth') {
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
    if (userId && clientId) registerOAuthClient(userId, { clientId, clientSecret: required(`DRAW_${key}_CLIENT_SECRET`) });
  }

  const provisioned = partyMode === 'provisioned'
    ? Object.fromEntries([...ROLES, 'verifier'].map((role) => [role, {
      userId: required(`DRAW_${envKey(role)}_USER`),
      party: role === 'verifier' ? undefined : required(`DRAW_${envKey(role)}_PARTY`),
    }]))
    : undefined;

  return {
    name,
    authMode,
    partyMode,
    apiFor,
    participantLabel: (role) => (apiFor(role) === providerApi ? (name === 'localnet' ? 'app-provider' : 'admin participant') : (name === 'localnet' ? 'app-user' : 'lp participant')),
    operators: {
      provider: env('DRAW_OPERATOR_USER', name === 'localnet' ? 'ledger-api-user' : undefined),
      providerApi,
      userApi,
    },
    provisioned,
    registryUrl: env('REGISTRY_URL', 'http://scan.localhost:4000/registry'),
    scanUrl: env('SCAN_URL', 'http://scan.localhost:4000/api/scan'),
    scanAuthUser: env('SCAN_AUTH_USER'),
    tapAmount: env('DRAW_TAP_AMOUNT', '100.0'),
    evidenceDir: join(ROOT, 'evidence', name === 'localnet' ? 'local' : name, 'runs'),
  };
}

export const network = loadNetwork();
