// SPDX-License-Identifier: Apache-2.0
// Authored for this repository. This data was not extracted from an application.
export const catalog = Object.freeze({
  sourceLocale: 'en-US',
  strings: [{ key: 'welcome', source: 'Welcome aboard' }, { key: 'save', source: 'Save your draft' }],
});
export const catalogTool = Object.freeze({
  name: 'read_synthetic_catalog',
  description: 'Read the explicitly synthetic demonstration catalog. No repository or account access.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
});
