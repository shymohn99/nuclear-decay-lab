import { createSeededRandom } from "./experiment";
import type { LocalizedText } from "./labs";

export type RadiationMode = "alpha" | "beta" | "gamma";
export type DetectorKey = "gm" | "scintillator" | "semiconductor";
export type ShieldKey = "none" | "paper" | "aluminum" | "lead";

export type DetectorModel = Readonly<{
  key: DetectorKey;
  shortName: string;
  name: LocalizedText;
  description: LocalizedText;
  efficiency: Record<RadiationMode, number>;
  backgroundRelativePerSecond: number;
  resolutionFwhmPercent: number;
}>;

export const DETECTOR_MODELS: Record<DetectorKey, DetectorModel> = {
  gm: {
    key: "gm",
    shortName: "GM",
    name: { ja: "GM計数管", en: "GM counter" },
    description: { ja: "イベントを数える性質を強調したモデル", en: "Model emphasizing event-counting behavior" },
    efficiency: { alpha: 0.55, beta: 0.46, gamma: 0.25 },
    backgroundRelativePerSecond: 0.24,
    resolutionFwhmPercent: 18,
  },
  scintillator: {
    key: "scintillator",
    shortName: "SCINT",
    name: { ja: "シンチレーション検出器", en: "Scintillation detector" },
    description: { ja: "比較的多くの光パルスを集める性質を強調したモデル", en: "Model emphasizing higher light-pulse collection" },
    efficiency: { alpha: 0.62, beta: 0.58, gamma: 0.72 },
    backgroundRelativePerSecond: 0.12,
    resolutionFwhmPercent: 8,
  },
  semiconductor: {
    key: "semiconductor",
    shortName: "SEMICON",
    name: { ja: "半導体検出器", en: "Semiconductor detector" },
    description: { ja: "より細いエネルギー構造を表す教育用モデル", en: "Teaching model with finer energy structure" },
    efficiency: { alpha: 0.48, beta: 0.76, gamma: 0.88 },
    backgroundRelativePerSecond: 0.05,
    resolutionFwhmPercent: 2.5,
  },
};

export const SHIELD_MODELS: Record<ShieldKey, Readonly<{
  symbol: string;
  name: LocalizedText;
  coefficient: Record<RadiationMode, number>;
}>> = {
  none: { symbol: "—", name: { ja: "なし", en: "None" }, coefficient: { alpha: 0, beta: 0, gamma: 0 } },
  paper: { symbol: "P", name: { ja: "紙", en: "Paper" }, coefficient: { alpha: 0.9, beta: 0.05, gamma: 0.01 } },
  aluminum: { symbol: "Al", name: { ja: "アルミニウム", en: "Aluminum" }, coefficient: { alpha: 0.65, beta: 0.12, gamma: 0.035 } },
  lead: { symbol: "Pb", name: { ja: "鉛", en: "Lead" }, coefficient: { alpha: 0.25, beta: 0.08, gamma: 0.16 } },
};

export function theoreticalPopulation(initial: number, halfLives: number): number {
  return initial * 2 ** -Math.max(0, halfLives);
}

export function decayProbability(deltaHalfLives: number): number {
  return 1 - 2 ** -Math.max(0, deltaHalfLives);
}

export type DetectorResponseInput = Readonly<{
  detector: DetectorKey;
  radiation: RadiationMode;
  sourceIntensity: number;
  distanceCm: number;
  shield: ShieldKey;
  thicknessMm: number;
  measurementSeconds: number;
}>;

export type DetectorResponse = Readonly<{
  transmission: number;
  relativeSignalPerSecond: number;
  relativeBackgroundPerSecond: number;
  relativeTotalPerSecond: number;
  expectedCounts: number;
  relativeVariationIndexPercent: number;
  signalToBackground: number;
}>;

export function computeDetectorResponse(input: DetectorResponseInput): DetectorResponse {
  const detector = DETECTOR_MODELS[input.detector];
  const shield = SHIELD_MODELS[input.shield];
  const distanceFactor = Math.min(1, (10 / Math.max(5, input.distanceCm)) ** 2);
  const transmission = input.shield === "none"
    ? 1
    : Math.exp(-shield.coefficient[input.radiation] * Math.max(0, input.thicknessMm));
  const relativeSignalPerSecond =
    100 *
    Math.max(0, input.sourceIntensity) *
    distanceFactor *
    detector.efficiency[input.radiation] *
    transmission;
  const relativeBackgroundPerSecond = detector.backgroundRelativePerSecond;
  const relativeTotalPerSecond = relativeSignalPerSecond + relativeBackgroundPerSecond;
  const expectedCounts = relativeTotalPerSecond * Math.max(0, input.measurementSeconds);
  return {
    transmission,
    relativeSignalPerSecond,
    relativeBackgroundPerSecond,
    relativeTotalPerSecond,
    expectedCounts,
    // A teaching index derived from relative model units, not a measured uncertainty or confidence interval.
    relativeVariationIndexPercent: expectedCounts > 0 ? Math.min(100, 100 / Math.sqrt(expectedCounts)) : 100,
    signalToBackground: relativeSignalPerSecond / relativeBackgroundPerSecond,
  };
}

export type PulseSource = Readonly<{
  id: "cesium-137" | "cobalt-60" | "iodine-131";
  label: LocalizedText;
  color: string;
  peaks: readonly Readonly<{ energyKeV: number; relativeIntensity: number }>[];
}>;

export const PULSE_SOURCES: readonly PulseSource[] = [
  {
    id: "cesium-137",
    label: { ja: "セシウム137", en: "Cesium-137" },
    color: "#d95c4f",
    peaks: [{ energyKeV: 662, relativeIntensity: 1 }],
  },
  {
    id: "cobalt-60",
    label: { ja: "コバルト60", en: "Cobalt-60" },
    color: "#4b7da8",
    peaks: [{ energyKeV: 1173, relativeIntensity: 1 }, { energyKeV: 1332, relativeIntensity: 0.95 }],
  },
  {
    id: "iodine-131",
    label: { ja: "ヨウ素131", en: "Iodine-131" },
    color: "#9d7947",
    peaks: [{ energyKeV: 364, relativeIntensity: 1 }],
  },
];

export type PulseEvent = Readonly<{
  energyKeV: number;
  kind: "signal" | "background";
}>;

export type PulseRun = Readonly<{
  events: readonly PulseEvent[];
  binWidthKeV: number;
  maxEnergyKeV: number;
  source: PulseSource;
  detector: DetectorKey;
}>;

function normal(random: () => number): number {
  const u = Math.max(Number.EPSILON, random());
  const v = Math.max(Number.EPSILON, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function samplePoisson(mean: number, random: () => number): number {
  if (mean <= 0) return 0;
  // At high means the exact product sampler is needlessly expensive here.
  // This seeded normal approximation is a declared teaching-model choice.
  if (mean > 80) return Math.max(0, Math.round(mean + Math.sqrt(mean) * normal(random)));
  const limit = Math.exp(-mean);
  let product = 1;
  let count = 0;
  do {
    count += 1;
    product *= random();
  } while (product > limit);
  return count - 1;
}

function choosePeak(source: PulseSource, random: () => number): PulseSource["peaks"][number] {
  const total = source.peaks.reduce((sum, peak) => sum + peak.relativeIntensity, 0);
  let cursor = random() * total;
  for (const peak of source.peaks) {
    cursor -= peak.relativeIntensity;
    if (cursor <= 0) return peak;
  }
  return source.peaks[source.peaks.length - 1];
}

export function generatePulseRun(input: Readonly<{
  sourceId: PulseSource["id"];
  detector: DetectorKey;
  measurementSeconds: number;
  backgroundRelativePerSecond: number;
  resolutionScale: number;
  seed: number;
  maxEvents?: number;
}>): PulseRun {
  const source = PULSE_SOURCES.find((item) => item.id === input.sourceId) ?? PULSE_SOURCES[0];
  const detector = DETECTOR_MODELS[input.detector];
  const random = createSeededRandom(input.seed);
  const maxEnergyKeV = 1600;
  const seconds = Math.max(1, input.measurementSeconds);
  const signalRate = 18 * detector.efficiency.gamma;
  const backgroundRate = Math.max(0, input.backgroundRelativePerSecond) + detector.backgroundRelativePerSecond;
  const eventCount = Math.min(
    input.maxEvents ?? 1800,
    Math.max(1, samplePoisson((signalRate + backgroundRate) * seconds, random)),
  );
  const backgroundProbability = backgroundRate / (signalRate + backgroundRate);
  const resolutionFwhmPercent = Math.max(0.5, detector.resolutionFwhmPercent * Math.max(0.25, input.resolutionScale));
  const events: PulseEvent[] = [];

  for (let index = 0; index < eventCount; index += 1) {
    const isBackground = random() < backgroundProbability;
    let energyKeV: number;
    if (isBackground) {
      // Uniform background is intentional: it makes the simplification inspectable.
      energyKeV = random() * maxEnergyKeV;
    } else {
      const peak = choosePeak(source, random);
      const sigma = Math.max(3, (peak.energyKeV * (resolutionFwhmPercent / 100)) / 2.355);
      energyKeV = peak.energyKeV + normal(random) * sigma;
    }
    events.push({
      energyKeV: Math.max(0, Math.min(maxEnergyKeV - Number.EPSILON, energyKeV)),
      kind: isBackground ? "background" : "signal",
    });
  }

  return {
    events,
    binWidthKeV: 1600 / 120,
    maxEnergyKeV,
    source,
    detector: input.detector,
  };
}

export function binPulseEvents(
  events: readonly PulseEvent[],
  maxEnergyKeV: number,
  binCount = 120,
): number[] {
  const bins = Array.from({ length: binCount }, () => 0);
  for (const event of events) {
    const index = Math.min(binCount - 1, Math.floor((event.energyKeV / maxEnergyKeV) * binCount));
    bins[index] += 1;
  }
  return bins;
}
