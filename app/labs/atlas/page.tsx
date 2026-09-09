"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LabLayout, LabStateTools, usePhenomenaLanguage } from "../../components/PhenomenaShell";
import { readExperimentQuery, replaceExperimentQuery, translate } from "../../lib/experiment";
import { getLab, type Language } from "../../lib/labs";
import { MAP_RADIONUCLIDES, type MapRadionuclideRecord } from "../../radionuclides";

type AtlasState = { selectedKey: string; view: "map" | "table" };

const atlasLab = getLab("atlas");
const decayPresetNuclides = new Set([
  "I-131", "C-14", "Co-60", "U-238", "Th-234", "U-234", "Ra-226", "Rn-222", "Po-210",
  "Th-232", "Ra-228", "Ac-228", "Th-228", "Ra-224", "Rn-220", "U-235", "Th-231", "Pa-231",
  "Ac-227", "Th-227", "Ra-223", "Rn-219",
]);
const directlyMappedSources = new Set(["Cs-137", "Co-60", "I-131"]);

function recordKey(record: Pick<MapRadionuclideRecord, 0 | 1 | 2>): string {
  return `${record[0]}-${record[1]}-${record[2]}`;
}

function nuclideLabel(symbol: string, mass: number): string { return `${symbol}-${mass}`; }

function normalizeNuclideSearch(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_−–—-]+/g, "");
}

function decayLabel(code: MapRadionuclideRecord[9], language: Language): string {
  const labels: Record<MapRadionuclideRecord[9], [string, string]> = {
    alpha: ["α壊変", "α decay"],
    "beta-minus": ["β⁻壊変", "β⁻ decay"],
    "beta-plus-ec": ["β⁺壊変 / EC", "β⁺ decay / EC"],
    "electron-capture": ["電子捕獲", "electron capture"],
    "isomeric-transition": ["異性体遷移", "isomeric transition"],
  };
  return labels[code][language === "ja" ? 0 : 1];
}

function halfLifeLabel(value: number, unit: string, language: Language): string {
  const englishUnits: Record<string, string> = { 秒: "s", 分: "min", 時: "h", 日: "d", 年: "y" };
  const digits = value >= 1000
    ? value.toLocaleString(language === "ja" ? "ja-JP" : "en-US", { maximumFractionDigits: 2 })
    : value.toLocaleString(language === "ja" ? "ja-JP" : "en-US", { maximumSignificantDigits: 4 });
  return `${digits} ${language === "ja" ? unit : (englishUnits[unit] ?? unit)}`;
}

function sourceForNuclide(record: MapRadionuclideRecord): "cesium-137" | "cobalt-60" | "iodine-131" {
  const key = `${record[0]}-${record[1]}`.toLowerCase();
  if (key === "i-131") return "iodine-131";
  if (key === "co-60") return "cobalt-60";
  return "cesium-137";
}

function recordMatchesSearch(record: MapRadionuclideRecord, query: string): boolean {
  if (!query) return false;
  const parentNuclide = normalizeNuclideSearch(nuclideLabel(record[0], record[1]));
  const daughterNuclide = normalizeNuclideSearch(`${nuclideLabel(record[3], record[4])}${record[6] ? "m" : ""}`);
  if (parentNuclide === query || daughterNuclide === query) return true;
  if (/^[a-z]+\d+m?$/.test(query)) return parentNuclide.startsWith(query) || daughterNuclide.startsWith(query);
  if (/^\d+$/.test(query)) return `${record[1]}`.startsWith(query);
  const matchesDecay = [record[9], decayLabel(record[9], "ja"), decayLabel(record[9], "en")]
    .map(normalizeNuclideSearch)
    .some((term) => term.includes(query));
  return /^[a-z]+$/.test(query)
    ? record[0].toLowerCase().startsWith(query) || record[3].toLowerCase().startsWith(query) || matchesDecay
    : matchesDecay;
}

export default function NuclideAtlasPage() {
  const [language, setLanguage] = usePhenomenaLanguage();
  const routeNuclide = typeof window === "undefined" ? null : readExperimentQuery(window.location.search, "nuclide")?.toLowerCase() ?? null;
  const defaultRecord = MAP_RADIONUCLIDES.find((record) => record[0] === "Co" && record[1] === 60) ?? MAP_RADIONUCLIDES[0];
  const requestedRouteRecord = routeNuclide
    ? MAP_RADIONUCLIDES.find((item) => normalizeNuclideSearch(nuclideLabel(item[0], item[1])) === normalizeNuclideSearch(routeNuclide))
    : undefined;
  const firstKey = recordKey(defaultRecord);
  const [state, setState] = useState<AtlasState>({ selectedKey: firstKey, view: "map" });
  const [searchQuery, setSearchQuery] = useState("");
  const recordIndex = useMemo(() => new Map(MAP_RADIONUCLIDES.map((record) => [recordKey(record), record])), []);
  const restoreState = useCallback((next: AtlasState) => {
    if (!next || typeof next !== "object") return;
    setState({
      selectedKey: typeof next.selectedKey === "string" && recordIndex.has(next.selectedKey) ? next.selectedKey : firstKey,
      view: next.view === "table" ? "table" : "map",
    });
  }, [firstKey, recordIndex]);

  useEffect(() => {
    if (!requestedRouteRecord) return;
    const timer = window.setTimeout(() => {
      setState((current) => ({ ...current, selectedKey: recordKey(requestedRouteRecord) }));
      setSearchQuery(nuclideLabel(requestedRouteRecord[0], requestedRouteRecord[1]));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [requestedRouteRecord]);

  const selectRecord = useCallback((record: MapRadionuclideRecord) => {
    setState((current) => ({ ...current, selectedKey: recordKey(record) }));
    replaceExperimentQuery("nuclide", nuclideLabel(record[0], record[1]));
  }, []);

  const selected = recordIndex.get(state.selectedKey) ?? MAP_RADIONUCLIDES[0];
  const parents = MAP_RADIONUCLIDES.filter((record) => record[3] === selected[0] && record[4] === selected[1] && record[5] === selected[2]).slice(0, 4);
  const daughterKey = `${selected[3]}-${selected[4]}-${selected[5]}`;
  const daughter = MAP_RADIONUCLIDES.find((record) => `${record[0]}-${record[1]}-${record[2]}` === daughterKey);
  const source = sourceForNuclide(selected);
  const selectedCode = `${selected[0]}-${selected[1]}`;
  const hasDecayPreset = decayPresetNuclides.has(selectedCode);
  const hasMappedSource = directlyMappedSources.has(selectedCode);
  const mapPoints = useMemo(() => MAP_RADIONUCLIDES.map((record) => {
    const neutrons = record[1] - record[2];
    return { record, key: recordKey(record), x: 30 + neutrons * 4, y: 500 - record[2] * 4 };
  }), []);
  const featured = useMemo(() => {
    const preferred = new Set(["C-14", "I-131", "Cs-137", "Co-60", "Ra-226", "Rn-222", "U-238"]);
    return MAP_RADIONUCLIDES.filter((record) => preferred.has(`${record[0]}-${record[1]}`));
  }, []);
  const normalizedSearchQuery = normalizeNuclideSearch(searchQuery);
  const searchMatches = useMemo(() => normalizedSearchQuery
    ? MAP_RADIONUCLIDES.filter((record) => recordMatchesSearch(record, normalizedSearchQuery))
    : [], [normalizedSearchQuery]);
  const visibleCandidates = normalizedSearchQuery ? searchMatches.slice(0, 12) : featured;

  return (
    <LabLayout lab={atlasLab} language={language} onLanguageChange={setLanguage}>
      <section className="atlas-workbench" aria-labelledby="atlas-workbench-title">
        <div className="section-heading atlas-heading">
          <div><p className="eyebrow">MAP / SELECTION</p><h2 id="atlas-workbench-title">{translate(language, "核種地図", "Nuclide map")}</h2></div>
          <p>{translate(language, "検索して点を選び、親子関係をたどります。", "Search, select a point, and trace its family.")}</p>
        </div>
        <div className="atlas-grid">
          <aside className="atlas-controls" aria-label={translate(language, "地図の操作", "Map controls")}>
            <div className="atlas-search">
              <label htmlFor="atlas-nuclide-search">{translate(language, "核種を検索", "Find a nuclide")}</label>
              <form onSubmit={(event) => { event.preventDefault(); if (searchMatches[0]) selectRecord(searchMatches[0]); }}>
                <input id="atlas-nuclide-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => {
                  if (event.key === "Enter" && searchMatches[0]) { event.preventDefault(); selectRecord(searchMatches[0]); }
                }} placeholder="Co-60 / U-238" autoComplete="off" aria-describedby="atlas-search-status" />
                <button type="submit" disabled={!searchMatches.length}>{translate(language, "開く", "Open")}</button>
              </form>
              <p id="atlas-search-status" className="atlas-search-status" aria-live="polite">
                {normalizedSearchQuery
                  ? translate(language, `${searchMatches.length.toLocaleString()}件。Enterで開く`, `${searchMatches.length.toLocaleString()} match${searchMatches.length === 1 ? "" : "es"}. Press Enter to open.`)
                  : translate(language, "代表核種から選ぶ", "Choose a featured nuclide")}
              </p>
            </div>
            <div className="atlas-search-results" role="group" aria-label={translate(language, "検索結果", "Nuclide search results")}>
              {visibleCandidates.length ? visibleCandidates.map((record) => <button type="button" key={recordKey(record)} aria-pressed={recordKey(record) === state.selectedKey} onClick={() => selectRecord(record)}>
                <strong>{nuclideLabel(record[0], record[1])}</strong><span>{decayLabel(record[9], language)} → {nuclideLabel(record[3], record[4])}</span>
              </button>) : <p className="atlas-no-results">{translate(language, "一致する核種がありません。", "No matching nuclide.")}</p>}
            </div>
            {normalizedSearchQuery && searchMatches.length > visibleCandidates.length ? <p className="atlas-results-limit">{translate(language, `先頭${visibleCandidates.length}件`, `First ${visibleCandidates.length} shown`)}</p> : null}
            <div className="atlas-view-toggle" role="group" aria-label={translate(language, "Atlasの表示", "Atlas view")}>
              <button type="button" aria-pressed={state.view === "map"} onClick={() => setState((current) => ({ ...current, view: "map" }))}>{translate(language, "地図", "Map")}</button>
              <button type="button" aria-pressed={state.view === "table"} onClick={() => setState((current) => ({ ...current, view: "table" }))}>{translate(language, "代表核種", "Featured")}</button>
            </div>
            <LabStateTools lab={atlasLab} language={language} state={state} onRestore={restoreState} restoreOnMount={!requestedRouteRecord} />
            <p className="atlas-count">{MAP_RADIONUCLIDES.length.toLocaleString()} {translate(language, "件の主分岐レコード", "principal-branch records")}</p>
          </aside>

          {state.view === "map" ? (
            <figure className="atlas-map-figure">
              <div className="atlas-map-stage">
                <svg className="atlas-map" viewBox="0 0 760 530" role="img" aria-labelledby="atlas-map-title atlas-map-desc">
                  <title id="atlas-map-title">{translate(language, "核種地図", "Nuclide map")}</title>
                  <desc id="atlas-map-desc">{translate(language, "中性子数Nと陽子数Zで配置された核種。選択点は青で表示されます。キーボード操作では検索欄を使用します。", "Nuclides are positioned by neutron number N and proton number Z. The selected point is blue. Use the search controls for keyboard access.")}</desc>
                  <path d="M30 500H735M30 25V500" className="atlas-axis" />
                  <path d="M55 469 C160 448 254 396 336 312 S540 154 710 74" className="atlas-stability-band" />
                  <path d="M55 476 C164 455 262 403 344 322 S546 166 710 86" className="atlas-stability-line" />
                  <g className="atlas-grid-lines" aria-hidden="true"><path d="M130 25V500M230 25V500M330 25V500M430 25V500M530 25V500M630 25V500" /><path d="M30 400H735M30 300H735M30 200H735M30 100H735" /></g>
                  <text x="715" y="520">N →</text><text x="4" y="26">Z</text>
                </svg>
                <div className="atlas-map-points" aria-hidden="true">
                  {mapPoints.map((point) => <button
                    type="button"
                    key={point.key}
                    className={`atlas-point-button${point.key === state.selectedKey ? " is-selected" : ""}`}
                    style={{ left: `${(point.x / 760) * 100}%`, top: `${(point.y / 530) * 100}%` }}
                    title={nuclideLabel(point.record[0], point.record[1])}
                    tabIndex={-1}
                    onClick={() => selectRecord(point.record)}
                  />)}
                </div>
              </div>
              <figcaption><strong>{nuclideLabel(selected[0], selected[1])}</strong> · Z {selected[2]} / N {selected[1] - selected[2]} · {translate(language, "点を選択して追跡", "Select any point to trace")}</figcaption>
            </figure>
          ) : (
            <div className="atlas-featured-list" role="group" aria-label={translate(language, "代表核種", "Featured nuclides")}>
              {featured.map((record) => <button type="button" key={recordKey(record)} aria-pressed={recordKey(record) === state.selectedKey} onClick={() => selectRecord(record)}><strong>{nuclideLabel(record[0], record[1])}</strong><span>{decayLabel(record[9], language)} → {nuclideLabel(record[3], record[4])}</span></button>)}
            </div>
          )}
        </div>
      </section>

      <section className="atlas-inspector atlas-genealogy" aria-labelledby="atlas-inspector-title">
        <div className="section-heading"><div><p className="eyebrow">NUCLIDE / GENEALOGY</p><h2 id="atlas-inspector-title">{nuclideLabel(selected[0], selected[1])}</h2></div><p>{translate(language, "選択核種の壊変を追う", "Trace the selected decay.")}</p></div>
        <div className="atlas-inspector-grid atlas-trace">
          <article className="nuclide-card current"><span>{translate(language, "親核種", "PARENT")}</span><strong>{nuclideLabel(selected[0], selected[1])}</strong><p>Z {selected[2]} / N {selected[1] - selected[2]}</p><small>T½ {halfLifeLabel(selected[7], selected[8], language)}</small></article>
          <div className="nuclide-arrow"><span>{decayLabel(selected[9], language)}</span><b aria-hidden="true">→</b><small>{(selected[10] * 100).toFixed(selected[10] < 0.9995 ? 2 : 0)}%</small></div>
          {daughter ? <button className="nuclide-card daughter" type="button" onClick={() => selectRecord(daughter)}><span>{translate(language, "代表的な娘核種", "DAUGHTER")}</span><strong>{nuclideLabel(selected[3], selected[4])}{selected[6] ? "m" : ""}</strong><p>Z {selected[5]} / N {selected[4] - selected[5]}</p><small>{translate(language, "クリックして追跡", "Click to trace")}</small></button> : <article className="nuclide-card"><span>{translate(language, "代表的な娘核種", "DAUGHTER")}</span><strong>{nuclideLabel(selected[3], selected[4])}{selected[6] ? "m" : ""}</strong><p>Z {selected[5]} / N {selected[4] - selected[5]}</p><small>{translate(language, "この表では終端", "catalog endpoint")}</small></article>}
        </div>
        <div className="atlas-parents"><h3>{translate(language, "近傍の祖先", "Nearby ancestors")}</h3>{parents.length ? <ul>{parents.map((record) => <li key={recordKey(record)}><button type="button" onClick={() => selectRecord(record)}>{nuclideLabel(record[0], record[1])}</button><span>{decayLabel(record[9], language)} → {nuclideLabel(selected[0], selected[1])}</span></li>)}</ul> : <p>{translate(language, "この主分岐カタログには近傍の祖先がありません。", "No nearby parent is present in this principal-branch catalog.")}</p>}</div>
      </section>

      <section className="related-labs atlas-handoffs" aria-labelledby="related-labs-title">
        <div><p className="eyebrow">NEXT WINDOW</p><h2 id="related-labs-title">{translate(language, "次の観察", "Continue observing")}</h2></div>
        <div className="related-lab-links">
          <Link href={hasDecayPreset ? `/labs/decay?nuclide=${encodeURIComponent(selectedCode)}` : "/labs/decay"}>Decay Lab <span>{hasDecayPreset ? translate(language, "この核種で壊変を観察", "observe this nuclide") : translate(language, "壊変モデルを開く", "open the decay model")}</span></Link>
          <Link href={hasMappedSource ? `/labs/detector?source=${source}` : "/labs/detector"}>Detector Lab <span>{hasMappedSource ? translate(language, "応答を比較", "compare response") : translate(language, "検出器を比較", "compare detectors")}</span></Link>
          <Link href={hasMappedSource ? `/labs/pulse?source=${source}` : "/labs/pulse"}>Pulse Lab <span>{hasMappedSource ? translate(language, "波形を観察", "inspect the waveform") : translate(language, "パルスモデルを開く", "open the pulse model")}</span></Link>
          <Link href="/about#atlas">About <span>{translate(language, "モデルと制約を見る", "inspect model and limits")}</span></Link>
        </div>
      </section>
    </LabLayout>
  );
}
