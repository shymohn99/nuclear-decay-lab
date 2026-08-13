"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LabLayout, LabStateTools, usePhenomenaLanguage } from "../../components/PhenomenaShell";
import { downloadCsv, experimentProvenanceRows, readExperimentQuery, replaceExperimentQuery, translate } from "../../lib/experiment";
import { DETECTOR_MODELS, SHIELD_MODELS, computeDetectorResponse, type DetectorKey, type ShieldKey } from "../../lib/nuclear-models";
import { getLab, localize } from "../../lib/labs";

type DetectorState = {
  sourceId: "cesium-137" | "cobalt-60" | "iodine-131";
  detector: DetectorKey;
  distanceCm: number;
  shield: ShieldKey;
  thicknessMm: number;
  measurementSeconds: number;
};

const detectorLab = getLab("detector");
const defaultState: DetectorState = {
  sourceId: "cesium-137",
  detector: "scintillator",
  distanceCm: 25,
  shield: "none",
  thicknessMm: 2,
  measurementSeconds: 10,
};

const sources = [
  { id: "cesium-137" as const, label: { ja: "セシウム137", en: "Cesium-137" }, radiation: "gamma" as const, intensity: 1, note: { ja: "代表的なγ線源の形", en: "Representative gamma-source shape" } },
  { id: "cobalt-60" as const, label: { ja: "コバルト60", en: "Cobalt-60" }, radiation: "gamma" as const, intensity: 0.92, note: { ja: "β⁻壊変に続くγ線を含む教育用表現", en: "Teaching representation including associated gamma lines" } },
  { id: "iodine-131" as const, label: { ja: "ヨウ素131", en: "Iodine-131" }, radiation: "gamma" as const, intensity: 0.72, note: { ja: "代表γ線を使う教育用表現", en: "Teaching representation using a representative gamma line" } },
] as const;

export default function DetectorLabPage() {
  const [language, setLanguage] = usePhenomenaLanguage();
  const [state, setState] = useState<DetectorState>(defaultState);
  const routeSource = typeof window === "undefined" ? null : readExperimentQuery(window.location.search, "source");
  const requestedRouteSource = sources.find((source) => source.id === routeSource)?.id ?? null;
  const restoreState = useCallback((next: DetectorState) => {
    if (!next || typeof next !== "object") return;
    const clamp = (value: number, min: number, max: number, fallback: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
    setState({
      sourceId: sources.some((source) => source.id === next.sourceId) ? next.sourceId : defaultState.sourceId,
      detector: Object.prototype.hasOwnProperty.call(DETECTOR_MODELS, next.detector) ? next.detector : defaultState.detector,
      distanceCm: Math.round(clamp(next.distanceCm, 5, 100, defaultState.distanceCm)),
      shield: Object.prototype.hasOwnProperty.call(SHIELD_MODELS, next.shield) ? next.shield : defaultState.shield,
      thicknessMm: Math.round(clamp(next.thicknessMm, 0, 20, defaultState.thicknessMm)),
      measurementSeconds: Math.round(clamp(next.measurementSeconds, 1, 60, defaultState.measurementSeconds)),
    });
  }, []);

  useEffect(() => {
    if (!requestedRouteSource) return;
    const timer = window.setTimeout(() => {
      setState((current) => ({ ...current, sourceId: requestedRouteSource }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [requestedRouteSource]);

  const selectSource = useCallback((sourceId: DetectorState["sourceId"]) => {
    setState((current) => ({ ...current, sourceId }));
    replaceExperimentQuery("source", sourceId);
  }, []);

  const source = sources.find((item) => item.id === state.sourceId) ?? sources[0];
  const detector = DETECTOR_MODELS[state.detector];
  const shield = SHIELD_MODELS[state.shield];
  const response = useMemo(() => computeDetectorResponse({
    detector: state.detector,
    radiation: source.radiation,
    sourceIntensity: source.intensity,
    distanceCm: state.distanceCm,
    shield: state.shield,
    thicknessMm: state.thicknessMm,
    measurementSeconds: state.measurementSeconds,
  }), [source, state]);
  const bars = useMemo(() => Array.from({ length: 36 }, (_, index) => {
    const normalized = Math.min(1, response.relativeTotalPerSecond / 72);
    const wave = ((index * 37 + Math.round(state.distanceCm * 11) + state.thicknessMm * 7) % 31) / 31;
    return 8 + (normalized * 72) * (0.45 + wave);
  }), [response.relativeTotalPerSecond, state.distanceCm, state.thicknessMm]);
  const format = (value: number, digits = 1) => value.toLocaleString(language === "ja" ? "ja-JP" : "en-US", { maximumFractionDigits: digits });

  return (
    <LabLayout lab={detectorLab} language={language} onLanguageChange={setLanguage}>
      <section className="detector-workbench" aria-labelledby="detector-workbench-title">
        <div className="section-heading">
          <div><p className="eyebrow">RELATIVE RESPONSE / MODEL</p><h2 id="detector-workbench-title">{translate(language, "比較実験", "Comparison experiment")}</h2></div>
          <p>{translate(language, "ここでの数値は校正済みの計数率ではなく、条件を変えたときの相対的な期待値です。", "The values here are relative expectations under changed conditions, not calibrated count rates.")}</p>
        </div>
        <div className="detector-workbench-grid">
          <form className="detector-form" onSubmit={(event) => event.preventDefault()}>
            <fieldset><legend>{translate(language, "代表核種", "Representative nuclide")}</legend><div className="source-options">{sources.map((item) => <button type="button" key={item.id} aria-pressed={state.sourceId === item.id} onClick={() => selectSource(item.id)}><strong>{localize(language, item.label)}</strong><small>{localize(language, item.note)}</small></button>)}</div><p className="route-condition"><span>SHAREABLE SOURCE</span><code>?source={state.sourceId}</code><small>{translate(language, "選択するとこのLabのURLを更新します。", "Selecting a source updates this Lab URL.")}</small></p></fieldset>
            <fieldset><legend>{translate(language, "検出器の性質", "Detector characteristic")}</legend><div className="detector-options">{(Object.keys(DETECTOR_MODELS) as DetectorKey[]).map((key) => { const item = DETECTOR_MODELS[key]; return <button type="button" key={key} aria-pressed={state.detector === key} onClick={() => setState((current) => ({ ...current, detector: key }))}><span>{item.shortName}</span><strong>{localize(language, item.name)}</strong><small>{localize(language, item.description)}</small></button>; })}</div></fieldset>
            <label className="detector-range"><span>{translate(language, "線源からの距離", "Distance from source")}<output>{state.distanceCm} cm</output></span><input type="range" min="5" max="100" step="5" value={state.distanceCm} onChange={(event) => setState((current) => ({ ...current, distanceCm: Number(event.target.value) }))} /></label>
            <fieldset><legend>{translate(language, "遮蔽材", "Shielding")}</legend><div className="shield-options">{(Object.keys(SHIELD_MODELS) as ShieldKey[]).map((key) => { const item = SHIELD_MODELS[key]; return <button type="button" key={key} aria-pressed={state.shield === key} onClick={() => setState((current) => ({ ...current, shield: key }))}><b>{item.symbol}</b><span>{localize(language, item.name)}</span></button>; })}</div></fieldset>
            <label className="detector-range"><span>{translate(language, "遮蔽厚", "Shield thickness")}<output>{state.shield === "none" ? "—" : `${state.thicknessMm} mm`}</output></span><input type="range" min="0" max="20" step="1" disabled={state.shield === "none"} value={state.thicknessMm} onChange={(event) => setState((current) => ({ ...current, thicknessMm: Number(event.target.value) }))} /></label>
            <label className="detector-range"><span>{translate(language, "測定時間", "Measurement time")}<output>{state.measurementSeconds} {translate(language, "秒", "s")}</output></span><input type="range" min="1" max="60" step="1" value={state.measurementSeconds} onChange={(event) => setState((current) => ({ ...current, measurementSeconds: Number(event.target.value) }))} /></label>
            <LabStateTools lab={detectorLab} language={language} state={state} onRestore={restoreState} restoreOnMount={!requestedRouteSource} />
          </form>

          <div className="detector-console">
            <div className="detector-apparatus" aria-label={translate(language, `${localize(language, source.label)}の概念的な検出実験配置`, `Conceptual detector arrangement for ${localize(language, source.label)}`)}>
              <div className="detector-source"><span>SOURCE</span><strong>{localize(language, source.label)}</strong><small>{source.radiation.toUpperCase()} / relative</small></div>
              <div className="detector-flight"><span style={{ width: `${Math.max(8, response.transmission * 100)}%` }} /><small>{state.distanceCm} cm</small></div>
              <div className={`detector-shield shield-${state.shield}`}><b>{shield.symbol}</b><small>{localize(language, shield.name)}</small></div>
              <div className="detector-device"><span>{detector.shortName}</span><i /><strong>{localize(language, detector.name)}</strong></div>
            </div>
            <div className="detector-scope"><div className="scope-heading"><span>RELATIVE EXPECTATION</span><strong>{translate(language, "校正値ではない", "Not a calibrated value")}</strong></div><div className="scope-bars" aria-hidden="true">{bars.map((height, index) => <i style={{ height: `${height}%` }} key={index} />)}</div></div>
            <div className="detector-readouts">
              <article><span>{translate(language, "相対信号率", "Relative signal / s")}</span><strong>{format(response.relativeSignalPerSecond)}<small> r.u.</small></strong><small>{translate(language, "任意基準のモデル値", "model reference units")}</small></article>
              <article><span>{translate(language, "相対期待計数", "Relative expected counts")}</span><strong>{format(response.expectedCounts)}<small> r.u.</small></strong><small>{state.measurementSeconds} {translate(language, "秒間", "s")}</small></article>
              <article><span>{translate(language, "透過係数", "Transmission")}</span><strong>{format(response.transmission * 100)}<small>%</small></strong><small>{localize(language, shield.name)} / {state.shield === "none" ? "—" : `${state.thicknessMm} mm`}</small></article>
              <article><span>{translate(language, "相対信号 / 背景", "Relative signal / background")}</span><strong>{format(response.signalToBackground)}</strong><small>{translate(language, `概念的な変動指標 ≈ ${format(response.relativeVariationIndexPercent)}%`, `illustrative variation index ≈ ${format(response.relativeVariationIndexPercent)}%`)}</small></article>
            </div>
            <button className="export-button" type="button" onClick={() => downloadCsv("phenomena-detector-model.csv", [...experimentProvenanceRows(detectorLab), ["model", "Phenomena Foundation v1 relative detector model"], ["source", source.id], ["detector", state.detector], ["distance_cm", state.distanceCm], ["shield", state.shield], ["thickness_mm", state.thicknessMm], ["measurement_seconds", state.measurementSeconds], ["relative_signal_per_second", response.relativeSignalPerSecond], ["relative_expected_counts", response.expectedCounts], ["relative_variation_index_percent", response.relativeVariationIndexPercent], ["transmission", response.transmission]])}>{translate(language, "モデル条件をCSVで保存", "Export model conditions as CSV")}</button>
            <aside className="lab-handoff" aria-label={translate(language, "次の観察", "Next observation")}><span>NEXT OBSERVATION</span><Link href={`/labs/pulse?source=${source.id}`}><strong>Pulse Lab</strong><small>{translate(language, `${localize(language, source.label)}のイベントを一つずつ蓄積する`, `accumulate ${localize(language, source.label)} events one by one`)}</small><b aria-hidden="true">→</b></Link></aside>
          </div>
        </div>
      </section>
    </LabLayout>
  );
}
