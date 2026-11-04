# Running against services

## Local verification

`npm ci --ignore-scripts`, `npm run check`, `npm test`, and `npm run demo` work without the old console, a database, npm authentication, AWS credentials, or provider keys. Tests use synthetic responses and catalogs. They verify the public adapter but do not prove live inference or extraction.

For `npm run demo:live`, create ignored `.env.local` from `.env.example` and provide:

- `HEDGELING_META_RESPONSES_URL`: the HTTPS Responses API URL from your Meta account/documentation.
- `HEDGELING_AGENT_META_MODEL`: a Meta model enabled for that account and compatible with the Responses tool/reasoning protocol.
- `HEDGELING_META_API_KEY`: your authorized server-side key.

Do not commit these values. Provider configuration has no fallback. The program requests a synthetic catalog using a real function call, returns its result, and asks the model for an answer; it rejects an answer that skipped the tool. It prints normalized usage when returned. This is a focused integration verification, not the final three-minute product demo.

## Existing hosted product

The existing console, platform API, authentication, human approvals and localization engine are proprietary pre-event dependencies. They remain separately operated. Event-created adapters and workflow modules are integrated in that product. The standalone harness remains a separate verification entry point; it does not recreate the hosted product. Reproducing that exact hosted experience requires invited access; installing this repository does not install the console.

Judges should receive an individual invite, a synthetic workspace/repository, a short task script, and access through the judging period. Share the deployment URL and account setup privately through the event submission/access channel; do not publish credentials or private upstream URLs. A Judges demo organization and judge membership have been provisioned. Use the private submission access instructions and the [judge walkthrough](JUDGES.md); a fresh end-to-end judge workflow remains a final acceptance check. No credentials or extra permissions are granted by this document.

## Private processing API

The new wrapper around the old engine runs as a separate private AWS container, with its own database and internal HTTPS ingress restricted to the demo backend. Its operator-managed GitHub App source connections are explicitly restricted. Personal GitHub source snapshots use the caller-authorized platform connection; PR delivery additionally requires the connected user’s push access and App Contents/Pull requests write permissions on the intended destination. The server-side PEM key, service token and tenant/repository mapping are provisioned. The public OpenAPI contract describes the interface, not the implementation or its license. [Live verification](VERIFICATION.md) records the completed synthetic extraction check.

After deployment and provisioning, an operator can set `HEDGELING_ENGINE_URL` to its HTTPS base URL and `HEDGELING_ENGINE_TOKEN` to an authorized service credential, then run `npm run engine:check` from an environment with network access. This command only reads capabilities and one connection page. It prints counts, not repository names or credentials. The client also accepts explicit limit/offset pagination.

The existing demo vendors public event modules with their Apache license, NOTICE and commit/hash provenance. `scripts/vendor-integration.mjs` copies the clients, new workflow/actions, migration and UI components into an existing console checkout; the checkout is not part of this submission. The demo's `/api/platform/engine-status` route requires platform-operator authorization and reports readiness/counts without exposing private endpoints or credentials. The extraction engine is not present in the demo image. Both images are in private registries.

The service token is not an end-user permission check. The new [extraction workflow](EXTRACTION-WORKFLOW.md) binds projects to connections, checks user permissions, obtains separate extraction/import confirmations, and calls the host's transactional importer and usage accounting. The host adapters remain necessary; this standalone repo is not a replacement for those existing product services. Browser configuration and model prompts must never receive service credentials or private upstream URLs.

The hosted engine currently supports extraction and source-rewrite previews. It does not apply changes, push to GitHub, publish translations, or provide a secret browser injector. Source processing for the hackathon is explicitly authorized to happen in the private AWS service; it is not represented as local-only processing.

## Current demo and historical fixture

The original three-string `extraction-demo` project and `examples/source` connection were an early synthetic verification setup, not the current recording instructions. Historical verification entries retain their original dates and scope. The recorded end-to-end example now uses the Hot Dog or Not project in Scroll Goblin. Judges should use their separately provisioned Judges demo workspace and [current walkthrough](JUDGES.md), inspecting saved counts before starting. The public extract does not automatically provision either hosted workspace.
