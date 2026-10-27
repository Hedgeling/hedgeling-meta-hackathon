// SPDX-License-Identifier: Apache-2.0
import { engineReader } from '../src/engine-client.js';

try {
  const client = engineReader({ url: process.env.HEDGELING_ENGINE_URL, token: process.env.HEDGELING_ENGINE_TOKEN });
  const capabilities = await client.capabilities();
  const page = await client.connections();
  console.log(JSON.stringify({ capabilities, connectionCountOnPage: page.connections.length,
    total: page.total, nextOffset: page.nextOffset }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
