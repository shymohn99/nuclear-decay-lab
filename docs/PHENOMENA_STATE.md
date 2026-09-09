# Phenomena state

## Current phase

Foundation v1 is publicly released. The same validated source is live through
GitHub Pages and the existing Phenomena hosted deployment; the next goal is
data-provenance and full-decay-network work, not more Foundation scope.

## Baseline and confirmed decisions

- The original base `bdd997e` passed its lint and original two-test suite in
  an isolated worktree. Its locked `npm ci` is not reproducible on this Windows
  machine because `@esbuild-kit/core-utils@3.3.2` resolves as Android/ARM64;
  this is a baseline environment limitation, not a Foundation regression.
- Preserve the established Decay experience while using a typed in-repository
  manifest and small shared primitives—not a plugin runtime or monorepo.
- Keep state browser-local and versioned. URLs share only an explicit
  subject/source, never a derived measurement result.
- Keep all detector and Pulse results educational and inspectable; code is MIT
  while bundled nuclear data remain separately licensed.

## Foundation v1 delivered

- Phenomena catalogue, four independent Labs (Decay, Nuclide Atlas, Detector,
  Pulse), `/decay` migration, and original-anchor migration paths.
- Shared bilingual Shell, manifest registry, local save/clear controls, seeded
  helpers, safe CSV provenance, model/safety disclosures, and Pages routing.
- Required vision, architecture, authoring, data-provenance, roadmap, and
  state documents; deterministic model/catalog/CSV/URL and route coverage.

## Latest refinement checkpoint (2026-08-13)

- Co-60 provides a base-path-safe observation path through all four Labs.
  Atlas has bounded keyboard search; selection, source handoffs, and legacy
  mappings keep deliberate URL conditions.
- Each Lab has distinct metadata and social preview. Canonical metadata now
  identifies the GitHub Pages origin only; no template-hosting URL or runtime
  `fetch()` call remains in the product surface.
- Skip links, named control groups, active navigation, bounded Pulse status,
  reduced motion, English/Japanese document language, and 320 px Decay layout
  received focused accessibility review.
- Decay starts at its documented default seed and offers a visible, editable
  reset seed for its particle layout and event stream. A separate seeded
  click-pulse stream does not change decay outcomes; frame timing remains a
  visual-replay limitation.
- Detector variation is explicitly illustrative, Pulse's synthetic background
  and high-rate bound are documented, and the retained series terminal is a
  display limit rather than a false stable claim.
- ICRP provenance is visible in Lab disclosures and CSV. `LICENSE.TXT` now
  carries the complete ICRP-07 notice under the filename named by its terms;
  the existing ICRP-named copy is retained and Pages verifies both files.
- A direct Lab URL now overrides saved state only for a recognized nuclide or
  source. An unknown `nuclide` or `source` parameter falls back to the saved
  experiment instead of silently suppressing it.

## Verification checkpoint (2026-08-13)

- `npm run lint` passed.
- `npm test` passed: four rendered route/foundation checks and ten deterministic
  model, catalog, CSV, or URL checks.
- `npm run build:pages` passed for `/`, `/decay`, and all four Labs. Its guard
  verified Pages assets, canonical/social metadata, migration fallback,
  sitemap coverage, Atlas's `LICENSE.TXT` disclosure, and both ICRP notices.
- Pages-served browser QA covered direct URLs, the Co-60 journey, legacy
  query/anchor migration, save-state precedence, Japanese/English switching,
  keyboard/focus paths, Pulse accumulation, 390 px/320 px layouts, and no
  browser errors or horizontal overflow. A new Decay run began at `131`,
  accepted seed `777`, and Reset advanced the visible seed to `874` without an
  error.
- The release-candidate rerun passed `npm run lint`, `npm test` (four route /
  foundation and ten deterministic checks), and `npm run build:pages` after
  the URL-precedence refinement. A Pages-served browser check confirmed valid
  URL overrides and unknown-URL restoration in Decay, Atlas, Detector, and
  Pulse; the Pulse Lab was visually checked at 320 px without overflow.
- Public release succeeded on 2026-08-14. GitHub Pages workflow #57 built the
  final tree successfully; `/index.html` and all four Lab URLs returned the
  Phenomena release without browser errors. The hosted release is public at
  `https://nuclear-decay-lab-shymohn.shymohn.chatgpt.site`. The plain Pages
  root briefly retained a CDN-cached pre-release document, while the fresh
  index and cache-busted root returned Foundation v1 as expected.
- The current static split check is nine initial scripts / 645.6 KiB for the
  catalogue and eleven / 765.3 KiB for Decay. The catalogue does not preload
  all Lab chunks. OS reduced-motion emulation was unavailable; CSS and runtime
  handlers were source-inspected as the alternate check.

## Known scientific and product limits

- Decay Physics mode now samples curated outcome splits for I-131, Cs-137,
  and Co-60. I-131 and Cs-137 retain grouped remainders; these splits are not
  full nuclear-level or gamma schemes. Decay series remain milestone sequences,
  not complete branch networks, and frame timing can affect exact visual playback.
- Atlas exposes one principal branch per parent, not a current authoritative
  nuclide database.
- ICRP-derived data retain notice/non-commercial constraints, and AME/Nubase
  redistribution metadata needs stronger provenance before commercialization.
- Detector and Pulse are conceptual education models, never tools for safety,
  dose, medical, regulatory, identification, or research decisions.

## Recommended next goal

Complete a focused data-provenance and full-decay-network goal before adding
Count Lab, then use the documented Lab-authoring flow for the next collection.
