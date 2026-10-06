// Read-only and prepare-only probes of the DevNet node, written as evidence.
// Nothing is executed or committed on the ledger: prepare returns a hash that
// is never signed or executed, and generate-topology does not allocate.
// Usage: node scripts/demo/probe.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

import { network, ROOT } from './lib/network.mjs';
import { LedgerClient, TEMPLATES } from './lib/ledger.mjs';
import { ledgerUserOf } from './lib/auth.mjs';
import { hint, judgeBackend, judgeVerifier, summarizeRights } from './lib/rights.mjs';
import { amuletInstrument } from './lib/registry.mjs';
import { credentialFacts, packageInfo, providedUsers } from './lib/draw.mjs';
import { PartyKey } from './lib/keys.mjs';

const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const OUT = join(ROOT, 'evidence', network.name === 'localnet' ? 'local' : network.name, 'probes', runId);
mkdirSync(OUT, { recursive: true });

// The ledger users the provided parties act as, resolved the way a run resolves them.
const users = await providedUsers();
const user = users.admin;
const admin = network.provisioned.admin.party;
const demoParties = new Set(['admin', 'lpA', 'lpB', 'lpC', 'outsider'].map((role) => network.provisioned[role].party));
const client = new LedgerClient({ baseUrl: network.apiFor('admin'), userId: user, label: 'probe' });
const probes = [];

// A refusal counts only with the status a permission check answers. Any other
// error is FAILED, so a broken request never passes for a refused one.
async function probe(id, expectation, action, { refusedWith = 403 } = {}) {
  try {
    const detail = await action();
    probes.push({ id, expectation, outcome: 'SUCCEEDED', detail });
  } catch (error) {
    const refused = error.status === refusedWith;
    probes.push({ id, expectation, outcome: refused ? 'REFUSED' : 'FAILED', status: error.status ?? null, detail: String(error.message ?? error).slice(0, 600) });
  }
  console.log(`${probes.at(-1).outcome.padEnd(9)} ${id}`);
}

const { packageId, version } = packageInfo();
const synchronizerId = await client.synchronizerFor(admin);
const instrumentId = await amuletInstrument();

await probe('package: this release is registered on the node', 'SUCCEEDED', async () => {
  const status = await client.request('GET', `/v2/packages/${packageId}/status`);
  if (status.packageStatus !== 'PACKAGE_STATUS_REGISTERED') throw new Error(`status ${status.packageStatus}`);
  return { packageId, version, status: status.packageStatus };
});

// Preparing a create of a template that exists only in this release resolves
// only when the node has vetted it. The prepared transaction is discarded.
await probe('interactive submission: prepare succeeds for this tenant and resolves the release template', 'SUCCEEDED', async () => {
  const now = Date.now();
  const prepared = await client.prepare({
    actAs: [admin],
    synchronizerId,
    commands: [{ CreateCommand: { templateId: TEMPLATES.PaymentRequest, createArguments: {
      admin, lp: network.provisioned.lpA.party, fundName: 'probe', callId: 'probe', obligationRef: `PROBE-${runId}`,
      amountDue: '1.0', instrumentId,
      requestedAt: new Date(now).toISOString(), allocateBefore: new Date(now + 86_400_000).toISOString(), settleBefore: new Date(now + 8 * 86_400_000).toISOString(),
    } } }],
  });
  return { preparedTransactionHashPresent: Boolean(prepared.preparedTransactionHash), hashingSchemeVersion: prepared.hashingSchemeVersion, executed: false };
});

// generate-topology only builds onboarding transactions for a public key.
const key = PartyKey.generate();
const topology = { value: null };
await probe('external parties: generate-topology succeeds for this tenant', 'SUCCEEDED', async () => {
  topology.value = await client.request('POST', '/v2/parties/external/generate-topology', {
    json: { synchronizer: synchronizerId, partyHint: `b94ab230-probe-${runId.toLowerCase()}`, publicKey: { format: 'CRYPTO_KEY_FORMAT_DER_X509_SUBJECT_PUBLIC_KEY_INFO', keyData: key.publicKeySpki, keySpec: 'SIGNING_KEY_SPEC_EC_CURVE25519' } },
  });
  return { partyId: topology.value.partyId, topologyTransactions: topology.value.topologyTransactions.length };
});

// The tenant may not allocate it. A refusal is the expected outcome here; the
// party would only exist if the node operator allowed self-allocation.
await probe('external parties: tenant allocate is refused on the shared node', 'REFUSED', async () => {
  if (!topology.value) throw new Error('no topology to allocate');
  const allocated = await client.request('POST', '/v2/parties/external/allocate', {
    json: {
      synchronizer: synchronizerId,
      onboardingTransactions: topology.value.topologyTransactions.map((transaction) => ({ transaction })),
      multiHashSignatures: [key.signature(topology.value.multiHash, topology.value.publicKeyFingerprint)],
      waitForAllocation: true,
      userId: user,
    },
  });
  return { partyId: allocated.partyId };
});

await probe('user management: listing parties is refused for a tenant', 'REFUSED', () => client.request('GET', '/v2/parties?pageSize=1'));

// What each credential may do, as the node itself reports it to that
// credential. Party ids are shortened to their hint.
const rightsOf = async (reader, userId) => summarizeRights(await reader.userRights(userId));
const shown = (rights) => ({ actAs: rights.actAs.map(hint), readAs: rights.readAs.map(hint), executeAs: rights.executeAs.map(hint), other: rights.other });

if (network.seatCredential === 'backend-client') {
  const backend = await ledgerUserOf(network.backendUser);
  await probe('credentials: the demo seats\' backend client acts for the five demo parties and nothing else', 'SUCCEEDED', async () => {
    const rights = await rightsOf(client, backend);
    const problems = judgeBackend(rights, [...demoParties]);
    if (problems.length) throw new Error(`the backend client ${problems.join('; ')}`);
    return { user: backend, ...shown(rights) };
  });
}

const verifierUser = users.verifier;
if (credentialFacts(users).verifierSeparate) {
  const verifierClient = new LedgerClient({ baseUrl: network.apiFor('admin'), userId: verifierUser, label: 'probe-verifier' });
  await probe('credentials: the verifier\'s client only reads, as the fund\'s party', 'SUCCEEDED', async () => {
    const rights = await rightsOf(verifierClient, verifierUser);
    const problems = judgeVerifier(rights, admin);
    if (problems.length) throw new Error(`the verifier ${problems.join('; ')}`);
    return { user: verifierUser, ...shown(rights) };
  });
  // Whether the verifier can submit as the fund is checked by run.mjs, which
  // tries it. Prepare is no test of that: on hackcanton-01 a user that can only
  // read as a party may still prepare a transaction for it (probe 20261006T131751Z).
}

const facts = credentialFacts(users);
const result = {
  runId,
  network: network.name,
  authMode: network.authMode,
  seatCredential: network.seatCredential,
  // From the ledger users the tokens belong to, as checked above.
  users,
  seatsSeparate: facts.seatsSeparate,
  verifierSeparate: facts.verifierSeparate,
  ledgerApi: network.apiFor('admin'),
  commit: execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD']).toString().trim(),
  packageId,
  probes,
  asExpected: probes.every((p) => p.outcome === p.expectation),
};
writeFileSync(join(OUT, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ runId, asExpected: result.asExpected, out: OUT }, null, 2));
