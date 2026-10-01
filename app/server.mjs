// Thin role view over the latest LocalNet run. Switching role switches the
// ledger user that runs the query. There is no admin dataset filtered by role.
// Usage: node app/server.mjs [runId]   then open http://localhost:4173
import { createServer } from 'node:http';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LedgerClient, TEMPLATES } from '../scripts/demo/lib/ledger.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RUNS = join(ROOT, 'evidence/local/runs');
const runId = process.argv[2] ?? readdirSync(RUNS).sort().at(-1);
const runDir = join(RUNS, runId);
const result = JSON.parse(readFileSync(join(runDir, 'result.json'), 'utf8'));
const runTag = runId.toLowerCase().replace(/[^a-z0-9]/g, '');
const PORT = Number(process.env.PORT ?? 4173);
const API = {
  'app-provider': process.env.APP_PROVIDER_JSON_API ?? 'http://localhost:3975',
  'app-user': process.env.APP_USER_JSON_API ?? 'http://localhost:2975',
};

// Evidence state per obligation reference, written by the independent verifier.
const evidenceByRef = new Map(
  readdirSync(runDir)
    .filter((file) => /^receipt-lp[A-Z]\.json$/.test(file))
    .map((file) => JSON.parse(readFileSync(join(runDir, file), 'utf8')))
    .map((receipt) => [receipt.obligationRef, receipt.verdict]),
);

const ROLES = ['admin', 'lpA', 'lpB', 'lpC', 'outsider'];
const STATE_LABEL = {
  Issued: 'Due',
  PaymentPending: 'Payment pending',
  Overdue: 'Overdue',
  Waived: 'Waived',
  ManualReview: 'Manual review',
};

function displayState(obligation) {
  if (obligation.state !== 'Funded') return STATE_LABEL[obligation.state] ?? obligation.state;
  return evidenceByRef.get(obligation.obligationRef) === 'VERIFIED_FUNDED' ? 'Funded' : 'Settled, awaiting verification';
}

async function viewAs(role) {
  const party = result.parties[role];
  const participant = result.participants[role];
  const userId = `draw-${role}-${runTag}`;
  const client = new LedgerClient({ baseUrl: API[participant], userId });
  const read = async (templateId) => (await client.activeContracts(party, { templateId })).map((c) => c.payload);

  const [funds, calls, commitments, obligations] = await Promise.all([
    read(TEMPLATES.Fund), read(TEMPLATES.CapitalCall), read(TEMPLATES.InvestorCommitment), read(TEMPLATES.CapitalCallObligation),
  ]);
  const roleOf = (p) => ROLES.find((r) => result.parties[r] === p) ?? 'unknown';
  const rows = obligations.map((o) => ({
    investor: roleOf(o.lp),
    fundName: o.fundName,
    callId: o.callId,
    scenarioUsd: Number(o.scenarioAmount),
    units: Number(o.amountDue),
    dueAt: o.dueAt,
    status: displayState(o),
  }));
  const funded = rows.filter((r) => r.status === 'Funded');
  const unresolved = rows.filter((r) => r.status !== 'Funded' && r.status !== 'Waived');
  return {
    queriedAs: { role, userId, party, participant },
    fund: funds[0] ? { fundId: funds[0].fundId, name: funds[0].fundName } : null,
    call: calls[0] ? { callId: calls[0].callId, totalUsd: Number(calls[0].totalScenarioAmount) } : null,
    commitments: commitments.map((c) => ({ investor: roleOf(c.lp), committedUsd: Number(c.committedScenarioAmount), calledUsd: Number(c.calledScenarioAmount) })),
    obligations: rows,
    totals: calls[0] ? {
      fundedUsd: funded.reduce((s, r) => s + r.scenarioUsd, 0),
      unresolvedUsd: unresolved.reduce((s, r) => s + r.scenarioUsd, 0),
    } : null,
  };
}

const page = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.html'), 'utf8');

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page.replace('__RUN_ID__', runId));
    return;
  }
  if (url.pathname === '/api/view') {
    const role = url.searchParams.get('role');
    if (!ROLES.includes(role)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unknown role' }));
      return;
    }
    try {
      const body = await viewAs(role);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    } catch (error) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  res.writeHead(404).end();
}).listen(PORT, () => console.log(`DRAW role view for run ${runId}: http://localhost:${PORT}`));
