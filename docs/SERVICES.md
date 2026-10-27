# Running against services

## Local verification

`npm ci --ignore-scripts`, `npm run check`, `npm test`, and `npm run demo` work without the old console, a database, npm authentication, AWS credentials, or provider keys. Tests use synthetic responses and catalogs. They verify the public adapter but do not prove live inference or extraction.

For `npm run demo:live`, create ignored `.env.local` from `.env.example` and provide:

- `HEDGELING_META_RESPONSES_URL`: the HTTPS Responses API URL from your Meta account/documentation.
- `HEDGELING_AGENT_META_MODEL`: a Meta model enabled for that account and compatible with the Responses tool/reasoning protocol.
- `HEDGELING_META_API_KEY`: your authorized server-side key.

Do not commit these values. Provider configuration has no fallback. The program requests a synthetic catalog using a real function call, returns its result, and asks the model for an answer; it rejects an answer that skipped the tool. It prints normalized usage when returned. This is a focused integration verification, not the final three-minute product demo.

## Existing hosted product

The existing console, platform API, authentication, human approvals and localization engine are proprietary pre-event dependencies. They remain separately operated. The event Meta adapter is integrated in that product, but the public standalone module in this extract has not yet been deployed into it. Reproducing that exact hosted experience requires invited access; installing this repository does not install the console.

Judges should receive an individual invite, a synthetic workspace/repository, a short task script, and access through the judging period. Share the deployment URL and account setup privately through the event submission/access channel; do not publish credentials or private upstream URLs. Judge invitations have not yet been completed. No access is implied by this document.

## Private processing API

The new wrapper around the old engine is implemented but not deployed. It requires a dedicated PostgreSQL database, an installed GitHub App with read-only contents access, a server-side PEM key, operator-provisioned tenant/repository mappings, and a separate service token. The GitHub App identity/key still need to be resolved. The public OpenAPI contract describes the interface, not the implementation or its license.

After deployment and provisioning, an operator can set `HEDGELING_ENGINE_URL` to its HTTPS base URL and `HEDGELING_ENGINE_TOKEN` to an authorized service credential, then run `npm run engine:check` from an environment with network access. This command only reads capabilities and one connection page. It prints counts, not repository names or credentials. The client also accepts explicit limit/offset pagination.

The service token is not an end-user permission check. Before adding job execution to UI/chat/MCP, the authenticated platform must bind projects to connections, enforce user permissions, obtain confirmation, and import results through its authorized workflow. Those integration steps are not implemented here. Browser configuration and model prompts must never receive service credentials or private upstream URLs.

The hosted engine currently supports extraction and source-rewrite previews. It does not apply changes, push to GitHub, publish translations, or provide a secret browser injector. Source processing for the hackathon is explicitly authorized to happen in the private AWS service; it is not represented as local-only processing.
