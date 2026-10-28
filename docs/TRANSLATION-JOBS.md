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
   by review (and optionally QA). Creating the draft does not call a model.
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
