// SPDX-License-Identifier: Apache-2.0
import { metaConfiguration } from '../src/meta.js';
import { runExample, fixtureTransport } from './tool-loop.js';

try {
  const mode = process.argv[2];
  if (!['--fixture', '--live'].includes(mode)) throw new Error('Choose --fixture or --live explicitly.');
  const fixture = mode === '--fixture';
  console.log(fixture ? 'FIXTURE: no model calls and no extraction. Synthetic catalog only.' : 'LIVE META: real model calls; synthetic catalog only; provider usage may be billed.');
  const config = fixture ? { endpoint: 'https://meta.example.invalid/v1/responses', key: 'fixture-only', model: 'fixture' } : metaConfiguration();
  const result = await runExample({ config, ...(fixture ? { fetchImpl: fixtureTransport() } : {}) });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
