import assert from "node:assert/strict";
import test from "node:test";
import {
  DETECTOR_MODELS,
  PULSE_SOURCES,
  binPulseEvents,
  computeDetectorResponse,
  decayProbability,
  generatePulseRun,
  theoreticalPopulation,
} from "../app/lib/nuclear-models.ts";
import { createSeededRandom, experimentProvenanceRows, readExperimentQuery, toCsv, withExperimentQuery } from "../app/lib/experiment.ts";
import { getLab } from "../app/lib/labs.ts";
import { MAP_RADIONUCLIDES } from "../app/radionuclides.ts";
import {
  DECAY_BRANCHING_SCHEMES,
  DECAY_BRANCHING_VERSION,
  resolveDecayBranchingScheme,
  sampleDecayBranch,
} from "../app/lib/decay-branching.ts";

test("decay equations preserve half-life invariants", () => {
  assert.equal(decayProbability(0), 0);
  assert.equal(decayProbability(1), 0.5);
  assert.equal(theoreticalPopulation(800, 1), 400);
  assert.equal(theoreticalPopulation(800, 2), 200);
});

test("curated Physics branches are complete and sourced from the bundled catalog", () => {
  assert.equal(DECAY_BRANCHING_VERSION, "curated-outcome-splits-v1");
  for (const scheme of DECAY_BRANCHING_SCHEMES) {
    assert.ok(scheme.outcomes.every((outcome) => outcome.probability > 0 && outcome.probability <= 1));
    assert.ok(Math.abs(scheme.outcomes.reduce((sum, outcome) => sum + outcome.probability, 0) - 1) < 1e-12);
  }
  const iodine = resolveDecayBranchingScheme("I-131")!;
  assert.equal(iodine.outcomes[0].probability, 0.98824);
  assert.equal(iodine.outcomes[1].probability, 0.01176);
  const cesium = resolveDecayBranchingScheme("cesium-137")!;
  assert.equal(cesium.outcomes[0].probability, 0.94399);
  assert.equal(cesium.outcomes[1].probability, 0.05601);
  const cobalt = resolveDecayBranchingScheme("Co-60")!;
  assert.equal(cobalt.outcomes.length, 1);
  assert.equal(cobalt.outcomes[0].probability, 1);
  assert.match(cobalt.emissionMetadata.gammaCascade ?? "", /cascade/i);
  assert.equal(sampleDecayBranch(iodine, 0).id, "xe-131");
  assert.equal(sampleDecayBranch(iodine, 0.999).role, "grouped-remainder");
});

test("Physics branch sampling is seeded, repeatable, and follows the declared split", () => {
  const cesium = resolveDecayBranchingScheme("Cs-137")!;
  const sample = (seed: number, count: number) => {
    const random = createSeededRandom(seed);
    return Array.from({ length: count }, () => sampleDecayBranch(cesium, random()).id);
  };
  assert.deepEqual(sample(137, 64), sample(137, 64));
  assert.notDeepEqual(sample(137, 64), sample(138, 64));
  const outcomes = sample(137, 10_000);
  const principalRatio = outcomes.filter((id) => id === "ba-137m").length / outcomes.length;
  assert.ok(Math.abs(principalRatio - cesium.outcomes[0].probability) < 0.01);
  assert.ok(outcomes.includes("ba-137"));
});

test("the seeded stream used by a Decay reset is repeatable", () => {
  const first = createSeededRandom(228);
  const second = createSeededRandom(228);
  const changed = createSeededRandom(229);
  const firstValues = Array.from({ length: 8 }, () => first());
  assert.deepEqual(firstValues, Array.from({ length: 8 }, () => second()));
  assert.notDeepEqual(firstValues, Array.from({ length: 8 }, () => changed()));
  assert.ok(firstValues.every((value) => value >= 0 && value < 1));
});

test("relative detector response decreases with distance and shielding", () => {
  const near = computeDetectorResponse({ detector: "scintillator", radiation: "gamma", sourceIntensity: 1, distanceCm: 10, shield: "none", thicknessMm: 0, measurementSeconds: 10 });
  const far = computeDetectorResponse({ detector: "scintillator", radiation: "gamma", sourceIntensity: 1, distanceCm: 50, shield: "none", thicknessMm: 0, measurementSeconds: 10 });
  const shielded = computeDetectorResponse({ detector: "scintillator", radiation: "gamma", sourceIntensity: 1, distanceCm: 10, shield: "lead", thicknessMm: 10, measurementSeconds: 10 });
  assert.ok(near.relativeSignalPerSecond > far.relativeSignalPerSecond);
  assert.ok(near.relativeSignalPerSecond > shielded.relativeSignalPerSecond);
  assert.ok(near.expectedCounts > 0);
  assert.ok(near.relativeVariationIndexPercent < 100);
  assert.ok(near.relativeVariationIndexPercent < far.relativeVariationIndexPercent);
});

test("Pulse runs and binned events are reproducible for a fixed seed", () => {
  const input = { sourceId: "cesium-137" as const, detector: "scintillator" as const, measurementSeconds: 15, backgroundRelativePerSecond: 3, resolutionScale: 1, seed: 137 };
  const first = generatePulseRun(input);
  const second = generatePulseRun(input);
  assert.deepEqual(first.events, second.events);
  assert.ok(first.events.length > 0);
  assert.ok(first.events.some((event) => event.kind === "signal"));
  assert.ok(first.events.some((event) => event.kind === "background"));
  assert.equal(binPulseEvents(first.events, first.maxEnergyKeV).reduce((sum, count) => sum + count, 0), first.events.length);
  const changed = generatePulseRun({ ...input, seed: 138 });
  assert.notDeepEqual(first.events, changed.events);
});

test("Pulse Lab keeps its representative sources and contrasting detector characteristics", () => {
  assert.deepEqual(
    PULSE_SOURCES.map((source) => source.id),
    ["cesium-137", "cobalt-60", "iodine-131"],
  );
  assert.ok(PULSE_SOURCES.find((source) => source.id === "cobalt-60")!.peaks.length >= 2);
  assert.ok(Object.keys(DETECTOR_MODELS).length >= 2);
  assert.ok(
    DETECTOR_MODELS.semiconductor.resolutionFwhmPercent <
      DETECTOR_MODELS.scintillator.resolutionFwhmPercent,
  );
  assert.ok(
    DETECTOR_MODELS.scintillator.resolutionFwhmPercent <
      DETECTOR_MODELS.gm.resolutionFwhmPercent,
  );
});

test("Pulse high-rate approximation remains reproducible and bounded", () => {
  const input = { sourceId: "cobalt-60" as const, detector: "semiconductor" as const, measurementSeconds: 60, backgroundRelativePerSecond: 12, resolutionScale: 1, seed: 137 };
  const first = generatePulseRun(input);
  const second = generatePulseRun(input);
  assert.deepEqual(first.events, second.events);
  assert.ok(first.events.length > 1450);
  assert.ok(first.events.length <= 1800);
});

test("bundled nuclide catalog has unique parents and representative Foundation records", () => {
  assert.equal(MAP_RADIONUCLIDES.length, 992);
  assert.equal(new Set(MAP_RADIONUCLIDES.map((record) => `${record[0]}-${record[1]}`)).size, MAP_RADIONUCLIDES.length);
  assert.deepEqual(
    MAP_RADIONUCLIDES.find((record) => record[0] === "Co" && record[1] === 60),
    ["Co", 60, 27, "Ni", 60, 28, false, 5.2713, "年", "beta-minus", 1],
  );
});

test("shared CSV provenance keeps a Lab's data and model boundary traceable", () => {
  const rows = experimentProvenanceRows(getLab("decay"));
  assert.deepEqual(rows.slice(0, 3), [
    ["product", "Phenomena Foundation v1"],
    ["lab_id", "decay"],
    ["lab_route", "/labs/decay"],
  ]);
  assert.match(String(rows.find((row) => row[0] === "dataset_versions")?.[1]), /radioactivedecay 0\.6\.1/);
  assert.match(String(rows.find((row) => row[0] === "model_constraints")?.[1]), /representative branches/);
  assert.match(String(rows.find((row) => row[0] === "safety_boundary")?.[1]), /not use for radiation safety/i);
});

test("shared CSV output preserves fields and neutralizes spreadsheet formulas", () => {
  const csv = toCsv([["label", "value"], ["formula", "=1+1"], ["quoted", 'a"b']]);
  assert.equal(csv, "\ufefflabel,value\r\nformula,'=1+1\r\nquoted,\"a\"\"b\"\r\n");
});

test("shareable experiment queries preserve the Pages path and existing conditions", () => {
  const url = new URL("https://example.test/nuclear-decay-lab/labs/pulse/?seed=137#run");
  assert.equal(
    withExperimentQuery(url, "source", "cobalt-60"),
    "/nuclear-decay-lab/labs/pulse/?seed=137&source=cobalt-60#run",
  );
  assert.equal(readExperimentQuery("?seed=137&source=cobalt-60", "source"), "cobalt-60");
  assert.equal(readExperimentQuery("?seed=137", "source"), null);
});
