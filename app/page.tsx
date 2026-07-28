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

type IsotopePreset = {
  key: string;
  parent: string;
  daughter: string;
  symbol: string;
  daughterSymbol: string;
  halfLife: number;
  unit: string;
  mode: DecayMode;
  modeLabel: string;
  emission: string;
  parentRgb: string;
  daughterRgb: string;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: "parent" | "daughter";
  pulse: number;
  radius: number;
};

type Burst = {
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

const PRESETS: IsotopePreset[] = [
  {
    key: "iodine-131",
    parent: "ヨウ素131",
    daughter: "キセノン131",
    symbol: "¹³¹I",
    daughterSymbol: "¹³¹Xe",
    halfLife: 8.02,
    unit: "日",
    mode: "beta",
    modeLabel: "β⁻ 崩壊",
    emission: "電子 + 反ニュートリノ",
    parentRgb: "255, 102, 142",
    daughterRgb: "76, 217, 255",
  },
  {
    key: "carbon-14",
    parent: "炭素14",
    daughter: "窒素14",
    symbol: "¹⁴C",
    daughterSymbol: "¹⁴N",
    halfLife: 5730,
    unit: "年",
    mode: "beta",
    modeLabel: "β⁻ 崩壊",
    emission: "電子 + 反ニュートリノ",
    parentRgb: "255, 190, 91",
    daughterRgb: "93, 229, 181",
  },
  {
    key: "cobalt-60",
    parent: "コバルト60",
    daughter: "ニッケル60",
    symbol: "⁶⁰Co",
    daughterSymbol: "⁶⁰Ni",
    halfLife: 5.27,
    unit: "年",
    mode: "gamma",
    modeLabel: "β⁻ + γ 崩壊",
    emission: "電子 + γ線",
    parentRgb: "184, 116, 255",
    daughterRgb: "84, 207, 255",
  },
  {
    key: "polonium-210",
    parent: "ポロニウム210",
    daughter: "鉛206",
    symbol: "²¹⁰Po",
    daughterSymbol: "²⁰⁶Pb",
    halfLife: 138.4,
    unit: "日",
    mode: "alpha",
    modeLabel: "α 崩壊",
    emission: "ヘリウム原子核",
    parentRgb: "255, 91, 93",
    daughterRgb: "89, 198, 255",
  },
];

const SIMULATED_HALF_LIVES_PER_SECOND = 0.075;

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

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = index * 2.399963 + Math.random() * 0.2;
    const radius = Math.sqrt((index + 0.5) / count) * 0.42;
    return {
      x: 0.5 + Math.cos(angle) * radius,
      y: 0.5 + Math.sin(angle) * radius * 0.72,
      vx: (Math.random() - 0.5) * 0.018,
      vy: (Math.random() - 0.5) * 0.018,
      phase: "parent",
      pulse: Math.random(),
      radius: 2.4 + Math.random() * 2.3,
    };
  });
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const burstsRef = useRef<Burst[]>([]);
  const elapsedRef = useRef(0);
  const historyRef = useRef<HistoryPoint[]>([]);
  const lastHistoryAtRef = useRef(0);

  const [presetKey, setPresetKey] = useState(PRESETS[0].key);
  const [atomCount, setAtomCount] = useState(160);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(160);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<HistoryPoint[]>([
    { t: 0, remaining: 160 },
  ]);

  const preset = useMemo(
    () => PRESETS.find((item) => item.key === presetKey) ?? PRESETS[0],
    [presetKey],
  );

  const resetSimulation = useCallback(() => {
    particlesRef.current = makeParticles(atomCount);
    burstsRef.current = [];
    elapsedRef.current = 0;
    lastHistoryAtRef.current = 0;
    const initialHistory = [{ t: 0, remaining: atomCount }];
    historyRef.current = initialHistory;
    setHistory(initialHistory);
    setElapsed(0);
    setRemaining(atomCount);
    setPaused(false);
  }, [atomCount]);

  useEffect(() => {
    resetSimulation();
  }, [presetKey, resetSimulation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frameId = 0;
    let lastFrame = performance.now();
    let lastUiUpdate = 0;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * pixelRatio));
      const height = Math.max(1, Math.round(rect.height * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);
    resizeCanvas();

    const draw = (timestamp: number) => {
      const dt = Math.min((timestamp - lastFrame) / 1000, 0.05);
      lastFrame = timestamp;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      context.clearRect(0, 0, width, height);

      const field = context.createRadialGradient(
        width * 0.5,
        height * 0.48,
        0,
        width * 0.5,
        height * 0.48,
        width * 0.62,
      );
      field.addColorStop(0, `rgba(${preset.parentRgb}, 0.09)`);
      field.addColorStop(0.48, `rgba(${preset.daughterRgb}, 0.035)`);
      field.addColorStop(1, "rgba(2, 6, 13, 0)");
      context.fillStyle = field;
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "rgba(151, 177, 206, 0.075)";
      context.lineWidth = 1;
      const grid = Math.max(34, width / 18);
      for (let x = grid; x < width; x += grid) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let y = grid; y < height; y += grid) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      const deltaHalfLives = paused
        ? 0
        : dt * speed * SIMULATED_HALF_LIVES_PER_SECOND;
      const decayProbability = 1 - Math.pow(0.5, deltaHalfLives);
      const motionScale = reduceMotion ? 0 : paused ? 0.18 : 1;
      const particles = particlesRef.current;

      if (!paused) elapsedRef.current += deltaHalfLives;

      for (const particle of particles) {
        particle.x += particle.vx * dt * motionScale;
        particle.y += particle.vy * dt * motionScale;
        if (particle.x < 0.035 || particle.x > 0.965) particle.vx *= -1;
        if (particle.y < 0.06 || particle.y > 0.94) particle.vy *= -1;
        particle.x = Math.max(0.035, Math.min(0.965, particle.x));
        particle.y = Math.max(0.06, Math.min(0.94, particle.y));
        particle.pulse += dt * 2.1;

        if (
          particle.phase === "parent" &&
          decayProbability > 0 &&
          Math.random() < decayProbability
        ) {
          particle.phase = "daughter";
          burstsRef.current.push({
            x: particle.x,
            y: particle.y,
            life: 1,
            angle: Math.random() * Math.PI * 2,
            kind: preset.mode,
          });
        }
      }

      const connected = particles.slice(0, 100);
      context.lineWidth = 0.7;
      for (let i = 0; i < connected.length; i += 1) {
        for (let j = i + 1; j < Math.min(connected.length, i + 5); j += 1) {
          const a = connected[i];
          const b = connected[j];
          const dx = (a.x - b.x) * width;
          const dy = (a.y - b.y) * height;
          const distance = Math.hypot(dx, dy);
          if (distance < 80) {
            context.strokeStyle = `rgba(130, 180, 220, ${0.08 * (1 - distance / 80)})`;
            context.beginPath();
            context.moveTo(a.x * width, a.y * height);
            context.lineTo(b.x * width, b.y * height);
            context.stroke();
          }
        }
      }

      for (const particle of particles) {
        const x = particle.x * width;
        const y = particle.y * height;
        const rgb =
          particle.phase === "parent"
            ? preset.parentRgb
            : preset.daughterRgb;
        const breathing = reduceMotion
          ? 1
          : 0.92 + Math.sin(particle.pulse) * 0.08;
        const radius = particle.radius * breathing;

        context.shadowBlur = 14;
        context.shadowColor = `rgba(${rgb}, 0.72)`;
        context.fillStyle = `rgba(${rgb}, 0.92)`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();

        context.shadowBlur = 0;
        context.strokeStyle = `rgba(${rgb}, 0.42)`;
        context.lineWidth = 1;
        context.beginPath();
        context.arc(x, y, radius + 4.5, 0, Math.PI * 2);
        context.stroke();
      }

      context.shadowBlur = 0;
      burstsRef.current = burstsRef.current.filter((burst) => {
        burst.life -= dt * 1.35;
        if (burst.life <= 0) return false;

        const x = burst.x * width;
        const y = burst.y * height;
        const distance = (1 - burst.life) * 68;
        const alpha = Math.min(1, burst.life * 1.7);
        const dx = Math.cos(burst.angle);
        const dy = Math.sin(burst.angle);

        if (burst.kind === "alpha") {
          context.fillStyle = `rgba(255, 220, 105, ${alpha})`;
          for (let i = 0; i < 4; i += 1) {
            context.beginPath();
            context.arc(
              x + dx * (distance + i * 5) + Math.sin(i) * 3,
              y + dy * (distance + i * 5) + Math.cos(i) * 3,
              2.5,
              0,
              Math.PI * 2,
            );
            context.fill();
          }
        } else if (burst.kind === "beta") {
          context.strokeStyle = `rgba(122, 239, 255, ${alpha})`;
          context.lineWidth = 2;
          context.beginPath();
          context.moveTo(x + dx * 8, y + dy * 8);
          context.lineTo(x + dx * (distance + 25), y + dy * (distance + 25));
          context.stroke();
        } else {
          context.strokeStyle = `rgba(212, 157, 255, ${alpha})`;
          context.lineWidth = 1.5;
          context.beginPath();
          context.arc(x, y, 12 + distance, 0, Math.PI * 2);
          context.stroke();
          context.beginPath();
          context.arc(x, y, 24 + distance * 1.25, 0, Math.PI * 2);
          context.stroke();
        }
        return true;
      });

      if (timestamp - lastUiUpdate > 90) {
        const currentRemaining = particles.reduce(
          (total, particle) =>
            total + (particle.phase === "parent" ? 1 : 0),
          0,
        );
        setRemaining(currentRemaining);
        setElapsed(elapsedRef.current);

        if (
          elapsedRef.current - lastHistoryAtRef.current >= 0.045 ||
          currentRemaining === 0
        ) {
          lastHistoryAtRef.current = elapsedRef.current;
          const next = [
            ...historyRef.current,
            { t: elapsedRef.current, remaining: currentRemaining },
          ].slice(-180);
          historyRef.current = next;
          setHistory(next);
        }
        lastUiUpdate = timestamp;
      }

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [paused, preset, speed]);

  const handleDetectorPulse = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    burstsRef.current.push({
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
      life: 1,
      angle: Math.random() * Math.PI * 2,
      kind: "gamma",
    });
  };

  const expected = atomCount * Math.pow(0.5, elapsed);
  const decayed = atomCount - remaining;
  const activity = remaining * Math.LN2;
  const remainingPercent = (remaining / atomCount) * 100;

  const chart = useMemo(() => {
    const width = 640;
    const height = 230;
    const left = 42;
    const right = 18;
    const top = 18;
    const bottom = 34;
    const maxT = Math.max(3, elapsed * 1.12);
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    const toPath = (points: Array<{ t: number; value: number }>) =>
      points
        .map((point, index) => {
          const x = left + (point.t / maxT) * plotWidth;
          const y = top + (1 - point.value / atomCount) * plotHeight;
          return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");

    const theoretical = Array.from({ length: 90 }, (_, index) => {
      const t = (index / 89) * maxT;
      return { t, value: atomCount * Math.pow(0.5, t) };
    });
    const observed = history.map((point) => ({
      t: point.t,
      value: point.remaining,
    }));

    return {
      theoreticalPath: toPath(theoretical),
      observedPath: toPath(observed),
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
  }, [atomCount, elapsed, history]);

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
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="lab-header">
        <a className="brand" href="#simulator" aria-label="Decay Lab トップ">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>
            <strong>DECAY LAB</strong>
            <small>NUCLEAR PHYSICS PLAYGROUND</small>
          </span>
        </a>
        <div className="live-indicator">
          <span aria-hidden="true" />
          MONTE CARLO / LIVE
        </div>
      </header>

      <section className="hero-copy" aria-labelledby="page-title">
        <p className="eyebrow">STOCHASTIC NUCLEAR DECAY</p>
        <h1 id="page-title">
          見えない確率を、
          <br />
          <span>粒子の光</span>で観測する。
        </h1>
        <p className="hero-description">
          一つひとつの原子核は予測できない。それでも集団は、美しい指数関数に従う。
          核種を選び、時間を加速して、偶然が法則へ変わる瞬間を観察しよう。
        </p>
      </section>

      <section className="simulator" id="simulator" aria-label="核崩壊シミュレーター">
        <div className="preset-rail" role="tablist" aria-label="核種を選択">
          {PRESETS.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={presetKey === item.key}
              className={presetKey === item.key ? "is-active" : ""}
              onClick={() => setPresetKey(item.key)}
              key={item.key}
            >
              <span className="isotope-symbol">{item.symbol}</span>
              <span>
                <strong>{item.parent}</strong>
                <small>T½ = {item.halfLife} {item.unit}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="simulator-grid">
          <div className="visual-panel">
            <div className="visual-toolbar">
              <div>
                <span className="panel-kicker">PARTICLE FIELD</span>
                <strong>{preset.symbol} → {preset.daughterSymbol}</strong>
              </div>
              <div className="legend" aria-label="粒子の凡例">
                <span><i className="legend-parent" />親核種</span>
                <span><i className="legend-daughter" />娘核種</span>
                <span><i className="legend-emission" />放射線</span>
              </div>
            </div>

            <div className="canvas-wrap">
              <canvas
                ref={canvasRef}
                onPointerDown={handleDetectorPulse}
                aria-label={`${preset.parent}の原子核${atomCount}個が確率的に崩壊して${preset.daughter}へ変わる粒子シミュレーション`}
              >
                {preset.parent}から{preset.daughter}への核崩壊を可視化しています。
              </canvas>
              <div className="nucleus-readout" aria-hidden="true">
                <span>{preset.symbol}</span>
                <small>{preset.modeLabel}</small>
              </div>
              <span className="canvas-hint">TAP FIELD TO PING DETECTOR</span>
            </div>
          </div>

          <aside className="control-panel" aria-label="シミュレーション設定">
            <div className="decay-route">
              <div>
                <small>PARENT</small>
                <strong>{preset.symbol}</strong>
                <span>{preset.parent}</span>
              </div>
              <div className="route-arrow" aria-label={preset.modeLabel}>
                <span>{preset.modeLabel}</span>
                <i aria-hidden="true">→</i>
                <small>{preset.emission}</small>
              </div>
              <div>
                <small>DAUGHTER</small>
                <strong>{preset.daughterSymbol}</strong>
                <span>{preset.daughter}</span>
              </div>
            </div>

            <label className="control-field">
              <span>
                原子核の数
                <output>{atomCount}</output>
              </span>
              <input
                type="range"
                min="60"
                max="240"
                step="20"
                value={atomCount}
                onChange={(event) => setAtomCount(Number(event.target.value))}
              />
            </label>

            <label className="control-field">
              <span>
                時間倍率
                <output>{speed.toFixed(1)}×</output>
              </span>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              />
            </label>

            <div className="control-actions">
              <button
                type="button"
                className="primary-action"
                onClick={() => setPaused((value) => !value)}
              >
                <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
                {paused ? "再開" : "一時停止"}
              </button>
              <button type="button" onClick={resetSimulation}>
                ↻ リセット
              </button>
            </div>

            <div className="formula">
              <span>DECAY LAW</span>
              <code>N(t) = N₀ · 2<sup>−t / T½</sup></code>
            </div>
          </aside>
        </div>
      </section>

      <section className="data-section" aria-labelledby="observation-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">OBSERVATION</p>
            <h2 id="observation-title">偶然の点が、理論曲線へ近づく。</h2>
          </div>
          <p>
            点線は理論値、実線はこの試行の観測値。
            リセットするたびに揺らぎ方は変わります。
          </p>
        </div>

        <div className="stats-grid">
          <article>
            <span>経過時間</span>
            <strong>{formatElapsed(elapsed, preset)}</strong>
            <small>{elapsed.toFixed(2)} × T½</small>
          </article>
          <article>
            <span>未崩壊の原子核</span>
            <strong>{remaining}<small> / {atomCount}</small></strong>
            <small>{remainingPercent.toFixed(1)}% remaining</small>
          </article>
          <article>
            <span>崩壊した原子核</span>
            <strong>{decayed}</strong>
            <small>理論値 {Math.round(atomCount - expected)}</small>
          </article>
        </div>

        <div className="chart-panel">
          <div className="chart-meta">
            <span><i className="observed-line" />観測値</span>
            <span><i className="theory-line" />理論値</span>
            <strong>活動度 ≈ {activity.toFixed(1)} 崩壊 / T½</strong>
          </div>
          <svg
            className="decay-chart"
            viewBox={`0 0 ${chart.width} ${chart.height}`}
            role="img"
            aria-labelledby="chart-title chart-description"
          >
            <title id="chart-title">未崩壊原子核数の時間変化</title>
            <desc id="chart-description">
              {preset.parent}の観測値と指数関数による理論値を半減期単位で比較したグラフです。
            </desc>
            {[0, 0.5, 1].map((ratio) => {
              const y = chart.top + ratio * chart.plotHeight;
              return (
                <g key={ratio}>
                  <line
                    className="chart-grid-line"
                    x1={chart.left}
                    x2={chart.width - chart.right}
                    y1={y}
                    y2={y}
                  />
                  <text x="4" y={y + 4}>
                    {Math.round((1 - ratio) * 100)}%
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
            <path className="theory-path" d={chart.theoreticalPath} />
            <path className="observed-path" d={chart.observedPath} />
            <text
              className="axis-label"
              x={chart.left}
              y={chart.height - 8}
            >
              0
            </text>
            <text
              className="axis-label axis-label-end"
              x={chart.width - chart.right}
              y={chart.height - 8}
            >
              {chart.maxT.toFixed(1)} T½
            </text>
          </svg>
        </div>
      </section>

      <footer>
        <span>DECAY LAB / 2026</span>
        <p>確率的崩壊を理解するための教育用モンテカルロ・シミュレーション</p>
      </footer>
    </main>
  );
}
