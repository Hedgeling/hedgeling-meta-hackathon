// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { contextResultPage, contextChatHistory, contextChatResult, CONTEXT_RESULT_LIMITS } from '../src/context-results.js';
import { chatRequestBudget } from '../src/chat-limits.js';
const results = Array.from({length:723},(_,i) => ({id:`source-${i}`,source:`Heading ${i}`,description:'d'.repeat(1100),limitReason:'r'.repeat(400),confidence:'high'}));
test('large context results paginate without losing saved suggestions or changing total counts', () => {
  assert.throws(() => chatRequestBudget({results}),{code:'agent_context_limit'});
  const all = []; let offset = 0;
  do {
    const page = contextResultPage(results,offset);
    assert(page.results.length <= 20); assert.equal(page.page.total,723);
    assert(Buffer.byteLength(JSON.stringify(page.results)) <= CONTEXT_RESULT_LIMITS.bytes);
    all.push(...page.results); offset = page.page.nextOffset;
  } while (offset !== null);
  assert.deepEqual(all,results);
  const unicode=results.slice(0,20).map(r=>({...r,description:'😀'.repeat(1200),limitReason:'😀'.repeat(500),source:'😀'.repeat(65536)}));
  const page=contextResultPage(unicode);
  assert(page.results.length < 20); assert(page.results.length > 0);
  assert.equal([...page.results[0].source].length,1001); assert.equal(page.results[0].sourceTruncated,true);
  assert.equal(page.results[0].description,unicode[0].description);
  assert(Buffer.byteLength(JSON.stringify(page.results)) <= CONTEXT_RESULT_LIMITS.bytes);
});
test('legacy oversized status and bulk proposals recover without changing saved history, approvals or provider replay', () => {
  const proposal={id:'proposal',fingerprint:'full-preview-fingerprint',preview:{action:'context.apply',fields:{strings:results},resources:{runId:'run'},cost:'No model calls.',sideEffects:['Save only after human approval.']}};
  const original=[{role:'model',parts:[{functionCall:{id:'call',name:'console_get_context_run',args:{runId:'run'}}}],providerState:{provider:'meta',output:[{type:'reasoning',encrypted_content:'opaque'}]}},
    {role:'user',parts:[{functionResponse:{id:'call',name:'console_get_context_run',response:{run:{id:'run',completedStrings:723,results}}}}]},
    {role:'user',parts:[{functionResponse:{name:'console_propose_context_apply',response:{proposal}}}]}];
  const saved=structuredClone(original),compact=contextChatHistory(original);
  assert.doesNotThrow(()=>chatRequestBudget(compact)); assert.deepEqual(original,saved);
  assert.deepEqual(compact[0],original[0]); assert.equal(compact[1].parts[0].functionResponse.id,'call');
  const status=compact[1].parts[0].functionResponse.response;
  assert.equal(status.page,undefined); assert.equal(status.run.results,undefined); assert.equal(status.run.completedStrings,723);
  assert.equal(status.run.awaitingAcceptance,723);
  const summary=compact[2].parts[0].functionResponse.response.proposal;
  assert.equal(summary.id,proposal.id); assert.equal(summary.fingerprint,proposal.fingerprint);
  assert.equal(summary.preview.fields.stringCount,723); assert.equal(summary.preview.fields.strings,undefined);
  assert.deepEqual(summary.preview.sideEffects,proposal.preview.sideEffects);
  assert.deepEqual(contextChatHistory(compact),compact,'Projection is idempotent.');
  const second={run:{id:'run',...contextResultPage(results,20)},page:contextResultPage(results,20).page};
  assert.equal(contextChatResult('console_get_context_run',second).run.results,undefined,'Historical paged reads also become counts only.');
  assert.equal(contextChatResult('unrelated_tool',{proposal}).proposal,proposal);
});
test('historical browse content is omitted while explicitly scoped inspection remains available', () => {
  const browse={strings:[{id:'source',source:'Private label',accepted:{description:'Actual context'}}],page:{nextCursor:null}};
  const projected=contextChatResult('console_list_string_context',browse);
  assert.equal(projected.returnedStrings,1); assert.equal(projected.strings,undefined);
  assert(!JSON.stringify(projected).includes('Private label')); assert(!JSON.stringify(projected).includes('Actual context'));
  assert.equal(contextChatResult('console_inspect_string_context',browse),browse);
  const runs=contextChatResult('console_list_context_runs',{runs:[{completedStrings:10,acceptedIds:['a','b']}]});
  assert.equal(runs.runs[0].acceptedStrings,2); assert.equal(runs.runs[0].awaitingAcceptance,8); assert.equal(runs.runs[0].acceptedIds,undefined);
});
test('bulk generation summaries retain provider budgets and disclose the complete console preview', () => {
  const provider={provider:'meta',maximumRequests:37,maximumTotalInputBytes:2000000,maximumTotalOutputTokens:303104,batches:Array.from({length:37},()=>({stringIds:['synthetic']}))};
  const result={proposal:{preview:{action:'context.enrich',fields:{stringCount:723,requests:37,strings:results},resources:{provider}}}};
  const compact=contextChatResult('console_propose_context_enrichment',result);
  assert.equal(compact.proposal.preview.resources.provider.batchCount,37);
  assert.equal(compact.proposal.preview.resources.provider.maximumTotalOutputTokens,303104);
  assert.match(compact.proposal.preview.details,/console approval card/);
  assert.equal(result.proposal.preview.fields.strings.length,723);
});
