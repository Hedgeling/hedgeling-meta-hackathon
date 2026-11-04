# Submission readiness

Updated November 4, 2026. This checklist records observed evidence and remaining submission actions; it does not certify organizer approval or submit the project.

## Verified preparation

- GitHub reports `Hedgeling/hedgeling-meta-hackathon` as **PUBLIC**, with `main` as the default branch. The npm `private: true` flag prevents package publication; it does not make the GitHub repository private.
- Fresh event-only history, Apache-2.0 license/NOTICE, pinned public dependencies, per-file provenance, excluded-baseline checks and a disclosed proprietary-service boundary are present.
- The hosted platform release `b232811f97cd3b30efc6c4568734e6f41897ebbf` records event modules from `c87a64273dadb09bd6151fa5cf274a437206cae3`. The demo's active healthy container was independently matched to that release's immutable image digest; health/login returned 200 and anonymous agent configuration returned 401.
- Real app translation PR [Scroll Goblin #96](https://github.com/shane-washburn/scroll-goblin/pull/96) was merged on November 4. The owner recorded source/context/translation/PR/merge and multilingual gameplay footage; processing and deployment waits are shortened and labeled in the video.
- A 177-second narrated video has been rendered locally and decoded end to end without errors. Original recordings and prior cuts remain private. Video upload and portal attachment are separate actions.
- The Judges demo organization and judge membership are provisioned. The owner supplied a signed-in judge-console screenshot. This establishes observed sign-in, not an independently repeated end-to-end judge translation/PR run.
- A [judge walkthrough](JUDGES.md) describes private access, scope, approvals, provider/job checks, runtime/GitHub prerequisites and password/session recovery.

## Before pressing Submit

- Ensure the latest reviewed event branch and these documentation updates are merged to `main`, and the exact resulting main revision passes public CI. A passing development branch alone does not update the default branch.
- Upload the final three-minute-or-shorter video and test its judge-visible link from a signed-out/private browser. Keep the opening disclosure distinguishing the earlier engine/console from event work. Do not publish judge credentials with the video.
- Supply the hosted demo URL, judge-account setup and support instructions privately through the submission access channel. Test the actual supplied credentials in a fresh browser session, including the password challenge and selecting Judges demo.
- Rehearse a small allowed judge workflow on the final deployed version; verify provider allowance, extraction/import and translation status. A judge PR additionally needs that judge's GitHub account, destination write access, App permissions and compatible runtime setup. Do not promise an end-to-end PR on an unconfigured arbitrary repository.
- Keep authorized hosted access available through the judging period; confirm the event's required duration and any organizer updates.
- Add all accepted teammates, verify the team limit, and have one representative submit one project with the public repository, video and access instructions.
- Recheck the current authenticated event portal and Official Rules. The owner-supplied record lists November 4, 2026 at 9 PM Eastern (7 PM Boise) and a four-person limit; the participant details page was not readable through the public text fetch during this audit. These details therefore remain owner-supplied, not freshly independently verified.

## Evidence boundaries

See [verification](VERIFICATION.md), [provenance](PROVENANCE.md), [hosted changes](hosted-changes.json) and [working rules record](EVENT-RULES.md). Fixture tests are not live inference. Deployment identity/health is not proof of every UI path. A successful owner PR does not prove a fresh judge has repository write access. Local preparation does not upload a video, invite judges or submit the portal form automatically.
