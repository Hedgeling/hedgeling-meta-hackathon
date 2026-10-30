# Document uploads and translation delivery

The document workflow turns uploaded text into a localization job scoped to that document. The event-created parser, API/MCP actions, approval orchestration and browser components use the existing hosted product for authentication, source import, billing limits, translation execution and review. General document parsing uses the public libraries declared in LICENSING.md. The proprietary extraction engine is not required by this workflow.

## User flow

Upload from **Projects → Documents** or **Upload document** in chat. Choose a project whose source language matches the document. Inspect the extracted sections and warnings, then choose enabled target languages and a job name. The manual form and `documents.job` share an immutable preview: confirmation imports the document sections and creates a draft. Existing project content is preserved. Starting translation is a separate confirmation showing the organization’s selected provider and execution bounds. It authorizes generated draft saves, not review approval or publishing.

Chat uploads do not send an automatic message. **Discuss this document in chat** inserts its server-issued ID and project into the composer. On sending, the agent can read extracted sections through the API; those sections enter the chat provider context. Text, filenames and document instructions are untrusted data. Translation uses the project’s Library guidance and organization translation provider, independently of the chat provider.

## Formats and limits

| Input | Extracted content | Limits and omitted content |
| --- | --- | --- |
| UTF-8 Markdown or TXT | Text blocks in original order | This is text translation, not a Markdown syntax-preserving conversion. Code and markup remain part of the extracted text. |
| DOCX | Main-body paragraphs and table-cell text in document order | No headers, footers, comments, images, deleted text or original Word layout. |
| PDF | Selectable text in parser reading order, labeled by page | No OCR, image translation or layout preservation. Any page with no readable text rejects the upload, including blank pages. Password-protected or malformed documents are rejected. |

Uploads are limited to 5 MiB, 120,000 text characters, 200 sections of at most 3,000 characters, and 30 PDF pages. DOCX expansion is limited to 10 MiB and 2,000 ZIP entries. Parsing runs in a worker with a 20-second timeout, 192 MiB old-generation and 32 MiB young-generation JS heap bounds. Two parsers may run per server process. These JS bounds are not a whole-process memory guarantee. The upload route is rate limited; a project admits at most 30 pending/recent uploads (pending uploads plus imports created in the past day).

Only normalized text and metadata persist; original binary files are discarded after parsing. Unimported previews expire after seven days and are removed on a subsequent upload into that project. Imported sections persist with the project and participate in its data-lifecycle purge. Reuploading identical bytes by the same user into the same project returns the existing document ID.

## Shared operations

| Operation | Purpose |
| --- | --- |
| `POST /api/documents/upload?project=<slug>` | Authenticated binary upload, with `Content-Type: application/octet-stream` and URL-encoded filename in `X-Document-Name`. Stores a preview only. |
| `documents.list` | Project documents, 20 per page with opaque document-ID continuation. |
| `documents.get` | Metadata, warnings and 20 sections per page; `nextOffset` identifies more sections. |
| `documents.job` | Human-confirmed import plus file-scoped job draft. |
| `localization_job.start` | Existing human-confirmed translation execution. Document jobs default to all missing pairs up to 10,000; explicit smaller batches are honored. |
| `documents.export` | Permission-checked TXT or bilingual CSV file card for one job locale. |
| `GET /api/documents/jobs/<id>/download` | Reauthorizes download and rejects a stale content version. |

Models cannot approve proposals. Read/propose/export actions are also MCP tools. External clients upload bytes through the authenticated HTTP route and give the resulting document ID to the agent; binary payloads are not placed in tool arguments. Download references are relative to the configured console API, never private upstream endpoints or public bearer URLs.

## Selection and delivery

Document sections have stable document-specific source hashes. Jobs snapshot only those source IDs; adding unrelated project content does not invalidate or expand a document job. Changes to selected source text or provider/Library guidance invalidate the relevant start preview. Existing translations are preserved.

Translation execution remains limited to 200 missing source/language pairs per approved batch. Larger multilingual documents require additional jobs referencing the same uploaded document; those batches skip existing translations. Progress reports the uncovered pairs. A finished batch does not establish that the whole document is translated.

Downloads use the current saved translations in document order. **Approved only** requires every section to be verified. **Drafts for review** must be explicitly selected and still rejects missing or rejected translations. No untranslated source is silently substituted. TXT contains translated sections separated by blank lines; CSV includes section, source, translation and review status, with spreadsheet-formula escaping. Content-versioned download links fail if translations change after the card was prepared.

## Verification

Synthetic parser tests cover all formats, malformed inputs, XML entity rejection, section/page limits and isolated-worker execution. Host integration tests exercise upload, idempotent confirmation, scoped translation, stale inputs, access revocation, export completeness, CSV formula escaping and the real MCP transport with a fixture chat provider. Browser tests cover manual and chat upload, approvals, progress, downloads and mobile layout. These tests do not claim live Meta inference or preserved document layout.

General config, diagnostics and reporting file exports remain a separate follow-up. This milestone introduces reusable file cards and document translation delivery.

## File-delivery roadmap

| Use case | Useful artifact | Delivery boundary |
| --- | --- | --- |
| Reuse extraction settings | Current supported config JSON, with project/source revision | Reuse existing authenticated config download; exclude credentials and private service addresses. |
| Investigate extraction/tuning | Structured diagnostics, rejected-candidate summary and before/after settings | Explain scope and completeness; omit private engine implementation, secrets and unnecessary source text. |
| Report progress | Locale coverage, review backlog, job/usage summary as CSV/JSON | Reuse account-wide reporting permissions and pagination; label filters, snapshot time and caps. |
| Exchange Library guidance | Locale personas, translation instructions and glossary CSV/JSON | Export only accessible project/locale assets; imports need validation, conflict preview and confirmation. |
| Hand off to a linguist | Bilingual review package, later XLIFF | Preserve stable source IDs and versions; reviewed-file import must detect conflicts and require approval. |
| Ship application content | Locale resource files or an injection patch | Separate export from repository writes; preserve the private engine boundary and require explicit publish/apply approval. |
| Deliver a translated document | Layout-preserving DOCX, later PDF/OCR | Add format-specific reconstruction and checks; do not relabel the current TXT/CSV output as a preserved original. |

Next, connect existing config/tuning downloads to chat file cards, then add filtered report exports. Use one server-owned artifact descriptor (name, format, size, source scope/version, draft/approved status and authenticated download reference) across UI and MCP. Generating a download does not publish it or grant access to another person. Imports follow inspect → resolve mapping/conflicts → preview → confirm, with model execution approved separately.
