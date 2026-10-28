# Agent Library workflow

The event-created Library service supplies shared actions for the existing console,
chat and MCP. Existing project prompt/persona/glossary storage and translation
revision execution remain labeled product dependencies. The event repository
contains only the new service, contracts, forms, tests and additive migration.

## User flow

Choose a project in Library, then Translation instructions, Personas or Glossary.
Create or edit an asset, review the exact changes, and confirm. The chat can read
existing guidance, ask for missing details, draft content, and prepare the same
preview. **Edit in Library** discards the old chat preview and opens its draft in
the form; editing never confirms a write. Confirmation either saves the asset or
submits a review suggestion, as stated in the card. Suggestions are visible under
**Suggestions awaiting review**. An authorized reviewer prepares an approval or
rejection and confirms it separately. No messages or notifications are sent.

Each glossary preview handles one term. CSV import, bulk term approval, automatic
terminology mining, sample-translation comparison, and organization-wide shared
libraries are future milestones. The agent can suggest terms based on explicit,
permission-scoped source searches now, with source IDs and partial coverage.

## Shared API and MCP

| API action | Purpose |
| --- | --- |
| `library.list`, `library.get` | Search summaries and read one full asset with its version and permissions |
| `library.sources` | Search bounded source examples without code/context snippets |
| `library.history` | Browse saved revisions |
| `library.prompt.save` | Preview project-wide translation instructions |
| `library.persona.save` | Preview locale voice; preserve unspecified/legacy fields |
| `library.glossary.save` | Preview a preferred translation or protected name |
| `library.restore` | Preview restoration of a revision's before or after content |
| `library.reviews`, `library.review` | Discover pending suggestions and preview acceptance/rejection |

Write tools only create previews. Human confirmation uses the existing authenticated
server decision route. No MCP tool can confirm its own proposal. Existing Library
HTTP write routes reject direct saves when the agent workspace API is enabled.
The new forms use the shared actions. Existing read endpoints remain compatible.

## Permissions and concurrency

Existing `prompts`, `personas` and `glossary` view/propose/approve/manage grants
are enforced for the project and the asset's locale. A propose grant allows a
human-confirmed review submission; approve/manage permits application. Merely
reading never grants either ability. Project-wide guidance requires project-wide
access. Locale changes require authority over both old and new scopes. Source
search separately requires source-reading permission. Conversation organization
scope is checked on every action.

Every edit carries its last-read version; null means creation. Confirmation
reauthorizes, locks the project/asset, and rebuilds the preview. Changed content,
changed rights or changed suggestion state invalidate the old preview. Replays
return the existing result after rechecking access; promotion never turns a
previously submitted suggestion into an applied change. History is append-only
through this API; restoring adds a revision. It includes the previous content for
assets first edited through this workflow. Earlier product history is not invented.

Tool schemas explicitly request JSON `null`, without quotes, for new assets.
Both MCP adapters repair the model's exact string `"null"` only in declared
nullable Library arguments (`expectedVersion` and optional/project-wide `locale`).
Guidance text and other values are preserved. The HTTP API remains strictly typed;
the adapted input still passes normal validation, authorization and version checks.
Using null when an asset already exists fails as stale; it cannot overwrite it.

The Library skill also treats earlier tool errors and assistant capability claims
as historical observations. When the person asks to proceed or retry, the agent
reads the current asset and prepares a fresh preview using the current schema.
It must not report a new tool failure without making a new attempt. A fresh input
format error may be corrected once; a stale version requires rereading, while
permission failures and missing user decisions stop execution. Conversation
history and human confirmation remain intact.

## Translation behavior

Active project instructions, the active target-locale persona and active applicable
glossary terms feed existing AI translation revisions. Guidance changes do not
regenerate, approve or publish existing translations. Revision snapshots include
the actual guidance plus asset identifiers, timestamps and content hashes. Managed
chat and organization translation-provider billing remain separate. Job drafts stay inert until a separate [translation-start approval](TRANSLATION-JOBS.md);
confirmed batches save drafts using this active guidance. The Library skill treats all asset/source contents
as translation data, never instructions to change agent authority.

## Bounds

List/history/review/source pages default to 25 and cap at 50, with opaque cursors
bound to the principal and query. Source snippets cap at 500 characters and report
truncation. Instruction text caps at 12,000 characters; each structured persona
field and glossary description at 2,000; glossary translations at 500. Interactive
asset payloads cap at 24 KB. Preferred translations require a locale; protected
names may be project-wide. New locale assets must use an enabled target language.
Duplicate active glossary terms in the same locale require editing the existing
term. Deactivation is reversible; hard deletion is not exposed by this workflow.

## Verification scope

Public unit tests exercise guidance preservation and terminology validation. Host
integration tests exercise API/MCP proposals, human confirmation, idempotency,
stale edits, history/restore, pagination, locale filtering, review submission,
reviewer permission and revocation. Browser tests exercise all three forms,
manual review/edit/cancel/save, history, agent attention, chat-to-form editing and
mobile layout. Synthetic Meta-provider tests check active guidance selection and
snapshot provenance. Fixtures do not establish live Meta selection of Library
tools or completion of a real user's Library setup.
