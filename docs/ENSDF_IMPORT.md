# ENSDF Atlas import

Atlas Phase 2 introduces a canonical nuclide/state/branch graph and a local
review build of the evaluated map. The current generated Atlas bundle contains
3,441 chart nuclides, 4,362 states, and 4,409 decay records in 119 Z-shards.
The four Z=0 neutron-only identities are kept out of the proton-neutron chart.

## Reproducible local snapshot

Run `npm run atlas:data:sync`. The command reads the official NNDC ENSDF public
beta API and writes a checksum-locked snapshot below ignored `work/ensdf/`.
It records the API release's `dataGeneratedAt` value because API database IDs
are not stable across full regenerations.

The local snapshot contains:

- the complete nuclide identity list;
- adopted ground-level records, including stable flags where evaluated;
- evaluated decay edges and their parent/daughter state data;
- retrieval time, release metadata, record counts, endpoints, and SHA-256.

The source API is documented at <https://www.nndc.bnl.gov/ensdf-api/>. Its
machine-readable contract is at
<https://www.nndc.bnl.gov/ensdf-api/openapi.json>. NuDat's current terms and
recommended citation are documented at
<https://www.nndc.bnl.gov/nudat3/guide/#terms>.

## Bundling gate

`npm run atlas:data:build` converts the ignored source snapshot into a compact
index and per-Z shards for local UI review. Do not push, publish, or release the
generated `app/generated/ensdf-atlas-index.json` or
`public/data/ensdf-atlas/` files until redistribution terms have been reviewed.
The source lock intentionally keeps `allowedDistributionProfiles` empty.

## Canonical IDs

Application IDs are derived from physical identity (`Z`, `A`, and state index),
not NNDC database IDs. This lets a future snapshot replace the current source
without breaking saved Atlas selections or shared links when NNDC regenerates
its database IDs.

The current API daughter payload identifies the daughter nuclide but not a
daughter state. The local Atlas therefore links decay destinations to the
daughter ground state and discloses this limitation; it does not infer a level.
Missing half-life or decay records are also not interpreted as stability. Only
an explicit evaluated `isStable` flag creates a stable state.
