"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LabLayout, LabStateTools, SafetyNote, usePhenomenaLanguage } from "../../components/PhenomenaShell";
import { translate } from "../../lib/experiment";
import { getLabBySlug, localized, type Language } from "../../lib/labs";
import { computeDetectorResponse, DETECTOR_MODELS, SHIELD_MODELS, type DetectorKey, type RadiationMode, type ShieldKey } from "../../lib/nuclear-models";

const LAB = getLabBySlug("detector")!;
const SOURCES: readonly { id: string; label: { ja: string; en: string }; radiation: RadiationMode; color: string }[] = [
  { id: "iodine-131", label: { ja: "ヨウ素131", en: "Iodine-131" }, radiation: "beta", color: "#d95c4f" },
  { id: "cesium-137", label: { ja: "セシウム137", en: "Cesium-137" }, radiation: "gamma", color: "#4b7da8" },
  { id: "cobalt-60", label: { ja: "コバルト60", en: "Cobalt-60" }, radiation: "gamma", color: "#9d7947" },
];

function sourceFromQuery(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("nuclide")?.toLowerCase();
  if (!value) return null;
  if (value.includes("cs-137") || value.includes("cesium")) return "cesium-137";
  if (value.includes("co-60") || value.includes("cobalt")) return "cobalt-60";
  if (value.includes("i-131") || value.includes("iodine")) return "iodine-131";
  return null;
}

function formatNumber(value: number, language: Language, digits = 1): string {
  return new Intl.NumberFormat(language === "ja" ? "ja-JP" : "en-US", { maximumFractionDigits: digits }).format(value);
}

export default function DetectorLabPage() {
  const [language, setLanguage] = usePhenomenaLanguage();
  const [sourceId, setSourceId] = useState("iodine-131");
  const [detector, setDetector] = useState<DetectorKey>("gm");
  const [shield, setShield] = useState<ShieldKey>("none");
  const [distanceCm, setDistanceCm] = useState(10);
  const [thicknessMm, setThicknessMm] = useState(4);
  const [measurementSeconds, setMeasurementSeconds] = useState(10);
  useEffect(() => {
    const querySource = sourceFromQuery();
    if (!querySource) return;
    const timer = window.setTimeout(() => setSourceId(querySource), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const source = SOURCES.find((item) => item.id === sourceId) ?? SOURCES[0];
  const response = useMemo(() => computeDetectorResponse({ detector, radiation: source.radiation, activityFraction: 1, distanceCm, shield, thicknessMm, measurementSeconds }), [detector, distanceCm, measurementSeconds, shield, source.radiation, thicknessMm]);
  const t = (ja: string, en: string) => translate(language, ja, en);
  const state = { sourceId, detector, shield, distanceCm, thicknessMm, measurementSeconds };
  const restore = (next: typeof state) => { setSourceId(next.sourceId); setDetector(next.detector); setShield(next.shield); setDistanceCm(next.distanceCm); setThicknessMm(next.thicknessMm); setMeasurementSeconds(next.measurementSeconds); };
  const bars = Array.from({ length: 44 }, (_, index) => {
    const wave = Math.sin(index * 1.7 + distanceCm * 0.04) * 0.16 + 0.5;
    const hit = response.countRateCps > 0.25 && ((index * 17 + Math.round(response.countRateCps * 10)) % 100) / 100 < Math.min(0.9, response.countRateCps / 30);
    return { height: hit ? 20 + wave * 78 : 5 + wave * 14, hit };
  });
  const verdict = response.transmission < 0.02 ? t("ほぼ遮蔽", "Almost blocked") : response.transmission < 0.25 ? t("大きく減衰", "Strongly attenuated") : response.transmission < 0.7 ? t("一部を透過", "Partially transmitted") : t("明瞭に検出", "Clearly detected");

  return (
    <LabLayout lab={LAB} language={language} onLanguageChange={setLanguage}>
      <section className="detector-lab-v1" aria-labelledby="detector-experiment-title">
        <div className="lab-section-heading"><div><p className="eyebrow">01 / RESPONSE COMPARISON</p><h2 id="detector-experiment-title">{t("検出器の読み方", "Reading a detector")}</h2></div><p>{t("同じ簡略化した信号に対して、検出器、距離、遮蔽、測定時間を変えます。", "Change detector, distance, shielding, and measurement time against the same simplified signal.")}</p></div>
        <div className="detector-toolbar"><div className="detector-source-tabs" role="group" aria-label={t("線源", "Source")}>
          {SOURCES.map((item) => <button type="button" aria-pressed={item.id === sourceId} key={item.id} onClick={() => setSourceId(item.id)}><i style={{ background: item.color }} /><span>{localized(language, item.label)}</span><small>{item.radiation.toUpperCase()}</small></button>)}
        </div><LabStateTools labId="detector" language={language} state={state} onRestore={restore} fallback={{ sourceId: "iodine-131", detector: "gm", shield: "none", distanceCm: 10, thicknessMm: 4, measurementSeconds: 10 }} /></div>
        <div className="detector-v1-grid">
          <aside className="detector-v1-controls">
            <fieldset><legend>{t("検出器の種類", "Detector type")}</legend><div className="detector-v1-options">{(Object.entries(DETECTOR_MODELS) as [DetectorKey, typeof DETECTOR_MODELS[DetectorKey]][]).map(([key, model]) => <button type="button" aria-pressed={detector === key} key={key} onClick={() => setDetector(key)}><strong>{model.shortName}</strong><span>{localized(language, model.name)}</span><small>{localized(language, model.description)}</small></button>)}</div></fieldset>
            <label className="range-field"><span>{t("線源からの距離", "Distance from source")}<output>{distanceCm} cm</output></span><input type="range" min="5" max="100" step="5" value={distanceCm} onChange={(event) => setDistanceCm(Number(event.target.value))} /></label>
            <fieldset><legend>{t("遮蔽物", "Shielding")}</legend><div className="shield-v1-options">{(Object.entries(SHIELD_MODELS) as [ShieldKey, typeof SHIELD_MODELS[ShieldKey]][]).map(([key, model]) => <button type="button" aria-pressed={shield === key} key={key} onClick={() => setShield(key)}><b>{model.symbol}</b><span>{localized(language, model.name)}</span></button>)}</div></fieldset>
            <label className="range-field"><span>{t("遮蔽厚", "Shield thickness")}<output>{shield === "none" ? "—" : `${thicknessMm} mm`}</output></span><input type="range" min="0" max="20" step="1" value={thicknessMm} disabled={shield === "none"} onChange={(event) => setThicknessMm(Number(event.target.value))} /></label>
            <label className="range-field"><span>{t("測定時間", "Measurement time")}<output>{measurementSeconds} {t("秒", "s")}</output></span><input type="range" min="1" max="60" step="1" value={measurementSeconds} onChange={(event) => setMeasurementSeconds(Number(event.target.value))} /></label>
          </aside>
          <div className="detector-v1-console">
            <div className="apparatus-v1" aria-label={t(`${localized(language, source.label)}の検出実験配置`, `${localized(language, source.label)} detector layout`)}><div className="apparatus-source"><span>SOURCE</span><strong>{localized(language, source.label)}</strong><small>{source.radiation.toUpperCase()}</small></div><div className="apparatus-beam"><span style={{ width: `${Math.max(6, response.transmission * 100)}%` }} /><small>{distanceCm} cm</small></div><div className="apparatus-shield"><b>{SHIELD_MODELS[shield].symbol}</b><small>{localized(language, SHIELD_MODELS[shield].name)}</small></div><div className="apparatus-detector"><strong>{DETECTOR_MODELS[detector].shortName}</strong><span>{localized(language, DETECTOR_MODELS[detector].name)}</span></div></div>
            <div className="detector-scope-v1"><div><span>LIVE COUNTS / {source.radiation.toUpperCase()}</span><strong>{verdict}</strong></div><div className="scope-bars-v1" aria-hidden="true">{bars.map((bar, index) => <i className={bar.hit ? "is-hit" : ""} style={{ height: `${bar.height}%` }} key={index} />)}</div></div>
            <div className="detector-readouts-v1"><article><span>{t("計数率", "Count rate")}</span><strong>{formatNumber(response.countRateCps, language)} <small>cps</small></strong><small>{formatNumber(response.countRateCps * 60, language)} cpm</small></article><article><span>{t(`${measurementSeconds}秒間の計数`, `Counts in ${measurementSeconds} s`)}</span><strong>{response.counts.toLocaleString(language === "ja" ? "ja-JP" : "en-US")}</strong><small>±{response.uncertaintyPercent.toFixed(1)}% {t("統計誤差", "statistical")}</small></article><article><span>{t("透過率", "Transmission")}</span><strong>{formatNumber(response.transmission * 100, language)}<small>%</small></strong><small>{localized(language, SHIELD_MODELS[shield].name)} / {shield === "none" ? "—" : `${thicknessMm} mm`}</small></article><article><span>{t("信号 / 背景", "Signal / background")}</span><strong>{formatNumber(response.signalToBackground, language, 2)}</strong><small>{response.signalToBackground >= 5 ? t("区別しやすい", "easy to distinguish") : t("背景に埋もれやすい", "likely lost in background")}</small></article></div>
            <div className="detector-interpretation"><p className="eyebrow">MODEL READING</p><p>{t("この表示は、検出器の相対的な違いとポアソン統計を観察するためのものです。実際の校正値や線量率を示しません。", "This display is for observing relative detector differences and Poisson statistics. It does not report a calibrated dose rate.")}</p><Link href="/labs/pulse">{t("イベントの蓄積を見る → Pulse Labへ", "Watch events accumulate → Pulse Lab")}</Link></div>
          </div>
        </div>
      </section>
      <SafetyNote lab={LAB} language={language} />
    </LabLayout>
  );
}
