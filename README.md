# Hedgeling — Meta hackathon contributions

**This is the fresh event-only submission repository.** Hedgeling's existing console, authorization/approval system, platform API, older MCP tools, and localization engine predate the event. They are separate hosted dependencies and are not included here. This repository does not import their Git history.

During the event we implemented Meta Responses integration for the existing agent, isolated demo infrastructure, and a private GitHub-connected processing API. This public extract contains the standalone Meta protocol integration, a verification harness, engine clients/contract, and the new project-bound extraction → review → import workflow with shared API/MCP actions and UI components. [Provenance](docs/PROVENANCE.md) distinguishes public implementation, private event work, and pre-existing services.

The earlier public platform snapshot is an integration workspace, **not the submission repository**. It contains pre-event product code; no checkout, package, or history from that snapshot is required to run this extract.

## Run and verify

Requires Node.js 22+ and npm. There are no npm dependencies or private package downloads.

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run demo
```

`npm run demo` is explicitly a **fixture**: it makes no network/model calls and does not perform extraction. It exercises request conversion, a synthetic read-only tool, tool-result replay, and a final answer through the actual adapter.

For a real Meta model call:

```sh
cp .env.example .env.local
# Set the Meta Responses endpoint, model, and key in .env.local.
npm run demo:live
```

The live command uses Meta inference and may incur provider charges. It makes at most four turns against a newly authored synthetic catalog; it does not access customer source or change a workspace. Missing configuration fails explicitly. Encrypted provider replay state stays inside the tool loop and is not printed. [Service setup and judge access](docs/SERVICES.md).

## What works today

- Meta conversation conversion, structured tool calls, opaque reasoning replay, usage normalization, cancellation, and bounded HTTP responses.
- Offline tests and an optional live Meta tool-loop verification independent of the existing console.
- A server-only read client for private engine capabilities and paginated repository connections, deployed into the existing demo behind operator authorization.
- A documented engine interface for extraction jobs and rewrite previews. The implementation is private event work around a pre-existing engine; publishing its contract does not deploy the service.
- New project-scoped API/MCP extraction actions, separate extraction and import approvals, source provenance validation, retry-safe admission, and progress/manual source controls, deployed into the existing demo. See the [workflow and limits](docs/EXTRACTION-WORKFLOW.md). Unit, host integration and browser tests cover this workflow; real extraction/import and Meta proposal checks are recorded in [verification](docs/VERIFICATION.md).

The current live console uses the earlier event Meta adapter inside the existing hosted product. The standalone Meta module here has not yet replaced that adapter. The private engine service is deployed separately and connected to the demo backend; an operator check extracted all three strings from the pinned synthetic source through the real GitHub App and API. [Verification evidence](docs/VERIFICATION.md). Organization Meta BYOK translation is available as described below. Bedrock, LLM context-enrichment inside extraction, and applying repository changes remain future work. Existing chat/approval features are not claimed as event contributions.

## Private work written during the event

| Change | Evidence | Status |
| --- | --- | --- |
| Meta adapter and existing-console wiring; database TLS changes | Commit `eef24e7a0e27d8ce829c47d73e9310eb142f0a9b`; file/line inventory in [hosted changes](docs/hosted-changes.json) | Integrated in existing demo; standalone adapter extracted here |
| Isolated demo AWS deployment, seed and CI support | Commits `eef24e7a0e27d8ce829c47d73e9310eb142f0a9b`, `961af208f26f9705cfc9649c7422501a452b2700` | Existing demo infrastructure; not a deployment pipeline for this repo |
| GitHub App connector, tenant-scoped engine API, queue, worker, previews, tests and container packaging | Private commits `95b0c245601fc8b197da700f485e20dfc14286fa` and the deployment commit recorded in [hosted changes](docs/hosted-changes.json) | Deployed from the unmerged private branch; no npm release |
| Private AWS engine stack, restricted database role, secret provisioning and synthetic verification | Deployment commit in [hosted changes](docs/hosted-changes.json) | Dedicated service healthy; live extraction verified |
| Demo server readiness route and server-only connection configuration | Commit `a159e447a3dcea5bac095c9ece623cfa37a4f689` | Deployed; vendored public event modules retain Apache-2.0 and provenance |
| Extraction action/UI integration, transactional importer/usage bridge and restricted synthetic project seed | Commits `8fc8b77`, `5710426`, `b7fc91c`, fully inventoried in [hosted changes](docs/hosted-changes.json) | Deployed; real three-string extraction/import and live Meta proposal verified |

The engine itself was not written during the event. The inventory records every changed file and added line range in these event commits, including modifications made inside older files; older source contents are not copied into this submission. Keep the inventory and implementation status current as work lands.

## License and submission

The original event code and documentation distributed here are **Apache-2.0**, selected by the owner on October 27, 2026. See [LICENSE](LICENSE), [NOTICE](NOTICE), and [licensing scope](docs/LICENSING.md). This grants no license to the separate proprietary product/service implementation, model weights, customer data, or trademarks.

The organizers' clarification allows a private existing product as a disclosed hosted service. [Rules record](docs/EVENT-RULES.md) records the supplied clarification and remaining submission checks. The [submission checklist](docs/SUBMISSION.md) tracks the video, judge access, and final verification. Repository setup is not a claim that the final hackathon deliverables are complete or that organizers have approved the project.

### Organization-owned Meta translation keys

Event-created `src/meta-translation.js` provides metadata-only key validation and context-aware translation using Meta Responses. The hosted console stores Gemini and Meta keys independently, requires a human preview/confirmation for key or billing-route changes, and leaves included chat on Hedgeling’s managed account. Translation prompts include the existing source context, glossary, and project instructions. Extraction itself remains the separately hosted pre-existing service; this addition does not add an LLM context-enrichment pass there.

The server requires `HEDGELING_META_RESPONSES_URL` (the operator-approved HTTPS Responses endpoint) and `HEDGELING_META_TRANSLATION_MODEL`. Keys are organization credentials in the encrypted host vault, never frontend environment values. Selecting Meta uses that organization key only; failure or removal never falls back to Gemini or managed credits. The additive migration preserves existing Gemini keys. Existing paid-plan access requirements still apply.

`npm test` verifies the new Meta transport with synthetic responses. Host integration tests separately verify encryption, authorization, coexistence, confirmation, translation provenance, and zero platform translation-credit charges for BYOK. These fixture tests do not establish live provider access.

Project configuration and deterministic extraction tuning are available as event-authored API/MCP actions and UI components; see [the workflow](docs/EXTRACTION-WORKFLOW.md). The private service runs the pre-existing tuner. Settings are saved per project/connection, downloaded as JSON, and used for a separately approved re-extraction/import flow.

The [Agent Library workflow](docs/LIBRARY-WORKFLOW.md) adds event-created, permission-scoped personas, translation instructions, glossary suggestions, human review and revision history. Existing product storage and translation execution remain hosted dependencies.

Chat capacity and included-usage boundaries are documented in [Chat limits](docs/CHAT-LIMITS.md).

The [agent scope policy](docs/AGENT-SCOPE.md) keeps hosted chat focused on localization and Hedgeling, with synthetic acceptance cases for live model evaluation. The [deferred UI polish spec](docs/UI-POLISH-SPEC.md) tracks provider/model selection clarity, Set budget repair and agent logo replacement.

The [confirmed translation-job workflow](docs/TRANSLATION-JOBS.md) adds event-created start/status/stop actions, a durable bounded queue and progress UI. A human start confirmation authorizes generation and draft persistence through the hosted translation pipeline; review and publication remain separate. Organization Meta/Gemini keys and managed AI-credit budgets keep their existing boundaries.
