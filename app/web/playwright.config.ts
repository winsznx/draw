import { defineConfig } from '@playwright/test';

// Runs against the real app and the real ledger. Start LocalNet first.
// Each run writes to its own evidence folder so earlier runs are never overwritten.
const runId = process.env.DRAW_E2E_RUN ?? new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
process.env.DRAW_E2E_RUN = runId;
const out = `../../evidence/local/browser/${runId}`;

export default defineConfig({
  testDir: 'e2e',
  timeout: 10 * 60_000,
  expect: { timeout: 60_000 },
  workers: 1,
  reporter: [['list'], ['json', { outputFile: `${out}/report.json` }]],
  use: {
    baseURL: 'http://localhost:4173',
    channel: 'chrome',
    viewport: { width: 1280, height: 860 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  outputDir: `${out}/artifacts`,
  webServer: {
    command: 'node ../server.mjs',
    env: { DRAW_AUTO_SETTLE: process.env.DRAW_AUTO_SETTLE ?? 'false' },
    url: 'http://localhost:4173/api/proof',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
