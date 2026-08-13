import assert from "node:assert/strict";
import test from "node:test";
import {
  computeDetectorResponse,
  decayProbability,
  generatePulseRun,
  theoreticalPopulation,
} from "../app/lib/nuclear-models.ts";

test("decay equations preserve the half-life invariants", () => {
  assert.equal(decayProbability(0), 0);
  assert.equal(decayProbability(1), 0.5);
  assert.equal(theoreticalPopulation(800, 1), 400);
  assert.equal(theoreticalPopulation(800, 2), 200);
});

test("detector response changes predictably with distance and shielding", () => {
  const near = computeDetectorResponse({ detector: "scintillator", radiation: "gamma", activityFraction: 1, distanceCm: 10, shield: "none", thicknessMm: 0, measurementSeconds: 10 });
  const far = computeDetectorResponse({ detector: "scintillator", radiation: "gamma", activityFraction: 1, distanceCm: 50, shield: "none", thicknessMm: 0, measurementSeconds: 10 });
  const shielded = computeDetectorResponse({ detector: "scintillator", radiation: "gamma", activityFraction: 1, distanceCm: 10, shield: "lead", thicknessMm: 10, measurementSeconds: 10 });
  assert.ok(near.countRateCps > far.countRateCps);
  assert.ok(near.countRateCps > shielded.countRateCps);
  assert.ok(near.uncertaintyPercent < 100);
});

test("pulse runs are reproducible for a fixed seed", () => {
  const input = { sourceId: "cesium-137", detector: "scintillator" as const, measurementSeconds: 15, backgroundCps: 3, seed: 137, bins: 120 };
  const first = generatePulseRun(input);
  const second = generatePulseRun(input);
  assert.deepEqual(first.events, second.events);
  assert.deepEqual(first.bins, second.bins);
  assert.equal(first.events.length, 414);
  const different = generatePulseRun({ ...input, seed: 138 });
  assert.notDeepEqual(first.events, different.events);
  assert.ok(first.events.some((event) => event.kind === "signal"));
  assert.ok(first.events.some((event) => event.kind === "background"));
});
