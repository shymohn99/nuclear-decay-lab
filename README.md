# Phenomena Foundation v1

Phenomena is an interactive, device-first platform for making invisible phenomena tangible. Foundation v1 begins with a four-lab Nuclear Collection while keeping the original `nuclear-decay-lab` experiment available as Decay Lab.

## Labs

- `/` — Phenomena Shell and Lab catalogue
- `/labs/decay` — Monte Carlo radioactive decay, chain timing, theory, charts, CSV export, nuclide genealogy, and the original detector comparison
- `/labs/atlas` — proton–neutron nuclide map, principal decay records, and nearby genealogy
- `/labs/detector` — GM, scintillation, and semiconductor response comparison with distance, shielding, and measurement time
- `/labs/pulse` — deterministic event-by-event spectrum-like accumulation with representative sources, detector resolution, background, measurement time, and seed control
- `/decay` — migration route to `/labs/decay`

All experiments run in the browser. Saved experiment state is optional and stored in local browser storage; no external AI, paid API, account, or database is required.

## Scientific boundary

The simulations are educational models. They expose assumptions and simplifications in each Lab manifest and in [`docs/DATA_PROVENANCE.md`](docs/DATA_PROVENANCE.md). They are not intended for radiation safety, medical use, dosimetry, regulatory compliance, nuclear-materials protection, or research-grade analysis.

The nuclide map is generated from a bundled catalog derived from the default `radioactivedecay` 0.6.1 ICRP-107 / AME2020 / Nubase2020 data. Its terms are included at [`public/data/LICENSE.ICRP-07.txt`](public/data/LICENSE.ICRP-07.txt). The project code is MIT licensed.

## Local development

Requirements: Node.js 22.13 or later.

```bash
npm install
npm run dev
```

Validation commands:

```bash
npm run lint
npm test
npm run build:pages
```

`build:pages` builds the static GitHub Pages output with the `/nuclear-decay-lab` base path. The route and asset checks are covered by the test suite and by the generated `out/` directory.

## Project notes

- [Vision](docs/VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Lab authoring](docs/LAB_AUTHORING.md)
- [Data provenance](docs/DATA_PROVENANCE.md)
- [Roadmap](docs/ROADMAP.md)
- [Current state](docs/PHENOMENA_STATE.md)
