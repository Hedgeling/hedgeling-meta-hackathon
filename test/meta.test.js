// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { metaConfiguration, metaRequest, normalizeMetaResponse, generateMetaResponse } from '../src/meta.js';
import { runExample, fixtureTransport } from '../examples/tool-loop.js';

const config = { endpoint: 'https://meta.example.invalid/v1/responses', model: 'test-model', key: 'test-only' };
const output = [
  { type: 'reasoning', encrypted_content: 'opaque-state', summary: [] },
  { type: 'function_call', call_id: 'call-1', name: 'read_synthetic_catalog', arguments: '{}' },
];

test('Meta replay keeps opaque state and tool correlation without displaying reasoning', () => {
  const normalized = normalizeMetaResponse({ status: 'completed', output,
    usage: { input_tokens: 7, output_tokens: 11, total_tokens: 18 } });
  const message = normalized.candidates[0].content;
  assert.equal(normalized.usageMetadata.totalTokenCount, 18);
  assert.equal(JSON.stringify(message.parts).includes('opaque-state'), false);
  const request = metaRequest({ model: config.model, tools: [], history: [message,
    { role: 'user', confirmation: true, parts: [{ functionResponse: { id: 'call-1', name: 'read_synthetic_catalog', response: { strings: [] } } }] },
  ] });
  assert.deepEqual(request.input.slice(0, 2), output);
  assert.equal(request.input[2].call_id, 'call-1');
  assert.equal(request.store, false);
  assert.equal(JSON.stringify(request).includes('confirmation'), false);
});

test('only displayable legacy text crosses providers and tool results must match a call', () => {
  const request = metaRequest({ model: config.model, tools: [], history: [
    { role: 'model', parts: [{ text: 'hidden', thought: true }, { functionCall: { name: 'read', args: {} }, thoughtSignature: 'private-state' }] },
    { role: 'user', parts: [{ functionResponse: { name: 'read', response: {} } }] },
  ] });
  assert.equal(request.input[0].call_id, request.input[1].call_id);
  assert(!JSON.stringify(request).includes('hidden'));
  assert(!JSON.stringify(request).includes('private-state'));
  assert.throws(() => metaRequest({ model: config.model, tools: [], history: [
    { role: 'user', parts: [{ functionResponse: { name: 'unknown', response: {} } }] },
  ] }), /cannot be resumed/);
});

test('partial, duplicate and malformed calls are rejected before tools can execute', () => {
  for (const response of [
    { status: 'incomplete', output },
    { status: 'completed', output: [output[1], output[1]] },
    { status: 'completed', output: [{ ...output[1], arguments: '[]' }] },
    { status: 'completed', output: [{ ...output[1], arguments: 'invalid' }] },
    { status: 'completed', output: [output[0]] },
  ]) assert.throws(() => normalizeMetaResponse(response));
  assert.equal(normalizeMetaResponse({ status: 'completed', output, usage: { total_tokens: -1 } }).usageMetadata, undefined);
});

test('configuration is explicit; a different provider key cannot serve as fallback', () => {
  const env = { HEDGELING_META_RESPONSES_URL: config.endpoint, HEDGELING_AGENT_META_MODEL: config.model, GEMINI_API_KEY: 'unused' };
  assert.throws(() => metaConfiguration(env), /required/);
  assert.deepEqual(metaConfiguration({ ...env, HEDGELING_META_API_KEY: config.key }), config);
  for (const endpoint of ['', 'http://example.invalid', 'https://user:pass@example.invalid', 'https://example.invalid/?token=x']) {
    assert.throws(() => metaConfiguration({ ...env, HEDGELING_META_API_KEY: config.key, HEDGELING_META_RESPONSES_URL: endpoint }));
  }
});

test('fixture completes the same adapter/tool loop without network or a model key', async () => {
  const result = await runExample({ config, fetchImpl: fixtureTransport() });
  assert.equal(result.toolCalls, 1);
  assert.match(result.text, /synthetic.*2 strings/);
});

test('live transport uses only configured endpoint and keeps key out of model input', async () => {
  const result = await generateMetaResponse({ config, body: { model: config.model, input: [] },
    fetchImpl: async (url, options) => {
      assert.equal(String(url), config.endpoint);
      assert.equal(options.headers.authorization, `Bearer ${config.key}`);
      assert.equal(options.redirect, 'error');
      assert(!options.body.includes(config.key));
      return Response.json({ status: 'completed', output });
    } });
  assert.equal(result.candidates[0].content.parts[0].functionCall.id, 'call-1');
});
