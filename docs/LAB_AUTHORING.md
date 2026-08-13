# Lab authoring

Use this workflow when adding a Foundation-style Lab. Do not add a plugin runtime or a second package until a concrete need proves it.

1. Add a manifest to `LAB_REGISTRY` in `app/lib/labs.ts`.
   - Include a stable `id`, `slug`, Lab number, bilingual identity text, variables and units.
   - List dataset ID/version, source, license, citations, scientific assumptions, constraints, and safety statement.
   - Use `sourceHref` or `licenseHref` only when there is a stable, reviewable source or bundled artifact; the shared disclosure opens these links without losing the active Lab.
   - State the claim level in prose: a model is qualitative, normalized, or physical-units only when the evidence supports that claim.
2. Create `app/labs/<slug>/page.tsx`.
   - Use `LabLayout`, `usePhenomenaLanguage`, `LabStateTools`, and the manifest returned by `getLab`.
   - Keep local interaction state small and serializable. Validate restored state before relying on it.
   - `Clear saved state` removes the browser-local snapshot without changing the active observation; a shared URL must remain truthful after that action.
   - Use `<label>`, native controls, focus-visible styling, and an equivalent keyboard path for any visual control.
   - For catalog-scale choices, prefer a labeled search with a bounded set of native result buttons over hundreds of keyboard stops.
   - When a visitor deliberately chooses the central experiment subject, use `replaceExperimentQuery` so a copyable URL represents that selection. Do not put all transient controls into the URL.
   - Use live regions only for discrete state changes. Do not put a high-frequency animation or event stream in a polite live region.
   - If the Lab exports CSV, prepend `experimentProvenanceRows(lab)` before Lab-specific settings and observations.
3. Create `app/labs/<slug>/layout.tsx` and call `createLabMetadata` from `app/lib/site.ts`.
   - Give the direct Lab route a distinct title and concise description.
   - Do not duplicate the Pages base path, production origin, canonical URL, or social image. The helper owns those values.
4. Put genuinely shared, pure numerical logic in `app/lib/nuclear-models.ts` or a narrowly named sibling. Inject or seed randomness so tests are deterministic.
5. Include a model disclosure in the manifest and a visible safety boundary. Never describe a teaching coefficient as calibration, a relative count as a measured count, or a display as source identification.
6. Add a deterministic test for a changed model and a rendered route test for the initial Lab view, including its distinct title when it has metadata. Run lint, test, and Pages build; the Pages build verifies canonical/social metadata and base-path assets for every listed Lab.
7. Update `DATA_PROVENANCE.md`, `public/sitemap.xml`, `ROADMAP.md` if scope changes, and `PHENOMENA_STATE.md` at the checkpoint.

Avoid broad abstractions such as generic simulation engines, schema-driven UIs, and remote plugins until multiple shipping Labs demonstrate a shared requirement.
