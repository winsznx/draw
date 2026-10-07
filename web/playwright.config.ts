import { defineConfig } from '@playwright/test';

// With DRAW_WEB_URL the journeys run against a deployed site. Without it they
// start the DRAW API on LocalNet (port 4173) and `next dev` (port 3100) that
// proxies to it. Start LocalNet first. Each test writes its own evidence.
const remote = process.env.DRAW_WEB_URL;
if (!remote) process.env.DRAW_EVIDENCE_NETWORK ??= 'localnet';

export default defineConfig({
  testDir: './e2e',
  timeout: 15 * 60_000,
  expect: { timeout: 180_000 },
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: remote ?? 'http://localhost:3100',
    channel: 'chrome',
    viewport: { width: 1280, height: 860 },
    trace: 'retain-on-failure',
    // DRAW_HOST_RESOLVER_RULES pins a hostname to an address, for a domain whose
    // DNS this machine hasn't picked up yet, e.g. "MAP drawcalls.xyz 104.21.24.185".
    launchOptions: process.env.DRAW_HOST_RESOLVER_RULES ? { args: [`--host-resolver-rules=${process.env.DRAW_HOST_RESOLVER_RULES}`] } : {},
  },
  webServer: remote ? undefined : [
    {
      command: 'node ../app/server.mjs',
      env: {
        PORT: '4173',
        DRAW_ENV_FILE: process.env.DRAW_ENV_FILE ?? 'none',
        DRAW_AUTO_SETTLE: 'false',
        ...(process.env.DRAW_PARTY_MODE ? { DRAW_PARTY_MODE: process.env.DRAW_PARTY_MODE } : {}),
      },
      url: 'http://localhost:4173/api/proof',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npx next dev -p 3100',
      env: { DRAW_API_URL: 'http://localhost:4173' },
      url: 'http://localhost:3100/',
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
