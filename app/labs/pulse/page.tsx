"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LabLayout, LabStateTools, usePhenomenaLanguage, useReducedMotion } from "../../components/PhenomenaShell";
import { downloadCsv, experimentProvenanceRows, readExperimentQuery, replaceExperimentQuery, translate } from "../../lib/experiment";
import { DETECTOR_MODELS, PULSE_SOURCES, binPulseEvents, generatePulseRun, type DetectorKey, type PulseSource } from "../../lib/nuclear-models";
import { getLab, localize } from "../../lib/labs";

type PulseState = {
  sourceId: PulseSource["id"];
  detector: DetectorKey;
  measurementSeconds: number;
  backgroundRelativePerSecond: number;
  resolutionScale: number;
  seed: number;
  eventsPerTick: number;
};

const pulseLab = getLab("pulse");
const defaultState: PulseState = {
  sourceId: "cesium-137",
  detector: "scintillator",
  measurementSeconds: 15,
  backgroundRelativePerSecond: 2,
  resolutionScale: 1,
  seed: 137,
  eventsPerTick: 1,
};

export default function PulseLabPage() {
  const [language, setLanguage] = usePhenomenaLanguage();
  const [state, setState] = useState<PulseState>(defaultState);
  const routeSource = typeof window === "undefined" ? null : readExperimentQuery(window.location.search, "source");
  const requestedRouteSource = PULSE_SOURCES.find((source) => source.id === routeSource)?.id ?? null;
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);
  const reducedMotion = useReducedMotion();
  const restoreState = useCallback((next: PulseState) => {
    if (!next || typeof next !== "object") return;
    const clamp = (value: number, min: number, max: number, fallback: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
    setState({
      sourceId: PULSE_SOURCES.some((source) => source.id === next.sourceId) ? next.sourceId : defaultState.sourceId,
      detector: Object.prototype.hasOwnProperty.call(DETECTOR_MODELS, next.detector) ? next.detector : defaultState.detector,
      measurementSeconds: Math.round(clamp(next.measurementSeconds, 1, 60, defaultState.measurementSeconds)),
      backgroundRelativePerSecond: clamp(next.backgroundRelativePerSecond, 0, 12, defaultState.backgroundRelativePerSecond),
      resolutionScale: clamp(next.resolutionScale, .5, 2, defaultState.resolutionScale),
      seed: Math.max(1, Math.floor(clamp(next.seed, 1, 999999, defaultState.seed))),
      eventsPerTick: [1, 4, 12].includes(next.eventsPerTick) ? next.eventsPerTick : defaultState.eventsPerTick,
    });
  }, []);

  useEffect(() => {
    if (!requestedRouteSource) return;
    const timer = window.setTimeout(() => {
      setState((current) => ({ ...current, sourceId: requestedRouteSource }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [requestedRouteSource]);

  const selectSource = useCallback((sourceId: PulseState["sourceId"]) => {
    setState((current) => ({ ...current, sourceId }));
    replaceExperimentQuery("source", sourceId);
  }, []);

  const run = useMemo(() => generatePulseRun({
    sourceId: state.sourceId,
    detector: state.detector,
    measurementSeconds: state.measurementSeconds,
    backgroundRelativePerSecond: state.backgroundRelativePerSecond,
    resolutionScale: state.resolutionScale,
    seed: state.seed,
  }), [state]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRunning(false);
      setShown(reducedMotion ? run.events.length : 0);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, run]);

  useEffect(() => {
    if (!running) return;
    if (reducedMotion) {
      const timer = window.setTimeout(() => {
        setShown(run.events.length);
        setRunning(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setInterval(() => {
      setShown((current) => {
        const next = Math.min(run.events.length, current + state.eventsPerTick);
        if (next >= run.events.length) window.setTimeout(() => setRunning(false), 0);
        return next;
      });
    }, 24);
    return () => window.clearInterval(timer);
  }, [reducedMotion, run.events.length, running, state.eventsPerTick]);

  const source = PULSE_SOURCES.find((item) => item.id === state.sourceId) ?? PULSE_SOURCES[0];
  const detector = DETECTOR_MODELS[state.detector];
  const visibleEvents = run.events.slice(0, shown);
  const bins = useMemo(() => binPulseEvents(visibleEvents, run.maxEnergyKeV), [run.maxEnergyKeV, visibleEvents]);
  const maxBin = Math.max(1, ...bins);
  const latest = visibleEvents.slice(-8).reverse();
  const resolution = detector.resolutionFwhmPercent * state.resolutionScale;
  const format = (value: number, digits = 1) => value.toLocaleString(language === "ja" ? "ja-JP" : "en-US", { maximumFractionDigits: digits });
  const rebuild = () => { setRunning(false); setShown(reducedMotion ? run.events.length : 0); };
  const runStatus = running
    ? translate(language, "イベントを蓄積中です。", "Accumulating events.")
    : shown >= run.events.length && run.events.length > 0
      ? translate(language, "イベントの蓄積が完了しました。", "Event accumulation complete.")
      : shown > 0
        ? translate(language, "イベントの蓄積を一時停止しました。", "Event accumulation paused.")
        : translate(language, "イベントの蓄積を開始できます。", "Ready to start accumulation.");

  return (
    <LabLayout lab={pulseLab} language={language} onLanguageChange={setLanguage}>
      <section className="pulse-workbench" aria-labelledby="pulse-workbench-title">
        <div className="section-heading">
          <div><p className="eyebrow">EVENTS / SPECTRUM</p><h2 id="pulse-workbench-title">{translate(language, "パルスを蓄積する", "Accumulate pulses")}</h2></div>
          <p>{translate(language, "イベントは同じseedなら同じ順序で再現されます。エネルギー軸は教育用の代表値で、核種同定には使えません。", "Events reproduce in the same order for the same seed. The energy axis uses representative teaching values and cannot identify nuclides.")}</p>
        </div>
        <div className="pulse-workbench-grid">
          <form className="pulse-form" onSubmit={(event) => event.preventDefault()}>
            <fieldset><legend>{translate(language, "代表核種", "Representative nuclide")}</legend><div className="source-options">{PULSE_SOURCES.map((item) => <button type="button" key={item.id} aria-pressed={state.sourceId === item.id} onClick={() => selectSource(item.id)}><strong>{localize(language, item.label)}</strong><small>{item.peaks.map((peak) => `${peak.energyKeV} keV`).join(" / ")}</small></button>)}</div><p className="route-condition"><span>SHAREABLE SOURCE</span><code>?source={state.sourceId}</code><small>{translate(language, "選択するとこのLabのURLを更新します。", "Selecting a source updates this Lab URL.")}</small></p></fieldset>
            <fieldset><legend>{translate(language, "検出器の性質", "Detector characteristic")}</legend><div className="pulse-detector-options">{(Object.keys(DETECTOR_MODELS) as DetectorKey[]).map((key) => { const item = DETECTOR_MODELS[key]; return <button type="button" key={key} aria-pressed={state.detector === key} onClick={() => setState((current) => ({ ...current, detector: key }))}><span>{item.shortName}</span><strong>{localize(language, item.name)}</strong><small>{item.resolutionFwhmPercent}% FWHM</small></button>; })}</div></fieldset>
            <label className="pulse-range"><span>{translate(language, "測定時間", "Measurement time")}<output>{state.measurementSeconds} {translate(language, "秒", "s")}</output></span><input type="range" min="1" max="60" step="1" value={state.measurementSeconds} onChange={(event) => setState((current) => ({ ...current, measurementSeconds: Number(event.target.value) }))} /></label>
            <label className="pulse-range"><span>{translate(language, "背景", "Background")}<output>{state.backgroundRelativePerSecond.toFixed(1)} {translate(language, "相対イベント/秒", "relative events/s")}</output></span><input type="range" min="0" max="12" step="0.5" value={state.backgroundRelativePerSecond} onChange={(event) => setState((current) => ({ ...current, backgroundRelativePerSecond: Number(event.target.value) }))} /></label>
            <label className="pulse-range"><span>{translate(language, "分解能の倍率", "Resolution scale")}<output>{resolution.toFixed(1)}% FWHM</output></span><input type="range" min="0.5" max="2" step="0.1" value={state.resolutionScale} onChange={(event) => setState((current) => ({ ...current, resolutionScale: Number(event.target.value) }))} /></label>
            <label className="seed-input"><span>{translate(language, "乱数シード", "Random seed")}</span><input type="number" min="1" max="999999" value={state.seed} onChange={(event) => setState((current) => ({ ...current, seed: Math.max(1, Math.floor(Number(event.target.value) || 1) % 1000000) }))} /><button type="button" onClick={() => setState((current) => ({ ...current, seed: 1 + (Date.now() % 999999) }))}>{translate(language, "新しいseed", "New seed")}</button></label>
            <fieldset><legend>{translate(language, "表示速度", "Display speed")}</legend><div className="pulse-speed-options">{[1, 4, 12].map((value) => <button type="button" key={value} aria-pressed={state.eventsPerTick === value} onClick={() => setState((current) => ({ ...current, eventsPerTick: value }))}>{value === 1 ? translate(language, "1イベント", "1 event") : `${value} ${translate(language, "イベント", "events")}`}</button>)}</div></fieldset>
            <LabStateTools lab={pulseLab} language={language} state={state} onRestore={restoreState} restoreOnMount={!requestedRouteSource} />
          </form>

          <div className="pulse-console">
            <div className="pulse-console-header"><div><span>RUN / {source.id.toUpperCase()}</span><strong>{localize(language, source.label)}</strong></div><div><span>SEED</span><strong>{state.seed}</strong></div></div>
            <div className="pulse-progress"><span>{shown.toLocaleString()} / {run.events.length.toLocaleString()} {translate(language, "イベント", "events")}</span><progress max={run.events.length} value={shown} /></div>
            <div className="pulse-actions"><button type="button" onClick={() => setRunning((current) => !current)} disabled={shown >= run.events.length}>{running ? translate(language, "一時停止", "Pause") : translate(language, "蓄積を開始", "Start accumulation")}</button><button type="button" onClick={() => { setRunning(false); setShown(0); }}>{translate(language, "先頭へ戻す", "Reset to first event")}</button><button type="button" onClick={rebuild}>{translate(language, "この条件で再生成", "Regenerate this run")}</button></div>
            <p className="visually-hidden" role="status" aria-atomic="true">{runStatus}</p>
            <figure className="pulse-spectrum"><svg viewBox="0 0 720 280" role="img" aria-labelledby="spectrum-title spectrum-desc"><title id="spectrum-title">{translate(language, "パルススペクトル", "Pulse spectrum")}</title><desc id="spectrum-desc">{translate(language, "イベントが蓄積されるにつれて棒グラフに代表的なピーク構造が現れます。", "As events accumulate, representative peak structure emerges in the bar chart.")}</desc><path d="M34 238H700M34 20V238" className="pulse-axis" />{bins.map((bin, index) => { const height = (bin / maxBin) * 198; const x = 39 + index * 5.45; return <rect key={index} x={x} y={238 - height} width="4.2" height={height} className="pulse-bin" />; })}<text x="34" y="262">0</text><text x="655" y="262">1600 keV</text><text x="38" y="14">events</text></svg><figcaption>{translate(language, "背景は意図的に一様分布、ピーク幅は簡略化した正規分布です。", "Background is intentionally uniform; peak width uses a simplified normal distribution.")}</figcaption></figure>
            <div className="pulse-event-stream" aria-label={translate(language, "直近のイベント", "Latest events")}><span>EVENT STREAM</span>{latest.length ? latest.map((event, index) => <p key={`${shown}-${index}-${event.energyKeV}`}><b>{event.kind === "signal" ? "SIGNAL" : "BACKGROUND"}</b><span>{format(event.energyKeV, 1)} keV</span></p>) : <p>{translate(language, "開始するとイベントが一つずつ現れます。", "Start to reveal events one at a time.")}</p>}</div>
            <button className="export-button" type="button" onClick={() => downloadCsv("phenomena-pulse-run.csv", [...experimentProvenanceRows(pulseLab), ["model", "Phenomena Foundation v1 synthetic pulse model"], ["source", source.id], ["detector", state.detector], ["measurement_seconds", state.measurementSeconds], ["background_relative_per_second", state.backgroundRelativePerSecond], ["resolution_fwhm_percent", resolution], ["seed", state.seed], [], ["event", "energy_kev", "kind"], ...visibleEvents.map((event, index) => [index + 1, event.energyKeV, event.kind])])}>{translate(language, "表示中のイベントをCSVで保存", "Export visible events as CSV")}</button>
            <aside className="lab-handoff" aria-label={translate(language, "次の観察", "Next observation")}><span>NEXT OBSERVATION</span><Link href={`/labs/detector?source=${source.id}`}><strong>Detector Lab</strong><small>{translate(language, `${localize(language, source.label)}の相対応答を比べる`, `compare ${localize(language, source.label)} relative response`)}</small><b aria-hidden="true">→</b></Link></aside>
          </div>
        </div>
      </section>
    </LabLayout>
  );
}
