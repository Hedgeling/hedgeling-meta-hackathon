// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { createContextEnrichment } from '../src/context-enrichment.js';

test('large summaries keep exact accepted/missing counts and report unavailable freshness instead of guessing', async () => {
  const p={id:'project',slug:'synthetic',sourceLocale:'en',organizationId:'org'};
  let authorized=0;
  const database={async query(sql){
    if(sql.startsWith('set transaction'))return {rows:[]};
    if(sql.startsWith('select p.id'))return {rows:[p]};
    if(sql.startsWith('select count'))return {rows:[{total:12000,accepted:10001}]};
    assert.fail('No content scan may exceed the summary bound.');
  }};
  const api=createContextEnrichment({database,transaction:fn=>fn(database),authorize:async()=>{authorized++;}});
  const result=await api.read('context.summary',{projectSlug:p.slug},{},{organizationId:'org'});
  assert.equal(authorized,2);
  assert.deepEqual(result.counts,{totalStrings:12000,withAcceptedContext:10001,withoutAcceptedContext:1999,currentContext:null,staleContext:null,needsContext:null});
  assert.equal(result.freshnessComplete,false); assert.match(result.notice,/unavailable/);
  await assert.rejects(api.read('context.summary',{projectSlug:p.slug},{},{organizationId:'other'}),{code:'agent_scope_mismatch'});
});
