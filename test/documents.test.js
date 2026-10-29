// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument } from '../src/document-parser.js';
import { processDocument } from '../src/document-processing.js';
import { wordDocument, textPdf } from './document-fixtures.js';

test('UTF-8 document sections remain ordered; no execution or silent truncation', async () => {
  const d = await parseDocument({ filename: 'guide.md', bytes: Buffer.from('# Welcome\n\nHello {name}\n\n<script>bad()</script>') });
  assert.deepEqual(d.segments.map(s => s.text), ['# Welcome', 'Hello {name}', '<script>bad()</script>']);
  await assert.rejects(parseDocument({ filename: 'large.md', bytes: Buffer.from('Text\n\n'.repeat(201)) }), /200 text sections/);
  await assert.rejects(parseDocument({ filename: '../guide.md', bytes: Buffer.from('Hi') }), /filename/);
  await assert.rejects(parseDocument({ filename: 'broken.md', bytes: new Uint8Array([255]) }), /UTF-8/);
  await assert.rejects(parseDocument({ filename: 'script.js', bytes: Buffer.from('Hi') }), /Supported files/);
});
test('DOCX reads ordered paragraphs and table cells without deleted text', async () => {
  const bytes = wordDocument('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello </w:t></w:r><w:r><w:t>world</w:t></w:r><w:del><w:r><w:t>deleted</w:t></w:r></w:del></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Table &amp; text</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>');
  const d = await parseDocument({ filename: 'guide.docx', bytes });
  assert.deepEqual(d.segments.map(s => s.text), ['Hello world', 'Table & text']);
  assert.match(d.warnings[0], /Headers, footers/);
  await assert.rejects(parseDocument({ filename: 'bad.docx', bytes: wordDocument('<!DOCTYPE x [<!ENTITY a "b">]><x/>') }), /entities/);
});
test('PDF selectable text, page limits, and scans are explicit', async () => {
  const d = await parseDocument({ filename: 'guide.pdf', bytes: textPdf() });
  assert.equal(d.segments[0].text, 'Welcome to the demo');
  await assert.rejects(parseDocument({ filename: 'scan.pdf', bytes: textPdf('') }), /no readable text/);
  await assert.rejects(parseDocument({ filename: 'large.pdf', bytes: textPdf('Page', 31) }), /30 pages/);
});
test('the isolated worker returns parsed text and safe errors', async () => {
  const d = await processDocument({ filename: 'guide.pdf', bytes: textPdf('Isolated document') });
  assert.equal(d.segments[0].text, 'Isolated document');
  await assert.rejects(processDocument({ filename: 'bad.docx', bytes: Buffer.from('bad') }), /could not be read/);
});
