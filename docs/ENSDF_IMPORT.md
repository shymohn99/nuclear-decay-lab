# ENSDF Atlas import

Atlas Phase 2 introduces a canonical nuclide/state/branch graph before replacing
the Foundation catalog. The current 992-row bundle remains the production
source until a generated ENSDF snapshot has passed scientific and
redistribution review.

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

Do not copy the generated snapshot from `work/` into `app/` or `public/`, and do
not push it, until redistribution terms have been reviewed and a snapshot date,
checksum, source URL, citation, and applicable notice are committed together.
The sync script enforces the ignored `work/` destination.

## Canonical IDs

Application IDs are derived from physical identity (`Z`, `A`, and state index),
not NNDC database IDs. This lets a future snapshot replace the current source
without breaking saved Atlas selections or shared links when NNDC regenerates
its database IDs.

