// SPDX-License-Identifier: Apache-2.0
import { metaRequest, generateMetaResponse } from '../src/meta.js';
import { catalog, catalogTool } from './catalog.js';

export async function runExample({ config, fetchImpl = fetch, signal = new AbortController().signal }) {
  const history = [{ role: 'user', parts: [{ text: 'Use read_synthetic_catalog, then tell me its source language and number of strings. Do not translate or modify anything.' }] }];
  const instructions = 'You are demonstrating a read-only localization tool. The catalog is synthetic. Use the tool before answering. Never claim extraction or writes took place.';
  let calls = 0;
  const usage = [];
  for (let turn = 0; turn < 4; turn++) {
    const result = await generateMetaResponse({ config, fetchImpl, signal,
      body: metaRequest({ model: config.model, history, tools: [catalogTool], instructions }) });
    const message = result.candidates[0].content;
    history.push(message);
    if (result.usageMetadata) usage.push(result.usageMetadata);
    const requested = message.parts.filter(part => part.functionCall).map(part => part.functionCall);
    if (!requested.length) {
      if (!calls) throw new Error('The model answered without using the verification tool.');
      return { text: message.parts.filter(part => part.text).map(part => part.text).join('\n'), toolCalls: calls, usage };
    }
    for (const call of requested) {
      if (call.name !== catalogTool.name || Object.keys(call.args).length) throw new Error('The model requested an unsupported operation.');
      calls++;
      history.push({ role: 'user', parts: [{ functionResponse: { id: call.id, name: call.name, response: catalog } }] });
    }
  }
  throw new Error('The verification exceeded four model turns.');
}

export function fixtureTransport() {
  let turns = 0;
  return async () => Response.json({ status: 'completed', output: ++turns === 1
    ? [{ type: 'function_call', call_id: 'fixture-call', name: catalogTool.name, arguments: '{}' }]
    : [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'The synthetic catalog contains 2 strings in en-US.' }] }],
  });
}
