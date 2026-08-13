"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LabLayout, LabStateTools, SafetyNote, usePhenomenaLanguage } from "../../components/PhenomenaShell";
import { translate } from "../../lib/experiment";
import { getLabBySlug, type Language } from "../../lib/labs";
import { MAP_RADIONUCLIDES, type MapRadionuclideRecord } from "../../radionuclides";

const LAB = getLabBySlug("atlas")!;
type AtlasRecord = {
  key: string;
  symbol: string;
  mass: number;
  protons: number;
  daughterSymbol: string;
  daughterMass: number;
  daughterProtons: number;
  metastable: boolean;
  halfLife: number;
  unit: string;
  decay: string;
  branching: number;
};

function toRecord(row: MapRadionuclideRecord): AtlasRecord {
  const [symbol, mass, protons, daughterSymbol, daughterMass, daughterProtons, metastable, halfLife, unit, decay, branching] = row;
  return { key: `${symbol}-${mass}-${protons}`, symbol, mass, protons, daughterSymbol, daughterMass, daughterProtons, metastable, halfLife, unit, decay, branching };
}

const RECORDS = MAP_RADIONUCLIDES.map(toRecord);
const RECORD_BY_KEY = new Map(RECORDS.map((record) => [record.key, record]));
const FEATURED_KEYS = ["I-131-53", "C-14-6", "Co-60-27", "Cs-137-55", "Po-210-84", "U-238-92"];

function nuclideLabel(record: Pick<AtlasRecord, "symbol" | "mass" | "metastable">): string {
  return `${record.mass}${record.symbol}${record.metastable ? "m" : ""}`;
}

function halfLifeLabel(record: AtlasRecord, language: Language): string {
  const units: Record<string, { ja: string; en: string }> = {
    秒: { ja: "秒", en: "s" }, 分: { ja: "分", en: "min" }, 時間: { ja: "時間", en: "h" }, 日: { ja: "日", en: "d" }, 年: { ja: "年", en: "y" },
  };
  return `${new Intl.NumberFormat(language === "ja" ? "ja-JP" : "en-US", { maximumFractionDigits: 4 }).format(record.halfLife)} ${units[record.unit]?.[language] ?? record.unit}`;
}

function decayLabel(code: string, language: Language): string {
  const labels: Record<string, { ja: string; en: string }> = {
    alpha: { ja: "α壊変", en: "alpha" },
    "beta-minus": { ja: "β⁻壊変", en: "beta minus" },
    "beta-plus-ec": { ja: "β⁺ / EC", en: "beta plus / EC" },
    "electron-capture": { ja: "電子捕獲", en: "electron capture" },
    "isomeric-transition": { ja: "核異性体転移", en: "isomeric transition" },
  };
  return labels[code]?.[language] ?? code;
}

export default function NuclideAtlasPage() {
  const [language, setLanguage] = usePhenomenaLanguage();
  const [selectedKey, setSelectedKey] = useState("I-131-53");
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const selected = RECORD_BY_KEY.get(selectedKey) ?? RECORDS[0];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return FEATURED_KEYS.map((key) => RECORD_BY_KEY.get(key)).filter(Boolean) as AtlasRecord[];
    return RECORDS.filter((record) => `${record.symbol}-${record.mass}`.toLowerCase().includes(query) || record.decay.includes(query)).slice(0, 18);
  }, [search]);
  const ancestors = RECORDS.filter((record) => record.daughterSymbol === selected.symbol && record.daughterMass === selected.mass && record.daughterProtons === selected.protons).slice(0, 5);
  const descendants = RECORDS.filter((record) => record.symbol === selected.symbol && record.mass === selected.mass && record.protons === selected.protons).slice(0, 5);
  const state = { selectedKey, search, zoom };
  const restore = (next: typeof state) => { setSelectedKey(next.selectedKey); setSearch(next.search); setZoom(next.zoom); };
  const t = (ja: string, en: string) => translate(language, ja, en);

  return (
    <LabLayout lab={LAB} language={language} onLanguageChange={setLanguage}>
      <section className="atlas-lab" aria-labelledby="atlas-experiment-title">
        <div className="lab-section-heading">
          <div><p className="eyebrow">01 / MAP + GENEALOGY</p><h2 id="atlas-experiment-title">{t("核種アトラス", "Nuclide atlas")}</h2></div>
          <p>{t("地図上の位置は中性子数 N と陽子数 Z です。色付きの点は主壊変データを選択できます。", "The map places nuclides by neutron number N and proton number Z. Colored points have a selectable principal decay record.")}</p>
        </div>
        <div className="atlas-toolbar">
          <label><span>{t("核種を検索", "Search nuclides")}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("例: I-131", "e.g. I-131")} /></label>
          <div className="atlas-zoom" role="group" aria-label={t("地図倍率", "Map zoom")}>
            <button type="button" onClick={() => setZoom((value) => Math.min(2.4, value * 1.2))}>＋</button>
            <output>{zoom.toFixed(1)}×</output>
            <button type="button" onClick={() => setZoom((value) => Math.max(0.7, value / 1.2))}>−</button>
            <button type="button" onClick={() => setZoom(1)}>{t("全体", "Reset")}</button>
          </div>
          <LabStateTools labId="atlas" language={language} state={state} onRestore={restore} fallback={{ selectedKey: "I-131-53", search: "", zoom: 1 }} />
        </div>

        <div className="atlas-layout">
          <div className="atlas-map-frame">
            <svg className="atlas-map" viewBox="0 0 960 520" role="img" aria-labelledby="atlas-map-title atlas-map-desc" style={{ transform: `scale(${zoom})` }}>
              <title id="atlas-map-title">{t("核種マップ", "Nuclide map")}</title>
              <desc id="atlas-map-desc">{t("横軸は中性子数、縦軸は陽子数。点を選択すると詳細を表示します。", "Neutron number is horizontal and proton number is vertical. Select a point for details.")}</desc>
              <rect className="atlas-map-surface" x="0" y="0" width="960" height="520" />
              {[2, 8, 20, 28, 50, 82, 126].map((magic) => <line className="atlas-magic-line" key={`n-${magic}`} x1={40 + magic * 4.9} x2={40 + magic * 4.9} y1="20" y2="480" />)}
              {[2, 8, 20, 28, 50, 82].map((magic) => <line className="atlas-magic-line" key={`p-${magic}`} x1="30" x2="930" y1={480 - magic * 5.2} y2={480 - magic * 5.2} />)}
              {RECORDS.map((record) => {
                const neutron = record.mass - record.protons;
                const x = 40 + neutron * 4.9;
                const y = 480 - record.protons * 5.2;
                if (x < 35 || x > 930 || y < 25 || y > 480) return null;
                const isSelected = record.key === selectedKey;
                return <g key={record.key} className={`atlas-node ${isSelected ? "is-selected" : ""}`} transform={`translate(${x} ${y})`} tabIndex={0} role="button" aria-label={`${nuclideLabel(record)}; ${decayLabel(record.decay, language)}; ${halfLifeLabel(record, language)}`} onClick={() => setSelectedKey(record.key)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedKey(record.key); } }}><circle r={isSelected ? 7 : 4} /><text x="7" y="-6">{isSelected ? record.symbol : ""}</text></g>;
              })}
              <text className="atlas-axis-label" x="930" y="510">N {t("中性子数", "neutrons")}</text>
              <text className="atlas-axis-label" x="12" y="30">Z {t("陽子数", "protons")}</text>
            </svg>
            <div className="atlas-map-legend"><span><i className="atlas-dot" />{t(`${RECORDS.length.toLocaleString("ja-JP")}件の主壊変レコード`, `${RECORDS.length.toLocaleString("en-US")} principal-decay records`)}</span><span><i className="atlas-dot selected" />{t("選択中", "Selected")}</span></div>
          </div>
          <aside className="atlas-selection" aria-live="polite">
            <p className="eyebrow">SELECTED NUCLIDE</p>
            <div className="atlas-selection-symbol"><sup>{selected.mass}</sup><sub>{selected.protons}</sub><strong>{selected.symbol}{selected.metastable ? "m" : ""}</strong></div>
            <h3>{nuclideLabel(selected)}</h3>
            <dl>
              <div><dt>{t("半減期", "Half-life")}</dt><dd>{halfLifeLabel(selected, language)}</dd></div>
              <div><dt>{t("主壊変", "Principal decay")}</dt><dd>{decayLabel(selected.decay, language)}</dd></div>
              <div><dt>{t("分岐比", "Branching")}</dt><dd>{(selected.branching * 100).toFixed(2)}%</dd></div>
              <div><dt>{t("娘核種", "Daughter")}</dt><dd>{selected.daughterMass}{selected.daughterSymbol}{selected.daughterProtons}</dd></div>
            </dl>
            <div className="atlas-related-links">
              <Link href={`/labs/decay?nuclide=${encodeURIComponent(`${selected.symbol}-${selected.mass}`)}`}>{t("Decay Labで見る", "Open in Decay Lab")} ↗</Link>
              <Link href={`/labs/detector?nuclide=${encodeURIComponent(`${selected.symbol}-${selected.mass}`)}`}>{t("Detector Labで見る", "Open in Detector Lab")} ↗</Link>
            </div>
          </aside>
        </div>

        <div className="atlas-lower-grid">
          <section className="atlas-list" aria-labelledby="atlas-list-title"><div className="subheading"><p className="eyebrow">CATALOGUE</p><h3 id="atlas-list-title">{t("代表核種", "Featured records")}</h3></div>{filtered.length === 0 ? <p>{t("該当する核種がありません。", "No matching records.")}</p> : <div className="atlas-record-list">{filtered.map((record) => <button type="button" className={record.key === selectedKey ? "is-selected" : ""} key={record.key} onClick={() => setSelectedKey(record.key)}><strong>{nuclideLabel(record)}</strong><span>{decayLabel(record.decay, language)}</span><small>{halfLifeLabel(record, language)}</small></button>)}</div>}</section>
          <section className="genealogy-card" aria-labelledby="genealogy-title"><div className="subheading"><p className="eyebrow">GENEALOGY</p><h3 id="genealogy-title">{t("前後の系譜", "Nearby genealogy")}</h3></div><div className="genealogy-columns"><div><span>{t("親核種", "Parents")}</span>{ancestors.length ? ancestors.map((record) => <button type="button" key={record.key} onClick={() => setSelectedKey(record.key)}>{nuclideLabel(record)} <small>{decayLabel(record.decay, language)}</small></button>) : <p>{t("収録データに親はありません。", "No parent in the bundled records.")}</p>}</div><div><span>{t("娘核種", "Daughters")}</span>{descendants.length ? descendants.map((record) => <button type="button" key={record.key} onClick={() => setSelectedKey(record.key)}>{record.daughterMass}{record.daughterSymbol} <small>{decayLabel(record.decay, language)}</small></button>) : <p>{t("主壊変の娘核種は安定として扱います。", "The principal daughter is treated as stable here.")}</p>}</div></div></section>
        </div>
      </section>
      <SafetyNote lab={LAB} language={language} />
    </LabLayout>
  );
}
