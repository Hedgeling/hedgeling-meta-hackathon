// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderChatMarkdown } from '../ui/chat-markdown.js';

// Minimal DOM sink; actual DOM behavior and styling are covered by host browser tests.
const document = {
  createElement: tag => node(tag), createTextNode: text => node('#text', text),
  createDocumentFragment: () => node('#fragment'),
};
function node(localName, text = '') {
  return { localName, children: [], ownerDocument: document,
    append(...children) { this.children.push(...children); },
    set textContent(value) { this.children = [node('#text', value)]; },
    get textContent() { return text + this.children.map(child => child.textContent).join(''); },
  };
}
const find = (root, tag) => [root, ...root.children.flatMap(child => find(child, tag))].filter(n => n.localName === tag);

test('assistant emphasis becomes semantic bold and italic, including inside lists', () => {
  const result = renderChatMarkdown('## Next steps\n\n**Review *these* words**\n\n- **French** draft\n- __German__ draft\n\n1. Save\n2. Review', document);
  assert.deepEqual(find(result, 'strong').map(n => n.textContent), ['Review these words', 'French', 'German']);
  assert.equal(find(result, 'em')[0].textContent, 'these');
  assert.equal(find(result, 'h3')[0].textContent, 'Next steps');
  assert.equal(find(result, 'li').length, 4);
  assert.ok(!result.textContent.includes('**'));
});
test('model HTML, URLs and image syntax remain inert text; code keeps its literal markers', () => {
  const text = '**<img src=x onerror=alert(1)>**\n<script>alert(1)</script>\n[x](javascript:alert(1))\n\n`**literal**`\n\n```html\n**code** <svg onload=alert(1)>\n```';
  const result = renderChatMarkdown(text, document);
  for (const tag of ['img', 'script', 'svg', 'a']) assert.equal(find(result, tag).length, 0);
  assert.match(result.textContent, /<script>alert/);
  assert.deepEqual(find(result, 'code').map(n => n.textContent), ['**literal**', '**code** <svg onload=alert(1)>\n']);
});
test('unclosed emphasis and long messages retain their text without throwing', () => {
  const text = 'Unfinished **bold\n' + 'plain text '.repeat(10000);
  assert.equal(renderChatMarkdown(text, document).textContent, text.replace('\n', ''));
});
