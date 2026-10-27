# Deployment verification — October 27, 2026

The isolated existing-product demo and separate private processing service were
deployed and reached healthy AWS service status. This is infrastructure evidence,
not a claim that the new user-facing extraction workflow or final demo is complete.

## Live synthetic extraction

An operator launched a one-off task using the deployed demo backend image and its
server-side connection configuration. It called the actual private HTTPS API;
the engine used the installed GitHub App to fetch the pinned source commit.

| Check | Observed result |
| --- | --- |
| Synthetic source | `examples/source/App.tsx` at `caec8e413a5e8277ff0182c93db32020ff47f167` in this repository |
| Engine readiness | Configured, reachable, source configured, one allowed connection |
| Extraction | Succeeded; one file, three expected strings; provenance matched the pinned commit |
| Expected strings | “Welcome to the demo”, “Your words can travel.”, “Save your draft” |
| Private API without credentials | HTTP 401 |
| Private API with a browser Origin header | HTTP 403 |
| Public demo login | HTTP 200 |
| Public demo readiness route without login | HTTP 401 |
| Database initialization | Separate application role and schema created; migration exited zero |

The check created one processing record. It did not modify the GitHub repository,
publish translations, or use a translation model. The source snapshot was synthetic;
no customer repository was processed. The service supports rewrite previews, but
this live check exercised extraction only. Existing engine behavior remains a
pre-event dependency.

The demo integration is commit `a159e447a3dcea5bac095c9ece623cfa37a4f689` in the
existing product workspace. Its event-only vendored modules are pinned to this
repository's `caec8e413a5e8277ff0182c93db32020ff47f167`. The private service's event
implementation and deployment changes are inventoried in [hosted changes](hosted-changes.json).
Deployment remained on isolated demo resources; no production merge or npm release
was needed. Endpoint addresses, credentials and raw cloud records remain private.

## Reproduction and remaining checks

Anyone can run the public fixture and tests from a fresh checkout. An authorized
operator with private network access can run `npm run engine:check` for read-only
service verification. The mutating synthetic extraction check lives with the
private deployment tooling and is not part of the public verification harness.
Judge access to the hosted product must still be arranged as described in
[services](SERVICES.md).

This initial infrastructure check did not verify live Meta inference. The new
workflow and the additional checks below are separate from that initial result.

## Live Meta extraction proposal

On October 27, an operator verification task using the deployed existing-product
revision `8fc8b77f1dc7db090b1d5617a4e9feb0a83b1500` called the configured Meta
provider through its metered `nextAgentTurn` path. It used a normal non-staff demo
owner's project permissions, real source-connection discovery, the new extraction
skill, and the shared action schemas. No fixture provider was involved.

| Check | Observed result |
| --- | --- |
| Model | `muse-spark-1.3` |
| Provider turns | 2 |
| Measured tokens | 4,082 total |
| Tool calls | `console_list_source_connections`, then `console_propose_extraction` |
| Selection | `extraction-demo`, `hackathon-source`, `main`, `examples/source` |
| Proposal | Server validated project access and source bounds; preview created |
| Execution | No confirmation or extraction; verification proposal rejected after inspection |

This proves live Meta selection and proposal preparation, not a human browser
session or a complete model-driven extraction/import conversation. UI confirmation
behavior is covered separately by the host browser suite. Repeat final live
acceptance on the eventual submission revision and arrange judge access.

## Live project extraction and import

The existing-product demo was updated to
`b7fc91c7ce982a5c74a492c6d15274e773a3d96e`, vendoring public event modules from
`e90590d294fb2360d4864a242bc46928bc830bff`. An explicit operator seed created the
synthetic `extraction-demo` project, bound only to `examples/source` in this repo.
The seed was also tested twice against a disposable local database.

A one-off task running the deployed demo image exercised the actual application
actions, normal demo-owner permissions, proposal preparation and confirmation,
private engine, artifact conversion and transactional importer. This was an
operator diagnostic, not a recorded user browser session. Its redacted result:

```json
{
  "sourceCommit": "e0a12474c7fef94bf429329e330b515a0efb0e48",
  "strings": 3,
  "projectSlug": "extraction-demo",
  "confirmedOperations": 2,
  "replay": true,
  "imported": true
}
```

The check compared the saved source strings to the three expected synthetic
phrases above and verified `importedAt` through the read action. Replaying the
confirmed import returned its existing result. GitHub and translations were not
modified. The first live attempt found that the engine emits catalog v2; import
failed closed with no saved strings. The adapter was corrected for the documented
v1/v2 source/context shape, tested directly against actual engine output, and the
successful verification above used the corrected image.

Live HTTPS checks returned 200 for health/login and 401 for anonymous agent
configuration. Console CI passed the full build, lint, unit, database,
authorization, security, browser and container-build pipeline on `b7fc91c`.
Public code CI passed on `e90590d`. Public unit tests include 16 tests; the host
browser workflow uses a synthetic HTTPS engine and deterministic model, explicitly
separate from the real Meta check above. Runtime URLs, private credentials and
raw cloud task records remain outside the public repository.

## Organization Meta BYOK

The existing-product demo is deployed at `4b6b22afe6fb13132916e3dce5a9a146efef2da9`, with the event-authored Meta translation adapter and additive migration vendored from `4cfe287`. Both review branches passed CI; the host passed its complete build, lint, unit, database, authorization, security, browser, and container pipeline. The public event suite has 19 tests.

A synthetic HTTPS provider exercised key coexistence, metadata testing, confirmed Gemini-to-Meta selection, context-bearing translation, placeholder rejection, provider/model provenance, zero Hedgeling translation-credit charges, and failure/removal without fallback. Browser checks covered both provider cards and desktop/mobile confirmation flows. These tests used synthetic credentials and responses.

After the isolated AWS rollout completed with one healthy task, a read-only verification task using that deployed image confirmed Meta translation configuration, encrypted-vault readiness, paid-plan eligibility, managed chat, and successful model-metadata access for `muse-spark-1.3`. It used the existing server credential only for a metadata request; it did not save/replace/select an organization key or generate content. This establishes live connectivity, not a real organization-owned translation inference. Public health returned 200 and anonymous agent configuration returned 401. No production release or merge was performed.

## Chat readability and focus activation

The isolated demo was updated to existing-product commit `f7f6d159993a164d9c0bdcf0d7be2b6c753f3536`, vendoring the event-authored DOM-only Markdown renderer from `4fcd327`. Both review branches passed CI. The host passed build, lint, unit, database, authorization, security, all four browser suites, and its container build; the event suite has 22 tests.

Browser verification uses the deterministic local provider. It checks light/dark text and layout-control contrast of at least 4.5:1, 44px-or-larger layout targets, nearly full-screen layout, mobile and alternate branding, semantic bold without interpreting model HTML, message replay, keyboard/pointer activation, draft preservation after a failed reconnect, explicit cross-tab takeover, and approval boundaries. Clicking the input never confirms a pending write. These are targeted checks, not a complete accessibility audit.

AWS completed the rollout with a healthy demo task using the tested image digest. The live public theme/token files matched the tested files byte for byte; health returned 200 and anonymous agent configuration returned 401. Chat assets continue to require login. Authenticated interactions were tested locally; no new live model inference, organization-key change, production deployment, database migration, or merge was performed for this UI update. Existing-product UI files remain outside this submission repository and are inventoried in `hosted-changes.json`.

## Project target languages

The isolated demo now runs existing-product commit `75f16efac62f32ee4c06a62e8efb319b43f1913b`, with event modules vendored from `3a6fd717c0ad8206b61f660c9ca4e6be3cffca3b`. The console pull-request CI passed build, lint, unit, database, authorization, security, all five browser suites and its container build. Public repository checks, all 24 public unit tests and the labeled fixture demo passed.

Local integration and browser checks exercised target-language read/propose/confirm, preservation of existing translations when re-enabling a locale, source-language rejection, canonical code handling, stale previews, idempotent replay, revoked and locale-scoped access, concurrent organization limits, manual review/edit/cancel/save, translation-selector refresh, shortcut focus, agent approval/highlighting and mobile layout. The agent tests used a deterministic provider; they do not prove live Meta tool selection for this new feature.

AWS reports a healthy running demo task whose image digest matches the tested build. Public health and login return 200; anonymous agent configuration returns 401. Authenticated interactions were tested locally. No live project locales were changed by deployment verification, and this update performs no database migration, production release or merge. Adding locales does not generate translations or change existing jobs. Existing-product integration changes are recorded in `hosted-changes.json`; the submission repository contains only the new event modules and provenance records.

## Automatic demo deployment and extraction tuning

The existing-product integration repository now tests pushes to `main`, including
integration tests inside the final container image. A successful main run supplies
that exact image as an artifact to the demo deployment workflow. Deployment uses
its immutable digest, skips superseded commits, waits for service stability, and
checks public health and rejection of anonymous agent access. It does not rebuild
the image during deployment. The first automatic release completed successfully
at `d50f59f90501f15e36b5c8a34f8e0ed8e7ecaedd`. The public event repository still has
no deployment credentials and does not deploy the product.

The tuning release is integration commit
`f1a20b999f8a69cd92bf7638169c990c14e3e176`, containing implementation `629578e`
and event modules vendored from `0f05d7c`. Its main CI passed build, lint, unit,
database, authorization, security, all six browser suites, and final-image
integration checks. Public repository checks, 25 unit tests and the labeled
fixture demo also passed. The live task's image digest matches that release;
health and login return 200, and anonymous agent configuration returns 401.
The [automatic tuning deployment](https://github.com/Hedgeling/hedgeling-agent-platform/actions/runs/40588689521)
completed successfully after [main CI](https://github.com/Hedgeling/hedgeling-agent-platform/actions/runs/40588327257).

Local integration and desktop/mobile browser checks cover repository config
reads, manual and chat approval cards, tuning progress, saved configuration,
download, and re-extraction pinned to the tuned source commit. Tests also cover
stale settings, changed source bindings, revoked access, idempotent replay, and
rejection of direct import from a tuning preview. Saving settings and starting
re-extraction require confirmation; importing its results remains a separate
confirmation. Repository files are never written. Existing project strings are
not deleted just because they disappear from a subsequent extraction.

The separately hosted private service runs runtime commit
`cb9900d53a1682ca4857057d9bf95f20ac2714aa`. Its unit/security and HTTP/queue/GitHub
integration checks passed, including the actual engine. Twelve engine tests also
passed inside the release image with networking disabled and a read-only root
filesystem. AWS completed the private rollout. A read-only live task verified
that tuning is available and read the connected repository config at pinned event
commit `b2efdedc6354b6360bd4e3a8c59f6e6f6cc22a9f`; the optional config file was
absent and reported as such. This task made no project writes or processing jobs.

Initial tuning uses two bounded deterministic rounds with model calls disabled.
It may report no accepted changes. Configuration is limited to the documented
supported extraction fields; the download is not a lossless copy of arbitrary
repository configuration. Browser agent tests use the deterministic test
provider. These checks do not establish live Meta selection of the new tuning
tools or a completed live user tuning conversation.

The existing-product integration and event contributions are merged into their
respective `main` branches. Private engine work remains on an unmerged review
branch; no original-product merge or npm release was performed. Operator helper
commit `df781db` fixes expired bootstrap-task history in status reporting and is
inventoried separately; it does not change the deployed runtime. Runtime
addresses, credentials and raw cloud records remain outside this repository.

## Included chat allowance grants

Integration implementation `1d4a8f6` preserves the default 500,000 daily user
tokens while honoring explicit server-managed grants up to a finite 10-million
ceiling. Invalid values fail before provider dispatch, and a zero allowance blocks
usage. Regression tests cover the higher grant, reservation headroom, lower and
zero limits, the upper ceiling, invalid settings, and recording actual usage.
Local boundary, build, lint and all seven provider tests passed; the full pull
request CI also passed. Implementation is recorded by hash and changed-line
ranges in `hosted-changes.json`; no existing-product source was copied here.

An operator applied an owner-requested, audited grant only to the isolated demo
workspace: 10 million daily tokens per user and 50 million shared tokens per
organization usage period. The read-back confirmed both limits. Usage history
was preserved. Plan defaults, translation billing, API keys, and human write
approvals were unchanged. The new integration is merged at
`e2827bca6ad3d7d78ff70f941b9d4daeeacf9604`.
Main CI passed, and AWS reports a healthy running task whose image digest matches
that tested commit. Live health returns 200 and anonymous agent configuration
returns 401. Verification made no model calls and did not confirm any pending
user proposal.
