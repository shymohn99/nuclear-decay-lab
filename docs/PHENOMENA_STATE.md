# Phenomena state

## Current phase

Foundation v1 implementation and local verification are complete. The repository is not published or pushed by this task.

## Confirmed decisions

- Keep one Next/vinext application; do not introduce a monorepo or untested plugin system.
- Use `/` as the Phenomena catalogue and `/labs/<slug>` as canonical shareable Lab URLs.
- Keep the original Decay Lab behavior in a dedicated route and provide `/decay` as a migration route.
- Keep scientific transformations in small deterministic functions where possible.
- Treat the ICRP-derived catalog license as separate from the MIT software license.
- Make safety, medical, dosimetry, regulatory, and research-grade use explicitly out of scope.

## Completed checkpoints

- [x] Audited the downloaded `shymohn99/nuclear-decay-lab` source, README, package, build scripts, tests, and bundled data license.
- [x] Recorded baseline: lint passed; initial build/test required native optional dependencies; after dependency repair, test and Pages build passed.
- [x] Added typed Lab manifest/registry and shared language, persistence, deterministic random, CSV, detector, and pulse model utilities.
- [x] Added Phenomena catalogue and four independent Lab routes.
- [x] Added Atlas map/genealogy, Detector comparison, and Pulse event accumulation.
- [x] Added deterministic model tests and route rendering tests.
- [x] Added architecture, authoring, provenance, vision, roadmap, and state documents.

## Verification

Last local verification on 2026-08-13:

- `npm run lint` — passed.
- `npm test` — passed: four rendered-route tests and three deterministic model tests.
- `npm run build:pages` — passed; static output contained `/nuclear-decay-lab` asset and route paths.
- GitHub Pages base path — verified from generated `out/labs/detector/index.html`; assets, metadata, and route links use `/nuclear-decay-lab`.
- Browser QA — passed on the local preview at desktop and 390px mobile widths: catalogue/Lab routes, Pulse accumulation, Japanese/English switching, Atlas map selection and genealogy, Atlas-to-Detector deep linking, Detector controls, Decay `?nuclide=Co-60`, keyboard activation, and reduced-motion CSS rules were checked.

## Known constraints

- The extracted upstream archive is being worked on in `work/source/nuclear-decay-lab-main` because the host Git installation lacks its HTTPS remote helper; no push or publication was performed.
- The static build classifies some routes as unknown under vinext's current analysis even though the generated Pages build is successful.
- Detector and Pulse models are intentionally simplified and must not be used for operational decisions.

## Next step

Review the local archive-based working copy with the upstream checkout metadata restored, if a Git diff or publication workflow is needed later. The Foundation v1 code itself is ready for review; Count Lab or another non-nuclear Lab is the recommended next product goal.
