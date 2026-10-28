// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAT_LIMITS, chatRequestBudget } from '../src/chat-limits.js';
test('long chat requests pass the previous limit with conservative output headroom', () => {
  const budget = chatRequestBudget({ input: 'x'.repeat(200000), tools: [{ name: 'fixture' }] });
  assert.ok(budget.requestBytes > 100000);
  assert.equal(budget.reservedTokens, budget.requestBytes + CHAT_LIMITS.outputTokens);
});
test('the request bound counts UTF-8 bytes, including structured tool and replay state', () => {
  assert.equal(chatRequestBudget('x'.repeat(CHAT_LIMITS.requestBytes - 2)).requestBytes, CHAT_LIMITS.requestBytes);
  for (const body of ['x'.repeat(CHAT_LIMITS.requestBytes - 1), { tools: [{ description: '界'.repeat(260000) }] }, { encryptedReplay: 'x'.repeat(750000) }]) {
    assert.throws(() => chatRequestBudget(body), e => e.status === 400 && e.code === 'agent_context_limit');
  }
});
