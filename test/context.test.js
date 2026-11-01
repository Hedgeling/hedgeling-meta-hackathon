// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { attachSourceEvidence, EVIDENCE_LIMITS } from '../src/source-evidence.js';
import { CONTEXT_LIMITS, contextEvidence, enrichmentPrompt, enrichmentPromptBytes, enrichmentBatches, parseEnrichment, withLengthSuggestion } from '../src/context-analysis.js';
import { characterSuggestionLabel, contextFailureMessage } from '../ui/context-enrichment.js';
import { catalogState } from '../src/extraction-catalog.js';
const source = { id:'first',source_text:'Save',source_hash:'save',shape:'button',purpose:null,visual_context:null,limit_chars:null };
const contexts = [{ file_path:'src/form.tsx',code_context:'<button>Save</button>',raw:{ codeEvidence:{ text:'<button>Save</button>',startLine:2,endLine:2 } } }];
const items = [{ id:'first',evidence:contextEvidence(source,contexts) }];
const row = { id:'first',description:'Saves the current form.',evidence:'code',confidence:'medium',suggestedMaxCharacters:null,limitReason:'No measured width or explicit length budget is available.' };
test('enrichment constrains model output to the selected IDs and counts schema bytes in the approved budget', () => {
  const prompt = enrichmentPrompt(items,'en');
  const schema = prompt.responseSchema.properties.items;
  assert.equal(schema.minItems,1); assert.equal(schema.maxItems,1);
  assert.deepEqual(schema.items.properties.id.enum,['first']);
  assert.deepEqual(schema.items.properties.confidence.enum,['low','medium','high']);
  assert.equal(schema.items.properties.description.maxLength,1200);
  assert.equal(schema.items.properties.limitReason.maxLength,500);
  assert.equal(schema.items.additionalProperties,false);
  assert.equal(enrichmentPromptBytes(prompt),Buffer.byteLength(prompt.system+prompt.user+JSON.stringify(prompt.responseSchema)));
  assert.equal(enrichmentBatches(items,'en')[0].maximumInputBytes,enrichmentPromptBytes(prompt)+1024);
});
test('invalid enrichment output records precise bounded diagnostics without retaining provider text', () => {
  const invalid = (text, expectedItems=items) => { try { parseEnrichment(text,expectedItems); assert.fail('Expected invalid result'); } catch (error) { assert.equal(error.code,'context_result_invalid'); return error.contextDiagnostic; } };
  assert.equal(invalid('private-provider-content').reason,'invalid_json');
  assert(!JSON.stringify(invalid('private-provider-content')).includes('private-provider-content'));
  assert.equal(invalid(null).reason,'missing_response');
  assert.equal(invalid('x'.repeat(65537)).reason,'response_too_large');
  const short=invalid(JSON.stringify({items:[]}));
  assert.equal(short.reason,'item_count_mismatch'); assert.equal(short.expectedItems,1); assert.equal(short.receivedItems,0);
  for (const [change,reason] of [[{id:'unknown'},'unknown_item'],[{confidence:'medium-high'},'invalid_confidence'],[{description:''},'invalid_description'],[{limitReason:''},'invalid_limit_reason'],[{suggestedMaxCharacters:'20'},'invalid_character_suggestion']]) {
    const diagnostic=invalid(JSON.stringify({items:[{...row,...change}]})); assert.equal(diagnostic.reason,reason); assert.equal(diagnostic.itemIndex,1);
  }
  const long=invalid(JSON.stringify({items:[{...row,description:'x'.repeat(1201)}]}));
  assert.equal(long.reason,'description_too_long'); assert.equal(long.receivedCharacters,1201);
  assert.equal(invalid(JSON.stringify({items:[{...row,limitReason:'x'.repeat(501)}]})).reason,'limit_reason_too_long');
  assert.equal(invalid(JSON.stringify({items:[row,row]}),[items[0],{...items[0],id:'second'}]).reason,'duplicate_item');
  assert.equal(invalid(JSON.stringify({items:[{...row,suggestedMaxCharacters:20}]}),[{...items[0],evidence:{...items[0].evidence,hardLimit:10}}]).reason,'existing_hard_limit');
  assert.equal(parseEnrichment(JSON.stringify({items:[{...row,description:'😀'.repeat(700)}]}),items)[0].description.length,1400,'Schema character bounds count code points, not UTF-16 units.');
});
test('failure copy distinguishes saved progress, empty failures and historical missing diagnostics', () => {
  const failure={reason:'item_count_mismatch',expectedItems:20,receivedItems:19,batch:3};
  const partial=contextFailureMessage({error:'context_result_invalid',failure,completedStrings:40});
  assert.match(partial,/Batch 3 stopped/); assert.match(partial,/19 suggestions; 20 were required/); assert.match(partial,/40 suggestions/);
  const empty=contextFailureMessage({error:'context_result_invalid',failure,completedStrings:0});
  assert.match(empty,/No suggestions were saved/); assert.doesNotMatch(empty,/are saved/);
  assert.match(contextFailureMessage({error:'context_result_invalid',completedStrings:40}),/did not record a detailed validation reason/);
});
test('bulk enrichment partitions every selected source within per-request count and prompt budgets', () => {
  const selected = Array.from({length:45},(_,i) => ({...items[0],id:`source-${i}`}));
  const batches = enrichmentBatches(selected,'en');
  assert.deepEqual(batches.map(b => b.stringIds.length),[20,20,5]);
  assert.deepEqual(batches.flatMap(b => b.stringIds),selected.map(s => s.id));
  const bulky = selected.slice(0,8).map(s => ({...s,evidence:{...s.evidence,sourceText:'x'.repeat(20000)}}));
  const split = enrichmentBatches(bulky,'en');
  assert(split.length > 1);
  assert(split.every(b => b.maximumInputBytes <= CONTEXT_LIMITS.promptBytes+1024));
  assert.deepEqual(split.flatMap(b => b.stringIds),bulky.map(s => s.id));
  assert.throws(() => enrichmentBatches(Array.from({length:1001},() => items[0]),'en'),{code:'context_selection_limit'});
  assert.throws(() => enrichmentBatches([{...items[0],evidence:{...items[0].evidence,sourceText:'x'.repeat(70000)}}],'en'),{code:'context_prompt_limit'});
  assert.throws(() => enrichmentBatches(Array.from({length:201},(_,i) => ({...bulky[0],id:`large-${i}`,evidence:{...bulky[0].evidence,sourceText:'x'.repeat(40000)}})),'en'),{code:'context_request_limit'});
});
test('surrounding-code capture is bounded and cannot read outside the supplied snapshot', () => {
  const entries = [{ key:'save',source:'Save',contexts:[{ locations:[{file:'src/form.tsx',line:2},{file:'src/form.tsx',line:3},{file:'src/form.tsx',line:1},{file:'outside.tsx',line:1}] }] }];
  const output = attachSourceEvidence(entries,[{ path:'src/form.tsx',content:'function Form() {\nreturn <button>Save</button>;\n}' }]);
  const locations = output[0].contexts[0].locations;
  assert.equal(locations.filter(l => l.snippet).length,2); assert.match(locations[0].snippet.text,/function Form/);
  assert(!entries[0].contexts[0].locations[0].snippet);
  assert(!attachSourceEvidence(entries,[{path:'src/form.tsx',content:'x'.repeat(3000)+'\nSave'}])[0].contexts[0].locations[0].snippet);
  const many = attachSourceEvidence(Array.from({length:1000},() => entries[0]),[{path:'src/form.tsx',content:'x'.repeat(1900)+'\nSave\nend'}]);
  const bytes = many.flatMap(e => e.contexts).flatMap(c => c.locations).reduce((n,l) => n+Buffer.byteLength(l.snippet?.text || ''),0);
  assert(bytes <= EVIDENCE_LIMITS.totalBytes);
});
test('catalog import preserves bounded code evidence and rejects malformed excerpts', () => {
  const expected = { sourceLocale:'en',commitSha:'synthetic',repositoryId:'1' };
  const artifact = { version:1,provenance:{ ...expected,operation:'extract' },catalog:{ schemaVersion:2,sourceLocale:'en',entries:attachSourceEvidence([{key:'save',source:'Save',contexts:[{locations:[{file:'src/form.tsx',line:1}]}]}],[{path:'src/form.tsx',content:'<button>Save</button>'}]) } };
  const variant = catalogState(artifact,expected).files['extracted-source'].entries.save.contextVariants[0];
  assert.equal(variant.codeContext,'<button>Save</button>'); assert.equal(variant.codeEvidence.commitSha,'synthetic');
  artifact.catalog.entries[0].contexts[0].locations[0].snippet.endLine = 1000;
  assert.throws(() => catalogState(artifact,expected),/unsupported/);
});
test('translation and enrichment normalize the same evidence; descriptions stay untrusted', () => {
  assert.deepEqual(contextEvidence(source,contexts),contextEvidence({sourceText:'Save',sourceHash:'save',shape:'button',purpose:null,visualContext:null,limitChars:null},[{ filePath:'src/form.tsx',codeContext:'<button>Save</button>',raw:contexts[0].raw }]));
  const prompt = enrichmentPrompt(items,'en'); assert.match(prompt.system,/untrusted evidence/); assert.match(prompt.user,/<button>/);
  assert.throws(() => enrichmentPrompt([{...items[0],evidence:{...items[0].evidence,sourceText:'x'.repeat(70000)}}],'en'),/too large/);
});
test('invalid, invented and incomplete model output never becomes guidance', () => {
  assert.equal(parseEnrichment(JSON.stringify({items:[row]}),items)[0].advisory,true);
  for (const output of ['not json','{}',JSON.stringify({items:[]}),JSON.stringify({items:[{...row,id:'unknown'}]}),JSON.stringify({items:[{...row,suggestedMaxCharacters:-1}]}),JSON.stringify({items:[{...row,description:''}]})]) assert.throws(() => parseEnrichment(output,items),/complete, valid/);
  assert.equal(parseEnrichment(JSON.stringify({items:[row]}),[{...items[0],evidence:{...items[0].evidence,contexts:[]}}])[0].evidence,'metadata');
  assert.throws(() => parseEnrichment(JSON.stringify({items:[{...row,suggestedMaxCharacters:30}]}),[{...items[0],evidence:{...items[0].evidence,hardLimit:20}}]),/complete, valid/);
});
test('formula fallback is rounded, generous for short labels, and counts code points rather than UTF-16 units', () => {
  for (const [sourceText,expected] of [['Save',9],['a'.repeat(20),26],['a'.repeat(21),28],['😀'.repeat(20),26],['Hello {name}',17]]) {
    const result = withLengthSuggestion(row,{sourceText,hardLimit:null});
    assert.equal(result.suggestedMaxCharacters,expected); assert.equal(result.suggestionSource,'formula');
    assert.equal(result.formula.sourceCharacters,[...sourceText].length);
    assert.equal(result.advisory,true); assert.equal(result.unit,'unicode_code_points');
    assert.equal(result.modelLimitReason,row.limitReason);
    assert.match(result.limitReason,/longer translations are allowed/);
    assert.match(characterSuggestionLabel(result),/formula estimate · not enforced/);
    assert.deepEqual(withLengthSuggestion(result,{sourceText}),result);
  }
  assert.equal(row.suggestedMaxCharacters,null); assert.equal(row.suggestionSource,undefined);
});
test('model suggestions and existing hard limits take precedence; empty or missing evidence creates no estimate', () => {
  const model = parseEnrichment(JSON.stringify({items:[{...row,suggestedMaxCharacters:12}]}),items)[0];
  assert.equal(model.suggestedMaxCharacters,12); assert.equal(model.suggestionSource,'model');
  assert.equal(model.limitReason,row.limitReason); assert.match(characterSuggestionLabel(model),/LLM suggestion/);
  const hard = parseEnrichment(JSON.stringify({items:[row]}),[{...items[0],evidence:{...items[0].evidence,hardLimit:10}}])[0];
  assert.equal(hard.suggestedMaxCharacters,null); assert.equal(hard.suggestionSource,undefined);
  for (const evidence of [undefined,{}, {sourceText:''},{sourceText:'  \n '},{sourceText:'Save',hardLimit:0}]) assert.deepEqual(withLengthSuggestion(row,evidence),row);
  const fallback = parseEnrichment(JSON.stringify({items:[row]}),items)[0];
  assert.equal(fallback.suggestedMaxCharacters,9); assert.equal(fallback.suggestionSource,'formula');
});
