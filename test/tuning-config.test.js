// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { tuningSettings, tuningConfigPath } from '../src/tuning-config.js';
test('config reads expose supported data without copying provider settings, credentials or programs', () => {
  assert.deepEqual(tuningSettings({ excludeCallees:['debug','debug'], translation:{key:'synthetic-secret'}, plugin:'program.js' },{strict:false}),{settings:{excludeCallees:['debug']},ignoredFields:['translation','plugin']});
  for(const value of [null,[],{excludeFields:'bad'},{excludeFields:['']},{excludeFields:['x'.repeat(257)]},{excludeFields:Array(101).fill('x')},{sourceLocale:'fr'},JSON.parse('{"__proto__":{}}')]) assert.throws(()=>tuningSettings(value));
  assert.throws(()=>tuningSettings({excludeFields:Array.from({length:100},(_,i)=>String(i)+'x'.repeat(100))}));
  for(const path of ['.hedgeling/extract.config.json','src/.hedgeling/extract.config.json']) assert(tuningConfigPath(path));
  for(const path of ['../.hedgeling/extract.config.json','/tmp/.hedgeling/extract.config.json','.env','src/config.js','src\\.hedgeling/extract.config.json']) assert(!tuningConfigPath(path));
});
