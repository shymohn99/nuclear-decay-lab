# Architecture

## Route shape

```text
/                         Phenomena catalogue
/decay                    client migration route → /labs/decay
/labs/decay               preserved Monte Carlo Decay Lab
/labs/atlas               Nuclide Atlas
/labs/detector            Detector Lab
/labs/pulse               Pulse Lab
```

`next.config.ts` retains static export and the `/nuclear-decay-lab` GitHub Pages base path. Internal navigation uses `next/link`, so it is base-path aware. Root legacy anchors are mapped to the closest new Lab after hydration.

The catalogue also includes a Co-60 observation path. It uses ordinary
shareable query URLs to carry the same representative nuclide from Atlas to
Decay, Detector, and Pulse; no server-side session or hidden state connects
the Labs.

`readExperimentQuery`, `withExperimentQuery`, and `replaceExperimentQuery`
are the deliberately small shared query primitive. Atlas, Decay, Detector,
and Pulse use it to read a direct condition or when a visitor deliberately
selects a nuclide or source. It preserves the current path, base path,
unrelated query conditions, and fragment while replacing only the named
experiment parameter. A route query still takes precedence over a saved
browser-local state on first load.

`app/lib/site.ts` keeps the GitHub Pages base path, production origin, and
Phenomena social image in one place. The four Lab route layouts call its small
metadata helper to give shared URLs a Lab-specific browser title, description,
canonical URL, Open Graph preview, and Twitter preview without duplicating
Pages-path logic.

The preserved `/decay` migration route uses the same Decay metadata and
canonical destination. Its static HTML contains a normal link to the current
Lab before the small client-side replacement runs, so the path remains useful
when script execution is delayed or unavailable. When script is available,
the replacement also preserves the legacy URL's query conditions and fragment.

Detector and Pulse add a reciprocal “next observation” link with that current
source parameter. This is an explicit subject handoff, not a transfer of a
measurement configuration or inferred result.

## Common Lab foundation

- `app/lib/labs.ts` is the typed manifest registry. Every Lab declares its identity, collection, data, assumptions, constraints, variables/units, state key, citations, licenses, languages, and safety boundary.
- `app/lib/experiment.ts` supplies browser-local, versioned state envelopes; seeded PRNG; safe CSV cells; common provenance rows; and CSV download.
- `app/lib/nuclear-models.ts` contains pure decay, detector-response, and Pulse generation functions. It is deliberately not a generic physics framework.
- `app/components/PhenomenaShell.tsx` provides the shared bilingual shell, language persistence, reduced-motion preference hook, metadata, safety note, inspectable model disclosure, and save/clear controls.

All four Labs use the registry, bilingual language state, local state controls, shared safety/model disclosure, and reduced-motion handling. Decay, Detector, and Pulse use CSV helpers; Decay and Pulse use the shared seeded-random primitive. Detector and Pulse share the detector/Pulse teaching models; Decay also shares the half-life probability and theoretical-population helpers.

The Shell and catalogue place a focus-revealed skip link before their header.
Decay preserves its established single-instrument layout and uses the same
pattern to jump directly to its existing simulator landmark.

The three CSV-producing Labs prepend the same narrow provenance block to
their export: Foundation release, Lab route, dataset versions/sources/licenses,
citations, assumptions, constraints, and safety boundary. Lab-specific model
settings and observations follow it, so an exported file does not silently
lose the context that makes its values interpretable.

When a dataset has a stable source or bundled license artifact, its manifest can
also carry a source or license link. `ModelDisclosure` renders those as
base-path-aware links that open separately, letting an expert inspect the
upstream overview or local license without losing the active experiment.

## Isolation decisions

The original Decay component remains a large client component at `app/labs/decay/page.tsx`. This avoids changing the Monte Carlo animation, charting, map, genealogy, and established control behavior in the same change as the platform split. Its Foundation-facing changes are the route, shared language/state/CSV/model helpers, Lab navigation, a nuclide query input, and clearer series/activity labels. Its retained detector illustration is explicitly labeled as a relative teaching model and links to the independent Detector Lab; it does not present calibrated `cps` or `cpm` output.

Decay keeps its established instrument layout rather than mounting the newer
`LabLayout` around a second page shell. Its header nevertheless uses the same
Phenomena home target, ordered Lab numbers, current-Lab state, bilingual
navigation label, and base-path-aware internal links as the other Labs.

The Nuclide Atlas uses the bundled data catalog directly and intentionally does not make hundreds of SVG points keyboard stops. A labeled search field and bounded native result buttons (up to 12 matches, or seven representative nuclides before a search) provide the keyboard path; the SVG is an explanatory visual layer. A deliberate selection updates `?nuclide=...` in place, so the current observation can be copied as a direct link.

## Experiment state and reproducibility

State envelopes are stored under `phenomena:experiment:<manifest stateKey>` and contain `{ version, savedAt, state }`. Saving is optional and failure-safe in restricted browsers. A saved state is restored once per Lab mount so an updated callback cannot reapply stale settings. Each Lab clamps or rejects unrecognized restored fields before using them. Pulse's whole event sequence is a pure function of its visible settings and integer seed. Decay offers an editable reset seed, which seeds both its reset particle layout and per-event random stream; the exact visual sequence can still differ when browsers deliver different animation-frame timings. CSV exports include the model and settings before observations.

## Validation boundary

Pure scientific teaching models receive deterministic tests. Rendered route tests exercise the catalogue and every Lab route through the deployed worker build. Browser QA confirms interaction, desktop/mobile layout, keyboard focus, and the Pages base path. Reduced-motion CSS and the Decay/Pulse runtime hooks are source-inspected; an operating-system motion preference must still be exercised in a browser environment that can emulate it. `build:pages` additionally checks its static output for every Lab route, a base-path-prefixed client asset, per-Lab canonical/social metadata, the legacy fallback route, the bundled ICRP license link, and sitemap coverage for every Lab.
