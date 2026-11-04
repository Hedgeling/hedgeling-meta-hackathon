// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewBatches,reviewPrompt,reviewPromptBytes,parseReview} from '../src/job-review-analysis.js';
import {qualityFailureMessage} from '../ui/job-review-messages.js';
import {mergeRuntimeFile,publishTranslationPr,createJobDelivery,deliverySources} from '../src/job-delivery.js';
import {catalogState} from '../src/extraction-catalog.js';
const item=(id='1')=>({id,sourceText:'Hello {name}',text:'Bonjour {name}',locale:'fr',sourceHash:'hello',limitChars:null});
test('quality checks cover the entire selection in bounded batches and never truncate all',()=>{
  const items=Array.from({length:1000},(_,i)=>item(String(i))),batches=reviewBatches(items,'en',{});
  assert.equal(batches.length,50);assert.equal(batches.flat().length,1000);
  assert.throws(()=>reviewBatches([...items,item('extra')],'en',{}),{code:'review_selection_limit'});
  assert.throws(()=>reviewBatches([item()],'en',{prompt:'x'.repeat(70000)}),{code:'review_prompt_limit'});
  const prompt=reviewPrompt([item()],'en',{});assert.match(prompt.system,/untrusted data/);assert.match(prompt.system,/Do not approve/);
});
test('quality result validation rejects incomplete/duplicate identities and guards false passes',()=>{
  const row={id:'1',verdict:'pass',issues:[]};assert.equal(parseReview(JSON.stringify({items:[row]}),[item()])[0].verdict,'pass');
  assert.throws(()=>parseReview('{"items":[]}',[item()]),{code:'review_result_invalid'});
  assert.throws(()=>parseReview(JSON.stringify({items:[row,row]}),[item(),item('2')]),{code:'review_result_invalid'});
  assert.throws(()=>parseReview(JSON.stringify({items:[{...row,id:'foreign'}]}),[item()]),{code:'review_result_invalid'});
  assert.equal(parseReview(JSON.stringify({items:[row]}),[{...item(),text:'Bonjour'}])[0].verdict,'needs_changes');
  assert.equal(parseReview(JSON.stringify({items:[row]}),[{...item(),limitChars:3}])[0].verdict,'needs_changes');
});
test('quality requests constrain the schema and budget its bytes along with the input',()=>{
  const items=[item('1'),item('2')],prompt=reviewPrompt(items,'en',{}),schema=prompt.responseSchema;
  assert.equal(schema.additionalProperties,false);assert.deepEqual(schema.required,['items']);
  assert.equal(schema.properties.items.minItems,2);assert.equal(schema.properties.items.maxItems,2);
  assert.deepEqual(schema.properties.items.items.properties.id.enum,['1','2']);
  assert.deepEqual(schema.properties.items.items.properties.verdict.enum,['pass','needs_changes','uncertain']);
  assert.ok(reviewPromptBytes(prompt)>Buffer.byteLength(prompt.system+prompt.user));
});
test('quality failures retain precise bounded diagnostics without echoing provider content',()=>{
  const row={id:'1',verdict:'pass',issues:[]},encode=items=>JSON.stringify({items});
  const cases=[['not-json secret','invalid_json'],[null,'missing_response'],['x'.repeat(131073),'response_too_large'],
    ['{}','invalid_shape'],[encode([]),'item_count_mismatch'],[encode([{...row,id:'foreign-secret'}]),'unknown_item'],
    [encode([{...row,verdict:'approved-secret'}]),'invalid_verdict'],[encode([{...row,issues:['']}]),'invalid_issues'],
    [encode([{...row,issues:['secret issue']}]),'verdict_issues_mismatch'],[encode([{...row,extra:'secret'}]),'invalid_item']];
  for(const [text,reason]of cases)assert.throws(()=>parseReview(text,[item()]),error=>{
    assert.equal(error.code,'review_result_invalid');assert.equal(error.reviewDiagnostic.reason,reason);
    assert.equal(error.reviewDiagnostic.expectedItems,1);assert.ok(!JSON.stringify(error).includes('secret'));return true;
  });
  assert.throws(()=>parseReview(encode([row,row]),[item('1'),item('2')]),error=>error.reviewDiagnostic.reason==='duplicate_item'&&error.reviewDiagnostic.itemIndex===2);
});
test('quality failure copy distinguishes no findings from preserved earlier batches',()=>{
  const failed={error:'review_result_invalid',checked:0,failure:{reason:'item_count_mismatch',expectedItems:20,receivedItems:2,batch:1}};
  assert.match(qualityFailureMessage(failed),/Batch 1: The model returned 2 results; 20 were required/);
  assert.match(qualityFailureMessage(failed),/No findings were saved/);
  assert.doesNotMatch(qualityFailureMessage(failed),/Review them/);
  assert.match(qualityFailureMessage({...failed,checked:20}),/20 findings from completed batches were saved/);
  assert.match(qualityFailureMessage({...failed,failure:null}),/No findings were saved/);
});
test('runtime merge changes selected translations and preserves unrelated game strings and locales',()=>{
  const original={schemaVersion:1,fr:{other:'Autre',hello:'Ancien'},de:{hello:'Hallo'},metadata:'keep'};
  const result=JSON.parse(mergeRuntimeFile(JSON.stringify(original),'bundle',[],[item()]));
  assert.deepEqual(result,{...original,fr:{other:'Autre',hello:'Bonjour {name}'}});
  const map={schemaVersion:1,bySource:{Other:'other'},sources:[{source:'Other',key:'other'}]};
  const merged=JSON.parse(mergeRuntimeFile(JSON.stringify(map),'map',[{source_text:'Hello {name}',source_hash:'hello'}],[]));
  assert.equal(merged.bySource.Other,'other');assert.equal(merged.sources.length,2);
  assert.throws(()=>mergeRuntimeFile(JSON.stringify(map),'map',[{source_text:'Other',source_hash:'different'}],[]),{code:'delivery_key_conflict'});
  assert.throws(()=>mergeRuntimeFile(JSON.stringify(map),'map',[{source_text:'__proto__',source_hash:'bad'}],[]),{code:'delivery_format_invalid'});
});
function githubFixture(){const sha='a'.repeat(40),treeSha='b'.repeat(40),commitSha='c'.repeat(40),state={ref:null,commit:null,pr:null,posts:[],lost:false,conflict:false};
  const github={request:async(path,token,options={})=>{assert.equal(token,'fixture-user-token');const body=options.body;
    if(body)state.posts.push(path);
    if(path.includes('/branches/'))return {commit:{sha}};
    if(path.endsWith('/git/trees'))return {sha:treeSha};
    if(path.includes('/git/ref/heads/')){if(!state.ref)throw Object.assign(new Error('missing'),{upstreamStatus:404});return state.ref;}
    if(path.endsWith('/git/commits')){state.commit={sha:commitSha,tree:{sha:treeSha},parents:[{sha}],message:body.message};return state.commit;}
    if(path.endsWith('/git/refs')){state.ref={object:{sha:commitSha}};return state.ref;}
    if(path.includes('/git/commits/'))return state.conflict?{...state.commit,tree:{sha:'d'.repeat(40)}}:state.commit;
    if(path.includes('/pulls?'))return state.pr?[state.pr]:[];
    if(path.endsWith('/pulls')){state.pr={number:1,state:'open',body:body.body};if(state.lost){state.lost=false;throw new Error('lost response');}return state.pr;}
    throw new Error('Unexpected GitHub request '+path);
  }};
  const prepared={job:{id:'12345678-1234-1234-1234-123456789012',name:'Synthetic game',steps:['machine_translation']},tree:{commitSha:sha,treeSha:'e'.repeat(40)},baseBranch:'main',files:[{path:'public/hedgeling-bundle.json',mode:'100644',content:'{}'}],translations:[item()],locales:['fr']};
  return {github,state,prepared,repo:{owner:'fixture',repository:'game',token:'fixture-user-token'}};
}
test('context-aware delivery preserves distinct translations and deterministic plain fallbacks',()=>{
  const entries={body:{sourceText:'Open',context:'body',contextVariants:[{}]},button:{sourceText:'Open',context:'button',contextVariants:[{},{}]}};
  const sources=deliverySources([{source_hash:'body',source_text:'Open'},{source_hash:'button',source_text:'Open'}],entries);
  const empty={schemaVersion:1,bySource:{Other:'other'},sources:[{source:'Other',key:'other'}]};
  const merge=s=>JSON.parse(mergeRuntimeFile(JSON.stringify(empty),'map',s,[]));
  const map=merge(sources);assert.deepEqual(map.bySource,{Other:'other','Open\u0004body':'body','Open\u0004button':'button',Open:'button'});
  assert.deepEqual(merge([...sources].reverse()).bySource,map.bySource);
  assert.deepEqual(JSON.parse(mergeRuntimeFile(JSON.stringify(map),'map',sources,[])),map);
  const translations=[{...item(),sourceHash:'body',text:'Ouvert'},{...item(),sourceHash:'button',text:'Ouvrir'}];
  const bundle=JSON.parse(mergeRuntimeFile(JSON.stringify({schemaVersion:1,fr:{other:'Préservé'},de:{other:'Erhalten'}}),'bundle',sources,translations));
  assert.equal(bundle.fr[map.bySource['Open\u0004body']],'Ouvert');assert.equal(bundle.fr[map.bySource['Open\u0004button']],'Ouvrir');
  assert.equal(bundle.fr[map.bySource.Open],'Ouvrir');assert.equal(bundle.fr.other,'Préservé');assert.equal(bundle.de.other,'Erhalten');
  const existing={...empty,bySource:{...empty.bySource,Open:'legacy'},sources:[...empty.sources,{source:'Open',key:'legacy'}]};
  assert.equal(JSON.parse(mergeRuntimeFile(JSON.stringify(existing),'map',sources,[])).bySource.Open,'legacy');
  assert.equal(merge([...sources,{source_text:'Open',source_hash:'plain'}]).bySource.Open,'plain');
  const tied=sources.map(s=>({...s,occurrences:1}));assert.equal(merge(tied).bySource.Open,'body');assert.equal(merge(tied.reverse()).bySource.Open,'body');
});
test('context support still rejects genuine key collisions and malformed lookups',()=>{
  const empty=JSON.stringify({schemaVersion:1,bySource:{},sources:[]});
  const source={source_text:'Open',source_hash:'button',context:'button'};
  for(const other of [{...source,source_text:'Close'},{...source,context:'header'},{...source,source_hash:'different'}]){
    assert.throws(()=>mergeRuntimeFile(empty,'map',[source,other],[]),{code:'delivery_key_conflict'});
  }
  assert.throws(()=>mergeRuntimeFile(empty,'map',[{source_text:'Open',source_hash:'a'},{source_text:'Open',source_hash:'b'}],[]),{code:'delivery_key_conflict'});
  for(const context of ['',null,{},'x\u0004y','x'.repeat(257)])assert.throws(()=>mergeRuntimeFile(empty,'map',[{...source,context}],[]),{code:'delivery_format_invalid'});
  assert.throws(()=>mergeRuntimeFile(empty,'map',[{...source,source_text:'__proto__'}],[]),{code:'delivery_format_invalid'});
});
test('pinned catalog context metadata reaches delivery without deriving it from UI shape',()=>{
  const expected={repositoryId:123,commitSha:'a'.repeat(40),sourceLocale:'en'};
  const artifact={version:1,provenance:{...expected,operation:'extract'},catalog:{schemaVersion:2,sourceLocale:'en',entries:[{key:'explicit',source:'Open',context:'menu-action',contexts:[{shape:'body',locations:[{file:'src/menu.ts',line:1}]}]},{key:'plain',source:'Close',contexts:[{shape:'button'}]}]}};
  const entries=catalogState(artifact,expected).files['extracted-source'].entries;
  const sources=deliverySources([{source_text:'Open',source_hash:'explicit'},{source_text:'Close',source_hash:'plain'}],entries);
  assert.equal(sources[0].context,'menu-action');assert.equal(sources[1].context,undefined);
  for(const context of ['',null,{},'x\u0004y','x'.repeat(257)]){
    const bad=structuredClone(artifact);bad.catalog.entries[0].context=context;assert.throws(()=>catalogState(bad,expected),{code:'catalog_invalid'});
  }
});
test('lost PR response recovers the same branch and PR without updating a ref or merging',async()=>{
  const f=githubFixture();f.state.lost=true;
  await assert.rejects(publishTranslationPr(f.github,f.repo,f.prepared,'proposal'),/lost response/);
  const receipt=await publishTranslationPr(f.github,f.repo,f.prepared,'proposal');assert.equal(receipt.number,1);
  assert.equal(f.state.posts.filter(p=>p.endsWith('/pulls')).length,1);assert.equal(f.state.posts.filter(p=>p.endsWith('/git/refs')).length,1);
  assert.match(f.state.pr.body,/AI-only translations/);assert.ok(f.state.posts.every(p=>!p.includes('merge')));
  f.state.conflict=true;await assert.rejects(publishTranslationPr(f.github,f.repo,f.prepared,'proposal'),{code:'delivery_branch_conflict'});
});
test('delivery rejects incomplete or unverified coverage before contacting GitHub',async()=>{
  const job={id:'job',project_id:'project',status:'awaiting_review',target_locales:['fr'],source_locale:'en',steps:['machine_translation','review'],source_snapshot:[{id:'source',source_hash:'hello',source_text:'Hello'}]};
  let coverage={saved:0,verified:0,rejected:0,inReview:0},calls=0;
  const database={query:async sql=>({rows:sql.startsWith('select p.id')?[{id:'project',sourceLocale:'en',organizationId:'org'}]:sql.startsWith('select * from localization_jobs')?[job]:sql.startsWith('select id,source_hash')?job.source_snapshot:sql.startsWith('select count(*)')?[coverage]:[]})};
  const service=createJobDelivery({database,authorize:async()=>{},github:{resolve:async()=>{calls++;}},identity:{token:async()=>null}});
  await assert.rejects(service.prepare('localization_job.pull_request',{jobId:'job'},{}),{code:'delivery_incomplete'});
  coverage={saved:1,verified:0,rejected:0,inReview:1};await assert.rejects(service.prepare('localization_job.pull_request',{jobId:'job'},{}),{code:'delivery_incomplete'});assert.equal(calls,0);
});
test('PR preview proves sources against imported extraction, pins the base and protects repository boundaries',async()=>{
  const sha='a'.repeat(40),source={id:'source',source_hash:'hello',source_text:'Hello'},translation={...item(),sourceId:'source',sourceText:'Hello',text:'Bonjour',humanStatus:'verified'},binding={connectionId:'fixture',repositoryId:'123',owner:'fixture',repository:'game',defaultRef:'main',allowedRoots:['src'],sourceMode:'github-fetch'};
  const job={id:'job',project_id:'project',status:'completed',source_locale:'en',target_locales:['fr'],steps:['machine_translation','review'],source_snapshot:[source]};
  const contents={'public/hedgeling-bundle.json':JSON.stringify({schemaVersion:1,fr:{other:'Other game'},de:{other:'Keep'}}),'public/hedgeling-source-key-map.json':JSON.stringify({schemaVersion:1,bySource:{Other:'other'},sources:[{source:'Other',key:'other'}]})};
  const fixture={source,translation,binding,denied:false,repoId:123,push:true,commit:sha,artifactCommit:sha,artifactSource:'Hello',artifactContext:undefined,engineCalls:0,githubWrites:0,token:'synthetic-token'};
  const database={query:async(sql)=>{let rows=[];
    if(sql.startsWith('select p.id'))rows=[{id:'project',sourceLocale:'en',organizationId:'org'}];
    else if(sql.startsWith('select * from localization_jobs'))rows=[job];
    else if(sql.startsWith('select id,source_hash'))rows=[source];
    else if(sql.startsWith('select count(*)'))rows=[{saved:1,verified:1,rejected:0,inReview:0}];
    else if(sql.startsWith('select t.id'))rows=[translation];
    else if(sql.startsWith('select connection_id'))rows=[binding];
    else if(sql.startsWith('select * from extraction_requests'))rows=[{id:'extract',binding:{...binding},request:{operation:'extract'}}];
    else throw new Error('Unexpected query '+sql);return {rows};}};
  const github={resolve:async()=>({owner:'fixture',repository:'game',id:fixture.repoId,token:fixture.token,canPush:fixture.push}),tree:async()=>({commitSha:fixture.commit,treeSha:'b'.repeat(40),files:Object.keys(contents).map(path=>({path,mode:'100644',sha:'c'.repeat(40),size:contents[path].length}))}),file:async(_repo,entry)=>contents[entry.path],request:async(_path,_token,options)=>{if(options?.body)fixture.githubWrites++;return {commit:{sha:fixture.commit}};}};
  const service=createJobDelivery({database,authorize:async()=>{if(fixture.denied)throw new Error('denied');},github,identity:{token:async()=>fixture.token},fingerprint:JSON.stringify,engine:()=>({artifact:async()=>{fixture.engineCalls++;return {version:1,provenance:{repositoryId:123,commitSha:fixture.artifactCommit,operation:'extract'},catalog:{schemaVersion:1,sourceLocale:'en',entries:[{key:'hello',source:fixture.artifactSource,context:fixture.artifactContext,contexts:[]}]}};}})});
  const input={jobId:'job',connectionId:'fixture',extractionId:'extract',baseBranch:'main',bundlePaths:['public/hedgeling-bundle.json'],sourceMapPaths:['public/hedgeling-source-key-map.json']};
  const p=await service.prepare('localization_job.pull_request',input,{});assert.equal(p.files.length,2);assert.equal(fixture.githubWrites,0);assert.equal(JSON.parse(p.files[0].content).fr.other,'Other game');assert.equal(p.preview.resources.baseCommit,sha);
  fixture.artifactContext='menu-action';const contextual=await service.prepare('localization_job.pull_request',input,{});
  assert.equal(JSON.parse(contextual.files[1].content).bySource['Hello\u0004menu-action'],'hello');assert.equal(fixture.githubWrites,0);fixture.artifactContext=undefined;
  fixture.artifactCommit='d'.repeat(40);await assert.rejects(service.prepare('localization_job.pull_request',input,{}),{code:'delivery_base_changed'});fixture.artifactCommit=sha;
  fixture.artifactSource='Different';await assert.rejects(service.prepare('localization_job.pull_request',input,{}),{code:'delivery_source_unproven'});fixture.artifactSource='Hello';
  await assert.rejects(service.prepare('localization_job.pull_request',{...input,bundlePaths:['.github/workflows/code.json']},{}),{code:'delivery_paths_invalid'});
  fixture.repoId=999;await assert.rejects(service.prepare('localization_job.pull_request',input,{}),{code:'repository_identity_changed'});fixture.repoId=123;
  fixture.token=null;await assert.rejects(service.prepare('localization_job.pull_request',input,{}),{code:'delivery_github_required'});fixture.token='synthetic-token';
  fixture.push=false;await assert.rejects(service.prepare('localization_job.pull_request',input,{}),{code:'delivery_github_required'});
  fixture.denied=true;await assert.rejects(service.prepare('localization_job.pull_request',input,{}),/denied/);
});
