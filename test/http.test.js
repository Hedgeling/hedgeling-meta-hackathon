// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { requestJson, serverUrl } from '../src/http.js';
import { engineReader } from '../src/engine-client.js';

test('local HTTP requires explicit opt-in and only permits exact IPv4 loopback',()=>{
  assert.throws(()=>serverUrl('http://127.0.0.1:4319','engine'));
  assert.equal(serverUrl('http://127.0.0.1:4319','engine',{allowLoopbackHttp:true}).hostname,'127.0.0.1');
  for(const url of ['http://engine.example','http://127.0.0.1.example','http://0.0.0.0:4319','http://user:secret@127.0.0.1:4319','http://127.0.0.1:4319?token=value'])assert.throws(()=>serverUrl(url,'engine',{allowLoopbackHttp:true}));
});

test('upstream bodies, network details, and oversized responses do not leak', async () => {
  for (const response of [new Response('confidential-provider-detail', { status: 401 }),
    new Response('invalid-json'), new Response('x'.repeat(524289))]) {
    await assert.rejects(requestJson('https://example.invalid', { token: 'test-only', fetchImpl: async () => response }),
      error => error.status === 502 && !error.message.includes('confidential-provider-detail'));
  }
  await assert.rejects(requestJson('https://example.invalid', { token: 'test-only', fetchImpl: async () => { throw new Error('secret-host-and-credential'); } }),
    error => !error.message.includes('secret-host-and-credential'));
});

test('cancelled calls are never dispatched', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(requestJson('https://example.invalid', { token: 'test-only', signal: controller.signal,
    fetchImpl: () => assert.fail('Must not send cancelled requests') }), { name: 'AbortError' });
});

test('engine verification keeps the configured base path and supports explicit pagination', async () => {
  const urls = [];
  const reader = engineReader({ url: 'https://engine.example.invalid/service', token: 'test-only', fetchImpl: async (url, options) => {
    urls.push(String(url));
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.authorization, 'Bearer test-only');
    return Response.json({ connections: [], total: 101, nextOffset: 100 });
  } });
  await reader.capabilities();
  await reader.connections({ limit: 100, offset: 0 });
  await reader.connections({ limit: 100, offset: 100 });
  assert.deepEqual(urls, ['https://engine.example.invalid/service/v1/capabilities',
    'https://engine.example.invalid/service/v1/connections?limit=100&offset=0',
    'https://engine.example.invalid/service/v1/connections?limit=100&offset=100']);
  assert.throws(() => reader.connections({ limit: 101 }));
  assert.throws(() => reader.connections({ offset: -1 }));
  assert.equal(reader.createJob, undefined);
  assert.throws(() => engineReader({ url: '', token: 'test-only' }));
});
