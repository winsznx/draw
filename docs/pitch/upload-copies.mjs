// Copies the six platform materials with every repository link made absolute,
// so the links still work after the files are uploaded outside the repo.
// Usage: node docs/pitch/upload-copies.mjs https://github.com/<owner>/<repo> <out-dir> [branch]
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const materials = path.join(here, 'materials');
const [repo, out, branch = 'main'] = process.argv.slice(2);
if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(repo ?? '') || !out) {
  console.error('Usage: node docs/pitch/upload-copies.mjs https://github.com/<owner>/<repo> <out-dir> [branch]');
  process.exit(1);
}

function absolute(file, target) {
  if (/^([a-z]+:|#)/i.test(target)) return target;
  const [relative, anchor] = target.split('#');
  const resolved = path.resolve(path.dirname(file), relative);
  if (!existsSync(resolved) || !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`${path.basename(file)} links to ${target}, which is not a file in the repository`);
  }
  const repoPath = path.relative(root, resolved).split(path.sep).join('/');
  return `${repo}/blob/${branch}/${repoPath}${anchor ? `#${anchor}` : ''}`;
}

mkdirSync(out, { recursive: true });
for (const name of readdirSync(materials).filter((entry) => entry.endsWith('.md'))) {
  const file = path.join(materials, name);
  const text = readFileSync(file, 'utf8').replace(/\]\(([^)\s]+)\)/g, (_, target) => `](${absolute(file, target)})`);
  writeFileSync(path.join(out, name), text);
  console.log(`${name} written to ${path.join(out, name)}`);
}
