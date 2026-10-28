// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const target = process.argv[2];
if (!target || !path.isAbsolute(target)) throw new Error('Provide the absolute path to the existing console package.');
const pkg = JSON.parse(fs.readFileSync(path.join(target, 'package.json')));
if (pkg.name !== '@hedgeling/web-console') throw new Error('Target must be the existing web-console package.');
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim());
const output = path.join(target, 'src/hackathon-engine');
fs.mkdirSync(output, { recursive: true });
const origins = [];
for (const source of ['src/errors.js', 'src/http.js', 'src/engine-client.js', 'src/engine-status.js', 'src/engine-operations.js',
  'src/chat-limits.js', 'src/library.js', 'src/library-actions.js', 'src/tuning-config.js', 'src/project-locales.js', 'src/project-locales-actions.js', 'src/meta-translation.js', 'src/extraction-actions.js', 'src/extraction-catalog.js', 'src/extraction-workflow.js', 'LICENSE', 'NOTICE']) {
  const contents = fs.readFileSync(source);
  const destination = path.basename(source);
  fs.writeFileSync(path.join(output, destination), contents);
  origins.push({ source, destination, sha256: createHash('sha256').update(contents).digest('hex') });
}
for (const [source, destination] of [
  ['src/chat-limits.js', 'src/public/chat-limits.js'],
  ['src/library-actions.js', '../api-contract/library-actions.js'],
  ['contracts/202610272300_library_workflow.sql', 'db/migrations/202610272300_library_workflow.sql'],
  ['ui/library.js', 'src/public/library.js'],
  ['ui/library.css', 'src/public/library.css'],
  ['src/project-locales-actions.js', '../api-contract/project-locales-actions.js'],
  ['ui/project-locales.js', 'src/public/project-locales.js'],
  ['ui/project-locales.css', 'src/public/project-locales.css'],
  ['src/extraction-actions.js', '../api-contract/extraction-actions.js'],
  ['contracts/202610272100_extraction_tuning.sql', 'db/migrations/202610272100_extraction_tuning.sql'],
  ['contracts/202610271200_extraction_workflow.sql', 'db/migrations/202610271200_extraction_workflow.sql'],
  ['contracts/202610271600_meta_byok.sql', 'db/migrations/202610271600_meta_byok.sql'],
  ['ui/chat-markdown.js', 'src/public/chat-markdown.js'],
  ['ui/extraction.js', 'src/public/extraction.js'],
  ['ui/extraction.css', 'src/public/extraction.css'],
]) {
  const contents = fs.readFileSync(source);
  fs.writeFileSync(path.resolve(target, destination), contents);
  origins.push({ source, destination: path.relative(output, path.resolve(target, destination)), sha256: createHash('sha256').update(contents).digest('hex') });
}
fs.writeFileSync(path.join(output, 'provenance.json'), JSON.stringify({ repository: 'Hedgeling/hedgeling-meta-hackathon', revision, dirty, license: 'Apache-2.0', files: origins }, null, 2)+'\n');
console.log('Vendored the event-only server integration with its license and provenance.');
