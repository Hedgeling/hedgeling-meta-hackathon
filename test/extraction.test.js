// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogState, catalogSummary, sourcePaths } from '../src/extraction-catalog.js';
import { engineOperations } from '../src/engine-operations.js';
import { engineReader } from '../src/engine-client.js';
import { EXTRACTION_ACTIONS } from '../src/extraction-actions.js';
const expected = { sourceLocale: 'en-US', repositoryId: 123, commitSha: 'a'.repeat(40) };
const artifact = () => ({ version: 1, catalog: { schemaVersion: 1, sourceLocale: 'en-US', entries: [
  { key: 'greeting', source: 'Hello', contexts: [{ purpose: 'heading', locations: [{ file: 'src/App.tsx', line: 3 }] }] },
] }, provenance: { ...expected, operation: 'extract' } });

test('catalog conversion checks provenance and never imports embedded translations or extra fields', () => {
  const input = artifact(); input.catalog.entries[0].translations = { fr: { text: 'unapproved' } };
  const state = catalogState(input, expected);
  assert.deepEqual(state.locales, []);
  assert.deepEqual(state.files['extracted-source'].entries.greeting.translations, {});
  assert.equal(state.files['extracted-source'].entries.greeting.contextVariants[0].file, 'src/App.tsx');
  for (const altered of [{ ...expected, repositoryId: 124 }, { ...expected, commitSha: 'b'.repeat(40) }, { ...expected, sourceLocale: 'de' }]) assert.throws(() => catalogState(input, altered), /unsupported/);
  input.provenance.operation = 'transform-preview'; assert.throws(() => catalogState(input, expected));
});

test('malformed, duplicate, dangerous keys and oversized catalogs fail before import', () => {
  for (const mutate of [
    a => { a.catalog.schemaVersion = 999; },
    a => { a.catalog.entries.push(a.catalog.entries[0]); },
    a => { a.catalog.entries[0].key = '__proto__'; },
    a => { a.catalog.entries[0].source = 'x'.repeat(65537); },
    a => { a.catalog.entries[0].contexts = 'not-an-array'; },
  ]) { const input = artifact(); mutate(input); assert.throws(() => catalogState(input, expected), /unsupported/); }
});

test('source roots cannot escape the operator-provisioned project binding', () => {
  assert.deepEqual(sourcePaths(['src/components', 'src'], ['src']), ['src', 'src/components']);
  for (const roots of [['src/../secret'], ['src-other'], ['/src'], ['src\\private'], ['src/*'], ['src//empty'], ['.']]) assert.throws(() => sourcePaths(roots, ['src']));
});

test('catalog preview distinguishes new, changed and identical source fields', () => {
  const state = catalogState(artifact(), expected);
  assert.deepEqual(catalogSummary(state, []), { total: 1, added: 1, updated: 0, unchanged: 0 });
  const old = { source_hash: 'greeting', source_text: 'Hello', shape: null, purpose: 'heading', visual_context: null, limit_chars: null };
  assert.equal(catalogSummary(state, [old]).unchanged, 1);
  assert.equal(catalogSummary(state, [{ ...old, source_text: 'Goodbye' }]).updated, 1);
});

test('job adapter preserves explicit idempotency and does not expand the read-only harness', async () => {
  const calls = []; const config = { url: 'https://engine.example.invalid/base', token: 'synthetic-token', fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options }); return new Response(JSON.stringify({ job: {} }));
  } };
  const reader = engineReader(config); assert.equal(reader.create, undefined);
  const client = engineOperations(config);
  await client.create({ operation: 'extract' }, 'proposal-test-123');
  assert.equal(calls[0].url, 'https://engine.example.invalid/base/v1/jobs');
  assert.equal(calls[0].options.headers['idempotency-key'], 'proposal-test-123');
  assert.equal(calls[0].options.redirect, 'error');
  assert.throws(() => client.job('../secrets'));
  await assert.rejects(client.create({}, 'bad\nheader'));
  assert.equal(calls.length, 1);
  assert(EXTRACTION_ACTIONS.filter(a => !a.readOnly).every(a => a.toolName.includes('propose')));
  assert(!EXTRACTION_ACTIONS.some(a => a.name.includes('confirm')));
});
