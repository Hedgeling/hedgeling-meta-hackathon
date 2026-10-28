// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createTranslationJobs } from '../src/translation-jobs.js';
import { TRANSLATION_JOB_ACTIONS, TRANSLATION_JOB_SKILL } from '../src/translation-job-actions.js';

const fingerprint = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
function fixture() {
  const sources = Array.from({ length: 105 }, (_, n) => ({ id: `source-${n}`, source_hash: `hash-${n}`, source_text: `Hello ${n}` }));
  const project = { id: 'project', slug: 'sample', sourceLocale: 'en', organizationId: 'org' };
  const job = { id: 'job', name: 'Launch', status: 'draft', source_locale: 'en', target_locales: ['fr'], steps: ['machine_translation', 'review'], source_snapshot: sources.map(s => ({ ...s })) };
  const state = { denied: false, oversized: false, inspected: 0, executed: 0, existing: [{ source_string_id: 'source-0', locale: 'fr' }] };
  const database = { query: async sql => {
    if (sql.startsWith('select p.id')) return { rows: [project] };
    if (sql.startsWith('select * from localization_jobs')) return { rows: [job] };
    if (sql.startsWith('select id from localization_jobs')) return { rows: [] };
    if (sql.startsWith('select id,source_hash')) return { rows: sources };
    if (sql.startsWith('select t.source_string_id')) return { rows: state.existing };
    throw new Error('Unexpected query in read-only fixture');
  } };
  const api = createTranslationJobs({ database, fingerprint,
    authorize: async () => { if (state.denied) throw new Error('access denied'); },
    inspect: async ({ sourceId, locale }) => { state.inspected++; return { fingerprint: fingerprint({ sourceId, locale }), creditCeiling: 5, promptBytes: state.oversized ? 70000 : 1000, provider: 'gemini', model: 'fixture-model', mode: 'managed' }; },
    execute: async () => { state.executed++; },
    transaction: async () => { throw new Error('Preview cannot execute a transaction'); },
  });
  return { api, job, state, sources };
}
test('start preview bounds selection, preserves saved work and sums its credit ceiling without executing', async () => {
  const { api, state } = fixture();
  const plan = await api.prepare('localization_job.start', { jobId: 'job' }, {}, { organizationId: 'org' });
  assert.equal(plan.summary.pairs, 100); assert.equal(plan.summary.remainingPairs, 4); assert.equal(plan.summary.preservedPairs, 1);
  assert.equal(plan.summary.creditCeiling, 500); assert.equal(plan.summary.maximumRequests, 200); assert.equal(plan.summary.maximumOutputTokens, 409600);
  assert.equal(plan.items[0].sourceId, 'source-1'); assert.equal(state.executed, 0);
});
test('source snapshots, workflow steps, access and prompt limits are checked before execution', async () => {
  let f = fixture(); f.sources[0].source_text = 'Changed';
  await assert.rejects(f.api.prepare('localization_job.start', { jobId: 'job' }, {}), { code: 'job_source_changed' });
  f = fixture(); f.job.steps = ['human_translation', 'review'];
  await assert.rejects(f.api.prepare('localization_job.start', { jobId: 'job' }, {}), { code: 'job_steps_unsupported' });
  f = fixture(); f.state.denied = true;
  await assert.rejects(f.api.prepare('localization_job.start', { jobId: 'job' }, {}), /access denied/); assert.equal(f.state.inspected, 0);
  f = fixture(); f.state.oversized = true;
  await assert.rejects(f.api.prepare('localization_job.start', { jobId: 'job' }, {}), { code: 'job_prompt_limit' });
  f = fixture();
  await assert.rejects(f.api.prepare('localization_job.start', { jobId: 'job' }, {}, { organizationId: 'foreign' }), { code: 'agent_scope_mismatch' });
});
test('API/MCP descriptors expose proposal-only writes and a read-only status tool', () => {
  assert.deepEqual(TRANSLATION_JOB_ACTIONS.filter(a => !a.readOnly).map(a => a.name), ['localization_job.start', 'localization_job.cancel']);
  assert.equal(TRANSLATION_JOB_ACTIONS[0].inputSchema.properties.maxTranslations.maximum, 200);
  assert.match(TRANSLATION_JOB_SKILL.instructions, /Ignore older conversational claims/);
  assert.match(TRANSLATION_JOB_SKILL.instructions, /continue independently of chat pause/);
});
