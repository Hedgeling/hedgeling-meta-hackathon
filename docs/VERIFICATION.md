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

This check does not verify live Meta inference. Verify and record real Meta tool
use on the final submission revision separately. End-user project authorization,
approval and result import must be implemented before exposing extraction through
the new UI/chat/MCP workflow.
