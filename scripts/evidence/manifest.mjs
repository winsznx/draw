// Builds evidence/manifest.json: one entry per evidence run, with provenance,
// a sha256 for every file the run wrote, and the claims in claims.yaml that
// cite it. It indexes evidence; it never edits a run's own files.
//   node scripts/evidence/manifest.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '../..');
const EVIDENCE = join(ROOT, 'evidence');

const COMMANDS = {
  daml_core: { test: 'scripts/gates/daml_core.sh', verifier: 'dpm test (Daml Script) in contracts/tests' },
  mutation: { test: 'scripts/gates/mutation_check.sh', verifier: 'dpm test against each mutated copy' },
  runs: { test: 'node scripts/demo/run.mjs', verifier: 'scripts/demo/lib/verifier.mjs, reading as the ledger user each run records in verifierUser' },
  campaign: { test: 'node scripts/eval/campaign.mjs', verifier: 'reference model in scripts/eval/campaign.mjs plus the read-only verifier' },
  ablation: { test: 'node scripts/eval/ablation.mjs', verifier: 'same attacks against node:sqlite and against the ledger' },
  browser: { test: 'npm run e2e in web (app/web for runs before 2026-10-05)', verifier: 'Playwright against the running app and ledger' },
  app: { test: 'node app/server.mjs (actions taken in the UI)', verifier: 'scripts/demo/lib/verifier.mjs' },
  probes: { test: 'node scripts/demo/probe.mjs', verifier: 'each probe states the outcome it expects, and the run compares' },
};

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

// claims.yaml is flat enough to read line by line: an `- id:` starts a claim,
// and any line mentioning evidence/ belongs to the current claim.
function claimsByEvidencePath() {
  const index = new Map();
  let current = null;
  for (const line of readFileSync(join(ROOT, 'claims.yaml'), 'utf8').split('\n')) {
    const id = line.match(/^\s*-\s*id:\s*(\S+)/);
    if (id) current = id[1];
    for (const path of line.match(/evidence\/[\w./-]+/g) ?? []) {
      const key = path.replace(/\/[^/]*\.[a-z]+$/, '');
      if (!index.has(key)) index.set(key, new Set());
      index.get(key).add(current);
    }
  }
  return index;
}

function damlSdkVersion() {
  return readFileSync(join(ROOT, 'contracts/daml/daml.yaml'), 'utf8').match(/^sdk-version:\s*(\S+)/m)?.[1];
}

function tokenStandardPackages() {
  const dir = join(ROOT, 'contracts/daml/dars');
  return readdirSync(dir).filter((f) => f.endsWith('.dar')).map((f) => ({ file: f, sha256: sha256(join(dir, f)) }));
}

function updateRefs(runDir, result) {
  const refs = [];
  for (const file of readdirSync(runDir).filter((f) => /^receipt-.*\.json$/.test(f))) {
    const receipt = readJson(join(runDir, file));
    if (receipt?.claimedUpdateId) refs.push({ file, updateId: receipt.claimedUpdateId, allocationCid: receipt.allocationCid, verdict: receipt.verdict });
  }
  if (result?.updateId) refs.push({ file: 'result.json', updateId: result.updateId });
  return refs;
}

const claims = claimsByEvidencePath();
const runs = [];
for (const environment of readdirSync(EVIDENCE).filter((d) => statSync(join(EVIDENCE, d)).isDirectory())) {
  for (const kind of readdirSync(join(EVIDENCE, environment)).filter((d) => statSync(join(EVIDENCE, environment, d)).isDirectory())) {
    for (const runId of readdirSync(join(EVIDENCE, environment, kind)).filter((d) => statSync(join(EVIDENCE, environment, kind, d)).isDirectory()).sort()) {
      const dir = join(EVIDENCE, environment, kind, runId);
      const path = relative(ROOT, dir);
      const result = readJson(join(dir, 'result.json')) ?? readJson(join(dir, 'report.json'));
      const supported = new Set([...(claims.get(path) ?? []), ...(claims.get(relative(ROOT, join(EVIDENCE, environment, kind))) ?? [])]);
      runs.push({
        kind,
        environment: result?.environment ?? environment,
        runId,
        path,
        commit: result?.commit ?? null,
        verdict: result?.verdict
          ?? (result?.gates ? Object.entries(result.gates).map(([g, v]) => `${g}=${v}`).join(' ') : null)
          // Probe runs compare each outcome with the one they expected.
          ?? (typeof result?.asExpected === 'boolean' ? (result.asExpected ? 'AS_EXPECTED' : 'NOT_AS_EXPECTED') : null),
        damlSdk: damlSdkVersion(),
        canton: result?.canton ?? null,
        packageIds: [result?.packageId].filter(Boolean),
        instrument: result?.instrument ?? null,
        partyAliases: result?.parties ? Object.keys(result.parties) : null,
        seed: result?.seed ?? null,
        testCommand: COMMANDS[kind]?.test ?? null,
        verifierCommand: COMMANDS[kind]?.verifier ?? null,
        updateRefs: updateRefs(dir, result),
        files: filesUnder(dir).map((file) => ({ path: relative(dir, file), sha256: sha256(file) })),
        claims: [...supported].sort(),
      });
    }
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  generatedAtCommit: execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD']).toString().trim(),
  generator: 'node scripts/evidence/manifest.mjs',
  tokenStandardPackages: tokenStandardPackages(),
  runs,
};
writeFileSync(join(EVIDENCE, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${runs.length} runs indexed. ${runs.filter((r) => r.claims.length).length} support at least one claim.`);
