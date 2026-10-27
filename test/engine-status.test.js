// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { engineStatus } from '../src/engine-status.js';

test('status distinguishes missing configuration, disconnected GitHub, and a usable connection', async () => {
  assert.equal((await engineStatus({})).status, 'configuration_required');
  for (const sourceConfigured of [false, true]) {
    const result = await engineStatus({ HEDGELING_ENGINE_URL: 'https://engine.example.invalid', HEDGELING_ENGINE_TOKEN: 'synthetic-only' },
      { fetchImpl: async url => Response.json(String(url).includes('capabilities')
        ? { sourceConfigured, operations: sourceConfigured ? ['extract'] : [] }
        : { total: sourceConfigured ? 1 : 0, connections: [{ id: 'never-render-this' }] }) });
    assert.equal(result.status, sourceConfigured ? 'ready' : 'github_setup_required');
    assert(!JSON.stringify(result).includes('synthetic-only'));
    assert(!JSON.stringify(result).includes('example.invalid'));
    assert(!JSON.stringify(result).includes('never-render-this'));
  }
});
