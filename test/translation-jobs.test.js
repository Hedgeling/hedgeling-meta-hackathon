// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createTranslationJobs } from '../src/translation-jobs.js';
import { TRANSLATION_JOB_LIMITS, defaultTranslationBatchSize } from '../src/translation-job-limits.js';
import { TRANSLATION_JOB_ACTIONS, TRANSLATION_JOB_SKILL } from '../src/translation-job-actions.js';

const fingerprint = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
function fixture({count=105,locales=['fr'],existing=[{source_string_id:'source-0',locale:'fr'}]}={}) {
  const sources = Array.from({ length: count }, (_, n) => ({ id: `source-${n}`, source_hash: `hash-${n}`, source_text: `Hello ${n}` }));
  const project = { id: 'project', slug: 'sample', sourceLocale: 'en', organizationId: 'org' };
  const job = { id: 'job', name: 'Launch', status: 'draft', source_locale: 'en', target_locales: locales, steps: ['machine_translation', 'review'], source_snapshot: sources.map(s => ({ ...s })) };
  const state = { denied: false, oversized: false, inspected: 0, executed: 0, existing };
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
    inspect: async ({ sourceId, locale }) => { state.inspected++; await state.beforeInspect?.(sourceId); return { fingerprint: fingerprint({ sourceId, locale }), creditCeiling: 5, promptBytes: state.oversized ? 70000 : 1000, provider: 'gemini', model: 'fixture-model', mode: 'managed' }; },
    execute: async () => { state.executed++; },
    transaction: async () => { throw new Error('Preview cannot execute a transaction'); },
  });
  return { api, job, state, sources };
}
test('start preview bounds selection, preserves saved work and sums its credit ceiling without executing', async () => {
  const { api, state } = fixture();
  const plan = await api.prepare('localization_job.start', { jobId: 'job', maxTranslations:100 }, {}, { organizationId: 'org' });
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
  assert.equal(TRANSLATION_JOB_ACTIONS[0].inputSchema.properties.maxTranslations.maximum, 10000);
  assert.match(TRANSLATION_JOB_SKILL.instructions, /Ignore older conversational claims/);
  assert.match(TRANSLATION_JOB_SKILL.instructions, /continue independently of chat pause/);
});

test('200 strings across 14 locales use one complete 2,800-pair preview by default',async()=>{
  const {api,state}=fixture({count:200,locales:Array.from({length:14},(_,i)=>`locale-${i}`),existing:[]});
  const plan=await api.prepare('localization_job.start',{jobId:'job'},{});
  assert.equal(plan.summary.pairs,2800);assert.equal(plan.summary.sourceCount,200);assert.equal(plan.summary.remainingPairs,0);
  assert.equal(plan.summary.maximumRequests,5600);assert.equal(plan.summary.maximumOutputTokens,5600*2048);
  assert.equal(plan.summary.creditCeiling,2800*5);assert.equal(state.executed,0);
  assert.equal(new Set(plan.items.map(i=>i.sourceId+':'+i.locale)).size,2800);
  assert.equal(defaultTranslationBatchSize(200,14),2800);
});
test('the 10,000-pair cap is explicit and cannot be bypassed; document jobs use the same default',async()=>{
  const f=fixture({count:10001,existing:[]});
  const plan=await f.api.prepare('localization_job.start',{jobId:'job'},{});
  assert.equal(plan.summary.pairs,10000);assert.equal(plan.summary.remainingPairs,1);
  for(const maxTranslations of [0,-1,1.5,10001])await assert.rejects(f.api.prepare('localization_job.start',{jobId:'job',maxTranslations},{}),{code:'job_batch_limit'});
  assert.equal(defaultTranslationBatchSize(1000,30),TRANSLATION_JOB_LIMITS.maximumPairs);
  const doc=fixture({count:300,existing:[]});doc.job.source_document_id='document';
  assert.equal((await doc.api.prepare('localization_job.start',{jobId:'job'},{})).summary.pairs,300);
  assert.equal((await doc.api.prepare('localization_job.start',{jobId:'job',maxTranslations:50},{})).summary.pairs,50);
});

test('preview inspection failures drain pending reads before returning and stop further preparation',async()=>{
  const f=fixture({count:100,existing:[]});let pending=0;
  f.state.beforeInspect=async id=>{
    pending++;
    try {
      if(id==='source-0')throw new Error('Provider configuration changed');
      await new Promise(resolve=>setTimeout(resolve,5));
    } finally {pending--;}
  };
  await assert.rejects(f.api.prepare('localization_job.start',{jobId:'job'},{}),/Provider configuration changed/);
  assert.equal(pending,0);assert(f.state.inspected>1&&f.state.inspected<100);assert.equal(f.state.executed,0);
});
