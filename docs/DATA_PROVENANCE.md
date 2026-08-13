# Data provenance and scientific limitations

## Bundled nuclide catalog

`app/radionuclides.ts` is a generated, ground-state-parent catalog. The repository comments identify it as derived from the default `radioactivedecay` 0.6.1 dataset using ICRP-107 / AME2020 / Nubase2020 data. Each row contains one principal supported branch, not a complete branching scheme.

The associated terms are bundled at `public/data/LICENSE.ICRP-07.txt`. The software in this repository is MIT licensed; the data terms remain separate and must be preserved when redistributing the catalog.

The Atlas uses the catalog to place records by proton number and neutron number and to display nearby parent/daughter records. It is an educational index, not a complete evaluated nuclear-data service.

## Decay model

For a single decay step:

```text
P(decay in Δt) = 1 − 2^(−Δt / T½)
N(t) = N₀ · 2^(−t / T½)
```

Decay Lab preserves the original Monte Carlo implementation, including its physical-ratio and observation-friendly chain timing modes. Observation mode is intentionally non-physical and is labeled as such in the UI.

## Detector model

Detector Lab uses relative educational coefficients for GM, scintillation, and semiconductor detector types. The displayed signal follows:

```text
signal ∝ activity fraction × (10 cm / distance)² × efficiency × exp(−μ × thickness)
```

Background, count totals, and uncertainty are simplified. Detector dead time, geometry, energy calibration, pulse-shape discrimination, coincidence, and environmental effects are omitted. Values must not be interpreted as counts from a real instrument.

## Pulse model

Pulse Lab uses three representative educational sources: Cesium-137 at 662 keV, Cobalt-60 at 1173 and 1332 keV, and Iodine-131 at 364 and 637 keV. These line choices are deliberately small and are documented in the manifest. A normal broadening term represents detector resolution; a low-rate continuum represents background. The generator is seeded and the model is tested for reproducibility.

Pulse Lab does not perform nuclide identification, calibration, activity estimation, dose calculation, or safety assessment. Peak labels are reference marks for learning, not an analysis result.

## Citation policy

When adding a dataset or representative value, record the exact version, source URL or publication, license/terms, transformation applied, and why it is suitable for an educational model. Unknown or incompatible terms are a release blocker; do not silently bundle them.
