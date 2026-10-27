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
