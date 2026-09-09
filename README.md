# Phenomena Foundation v1

Phenomena is a device-first scientific platform for making invisible phenomena tangible through manipulation and observation. Foundation v1 begins with a four-Lab Nuclear Collection, built from the original `nuclear-decay-lab` experiment.

## Labs

- `/` — Phenomena Shell and Lab catalogue
- `/labs/decay` — seeded Monte Carlo radioactive decay, theory curve, observation-oriented decay series, existing nuclide map/genealogy, and CSV export
- `/labs/atlas` — searchable proton–neutron nuclide map, principal decay branches, local genealogy, and links to related Labs
- `/labs/detector` — relative educational comparison of GM, scintillation, and semiconductor characteristics, distance, shielding, and measurement time
- `/labs/pulse` — deterministic event-by-event spectrum-like accumulation with representative nuclides, background, detector resolution, time, and seed control
- `/decay` — migration route to `/labs/decay`

Japanese and English are available in all four Labs. Experiment settings are optional browser-local saves; no account, API, paid service, or database is required.

## A first observation path

The catalogue includes a short Co-60 path that keeps the same representative
nuclide while moving through Atlas, Decay, Detector, and Pulse. It is an
orientation aid, not a measurement or identification workflow.

Within Detector and Pulse, the current representative source is also kept in
the local Lab URL and carried into the other Lab by the “next observation”
link. It shares the teaching subject only—not a calibrated setup or result.

## Scientific boundary

Phenomena is an educational conceptual platform. It is not for radiation safety, dose assessment, medical decisions, regulatory compliance, source identification, nuclear-materials protection, or research-grade analysis.

The original nuclide catalog is derived from `radioactivedecay` 0.6.1 default ICRP-107 / AME2020 / Nubase2020 data. ICRP terms are bundled at [`public/data/LICENSE.TXT`](public/data/LICENSE.TXT), including the notice filename requested by those terms. Software is MIT licensed, but bundled nuclear data is subject to separate terms and should not be treated as MIT data. See [`docs/DATA_PROVENANCE.md`](docs/DATA_PROVENANCE.md) before redistributing or commercializing a derivative.

## Development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000/](http://127.0.0.1:3000/) to review the local
catalogue. This is a local development server; it does not publish the site.

Run before review:

```bash
npm run lint
npm test
npm run build:pages
```

`build:pages` exports GitHub Pages output with the `/nuclear-decay-lab` base path. It also checks the static Foundation routes, base-path-prefixed assets, per-Lab canonical/social metadata, legacy Decay fallback, and the bundled ICRP notice files.

## Project documents

- [Vision](docs/VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Lab authoring](docs/LAB_AUTHORING.md)
- [Data provenance](docs/DATA_PROVENANCE.md)
- [ENSDF Atlas import](docs/ENSDF_IMPORT.md)
- [Roadmap](docs/ROADMAP.md)
- [Current state](docs/PHENOMENA_STATE.md)
