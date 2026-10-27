# Project languages

This event-authored module adds target languages to an existing project through the authenticated host API, manual console and agent/MCP tools. It uses the host's existing locale table, human confirmation and audit facilities; it does not contain the older console or authorization implementation.

In **Projects → Languages**, view the source language and enabled targets, then choose **Add target languages**. Suggestions include common locales; comma-separated BCP 47 codes support other languages and regional variants. The manual flow has review, edit, cancel and confirm controls. **Manage project languages** in the translation review view opens the same section. Saved locales appear in the translation selector.

| Action | MCP tool | Effect |
| --- | --- | --- |
| `project.locales.get` | `console_get_project_locales` | Read source language, visible enabled/disabled targets and management capability |
| `project.locales.add` | `console_propose_project_locales` | Preview requested additions; human confirmation performs the write |

The agent discovers the project, reads current languages, clarifies ambiguous regional variants, then proposes the additions. Existing targets are preserved; requested disabled targets are re-enabled without deleting their translations. The source language cannot also be a target. Codes are canonicalized and canonical-equivalent duplicates are ignored. Existing legacy keys are retained when re-enabled so attached translations remain intact. Read results respect locale-scoped access; writes require unscoped `locales.manage` for the project, current organization scope and a named human proposer. No MCP tool can confirm a write.

The server rechecks current access, configuration, plan limits and the preview fingerprint when the person confirms. The existing catalog-write entitlement supplies the organization-wide distinct-target cap, using the same organization lock as catalog import. The workflow supports 1–30 requested additions and up to 30 enabled targets per project; this is a workflow bound even on plans without a target-locale cap. Duplicate enabled additions return a no-change response. Changed previews require a new review. Confirmation replay checks current access and returns the original result without a second write or audit entry.

Adding languages does not alter existing job selections, source content, the source language, or translation text. It does not run a model, start a job, publish anything or spend translation credits. Removing/disabling locales and changing the source language are outside this feature.

Public unit tests verify canonicalization, alias handling, source conflicts and invalid codes. The host integration suite checks real persistence, preservation, stale previews, concurrent account limits, locale-scoped/revoked access, replay and an actual fixture-provider agent/MCP conversation. Browser tests cover manual and chat confirmation, semantic highlighting, the review shortcut, selector refresh and mobile layout. These local provider tests do not claim live Meta inference.
