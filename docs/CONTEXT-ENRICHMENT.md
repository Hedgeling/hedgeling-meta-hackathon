# Translator context enrichment

Event-created API/MCP operations and review UI generate translator descriptions from imported source strings, nearby code and available UI metadata. This is separate from extraction tuning: tuning changes what gets extracted; enrichment explains strings that were already imported. No extraction implementation is included here.

## Workflow

1. Import a catalog. The separately operated extractor can attach bounded source excerpts from its pinned snapshot. Older catalogs or document imports may contain metadata only; the UI and approval preview disclose that limitation.
2. In Projects, open **Context · descriptions and length suggestions**, then **Browse string context**. Select up to 20 strings or request the next batch without current accepted context. The assistant exposes the same actions through MCP.
3. Preview **Generate context suggestions**. Human confirmation authorizes one request using the organization's selected Meta/Gemini BYOK provider and model. It also saves the generated suggestions for review. There is no inference during preview, and no automatic retry after an ambiguous response.
4. Review descriptions, evidence, confidence and optional character-count suggestions. Select results and confirm **Accept selected context** separately.
5. Subsequent translation/revision previews include accepted, current context. Existing translations are preserved. Changing source text, code evidence, source language or explicit constraints invalidates the accepted guidance; stale guidance is excluded from translation prompts until regenerated and accepted.

Chat uses the managed chat key. Enrichment uses the organization's translation/context key, meters token usage and obeys platform usage budgets. Missing keys/plans fail explicitly. Managed enrichment credits and independent context-model selection are not implemented.

## Character limits

Enrichment can suggest a soft maximum and explain its reasoning, or return no number. Suggestions use Unicode code points and remain advisory in translation prompts. They never replace `limit_chars`, create a validation failure, override existing constraints or guarantee rendered fit. Explicit stored limits retain their existing validation semantics. Do not infer a label's limit from an adjacent input's `maxlength`.

An LLM can interpret UI intent and ambiguity, while renderer measurements and explicit product requirements establish real constraints. A formula may remain useful as a fallback estimate; neither a formula nor an LLM proves fit across languages, fonts, placeholders and viewports. See [W3C text-size guidance](https://www.w3.org/International/articles/article-text-size.en).

## Bounds and permissions

- One batch: at most 20 strings, four stored context variants per string, 65,536 prompt bytes and 8,192 output tokens; one provider request, no automatic fallback or retry.
- Optional source-evidence adapter: at most two excerpts per string, seven lines and 2,048 UTF-8 bytes per excerpt, 256 KiB across a catalog. Oversized excerpts are omitted rather than silently cut. It reads only the provided snapshot, never arbitrary paths.
- String/run listings: 20 items per page. Automatic missing-context selection scans at most 1,000 strings; beyond that, choose an explicit batch through the paginated list.
- Requires a named active user, project source-view access, and import permission for generation/acceptance. Generation also requires active AI/BYOK access. Scope, inputs and provider settings are checked again before dispatch and before saving results.
- Writes remain server-authenticated human confirmations. Source comments, filenames and model output are untrusted data. The agent cannot confirm a proposal.
- Interrupted requests become uncertain without redispatch. Already confirmed inference continues when chat is paused. There is no mid-request cancellation in this version.
- Project content purge removes run snapshots and accepted context. Normal conversation deletion preserves accepted project guidance.

## Verification and provenance

`test/context.test.js` checks excerpt bounds, catalog conversion, prompt limits, data-shape normalization and invalid model results. The host's context integration and browser suites exercise two approvals, idempotency, authorization, freshness, usage accounting and context in translation prompts. The private adapter is exercised separately against its real extractor with synthetic source. `examples/source/ContextWorkshop.tsx` is an event-created local test fixture, not customer source.

Local development does not deploy the feature. Hosted code excerpts require deploying the private adapter change, then re-extracting and importing a catalog; prior catalogs do not gain code excerpts automatically. All new shared implementation lives in this event repository; host integration retains the existing product license.
