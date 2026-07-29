"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type DecayMode = "alpha" | "beta" | "gamma";
type DecaySeries = "independent" | "uranium-238" | "thorium-232" | "uranium-235";
type SimulationMode = "single" | "chain";
type CatalogView = "table" | "map";

type Nuclide = {
  massNumber: number;
  protonNumber: number;
  element: string;
};

type IsotopePreset = {
  key: string;
  series: DecaySeries;
  parent: string;
  daughter: string;
  parentNuclide: Nuclide;
  daughterNuclide: Nuclide;
  equation: string;
  emissionSymbol: string;
  halfLife: number;
  unit: string;
  mode: DecayMode;
  modeLabel: string;
  emission: string;
  parentRgb: string;
  daughterRgb: string;
};

type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: "parent" | "daughter";
  chainStage: number;
  pulse: number;
  radius: number;
};

type Burst = {
  id: number;
  x: number;
  y: number;
  life: number;
  angle: number;
  kind: DecayMode;
};

type HistoryPoint = {
  t: number;
  remaining: number;
};

type ChartScale = "linear" | "log";

type ChainStage = {
  key: string;
  name: string;
  nuclide: Nuclide;
  halfLifeLabel: string;
  mode?: DecayMode;
  stable?: boolean;
};

const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

function scriptNumber(value: number, digits: string) {
  return String(value)
    .split("")
    .map((digit) => digits[Number(digit)])
    .join("");
}

function formatNuclideText(nuclide: Nuclide) {
  return `${scriptNumber(nuclide.massNumber, SUPERSCRIPT_DIGITS)}${scriptNumber(
    nuclide.protonNumber,
    SUBSCRIPT_DIGITS,
  )}${nuclide.element}`;
}

function createPreset(
  preset: Omit<IsotopePreset, "equation" | "emissionSymbol" | "modeLabel" | "emission"> & {
    modeLabel?: string;
    emission?: string;
    emissionSymbol?: string;
  },
): IsotopePreset {
  const defaults =
    preset.mode === "alpha"
      ? {
          modeLabel: "α壊変",
          emission: "ヘリウム原子核",
          emissionSymbol: "⁴₂He",
        }
      : preset.mode === "beta"
        ? {
            modeLabel: "β⁻壊変",
            emission: "電子・反電子ニュートリノ",
            emissionSymbol: "e⁻ + ν̄ₑ",
          }
        : {
            modeLabel: "γ放出",
            emission: "γ線",
            emissionSymbol: "γ",
          };
  const emissionSymbol = preset.emissionSymbol ?? defaults.emissionSymbol;

  return {
    ...preset,
    modeLabel: preset.modeLabel ?? defaults.modeLabel,
    emission: preset.emission ?? defaults.emission,
    emissionSymbol,
    equation: `${formatNuclideText(preset.parentNuclide)} → ${formatNuclideText(
      preset.daughterNuclide,
    )} + ${emissionSymbol}`,
  };
}

const SERIES_OPTIONS: Array<{
  key: DecaySeries;
  label: string;
  caption: string;
}> = [
  { key: "independent", label: "単独核種", caption: "代表的な人工・天然核種" },
  { key: "uranium-238", label: "U-238系列", caption: "ウラン系列" },
  { key: "thorium-232", label: "Th-232系列", caption: "トリウム系列" },
  { key: "uranium-235", label: "U-235系列", caption: "アクチニウム系列" },
];

const CHAIN_STAGE_COLORS = [
  "#dc504e",
  "#cf762f",
  "#b39732",
  "#75904d",
  "#3e8c78",
  "#3197aa",
  "#526ea2",
  "#8563a0",
];

const PRESETS: IsotopePreset[] = [
  createPreset({
    key: "iodine-131",
    series: "independent",
    parent: "ヨウ素131",
    daughter: "キセノン131",
    parentNuclide: { massNumber: 131, protonNumber: 53, element: "I" },
    daughterNuclide: { massNumber: 131, protonNumber: 54, element: "Xe" },
    halfLife: 8.02,
    unit: "日",
    mode: "beta",
    parentRgb: "221, 80, 78",
    daughterRgb: "49, 163, 177",
  }),
  createPreset({
    key: "carbon-14",
    series: "independent",
    parent: "炭素14",
    daughter: "窒素14",
    parentNuclide: { massNumber: 14, protonNumber: 6, element: "C" },
    daughterNuclide: { massNumber: 14, protonNumber: 7, element: "N" },
    halfLife: 5730,
    unit: "年",
    mode: "beta",
    parentRgb: "205, 120, 38",
    daughterRgb: "39, 145, 102",
  }),
  createPreset({
    key: "cobalt-60",
    series: "independent",
    parent: "コバルト60",
    daughter: "ニッケル60",
    parentNuclide: { massNumber: 60, protonNumber: 27, element: "Co" },
    daughterNuclide: { massNumber: 60, protonNumber: 28, element: "Ni" },
    halfLife: 5.27,
    unit: "年",
    mode: "gamma",
    modeLabel: "β⁻壊変 + γ放出",
    emission: "電子・反電子ニュートリノ・γ線",
    emissionSymbol: "e⁻ + ν̄ₑ + γ",
    parentRgb: "132, 85, 183",
    daughterRgb: "43, 132, 185",
  }),
  createPreset({
    key: "uranium-238",
    series: "uranium-238",
    parent: "ウラン238",
    daughter: "トリウム234",
    parentNuclide: { massNumber: 238, protonNumber: 92, element: "U" },
    daughterNuclide: { massNumber: 234, protonNumber: 90, element: "Th" },
    halfLife: 4.468e9,
    unit: "年",
    mode: "alpha",
    parentRgb: "78, 103, 153",
    daughterRgb: "174, 108, 53",
  }),
  createPreset({
    key: "thorium-234",
    series: "uranium-238",
    parent: "トリウム234",
    daughter: "プロトアクチニウム234m",
    parentNuclide: { massNumber: 234, protonNumber: 90, element: "Th" },
    daughterNuclide: { massNumber: 234, protonNumber: 91, element: "Paᵐ" },
    halfLife: 24.1,
    unit: "日",
    mode: "beta",
    parentRgb: "78, 103, 153",
    daughterRgb: "174, 108, 53",
  }),
  createPreset({
    key: "uranium-234",
    series: "uranium-238",
    parent: "ウラン234",
    daughter: "トリウム230",
    parentNuclide: { massNumber: 234, protonNumber: 92, element: "U" },
    daughterNuclide: { massNumber: 230, protonNumber: 90, element: "Th" },
    halfLife: 245500,
    unit: "年",
    mode: "alpha",
    parentRgb: "78, 103, 153",
    daughterRgb: "174, 108, 53",
  }),
  createPreset({
    key: "radium-226",
    series: "uranium-238",
    parent: "ラジウム226",
    daughter: "ラドン222",
    parentNuclide: { massNumber: 226, protonNumber: 88, element: "Ra" },
    daughterNuclide: { massNumber: 222, protonNumber: 86, element: "Rn" },
    halfLife: 1600,
    unit: "年",
    mode: "alpha",
    parentRgb: "78, 103, 153",
    daughterRgb: "174, 108, 53",
  }),
  createPreset({
    key: "radon-222",
    series: "uranium-238",
    parent: "ラドン222",
    daughter: "ポロニウム218",
    parentNuclide: { massNumber: 222, protonNumber: 86, element: "Rn" },
    daughterNuclide: { massNumber: 218, protonNumber: 84, element: "Po" },
    halfLife: 3.8222,
    unit: "日",
    mode: "alpha",
    parentRgb: "78, 103, 153",
    daughterRgb: "174, 108, 53",
  }),
  createPreset({
    key: "polonium-210",
    series: "uranium-238",
    parent: "ポロニウム210",
    daughter: "鉛206",
    parentNuclide: { massNumber: 210, protonNumber: 84, element: "Po" },
    daughterNuclide: { massNumber: 206, protonNumber: 82, element: "Pb" },
    halfLife: 138.4,
    unit: "日",
    mode: "alpha",
    parentRgb: "194, 66, 60",
    daughterRgb: "38, 119, 173",
  }),
  createPreset({
    key: "thorium-232",
    series: "thorium-232",
    parent: "トリウム232",
    daughter: "ラジウム228",
    parentNuclide: { massNumber: 232, protonNumber: 90, element: "Th" },
    daughterNuclide: { massNumber: 228, protonNumber: 88, element: "Ra" },
    halfLife: 1.405e10,
    unit: "年",
    mode: "alpha",
    parentRgb: "94, 111, 75",
    daughterRgb: "177, 104, 72",
  }),
  createPreset({
    key: "radium-228",
    series: "thorium-232",
    parent: "ラジウム228",
    daughter: "アクチニウム228",
    parentNuclide: { massNumber: 228, protonNumber: 88, element: "Ra" },
    daughterNuclide: { massNumber: 228, protonNumber: 89, element: "Ac" },
    halfLife: 5.75,
    unit: "年",
    mode: "beta",
    parentRgb: "94, 111, 75",
    daughterRgb: "177, 104, 72",
  }),
  createPreset({
    key: "actinium-228",
    series: "thorium-232",
    parent: "アクチニウム228",
    daughter: "トリウム228",
    parentNuclide: { massNumber: 228, protonNumber: 89, element: "Ac" },
    daughterNuclide: { massNumber: 228, protonNumber: 90, element: "Th" },
    halfLife: 6.15,
    unit: "時間",
    mode: "beta",
    parentRgb: "94, 111, 75",
    daughterRgb: "177, 104, 72",
  }),
  createPreset({
    key: "thorium-228",
    series: "thorium-232",
    parent: "トリウム228",
    daughter: "ラジウム224",
    parentNuclide: { massNumber: 228, protonNumber: 90, element: "Th" },
    daughterNuclide: { massNumber: 224, protonNumber: 88, element: "Ra" },
    halfLife: 1.9125,
    unit: "年",
    mode: "alpha",
    parentRgb: "94, 111, 75",
    daughterRgb: "177, 104, 72",
  }),
  createPreset({
    key: "radium-224",
    series: "thorium-232",
    parent: "ラジウム224",
    daughter: "ラドン220",
    parentNuclide: { massNumber: 224, protonNumber: 88, element: "Ra" },
    daughterNuclide: { massNumber: 220, protonNumber: 86, element: "Rn" },
    halfLife: 3.66,
    unit: "日",
    mode: "alpha",
    parentRgb: "94, 111, 75",
    daughterRgb: "177, 104, 72",
  }),
  createPreset({
    key: "radon-220",
    series: "thorium-232",
    parent: "ラドン220",
    daughter: "ポロニウム216",
    parentNuclide: { massNumber: 220, protonNumber: 86, element: "Rn" },
    daughterNuclide: { massNumber: 216, protonNumber: 84, element: "Po" },
    halfLife: 55.6,
    unit: "秒",
    mode: "alpha",
    parentRgb: "94, 111, 75",
    daughterRgb: "177, 104, 72",
  }),
  createPreset({
    key: "uranium-235",
    series: "uranium-235",
    parent: "ウラン235",
    daughter: "トリウム231",
    parentNuclide: { massNumber: 235, protonNumber: 92, element: "U" },
    daughterNuclide: { massNumber: 231, protonNumber: 90, element: "Th" },
    halfLife: 7.038e8,
    unit: "年",
    mode: "alpha",
    parentRgb: "117, 82, 135",
    daughterRgb: "184, 112, 49",
  }),
  createPreset({
    key: "thorium-231",
    series: "uranium-235",
    parent: "トリウム231",
    daughter: "プロトアクチニウム231",
    parentNuclide: { massNumber: 231, protonNumber: 90, element: "Th" },
    daughterNuclide: { massNumber: 231, protonNumber: 91, element: "Pa" },
    halfLife: 25.52,
    unit: "時間",
    mode: "beta",
    parentRgb: "117, 82, 135",
    daughterRgb: "184, 112, 49",
  }),
  createPreset({
    key: "protactinium-231",
    series: "uranium-235",
    parent: "プロトアクチニウム231",
    daughter: "アクチニウム227",
    parentNuclide: { massNumber: 231, protonNumber: 91, element: "Pa" },
    daughterNuclide: { massNumber: 227, protonNumber: 89, element: "Ac" },
    halfLife: 32760,
    unit: "年",
    mode: "alpha",
    parentRgb: "117, 82, 135",
    daughterRgb: "184, 112, 49",
  }),
  createPreset({
    key: "actinium-227",
    series: "uranium-235",
    parent: "アクチニウム227",
    daughter: "トリウム227",
    parentNuclide: { massNumber: 227, protonNumber: 89, element: "Ac" },
    daughterNuclide: { massNumber: 227, protonNumber: 90, element: "Th" },
    halfLife: 21.772,
    unit: "年",
    mode: "beta",
    modeLabel: "β⁻壊変（98.62%）",
    parentRgb: "117, 82, 135",
    daughterRgb: "184, 112, 49",
  }),
  createPreset({
    key: "thorium-227",
    series: "uranium-235",
    parent: "トリウム227",
    daughter: "ラジウム223",
    parentNuclide: { massNumber: 227, protonNumber: 90, element: "Th" },
    daughterNuclide: { massNumber: 223, protonNumber: 88, element: "Ra" },
    halfLife: 18.68,
    unit: "日",
    mode: "alpha",
    parentRgb: "117, 82, 135",
    daughterRgb: "184, 112, 49",
  }),
  createPreset({
    key: "radium-223",
    series: "uranium-235",
    parent: "ラジウム223",
    daughter: "ラドン219",
    parentNuclide: { massNumber: 223, protonNumber: 88, element: "Ra" },
    daughterNuclide: { massNumber: 219, protonNumber: 86, element: "Rn" },
    halfLife: 11.4366,
    unit: "日",
    mode: "alpha",
    parentRgb: "117, 82, 135",
    daughterRgb: "184, 112, 49",
  }),
  createPreset({
    key: "radon-219",
    series: "uranium-235",
    parent: "ラドン219",
    daughter: "ポロニウム215",
    parentNuclide: { massNumber: 219, protonNumber: 86, element: "Rn" },
    daughterNuclide: { massNumber: 215, protonNumber: 84, element: "Po" },
    halfLife: 3.96,
    unit: "秒",
    mode: "alpha",
    parentRgb: "117, 82, 135",
    daughterRgb: "184, 112, 49",
  }),
];

function getChainStages(series: DecaySeries): ChainStage[] {
  if (series === "independent") return [];

  const presets = PRESETS.filter((item) => item.series === series);
  const stages: ChainStage[] = presets.map((item) => ({
    key: item.key,
    name: item.parent,
    nuclide: item.parentNuclide,
    halfLifeLabel: `${formatNumber(item.halfLife)} ${item.unit}`,
    mode: item.mode,
  }));
  const terminal = presets.at(-1);

  if (terminal) {
    stages.push({
      key: `${terminal.key}-stable`,
      name: terminal.daughter,
      nuclide: terminal.daughterNuclide,
      halfLifeLabel: "安定核種",
      stable: true,
    });
  }

  return stages;
}

function getChainStageColor(index: number, total: number) {
  if (index === total - 1) return "#d8d4c9";
  return CHAIN_STAGE_COLORS[index % CHAIN_STAGE_COLORS.length];
}

const SIMULATED_HALF_LIVES_PER_SECOND = 0.18;
const HISTORY_INTERVAL = 0.025;
const MAX_HISTORY_POINTS = 320;
const VISUAL_UPDATE_INTERVAL_MS = 140;

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function makeParticles(count: number, seed: number): Particle[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, index) => {
    const angle = index * 2.399963 + random() * 0.16;
    const radius = Math.sqrt((index + 0.5) / count) * 0.44;
    return {
      id: index,
      x: 0.5 + Math.cos(angle) * radius,
      y: 0.5 + Math.sin(angle) * radius * 0.78,
      vx: (random() - 0.5) * 0.025,
      vy: (random() - 0.5) * 0.025,
      phase: "parent",
      chainStage: 0,
      pulse: random() * Math.PI * 2,
      radius: 4.2 + random() * 2.8,
    };
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: value < 10 ? 2 : 1,
  }).format(value);
}

function formatElapsed(halfLives: number, preset: IsotopePreset) {
  const value = halfLives * preset.halfLife;
  if (value === 0) return `0 ${preset.unit}`;
  if (value < 0.01) return `${value.toExponential(2)} ${preset.unit}`;
  return `${formatNumber(value)} ${preset.unit}`;
}

function formatSimulationRate(preset: IsotopePreset, speed: number) {
  const secondsPerUnit: Record<string, number> = {
    秒: 1,
    分: 60,
    時間: 60 * 60,
    日: 24 * 60 * 60,
    年: 365.25 * 24 * 60 * 60,
  };
  const simulatedSeconds =
    preset.halfLife *
    (secondsPerUnit[preset.unit] ?? 1) *
    SIMULATED_HALF_LIVES_PER_SECOND *
    speed;
  const simulatedYears = simulatedSeconds / secondsPerUnit.年;

  if (simulatedSeconds < 60) return `${formatNumber(simulatedSeconds)}秒`;
  if (simulatedSeconds < secondsPerUnit.時間) {
    return `${formatNumber(simulatedSeconds / secondsPerUnit.分)}分`;
  }
  if (simulatedSeconds < secondsPerUnit.日) {
    return `${formatNumber(simulatedSeconds / secondsPerUnit.時間)}時間`;
  }
  if (simulatedSeconds < secondsPerUnit.年) {
    return `${formatNumber(simulatedSeconds / secondsPerUnit.日)}日`;
  }
  if (simulatedYears < 10000) return `${formatNumber(simulatedYears)}年`;
  if (simulatedYears < 1e8) {
    return `${formatNumber(simulatedYears / 10000)}万年`;
  }
  return `${formatNumber(simulatedYears / 1e8)}億年`;
}

function appendHistoryPoint(
  points: HistoryPoint[],
  point: HistoryPoint,
): HistoryPoint[] {
  const appended = [...points, point];
  if (appended.length <= MAX_HISTORY_POINTS) return appended;

  const lastIndex = appended.length - 1;
  return appended.filter(
    (_, index) => index === 0 || index === lastIndex || index % 2 === 0,
  );
}

function NuclideSymbol({
  nuclide,
  className = "",
}: {
  nuclide: Nuclide;
  className?: string;
}) {
  return (
    <span
      className={`nuclide-symbol ${className}`.trim()}
      aria-label={`${nuclide.element}、質量数${nuclide.massNumber}、陽子数${nuclide.protonNumber}`}
    >
      <span className="nuclide-indexes" aria-hidden="true">
        <sup>{nuclide.massNumber}</sup>
        <sub>{nuclide.protonNumber}</sub>
      </span>
      <span className="nuclide-element" aria-hidden="true">{nuclide.element}</span>
    </span>
  );
}

export default function Home() {
  const particlesRef = useRef<Particle[]>(makeParticles(160, 131));
  const particleNodeRefs = useRef<Array<SVGGElement | null>>([]);
  const burstsRef = useRef<Burst[]>([]);
  const elapsedRef = useRef(0);
  const historyRef = useRef<HistoryPoint[]>([{ t: 0, remaining: 160 }]);
  const lastHistoryAtRef = useRef(0);
  const resetSeedRef = useRef(131);
  const burstIdRef = useRef(0);

  const [presetKey, setPresetKey] = useState(PRESETS[0].key);
  const [seriesKey, setSeriesKey] = useState<DecaySeries>("independent");
  const [simulationMode, setSimulationMode] =
    useState<SimulationMode>("single");
  const [catalogView, setCatalogView] = useState<CatalogView>("table");
  const [atomCount, setAtomCount] = useState(160);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(160);
  const [elapsed, setElapsed] = useState(0);
  const [particles, setParticles] = useState<Particle[]>(() =>
    makeParticles(160, 131),
  );
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([
    { t: 0, remaining: 160 },
  ]);
  const [equationCopied, setEquationCopied] = useState(false);
  const [chartScale, setChartScale] = useState<ChartScale>("linear");

  const preset = useMemo(
    () => PRESETS.find((item) => item.key === presetKey) ?? PRESETS[0],
    [presetKey],
  );
  const seriesPresets = useMemo(
    () => PRESETS.filter((item) => item.series === seriesKey),
    [seriesKey],
  );
  const chainStages = useMemo(() => getChainStages(seriesKey), [seriesKey]);
  const chainStageCounts = useMemo(() => {
    const counts = Array.from({ length: chainStages.length }, () => 0);
    for (const particle of particles) {
      if (counts[particle.chainStage] !== undefined) {
        counts[particle.chainStage] += 1;
      }
    }
    return counts;
  }, [chainStages.length, particles]);
  const seriesLabel =
    SERIES_OPTIONS.find((series) => series.key === seriesKey)?.label ??
    "単独核種";
  const parentColor = `rgb(${preset.parentRgb})`;
  const daughterColor = `rgb(${preset.daughterRgb})`;
  const simulationRate = formatSimulationRate(preset, speed);

  const selectSeries = useCallback((nextSeries: DecaySeries) => {
    const firstPreset = PRESETS.find((item) => item.series === nextSeries);
    setSeriesKey(nextSeries);
    if (nextSeries === "independent") setSimulationMode("single");
    if (firstPreset) setPresetKey(firstPreset.key);
  }, []);

  const selectPreset = useCallback((item: IsotopePreset) => {
    setSeriesKey(item.series);
    setPresetKey(item.key);
    setSimulationMode("single");
  }, []);

  const startChainMode = useCallback(() => {
    if (seriesKey === "independent") return;
    const firstPreset = PRESETS.find((item) => item.series === seriesKey);
    if (firstPreset) setPresetKey(firstPreset.key);
    setSimulationMode("chain");
  }, [seriesKey]);

  const resetSimulation = useCallback(() => {
    resetSeedRef.current += 97;
    const nextParticles = makeParticles(atomCount, resetSeedRef.current);
    const initialHistory = [{ t: 0, remaining: atomCount }];
    particlesRef.current = nextParticles;
    burstsRef.current = [];
    elapsedRef.current = 0;
    historyRef.current = initialHistory;
    lastHistoryAtRef.current = 0;
    setParticles(nextParticles.map((particle) => ({ ...particle })));
    setBursts([]);
    setHistory(initialHistory);
    setElapsed(0);
    setRemaining(atomCount);
    setPaused(false);
  }, [atomCount]);

  useEffect(() => {
    resetSimulation();
  }, [presetKey, resetSimulation, simulationMode]);

  useEffect(() => {
    let frameId = 0;
    let lastFrame = performance.now();
    let lastSnapshot = 0;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const simulate = (timestamp: number) => {
      frameId = requestAnimationFrame(simulate);
      const frameElapsed = timestamp - lastFrame;

      const dt = Math.min(frameElapsed / 1000, 0.08);
      lastFrame = timestamp;
      const deltaHalfLives = paused
        ? 0
        : dt * speed * SIMULATED_HALF_LIVES_PER_SECOND;
      const decayProbability = 1 - Math.pow(0.5, deltaHalfLives);
      const motionScale = reduceMotion ? 0 : paused ? 0.15 : 1;

      if (!paused) elapsedRef.current += deltaHalfLives;

      for (const particle of particlesRef.current) {
        particle.x += particle.vx * dt * motionScale;
        particle.y += particle.vy * dt * motionScale;
        if (particle.x < 0.035 || particle.x > 0.965) particle.vx *= -1;
        if (particle.y < 0.055 || particle.y > 0.945) particle.vy *= -1;
        particle.x = Math.max(0.035, Math.min(0.965, particle.x));
        particle.y = Math.max(0.055, Math.min(0.945, particle.y));
        particle.pulse += dt * 2;
        particleNodeRefs.current[particle.id]?.setAttribute(
          "transform",
          `translate(${particle.x * 1000} ${particle.y * 520})`,
        );

        const canDecay =
          simulationMode === "chain"
            ? particle.chainStage < chainStages.length - 1
            : particle.phase === "parent";

        if (canDecay && decayProbability > 0 && Math.random() < decayProbability) {
          const burstMode =
            simulationMode === "chain"
              ? chainStages[particle.chainStage]?.mode ?? "alpha"
              : preset.mode;

          if (simulationMode === "chain") {
            particle.chainStage += 1;
            particle.phase = "daughter";
          } else {
            particle.phase = "daughter";
          }
          burstsRef.current.push({
            id: burstIdRef.current++,
            x: particle.x,
            y: particle.y,
            life: 1,
            angle: Math.random() * Math.PI * 2,
            kind: burstMode,
          });
        }
      }

      burstsRef.current = burstsRef.current
        .map((burst) => ({ ...burst, life: burst.life - dt * 1.25 }))
        .filter((burst) => burst.life > 0)
        .slice(-20);

      if (timestamp - lastSnapshot >= VISUAL_UPDATE_INTERVAL_MS) {
        const currentRemaining = particlesRef.current.reduce(
          (total, particle) =>
            total +
            (simulationMode === "chain"
              ? particle.chainStage === 0
                ? 1
                : 0
              : particle.phase === "parent"
                ? 1
                : 0),
          0,
        );
        const shouldRecordHistory =
          !paused &&
          (elapsedRef.current - lastHistoryAtRef.current >= HISTORY_INTERVAL ||
            (currentRemaining === 0 &&
              historyRef.current.at(-1)?.remaining !== 0));

        if (shouldRecordHistory) {
          const nextHistory = appendHistoryPoint(historyRef.current, {
            t: elapsedRef.current,
            remaining: currentRemaining,
          });
          historyRef.current = nextHistory;
          lastHistoryAtRef.current = elapsedRef.current;
          setHistory(nextHistory);
        }
        setParticles(
          particlesRef.current.map((particle) => ({ ...particle })),
        );
        setBursts(burstsRef.current.map((burst) => ({ ...burst })));
        setRemaining(currentRemaining);
        setElapsed(elapsedRef.current);
        lastSnapshot = timestamp;
      }
    };

    frameId = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(frameId);
  }, [chainStages, paused, preset.mode, simulationMode, speed]);

  const handleDetectorPulse = (
    event: ReactPointerEvent<SVGSVGElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    burstsRef.current.push({
      id: burstIdRef.current++,
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
      life: 1,
      angle: Math.random() * Math.PI * 2,
      kind: "gamma",
    });
  };

  const copyEquation = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(preset.equation);
      setEquationCopied(true);
      window.setTimeout(() => setEquationCopied(false), 1800);
    } catch {
      setEquationCopied(false);
    }
  }, [preset.equation]);

  const exportHistoryCsv = useCallback(() => {
    const rows = historyRef.current.map((point) => [
      point.t.toFixed(4),
      (point.t * preset.halfLife).toFixed(4),
      preset.unit,
      point.remaining,
      atomCount,
      ((point.remaining / atomCount) * 100).toFixed(2),
    ]);
    const csv = [
      ["経過半減期", "経過時間", "時間単位", "未壊変数", "初期原子核数", "残存率"],
      ...rows,
    ]
      .map((row) => row.join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${preset.key}-decay-observation.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [atomCount, preset]);

  const expected = atomCount * Math.pow(0.5, elapsed);
  const decayed = atomCount - remaining;
  const activity = remaining * Math.LN2;
  const remainingPercent = (remaining / atomCount) * 100;
  const nuclideMap = useMemo(() => {
    const width = 960;
    const height = 430;
    const left = 56;
    const right = 24;
    const top = 24;
    const bottom = 46;
    const maxNeutrons = 150;
    const maxProtons = 100;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const position = (neutrons: number, protons: number) => ({
      x: left + (neutrons / maxNeutrons) * plotWidth,
      y: top + (1 - protons / maxProtons) * plotHeight,
    });

    return {
      width,
      height,
      left,
      right,
      top,
      bottom,
      plotWidth,
      plotHeight,
      xTicks: [0, 25, 50, 75, 100, 125, 150].map((value) => ({
        value,
        x: position(value, 0).x,
      })),
      yTicks: [0, 20, 40, 60, 80, 100].map((value) => ({
        value,
        y: position(0, value).y,
      })),
      points: PRESETS.map((item) => {
        const neutronNumber =
          item.parentNuclide.massNumber - item.parentNuclide.protonNumber;
        return {
          item,
          neutronNumber,
          ...position(neutronNumber, item.parentNuclide.protonNumber),
        };
      }),
    };
  }, []);

  const chart = useMemo(() => {
    const width = 760;
    const height = 280;
    const left = 58;
    const right = 24;
    const top = 20;
    const bottom = 44;
    const maxT = Math.max(1, Math.ceil(elapsed * 2) / 2);
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const logMinimum = 0.001;

    const position = (t: number, value: number) => {
      const fraction = value / atomCount;
      const y =
        chartScale === "log"
          ? top +
            (-Math.log10(Math.max(logMinimum, Math.min(1, fraction))) /
              -Math.log10(logMinimum)) *
              plotHeight
          : top + (1 - fraction) * plotHeight;
      return {
        x: left + (t / maxT) * plotWidth,
        y,
      };
    };
    const toPath = (points: Array<{ t: number; value: number }>) =>
      points
        .map((point, index) => {
          const { x, y } = position(point.t, point.value);
          return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");

    const theoretical = Array.from({ length: 100 }, (_, index) => {
      const t = (index / 99) * maxT;
      return { t, value: atomCount * Math.pow(0.5, t) };
    });
    const visibleTheoretical =
      chartScale === "log"
        ? theoretical.filter((point) => point.value / atomCount >= logMinimum)
        : theoretical;
    const observed = history
      .filter(
        (point) =>
          point.t <= maxT &&
          (chartScale === "linear" || point.remaining > 0),
      )
      .map((point) => ({ t: point.t, value: point.remaining }));
    const observedPointStep = Math.max(1, Math.ceil(observed.length / 55));
    const yTickFractions =
      chartScale === "log"
        ? [1, 0.1, 0.01, 0.001]
        : [1, 0.75, 0.5, 0.25, 0];

    return {
      theoreticalPath: toPath(visibleTheoretical),
      observedPath: toPath(observed),
      observedPoints: observed
        .filter(
          (_, index) =>
            index % observedPointStep === 0 || index === observed.length - 1,
        )
        .map((point) => position(point.t, point.value)),
      yTicks: yTickFractions.map((fraction) => ({
        y: position(0, fraction * atomCount).y,
        label:
          fraction >= 0.01
            ? `${Math.round(fraction * 100)}%`
            : `${(fraction * 100).toFixed(1)}%`,
      })),
      maxT,
      left,
      right,
      top,
      bottom,
      width,
      height,
      plotWidth,
      plotHeight,
    };
  }, [atomCount, chartScale, elapsed, history]);

  return (
    <main
      className="lab-shell"
      style={
        {
          "--parent-rgb": preset.parentRgb,
          "--daughter-rgb": preset.daughterRgb,
        } as React.CSSProperties
      }
    >
      <header className="lab-header">
        <a className="brand" href="#simulator" aria-label="原子核崩壊実験室 トップ">
          <span className="brand-index">NDL—01</span>
          <span>原子核崩壊実験室</span>
        </a>
        <p>教育用モンテカルロ・シミュレーション</p>
      </header>

      <section className="hero-copy" aria-labelledby="page-title">
        <p className="section-number">01 / SIMULATOR</p>
        <h1 id="page-title">原子核崩壊<br />シミュレーター</h1>
        <p className="hero-description">
          個々の原子核がいつ壊変するかは予測できません。
          ここでは多数の原子核を動かし、確率的な現象から半減期の曲線が現れる様子を観察できます。
        </p>
      </section>

      <section className="simulator" id="simulator" aria-label="核崩壊シミュレーター">
        <div className="nuclide-catalog">
          <div className="catalog-heading">
            <div>
              <span>NUCLIDE CATALOG</span>
              <strong>核種と放射系列</strong>
            </div>
            <p>系列を切り替え、表の核種を選ぶと実験条件へ反映されます。</p>
          </div>

          <div className="series-tabs" aria-label="放射系列を選択">
            {SERIES_OPTIONS.map((series) => (
              <button
                type="button"
                aria-pressed={seriesKey === series.key}
                className={seriesKey === series.key ? "is-active" : ""}
                onClick={() => selectSeries(series.key)}
                key={series.key}
              >
                <strong>{series.label}</strong>
                <small>{series.caption}</small>
              </button>
            ))}
          </div>

          <div className="nuclide-table-meta">
            <span>{catalogView === "table" ? seriesLabel : "収録核種マップ"}</span>
            <div className="catalog-view-toggle" role="group" aria-label="核種の表示形式">
              <button
                type="button"
                aria-pressed={catalogView === "table"}
                onClick={() => setCatalogView("table")}
              >
                リスト
              </button>
              <button
                type="button"
                aria-pressed={catalogView === "map"}
                onClick={() => setCatalogView("map")}
              >
                核種マップ
              </button>
            </div>
            <strong>
              {catalogView === "table" ? seriesPresets.length : PRESETS.length} 核種
            </strong>
          </div>
          {catalogView === "table" ? (
            <div className="nuclide-table-wrap">
              <table className="nuclide-table">
                <thead>
                  <tr>
                    <th scope="col">親核種</th>
                    <th scope="col">壊変</th>
                    <th scope="col">娘核種</th>
                    <th scope="col">半減期</th>
                  </tr>
                </thead>
                <tbody>
                  {seriesPresets.map((item) => (
                    <tr
                      className={presetKey === item.key ? "is-active" : ""}
                      key={item.key}
                    >
                      <td>
                        <button
                          type="button"
                          className="nuclide-select"
                          aria-pressed={presetKey === item.key}
                          onClick={() => selectPreset(item)}
                        >
                          <NuclideSymbol
                            nuclide={item.parentNuclide}
                            className="nuclide-symbol-table"
                          />
                          <span>{item.parent}</span>
                        </button>
                      </td>
                      <td>
                        <span className={`decay-mode mode-${item.mode}`}>
                          {item.modeLabel}
                        </span>
                      </td>
                      <td>
                        <div className="daughter-cell">
                          <NuclideSymbol
                            nuclide={item.daughterNuclide}
                            className="nuclide-symbol-table"
                          />
                          <span>{item.daughter}</span>
                        </div>
                      </td>
                      <td>
                        <strong className="half-life-value">
                          {formatNumber(item.halfLife)}
                        </strong>
                        <span className="half-life-unit">{item.unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="nuclide-map-wrap">
              <svg
                className="nuclide-map"
                viewBox={`0 0 ${nuclideMap.width} ${nuclideMap.height}`}
                role="img"
                aria-labelledby="nuclide-map-title nuclide-map-description"
              >
                <title id="nuclide-map-title">収録核種マップ</title>
                <desc id="nuclide-map-description">
                  横軸が中性子数、縦軸が陽子数です。核種を選ぶと単独壊変モードへ切り替わります。
                </desc>
                {nuclideMap.xTicks.map((tick) => (
                  <g key={`n-${tick.value}`}>
                    <line
                      className="nuclide-map-grid"
                      x1={tick.x}
                      x2={tick.x}
                      y1={nuclideMap.top}
                      y2={nuclideMap.height - nuclideMap.bottom}
                    />
                    <text
                      className="nuclide-map-axis-label"
                      x={tick.x}
                      y={nuclideMap.height - 17}
                    >
                      {tick.value}
                    </text>
                  </g>
                ))}
                {nuclideMap.yTicks.map((tick) => (
                  <g key={`z-${tick.value}`}>
                    <line
                      className="nuclide-map-grid"
                      x1={nuclideMap.left}
                      x2={nuclideMap.width - nuclideMap.right}
                      y1={tick.y}
                      y2={tick.y}
                    />
                    <text className="nuclide-map-y-label" x="28" y={tick.y + 4}>
                      {tick.value}
                    </text>
                  </g>
                ))}
                <text
                  className="nuclide-map-caption"
                  x={nuclideMap.width - nuclideMap.right}
                  y={nuclideMap.height - 2}
                >
                  中性子数 N
                </text>
                <text
                  className="nuclide-map-caption nuclide-map-caption-y"
                  x="10"
                  y={nuclideMap.top}
                >
                  陽子数 Z
                </text>
                {nuclideMap.points.map(({ item, neutronNumber, x, y }) => (
                  <g
                    className={`nuclide-map-node ${
                      presetKey === item.key ? "is-active" : ""
                    }`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${item.parent}、中性子数${neutronNumber}、${item.modeLabel}、半減期${item.halfLife}${item.unit}`}
                    onClick={() => selectPreset(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectPreset(item);
                      }
                    }}
                    key={item.key}
                  >
                    <rect
                      x={x - 15}
                      y={y - 15}
                      width="30"
                      height="30"
                      fill={`rgb(${item.parentRgb})`}
                    />
                    <text className="nuclide-map-mass" x={x - 12} y={y - 4}>
                      {item.parentNuclide.massNumber}
                    </text>
                    <text className="nuclide-map-element" x={x} y={y + 9}>
                      {item.parentNuclide.element}
                    </text>
                  </g>
                ))}
              </svg>
              <div className="nuclide-map-selection" aria-live="polite">
                <NuclideSymbol
                  nuclide={preset.parentNuclide}
                  className="nuclide-symbol-table"
                />
                <strong>{preset.parent}</strong>
                <span>→ {preset.daughter}</span>
                <small>
                  {preset.modeLabel} / 半減期 {formatNumber(preset.halfLife)} {preset.unit}
                </small>
              </div>
            </div>
          )}
        </div>

        <div className="simulation-mode-bar">
          <div className="simulation-mode-toggle" role="group" aria-label="シミュレーション形式">
            <button
              type="button"
              aria-pressed={simulationMode === "single"}
              onClick={() => setSimulationMode("single")}
            >
              単独壊変
            </button>
            <button
              type="button"
              aria-pressed={simulationMode === "chain"}
              disabled={seriesKey === "independent"}
              onClick={startChainMode}
            >
              放射系列の連鎖
            </button>
          </div>
          <p>
            {seriesKey === "independent"
              ? "U-238・Th-232・U-235系列を選ぶと、連鎖モードを開始できます。"
              : simulationMode === "chain"
                ? `${seriesLabel}の主要核種を順に追跡中です。`
                : "単独核種の壊変を観察しています。"}
          </p>
        </div>

        <div className="equation-panel" aria-label={`${preset.parent}の壊変式`}>
          <div className="equation-heading">
            <div>
              <span>DECAY REACTION</span>
              <strong>{simulationMode === "chain" ? "最初の壊変" : "壊変式"}</strong>
            </div>
            <div className="equation-heading-actions">
              <small>{preset.modeLabel}</small>
              <button type="button" onClick={copyEquation}>
                {equationCopied ? "コピーしました" : "式をコピー"}
              </button>
            </div>
          </div>
          <div className="decay-flow">
            <div className="reaction-species reaction-parent">
              <span>親核種</span>
              <NuclideSymbol nuclide={preset.parentNuclide} className="reaction-symbol" />
              <small>{preset.parent}</small>
            </div>
            <div className="reaction-arrow" aria-hidden="true">
              <span>{preset.modeLabel}</span>
              <b>→</b>
            </div>
            <div className="reaction-species reaction-daughter">
              <span>娘核種</span>
              <NuclideSymbol nuclide={preset.daughterNuclide} className="reaction-symbol" />
              <small>{preset.daughter}</small>
            </div>
            <b className="reaction-plus" aria-hidden="true">＋</b>
            <div className="reaction-species reaction-emission">
              <span>放出粒子</span>
              <code>{preset.emissionSymbol}</code>
              <small>{preset.emission}</small>
            </div>
          </div>
        </div>

        <div className="simulator-grid">
          <div className="visual-panel">
            <div className="visual-toolbar">
              <div>
                <span>{simulationMode === "chain" ? "連鎖粒子表示" : "粒子表示"}</span>
                <strong>
                  {simulationMode === "chain"
                    ? `${chainStageCounts.at(-1) ?? 0} / ${atomCount} 個が安定核種へ到達`
                    : `${remaining} / ${atomCount} 個が未壊変`}
                </strong>
              </div>
              <div className="legend" aria-label="粒子の凡例">
                <span>
                  <i className="legend-parent" style={{ backgroundColor: parentColor }} />
                  {simulationMode === "chain" ? "初期核種" : "親核種"}
                </span>
                <span>
                  <i
                    className="legend-daughter"
                    style={{
                      backgroundColor:
                        simulationMode === "chain"
                          ? CHAIN_STAGE_COLORS[3]
                          : daughterColor,
                    }}
                  />
                  {simulationMode === "chain" ? "連鎖中" : "娘核種"}
                </span>
                <span><i className="legend-emission" />放出反応</span>
              </div>
            </div>

            {simulationMode === "chain" && (
              <div className="chain-progress">
                <div className="chain-progress-heading">
                  <span>MAJOR DECAY CHAIN / {seriesLabel}</span>
                  <small>主要核種を表示・中間核種は省略</small>
                </div>
                <div className="chain-track">
                  {chainStages.map((stage, index) => (
                    <div className="chain-stage-group" key={stage.key}>
                      <article
                        className={`chain-stage ${stage.stable ? "is-stable" : ""}`}
                        style={
                          {
                            "--stage-color": getChainStageColor(
                              index,
                              chainStages.length,
                            ),
                          } as React.CSSProperties
                        }
                      >
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <NuclideSymbol
                          nuclide={stage.nuclide}
                          className="nuclide-symbol-chain"
                        />
                        <strong>{stage.name}</strong>
                        <small>{stage.halfLifeLabel}</small>
                        <output>{chainStageCounts[index] ?? 0}</output>
                      </article>
                      {index < chainStages.length - 1 && (
                        <span className="chain-arrow" aria-hidden="true">
                          {stage.mode === "beta" ? "β⁻" : stage.mode === "gamma" ? "γ" : "α"}
                          <b>→</b>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <p>
                  半減期の差が非常に大きいため、連鎖モードでは各段階の時間尺度を
                  観察用に正規化しています。
                </p>
              </div>
            )}

            <div className="particle-field">
              <svg
                className="particle-svg"
                viewBox="0 0 1000 520"
                preserveAspectRatio="none"
                onPointerDown={handleDetectorPulse}
                role="img"
                aria-label={
                  simulationMode === "chain"
                    ? `${seriesLabel}の原子核${atomCount}個が主要核種を順に壊変する連鎖シミュレーション`
                    : `${preset.parent}の原子核${atomCount}個が確率的に壊変し、${preset.daughter}へ変わる粒子シミュレーション`
                }
              >
                <defs>
                  <pattern id="field-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" className="field-grid-line" />
                  </pattern>
                </defs>
                <rect width="1000" height="520" className="field-background" />
                <rect width="1000" height="520" fill="url(#field-grid)" />
                <ellipse cx="500" cy="260" rx="390" ry="196" className="field-orbit" />
                {particles.map((particle) => {
                  const particleColor =
                    simulationMode === "chain"
                      ? getChainStageColor(
                          particle.chainStage,
                          chainStages.length,
                        )
                      : particle.phase === "parent"
                        ? parentColor
                        : daughterColor;
                  return (
                    <g
                      key={particle.id}
                      ref={(node) => {
                        particleNodeRefs.current[particle.id] = node;
                      }}
                      className={`particle particle-${particle.phase} ${
                        simulationMode === "chain" ? "particle-chain" : ""
                      }`}
                      transform={`translate(${particle.x * 1000} ${particle.y * 520})`}
                    >
                      <circle
                        className="particle-halo"
                        fill={particleColor}
                        r={particle.radius * 3.4}
                      />
                      <circle
                        className="particle-core"
                        fill={particleColor}
                        stroke="#fffdf4"
                        strokeOpacity="0.62"
                        strokeWidth="1.15"
                        r={
                          particle.radius *
                          (1.22 + Math.sin(particle.pulse) * 0.08)
                        }
                      />
                    </g>
                  );
                })}
                {bursts.map((burst) => {
                  const distance = (1 - burst.life) * 88;
                  const x1 = burst.x * 1000;
                  const y1 = burst.y * 520;
                  const x2 = x1 + Math.cos(burst.angle) * (distance + 24);
                  const y2 = y1 + Math.sin(burst.angle) * (distance + 24);
                  return burst.kind === "gamma" ? (
                    <g key={burst.id} className="burst-gamma" opacity={burst.life}>
                      <circle cx={x1} cy={y1} r={18 + distance} />
                      <circle cx={x1} cy={y1} r={34 + distance * 1.2} />
                    </g>
                  ) : (
                    <line
                      key={burst.id}
                      className={`burst-line burst-${burst.kind}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      opacity={burst.life}
                    />
                  );
                })}
              </svg>
              <div className="field-readout" aria-hidden="true">
                <NuclideSymbol nuclide={preset.parentNuclide} className="nuclide-symbol-field" />
                <small>
                  {simulationMode === "chain"
                    ? `${seriesLabel}・${chainStages.length}段階`
                    : preset.modeLabel}
                </small>
              </div>
              <span className="field-hint">画面を押すと検出パルスを表示</span>
            </div>
          </div>

          <aside className="control-panel" aria-label="シミュレーション設定">
            <div className="control-heading">
              <span>実験条件</span>
              <strong>
                {simulationMode === "chain" ? seriesLabel : preset.parent}
              </strong>
              <small>
                {simulationMode === "chain"
                  ? `主要核種 ${chainStages.length}段階`
                  : `半減期 ${preset.halfLife} ${preset.unit}`}
              </small>
            </div>

            <label className="control-field">
              <span>原子核の数 <output>{atomCount}</output></span>
              <input
                type="range"
                min="60"
                max="240"
                step="20"
                value={atomCount}
                style={{ accentColor: parentColor }}
                onChange={(event) => setAtomCount(Number(event.target.value))}
              />
            </label>

            <label className="control-field">
              <span>時間倍率 <output>{speed.toFixed(1)}×</output></span>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={speed}
                style={{ accentColor: parentColor }}
                onChange={(event) => setSpeed(Number(event.target.value))}
              />
            </label>

            {simulationMode === "chain" ? (
              <div className="time-rate chain-time-rate" aria-live="polite">
                <span>CHAIN TIME SCALE</span>
                <strong>段階ごとに時間尺度を正規化</strong>
                <p>
                  半減期が秒未満から億年単位まで異なるため、すべての段階を観察できる速度に揃えています。
                </p>
              </div>
            ) : (
              <div className="time-rate" aria-live="polite">
                <span>TIME SCALE / 現実時間との対応</span>
                <div>
                  <small>現実の</small>
                  <strong>1秒</strong>
                  <b aria-hidden="true">→</b>
                  <small>シミュレーション内</small>
                  <strong>約{simulationRate}</strong>
                </div>
                <p>
                  現実の1秒ごとに、現在の核種の時間が約{simulationRate}進みます。
                </p>
              </div>
            )}

            <div className="control-actions">
              <button
                type="button"
                className="primary-action"
                onClick={() => setPaused((value) => !value)}
              >
                {paused ? "▶ 再開" : "Ⅱ 一時停止"}
              </button>
              <button type="button" onClick={resetSimulation}>↻ リセット</button>
            </div>

            <div className="formula">
              <span>壊変の法則</span>
              <code>N(t) = N₀ · 2<sup>−t / T½</sup></code>
              <small>時間が半減期 T½ だけ進むごとに、親核種は半分になります。</small>
            </div>
          </aside>
        </div>
      </section>

      <section className="data-section" aria-labelledby="observation-title">
        <div className="section-heading">
          <div>
            <p className="section-number">02 / OBSERVATION</p>
            <h2 id="observation-title">観測値と理論値</h2>
          </div>
          <p>
            {simulationMode === "chain"
              ? "初期核種が系列の次段階へ移った割合を、理論的な指数減衰と比較します。"
              : "赤い点と実線が今回の試行、青い破線が理論値です。リセットするたびに、確率による揺らぎ方が変わります。"}
          </p>
        </div>

        <div className="stats-grid">
          <article>
            <span>{simulationMode === "chain" ? "規格化時間" : "経過時間"}</span>
            <strong>
              {simulationMode === "chain"
                ? `${elapsed.toFixed(2)} × 段階T½`
                : formatElapsed(elapsed, preset)}
            </strong>
            <small>
              {simulationMode === "chain"
                ? "各段階の半減期を同じ長さで表示"
                : `${elapsed.toFixed(2)} × T½`}
            </small>
          </article>
          <article>
            <span>
              {simulationMode === "chain" ? "初期核種に残る原子核" : "未壊変の原子核"}
            </span>
            <strong>{remaining}<small> / {atomCount}</small></strong>
            <small>{remainingPercent.toFixed(1)}%</small>
          </article>
          <article>
            <span>
              {simulationMode === "chain" ? "系列へ移った原子核" : "壊変した原子核"}
            </span>
            <strong>{decayed}</strong>
            <small>理論上は {Math.round(atomCount - expected)}</small>
          </article>
        </div>

        <div className="chart-panel">
          <div className="chart-meta">
            <span><i className="observed-line" style={{ backgroundColor: parentColor }} />観測値</span>
            <span><i className="theory-line" style={{ borderTopColor: daughterColor }} />理論値</span>
            <div className="chart-scale-toggle" role="group" aria-label="グラフの目盛り">
              <button
                type="button"
                aria-pressed={chartScale === "linear"}
                onClick={() => setChartScale("linear")}
              >
                線形
              </button>
              <button
                type="button"
                aria-pressed={chartScale === "log"}
                onClick={() => setChartScale("log")}
              >
                対数
              </button>
            </div>
            <strong>推定活動度 {activity.toFixed(1)} / T½</strong>
            <button type="button" className="export-button" onClick={exportHistoryCsv}>
              CSVで保存
            </button>
          </div>
          <svg
            className="decay-chart"
            viewBox={`0 0 ${chart.width} ${chart.height}`}
            role="img"
            aria-labelledby="chart-title chart-description"
          >
            <title id="chart-title">
              {simulationMode === "chain" ? "初期核種数" : "未壊変原子核数"}
              の時間変化（{chartScale === "log" ? "対数" : "線形"}目盛り）
            </title>
            <desc id="chart-description">
              {simulationMode === "chain" ? seriesLabel : preset.parent}
              の観測値と指数関数による理論値を
              {chartScale === "log" ? "対数" : "線形"}目盛りで比較したグラフです。
            </desc>
            {chart.yTicks.map((tick) => {
              return (
                <g key={tick.label}>
                  <line
                    className="chart-grid-line"
                    x1={chart.left}
                    x2={chart.width - chart.right}
                    y1={tick.y}
                    y2={tick.y}
                  />
                  <text x="8" y={tick.y + 4}>{tick.label}</text>
                </g>
              );
            })}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const x = chart.left + ratio * chart.plotWidth;
              return (
                <g key={ratio}>
                  <line
                    className="chart-tick"
                    x1={x}
                    x2={x}
                    y1={chart.height - chart.bottom}
                    y2={chart.height - chart.bottom + 6}
                  />
                  <text className="x-tick-label" x={x} y={chart.height - 18}>
                    {(chart.maxT * ratio).toFixed(2)}
                  </text>
                </g>
              );
            })}
            <line
              className="chart-axis"
              x1={chart.left}
              x2={chart.width - chart.right}
              y1={chart.height - chart.bottom}
              y2={chart.height - chart.bottom}
            />
            <path
              className="theory-path"
              d={chart.theoreticalPath}
              stroke={daughterColor}
            />
            <path
              className="observed-path"
              d={chart.observedPath}
              stroke={parentColor}
            />
            {chart.observedPoints.map((point, index) => (
              <circle
                className="observed-point"
                cx={point.x}
                cy={point.y}
                fill={parentColor}
                stroke="#faf8f2"
                r="3.2"
                key={`${index}-${point.x}`}
              />
            ))}
            <text className="axis-caption" x={chart.width - chart.right} y={chart.height - 2}>
              経過時間（半減期 T½）
            </text>
          </svg>
        </div>
      </section>

      <footer>
        <span>NUCLEAR DECAY LAB / 2026</span>
        <nav aria-label="ShymohnのSNS">
          <a href="https://x.com/Shymohn" target="_blank" rel="noopener noreferrer">X</a>
          <a href="https://github.com/shymohn99" target="_blank" rel="noopener noreferrer">GitHub</a>
        </nav>
        <p>2026 @Shymohn all rights reserved.</p>
      </footer>
    </main>
  );
}
