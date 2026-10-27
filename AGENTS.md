# Event-only submission repository

- Include only work created during the event starting October 26, 2026, as confirmed by the owner. A new commit date does not establish authorship of copied code.
- Do not import the earlier console, MCP implementation, design system, engine, injector, customer source, or old Git history. Do not copy whole modified files that contain pre-event implementation.
- Record origins in docs/provenance.json. Standard license texts and declared third-party dependencies are explicitly labeled exceptions, not event contributions.
- New repository code is Apache-2.0 by the owner's explicit choice. The existing product and private service implementation retain their own commercial terms. Do not copy their EULA here or relicense them.
- Credentials and private upstream endpoints are server-only configuration. No live AWS/service deployment addresses in code or documentation, including defaults. Missing configuration must fail explicitly. VITE_* variables are public.
- Models may propose work; authorization and human approval belong to the authenticated server. Do not add write execution to the verification harness.
- Keep fixture demonstrations labeled. Do not claim a fixture proves live Meta inference or private extraction.
- Run npm run check, npm test, and npm run demo before publication. Review new files for provenance and secrets; automated checks cannot establish authorship or hackathon eligibility.
- CI has no deployment credentials. This repo does not deploy or publish npm packages automatically.
