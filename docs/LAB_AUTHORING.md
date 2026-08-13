# Adding a Lab

Foundation Labs are ordinary route components plus one registry entry. Do not create a plugin package or a generic visual builder for a single experiment.

## Steps

1. Add a new `LabId` and a manifest object in `app/lib/labs.ts`.
2. Provide a stable `slug`, two-language title/summary/description, lab number, discipline, status, dataset references, assumptions, constraints, parameters, observations, citations, licenses, and safety notes.
3. Add `app/labs/<slug>/page.tsx` and use `LabLayout` so the route inherits the same header, language toggle, metadata, and footer.
4. Keep experiment math in a pure function in `app/lib/` when it has deterministic behavior worth testing.
5. Use `LabStateTools` for an explicit, JSON-safe state object. Include a version-compatible fallback and keep seeds in the saved state when randomness is involved.
6. Add a rendered route assertion and deterministic model tests where applicable.
7. Update `docs/DATA_PROVENANCE.md` and `docs/PHENOMENA_STATE.md` before review.

## Minimal manifest shape

```ts
{
  id: "new-lab",
  slug: "new-lab",
  labNumber: "05",
  title: { ja: "…", en: "…" },
  summary: { ja: "…", en: "…" },
  description: { ja: "…", en: "…" },
  datasets: [{ id, version, role, source, license }],
  assumptions: [{ ja: "…", en: "…" }],
  constraints: [{ ja: "…", en: "…" }],
  languages: ["ja", "en"],
  parameters: [],
  observations: [],
  citations: [],
  licenses: [],
  safety: [{ ja: "…", en: "…" }],
  status: "foundation",
}
```

## Review questions

- Can a reader tell what is measured, simulated, or intentionally omitted?
- Does the experiment work without network access?
- Is the default state useful before any interaction?
- Are controls native, keyboard reachable, and labeled in both languages?
- Is there a deterministic test for any scientific transformation?
- Does the Lab avoid making safety, medical, dose, or regulatory recommendations?
