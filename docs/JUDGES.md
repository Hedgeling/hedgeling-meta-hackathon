# Judge walkthrough

## Access and expectations

Use the hosted demo URL and judge-account instructions supplied privately with the submission. Do not publish passwords, provider keys or service URLs. A private/incognito window is useful for keeping judge access separate from an existing owner session. Sign out is in the profile circle at the top right; minimize full-screen Agent chat to reveal the console bar.

Use the **Judges demo** organization and its prepared sample project. The judge account is scoped to its assigned workspace. Judge access and provider allowance are operator-provisioned; a usage-action cap is not a guaranteed dollar ceiling. If the workspace, project or provider is unavailable, contact the submitter through the private submission channel rather than supplying credentials in chat.

The console, localization engine, earlier API/MCP/chat and approval foundations predate the event. The event contributions are the Meta integration/BYOK, processing API, connected workflow modules and Agent improvements described in the README.

## Short hosted evaluation

1. Open the prepared project and ask Agent Hedgeling for its current source, context and translation-job counts. Existing saved work may be present; do not assume a fixed string total or an empty project.
2. Select the intended GitHub repository, named base branch and literal source scope. Run delivery readiness before paid language work if you want a PR. Extraction/import alone can be evaluated without completing PR setup.
3. Preview and confirm extraction, inspect the result, then separately preview and confirm import. The source is pinned to a commit. Re-import preserves saved translations and does not automatically prune missing strings.
4. Request enrichment for missing context, inspect the provider/workload preview, confirm generation, review one ambiguous string and separately confirm accepting guidance. Suggested length targets are advisory, distinct from hard product constraints.
5. Choose AI-only, AI quality checking or human review. Prepare a small translation job for the selected languages and separately approve starting it. Confirm the actual provider/model shown; the recorded demo uses Meta BYOK. Saved progress survives closing the conversation. AI-only output is unreviewed.
6. For quality workflows, inspect findings and the separate approval/review gate. An AI assessment is not human review. Changing a project preset does not weaken requirements on an existing job.
7. If your repository is configured for delivery, inspect the translation PR preview and separately confirm creation. Review the actual diff. A person merges; the app's own pipeline deploys. Check the same game route in a target language afterward.

For faster evaluation, use a small language selection and inspect preserved progress. Processing/provider/deployment time is variable; the three-minute recording shortens waits and labels those transitions.

## Bringing your own repository for PR delivery

- Connect your own GitHub identity; the connected account needs push access to the intended destination. Browser GitHub login and Hedgeling authorization are separate.
- Install/authorize the GitHub App on that repository with **Contents: read and write** and **Pull requests: read and write**. Personal authorization, push access and App installation are separate checks. Reconnect after permission changes or token expiry.
- Use an app already wired to schemaVersion 1 Hedgeling runtime bundles, a source-key map and language selection. Empty JSON files are not app integration. Confirm the exact paths loaded by the app.
- If using a fork, choose/connect that fork before extraction and translation. Re-extract/import after the base branch changes; do not retarget a completed job to unrelated source.
- A readiness result of `checks_remaining` is not a failure. Early metadata checks cannot prove App write permissions, runtime file contents or app integration. Delivery validates more inputs; actual approved PR creation establishes write success.

The demo's judge login does not grant access to the submitter's personal GitHub account or other organizations. PR creation may require the judge's own repository and connection even when the hosted sample can be extracted publicly.

## Password and session troubleshooting

The provisioned demo password policy requires at least 14 characters, including uppercase, lowercase, a number and a symbol. Temporary passwords expire after seven days. A first-login password challenge expires after three minutes; if it expires, restart sign-in with the temporary password and complete the change promptly. A generic challenge failure can mean either an invalid new password or an expired challenge.

The demo's newly issued console access/ID tokens last eight hours. This is separate from personal GitHub authorization, which currently requires reconnection after at most eight hours. Background jobs remain saved when browser authentication expires; sign in and check status before starting more work.

## No hosted credentials? Run the public checks

From a fresh checkout, use Node 22.13+ and run:

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run demo
```

These checks require no private packages, cloud account or model credentials. The fixture is labeled and does not prove live extraction or Meta inference. Optional `npm run demo:live` requires your explicitly configured Meta credentials; see [services](SERVICES.md). The [verification record](VERIFICATION.md) identifies historical live evidence separately from synthetic tests.
