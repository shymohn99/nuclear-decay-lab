# Phenomena Foundation architecture

## Runtime shape

The repository remains a single Next/vinext application. It is not a monorepo and does not introduce a plugin runtime.

```text
app/page.tsx                         Phenomena Shell / catalogue
app/labs/{decay,atlas,detector,pulse}/page.tsx
                                      independently addressable Labs
app/components/PhenomenaShell.tsx   shared chrome, language, state tools
app/lib/labs.ts                      typed manifest and registry
app/lib/experiment.ts                seed, state envelope, CSV, translation
app/lib/nuclear-models.ts            pure decay, detector, pulse models
app/radionuclides.ts                 bundled generated nuclide records
```

The original Decay Lab implementation is preserved in `app/labs/decay/page.tsx`. The root route is now the catalogue; `/decay` is a small migration route to the new canonical Decay Lab URL.

## Manifest and registry

`LabManifest` is the contract for a Lab. It carries identity, route, discipline, dataset references, assumptions, constraints, supported languages, parameter and observation definitions, citations, licenses, and safety notes. `LAB_REGISTRY` is checked with TypeScript's `satisfies` operator, so the catalogue and navigation are generated from the same typed source.

The registry is descriptive, not executable. A Lab page owns its UI and experiment state. This keeps the abstraction honest while still making the shell, catalogue, provenance, and authoring workflow consistent.

## State flow

Interactive state stays in the client component for each Lab. `LabStateTools` serializes an explicit versioned envelope under `phenomena-foundation-state:<labId>` in `localStorage`. Restore is optional; the experiment remains usable when storage is unavailable. Seeds are explicit inputs to pure models so a saved configuration can be replayed.

## Scientific model boundary

Pure functions in `nuclear-models.ts` are deterministic and testable without a browser. Detector response uses relative efficiency, inverse-square distance, shielding transmission, and Poisson uncertainty. Pulse Lab samples a small educational event model with representative energy lines, detector resolution, a background continuum, and a seeded random generator. These are explanatory models, not calibration or safety models.

## Build and deployment

The app keeps the existing vinext/Vite development path and Next static Pages build. When `GITHUB_PAGES=true`, metadata and generated links use `/nuclear-decay-lab` as the base path. No external network call is part of an experiment run.
