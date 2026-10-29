// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, lstatSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const manifest = JSON.parse(readFileSync('docs/provenance.json'));
const baseline = new Set(JSON.parse(readFileSync('docs/excluded-baseline-sha256.json')).sha256);
const errors = [];
const fail = (file, reason) => errors.push(`${file}: ${reason}`);
for (const file of new Set(files)) {
  if (!lstatSync(file).isFile()) { fail(file, 'only ordinary files are allowed'); continue; }
  const content = readFileSync(file);
  const digest = createHash('sha256').update(content).digest('hex');
  const entry = manifest.files[file];
  if (!entry) fail(file, 'missing provenance record');
  else if (file !== 'docs/provenance.json' && entry.sha256 !== digest) fail(file, 'content changed; review and update provenance hash');
  if (baseline.has(digest)) fail(file, 'matches an excluded pre-event file');
  if (/(^|\/)(node_modules|packages|injector|runtime|\.hedgeling)(\/|$)|\.(pem|key|tgz|zip|log)$|(^|\/)\.env(?!\.example$)/.test(file)) fail(file, 'excluded artifact path');
  const text = content.toString('utf8');
  // Build signatures in pieces so the scanner does not flag its own source.
  const signatures = [new RegExp('-----BEGIN ' + '(?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    new RegExp('(?:AKIA|ASIA)' + '[A-Z0-9]{16}'), new RegExp('gh[pousr]_' + '[A-Za-z0-9]{30,}'),
    new RegExp('github_pat_' + '[A-Za-z0-9_]{40,}'),
    new RegExp('\\d{12}\\.dkr\\.ecr\\.[a-z0-9-]+\\.amazonaws\\.com'),
    new RegExp('[a-z0-9-]+\\.[a-z0-9-]+\\.[a-z0-9-]+\\.rds\\.amazonaws\\.com'),
    new RegExp('arn:aws:[^\\s"\']*:' + '\\d{12}:'),
  ];
  if (signatures.some(pattern => pattern.test(text))) fail(file, 'possible secret or live infrastructure identifier');
  if (/\.(js|mjs)$/.test(file)) {
    try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); }
    catch { fail(file, 'JavaScript syntax check failed'); }
  }
}
for (const file of Object.keys(manifest.files)) if (!files.includes(file)) fail(file, 'provenance points to a missing file');
const pkg = JSON.parse(readFileSync('package.json'));
if (pkg.license !== 'Apache-2.0' || !pkg.private) fail('package.json', 'license/publishing boundary changed');
const reviewedDependencies = { '@xmldom/xmldom': '0.9.12', fflate: '0.8.3', 'pdfjs-dist': '6.4.299' };
if (JSON.stringify(Object.entries(pkg.dependencies || {}).sort()) !== JSON.stringify(Object.entries(reviewedDependencies).sort())
  || Object.keys(pkg.devDependencies || {}).length) fail('package.json', 'dependencies differ from the reviewed document-parser inventory; review licenses/provenance before updating');
if (readFileSync('LICENSE', 'utf8').indexOf('Version 2.0, January 2004') < 0) fail('LICENSE', 'expected Apache-2.0 text');
try {
  const roots = execFileSync('git', ['rev-list', '--max-parents=0', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim().split('\n');
  if (roots.length !== 1) fail('history', 'expected one fresh history root');
  if (['589a444c3856319b09f19c888194723fec77a363', 'df0f37dd1de1ef8fe6a4f23e7ae9e0562ba12ac1'].some(commit => {
    try { execFileSync('git', ['merge-base', '--is-ancestor', commit, 'HEAD'], { stdio: 'ignore' }); return true; } catch { return false; }
  })) fail('history', 'pre-event product history was imported');
} catch { /* An initial uncommitted repository has no HEAD yet. */ }
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Repository checks passed for ${new Set(files).size} files. Human provenance review remains required.`);
