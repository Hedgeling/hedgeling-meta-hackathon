# Hedgeling — Meta hackathon contributions

**Your app. In any language.** Hedgeling helps teams reach global markets from day one by connecting repository source, translation context, language generation and delivery to the files an application actually loads.

**This is the public, event-only submission repository.** Hedgeling's localization engine, console, platform API, earlier MCP tools, chat and approval foundations existed before the hackathon. They are separately operated dependencies, not new work distributed here. The integration workspace's `hackathon-start` tag records that baseline. This repository has its own fresh history and Apache-2.0 license; it does not contain the earlier product snapshot or private engine.

## Built or extended during the hackathon

- **Meta-powered Agent integration:** Responses tool calls, encrypted reasoning replay, usage normalization, cancellation and bounded errors, connected to the existing console's permission-checked actions.
- **Meta BYOK for language work:** organization-owned credentials for contextual translation, context enrichment and AI quality assessment. Keys remain server-side; failed BYOK work does not silently fall back to a different paid route.
- **GitHub-connected processing API:** authenticated, tenant-scoped source processing around the pre-existing private engine, pinned commits and bounded caller-authorized snapshots.
- **Connected localization workflow:** separate extraction/import and enrichment/acceptance approvals; saved translation jobs; AI-only, AI quality-check and human-review choices; and separately approved translation PR delivery.
- **Agent and console improvements:** counts-first context tools, batched work, actionable validation diagnostics, measured progress, focused business-unit workspaces and guided repository readiness.

The event-created modules, shared action definitions, contracts, UI components and tests are distributed here. Integration changes inside older product files are recorded by commit, path, digest and added-line ranges in [the hosted-change inventory](docs/hosted-changes.json), without distributing their pre-existing bodies. [Provenance](docs/PROVENANCE.md) and [licensing](docs/LICENSING.md) explain the boundary; timestamps alone do not prove authorship or event eligibility.

## Judges: start here

Read the [judge walkthrough](docs/JUDGES.md), [service/access boundary](docs/SERVICES.md) and [latest verification record](docs/VERIFICATION.md#submission-readiness-update--november-4-2026).

Hosted access instructions and credentials are supplied privately through the submission channel. The hosted demo is the integrated product; installing this extract does not install the older console or private engine. No credential or private service endpoint is needed for the offline checks below.

The recorded demonstration uses Hot Dog or Not in Scroll Goblin. It shows source import, accepted translation context, Meta BYOK AI-only translation, a real GitHub PR, human merge and the translated game. AI-only output is labeled unreviewed; AI assessment and human review are separate workflow choices. A person merges the PR and the application's own pipeline deploys it.

## Run the public extract

Requires Node.js 22.13+ and npm. Dependencies are public, pinned in the lockfile and identified in [licensing](docs/LICENSING.md).

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run demo
```

`npm run demo` is a labeled **offline fixture**. It exercises the real Meta request/response adapter with a synthetic read-only tool and replayed responses. It makes no provider calls, performs no extraction and does not prove live inference. Public CI runs these same checks without provider, cloud or deployment secrets.

For bounded live verification:

```sh
cp .env.example .env.local
# Configure the authorized Meta Responses endpoint, model and key privately.
npm run demo:live
```

That optional command uses real Meta inference and may incur provider charges. It makes at most four turns against an authored synthetic catalog, requires a real tool call, and does not change a hosted workspace. Missing configuration fails explicitly. Provider replay state and credentials are not printed. See [service configuration](docs/SERVICES.md).

## What is in the submission

- Meta protocol and translation adapters; private engine clients and public API contract.
- Repository discovery/source snapshots, extraction/tuning, [context enrichment](docs/CONTEXT-ENRICHMENT.md), [Library guidance](docs/LIBRARY-WORKFLOW.md), [translation jobs, quality and PR delivery](docs/TRANSLATION-JOBS.md).
- [Document jobs](docs/DOCUMENT-JOBS.md) for Markdown/TXT, DOCX body text and selectable-text PDF, with TXT/CSV export. OCR and original-layout preservation are not implemented.
- Shared API/MCP action definitions and event-authored UI modules. The hosted API owns authorization and human confirmation; the model cannot confirm its own proposals.

Real hosted extraction uses the separate private service. Translation PR delivery requires a connected GitHub user with push access, the App installed with Contents and Pull requests write access, a current source snapshot and compatible runtime bundle/map files already integrated into the application. A file-name check alone does not prove runtime compatibility. [Repository setup](docs/REPOSITORIES.md).

Bedrock, independent workload model selection, token streaming and broader runtime onboarding remain future work. No automatic PR merge or application deployment is claimed.

## License and submission status

Original event work distributed here is **Apache-2.0**, selected by the owner. See [LICENSE](LICENSE), [NOTICE](NOTICE) and [provenance](docs/PROVENANCE.md). The existing product/integration workspace retains its commercial terms; the private engine and service implementation are not relicensed by this repository. Third-party dependencies and trademarks retain their terms.

[Submission readiness](docs/SUBMISSION.md) separates completed evidence from final portal, video-link and fresh-account checks. The private hosted dependency is disclosed under the owner-supplied organizer clarification; this is not an independent event-eligibility certification.
