// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalProjectLocale, localeAddition } from '../src/project-locales.js';
import { PROJECT_LOCALE_ACTIONS } from '../src/project-locales-actions.js';
test('adding locales canonicalizes codes, preserves existing keys and re-enables without duplicating', () => {
  const result = localeAddition('en_US', [{ locale: 'fr', enabled: true }, { locale: 'pt_BR', enabled: false }], ['pt-br', 'fr', 'ja', 'pt_BR']);
  assert.deepEqual(result, { before: ['fr'], after: ['fr', 'ja', 'pt_BR'], additions: ['ja', 'pt-BR'], writes: ['ja', 'pt_BR'] });
  assert.equal(canonicalProjectLocale(' zh_hant '), 'zh-Hant');
  assert.deepEqual(localeAddition('en', [{ locale: 'fr_CA', enabled: true }], ['fr-CA']).writes, []);
});
test('source language aliases and malformed codes fail before any write', () => {
  assert.throws(() => localeAddition('en-US', [], ['en_us']), e => e.code === 'source_locale_conflict');
  for (const value of ['', '../fr', '<script>', 'fr, de']) assert.throws(() => canonicalProjectLocale(value), e => e.code === 'invalid_locale');
  assert.equal(PROJECT_LOCALE_ACTIONS[1].permission, 'locales.manage');
  assert(!PROJECT_LOCALE_ACTIONS.some(a => a.name.includes('confirm')));
});
