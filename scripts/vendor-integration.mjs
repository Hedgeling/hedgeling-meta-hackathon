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
const output = path.join(target, 'src/hackathon-engine');
fs.mkdirSync(output, { recursive: true });
const origins = [];
for (const source of ['src/errors.js', 'src/http.js', 'src/engine-client.js', 'src/engine-status.js', 'LICENSE', 'NOTICE']) {
  const contents = fs.readFileSync(source);
  const destination = path.basename(source);
  fs.writeFileSync(path.join(output, destination), contents);
  origins.push({ source, destination, sha256: createHash('sha256').update(contents).digest('hex') });
}
fs.writeFileSync(path.join(output, 'provenance.json'), JSON.stringify({ repository: 'Hedgeling/hedgeling-meta-hackathon', revision, license: 'Apache-2.0', files: origins }, null, 2)+'\n');
console.log('Vendored the event-only server integration with its license and provenance.');
