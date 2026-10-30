// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { attachSourceEvidence, EVIDENCE_LIMITS } from '../src/source-evidence.js';
import { contextEvidence, enrichmentPrompt, parseEnrichment, withLengthSuggestion } from '../src/context-analysis.js';
import { characterSuggestionLabel } from '../ui/context-enrichment.js';
import { catalogState } from '../src/extraction-catalog.js';
const source = { id:'first',source_text:'Save',source_hash:'save',shape:'button',purpose:null,visual_context:null,limit_chars:null };
const contexts = [{ file_path:'src/form.tsx',code_context:'<button>Save</button>',raw:{ codeEvidence:{ text:'<button>Save</button>',startLine:2,endLine:2 } } }];
const items = [{ id:'first',evidence:contextEvidence(source,contexts) }];
const row = { id:'first',description:'Saves the current form.',evidence:'code',confidence:'medium',suggestedMaxCharacters:null,limitReason:'No measured width or explicit length budget is available.' };
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
