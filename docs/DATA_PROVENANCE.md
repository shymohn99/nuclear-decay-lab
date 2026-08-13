# Data provenance and scientific boundaries

## Code and bundled data are licensed separately

The repository software is MIT licensed. The bundled nuclide records are not automatically MIT data.

| Dataset / model | Version or scope | Use in Foundation v1 | Provenance and boundary |
| --- | --- | --- | --- |
| `radionuclide-catalog` | `radioactivedecay` 0.6.1-derived, 992 records | Atlas and legacy Decay map/genealogy | Derived from ICRP-107 / AME2020 / Nubase2020 default data. Ground-state parents only; one highest-supported decay branch per record. ICRP-07 terms are bundled in `public/data/LICENSE.TXT`, the notice filename named by those terms; the existing ICRP-named copy remains alongside it. They include education/research/non-commercial conditions and notice retention requirements. Do not treat this data as unrestricted or commercial-ready. |
| NuDat footprint | Original-app static spatial outline | legacy Decay background map | A visual footprint, not a current or complete NuDat export. The source snapshot date and redistribution terms are not established locally; it must not be represented as an authoritative live database. |
| Detector teaching model | Foundation v1 | Detector Lab | Author-defined relative coefficients for distance, transmission, detector response, and background. Not calibration data; no activity, dose, geometry, dead time, scattering, or source-specific response. |
| Pulse teaching model | Foundation v1 | Pulse Lab | Synthetic seeded events. Representative energy anchors: Cs-137 662 keV, Co-60 1173/1332 keV, I-131 364 keV. They are rounded educational anchors, not a licensed identification library or spectrum database. |

The original catalog header identifies its upstream derivation. AME/Nubase citation material is referenced through the upstream `radioactivedecay` project, but this repository does not bundle a source extraction script, an AMDC license file, a snapshot date, or a checksum. Before redistribution beyond the existing terms—or any commercial use—obtain and record those items or replace the dataset.

## Model assumptions

### Decay Lab

For independent nuclei, the model uses `P(decay) = 1 - 2^(-Δt/T½)` and `N(t) = N0 · 2^(-t/T½)`. It assumes constant half-life and independent nuclei. The editable reset seed initializes both particle placement and the event random stream, so a restored reset state carries the same random source; browser animation-frame timing can still change exactly when individual events are advanced on screen. The optional click-to-show detector pulse uses a separate seeded visual stream and does not alter the decay-event stream. The legacy series visualization contains observation-oriented milestones and can omit intermediate nuclides; it is not a complete physical decay network. Its terminal card is labeled a display limit rather than stable.

The legacy map uses one principal branch. A displayed branching fraction does not cause a full probabilistic branch graph. “Normalized decay rate” is not Bq or a measurement of a real source.

### Detector Lab

The model is an inspectable relative comparison:

```text
relative signal = baseline × source intensity × inverse-square-like distance factor
                  × teaching efficiency × exp(-teaching coefficient × thickness)
```

It reports relative expectation only. It does not simulate an actual detector, shielding assembly, or radiation-protection scenario.

The displayed relative variation index applies `1 / √(relative expected count)`
only as a visual teaching cue for how a larger relative expectation changes the
shape of a counting comparison. It is not a Poisson error estimate for a real
measurement, an uncertainty budget, or a confidence interval.

The retained detector comparison within Decay Lab uses the same class of
relative teaching coefficients. Its display is labeled in relative model units
rather than calibrated `cps`/`cpm`, and it links to Detector Lab for the
standalone comparison interface.

### Pulse Lab

Pulse uses a deterministic seeded PRNG. Signal energy is sampled around a representative anchor with a normal distribution whose FWHM is controlled by detector characteristic and resolution scale. Background is intentionally uniform from 0–1600 keV. Event totals use a seeded Poisson product sampler at low means and a seeded normal approximation above a mean of 80, then are capped for responsive browser interaction. This is an explicit educational approximation, not a statistical-analysis implementation. The result is a teaching visualization, never a nuclide-identification or quantification tool.

## Required user-facing boundary

Every Lab exposes this meaning in Japanese and English: it is not for radiation safety, dose assessment, medical decisions, regulatory compliance, source identification, or research-grade analysis.
