# Console UI polish

Status: mixed implementation and backlog. Requested October 28, expanded October 29 and November 1, 2026. Items 1–3 and 5 remain deferred. Translation progress was implemented earlier; this pass extends item 4 and implements items 6–8 in the public platform console. Existing platform files are not copied into this event repository.

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

## 4. Make translation and QA progress prominent

Reported problem: progress such as “Translating · 67 of 2474 drafts saved” is easy to overlook, and changes to the count are hard to notice during a long run.

Proposed direction: give the active job a clearly visible progress area with its name, current stage, progress bar, percentage and a larger completed/total count. Make updates noticeable without distracting from reading or manual work. Show the same authoritative progress in the job UI and the relevant chat progress card.

Acceptance:

- Users can quickly see that a job is working and how far it has progressed, including in a narrow side panel and on mobile.
- Counts use readable formatting, for example “67 of 2,474 drafts saved.” Values come from server-reported job state; do not animate invented progress or show an unsupported time estimate.
- Translation and QA/review have distinct stage labels and counts. Finishing draft generation must not imply that QA, verification or the whole workflow has finished.
- Count changes are visually noticeable without layout jumps or forced scrolling. Any animation respects reduced-motion preferences; screen-reader announcements summarize progress without announcing every saved string.
- Queued, running, stopped, failed and completed states remain clear. If updates cannot be fetched, show that status rather than presenting an old count as current.
- Maintain legibility in both themes and at 200% zoom. Progress updates use existing job/status reads and do not trigger model calls or change job execution.

## 5. Distinguish user messages from Hedgeling responses

Reported problem: the user's question and the agent's answer blend together in the chat window.

Proposed direction: use distinct card backgrounds or surfaces for “You” and “Hedgeling,” supported by clear speaker labels and consistent spacing. The exact visual treatment remains open for the later UI pass.

Acceptance:

- A user can identify their question and Hedgeling's response at a glance while scanning a conversation.
- Keep explicit speaker labels; do not rely on color alone. Text, links, emphasis and code remain readable against both card surfaces in light and dark themes.
- Apply the distinction consistently in full-screen and side-panel chat, including mobile and long or multiline messages.
- Approval cards, tool activity and job progress remain distinguishable from ordinary message text and clearly associated with the relevant response.
- Define role-specific surfaces through the shared design tokens so branding can be swapped without changing chat logic.

## 6. Theme dropdown menus and make arrows visible

Implemented November 1: shared console styling for the closed select, picker, selected option and checkmark. A larger high-contrast chevron makes the control obvious. Uses the browser's customizable-select support, keeping native keyboard navigation, typeahead, disabled options, form submission and validation. Unsupported browsers retain their operating-system menu and get the clearer closed-control arrow. The workspace picker uses the same chevron treatment.

Acceptance: verify opening/closing, keyboard selection and Escape focus, light/dark themes, narrow screens and native fallback. No custom JavaScript option list is layered over the form control.

## 7. Open business units in a focused workspace

Implemented November 1: Projects starts with compact business-unit cards showing project counts and names. Selecting a card opens that business unit across the available content width. Each project has separate cards for Languages, Source strings, Translation context, Documents (an alternative source), and Translate/review/deliver. Other units stay out of the focused view. Agent semantic destinations select the matching unit before highlighting a project or job.

Added navigation improvements: All business units returns to the overview and restores keyboard focus to the originating card. Quick links jump to each project's workflow cards; Open translations enters the editor. Switching between units preserves in-page form drafts. Empty units have an explicit next action, Create project. Navigation does not start work or approve changes.

Acceptance: user and agent navigation reach the same focused workspace; permissions still determine available controls; refreshes preserve selected unit; mobile and chat side-panel layouts stay in one column. An agent refresh preserves existing source, context and document review panels only while the project still permits them.

## 8. Update the home message

Implemented November 1: “Your app. In any language.” replaces “Your work. Every language.” Existing navigation and account context are unchanged.

## Progress extension (item 4)

Implemented November 1: context enrichment and QA show saved/checked totals and percentages; extraction shows the reported stage with an indeterminate bar until completion. Document inspection and approval actions show activity while requests are pending. The same components render in the workspace and applicable agent cards. A request budget is not a completion total; missing status reads display unavailable, and failed runs retain only their measured partial progress. Completing generation never implies approval or verification. These displays use existing authenticated reads and do not make model requests.

## Further ideas for a later pass

- A compact “Needs your attention” area for approvals, stopped jobs and completed drafts awaiting review, linking directly to the relevant card.
- Project search and filters for workspaces with many games or products.
- A persistent breadcrumb/deep link to a selected business unit and workflow card, including browser Back/Forward and reload restoration.
- Continue the provider/model clarity, budget repair and chat-speaker contrast items above. Replacement agent artwork still needs a selected asset.
