import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

// claims.yaml is the ceiling for every public word about DRAW. These checks
// keep it honest against the evidence it cites: every cited file exists, a
// LocalNet claim never leans on DevNet evidence and the other way round, and
// no cited result records a failure.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const EVIDENCE_PATH = /evidence\/[\w./-]+[\w/]/g;

// claims.yaml is flat: `- id:` starts a claim, `evidence:` holds a list
// (inline or one item per line), and the other keys are single lines.
function readClaims() {
  const claims = [];
  let current = null;
  let inEvidence = false;
  for (const line of readFileSync(join(ROOT, 'claims.yaml'), 'utf8').split('\n')) {
    const id = line.match(/^\s*-\s*id:\s*(\S+)/);
    if (id) {
      current = { id: id[1], status: null, evidence: [], mentions: [], text: '' };
      claims.push(current);
      inEvidence = false;
      continue;
    }
    if (!current) continue;
    const key = line.match(/^\s{4}(\w+):\s*(.*)$/);
    if (key) {
      const [, name, value] = key;
      inEvidence = name === 'evidence';
      if (name === 'status') current.status = value.trim();
      if (name === 'text') current.text = value;
      if (inEvidence) current.evidence.push(...(value.match(EVIDENCE_PATH) ?? []));
      else current.mentions.push(...(value.match(EVIDENCE_PATH) ?? []));
      continue;
    }
    if (inEvidence) current.evidence.push(...(line.match(EVIDENCE_PATH) ?? []));
  }
  return claims;
}

const claims = readClaims();
const environmentOf = (path) => path.split('/')[1];

test('claims.yaml parses into claims with a status each', () => {
  assert.ok(claims.length >= 10);
  for (const claim of claims) assert.ok(claim.status, `${claim.id} has no status`);
});

test('every evidence path a claim cites exists', () => {
  const missing = claims.flatMap((c) => [...c.evidence, ...c.mentions].filter((path) => !existsSync(join(ROOT, path))).map((path) => `${c.id}: ${path}`));
  assert.deepEqual(missing, []);
});

test('LocalNet and DevNet claims stay separate', () => {
  for (const claim of claims) {
    const environments = new Set(claim.evidence.map(environmentOf));
    if (claim.status === 'local_verified') assert.ok(!environments.has('devnet'), `${claim.id} is local_verified but cites DevNet evidence`);
    if (claim.status === 'devnet_verified') assert.ok(environments.has('devnet'), `${claim.id} is devnet_verified but cites no DevNet evidence`);
  }
});

test('no cited result records a failure', () => {
  const failures = [];
  for (const claim of claims) {
    for (const path of claim.evidence) {
      const file = path.endsWith('.json') ? join(ROOT, path) : join(ROOT, path, 'result.json');
      if (!file.endsWith('result.json') || !existsSync(file)) continue;
      const result = JSON.parse(readFileSync(file, 'utf8'));
      if (result.verdict !== undefined && !['PASS', 'TREATMENT_STOPS_ALL'].includes(result.verdict)) failures.push(`${claim.id}: ${path} verdict ${result.verdict}`);
      for (const [gate, verdict] of Object.entries(result.gates ?? {})) if (verdict !== 'PASS') failures.push(`${claim.id}: ${path} ${gate} ${verdict}`);
      if (result.asExpected === false) failures.push(`${claim.id}: ${path} not as expected`);
    }
  }
  assert.deepEqual(failures, []);
});

test('a verified claim cites evidence, and a blocked one cites none', () => {
  for (const claim of claims) {
    if (claim.status.endsWith('_verified')) assert.ok(claim.evidence.length > 0, `${claim.id} cites no evidence`);
    if (claim.status === 'blocked') assert.deepEqual(claim.evidence, [], `${claim.id} is blocked but cites evidence`);
  }
});
