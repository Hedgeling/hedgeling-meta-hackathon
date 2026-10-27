# Provenance and extraction boundary

The owner confirmed October 26, 2026 as the event-work start date. The observed source commits below were created after the published October 26 noon ET kickoff. Their dates support the record; timestamps alone do not prove when code was authored.

The initial public platform commit `589a444c3856319b09f19c888194723fec77a363` is explicitly a pre-existing-code snapshot even though its commit date is October 26. It and all of its product files are excluded. The existing chat, approval cards, console, design assets, platform API, and older MCP client/server are not new work.

## Extracted event work

| Public file | Source | Review and adaptation |
| --- | --- | --- |
| `src/meta.js` | New `packages/web-console/src/agent-meta.js`, first introduced in `eef24e7a0e27d8ce829c47d73e9310eb142f0a9b` at 2026-10-26T15:40:10-06:00 | Only event-created request/response conversion is retained. The old console helper dependency and original transport were removed; fresh standalone error/configuration/HTTP modules replace them. |
| `contracts/engine.openapi.json` | New `packages/engine-api/openapi.json`, private commit `95b0c245601fc8b197da700f485e20dfc14286fa` at 2026-10-26T18:32:21-06:00 | Reviewed interface only. No engine implementation, live server URLs, credentials, or customer data. Owner-approved Apache licensing applies to this public contract copy. |

All remaining application code, examples, tests, CI, and submission documentation were written for this extract during the event. The example catalog is authored synthetic content. No prior mascot, logo, font, stylesheet, application scaffold, database schema, or migration is copied here. The standard Apache license text is an explicitly attributed pre-existing legal text, not a claimed contribution.

[provenance.json](provenance.json) records each distributed file and its digest/origin. [hosted-changes.json](hosted-changes.json) inventories all event changes in the existing workspaces, with commit timestamps, status, content hashes and added-line ranges, without reproducing older source. Private commit references are evidence identifiers, not a promise of public access to that repository.

## Maintaining the boundary

For a new file, record whether it was authored during the event, extracted from identified event work, or is a declared third-party dependency. Review the actual source, not just the commit date. A modified pre-event file cannot be copied wholesale; independently extract the new behavior and implement any necessary new scaffold during the event.

After reviewing changes, update the relevant records and SHA-256 digests in `provenance.json`. That manifest has a self-record instead of a recursive digest. Run `npm run check` before every push. The checker detects undocumented edits, known excluded file hashes, selected credential/infrastructure patterns, unexpected dependencies, and imported history roots. It cannot prove authorship, identify every copied fragment, or guarantee eligibility.

The excluded hash inventory is derived from pre-event product files. It distributes hashes only, not proprietary implementation. Do not merge, cherry-pick, or fetch private product history into this repository. Its first commit is a genuine new root with normal timestamps; the original history is preserved in its own workspace.
