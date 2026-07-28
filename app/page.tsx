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

type Nuclide = {
  massNumber: number;
  protonNumber: number;
  element: string;
};

type IsotopePreset = {
  key: string;
  parent: string;
  daughter: string;
  symbol: string;
  daughterSymbol: string;
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

const PRESETS: IsotopePreset[] = [
  {
    key: "iodine-131",
    parentNuclide: { massNumber: 131, protonNumber: 53, element: "I" },
    daughterNuclide: { massNumber: 131, protonNumber: 54, element: "Xe" },
    parent: "ヨウ素131",
    daughter: "キセノン131",
    symbol: "¹³¹₅₃I",
    daughterSymbol: "¹³¹₅₄Xe",
    equation: "¹³¹₅₃I → ¹³¹₅₄Xe + e⁻ + ν̄ₑ",
    emissionSymbol: "e⁻ + ν̄ₑ",
    halfLife: 8.02,
    unit: "日",
    mode: "beta",
    modeLabel: "β⁻壊変",
    emission: "電子・反電子ニュートリノ",
    parentRgb: "221, 80, 78",
    daughterRgb: "49, 163, 177",
  },
  {
    key: "carbon-14",
    parentNuclide: { massNumber: 14, protonNumber: 6, element: "C" },
    daughterNuclide: { massNumber: 14, protonNumber: 7, element: "N" },
    parent: "炭素14",
    daughter: "窒素14",
    symbol: "¹⁴₆C",
    daughterSymbol: "¹⁴₇N",
    equation: "¹⁴₆C → ¹⁴₇N + e⁻ + ν̄ₑ",
    emissionSymbol: "e⁻ + ν̄ₑ",
    halfLife: 5730,
    unit: "年",
    mode: "beta",
    modeLabel: "β⁻壊変",
    emission: "電子・反電子ニュートリノ",
    parentRgb: "205, 120, 38",
    daughterRgb: "39, 145, 102",
  },
  {
    key: "cobalt-60",
    parentNuclide: { massNumber: 60, protonNumber: 27, element: "Co" },
    daughterNuclide: { massNumber: 60, protonNumber: 28, element: "Ni" },
    parent: "コバルト60",
    daughter: "ニッケル60",
    symbol: "⁶⁰₂₇Co",
    daughterSymbol: "⁶⁰₂₈Ni",
    equation: "⁶⁰₂₇Co → ⁶⁰₂₈Ni + e⁻ + ν̄ₑ + γ",
    emissionSymbol: "e⁻ + ν̄ₑ + γ",
    halfLife: 5.27,
    unit: "年",
    mode: "gamma",
    modeLabel: "β⁻壊変 + γ放出",
    emission: "電子・反電子ニュートリノ・γ線",
    parentRgb: "132, 85, 183",
    daughterRgb: "43, 132, 185",
  },
  {
    key: "polonium-210",
    parentNuclide: { massNumber: 210, protonNumber: 84, element: "Po" },
    daughterNuclide: { massNumber: 206, protonNumber: 82, element: "Pb" },
    parent: "ポロニウム210",
    daughter: "鉛206",
    symbol: "²¹⁰₈₄Po",
    daughterSymbol: "²⁰⁶₈₂Pb",
    equation: "²¹⁰₈₄Po → ²⁰⁶₈₂Pb + ⁴₂He",
    emissionSymbol: "⁴₂He",
    halfLife: 138.4,
    unit: "日",
    mode: "alpha",
    modeLabel: "α壊変",
    emission: "ヘリウム原子核",
    parentRgb: "194, 66, 60",
    daughterRgb: "38, 119, 173",
  },
];

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
  const parentColor = `rgb(${preset.parentRgb})`;
  const daughterColor = `rgb(${preset.daughterRgb})`;

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
  }, [presetKey, resetSimulation]);

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

        if (
          particle.phase === "parent" &&
          decayProbability > 0 &&
          Math.random() < decayProbability
        ) {
          particle.phase = "daughter";
          burstsRef.current.push({
            id: burstIdRef.current++,
            x: particle.x,
            y: particle.y,
            life: 1,
            angle: Math.random() * Math.PI * 2,
            kind: preset.mode,
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
            total + (particle.phase === "parent" ? 1 : 0),
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
  }, [paused, preset.mode, speed]);

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
        <div className="preset-rail" role="tablist" aria-label="核種を選択">
          {PRESETS.map((item, index) => (
            <button
              type="button"
              role="tab"
              aria-selected={presetKey === item.key}
              className={presetKey === item.key ? "is-active" : ""}
              onClick={() => setPresetKey(item.key)}
              key={item.key}
            >
              <span className="preset-number">0{index + 1}</span>
              <span>
                <strong>{item.parent}</strong>
                <small>
                  <NuclideSymbol nuclide={item.parentNuclide} className="nuclide-symbol-small" />
                  <span> T½ = {item.halfLife} {item.unit}</span>
                </small>
              </span>
            </button>
          ))}
        </div>

        <div className="equation-panel" aria-label={`${preset.parent}の壊変式`}>
          <div className="equation-heading">
            <div>
              <span>DECAY REACTION</span>
              <strong>壊変式</strong>
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
                <span>粒子表示</span>
                <strong>{remaining} / {atomCount} 個が未壊変</strong>
              </div>
              <div className="legend" aria-label="粒子の凡例">
                <span><i className="legend-parent" style={{ backgroundColor: parentColor }} />親核種</span>
                <span><i className="legend-daughter" style={{ backgroundColor: daughterColor }} />娘核種</span>
                <span><i className="legend-emission" />放出反応</span>
              </div>
            </div>

            <div className="particle-field">
              <svg
                className="particle-svg"
                viewBox="0 0 1000 520"
                preserveAspectRatio="none"
                onPointerDown={handleDetectorPulse}
                role="img"
                aria-label={`${preset.parent}の原子核${atomCount}個が確率的に壊変し、${preset.daughter}へ変わる粒子シミュレーション`}
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
                    particle.phase === "parent" ? parentColor : daughterColor;
                  return (
                    <g
                      key={particle.id}
                      ref={(node) => {
                        particleNodeRefs.current[particle.id] = node;
                      }}
                      className={`particle particle-${particle.phase}`}
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
                <small>{preset.modeLabel}</small>
              </div>
              <span className="field-hint">画面を押すと検出パルスを表示</span>
            </div>
          </div>

          <aside className="control-panel" aria-label="シミュレーション設定">
            <div className="control-heading">
              <span>実験条件</span>
              <strong>{preset.parent}</strong>
              <small>半減期 {preset.halfLife} {preset.unit}</small>
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
            赤い点と実線が今回の試行、青い破線が理論値です。
            リセットするたびに、確率による揺らぎ方が変わります。
          </p>
        </div>

        <div className="stats-grid">
          <article>
            <span>経過時間</span>
            <strong>{formatElapsed(elapsed, preset)}</strong>
            <small>{elapsed.toFixed(2)} × T½</small>
          </article>
          <article>
            <span>未壊変の原子核</span>
            <strong>{remaining}<small> / {atomCount}</small></strong>
            <small>{remainingPercent.toFixed(1)}%</small>
          </article>
          <article>
            <span>壊変した原子核</span>
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
              未壊変原子核数の時間変化（{chartScale === "log" ? "対数" : "線形"}目盛り）
            </title>
            <desc id="chart-description">
              {preset.parent}の観測値と指数関数による理論値を
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
