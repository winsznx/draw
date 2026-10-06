import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

// deploy/draw-health.sh against a stand-in API, with a stand-in systemctl that
// only records what it was asked to do. WATCHDOG_SHELL=/bin/dash runs it under
// the shell Ubuntu uses for sh.
const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '../../deploy/draw-health.sh');
const TOKEN = 'watchdog-token';

const healthBody = ({ ledger = true, state = true } = {}) => JSON.stringify({
  ok: ledger && state,
  network: 'DevNet',
  checks: { ledger: ledger ? { ok: true } : { ok: false, reason: 'HTTP 503' }, state: state ? { ok: true } : { ok: false, reason: 'Unexpected token' } },
});

async function setup(t) {
  const dir = mkdtempSync(join(tmpdir(), 'draw-watchdog-'));
  const calls = join(dir, 'systemctl.log');
  writeFileSync(join(dir, 'systemctl'), `#!/bin/sh\necho "$@" >> "${calls}"\n`);
  chmodSync(join(dir, 'systemctl'), 0o755);
  const api = { status: 200, body: healthBody() };
  const server = createServer((req, res) => {
    const allowed = req.headers['x-draw-service'] === TOKEN;
    res.writeHead(allowed ? api.status : 403, { 'content-type': 'application/json' });
    res.end(allowed ? api.body : '{"error":"Use the DRAW site."}');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const run = (env = {}, path = `${dir}:${process.env.PATH}`) => new Promise((resolve) => {
    execFile(process.env.WATCHDOG_SHELL ?? 'sh', [SCRIPT], {
      env: { PATH: path, STATE_DIRECTORY: join(dir, 'state'), DRAW_HEALTH_URL: `http://127.0.0.1:${server.address().port}/api/health`, DRAW_SERVICE_TOKEN: TOKEN, ...env },
    }, (error, stdout, stderr) => resolve({ code: error ? error.code : 0, stdout, stderr }));
  });
  const restarts = () => (existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n') : []);
  const failures = () => readFileSync(join(dir, 'state', 'failures'), 'utf8').trim();
  return { api, run, restarts, failures, dir };
}

test('a healthy API resets the count and nothing restarts', async (t) => {
  const { api, run, restarts, failures } = await setup(t);
  api.status = 503;
  api.body = healthBody({ state: false });
  await run();
  api.status = 200;
  api.body = healthBody();
  assert.equal((await run()).code, 0);
  assert.equal(failures(), '0');
  assert.deepEqual(restarts(), []);
});

test('an API that cannot read its state fails twice, restarts once, then a cooldown holds further restarts', async (t) => {
  const { api, run, restarts, failures } = await setup(t);
  api.status = 503;
  api.body = healthBody({ state: false });
  const first = await run();
  assert.match(first.stdout, /cannot read its state file/);
  assert.equal(failures(), '1');
  assert.deepEqual(restarts(), []);
  const second = await run();
  assert.match(second.stdout, /restarting draw.service/);
  assert.deepEqual(restarts(), ['restart draw.service']);
  assert.equal(failures(), '0');
  await run();
  const held = await run();
  assert.match(held.stdout, /waiting before another restart/);
  assert.deepEqual(restarts(), ['restart draw.service']);
});

test('with the cooldown over, a later pair of failures restarts again', async (t) => {
  const { api, run, restarts } = await setup(t);
  api.status = 503;
  api.body = healthBody({ state: false });
  for (let i = 0; i < 4; i += 1) await run({ DRAW_HEALTH_COOLDOWN_SECONDS: '0' });
  assert.deepEqual(restarts(), ['restart draw.service', 'restart draw.service']);
});

test('an API that does not answer counts as a failure', async (t) => {
  const { run, restarts } = await setup(t);
  const gone = { DRAW_HEALTH_URL: 'http://127.0.0.1:9/api/health' };
  await run(gone);
  const second = await run(gone);
  assert.match(second.stdout, /no answer within 15 seconds/);
  assert.deepEqual(restarts(), ['restart draw.service']);
});

test('a ledger that does not answer is logged and never restarts the API', async (t) => {
  const { api, run, restarts, failures } = await setup(t);
  api.status = 503;
  api.body = healthBody({ ledger: false });
  for (let i = 0; i < 4; i += 1) {
    const result = await run({ DRAW_HEALTH_COOLDOWN_SECONDS: '0' });
    assert.equal(result.code, 0);
    assert.match(result.stdout, /answered HTTP 503: .*"ledger":\{"ok":false.*Not restarting/);
  }
  assert.equal(failures(), '0');
  assert.deepEqual(restarts(), []);
});

test('a refused token is reported as a setup problem and never restarts the app', async (t) => {
  const { run, restarts, dir } = await setup(t);
  const first = await run({ DRAW_SERVICE_TOKEN: 'wrong' });
  await run({ DRAW_SERVICE_TOKEN: 'wrong' });
  assert.equal(first.code, 1);
  assert.match(first.stderr, /403/);
  assert.deepEqual(restarts(), []);
  assert.equal(existsSync(join(dir, 'state', 'failures')), false);
});

test('the service token reaches curl on stdin, never on its command line', async (t) => {
  const { run, dir } = await setup(t);
  // A stand-in curl that records its arguments and what it read on stdin.
  const bin = join(dir, 'fake-bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'curl'), `#!/bin/sh\necho "$@" > "${dir}/curl-args"\ncat > "${dir}/curl-stdin"\nprintf 200\n`);
  chmodSync(join(bin, 'curl'), 0o755);
  assert.equal((await run({}, `${bin}:${dir}:${process.env.PATH}`)).code, 0);
  assert.equal(readFileSync(join(dir, 'curl-args'), 'utf8').includes(TOKEN), false);
  assert.match(readFileSync(join(dir, 'curl-args'), 'utf8'), /--header @-/);
  assert.equal(readFileSync(join(dir, 'curl-stdin'), 'utf8'), `x-draw-service: ${TOKEN}\n`);
});
