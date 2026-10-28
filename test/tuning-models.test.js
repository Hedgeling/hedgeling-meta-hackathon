// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTuningModelRequest, TUNING_MODEL_LIMITS } from '../src/tuning-models.js';
import { EXTRACTION_ACTIONS, EXTRACTION_SKILL } from '../src/extraction-actions.js';

test('private model requests cannot override the approved prompt/output boundary or supply credentials', () => {
  const request={id:'11111111-2222-3333-4444-555555555555',system:'Classify candidate text',user:'Synthetic source',maxOutputTokens:8192};
  assert.deepEqual(validateTuningModelRequest(request),request);
  for(const patch of [{id:'invalid'},{apiKey:'forbidden'},{url:'https://example.invalid'},{maxOutputTokens:8193},{user:'é'.repeat(32768)}]) assert.throws(()=>validateTuningModelRequest({...request,...patch}),e=>e.code==='tuning_model_request_invalid');
  assert.equal(TUNING_MODEL_LIMITS.calls,4);
  const action=EXTRACTION_ACTIONS.find(a=>a.name==='extraction.tune');
  assert.deepEqual(action.inputSchema.properties.mode.enum,['deterministic','llm']);
  assert(!action.inputSchema.required.includes('mode')); // Existing no-model tuning remains compatible.
  assert.equal(action.readOnly,false);assert(EXTRACTION_SKILL.instructions.includes('No model calls occur before confirmation'));
});


test('Gemini tuning makes one bounded request and rejects incomplete or oversized output without a fallback', async () => {
  const { generateGeminiTuning } = await import('../src/tuning-gemini.js');
  const args={system:'Classify',user:'Candidate',apiKey:'synthetic',model:'synthetic-model',maxOutputTokens:8192};
  let calls=0;
  const complete={candidates:[{finishReason:'STOP',content:{parts:[{text:'{"edits":[]}'}]}}],usageMetadata:{totalTokenCount:12}};
  const result=await generateGeminiTuning({...args,fetchImpl:async(url,options)=>{calls++;assert.equal(options.headers['x-goog-api-key'],'synthetic');assert.equal(JSON.parse(options.body).generationConfig.maxOutputTokens,8192);return Response.json(complete);}});
  assert.equal(result.text,'{"edits":[]}');
  for(const response of [Response.json({error:'private detail'},{status:403}),Response.json({...complete,candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'partial'}]}}]}),new Response('x'.repeat(262145))]) {
    await assert.rejects(generateGeminiTuning({...args,fetchImpl:async()=>{calls++;return response;}}),e=>e.code==='tuning_model_failed'&&!e.message.includes('private detail'));
  }
  assert.equal(calls,4);
});


test('usage summaries distinguish unknown and estimated costs from known zero', async () => {
  const {createTuningModels}=await import('../src/tuning-models.js');
  let calls=[];
  const broker=createTuningModels({database:{query:async sql=>({rows:sql.includes('from extraction_model_runs')?[{provider_plan:{provider:'meta',model:'fixture',limits:{}},status:'failed'}]:calls})}});
  assert.equal((await broker.summary('synthetic')).totalTokens,0);
  calls=[{status:'failed',usage:null}];assert.equal((await broker.summary('synthetic')).totalTokens,null);
  calls=[{status:'succeeded',usage:{totalTokens:100,estimated:true}}];const usage=await broker.summary('synthetic');assert.equal(usage.totalTokens,100);assert.equal(usage.usageEstimated,true);
});
