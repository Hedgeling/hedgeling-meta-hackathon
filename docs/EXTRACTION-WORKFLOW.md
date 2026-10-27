# GitHub source extraction and catalog import

This event-created workflow connects the existing authenticated console to the separately hosted private engine. The new action definitions, orchestration, artifact validation, migration, and browser components live in this repository. The existing host supplies identity, permissions, proposals, transactions, entitlements, metering, and its catalog importer. Those product implementations are not distributed here.

## User experience

1. Choose the project's organization in chat, or open the project's **Source extraction** panel in the workspace.
2. Discover the repositories an operator has explicitly connected to that project. Select a branch/tag/commit and source paths within its allowed roots.
3. Review the repository, revision, paths, source language, and hosted processing disclosure. **Start extraction** is the first human confirmation.
4. Follow progress and inspect the resulting commit and a bounded source-string sample. The confirmed background job continues if chat is paused. No strings have been imported yet.
5. Choose **Review import**. Inspect counts of new, updated and unchanged source fields and the managed-string/source-processing usage disclosure.
6. **Import source strings** is a separate human confirmation. The import preserves existing translations and strings absent from the extracted catalog. It refreshes extracted context metadata. It neither translates nor writes to GitHub.

Chat uses the host's conversational approval cards. Manual UI uses its separate review/edit/cancel controls. The new progress component refreshes after import. Repository content is displayed as text, never executed as HTML or treated as agent instructions.

## Shared API and MCP

| Action | MCP tool | Behavior |
| --- | --- | --- |
| `extraction.connections` | `console_list_source_connections` | Discover project-bound sources |
| `extraction.start` | `console_propose_extraction` | Prepare extraction approval; does not start a job |
| `extraction.jobs` | `console_list_extractions` | Paginated project history |
| `extraction.get` | `console_get_extraction` | Current job state and bounded catalog sample |
| `extraction.import` | `console_propose_extraction_import` | Prepare catalog import approval; does not import |

The host exposes these through its existing `/api/actions/:action` route and both MCP adapters. They share strict input schemas and project authorization. There is no MCP approval tool. Only the authenticated person can use the host's existing confirmation route. Creating a proposal requires a named active user; service-only credentials are not a substitute for that identity. External clients also need the existing `agent_domain` token scope. Chat does not gain broader permissions than manual use.

`EXTRACTION_SKILL` guides discovery, missing-detail questions, exact source selection, the two approval steps, status checks, and source-content handling. The server enforces the boundary even if the model ignores those instructions.

## Server integration

`createExtractionWorkflow` accepts host adapters for database queries, authorization, entitlement checks, canonical fingerprints, a private engine client, and transactional catalog import. It requires `strings.view` and `imports.run` on the selected project. A conversation's organization must match that project. An operator provisions a connection ID, numeric repository ID, owner/name, allowed roots and default ref in `extraction_connections`; the model cannot provision or widen it.

The existing host prepares and fingerprints immutable proposals. Confirmation rechecks identity, permissions, connection and source-catalog state. A stale preview must be reviewed again. A job ID is only accessible through its linked project and current unchanged connection. Import checks artifact schema, repository ID, pinned source commit and source language before converting known source-only fields for the existing importer.

Private job creation uses a stable idempotency key derived from the proposal ID. A lost acknowledgement can be retried using the same confirmation without creating a second remote job. Import, usage reservation/settlement, audit record and proposal result commit in the same host database transaction. Confirmed results can be replayed without repeating the operation; current access is checked again.

`engineClient` and the offline verification harness remain read-only. `engineOperations` is a separate server adapter for the authorized production workflow. `HEDGELING_ENGINE_URL` and `HEDGELING_ENGINE_TOKEN` must be configured server-side; no private endpoints or tokens enter browser configuration or model prompts. Extraction code is deployed only in the separate private service.

Run `node scripts/vendor-integration.mjs /absolute/path/to/web-console` from a clean committed checkout to copy the event modules, migration and UI components into the existing integration workspace. The script records revision, hashes, license and dirty state. Host glue and the importer remain outside this repository; installing this repo alone does not install that product. Apply the migration through the host's normal runner. The host's operator-only `seed-extraction-demo.js` can establish a dedicated synthetic project in the isolated demo database using an explicitly supplied verified GitHub connection. It never starts processing or grants additional user roles.

## Bounds and deliberate limits

| Area | Current bound |
| --- | --- |
| Source selection | 1–20 literal relative paths within operator-approved roots; no traversal or glob syntax |
| Engine processing | 1,000 files, 1 MiB per file, 20 MiB total source; five-minute processing deadline |
| Revision | A branch/tag is pinned when processing starts; use a full commit SHA when exact revision selection is required |
| Retention | Private job/catalog expires after up to seven days; expired jobs require a new extraction |
| Import | At most 10,000 entries, bounded metadata, 21 MiB artifact response; plan/resource caps also apply |
| Preview | First five strings, each truncated to 300 characters; clearly labeled sample |
| History | Default 25, maximum 100 per page; manual UI uses five; `nextOffset` signals more |
| Progress | Every three seconds for up to 120 polls; manual refresh remains available |
| Network | Bounded response sizes and 45-second request timeout; processing itself is asynchronous |

There is no automatic retry with broader paths, repository-write tool, cancellation UI, prune/delete, automatic translation, or publication in this milestone. GitHub connection management is operator-only. A revoked or changed connection blocks old jobs as well as new requests. Long-lived extraction history and richer context/diff browsing can be added separately.

## Verification

Public unit tests exercise catalog provenance/schema/path bounds, source-only conversion, summaries, idempotency headers and tool definitions. Existing-host integration tests exercise authorization, wrong/stale previews, two approvals, lost acknowledgement and concurrent retry, corrupted artifacts, cross-project job access, cap failures with rollback, preserved human translations, one import/usage event, and revoked connections. Browser tests use a synthetic HTTPS service and deterministic provider to exercise the actual chat/MCP and manual confirmation paths. These are labeled fixtures, not proof of live Meta inference. Live deployment results belong in [VERIFICATION.md](VERIFICATION.md).
