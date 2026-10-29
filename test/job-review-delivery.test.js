// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewBatches,reviewPrompt,parseReview} from '../src/job-review-analysis.js';
import {mergeRuntimeFile,publishTranslationPr,createJobDelivery} from '../src/job-delivery.js';
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
  const fixture={source,translation,binding,denied:false,repoId:123,push:true,commit:sha,artifactCommit:sha,artifactSource:'Hello',engineCalls:0,githubWrites:0,token:'synthetic-token'};
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
  const service=createJobDelivery({database,authorize:async()=>{if(fixture.denied)throw new Error('denied');},github,identity:{token:async()=>fixture.token},fingerprint:JSON.stringify,engine:()=>({artifact:async()=>{fixture.engineCalls++;return {version:1,provenance:{repositoryId:123,commitSha:fixture.artifactCommit,operation:'extract'},catalog:{schemaVersion:1,sourceLocale:'en',entries:[{key:'hello',source:fixture.artifactSource,contexts:[]}]}};}})});
  const input={jobId:'job',connectionId:'fixture',extractionId:'extract',baseBranch:'main',bundlePaths:['public/hedgeling-bundle.json'],sourceMapPaths:['public/hedgeling-source-key-map.json']};
  const p=await service.prepare('localization_job.pull_request',input,{});assert.equal(p.files.length,2);assert.equal(fixture.githubWrites,0);assert.equal(JSON.parse(p.files[0].content).fr.other,'Other game');assert.equal(p.preview.resources.baseCommit,sha);
  fixture.artifactCommit='d'.repeat(40);await assert.rejects(service.prepare('localization_job.pull_request',input,{}),{code:'delivery_base_changed'});fixture.artifactCommit=sha;
  fixture.artifactSource='Different';await assert.rejects(service.prepare('localization_job.pull_request',input,{}),{code:'delivery_source_unproven'});fixture.artifactSource='Hello';
  await assert.rejects(service.prepare('localization_job.pull_request',{...input,bundlePaths:['.github/workflows/code.json']},{}),{code:'delivery_paths_invalid'});
  fixture.repoId=999;await assert.rejects(service.prepare('localization_job.pull_request',input,{}),{code:'repository_identity_changed'});fixture.repoId=123;
  fixture.token=null;await assert.rejects(service.prepare('localization_job.pull_request',input,{}),{code:'delivery_github_required'});fixture.token='synthetic-token';
  fixture.push=false;await assert.rejects(service.prepare('localization_job.pull_request',input,{}),{code:'delivery_github_required'});
  fixture.denied=true;await assert.rejects(service.prepare('localization_job.pull_request',input,{}),/denied/);
});
