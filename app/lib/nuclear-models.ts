import { createSeededRandom } from "./experiment";

export type RadiationMode = "alpha" | "beta" | "gamma";
export type DetectorKey = "gm" | "scintillator" | "semiconductor";
export type ShieldKey = "none" | "paper" | "aluminum" | "lead";

export type DetectorModel = {
  shortName: string;
  name: { ja: string; en: string };
  description: { ja: string; en: string };
  efficiency: Record<RadiationMode, number>;
  backgroundCps: number;
  resolutionFwhm: number;
};

export const DETECTOR_MODELS: Record<DetectorKey, DetectorModel> = {
  gm: {
    shortName: "GM",
    name: { ja: "GM計数管", en: "GM counter" },
    description: { ja: "到来事象を数える。エネルギーはほぼ区別しない。", en: "Counts arrivals with little energy discrimination." },
    efficiency: { alpha: 0.36, beta: 0.12, gamma: 0.04 },
    backgroundCps: 0.35,
    resolutionFwhm: 0.22,
  },
  scintillator: {
    shortName: "SCINT",
    name: { ja: "シンチレーション", en: "Scintillation" },
    description: { ja: "光に変換して比較的多くの事象を受ける。", en: "Converts energy to light with a higher event yield." },
    efficiency: { alpha: 0.62, beta: 0.58, gamma: 0.72 },
    backgroundCps: 0.12,
    resolutionFwhm: 0.08,
  },
  semiconductor: {
    shortName: "SEMICON",
    name: { ja: "半導体検出器", en: "Semiconductor" },
    description: { ja: "エネルギーを細かく読むが、ここでは簡略化している。", en: "Reads energy more finely; simplified here." },
    efficiency: { alpha: 0.48, beta: 0.76, gamma: 0.88 },
    backgroundCps: 0.05,
    resolutionFwhm: 0.025,
  },
};

export const SHIELD_MODELS: Record<ShieldKey, {
  symbol: string;
  name: { ja: string; en: string };
  coefficient: Record<RadiationMode, number>;
}> = {
  none: { symbol: "—", name: { ja: "なし", en: "None" }, coefficient: { alpha: 0, beta: 0, gamma: 0 } },
  paper: { symbol: "P", name: { ja: "紙", en: "Paper" }, coefficient: { alpha: 0.9, beta: 0.05, gamma: 0.01 } },
  aluminum: { symbol: "Al", name: { ja: "アルミニウム", en: "Aluminum" }, coefficient: { alpha: 0.65, beta: 0.12, gamma: 0.035 } },
  lead: { symbol: "Pb", name: { ja: "鉛", en: "Lead" }, coefficient: { alpha: 0.25, beta: 0.08, gamma: 0.16 } },
};

export function theoreticalPopulation(initial: number, halfLives: number): number {
  return initial * 2 ** -halfLives;
}

export function decayProbability(deltaHalfLives: number): number {
  return 1 - 2 ** -Math.max(0, deltaHalfLives);
}

export type DetectorResponseInput = {
  detector: DetectorKey;
  radiation: RadiationMode;
  activityFraction: number;
  distanceCm: number;
  shield: ShieldKey;
  thicknessMm: number;
  measurementSeconds: number;
};

export type DetectorResponse = {
  transmission: number;
  signalCps: number;
  countRateCps: number;
  counts: number;
  uncertaintyPercent: number;
  signalToBackground: number;
};

export function computeDetectorResponse(input: DetectorResponseInput): DetectorResponse {
  const detector = DETECTOR_MODELS[input.detector];
  const shield = SHIELD_MODELS[input.shield];
  const distanceFactor = Math.min(1, (10 / Math.max(5, input.distanceCm)) ** 2);
  const transmission = input.shield === "none"
    ? 1
    : Math.exp(-shield.coefficient[input.radiation] * Math.max(0, input.thicknessMm));
  const signalCps = 180 * Math.max(0, input.activityFraction) * distanceFactor * detector.efficiency[input.radiation] * transmission;
  const countRateCps = signalCps + detector.backgroundCps;
  const counts = Math.round(countRateCps * Math.max(0, input.measurementSeconds));
  return {
    transmission,
    signalCps,
    countRateCps,
    counts,
    uncertaintyPercent: counts > 0 ? Math.min(100, 100 / Math.sqrt(counts)) : 100,
    signalToBackground: signalCps / detector.backgroundCps,
  };
}

export type PulseSource = {
  id: string;
  label: { ja: string; en: string };
  color: string;
  peaks: readonly { energyKeV: number; relativeIntensity: number }[];
};

export const PULSE_SOURCES: readonly PulseSource[] = [
  { id: "cesium-137", label: { ja: "セシウム137", en: "Cesium-137" }, color: "#d95c4f", peaks: [{ energyKeV: 662, relativeIntensity: 1 }] },
  { id: "cobalt-60", label: { ja: "コバルト60", en: "Cobalt-60" }, color: "#4b7da8", peaks: [{ energyKeV: 1173, relativeIntensity: 1 }, { energyKeV: 1332, relativeIntensity: 0.95 }] },
  { id: "iodine-131", label: { ja: "ヨウ素131", en: "Iodine-131" }, color: "#9d7947", peaks: [{ energyKeV: 364, relativeIntensity: 0.82 }, { energyKeV: 637, relativeIntensity: 0.72 }] },
];

export type PulseEvent = { energyKeV: number; kind: "signal" | "background" };

export type PulseRun = {
  events: readonly PulseEvent[];
  bins: readonly number[];
  binWidthKeV: number;
  maxEnergyKeV: number;
  source: PulseSource;
  detector: DetectorKey;
};

function normal(random: () => number): number {
  const u = Math.max(Number.EPSILON, random());
  const v = Math.max(Number.EPSILON, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function choosePeak(source: PulseSource, random: () => number) {
  const total = source.peaks.reduce((sum, peak) => sum + peak.relativeIntensity, 0);
  let cursor = random() * total;
  return source.peaks.find((peak) => {
    cursor -= peak.relativeIntensity;
    return cursor <= 0;
  }) ?? source.peaks[0];
}

export function generatePulseRun(input: {
  sourceId: string;
  detector: DetectorKey;
  measurementSeconds: number;
  backgroundCps: number;
  seed: number;
  bins?: number;
}): PulseRun {
  const source = PULSE_SOURCES.find((item) => item.id === input.sourceId) ?? PULSE_SOURCES[0];
  const detectorModel = DETECTOR_MODELS[input.detector];
  const random = createSeededRandom(input.seed);
  const maxEnergyKeV = 1600;
  const binCount = input.bins ?? 120;
  const binWidthKeV = maxEnergyKeV / binCount;
  const seconds = Math.max(1, input.measurementSeconds);
  const sourceRate = 34 * detectorModel.efficiency.gamma;
  const backgroundRate = Math.max(0, input.backgroundCps) + detectorModel.backgroundCps;
  const totalEvents = Math.min(5000, Math.max(1, Math.round((sourceRate + backgroundRate) * seconds)));
  const backgroundProbability = backgroundRate / (sourceRate + backgroundRate);
  const events: PulseEvent[] = [];
  const bins = Array.from({ length: binCount }, () => 0);

  for (let index = 0; index < totalEvents; index += 1) {
    const isBackground = random() < backgroundProbability;
    let energyKeV: number;
    if (isBackground) {
      energyKeV = random() ** 1.8 * maxEnergyKeV;
    } else {
      const peak = choosePeak(source, random);
      const sigma = Math.max(4, peak.energyKeV * detectorModel.resolutionFwhm / 2.355);
      energyKeV = peak.energyKeV + normal(random) * sigma;
    }
    energyKeV = Math.max(0, Math.min(maxEnergyKeV - Number.EPSILON, energyKeV));
    events.push({ energyKeV, kind: isBackground ? "background" : "signal" });
    bins[Math.min(binCount - 1, Math.floor(energyKeV / binWidthKeV))] += 1;
  }
  return { events, bins, binWidthKeV, maxEnergyKeV, source, detector: input.detector };
}
