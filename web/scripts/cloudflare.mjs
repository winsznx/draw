#!/usr/bin/env node
/**
 * Builds the web app as a Cloudflare Worker with OpenNext and deploys it.
 *
 *   node scripts/cloudflare.mjs build      build, then prove no secret reached the output
 *   node scripts/cloudflare.mjs preview    build, then serve the worker locally in workerd
 *   node scripts/cloudflare.mjs deploy     build, deploy, then store DRAW_SERVICE_TOKEN as a worker secret
 *
 * The repository's .env holds the ledger credentials, and OpenNext copies every
 * .env value it finds into the worker. So the build runs with every non-public
 * name blanked, the copied env module is emptied, and the whole output is
 * scanned for each secret value before anything is uploaded. DRAW_API_URL comes
 * from wrangler.jsonc. Prints names only, never values.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.join(WEB, '..');
const OUTPUT = path.join(WEB, '.open-next');
const NEXT_ENV_FILE = path.join(OUTPUT, 'cloudflare', 'next-env.mjs');
const SERVER_SECRETS = ['DRAW_SERVICE_TOKEN'];
/** Non-public names whose values are public anyway, so the leak scan skips them. */
const PUBLIC_CONFIG = new Set(['DRAW_API_URL', 'DRAW_NETWORK', 'LEDGER_AUTH_MODE', 'DRAW_JSON_API', 'OAUTH_TOKEN_URL', 'OAUTH_CLIENT_ID', 'SCAN_PROXY_URL', 'REGISTRY_URL']);
/** Shorter values are too likely to occur by chance in a megabyte of minified code. */
const MIN_SCANNED_LENGTH = 12;

function fail(lines) {
  for (const line of lines) console.error(`cloudflare: ${line}`);
  process.exit(1);
}

function readEnvFiles() {
  const merged = {};
  for (const name of ['.env', '.env.production', '.env.local', '.env.production.local']) {
    for (const dir of [ROOT, WEB]) {
      const file = path.join(dir, name);
      if (existsSync(file) && statSync(file).isFile()) Object.assign(merged, parseEnv(readFileSync(file, 'utf8')));
    }
  }
  return merged;
}

function secretValues(env) {
  return Object.entries(env)
    .filter(([name, value]) => !name.startsWith('NEXT_PUBLIC_') && !PUBLIC_CONFIG.has(name) && value.trim().length >= MIN_SCANNED_LENGTH)
    .map(([name, value]) => [name, value.trim()]);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: WEB, stdio: 'inherit', ...options });
  if (result.status !== 0) fail([`${command} ${args.join(' ')} exited with ${result.status ?? result.signal}`]);
}

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : entry.isFile() ? [full] : [];
  });
}

function build(env) {
  const buildEnv = { ...process.env };
  for (const name of Object.keys(env)) if (!name.startsWith('NEXT_PUBLIC_')) buildEnv[name] = '';
  run('npx', ['opennextjs-cloudflare', 'build'], { env: buildEnv });

  if (!existsSync(NEXT_ENV_FILE)) fail([`${path.relative(WEB, NEXT_ENV_FILE)} is missing; OpenNext's output layout changed`]);
  writeFileSync(NEXT_ENV_FILE, 'export const production = {};\nexport const development = {};\nexport const test = {};\n');

  const secrets = secretValues(env).map(([name, secret]) => [name, Buffer.from(secret)]);
  const leaks = [];
  for (const file of filesUnder(OUTPUT)) {
    const bytes = readFileSync(file);
    for (const [name, secret] of secrets) if (bytes.includes(secret)) leaks.push(`the value of ${name} is in ${path.relative(WEB, file)}`);
  }
  if (leaks.length > 0) fail(['refusing to continue, a secret reached the build output:', ...leaks]);
  console.log(`cloudflare: build clean, ${secrets.length} secret values absent from ${path.relative(WEB, OUTPUT)}`);
}

function putSecrets(env) {
  const payload = JSON.stringify(Object.fromEntries(SERVER_SECRETS.map((name) => [name, env[name].trim()])));
  run('npx', ['wrangler', 'secret', 'bulk'], { input: payload, stdio: ['pipe', 'inherit', 'inherit'] });
}

const [command] = process.argv.slice(2);
if (!['build', 'preview', 'deploy'].includes(command)) fail(['usage: node scripts/cloudflare.mjs build|preview|deploy']);
const env = readEnvFiles();
if (command === 'deploy') {
  const missing = SERVER_SECRETS.filter((name) => !env[name]?.trim());
  if (missing.length) fail([`missing in .env: ${missing.join(', ')}`]);
}

build(env);
if (command === 'preview') run('npx', ['opennextjs-cloudflare', 'preview']);
if (command === 'deploy') {
  run('npx', ['opennextjs-cloudflare', 'deploy']);
  putSecrets(env);
}
