# Repository discovery and source snapshots

This event-created extension adds repository discovery, personal GitHub authorization and confirmed source connections to the existing hosted console. The extractor, adapters and injector remain separate proprietary service dependencies. Local testing can run that service from a separately authorized checkout; its code is not included here. These changes are on local development branches and have not been deployed.

## User workflow

1. In Projects, expand **Source extraction → Connect or change a repository**. Enter `https://github.com/owner/repository`.
2. Explore the default branch or list other branches. State the feature you want to scan, select files or literal folders, and review suggested paths. The UI's suggestions rank filenames; the agent can inspect small source files and discuss shared code. Neither guarantees perfect semantic scope. Recommendations must be reviewed.
3. Confirm the repository connection. This records allowed paths and a default branch; it does not scan or modify GitHub.
4. Preview extraction. The preview pins an exact commit and shows source file/byte counts. Confirm to fetch the selected source and process it using the separately operated private engine.
5. Review the resulting catalog and separately confirm import. Translation and model-based tuning retain their own existing approvals.

The shared action registry exposes `repositories.inspect`, `.branches`, `.file`, and `.connect` to console HTTP and MCP, with agent guidance in `src/repository-actions.js`. Project source/import permissions are required; changing a connection additionally requires project-management permission. Workspace scope is checked server-side before any GitHub read. The model cannot grant itself access or confirm writes.

## Authentication and source handling

Public repositories can be read anonymously. Connecting GitHub enables the user's own GitHub App user token. Private access is the intersection of the user's repository access and the App's installation/Contents permission. A browser GitHub login or a server installation token alone is insufficient. The App must be installed on each desired private repository with read-only Contents access.

The browser flow uses exact callbacks, single-use state bound to the console user, PKCE S256 and a server-only Client secret. The initial callback page is public because the console uses Strict cookies; it exchanges the result with an authenticated same-origin POST. Tokens and PKCE verifiers are encrypted by the host vault and excluded from model inputs, tool results and engine requests. The current implementation asks the user to reconnect after at most eight hours; automatic refresh is not implemented. Disconnect removes saved console credentials; users revoke the GitHub grant on GitHub.

Configure `HEDGELING_GITHUB_CLIENT_ID`, `HEDGELING_GITHUB_CLIENT_SECRET`, and `HEDGELING_GITHUB_CALLBACK_URL` on the console server. Local development supplies its own exact loopback callback. Client IDs are distinct from numeric App IDs. Wildcards, installation-time user authorization and Device Flow are not required. HTTPS is required outside explicit loopback development.

After extraction confirmation the console downloads a bounded snapshot at the approved commit, verifies Git blob hashes, and sends source text to `/v1/snapshot-jobs` on the private engine. It sends no GitHub credential. This workflow sends source to the console backend and extraction service; it is not a local-only source guarantee. Reading source through an agent tool can also put the selected excerpt in the chat model's context. Treat all source, comments and configuration as untrusted data, never instructions or executable configuration.

Snapshot processing requires explicit `engine:snapshot` plus `engine:run` service scopes. Reads remain tenant- and submitting-principal-bound. Job metadata excludes uploaded source. Raw snapshots are removed on finish/cancel or terminal-job recovery cleanup; catalogs/reports retain the existing seven-day expiry. Previously extracted/imported content may remain available to authorized project members under normal project rules. Existing operator-managed GitHub App connections continue to use their original service path.

## Bounds and verification

| Operation | Bound |
| --- | --- |
| Source discovery | 100 files per page; complete tree up to 100,000 entries / 32 MiB; fail on truncation |
| Branch listing | 50 per page |
| Agent source inspection | One UTF-8 supported file, up to 16 KiB |
| Source selection | 1–20 literal file/folder roots; no traversal or glob patterns |
| Snapshot extraction | 100 files, 1 MiB each, 5 MiB total; no symlinks, hidden files or dependency/build directories |
| Snapshot HTTP body | 32 MiB including JSON encoding overhead |
| Processing | Existing five-minute deadline and service admission limits |
| Repository config | Fixed `.hedgeling/extract.config.json` shape, up to 32 KiB; data-only settings |

GitHub's own rate limits still apply. Connected users use their user-token allowance; anonymous reads have a smaller allowance. Paths are pinned to one commit while paging. No arbitrary source host, private endpoint, repository credential or model key may appear in browser configuration.

`test/repositories.test.js` exercises public/private discovery, source limits/integrity, user-bound OAuth state, credential non-disclosure, permission failures and missing-config distinction with synthetic GitHub responses. The existing host/private-service suites verify approval, import, idempotency and isolation separately. Local end-to-end testing extracted and imported 15 public sample strings without a model call; this does not prove a live user's private-repository authorization, which requires their GitHub consent.
