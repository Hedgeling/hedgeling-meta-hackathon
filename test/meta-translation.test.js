// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { metaTranslationConfiguration, validateMetaKey, generateMetaText } from '../src/meta-translation.js';

const config = { endpoint: 'https://provider.example.invalid/v1/responses', model: 'configured-model' };
const apiKey = 'synthetic-key-for-testing-only';
test('Meta BYOK requires explicit server configuration and validates without inference', async () => {
  assert.throws(() => metaTranslationConfiguration({}), { status: 503 });
  for (const endpoint of ['http://provider.example.invalid/v1/responses', config.endpoint + '?key=secret', config.endpoint + '/other']) {
    assert.throws(() => metaTranslationConfiguration({ HEDGELING_META_RESPONSES_URL: endpoint, HEDGELING_META_TRANSLATION_MODEL: config.model }));
  }
  const checked = await validateMetaKey(apiKey, config, async (url, options) => {
    assert.equal(url.href, 'https://provider.example.invalid/v1/models/configured-model');
    assert.equal(options.body, undefined); assert.equal(options.headers.authorization, `Bearer ${apiKey}`);
    assert.equal(options.redirect, 'error');
    return new Response('{}');
  });
  assert.equal(checked.model, config.model);
  await assert.rejects(validateMetaKey(apiKey, config, async () => new Response(apiKey, { status: 403 })),
    error => error.status === 422 && !error.message.includes(apiKey));
});

const response = { id: 'synthetic-response', status: 'completed', output: [{ type: 'message', role: 'assistant',
  content: [{ type: 'output_text', text: 'Bonjour {name}' }] }],
  usage: { input_tokens: 100, output_tokens: 30, total_tokens: 130, input_tokens_details: { cached_tokens: 10 }, output_tokens_details: { reasoning_tokens: 12 } } };
test('contextual translation uses only the supplied organization key, does not store content, and counts reasoning once', async () => {
  const result = await generateMetaText({ apiKey, config, system: 'Preserve placeholders', user: 'Greeting: Hello {name}', fetchImpl: async (url, options) => {
    assert.equal(url.href, config.endpoint); assert.equal(options.headers.authorization, `Bearer ${apiKey}`);
    const body = JSON.parse(options.body); assert.equal(body.store, false); assert.equal(body.model, config.model);
    assert.equal(body.instructions, 'Preserve placeholders'); assert.equal(body.input, 'Greeting: Hello {name}');
    return Response.json(response);
  } });
  assert.equal(result.text, 'Bonjour {name}');
  assert.deepEqual(result.raw.usageMetadata, { promptTokenCount: 100, candidatesTokenCount: 18,
    thoughtsTokenCount: 12, cachedContentTokenCount: 10, totalTokenCount: 130 });
  assert.ok(!JSON.stringify(result).includes(apiKey));
});
test('Meta translation fails closed on upstream errors, refusal, and incomplete output', async () => {
  for (const raw of [{ ...response, status: 'incomplete' }, { ...response, output: [] },
    { ...response, output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: 'No' }] }] }]) {
    await assert.rejects(generateMetaText({ apiKey, config, system: '', user: '', fetchImpl: async () => Response.json(raw) }), { status: 502 });
  }
  let calls = 0;
  await assert.rejects(generateMetaText({ apiKey, config, system: '', user: '', fetchImpl: async () => {
    calls++; return new Response(apiKey, { status: 401 });
  } }), error => error.status === 502 && !error.message.includes(apiKey));
  assert.equal(calls, 1);
});
