// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { githubSource, repositoryUrl, safeSourcePath, recommendRoots } from '../src/github-source.js';
import { githubIdentity } from '../src/github-identity.js';
import { createRepositories } from '../src/repositories.js';
const commit='1'.repeat(40),treeSha='2'.repeat(40),content='export const Greeting = () => <p>Hello, traveler!</p>;',size=Buffer.byteLength(content);
const sha=createHash('sha1').update(`blob ${size}\0`).update(content).digest('hex');
const file={path:'src/code-goblin/Greeting.tsx',type:'blob',mode:'100644',sha,size};
function fixture({privateRepo=false,override=()=>null}={}){
  const calls=[];
  const github=githubSource({fetchImpl:async(url,options)=>{
    assert.equal(new URL(url).origin,'https://api.github.com');assert.equal(options.redirect,'error');calls.push({url,options});
    const altered=override(url,options);if(altered)return altered;
    if(privateRepo&&options.headers.Authorization!=='Bearer user-token')return new Response('not found',{status:404});
    let value;
    if(url.includes('/commits/'))value={sha:commit,commit:{tree:{sha:treeSha}}};
    else if(url.includes('/git/trees/'))value={truncated:false,tree:[file,{...file,path:'.env.json'},{...file,path:'node_modules/dependency.ts'},{...file,path:'src/link.ts',mode:'120000'}]};
    else if(url.includes('/git/blobs/'))value={encoding:'base64',content:Buffer.from(content).toString('base64')};
    else if(url.includes('/branches?'))value=Array.from({length:url.endsWith('page=1')?50:1},(_,i)=>({name:'branch-'+i,commit:{sha:commit}}));
    else value={id:42,private:privateRepo,default_branch:'main'};
    return Response.json(value);
  }});
  return {github,calls};
}
test('public discovery needs no credential; snapshot pins and verifies source without including credentials',async()=>{
  const {github,calls}=fixture();const repo=await github.resolve('https://github.com/example/game.git');
  assert.equal(repo.visibility,'public');assert.equal(repo.defaultRef,'main');
  const tree=await github.tree(repo,'feature/code-game');assert.deepEqual(tree.files,[file]);
  assert(calls.some(c=>c.url.endsWith('/commits/feature%2Fcode-game')));
  assert.deepEqual(recommendRoots(tree.files,'only Code Goblin game'),[file.path]);
  const snapshot=await github.snapshot(repo,commit,['src']);assert.deepEqual(snapshot,{commitSha:commit,bytes:size,files:[{path:file.path,blobSha:sha,content}]});
  assert(calls.every(c=>!c.options.headers.Authorization));
  assert.equal((await github.branches(repo,1)).nextPage,2);assert.equal((await github.branches(repo,2)).nextPage,null);
});
test('private discovery requires the caller token; expired authentication can only fall back to public reads',async()=>{
  const {github,calls}=fixture({privateRepo:true});
  await assert.rejects(github.resolve('https://github.com/example/game'),e=>e.code==='github_access_required');
  const repo=await github.resolve('https://github.com/example/game',async()=>'user-token');
  const snapshot=await github.snapshot(repo,commit,['src']);
  assert(calls.slice(1).every(c=>c.options.headers.Authorization==='Bearer user-token'));assert(!JSON.stringify(snapshot).includes('user-token'));
  const expired=fixture({override:(_url,o)=>o.headers.Authorization?new Response('revoked',{status:401}):null});
  assert.equal((await expired.github.resolve('https://github.com/example/game',async()=>'expired')).visibility,'public');
});
test('source boundaries reject URL redirection, unsafe paths, incomplete trees, oversized scopes and corrupt blobs',async()=>{
  for(const url of ['http://github.com/o/r','https://github.com.evil.test/o/r','https://name:password@github.com/o/r','https://github.com/o/r/tree/main','https://github.com/o/r?token=secret'])assert.throws(()=>repositoryUrl(url));
  for(const path of ['../src','src/../secret','.env','src\\a.ts','src/secrets.json','src/*.tsx'])assert(!safeSourcePath(path));
  const {github}=fixture();const repo=await github.resolve('https://github.com/o/r');
  assert.throws(()=>github.select({files:Array.from({length:101},(_,i)=>({...file,path:`src/${i}.tsx`}))},['src']),e=>e.code==='repository_source_limit');
  assert.throws(()=>github.select({files:[file]},['missing']),e=>e.code==='repository_empty_root');
  const incomplete=fixture({override:url=>url.includes('/git/trees/')?Response.json({truncated:true,tree:[file]}):null});
  await assert.rejects(incomplete.github.tree(repo,'main'),e=>e.code==='repository_tree_limit');
  const corrupt=fixture({override:url=>url.includes('/git/blobs/')?Response.json({encoding:'base64',content:Buffer.from('corrupt').toString('base64')}):null});
  await assert.rejects(corrupt.github.file(repo,file),e=>e.code==='source_integrity');
});
test('repository authorization happens before GitHub; config missing is distinct from access denied',async()=>{
  const {github,calls}=fixture();let allowed=false;const p={id:'p',slug:'demo',organizationId:'org'};
  const repositories=createRepositories({database:{query:async()=>({rows:[p]})},github,identity:{token:async()=>null},authorize:async()=>{if(!allowed)throw new Error('denied');},fingerprint:JSON.stringify});
  await assert.rejects(repositories.read('repositories.inspect',{projectSlug:'demo',url:'https://github.com/o/r'},{},{}),/denied/);assert.equal(calls.length,0);
  allowed=true;await assert.rejects(repositories.read('repositories.inspect',{projectSlug:'demo',url:'https://github.com/o/r'},{},{organizationId:'other'}),e=>e.code==='agent_scope_mismatch');assert.equal(calls.length,0);
  const result=await repositories.read('repositories.inspect',{projectSlug:'demo',url:'https://github.com/o/r'},{},{});assert.equal(result.commitSha,commit);assert(!Object.hasOwn(result.repository,'token'));
  for(const status of [401,403,404]){
    const mock=fixture({override:url=>url.includes('/contents/')?new Response('private upstream response',{status}):null});
    const service=createRepositories({github:mock.github,identity:{token:async()=>null}});
    const call=()=>service.configuration({owner:'o',repository:'r',repositoryId:42},'main','.hedgeling/extract.config.json',{});
    if(status===404)assert.equal((await call()).found,false);else await assert.rejects(call(),e=>e.code==='github_access_required'&&!e.message.includes('private upstream'));
  }
});
test('config inspection accepts bounded JSON but rejects a symlink even if GitHub resolves its target',async()=>{
  const path='.hedgeling/extract.config.json',text=JSON.stringify({excludeFields:['debug'],translation:{ignored:true}}),size=Buffer.byteLength(text),sha=createHash('sha1').update(`blob ${size}\0`).update(text).digest('hex');
  for(const mode of ['100644','120000']){
    const mock=fixture({override:url=>url.includes('/git/trees/')?Response.json({tree:[{path,type:'blob',mode,size,sha}]}):url.includes('/contents/')?Response.json({type:'file',size,sha}):url.includes('/git/blobs/')?Response.json({encoding:'base64',content:Buffer.from(text).toString('base64')}):null});
    const service=createRepositories({github:mock.github,identity:{token:async()=>null}});
    const call=()=>service.configuration({owner:'o',repository:'r',repositoryId:42},'main',path,{});
    if(mode==='120000')await assert.rejects(call(),/symlink/);else {const result=await call();assert.deepEqual(result.settings,{excludeFields:['debug']});assert.deepEqual(result.ignoredFields,['translation']);}
  }
});
test('GitHub OAuth uses user-bound single-use state and PKCE; only encrypted credentials are stored',async()=>{
  const states=new Map(),users=new Map(),envelopes=new Map();let sequence=0,exchanges=0;
  const encrypt=(value,user)=>{const envelope={id:++sequence,user};envelopes.set(envelope.id,value);return envelope;};
  const decrypt=(value,user)=>{assert.equal(value.user,user);return envelopes.get(value.id);};
  const database={query:async(sql,args)=>{
    if(sql.startsWith('delete from github_oauth_states where user_id')){for(const [k,v]of states)if(v.user_id===args[0])states.delete(k);return{rows:[]};}
    if(sql.startsWith('insert into github_oauth_states')){states.set(args[0],{user_id:args[1],verifier:args[2],redirect_uri:args[3]});return{rows:[]};}
    if(sql.startsWith('delete from github_oauth_states where state_hash')){const v=states.get(args[0]);if(v?.user_id!==args[1])return{rows:[]};states.delete(args[0]);return{rows:[v]};}
    if(sql.startsWith('insert into github_user_connections')){users.set(args[0],{login:args[2],credential:args[3],expires_at:args[4]});return{rows:[]};}
    if(sql.startsWith('select '))return{rows:users.has(args[0])?[users.get(args[0])]:[]};
    if(sql.startsWith('delete from github_user_connections')){users.delete(args[0]);return{rows:[]};}throw new Error('unexpected query');
  }};
  const auth={user:{id:'alice'}},other={user:{id:'bob'}};
  const configuration=()=>({clientId:'test-client',clientSecret:'test-secret',redirectUri:'http://127.0.0.1:8088/api/github/callback',local:true});
  let challenge;
  const identity=githubIdentity({database,encrypt,decrypt,configuration,github:{request:async(path,token)=>{assert.equal(path,'/user');assert.equal(token,'user-token');return{id:123,login:'alice'};}},fetchImpl:async(url,options)=>{
    exchanges++;assert.equal(url,'https://github.com/login/oauth/access_token');const data=JSON.parse(options.body);assert.equal(data.client_secret,'test-secret');assert.equal(createHash('sha256').update(data.code_verifier).digest('base64url'),challenge);return Response.json({access_token:'user-token',expires_in:28800});
  }});
  const url=new URL((await identity.start(auth)).url);challenge=url.searchParams.get('code_challenge');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert(!url.href.includes('test-secret'));
  const input={state:url.searchParams.get('state'),code:'valid-code'};
  await assert.rejects(identity.complete(other,input),e=>e.code==='github_oauth_invalid');assert.equal(exchanges,0);
  const complete=await identity.complete(auth,input);assert.equal(complete.login,'alice');assert(!JSON.stringify(complete).includes('user-token'));assert(!JSON.stringify([...users]).includes('user-token'));
  await assert.rejects(identity.complete(auth,input),e=>e.code==='github_oauth_invalid');assert.equal(exchanges,1);
  assert.equal(await identity.token(auth),'user-token');assert.equal(await identity.token(other),null);
  await identity.disconnect(auth);assert.equal(await identity.token(auth),null);
});
