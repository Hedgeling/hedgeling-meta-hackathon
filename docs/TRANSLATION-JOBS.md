# Confirmed translation jobs

This event-created module turns a saved localization-job draft into a bounded
background batch. It adds a shared API/MCP contract, agent skill, durable job
items, start/stop approvals and progress UI. The existing hosted product supplies
authentication, project permissions, entitlements, provider keys, translation
prompt construction, validation, revision persistence and usage accounting.
Those existing dependencies are not copied into this repository.

## User flow

1. Discover a project and its enabled target languages. Import source content.
2. Create and confirm a localization-job draft with AI translation first, followed
   by review (and optionally QA), or choose **AI-only translations** for the single
   AI step. Creating the draft does not call a model.
3. Preview starting that job. The preview identifies the source snapshot, target
   languages, selected provider/model, active Library guidance and bounded work.
4. A human confirms **Start translation**. This authorizes both generation and
   saving generated drafts for this batch. No additional per-string approvals.
5. Observe queued/running progress in chat or Projects. Progress polling makes no
   model calls. **Drafts ready for review** does not mean approved or published.
6. Open translations for human review. A separate confirmed **Stop job** stops
   new requests and saves; any provider request already in flight may be charged.

Chat pause/closure does not cancel previously authorized background work.
Human-translation-only workflows cannot be executed by this AI worker.

## Shared actions

| API action | MCP tool | Effect |
| --- | --- | --- |
| `localization_job.start` | `console_propose_translation_job_start` | Preview a bounded batch; requires human confirmation |
| `localization_job.status` | `console_get_translation_job_status` | Read persisted progress and safe failure reasons |
| `localization_job.cancel` | `console_propose_translation_job_cancel` | Preview stopping remaining work; requires human confirmation |

Every action takes a discovered `jobId`. Start optionally accepts
`maxTranslations` (default 100, maximum 200). Ordinary API, built-in chat and
external MCP share the same server authorization and approval path. The model
cannot confirm its own proposals.

## Bounds and billing

| Bound | Initial behavior |
| --- | --- |
| Selection | Missing source/language pairs, deterministically ordered; all existing translation rows preserved |
| Batch | 100 pairs by default; 1–200 per confirmed start |
| Further coverage | Explicit `remainingPairs`; another draft/start confirmation is required |
| Prompt | Maximum 65,536 UTF-8 bytes per pair before a bounded validation correction |
| Output | 2,048 tokens per generation; at most two generations per pair |
| Concurrent work | One active job per project; one item at a time per job |
| Ambiguous interrupted request | Ten-minute claim timeout, then needs attention; never automatically resubmitted |
| Failures | Stop the remaining batch; keep successful drafts; no automatic provider fallback |
| Model billing | Organization-selected Meta/Gemini BYOK, or managed Gemini AI credits |
| Managed ceiling | Sum of per-item credit reservations shown in preview; each saved item is charged no more than its approved ceiling |
| BYOK ceiling | Bounded request count, prompt bytes and output tokens, **not a dollar quote**; provider billing terms still apply |

Existing subscription entitlements, AI credit caps and usage budgets apply at
execution. Confirmation does not increase a plan or spending limit. Chat usage
remains separate. Only missing translations are generated in this milestone;
revising an existing translation uses the existing Review workflow.

## Persistence and safety

The migration extends jobs with `queued`, `running`, `awaiting_review`,
`needs_attention` and `canceled` states, plus bounded per-pair work records.
Confirmation creates the queue transactionally with the proposal receipt.
Replayed confirmations return the original receipt without enqueuing again.

The host rechecks the named user's delegated permissions for every target locale.
No platform-admin bypass is carried into background execution. Before each
generation and draft save, the worker verifies its claim, current access,
source/context, Library asset versions and provider configuration against the
approved fingerprints. A simultaneous manual translation is preserved. Draft
revision, usage event and successful item completion commit together.

Credentials never enter job records, previews or browser bundles. Error cards
expose safe recovery messages rather than provider payloads. Background job
records persist across deployments, but an interrupted in-flight call requires
attention instead of an automatic retry that could spend twice.

## Verification and licensing

Public unit tests exercise read-only preview bounds, snapshots, access, supported
steps and prompt limits. The hosted integration suite exercises actual PostgreSQL
transactions, the shared MCP path, repeated confirmations, cancellation, concurrent
human edits, provider failure, interrupted claims, permission revocation, budget
blocking and Library provenance against synthetic HTTPS Meta responses. Browser
tests exercise manual/chat approvals, progress and mobile layout.

These fixture checks do not claim a live Meta translation or human approval of a
real customer's job. This module, its SQL contract and UI were authored during the
event and carry Apache-2.0. Existing translation implementation and private
extraction remain separately licensed hosted dependencies.

## AI-only translations

Choose **AI-only translations** in the job's Workflow selector, or ask the agent
for that workflow. Its internal steps are `["machine_translation"]`; the legacy
value is not a separate machine-translation product. Generation saves unreviewed
AI output and finishes as `completed` only when the approved batch leaves no
missing pairs. A partial batch finishes as `partially_translated`. No human
verification, AI quality-review run, or QA workflow step is inserted. Existing
empty-output, placeholder and output-constraint protections remain part of
translation generation. Status reports distinguish saved, missing and verified
coverage. Opening a PR requires its own confirmation.

## Bulk AI check, then verification

Projects → job → **AI quality check & verification** offers **In review**
(`pending` plus `needs-review`) or **All existing translations**. Optional target
languages narrow the scope. Missing translations are disclosed, not fabricated
or counted as checked. All means the whole selected set: if it exceeds 1,000
translations, the request fails explicitly and asks for fewer languages.

| API action | MCP tool | Behavior |
| --- | --- | --- |
| `localization_job.review` | `console_propose_job_quality_check` | Preview paid analysis; starts only after confirmation |
| `localization_job.review_status` | `console_get_job_quality_check` | Counts plus 50 findings per page; use `nextOffset` |
| `localization_job.verify` | `console_propose_job_verification` | Separate confirmation marks unchanged passing entries verified |
| `localization_job.review_cancel` | `console_propose_job_quality_cancel` | Stop remaining batches; in-flight cost may still apply |

A review uses the organization's selected Meta/Gemini BYOK key; managed review
billing is not implemented. Existing platform entitlements and usage budgets
still apply. Each request contains up to 20 translations, 65,536 prompt bytes
and at most 8,192 output tokens. Preview reports the actual batch count and
aggregate request/token ceilings; these are not a dollar price. No automatic
paid retry follows an error or an ambiguous five-minute expired claim.

The model checks meaning, language, locale conventions, grammar, tone,
terminology and supplied context. Results are `pass`, `needs_changes` or
`uncertain`. Server checks additionally reject placeholder mismatches and hard
length violations, including a false model pass. Incomplete, duplicate or
unknown result IDs fail the batch. Findings never rewrite translations or
change their status automatically. Verification excludes human-rejected
entries and already accepted/verified entries; only passing entries can be
selected. The confirmation records approval of an AI assessment, **not a claim
of human linguistic review**. A changed translation, source, context, Library
asset or provider invalidates the applicable approval/processing step. Reads,
processing and confirmation recheck tenant and locale permissions. Approval
requires a named authenticated human; an external agent cannot confirm itself.

## Translation PRs

Projects → job → **Deliver translations in a GitHub PR**, or ask the agent to
prepare a PR. `localization_job.delivery_options` discovers connections, recent
imported extraction IDs, runtime file paths and previous receipts.
`localization_job.pull_request` previews the destination repository/base branch,
selected languages, coverage, exact file paths and hashes, and a translation
sample. Human confirmation creates a new branch and PR. It never merges or
initiates deployment; the repository's own CI may run in response to the PR.

This first delivery format supports apps **already loading schemaVersion 1
Hedgeling runtime bundles and source-key maps**. The caller explicitly chooses
all needed public/root mirrors. Existing JSON files are merged with only the
job's selected translations; unrelated strings, games and languages are
preserved. It does not install a runtime, modify application source, run the
private injector, or export the private engine. Arbitrary JSON paths are not a
promise that the app loads those files. Document jobs use their existing
TXT/CSV download flow instead of repository PRs.

Complete coverage is mandatory for the selected languages. Review workflows
require verified translations. AI-only output can be delivered unreviewed and
is labeled that way in the preview and PR. Human-rejected translations are
blocked in both cases. Limits: 10,000 translations, up to three existing bundles
and three existing source maps, 5 MiB per file, 12 MiB combined. Hidden paths,
workflow files, symlinks, incompatible formats and source-key conflicts fail
before any GitHub write.

Source provenance must match an imported extraction from the same project,
repository identity and current scan scope. Every job source key/text must be
present in the extraction artifact. The selected base branch must still point
to that exact extraction commit. This conservative rule also blocks unrelated
base-branch changes; re-extract/import current source before delivery. If the
private service has expired its extraction artifact, a new extraction is needed.

GitHub writes use the current user's encrypted GitHub App authorization, never
an ambient CLI credential or an installation token carrying broader rights.
The user needs repository push access; the App needs **Contents: Read and write**
and **Pull requests: Read and write**, installed on the destination repository.
After changing App permissions, approve the installation update and reconnect
GitHub in the console if needed. The platform separately requires project
management, source-import, job-update and translation-publishing permissions.

Delivery uses a deterministic per-proposal branch, commit marker and PR marker.
Retries reuse a matching existing branch/PR after a lost response; conflicting
branches are never overwritten or force-pushed. Completed proposal replay
returns its original receipt after authorization. No customer PR is opened by
the synthetic test suite.

## Local verification of this milestone

Event tests cover bounded complete selections, strict model-result validation,
preservation of unrelated runtime data, extraction/base provenance, GitHub
permissions and recovery after a lost PR response. Hosted integration tests use
disposable PostgreSQL schemas and a synthetic HTTPS provider to check separate
approvals, result pagination, stale edits, revoked access, cancellation, AI-only
completion and partial batches. Browser checks exercise manual quality and
verification cards, automatic control refresh and mobile layout. These tests
do not establish live Meta quality or successful writes to a real GitHub repo.
