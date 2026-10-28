# Deferred console UI polish

Status: draft backlog, requested October 28, 2026. These three improvements are saved for a later UI pass; they are separate from the agent scope policy being implemented now.

## 1. Make the selected provider and model clear

Problem: a connected key can look ready for use even when translation is routed through another provider. Show the effective translation provider, model and payer prominently in AI providers & keys. Distinguish “Key connected” from “Selected for translations” with text and an accessible selection indicator, not color alone.

Show included chat separately from translation/context work. Derive actual models and readiness from server configuration; do not imply that chat and translation share a model or key. If context work follows translation routing, say so; if a workload is not implemented, do not present it as active. Never expose credentials or private endpoints.

Acceptance:

- A user can identify the selected translation provider/model and billing account before starting a job.
- Saving or testing a key does not silently select it or change billing. The next selection step is visible beside a connected, unselected key.
- Selection changes retain the existing preview and human confirmation. Confirmed selection is reflected after reload.
- Missing managed-provider configuration or a missing selected key has a specific status and a useful action. Switching fails visibly and preserves the last confirmed choice.
- Test managed routing, connected-but-unselected Meta/Gemini, selected BYOK, unavailable provider, and users without management permission.

## 2. Repair the Set budget module

Reported problem: the Set budget UI is broken. Capture the affected state, viewport and concrete failure before implementation; the report does not yet establish whether this is layout, input or submission behavior.

Acceptance:

- The module, input labels, units, help text and confirmation controls remain legible and usable in both themes, on desktop and mobile, and at 200% zoom.
- Users can enter and review a supported budget without clipped controls or overlapping content. Keyboard focus and validation errors are visible.
- The UI clearly distinguishes current and proposed budgets and uses the existing confirmation flow. Failed or canceled changes preserve the current budget and useful input.
- Verify validation, zero/limit behavior according to the existing API contract, loading, errors and permission restrictions. Do not change billing semantics as a layout fix.

## 3. Change the Agent Hedgeling logo

Replace the agent-specific artwork through the swappable brand/design assets. The replacement artwork is still to be chosen; this item does not select a new logo or request a full console rebrand.

Acceptance:

- The launcher and every agent-specific logo placement use the selected brand asset consistently, including full-screen, side-panel and minimized states.
- The logo remains recognizable at small sizes in both themes, with a readable silhouette and a stable button hit area.
- Controls retain accessible names; decorative artwork is hidden from assistive technology where appropriate.
- Swapping the brand asset changes the agent artwork without editing chat behavior or duplicating hardcoded image references.
