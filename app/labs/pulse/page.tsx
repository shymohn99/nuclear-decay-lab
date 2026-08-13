"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LabLayout, LabStateTools, SafetyNote, usePhenomenaLanguage } from "../../components/PhenomenaShell";
import { translate } from "../../lib/experiment";
import { getLabBySlug, localized } from "../../lib/labs";
import { DETECTOR_MODELS, generatePulseRun, PULSE_SOURCES, type DetectorKey, type PulseRun } from "../../lib/nuclear-models";

const LAB = getLabBySlug("pulse")!;
const INITIAL_CONTROLS = { sourceId: "cesium-137", detector: "scintillator" as DetectorKey, measurementSeconds: 15, backgroundCps: 3, seed: 137 };

function buildRun(controls: typeof INITIAL_CONTROLS): PulseRun {
  return generatePulseRun(controls);
}

export default function PulseLabPage() {
  const [language, setLanguage] = usePhenomenaLanguage();
  const [sourceId, setSourceId] = useState(INITIAL_CONTROLS.sourceId);
  const [detector, setDetector] = useState<DetectorKey>(INITIAL_CONTROLS.detector);
  const [measurementSeconds, setMeasurementSeconds] = useState(INITIAL_CONTROLS.measurementSeconds);
  const [backgroundCps, setBackgroundCps] = useState(INITIAL_CONTROLS.backgroundCps);
  const [seed, setSeed] = useState(INITIAL_CONTROLS.seed);
  const [run, setRun] = useState<PulseRun>(() => buildRun(INITIAL_CONTROLS));
  const [visibleEvents, setVisibleEvents] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const animationRef = useRef<number | null>(null);
  const source = PULSE_SOURCES.find((item) => item.id === sourceId) ?? PULSE_SOURCES[0];
  const t = (ja: string, en: string) => translate(language, ja, en);
  const state = { sourceId, detector, measurementSeconds, backgroundCps, seed };
  const restore = (next: typeof state) => { setSourceId(next.sourceId); setDetector(next.detector); setMeasurementSeconds(next.measurementSeconds); setBackgroundCps(next.backgroundCps); setSeed(next.seed); };

  useEffect(() => () => { if (animationRef.current !== null) window.clearInterval(animationRef.current); }, []);
  const visibleBins = useMemo(() => {
    const bins = Array.from({ length: run.bins.length }, () => 0);
    for (const event of run.events.slice(0, visibleEvents)) bins[Math.min(bins.length - 1, Math.floor(event.energyKeV / run.binWidthKeV))] += 1;
    return bins;
  }, [run, visibleEvents]);
  const maxBin = Math.max(1, ...visibleBins);
  const peakIndex = visibleEvents >= 24 ? visibleBins.reduce((best, value, index) => value > visibleBins[best] ? index : best, 0) : -1;
  const peakEnergy = peakIndex >= 0 ? (peakIndex + 0.5) * run.binWidthKeV : null;
  const startRun = () => {
    const nextRun = buildRun({ sourceId, detector, measurementSeconds, backgroundCps, seed });
    setRun(nextRun);
    setVisibleEvents(0);
    setIsRunning(true);
    if (animationRef.current !== null) window.clearInterval(animationRef.current);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) { setVisibleEvents(nextRun.events.length); setIsRunning(false); return; }
    animationRef.current = window.setInterval(() => {
      setVisibleEvents((current) => {
        const next = Math.min(nextRun.events.length, current + Math.max(6, Math.ceil(nextRun.events.length / 100)));
        if (next >= nextRun.events.length) { if (animationRef.current !== null) window.clearInterval(animationRef.current); setIsRunning(false); }
        return next;
      });
    }, 35);
  };
  const reset = () => { if (animationRef.current !== null) window.clearInterval(animationRef.current); setSourceId(INITIAL_CONTROLS.sourceId); setDetector(INITIAL_CONTROLS.detector); setMeasurementSeconds(INITIAL_CONTROLS.measurementSeconds); setBackgroundCps(INITIAL_CONTROLS.backgroundCps); setSeed(INITIAL_CONTROLS.seed); setRun(buildRun(INITIAL_CONTROLS)); setVisibleEvents(0); setIsRunning(false); };
  const chartWidth = 840;
  const chartHeight = 340;
  const left = 44;
  const top = 24;
  const plotWidth = 760;
  const plotHeight = 242;

  return (
    <LabLayout lab={LAB} language={language} onLanguageChange={setLanguage}>
      <section className="pulse-lab-v1" aria-labelledby="pulse-experiment-title">
        <div className="lab-section-heading"><div><p className="eyebrow">01 / EVENT ACCUMULATION</p><h2 id="pulse-experiment-title">{t("パルスの蓄積", "Pulse accumulation")}</h2></div><p>{t("イベントを一つずつ加え、背景の中からスペクトルらしい構造が立ち上がる過程を観察します。", "Add events one by one and watch spectrum-like structure emerge from the background.")}</p></div>
        <div className="pulse-toolbar"><div><span className="pulse-status-dot" data-running={isRunning} />{isRunning ? t("イベントを追加中…", "Accumulating events…") : t("実験は停止中", "Experiment paused")}</div><LabStateTools labId="pulse" language={language} state={state} onRestore={restore} fallback={INITIAL_CONTROLS} /></div>
        <div className="pulse-layout">
          <aside className="pulse-controls">
            <fieldset><legend>{t("代表核種", "Representative source")}</legend><div className="pulse-source-options">{PULSE_SOURCES.map((item) => <button type="button" aria-pressed={sourceId === item.id} key={item.id} onClick={() => setSourceId(item.id)}><i style={{ background: item.color }} /><strong>{localized(language, item.label)}</strong><small>{item.peaks.map((peak) => `${peak.energyKeV} keV`).join(" / ")}</small></button>)}</div></fieldset>
            <fieldset><legend>{t("検出器特性", "Detector response")}</legend><div className="pulse-detector-options">{(Object.entries(DETECTOR_MODELS) as [DetectorKey, typeof DETECTOR_MODELS[DetectorKey]][]).map(([key, model]) => <button type="button" aria-pressed={detector === key} key={key} onClick={() => setDetector(key)}><strong>{model.shortName}</strong><span>{localized(language, model.name)}</span><small>{t(`分解能 ${(model.resolutionFwhm * 100).toFixed(1)}%`, `${(model.resolutionFwhm * 100).toFixed(1)}% resolution`)}</small></button>)}</div></fieldset>
            <label className="range-field"><span>{t("測定時間", "Measurement time")}<output>{measurementSeconds} {t("秒", "s")}</output></span><input type="range" min="2" max="60" step="1" value={measurementSeconds} onChange={(event) => setMeasurementSeconds(Number(event.target.value))} /></label>
            <label className="range-field"><span>{t("バックグラウンド", "Background")}<output>{backgroundCps} cps</output></span><input type="range" min="0" max="20" step="1" value={backgroundCps} onChange={(event) => setBackgroundCps(Number(event.target.value))} /></label>
            <label className="seed-field"><span>{t("再現可能な乱数シード", "Reproducible random seed")}</span><input type="number" min="1" max="999999" value={seed} onChange={(event) => setSeed(Math.max(1, Number(event.target.value) || 1))} /></label>
            <div className="pulse-actions"><button type="button" className="primary-action" onClick={startRun}>{isRunning ? t("最初から再生", "Replay from start") : t("イベントを蓄積", "Accumulate events")} ↗</button><button type="button" onClick={reset}>{t("初期状態", "Reset")}</button></div>
            <p className="pulse-model-note">{t("これは教育用の確率モデルです。ピークの存在を体験するためのもので、核種同定や安全判断には使えません。", "This is an educational probability model for experiencing peak formation; it is not for nuclide identification or safety decisions.")}</p>
          </aside>
          <div className="pulse-visual">
            <div className="pulse-readout"><div><span>{t("蓄積イベント", "Accumulated events")}</span><strong>{visibleEvents.toLocaleString(language === "ja" ? "ja-JP" : "en-US")} <small>/ {run.events.length.toLocaleString(language === "ja" ? "ja-JP" : "en-US")}</small></strong></div><div><span>{t("見えている構造", "Visible structure")}</span><strong>{peakEnergy ? `${peakEnergy.toFixed(0)} keV` : "—"}</strong></div><div><span>{t("検出器", "Detector")}</span><strong>{DETECTOR_MODELS[run.detector].shortName}</strong></div></div>
            <svg className="pulse-spectrum" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-labelledby="pulse-chart-title pulse-chart-desc">
              <title id="pulse-chart-title">{t("イベントエネルギーの簡易スペクトル", "Simplified event-energy spectrum")}</title>
              <desc id="pulse-chart-desc">{t("縦軸はイベント数、横軸はエネルギーです。イベントが蓄積すると代表線の周りに山が現れます。", "Event count is vertical and energy is horizontal. Peaks appear around representative lines as events accumulate.")}</desc>
              <rect className="pulse-chart-surface" x="0" y="0" width={chartWidth} height={chartHeight} />
              {[0, 400, 800, 1200, 1600].map((energy) => { const x = left + energy / run.maxEnergyKeV * plotWidth; return <g key={energy}><line className="pulse-grid-line" x1={x} x2={x} y1={top} y2={top + plotHeight} /><text className="pulse-axis-label" x={x} y={top + plotHeight + 25} textAnchor="middle">{energy}</text></g>; })}
              {visibleBins.map((count, index) => { if (!count) return null; const x = left + index / visibleBins.length * plotWidth; const width = Math.max(1.2, plotWidth / visibleBins.length - 0.7); const height = count / maxBin * plotHeight; return <rect className="pulse-bar" key={index} x={x} y={top + plotHeight - height} width={width} height={height} />; })}
              {source.peaks.map((peak) => { const x = left + peak.energyKeV / run.maxEnergyKeV * plotWidth; return <g key={peak.energyKeV}><line className="pulse-reference-line" x1={x} x2={x} y1={top} y2={top + plotHeight} /><text className="pulse-reference-label" x={x + 4} y={top + 14}>{peak.energyKeV} keV</text></g>; })}
              <line className="pulse-axis" x1={left} x2={left + plotWidth} y1={top + plotHeight} y2={top + plotHeight} /><text className="pulse-axis-title" x={left + plotWidth} y={chartHeight - 4} textAnchor="end">energy / keV</text><text className="pulse-axis-title" x="12" y={top} transform={`rotate(-90 12 ${top})`}>events</text>
            </svg>
            <div className="pulse-event-strip" aria-label={t("最近のイベント列", "Recent event sequence")}>{run.events.slice(Math.max(0, visibleEvents - 48), visibleEvents).map((event, index) => <i className={event.kind === "signal" ? "is-signal" : "is-background"} style={{ height: `${Math.max(12, event.energyKeV / run.maxEnergyKeV * 100)}%` }} key={`${index}-${event.energyKeV}`} />)}</div>
            <div className="pulse-legend"><span><i className="pulse-legend-signal" />{t("代表線由来", "Source-like events")}</span><span><i className="pulse-legend-background" />{t("背景", "Background")}</span><Link href="/labs/detector">{t("Detector Labで検出器の違いを見る", "Compare detector responses in Detector Lab")} ↗</Link></div>
          </div>
        </div>
      </section>
      <SafetyNote lab={LAB} language={language} />
    </LabLayout>
  );
}
