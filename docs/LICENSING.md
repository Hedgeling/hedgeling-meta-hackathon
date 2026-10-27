# Licensing scope

On October 27, 2026, the project owner explicitly selected Apache-2.0 for this fresh public repository's event-created code. The earlier instruction to preserve commercial licensing continues to apply to the existing product and private engine; it is not the license of this new extract.

| Material | Terms and boundary |
| --- | --- |
| Original code, tests, examples, interface contract, and documentation distributed here | Apache License 2.0; copyright thehedgeling.com; see root LICENSE and NOTICE |
| Existing Hedgeling console, engine, injector, and private hosted-service implementation | Separate proprietary works; not included and not relicensed here; service access requires authorization |
| Meta API and models | External service/model terms; no model weights are distributed; an API account/key is needed for live verification |
| Node.js and GitHub Actions | Separately obtained tooling; upstream licenses apply; see dependencies below |
| Hedgeling and Meta names/marks | Used to identify the project and dependencies; no trademark permission is granted |
| Synthetic example catalog | Authored during the event and distributed under Apache-2.0 |

The commercial npm EULA is not copied into this repo: it describes a different package and does not govern this independent extract. Apache-2.0 permits use, modification, and redistribution subject to its conditions and contains an express patent grant with the limitations in the license. Do not add restrictions to NOTICE that contradict those rights.

No npm runtime/development packages are currently required. Before adding dependencies, record their versions and licenses and retain any required notices. There are no vendored product assets or model files.

## Separately obtained dependencies

- Node.js 22+: [Node.js licensing](https://github.com/nodejs/node/blob/main/LICENSE). The runtime and its bundled third-party notices are not vendored here.
- `actions/checkout` v6, pinned to `d23441a48e516b6c34aea4fa41551a30e30af803`: [MIT license](https://github.com/actions/checkout/blob/d23441a48e516b6c34aea4fa41551a30e30af803/LICENSE).
- `actions/setup-node` v6, pinned to `249970729cb0ef3589644e2896645e5dc5ba9c38`: [MIT license](https://github.com/actions/setup-node/blob/249970729cb0ef3589644e2896645e5dc5ba9c38/LICENSE).
- Official Apache-2.0 text copied unmodified from [Apache Software Foundation](https://www.apache.org/licenses/LICENSE-2.0.txt).

These are declared pre-existing third-party dependencies/legal text, not event accomplishments. Future external contributions must be submitted with rights sufficient for Apache-2.0 distribution; do not accept proprietary third-party code without authorization.

The supplied organizer clarification permits the private hosted dependency. It does not impose a particular open-source license on the new repo. Apache-2.0 is the owner's explicit choice, not an asserted organizer requirement. Final event eligibility remains governed by the Official Rules and organizer decisions.
