"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { LabLayout, LabStateTools, usePhenomenaLanguage } from "../../components/PhenomenaShell";
import { readExperimentQuery, replaceExperimentQuery, translate } from "../../lib/experiment";
import { getLab, type Language } from "../../lib/labs";
import { MAP_RADIONUCLIDES, type MapRadionuclideRecord } from "../../radionuclides";

type DecayCode = MapRadionuclideRecord[9];
type AtlasViewport = { x: number; y: number; width: number; height: number };
type AtlasState = {
  selectedKey: string | null;
  view: "map" | "table";
  viewport?: AtlasViewport;
  enabledModes?: DecayCode[];
};
type MapPoint = { record: MapRadionuclideRecord; key: string; x: number; y: number };

const atlasLab = getLab("atlas");
const MAP_WIDTH = 760;
const MAP_HEIGHT = 530;
const MIN_VIEW_WIDTH = 190;
const DEFAULT_VIEWPORT: AtlasViewport = { x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT };
const ALL_DECAY_MODES: DecayCode[] = ["alpha", "beta-minus", "beta-plus-ec", "electron-capture", "isomeric-transition"];
const FEATURED_CODES = new Set(["C-14", "I-131", "Cs-137", "Co-60", "Ra-226", "Rn-222", "U-238"]);
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

function decayLabel(code: DecayCode, language: Language): string {
  const labels: Record<DecayCode, [string, string]> = {
    alpha: ["α壊変", "α decay"],
    "beta-minus": ["β⁻壊変", "β⁻ decay"],
    "beta-plus-ec": ["β⁺壊変 / EC", "β⁺ decay / EC"],
    "electron-capture": ["電子捕獲", "electron capture"],
    "isomeric-transition": ["異性体転移", "isomeric transition"],
  };
  return labels[code][language === "ja" ? 0 : 1];
}

function halfLifeLabel(value: number, unit: string, language: Language): string {
  const englishUnits: Record<string, string> = { 秒: "s", 分: "min", 時: "h", 時間: "h", 日: "d", 年: "y" };
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

function searchMatchRank(record: MapRadionuclideRecord, query: string): number {
  const parentNuclide = normalizeNuclideSearch(nuclideLabel(record[0], record[1]));
  const daughterNuclide = normalizeNuclideSearch(`${nuclideLabel(record[3], record[4])}${record[6] ? "m" : ""}`);
  if (parentNuclide === query) return 0;
  if (daughterNuclide === query) return 1;
  if (parentNuclide.startsWith(query)) return 2;
  if (daughterNuclide.startsWith(query)) return 3;
  return 4;
}

function clampViewport(candidate: AtlasViewport): AtlasViewport {
  const width = Math.max(MIN_VIEW_WIDTH, Math.min(MAP_WIDTH, candidate.width));
  const height = width * (MAP_HEIGHT / MAP_WIDTH);
  return {
    x: Math.max(0, Math.min(MAP_WIDTH - width, candidate.x)),
    y: Math.max(0, Math.min(MAP_HEIGHT - height, candidate.y)),
    width,
    height,
  };
}

function isViewport(value: unknown): value is AtlasViewport {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<AtlasViewport>;
  return [item.x, item.y, item.width, item.height].every((part) => typeof part === "number" && Number.isFinite(part));
}

function pointForRecord(record: MapRadionuclideRecord): MapPoint {
  const neutrons = record[1] - record[2];
  return { record, key: recordKey(record), x: 30 + neutrons * 4, y: 500 - record[2] * 4 };
}

function focusedViewport(point: MapPoint): AtlasViewport {
  const width = 250;
  const height = width * (MAP_HEIGHT / MAP_WIDTH);
  return clampViewport({ x: point.x - width / 2, y: point.y - height / 2, width, height });
}

function PointGlyph({ point, zoom, selected }: { point: MapPoint; zoom: number; selected: boolean }) {
  const size = 5.2 / zoom;
  const common = { className: "atlas-glyph-shape", vectorEffect: "non-scaling-stroke" as const };
  return (
    <g className={`atlas-map-node atlas-mode--${point.record[9]}${selected ? " is-selected" : ""}`} transform={`translate(${point.x} ${point.y})`}>
      {selected ? <circle className="atlas-selected-halo" r={9 / zoom} vectorEffect="non-scaling-stroke" /> : null}
      {point.record[9] === "alpha" ? <circle {...common} r={size / 2} /> : null}
      {point.record[9] === "beta-minus" ? <rect {...common} x={-size / 2} y={-size / 2} width={size} height={size} /> : null}
      {point.record[9] === "beta-plus-ec" ? <rect {...common} x={-size / 2} y={-size / 2} width={size} height={size} transform="rotate(45)" /> : null}
      {point.record[9] === "electron-capture" ? <path {...common} d={`M 0 ${-size * .62} L ${size * .58} ${size * .42} L ${-size * .58} ${size * .42} Z`} /> : null}
      {point.record[9] === "isomeric-transition" ? <path {...common} d={`M ${-size * .62} 0 H ${size * .62} M 0 ${-size * .62} V ${size * .62}`} /> : null}
    </g>
  );
}

export default function NuclideAtlasPage() {
  const [language, setLanguage] = usePhenomenaLanguage();
  const routeNuclide = typeof window === "undefined" ? null : readExperimentQuery(window.location.search, "nuclide")?.toLowerCase() ?? null;
  const requestedRouteRecord = routeNuclide
    ? MAP_RADIONUCLIDES.find((item) => normalizeNuclideSearch(nuclideLabel(item[0], item[1])) === normalizeNuclideSearch(routeNuclide))
    : undefined;
  const mapPoints = useMemo(() => MAP_RADIONUCLIDES.map(pointForRecord), []);
  const pointIndex = useMemo(() => new Map(mapPoints.map((point) => [point.key, point])), [mapPoints]);
  const recordIndex = useMemo(() => new Map(MAP_RADIONUCLIDES.map((record) => [recordKey(record), record])), []);
  const [state, setState] = useState<AtlasState>({ selectedKey: null, view: "map", viewport: DEFAULT_VIEWPORT, enabledModes: ALL_DECAY_MODES });
  const [searchQuery, setSearchQuery] = useState("");
  const [candidatePoints, setCandidatePoints] = useState<MapPoint[]>([]);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [hasPreviousViewport, setHasPreviousViewport] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const candidateDialogRef = useRef<HTMLDivElement | null>(null);
  const previousViewportRef = useRef<AtlasViewport | null>(null);
  const pointerPositionsRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<{ viewport: AtlasViewport; points: Map<number, { x: number; y: number }> } | null>(null);
  const movedRef = useRef(false);

  const viewport = clampViewport(state.viewport ?? DEFAULT_VIEWPORT);
  const zoom = MAP_WIDTH / viewport.width;
  const enabledModes = state.enabledModes?.filter((mode): mode is DecayCode => ALL_DECAY_MODES.includes(mode)) ?? ALL_DECAY_MODES;
  const selected = state.selectedKey ? recordIndex.get(state.selectedKey) : undefined;
  const selectedPoint = state.selectedKey ? pointIndex.get(state.selectedKey) : undefined;

  const updateViewport = useCallback((next: AtlasViewport, remember = true) => {
    if (remember) setHasPreviousViewport(true);
    setState((current) => {
      const currentViewport = clampViewport(current.viewport ?? DEFAULT_VIEWPORT);
      if (remember) previousViewportRef.current = currentViewport;
      return { ...current, viewport: clampViewport(next) };
    });
  }, []);

  const centerRecord = useCallback((record: MapRadionuclideRecord, updateUrl = true) => {
    const point = pointForRecord(record);
    setHasPreviousViewport(true);
    setState((current) => {
      previousViewportRef.current = clampViewport(current.viewport ?? DEFAULT_VIEWPORT);
      const modes = current.enabledModes ?? ALL_DECAY_MODES;
      return {
        ...current,
        selectedKey: point.key,
        view: "map",
        viewport: focusedViewport(point),
        enabledModes: modes.includes(record[9]) ? modes : [...modes, record[9]],
      };
    });
    setSearchQuery(nuclideLabel(record[0], record[1]));
    setCandidatePoints([]);
    if (updateUrl) replaceExperimentQuery("nuclide", nuclideLabel(record[0], record[1]));
  }, []);

  const restoreState = useCallback((next: AtlasState) => {
    if (!next || typeof next !== "object") return;
    const selectedKey = typeof next.selectedKey === "string" && recordIndex.has(next.selectedKey) ? next.selectedKey : null;
    const restoredModes = Array.isArray(next.enabledModes)
      ? next.enabledModes.filter((mode): mode is DecayCode => ALL_DECAY_MODES.includes(mode))
      : ALL_DECAY_MODES;
    const restoredRecord = selectedKey ? recordIndex.get(selectedKey) : undefined;
    setState({
      selectedKey,
      view: next.view === "table" ? "table" : "map",
      viewport: isViewport(next.viewport) ? clampViewport(next.viewport) : DEFAULT_VIEWPORT,
      enabledModes: restoredModes,
    });
    setSearchQuery(restoredRecord ? nuclideLabel(restoredRecord[0], restoredRecord[1]) : "");
    previousViewportRef.current = null;
    setHasPreviousViewport(false);
  }, [recordIndex]);

  useEffect(() => {
    if (!requestedRouteRecord || state.selectedKey === recordKey(requestedRouteRecord)) return;
    const timer = window.setTimeout(() => centerRecord(requestedRouteRecord, false), 0);
    return () => window.clearTimeout(timer);
  }, [centerRecord, requestedRouteRecord, state.selectedKey]);

  useEffect(() => {
    if (candidatePoints.length) candidateDialogRef.current?.focus();
  }, [candidatePoints.length]);

  const filteredPoints = useMemo(() => mapPoints.filter((point) => enabledModes.includes(point.record[9])), [enabledModes, mapPoints]);
  const densityCells = useMemo(() => {
    const cells = new Map<string, { x: number; y: number; count: number }>();
    for (const point of filteredPoints) {
      const x = Math.floor(point.x / 18) * 18;
      const y = Math.floor(point.y / 18) * 18;
      const key = `${x}-${y}`;
      const current = cells.get(key);
      cells.set(key, current ? { ...current, count: current.count + 1 } : { x, y, count: 1 });
    }
    const values = [...cells.values()];
    const maximum = Math.max(1, ...values.map((cell) => cell.count));
    return values.map((cell) => ({ ...cell, intensity: cell.count / maximum }));
  }, [filteredPoints]);
  const featured = useMemo(() => MAP_RADIONUCLIDES.filter((record) => FEATURED_CODES.has(`${record[0]}-${record[1]}`)), []);
  const normalizedSearchQuery = normalizeNuclideSearch(searchQuery);
  const searchMatches = useMemo(() => normalizedSearchQuery
    ? MAP_RADIONUCLIDES
      .filter((record) => recordMatchesSearch(record, normalizedSearchQuery))
      .sort((a, b) => searchMatchRank(a, normalizedSearchQuery) - searchMatchRank(b, normalizedSearchQuery))
    : [], [normalizedSearchQuery]);
  const visibleCandidates = normalizedSearchQuery ? searchMatches.slice(0, 12) : featured;

  const labelPoints = useMemo(() => {
    if (zoom < 1.7) return mapPoints.filter((point) => FEATURED_CODES.has(`${point.record[0]}-${point.record[1]}`));
    if (zoom < 2.7) return mapPoints.filter((point) => FEATURED_CODES.has(`${point.record[0]}-${point.record[1]}`) || point.key === state.selectedKey);
    return filteredPoints.filter((point) => point.x >= viewport.x && point.x <= viewport.x + viewport.width && point.y >= viewport.y && point.y <= viewport.y + viewport.height);
  }, [filteredPoints, mapPoints, state.selectedKey, viewport.height, viewport.width, viewport.x, viewport.y, zoom]);

  const zoomMap = useCallback((factor: number, focusX = .5, focusY = .5) => {
    const current = clampViewport(state.viewport ?? DEFAULT_VIEWPORT);
    const nextWidth = current.width * factor;
    const nextHeight = nextWidth * (MAP_HEIGHT / MAP_WIDTH);
    const worldX = current.x + current.width * focusX;
    const worldY = current.y + current.height * focusY;
    updateViewport({ x: worldX - nextWidth * focusX, y: worldY - nextHeight * focusY, width: nextWidth, height: nextHeight });
  }, [state.viewport, updateViewport]);

  const resetMap = useCallback(() => updateViewport(DEFAULT_VIEWPORT), [updateViewport]);
  const restorePreviousView = useCallback(() => {
    const previous = previousViewportRef.current;
    if (!previous) return;
    const current = viewport;
    previousViewportRef.current = current;
    updateViewport(previous, false);
  }, [updateViewport, viewport]);

  const worldFromClient = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: viewport.x + ((clientX - rect.left) / rect.width) * viewport.width,
      y: viewport.y + ((clientY - rect.top) / rect.height) * viewport.height,
      radius: 25 * (viewport.width / rect.width),
      focusX: (clientX - rect.left) / rect.width,
      focusY: (clientY - rect.top) / rect.height,
    };
  }, [viewport]);

  const nearestPoints = useCallback((clientX: number, clientY: number, limit = 12) => {
    const world = worldFromClient(clientX, clientY);
    if (!world) return [];
    return filteredPoints
      .map((point) => ({ point, distance: Math.hypot(point.x - world.x, point.y - world.y) }))
      .filter((item) => item.distance <= world.radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map((item) => item.point);
  }, [filteredPoints, worldFromClient]);

  const handleMapClick = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (movedRef.current) { movedRef.current = false; return; }
    const candidates = nearestPoints(event.clientX, event.clientY);
    if (candidates.length === 1) centerRecord(candidates[0].record);
    else if (candidates.length > 1) setCandidatePoints(candidates);
    else {
      const world = worldFromClient(event.clientX, event.clientY);
      if (world && zoom < 2.5) zoomMap(.58, world.focusX, world.focusY);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerPositionsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gestureRef.current = { viewport, points: new Map(pointerPositionsRef.current) };
    previousViewportRef.current = viewport;
    setHasPreviousViewport(true);
    movedRef.current = false;
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pointers = pointerPositionsRef.current;
    if (!pointers.has(event.pointerId)) {
      const nearest = nearestPoints(event.clientX, event.clientY, 1)[0]?.key ?? null;
      setHoveredKey((current) => current === nearest ? current : nearest);
      return;
    }
    const previousPointer = pointers.get(event.pointerId)!;
    if (Math.hypot(event.clientX - previousPointer.x, event.clientY - previousPointer.y) > 2) movedRef.current = true;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const gesture = gestureRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!gesture || !rect.width) return;
    const startPoints = [...gesture.points.values()];
    const currentPoints = [...pointers.values()];
    if (startPoints.length >= 2 && currentPoints.length >= 2) {
      const startDistance = Math.hypot(startPoints[1].x - startPoints[0].x, startPoints[1].y - startPoints[0].y);
      const currentDistance = Math.max(1, Math.hypot(currentPoints[1].x - currentPoints[0].x, currentPoints[1].y - currentPoints[0].y));
      const midpointX = (currentPoints[0].x + currentPoints[1].x) / 2;
      const midpointY = (currentPoints[0].y + currentPoints[1].y) / 2;
      const width = gesture.viewport.width * (startDistance / currentDistance);
      const height = width * (MAP_HEIGHT / MAP_WIDTH);
      const focusX = (midpointX - rect.left) / rect.width;
      const focusY = (midpointY - rect.top) / rect.height;
      updateViewport({ x: gesture.viewport.x + gesture.viewport.width * focusX - width * focusX, y: gesture.viewport.y + gesture.viewport.height * focusY - height * focusY, width, height }, false);
    } else if (startPoints[0] && currentPoints[0]) {
      updateViewport({ ...gesture.viewport, x: gesture.viewport.x - ((currentPoints[0].x - startPoints[0].x) / rect.width) * gesture.viewport.width, y: gesture.viewport.y - ((currentPoints[0].y - startPoints[0].y) / rect.height) * gesture.viewport.height }, false);
    }
  };

  const finishPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointerPositionsRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!pointerPositionsRef.current.size) gestureRef.current = null;
    else gestureRef.current = { viewport: clampViewport(state.viewport ?? DEFAULT_VIEWPORT), points: new Map(pointerPositionsRef.current) };
  };

  const handleMapWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    zoomMap(event.deltaY > 0 ? 1.16 : 1 / 1.16, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
  };

  const handleMapKeyDown = (event: ReactKeyboardEvent<SVGSVGElement>) => {
    const stepX = viewport.width * .09;
    const stepY = viewport.height * .09;
    if (event.key === "+" || event.key === "=") zoomMap(1 / 1.3);
    else if (event.key === "-") zoomMap(1.3);
    else if (event.key === "0") resetMap();
    else if (event.key === "ArrowLeft") updateViewport({ ...viewport, x: viewport.x - stepX });
    else if (event.key === "ArrowRight") updateViewport({ ...viewport, x: viewport.x + stepX });
    else if (event.key === "ArrowUp") updateViewport({ ...viewport, y: viewport.y - stepY });
    else if (event.key === "ArrowDown") updateViewport({ ...viewport, y: viewport.y + stepY });
    else return;
    event.preventDefault();
  };

  const toggleMode = (mode: DecayCode) => {
    setState((current) => {
      const modes = current.enabledModes ?? ALL_DECAY_MODES;
      return { ...current, enabledModes: modes.includes(mode) ? modes.filter((item) => item !== mode) : [...modes, mode] };
    });
    setCandidatePoints([]);
  };

  const parents = selected ? MAP_RADIONUCLIDES.filter((record) => record[3] === selected[0] && record[4] === selected[1] && record[5] === selected[2]).slice(0, 4) : [];
  const daughterKey = selected ? `${selected[3]}-${selected[4]}-${selected[5]}` : "";
  const daughter = selected ? MAP_RADIONUCLIDES.find((record) => recordKey(record) === daughterKey) : undefined;
  const selectedCode = selected ? `${selected[0]}-${selected[1]}` : null;
  const source = selected ? sourceForNuclide(selected) : null;
  const hasDecayPreset = Boolean(selectedCode && decayPresetNuclides.has(selectedCode));
  const hasMappedSource = Boolean(selectedCode && directlyMappedSources.has(selectedCode));
  const hoveredPoint = hoveredKey ? pointIndex.get(hoveredKey) : undefined;

  return (
    <LabLayout lab={atlasLab} language={language} onLanguageChange={setLanguage}>
      <section className="atlas-workbench" aria-labelledby="atlas-workbench-title">
        <div className="section-heading atlas-heading">
          <div><p className="eyebrow">OVERVIEW / LOCATE / TRACE</p><h2 id="atlas-workbench-title">{translate(language, "核種地図", "Nuclide map")}</h2></div>
          <p>{translate(language, "全体像から入り、拡大して核種を選びます。", "Start with the whole field, then zoom to a nuclide.")}</p>
        </div>
        <div className="atlas-grid atlas-explorer-grid">
          {state.view === "map" ? (
            <figure className="atlas-map-figure atlas-explorer">
              <div className="atlas-map-toolbar">
                <div className="atlas-zoom-controls" role="group" aria-label={translate(language, "地図の拡大操作", "Map zoom controls")}>
                  <button type="button" onClick={() => zoomMap(1 / 1.35)} aria-label={translate(language, "拡大", "Zoom in")}>＋</button>
                  <output aria-live="polite">{Math.round(zoom * 100)}%</output>
                  <button type="button" onClick={() => zoomMap(1.35)} aria-label={translate(language, "縮小", "Zoom out")}>−</button>
                  <button type="button" onClick={restorePreviousView} disabled={!hasPreviousViewport} aria-label={translate(language, "直前の表示", "Previous view")}>↶</button>
                  <button type="button" onClick={resetMap}>{translate(language, "全体", "Overview")}</button>
                </div>
                <span className="atlas-map-level">{zoom < 1.7 ? translate(language, "密度表示", "Density") : translate(language, "核種表示", "Nuclides")}</span>
              </div>
              <div className="atlas-mode-legend" role="group" aria-label={translate(language, "表示する壊変形式", "Visible decay modes")}>
                {ALL_DECAY_MODES.map((mode) => <button type="button" key={mode} className={`atlas-mode-filter atlas-mode--${mode}`} aria-pressed={enabledModes.includes(mode)} onClick={() => toggleMode(mode)}><i aria-hidden="true" />{decayLabel(mode, language)}</button>)}
              </div>
              <div className="atlas-map-stage">
                <svg
                  ref={svgRef}
                  className="atlas-map"
                  viewBox={`${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`}
                  role="group"
                  tabIndex={0}
                  aria-labelledby="atlas-map-title atlas-map-desc"
                  onWheel={handleMapWheel}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={finishPointer}
                  onPointerCancel={finishPointer}
                  onPointerLeave={() => setHoveredKey(null)}
                  onClick={handleMapClick}
                  onKeyDown={handleMapKeyDown}
                >
                  <title id="atlas-map-title">{translate(language, "ズーム可能な核種地図", "Zoomable nuclide map")}</title>
                  <desc id="atlas-map-desc">{translate(language, "横軸は中性子数N、縦軸は陽子数Zです。ドラッグで移動、ホイールまたはボタンで拡大できます。核種の選択は地図または検索結果から行えます。", "Neutron number N is horizontal and proton number Z is vertical. Drag to pan and use the wheel or buttons to zoom. Select a nuclide from the map or search results.")}</desc>
                  <rect className="atlas-map-background" x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} />
                  <g className="atlas-grid-lines" aria-hidden="true">
                    {[0, 20, 40, 60, 80, 100, 120, 140, 160].map((value) => <g key={`n-${value}`}><line x1={30 + value * 4} x2={30 + value * 4} y1="25" y2="500" /><text x={30 + value * 4} y="518" textAnchor="middle" style={{ fontSize: `${9 / zoom}px` }}>{value}</text></g>)}
                    {[0, 20, 40, 60, 80, 100].map((value) => <g key={`z-${value}`}><line x1="30" x2="735" y1={500 - value * 4} y2={500 - value * 4} /><text x="22" y={503 - value * 4} textAnchor="end" style={{ fontSize: `${9 / zoom}px` }}>{value}</text></g>)}
                  </g>
                  <path d="M30 500H735M30 25V500" className="atlas-axis" />
                  <path d="M55 469 C160 448 254 396 336 312 S540 154 710 74" className="atlas-stability-band" />
                  <path d="M55 476 C164 455 262 403 344 322 S546 166 710 86" className="atlas-stability-line" />
                  {zoom < 1.9 ? <g className="atlas-density-layer" aria-hidden="true">{densityCells.map((cell) => <rect key={`${cell.x}-${cell.y}`} x={cell.x} y={cell.y} width="17" height="17" style={{ opacity: .1 + cell.intensity * .62 }} />)}</g> : null}
                  {zoom >= 1.45 ? <g className="atlas-points-layer" aria-hidden="true">{filteredPoints.map((point) => <PointGlyph key={point.key} point={point} zoom={zoom} selected={point.key === state.selectedKey} />)}</g> : null}
                  {selectedPoint && zoom < 1.45 ? <g className="atlas-overview-selection" aria-hidden="true"><circle cx={selectedPoint.x} cy={selectedPoint.y} r={7 / zoom} /><line x1={selectedPoint.x - 13 / zoom} x2={selectedPoint.x + 13 / zoom} y1={selectedPoint.y} y2={selectedPoint.y} /><line x1={selectedPoint.x} x2={selectedPoint.x} y1={selectedPoint.y - 13 / zoom} y2={selectedPoint.y + 13 / zoom} /></g> : null}
                  <g className="atlas-progressive-labels" aria-hidden="true">{labelPoints.map((point) => <text key={point.key} x={point.x + 6 / zoom} y={point.y - 5 / zoom} style={{ fontSize: `${9 / zoom}px` }}>{zoom >= 2.7 ? nuclideLabel(point.record[0], point.record[1]) : point.record[0]}</text>)}</g>
                  <text className="atlas-axis-title" x={720} y={518} style={{ fontSize: `${10 / zoom}px` }}>N →</text>
                  <text className="atlas-axis-title" x={8} y={30} style={{ fontSize: `${10 / zoom}px` }}>Z</text>
                </svg>
                {hoveredPoint && !candidatePoints.length ? <div className="atlas-map-tooltip" role="status"><strong>{nuclideLabel(hoveredPoint.record[0], hoveredPoint.record[1])}</strong><span>{decayLabel(hoveredPoint.record[9], language)}</span></div> : null}
                {candidatePoints.length ? <div ref={candidateDialogRef} className="atlas-map-candidates" role="dialog" tabIndex={-1} aria-label={translate(language, "近くの核種", "Nearby nuclides")} onKeyDown={(event) => { if (event.key === "Escape") { setCandidatePoints([]); svgRef.current?.focus(); } }}>
                  <div><strong>{translate(language, "近くの核種", "Nearby nuclides")}</strong><button type="button" onClick={() => { setCandidatePoints([]); svgRef.current?.focus(); }} aria-label={translate(language, "閉じる", "Close")}>×</button></div>
                  <ul>{candidatePoints.map((point) => <li key={point.key}><button type="button" onClick={() => centerRecord(point.record)}><strong>{nuclideLabel(point.record[0], point.record[1])}</strong><span>{decayLabel(point.record[9], language)}</span></button></li>)}</ul>
                </div> : null}
              </div>
              <figcaption>
                {selected ? <><strong>{nuclideLabel(selected[0], selected[1])}</strong> · Z {selected[2]} / N {selected[1] - selected[2]}</> : <><strong>{translate(language, "全体表示", "Overview")}</strong> · {filteredPoints.length.toLocaleString()} / {MAP_RADIONUCLIDES.length.toLocaleString()} {translate(language, "核種", "nuclides")}</>}
                <span>{translate(language, "ドラッグで移動 · ホイールで拡大 · 矢印キーでも移動", "Drag to pan · Wheel to zoom · Arrow keys to pan")}</span>
              </figcaption>
            </figure>
          ) : (
            <div className="atlas-featured-list" role="group" aria-label={translate(language, "代表核種", "Featured nuclides")}>{featured.map((record) => <button type="button" key={recordKey(record)} aria-pressed={recordKey(record) === state.selectedKey} onClick={() => centerRecord(record)}><strong>{nuclideLabel(record[0], record[1])}</strong><span>{decayLabel(record[9], language)} → {nuclideLabel(record[3], record[4])}</span></button>)}</div>
          )}

          <aside className={`atlas-controls${mobileControlsOpen ? " is-open" : ""}`} aria-label={translate(language, "地図の操作", "Map controls")}>
            <button className="atlas-mobile-controls-toggle" type="button" aria-expanded={mobileControlsOpen} onClick={() => setMobileControlsOpen((open) => !open)}><span>{selected ? nuclideLabel(selected[0], selected[1]) : translate(language, "核種を探す", "Find a nuclide")}</span><b>{mobileControlsOpen ? "−" : "+"}</b></button>
            <div className="atlas-controls-body">
              <div className="atlas-search">
                <label htmlFor="atlas-nuclide-search">{translate(language, "核種を検索", "Find a nuclide")}</label>
                <form onSubmit={(event) => { event.preventDefault(); if (searchMatches[0]) centerRecord(searchMatches[0]); }}>
                  <input id="atlas-nuclide-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Co-60 / U-238" autoComplete="off" aria-describedby="atlas-search-status" />
                  <button type="submit" disabled={!searchMatches.length}>{translate(language, "開く", "Open")}</button>
                </form>
                <p id="atlas-search-status" className="atlas-search-status" aria-live="polite">{normalizedSearchQuery ? translate(language, `${searchMatches.length.toLocaleString()}件。Enterで開く`, `${searchMatches.length.toLocaleString()} match${searchMatches.length === 1 ? "" : "es"}. Press Enter to open.`) : translate(language, "代表核種から選ぶ", "Choose a featured nuclide")}</p>
              </div>
              <div className="atlas-search-results" role="group" aria-label={translate(language, "検索結果", "Nuclide search results")}>{visibleCandidates.length ? visibleCandidates.map((record) => <button type="button" key={recordKey(record)} aria-pressed={recordKey(record) === state.selectedKey} onClick={() => centerRecord(record)}><strong>{nuclideLabel(record[0], record[1])}</strong><span>{decayLabel(record[9], language)} → {nuclideLabel(record[3], record[4])}</span></button>) : <p className="atlas-no-results">{translate(language, "一致する核種がありません。", "No matching nuclide.")}</p>}</div>
              {normalizedSearchQuery && searchMatches.length > visibleCandidates.length ? <p className="atlas-results-limit">{translate(language, `先頭${visibleCandidates.length}件`, `First ${visibleCandidates.length} shown`)}</p> : null}
              <div className="atlas-view-toggle" role="group" aria-label={translate(language, "Atlasの表示", "Atlas view")}>
                <button type="button" aria-pressed={state.view === "map"} onClick={() => setState((current) => ({ ...current, view: "map" }))}>{translate(language, "地図", "Map")}</button>
                <button type="button" aria-pressed={state.view === "table"} onClick={() => setState((current) => ({ ...current, view: "table" }))}>{translate(language, "代表核種", "Featured")}</button>
              </div>
              <LabStateTools lab={atlasLab} language={language} state={state} onRestore={restoreState} restoreOnMount={!requestedRouteRecord} />
              <p className="atlas-count">{MAP_RADIONUCLIDES.length.toLocaleString()} {translate(language, "件の主分岐レコード", "principal-branch records")}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="atlas-inspector atlas-genealogy" aria-labelledby="atlas-inspector-title">
        <div className="section-heading"><div><p className="eyebrow">NUCLIDE / GENEALOGY</p><h2 id="atlas-inspector-title">{selected ? nuclideLabel(selected[0], selected[1]) : translate(language, "核種を選択", "Select a nuclide")}</h2></div><p>{selected ? translate(language, "選択核種の壊変を追う", "Trace the selected decay.") : translate(language, "検索または地図から観察を始めます。", "Begin from search or the map.")}</p></div>
        {selected ? <>
          <div className="atlas-inspector-grid atlas-trace">
            <article className="nuclide-card current"><span>{translate(language, "親核種", "PARENT")}</span><strong>{nuclideLabel(selected[0], selected[1])}</strong><p>Z {selected[2]} / N {selected[1] - selected[2]}</p><small>T½ {halfLifeLabel(selected[7], selected[8], language)}</small></article>
            <div className="nuclide-arrow"><span>{decayLabel(selected[9], language)}</span><b aria-hidden="true">→</b><small>{(selected[10] * 100).toFixed(selected[10] < .9995 ? 2 : 0)}%</small></div>
            {daughter ? <button className="nuclide-card daughter" type="button" onClick={() => centerRecord(daughter)}><span>{translate(language, "代表的な娘核種", "DAUGHTER")}</span><strong>{nuclideLabel(selected[3], selected[4])}{selected[6] ? "m" : ""}</strong><p>Z {selected[5]} / N {selected[4] - selected[5]}</p><small>{translate(language, "クリックして追跡", "Click to trace")}</small></button> : <article className="nuclide-card"><span>{translate(language, "代表的な娘核種", "DAUGHTER")}</span><strong>{nuclideLabel(selected[3], selected[4])}{selected[6] ? "m" : ""}</strong><p>Z {selected[5]} / N {selected[4] - selected[5]}</p><small>{translate(language, "この表では終端", "catalog endpoint")}</small></article>}
          </div>
          <div className="atlas-parents"><h3>{translate(language, "近傍の祖先", "Nearby ancestors")}</h3>{parents.length ? <ul>{parents.map((record) => <li key={recordKey(record)}><button type="button" onClick={() => centerRecord(record)}>{nuclideLabel(record[0], record[1])}</button><span>{decayLabel(record[9], language)} → {nuclideLabel(selected[0], selected[1])}</span></li>)}</ul> : <p>{translate(language, "この主分岐カタログには近傍の祖先がありません。", "No nearby parent is present in this principal-branch catalog.")}</p>}</div>
        </> : <div className="atlas-empty-selection"><span aria-hidden="true">⌖</span><p>{translate(language, "代表核種を選ぶか、地図を拡大して核種を探してください。", "Choose a featured nuclide or zoom the map to explore.")}</p></div>}
      </section>

      <section className="related-labs atlas-handoffs" aria-labelledby="related-labs-title">
        <div><p className="eyebrow">NEXT WINDOW</p><h2 id="related-labs-title">{translate(language, "次の観察", "Continue observing")}</h2></div>
        <div className="related-lab-links">
          <Link href={hasDecayPreset && selectedCode ? `/labs/decay?nuclide=${encodeURIComponent(selectedCode)}` : "/labs/decay"}>Decay Lab <span>{hasDecayPreset ? translate(language, "この核種で壊変を観察", "observe this nuclide") : translate(language, "壊変モデルを開く", "open the decay model")}</span></Link>
          <Link href={hasMappedSource && source ? `/labs/detector?source=${source}` : "/labs/detector"}>Detector Lab <span>{hasMappedSource ? translate(language, "応答を比較", "compare response") : translate(language, "検出器を比較", "compare detectors")}</span></Link>
          <Link href={hasMappedSource && source ? `/labs/pulse?source=${source}` : "/labs/pulse"}>Pulse Lab <span>{hasMappedSource ? translate(language, "波形を観察", "inspect the waveform") : translate(language, "パルスモデルを開く", "open the pulse model")}</span></Link>
          <Link href="/about#atlas">About <span>{translate(language, "モデルと制約を見る", "inspect model and limits")}</span></Link>
        </div>
      </section>
    </LabLayout>
  );
}
