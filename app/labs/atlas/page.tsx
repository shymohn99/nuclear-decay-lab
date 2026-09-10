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
import {
  ENSDF_ATLAS_INDEX,
  canonicalizeAtlasNuclideKey,
  nuclideIdFromStateId,
  type EnsdfAtlasBranch,
  type EnsdfAtlasNuclide,
  type EnsdfAtlasShard,
  type EnsdfAtlasState,
  type EnsdfDisplayMode,
} from "../../lib/ensdf-atlas";
import { buildAtlasTrace, flattenAtlasTrace, type AtlasTraceNode } from "../../lib/ensdf-atlas-tree";
import { readExperimentQuery, replaceExperimentQuery, translate } from "../../lib/experiment";
import { getLab, type Language } from "../../lib/labs";
import { siteBasePath } from "../../lib/site";

type AtlasViewport = { x: number; y: number; width: number; height: number };
type SavedAtlasState = {
  selectedKey: string | null;
  selectedStateId?: string | null;
  view: "map" | "featured";
  viewport?: AtlasViewport;
  enabledModes?: EnsdfDisplayMode[];
  traceDepth?: 3 | 6 | 10;
  traceView?: "tree" | "table";
};
type MapPoint = { nuclide: EnsdfAtlasNuclide; x: number; y: number };

const atlasLab = getLab("atlas");
const MAP_WIDTH = 760;
const MAP_HEIGHT = 530;
const MIN_VIEW_WIDTH = 190;
const DEFAULT_VIEWPORT: AtlasViewport = { x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT };
const ALL_MODES: EnsdfDisplayMode[] = [
  "stable", "alpha", "beta-minus", "beta-plus-ec", "electron-capture", "isomeric-transition", "other",
];
const TRACE_DEPTHS = [3, 6, 10] as const;
const FEATURED_CODES = new Set(["H-1", "C-14", "Co-60", "Tc-99", "I-131", "Cs-137", "Rn-222", "U-238"]);
const decayPresetNuclides = new Set([
  "I-131", "C-14", "Co-60", "U-238", "Th-234", "U-234", "Ra-226", "Rn-222", "Po-210",
  "Th-232", "Ra-228", "Ac-228", "Th-228", "Ra-224", "Rn-220", "U-235", "Th-231", "Pa-231",
  "Ac-227", "Th-227", "Ra-223", "Rn-219",
]);
const directlyMappedSources = new Set(["Cs-137", "Co-60", "I-131"]);

function nuclideLabel(nuclide: Pick<EnsdfAtlasNuclide, "symbol" | "a">): string {
  return `${nuclide.symbol}-${nuclide.a}`;
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_−–—-]+/g, "");
}

function requestedStateLabel(query: string): string {
  const match = normalizeSearch(query).match(/m(\d*)$/);
  if (!match) return "g";
  return `m${match[1] || "1"}`;
}

function modeLabel(mode: EnsdfDisplayMode, language: Language): string {
  const labels: Record<EnsdfDisplayMode, [string, string]> = {
    stable: ["安定核", "stable"],
    alpha: ["α壊変", "α decay"],
    "beta-minus": ["β⁻壊変", "β⁻ decay"],
    "beta-plus-ec": ["β⁺ / EC", "β⁺ / EC"],
    "electron-capture": ["電子捕獲", "electron capture"],
    "isomeric-transition": ["異性体転移", "isomeric transition"],
    other: ["その他", "other"],
  };
  return labels[mode][language === "ja" ? 0 : 1];
}

function halfLifeLabel(state: EnsdfAtlasState, language: Language): string {
  if (state.stability === "stable") return translate(language, "安定", "stable");
  if (!state.halfLife) return translate(language, "未収録", "not reported");
  const value = state.halfLife.value.toLocaleString(language === "ja" ? "ja-JP" : "en-US", { maximumSignificantDigits: 5 });
  return `${value} ${state.halfLife.unit}`;
}

function stateLabel(state: EnsdfAtlasState): string {
  return state.metastable ? state.label : "g";
}

function stateEnergy(state: EnsdfAtlasState, language: Language): string {
  if (!state.metastable) return translate(language, "基底状態", "ground state");
  return state.excitationEnergyKeV === null ? translate(language, "励起準位", "excited level") : `${state.excitationEnergyKeV.toLocaleString()} keV`;
}

function branchFraction(branch: EnsdfAtlasBranch, language: Language): string {
  if (branch.branchingFractionReported === null) return translate(language, "比率未収録", "ratio not reported");
  const percent = branch.branchingFractionReported * 100;
  return `${percent.toLocaleString(language === "ja" ? "ja-JP" : "en-US", { maximumFractionDigits: 6 })}%`;
}

function fractionsLabel(values: readonly number[], language: Language): string {
  if (!values.length) return translate(language, "比率未収録", "ratio not reported");
  return values.map((value) => `${(value * 100).toLocaleString(language === "ja" ? "ja-JP" : "en-US", { maximumFractionDigits: 6 })}%`).join(" / ");
}

function traceStateLabel(stateId: string, nuclides: ReadonlyMap<string, EnsdfAtlasNuclide>): string {
  const nuclide = nuclides.get(nuclideIdFromStateId(stateId));
  if (!nuclide) return stateId;
  const state = stateId.split(":")[1] ?? "g";
  return `${nuclideLabel(nuclide)}${state === "g" ? "" : state}`;
}

function TraceTree({ node, language, nuclides, onNavigate }: Readonly<{
  node: AtlasTraceNode;
  language: Language;
  nuclides: ReadonlyMap<string, EnsdfAtlasNuclide>;
  onNavigate: (stateId: string) => void;
}>) {
  if (!node.edges.length) return null;
  return (
    <ol className="atlas-trace-tree">
      {node.edges.map((edge) => (
        <li key={edge.id}>
          <div className="atlas-trace-edge">
            <span className={`atlas-branch-mode atlas-mode--${edge.displayMode}`}>{modeLabel(edge.displayMode, language)}</span>
            <span aria-hidden="true">→</span>
            <button type="button" onClick={() => onNavigate(edge.daughterStateId)}>{traceStateLabel(edge.daughterStateId, nuclides)}</button>
            <small>{fractionsLabel(edge.reportedFractions, language)}{edge.recordCount > 1 ? ` · ${edge.recordCount} rec.` : ""}</small>
            {edge.stop ? <em>{edge.stop === "cycle" ? translate(language, "循環", "cycle") : edge.stop === "depth" ? translate(language, "ここまで", "depth limit") : translate(language, "省略", "limited")}</em> : null}
          </div>
          {edge.child ? <TraceTree node={edge.child} language={language} nuclides={nuclides} onNavigate={onNavigate} /> : null}
        </li>
      ))}
    </ol>
  );
}

function pointForNuclide(nuclide: EnsdfAtlasNuclide): MapPoint {
  return { nuclide, x: 30 + nuclide.n * 4, y: 500 - nuclide.z * 4 };
}

function focusedViewport(point: MapPoint): AtlasViewport {
  const width = 250;
  const height = width * (MAP_HEIGHT / MAP_WIDTH);
  return clampViewport({ x: point.x - width / 2, y: point.y - height / 2, width, height });
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

function matchesSearch(nuclide: EnsdfAtlasNuclide, query: string): boolean {
  if (!query) return false;
  const code = normalizeSearch(nuclideLabel(nuclide));
  if (code === query || code.startsWith(query)) return true;
  if (query === `${code}m` || (query.startsWith(code) && /^m\d+$/.test(query.slice(code.length)))) return nuclide.metastableCount > 0;
  if (/^\d+$/.test(query)) return `${nuclide.a}`.startsWith(query);
  return /^[a-z]+$/.test(query) && (nuclide.symbol.toLowerCase().startsWith(query) || nuclide.name.toLowerCase().startsWith(query));
}

function searchRank(nuclide: EnsdfAtlasNuclide, query: string): number {
  const code = normalizeSearch(nuclideLabel(nuclide));
  if (code === query || query === `${code}m` || query.startsWith(`${code}m`)) return 0;
  if (code.startsWith(query)) return 1;
  if (nuclide.symbol.toLowerCase() === query) return 2;
  return 3;
}

function PointGlyph({ point, zoom, selected }: { point: MapPoint; zoom: number; selected: boolean }) {
  const size = 5.2 / zoom;
  const mode = point.nuclide.displayMode;
  const common = { className: "atlas-glyph-shape", vectorEffect: "non-scaling-stroke" as const };
  return (
    <g className={`atlas-map-node atlas-mode--${mode}${selected ? " is-selected" : ""}`} transform={`translate(${point.x} ${point.y})`}>
      {selected ? <circle className="atlas-selected-halo" r={9 / zoom} vectorEffect="non-scaling-stroke" /> : null}
      {mode === "stable" ? <circle {...common} r={size * .56} /> : null}
      {mode === "alpha" ? <circle {...common} r={size / 2} /> : null}
      {mode === "beta-minus" ? <rect {...common} x={-size / 2} y={-size / 2} width={size} height={size} /> : null}
      {mode === "beta-plus-ec" ? <rect {...common} x={-size / 2} y={-size / 2} width={size} height={size} transform="rotate(45)" /> : null}
      {mode === "electron-capture" ? <path {...common} d={`M 0 ${-size * .62} L ${size * .58} ${size * .42} L ${-size * .58} ${size * .42} Z`} /> : null}
      {mode === "isomeric-transition" ? <path {...common} d={`M ${-size * .62} 0 H ${size * .62} M 0 ${-size * .62} V ${size * .62}`} /> : null}
      {mode === "other" ? <path {...common} d={`M 0 ${-size * .6} L ${size * .52} ${-size * .3} L ${size * .52} ${size * .3} L 0 ${size * .6} L ${-size * .52} ${size * .3} L ${-size * .52} ${-size * .3} Z`} /> : null}
      {point.nuclide.metastableCount ? <circle className="atlas-isomer-dot" cx={size * .72} cy={-size * .72} r={1.5 / zoom} /> : null}
    </g>
  );
}

export default function NuclideAtlasPage() {
  const [language, setLanguage] = usePhenomenaLanguage();
  const nuclides = ENSDF_ATLAS_INDEX.nuclides;
  const mapPoints = useMemo(() => nuclides.map(pointForNuclide), [nuclides]);
  const nuclideIndex = useMemo(() => new Map(nuclides.map((nuclide) => [nuclide.id, nuclide])), [nuclides]);
  const pointIndex = useMemo(() => new Map(mapPoints.map((point) => [point.nuclide.id, point])), [mapPoints]);
  const requestedRouteQuery = typeof window === "undefined" ? null : readExperimentQuery(window.location.search, "nuclide");
  const requestedRouteNormalized = requestedRouteQuery ? normalizeSearch(requestedRouteQuery) : null;
  const requestedRouteNuclide = requestedRouteNormalized
    ? nuclides.find((item) => normalizeSearch(nuclideLabel(item)) === requestedRouteNormalized.replace(/m\d*$/, ""))
    : undefined;
  const [state, setState] = useState<SavedAtlasState>({ selectedKey: null, selectedStateId: null, view: "map", viewport: DEFAULT_VIEWPORT, enabledModes: ALL_MODES, traceDepth: 6, traceView: "tree" });
  const [searchQuery, setSearchQuery] = useState("");
  const [candidatePoints, setCandidatePoints] = useState<MapPoint[]>([]);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [hasPreviousViewport, setHasPreviousViewport] = useState(false);
  const [detail, setDetail] = useState<EnsdfAtlasShard | null>(null);
  const [detailStatus, setDetailStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [trace, setTrace] = useState<AtlasTraceNode | null>(null);
  const [traceStatus, setTraceStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [shareStatus, setShareStatus] = useState("");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const candidateDialogRef = useRef<HTMLDivElement | null>(null);
  const previousViewportRef = useRef<AtlasViewport | null>(null);
  const pointerPositionsRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<{ viewport: AtlasViewport; points: Map<number, { x: number; y: number }> } | null>(null);
  const movedRef = useRef(false);
  const shardCacheRef = useRef(new Map<string, EnsdfAtlasShard>());
  const shardPromiseCacheRef = useRef(new Map<string, Promise<EnsdfAtlasShard | null>>());

  const viewport = clampViewport(state.viewport ?? DEFAULT_VIEWPORT);
  const zoom = MAP_WIDTH / viewport.width;
  const enabledModes = state.enabledModes?.filter((mode): mode is EnsdfDisplayMode => ALL_MODES.includes(mode)) ?? ALL_MODES;
  const selected = state.selectedKey ? nuclideIndex.get(state.selectedKey) : undefined;
  const selectedPoint = selected ? pointIndex.get(selected.id) : undefined;
  const selectedStates = useMemo(() => selected && detail ? detail.states.filter((item) => item.nuclideId === selected.id).sort((a, b) => a.stateIndex - b.stateIndex) : [], [detail, selected]);
  const selectedState = selectedStates.find((item) => item.id === state.selectedStateId) ?? selectedStates[0];
  const selectedBranches = useMemo(() => selectedState && detail ? detail.branches.filter((item) => item.parentStateId === selectedState.id) : [], [detail, selectedState]);
  const traceDepth = TRACE_DEPTHS.includes(state.traceDepth as 3 | 6 | 10) ? state.traceDepth as 3 | 6 | 10 : 6;
  const traceView = state.traceView === "table" ? "table" : "tree";
  const traceRows = useMemo(() => trace ? flattenAtlasTrace(trace) : [], [trace]);

  const loadShardForState = useCallback((stateId: string): Promise<EnsdfAtlasShard | null> => {
    const nuclide = nuclideIndex.get(nuclideIdFromStateId(stateId));
    if (!nuclide) return Promise.resolve(null);
    const cached = shardCacheRef.current.get(nuclide.detailShard);
    if (cached) return Promise.resolve(cached);
    const pending = shardPromiseCacheRef.current.get(nuclide.detailShard);
    if (pending) return pending;
    const request = fetch(`${siteBasePath}${nuclide.detailShard}`)
      .then((response) => { if (!response.ok) throw new Error(`${response.status}`); return response.json() as Promise<EnsdfAtlasShard>; })
      .then((shard) => { shardCacheRef.current.set(nuclide.detailShard, shard); return shard; })
      .catch(() => null)
      .finally(() => { shardPromiseCacheRef.current.delete(nuclide.detailShard); });
    shardPromiseCacheRef.current.set(nuclide.detailShard, request);
    return request;
  }, [nuclideIndex]);

  const updateViewport = useCallback((next: AtlasViewport, remember = true) => {
    setState((current) => {
      if (remember) previousViewportRef.current = clampViewport(current.viewport ?? DEFAULT_VIEWPORT);
      return { ...current, viewport: clampViewport(next) };
    });
    if (remember) setHasPreviousViewport(true);
  }, []);

  const centerNuclide = useCallback((nuclide: EnsdfAtlasNuclide, stateLabelRequest = "g", updateUrl = true) => {
    const point = pointForNuclide(nuclide);
    const wantedState = stateLabelRequest === "g" ? `${nuclide.id}:g` : `${nuclide.id}:${stateLabelRequest}`;
    setHasPreviousViewport(true);
    setState((current) => {
      previousViewportRef.current = clampViewport(current.viewport ?? DEFAULT_VIEWPORT);
      const modes = current.enabledModes ?? ALL_MODES;
      return {
        ...current,
        selectedKey: nuclide.id,
        selectedStateId: nuclide.stateIds.includes(wantedState) ? wantedState : nuclide.stateIds[0],
        view: "map",
        viewport: focusedViewport(point),
        enabledModes: modes.includes(nuclide.displayMode) ? modes : [...modes, nuclide.displayMode],
      };
    });
    const suffix = stateLabelRequest === "g" ? "" : stateLabelRequest;
    setSearchQuery(`${nuclideLabel(nuclide)}${suffix}`);
    setCandidatePoints([]);
    if (updateUrl) replaceExperimentQuery("nuclide", `${nuclideLabel(nuclide)}${suffix}`);
  }, []);

  const restoreState = useCallback((next: SavedAtlasState) => {
    if (!next || typeof next !== "object") return;
    let selectedKey = typeof next.selectedKey === "string" ? canonicalizeAtlasNuclideKey(next.selectedKey) : null;
    if (!selectedKey || !nuclideIndex.has(selectedKey)) selectedKey = null;
    const restoredModes = Array.isArray(next.enabledModes) ? next.enabledModes.filter((mode): mode is EnsdfDisplayMode => ALL_MODES.includes(mode)) : ALL_MODES;
    const selectedNuclide = selectedKey ? nuclideIndex.get(selectedKey) : undefined;
    const selectedStateId = selectedNuclide && typeof next.selectedStateId === "string" && selectedNuclide.stateIds.includes(next.selectedStateId)
      ? next.selectedStateId : selectedNuclide?.stateIds[0] ?? null;
    setState({
      selectedKey,
      selectedStateId,
      view: next.view === "featured" || (next.view as string) === "table" ? "featured" : "map",
      viewport: isViewport(next.viewport) ? clampViewport(next.viewport) : DEFAULT_VIEWPORT,
      enabledModes: restoredModes,
      traceDepth: TRACE_DEPTHS.includes(next.traceDepth as 3 | 6 | 10) ? next.traceDepth : 6,
      traceView: next.traceView === "table" ? "table" : "tree",
    });
    setSearchQuery(selectedNuclide ? `${nuclideLabel(selectedNuclide)}${selectedStateId?.split(":")[1] === "g" ? "" : selectedStateId?.split(":")[1] ?? ""}` : "");
    previousViewportRef.current = null;
    setHasPreviousViewport(false);
  }, [nuclideIndex]);

  useEffect(() => {
    if (!requestedRouteQuery || !requestedRouteNuclide) return;
    const depthQuery = Number(readExperimentQuery(window.location.search, "depth"));
    const traceQuery = readExperimentQuery(window.location.search, "trace");
    const timer = window.setTimeout(() => {
      centerNuclide(requestedRouteNuclide, requestedStateLabel(requestedRouteQuery), false);
      setState((current) => ({
        ...current,
        traceDepth: TRACE_DEPTHS.includes(depthQuery as 3 | 6 | 10) ? depthQuery as 3 | 6 | 10 : current.traceDepth,
        traceView: traceQuery === "table" || traceQuery === "tree" ? traceQuery : current.traceView,
      }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [centerNuclide, requestedRouteNuclide, requestedRouteQuery]);

  useEffect(() => {
    if (!selected) {
      const timer = window.setTimeout(() => { setDetail(null); setDetailStatus("idle"); }, 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => { setDetail(null); setDetailStatus("loading"); }, 0);
    let active = true;
    loadShardForState(`${selected.id}:g`).then((shard) => {
      if (!active) return;
      setDetail(shard);
      setDetailStatus(shard ? "ready" : "error");
    });
    return () => { active = false; window.clearTimeout(timer); };
  }, [loadShardForState, selected]);

  useEffect(() => {
    if (!selectedState || selectedState.stability === "stable") {
      const timer = window.setTimeout(() => { setTrace(null); setTraceStatus("idle"); }, 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    const timer = window.setTimeout(() => { setTrace(null); setTraceStatus("loading"); }, 0);
    buildAtlasTrace(selectedState.id, loadShardForState, { maxDepth: traceDepth, maxNodes: 72 }).then((next) => {
      if (!active) return;
      setTrace(next);
      setTraceStatus("ready");
    }).catch(() => { if (active) setTraceStatus("error"); });
    return () => { active = false; window.clearTimeout(timer); };
  }, [loadShardForState, selectedState, traceDepth]);

  useEffect(() => { if (candidatePoints.length) candidateDialogRef.current?.focus(); }, [candidatePoints.length]);

  const filteredPoints = useMemo(() => mapPoints.filter((point) => enabledModes.includes(point.nuclide.displayMode)), [enabledModes, mapPoints]);
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
  const featured = useMemo(() => nuclides.filter((item) => FEATURED_CODES.has(nuclideLabel(item))), [nuclides]);
  const normalizedSearch = normalizeSearch(searchQuery);
  const searchMatches = useMemo(() => normalizedSearch ? nuclides.filter((item) => matchesSearch(item, normalizedSearch)).sort((a, b) => searchRank(a, normalizedSearch) - searchRank(b, normalizedSearch)) : [], [normalizedSearch, nuclides]);
  const visibleCandidates = normalizedSearch ? searchMatches.slice(0, 12) : featured;
  const labelPoints = useMemo(() => {
    if (zoom < 1.7) return mapPoints.filter((point) => FEATURED_CODES.has(nuclideLabel(point.nuclide)));
    if (zoom < 2.7) return mapPoints.filter((point) => FEATURED_CODES.has(nuclideLabel(point.nuclide)) || point.nuclide.id === state.selectedKey);
    const occupied = new Set<string>();
    return filteredPoints
      .filter((point) => point.x >= viewport.x && point.x <= viewport.x + viewport.width && point.y >= viewport.y && point.y <= viewport.y + viewport.height)
      .sort((a, b) => Number(b.nuclide.id === state.selectedKey) - Number(a.nuclide.id === state.selectedKey) || a.nuclide.z - b.nuclide.z || a.nuclide.n - b.nuclide.n)
      .filter((point) => {
        const cell = `${Math.floor(point.x / 25)}-${Math.floor(point.y / 13)}`;
        if (occupied.has(cell)) return false;
        occupied.add(cell);
        return true;
      });
  }, [filteredPoints, mapPoints, state.selectedKey, viewport, zoom]);

  const zoomMap = useCallback((factor: number, focusX = .5, focusY = .5) => {
    const current = clampViewport(state.viewport ?? DEFAULT_VIEWPORT);
    const width = current.width * factor;
    const height = width * (MAP_HEIGHT / MAP_WIDTH);
    const worldX = current.x + current.width * focusX;
    const worldY = current.y + current.height * focusY;
    updateViewport({ x: worldX - width * focusX, y: worldY - height * focusY, width, height });
  }, [state.viewport, updateViewport]);

  const restorePreviousView = useCallback(() => {
    const previous = previousViewportRef.current;
    if (!previous) return;
    previousViewportRef.current = viewport;
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
    return filteredPoints.map((point) => ({ point, distance: Math.hypot(point.x - world.x, point.y - world.y) }))
      .filter((item) => item.distance <= world.radius).sort((a, b) => a.distance - b.distance).slice(0, limit).map((item) => item.point);
  }, [filteredPoints, worldFromClient]);

  const handleMapClick = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (movedRef.current) { movedRef.current = false; return; }
    const candidates = nearestPoints(event.clientX, event.clientY);
    if (candidates.length === 1) centerNuclide(candidates[0].nuclide);
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
    if (!pointers.has(event.pointerId)) { setHoveredKey(nearestPoints(event.clientX, event.clientY, 1)[0]?.nuclide.id ?? null); return; }
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
    gestureRef.current = pointerPositionsRef.current.size ? { viewport: clampViewport(state.viewport ?? DEFAULT_VIEWPORT), points: new Map(pointerPositionsRef.current) } : null;
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
    else if (event.key === "0") updateViewport(DEFAULT_VIEWPORT);
    else if (event.key === "ArrowLeft") updateViewport({ ...viewport, x: viewport.x - stepX });
    else if (event.key === "ArrowRight") updateViewport({ ...viewport, x: viewport.x + stepX });
    else if (event.key === "ArrowUp") updateViewport({ ...viewport, y: viewport.y - stepY });
    else if (event.key === "ArrowDown") updateViewport({ ...viewport, y: viewport.y + stepY });
    else return;
    event.preventDefault();
  };

  const toggleMode = (mode: EnsdfDisplayMode) => {
    setState((current) => {
      const modes = current.enabledModes ?? ALL_MODES;
      return { ...current, enabledModes: modes.includes(mode) ? modes.filter((item) => item !== mode) : [...modes, mode] };
    });
    setCandidatePoints([]);
  };

  const jumpToDaughter = (branch: EnsdfAtlasBranch) => {
    const daughter = nuclideIndex.get(nuclideIdFromStateId(branch.daughterStateId));
    if (daughter) centerNuclide(daughter, branch.daughterStateId.split(":")[1] ?? "g");
  };

  const jumpToState = (stateId: string) => {
    const daughter = nuclideIndex.get(nuclideIdFromStateId(stateId));
    if (daughter) centerNuclide(daughter, stateId.split(":")[1] ?? "g");
  };

  const changeTraceDepth = (depth: 3 | 6 | 10) => {
    setState((current) => ({ ...current, traceDepth: depth }));
    replaceExperimentQuery("depth", `${depth}`);
  };

  const changeTraceView = (view: "tree" | "table") => {
    setState((current) => ({ ...current, traceView: view }));
    replaceExperimentQuery("trace", view);
  };

  const copyTraceLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus(translate(language, "リンクをコピーしました。", "Link copied."));
    } catch {
      setShareStatus(translate(language, "リンクをコピーできませんでした。", "Link could not be copied."));
    }
  };

  const hoveredPoint = hoveredKey ? pointIndex.get(hoveredKey) : undefined;
  const selectedCode = selected ? nuclideLabel(selected) : null;
  const hasDecayPreset = Boolean(selectedCode && decayPresetNuclides.has(selectedCode) && selectedState?.stability !== "stable");
  const hasMappedSource = Boolean(selectedCode && directlyMappedSources.has(selectedCode));
  const source = selectedCode === "I-131" ? "iodine-131" : selectedCode === "Co-60" ? "cobalt-60" : "cesium-137";

  return (
    <LabLayout lab={atlasLab} language={language} onLanguageChange={setLanguage}>
      <section className="atlas-workbench" aria-labelledby="atlas-workbench-title">
        <div className="section-heading atlas-heading">
          <div><p className="eyebrow">OVERVIEW / LOCATE / TRACE</p><h2 id="atlas-workbench-title">{translate(language, "核種地図", "Nuclide map")}</h2></div>
          <p>{translate(language, "全体像から入り、拡大して状態と分岐をたどります。", "Start with the whole field, then zoom into states and branches.")}</p>
        </div>
        <div className="atlas-data-strip" aria-label={translate(language, "地図データ概要", "Atlas data summary")}>
          <strong>ENSDF</strong><span>{ENSDF_ATLAS_INDEX.counts.nuclides.toLocaleString()} {translate(language, "核種", "nuclides")}</span><span>{ENSDF_ATLAS_INDEX.counts.metastableStates.toLocaleString()} {translate(language, "準安定状態", "metastable states")}</span><span>{ENSDF_ATLAS_INDEX.counts.branches.toLocaleString()} {translate(language, "壊変レコード", "decay records")}</span>
        </div>
        <div className="atlas-grid atlas-explorer-grid">
          {state.view === "map" ? (
            <figure className="atlas-map-figure atlas-explorer">
              <div className="atlas-map-toolbar">
                <div className="atlas-zoom-controls" role="group" aria-label={translate(language, "地図の拡大操作", "Map zoom controls")}>
                  <button type="button" onClick={() => zoomMap(1 / 1.35)} aria-label={translate(language, "拡大", "Zoom in")}>＋</button><output aria-live="polite">{Math.round(zoom * 100)}%</output><button type="button" onClick={() => zoomMap(1.35)} aria-label={translate(language, "縮小", "Zoom out")}>−</button><button type="button" onClick={restorePreviousView} disabled={!hasPreviousViewport} aria-label={translate(language, "直前の表示", "Previous view")}>↶</button><button type="button" onClick={() => updateViewport(DEFAULT_VIEWPORT)}>{translate(language, "全体", "Overview")}</button>
                </div>
                <span className="atlas-map-level">{zoom < 1.7 ? translate(language, "密度表示", "Density") : translate(language, "核種表示", "Nuclides")}</span>
              </div>
              <div className="atlas-mode-legend" role="group" aria-label={translate(language, "表示する種類", "Visible categories")}>
                {ALL_MODES.map((mode) => <button type="button" key={mode} className={`atlas-mode-filter atlas-mode--${mode}`} aria-pressed={enabledModes.includes(mode)} onClick={() => toggleMode(mode)}><i aria-hidden="true" />{modeLabel(mode, language)}</button>)}
              </div>
              <div className="atlas-map-stage">
                <svg ref={svgRef} className="atlas-map" viewBox={`${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`} role="group" tabIndex={0} aria-labelledby="atlas-map-title atlas-map-desc" onWheel={handleMapWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={finishPointer} onPointerCancel={finishPointer} onPointerLeave={() => setHoveredKey(null)} onClick={handleMapClick} onKeyDown={handleMapKeyDown}>
                  <title id="atlas-map-title">{translate(language, "ズーム可能な核種地図", "Zoomable nuclide map")}</title>
                  <desc id="atlas-map-desc">{translate(language, "横軸は中性子数N、縦軸は陽子数Z。ドラッグで移動、ホイールまたはボタンで拡大します。", "Neutron number N is horizontal and proton number Z is vertical. Drag to pan and use the wheel or buttons to zoom.")}</desc>
                  <rect className="atlas-map-background" x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} />
                  <g className="atlas-grid-lines" aria-hidden="true">
                    {[0, 20, 40, 60, 80, 100, 120, 140, 160].map((value) => <g key={`n-${value}`}><line x1={30 + value * 4} x2={30 + value * 4} y1="25" y2="500" /><text x={30 + value * 4} y="518" textAnchor="middle" style={{ fontSize: `${9 / zoom}px` }}>{value}</text></g>)}
                    {[0, 20, 40, 60, 80, 100].map((value) => <g key={`z-${value}`}><line x1="30" x2="735" y1={500 - value * 4} y2={500 - value * 4} /><text x="22" y={503 - value * 4} textAnchor="end" style={{ fontSize: `${9 / zoom}px` }}>{value}</text></g>)}
                  </g>
                  <path d="M30 500H735M30 25V500" className="atlas-axis" />
                  <path d="M55 469 C160 448 254 396 336 312 S540 154 710 74" className="atlas-stability-band" />
                  <path d="M55 476 C164 455 262 403 344 322 S546 166 710 86" className="atlas-stability-line" />
                  {zoom < 1.9 ? <g className="atlas-density-layer" aria-hidden="true">{densityCells.map((cell) => <rect key={`${cell.x}-${cell.y}`} x={cell.x} y={cell.y} width="17" height="17" style={{ opacity: .1 + cell.intensity * .62 }} />)}</g> : null}
                  {zoom >= 1.45 ? <g className="atlas-points-layer" aria-hidden="true">{filteredPoints.map((point) => <PointGlyph key={point.nuclide.id} point={point} zoom={zoom} selected={point.nuclide.id === state.selectedKey} />)}</g> : null}
                  {selectedPoint && zoom < 1.45 ? <g className="atlas-overview-selection" aria-hidden="true"><circle cx={selectedPoint.x} cy={selectedPoint.y} r={7 / zoom} /><line x1={selectedPoint.x - 13 / zoom} x2={selectedPoint.x + 13 / zoom} y1={selectedPoint.y} y2={selectedPoint.y} /><line x1={selectedPoint.x} x2={selectedPoint.x} y1={selectedPoint.y - 13 / zoom} y2={selectedPoint.y + 13 / zoom} /></g> : null}
                  <g className="atlas-progressive-labels" aria-hidden="true">{labelPoints.map((point) => <text key={point.nuclide.id} x={point.x + 6 / zoom} y={point.y - 5 / zoom} style={{ fontSize: `${9 / zoom}px` }}>{zoom >= 2.7 ? nuclideLabel(point.nuclide) : point.nuclide.symbol}</text>)}</g>
                  <text className="atlas-axis-title" x={720} y={518} style={{ fontSize: `${10 / zoom}px` }}>N →</text><text className="atlas-axis-title" x={8} y={30} style={{ fontSize: `${10 / zoom}px` }}>Z</text>
                </svg>
                {hoveredPoint && !candidatePoints.length ? <div className="atlas-map-tooltip" role="status"><strong>{nuclideLabel(hoveredPoint.nuclide)}</strong><span>{modeLabel(hoveredPoint.nuclide.displayMode, language)}{hoveredPoint.nuclide.metastableCount ? ` · +${hoveredPoint.nuclide.metastableCount}m` : ""}</span></div> : null}
                {candidatePoints.length ? <div ref={candidateDialogRef} className="atlas-map-candidates" role="dialog" tabIndex={-1} aria-label={translate(language, "近くの核種", "Nearby nuclides")} onKeyDown={(event) => { if (event.key === "Escape") { setCandidatePoints([]); svgRef.current?.focus(); } }}><div><strong>{translate(language, "近くの核種", "Nearby nuclides")}</strong><button type="button" onClick={() => { setCandidatePoints([]); svgRef.current?.focus(); }} aria-label={translate(language, "閉じる", "Close")}>×</button></div><ul>{candidatePoints.map((point) => <li key={point.nuclide.id}><button type="button" onClick={() => centerNuclide(point.nuclide)}><strong>{nuclideLabel(point.nuclide)}</strong><span>{modeLabel(point.nuclide.displayMode, language)}</span></button></li>)}</ul></div> : null}
              </div>
              <figcaption>{selected ? <><strong>{nuclideLabel(selected)}</strong> · Z {selected.z} / N {selected.n}</> : <><strong>{translate(language, "全体表示", "Overview")}</strong> · {filteredPoints.length.toLocaleString()} / {nuclides.length.toLocaleString()} {translate(language, "核種", "nuclides")}</>}<span>{translate(language, "ドラッグで移動 · ホイールで拡大 · 矢印キーでも移動", "Drag to pan · Wheel to zoom · Arrow keys to pan")}</span></figcaption>
            </figure>
          ) : (
            <div className="atlas-featured-list" role="group" aria-label={translate(language, "代表核種", "Featured nuclides")}>{featured.map((nuclide) => <button type="button" key={nuclide.id} aria-pressed={nuclide.id === state.selectedKey} onClick={() => centerNuclide(nuclide)}><strong>{nuclideLabel(nuclide)}</strong><span>{modeLabel(nuclide.displayMode, language)} · {nuclide.stateCount} {translate(language, "状態", "states")}</span></button>)}</div>
          )}

          <aside className={`atlas-controls${mobileControlsOpen ? " is-open" : ""}`} aria-label={translate(language, "地図の操作", "Map controls")}>
            <button className="atlas-mobile-controls-toggle" type="button" aria-expanded={mobileControlsOpen} onClick={() => setMobileControlsOpen((open) => !open)}><span>{selected ? nuclideLabel(selected) : translate(language, "核種を探す", "Find a nuclide")}</span><b>{mobileControlsOpen ? "−" : "+"}</b></button>
            <div className="atlas-controls-body">
              <div className="atlas-search"><label htmlFor="atlas-nuclide-search">{translate(language, "核種を検索", "Find a nuclide")}</label><form onSubmit={(event) => { event.preventDefault(); if (searchMatches[0]) centerNuclide(searchMatches[0], requestedStateLabel(searchQuery)); }}><input id="atlas-nuclide-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tc-99m / I-131" autoComplete="off" aria-describedby="atlas-search-status" /><button type="submit" disabled={!searchMatches.length}>{translate(language, "開く", "Open")}</button></form><p id="atlas-search-status" className="atlas-search-status" aria-live="polite">{normalizedSearch ? translate(language, `${searchMatches.length.toLocaleString()}件。Enterで開く`, `${searchMatches.length.toLocaleString()} match${searchMatches.length === 1 ? "" : "es"}. Press Enter to open.`) : translate(language, "代表核種から選ぶ", "Choose a featured nuclide")}</p></div>
              <div className="atlas-search-results" role="group" aria-label={translate(language, "検索結果", "Nuclide search results")}>{visibleCandidates.length ? visibleCandidates.map((nuclide) => <button type="button" key={nuclide.id} aria-pressed={nuclide.id === state.selectedKey} onClick={() => centerNuclide(nuclide, requestedStateLabel(searchQuery))}><strong>{nuclideLabel(nuclide)}{normalizedSearch.startsWith(`${normalizeSearch(nuclideLabel(nuclide))}m`) ? requestedStateLabel(searchQuery) : ""}</strong><span>{modeLabel(nuclide.displayMode, language)} · {nuclide.stateCount} {translate(language, "状態", "states")} · {nuclide.branchCount} {translate(language, "分岐", "branches")}</span></button>) : <p className="atlas-no-results">{translate(language, "一致する核種がありません。", "No matching nuclide.")}</p>}</div>
              {normalizedSearch && searchMatches.length > visibleCandidates.length ? <p className="atlas-results-limit">{translate(language, `先頭${visibleCandidates.length}件`, `First ${visibleCandidates.length} shown`)}</p> : null}
              <div className="atlas-view-toggle" role="group" aria-label={translate(language, "Atlasの表示", "Atlas view")}><button type="button" aria-pressed={state.view === "map"} onClick={() => setState((current) => ({ ...current, view: "map" }))}>{translate(language, "地図", "Map")}</button><button type="button" aria-pressed={state.view === "featured"} onClick={() => setState((current) => ({ ...current, view: "featured" }))}>{translate(language, "代表核種", "Featured")}</button></div>
              <LabStateTools lab={atlasLab} language={language} state={state} onRestore={restoreState} restoreOnMount={!requestedRouteNuclide} />
              <p className="atlas-count">ENSDF · {ENSDF_ATLAS_INDEX.source.dataGeneratedAt.slice(0, 10)}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="atlas-inspector atlas-genealogy" aria-labelledby="atlas-inspector-title">
        <div className="section-heading"><div><p className="eyebrow">NUCLIDE / STATE / BRANCH</p><h2 id="atlas-inspector-title">{selected ? nuclideLabel(selected) : translate(language, "核種を選択", "Select a nuclide")}</h2></div><p>{selected ? translate(language, "状態を選び、壊変先をたどります。", "Choose a state, then trace its decay.") : translate(language, "検索または地図から観察を始めます。", "Begin from search or the map.")}</p></div>
        {!selected ? <div className="atlas-empty-selection"><span aria-hidden="true">⌖</span><p>{translate(language, "代表核種を選ぶか、地図を拡大して核種を探してください。", "Choose a featured nuclide or zoom the map to explore.")}</p></div> : null}
        {selected && detailStatus === "loading" ? <p className="atlas-detail-status" role="status">{translate(language, "状態データを読み込み中…", "Loading state data…")}</p> : null}
        {selected && detailStatus === "error" ? <p className="atlas-detail-status is-error" role="alert">{translate(language, "状態データを読み込めませんでした。", "State data could not be loaded.")}</p> : null}
        {selected && selectedState ? <>
          <div className="atlas-state-selector" role="group" aria-label={translate(language, "核状態", "Nuclear state")}>{selectedStates.map((item) => <button type="button" key={item.id} aria-pressed={item.id === selectedState.id} onClick={() => { setState((current) => ({ ...current, selectedStateId: item.id })); replaceExperimentQuery("nuclide", `${nuclideLabel(selected)}${item.label === "g" ? "" : item.label}`); }}><strong>{stateLabel(item)}</strong><span>{stateEnergy(item, language)}</span></button>)}</div>
          <div className="atlas-state-summary"><article className="nuclide-card current"><span>{translate(language, "選択中", "SELECTED")}</span><strong>{nuclideLabel(selected)}{selectedState.label === "g" ? "" : selectedState.label}</strong><p>Z {selected.z} / N {selected.n}</p><small>T½ {halfLifeLabel(selectedState, language)}</small></article><dl className="atlas-state-metrics"><div><dt>{translate(language, "状態", "State")}</dt><dd>{stateEnergy(selectedState, language)}</dd></div><div><dt>Jπ</dt><dd>{selectedState.spinParity ?? "—"}</dd></div><div><dt>{translate(language, "収録分岐", "Recorded branches")}</dt><dd>{selectedBranches.length}</dd></div><div><dt>{translate(language, "流入記録", "Incoming records")}</dt><dd>{selected.incomingCount}</dd></div></dl></div>
          {selectedState.stability === "stable" ? <div className="atlas-stable-panel"><span aria-hidden="true">◎</span><div><strong>{translate(language, "安定核", "Stable nuclide")}</strong><p>{translate(language, "ENSDFで安定と評価されています。壊変経路は表示しません。", "Evaluated as stable in ENSDF. No decay path is shown.")}</p></div></div> : <div className="atlas-branch-panel"><div className="atlas-branch-heading"><h3>{translate(language, "収録された壊変", "Recorded decays")}</h3><span>{selectedBranches.length}</span></div>{selectedBranches.length ? <ol className="atlas-branch-list">{selectedBranches.slice(0, 12).map((branch) => { const daughter = nuclideIndex.get(nuclideIdFromStateId(branch.daughterStateId)); return <li key={branch.id}><span className={`atlas-branch-mode atlas-mode--${branch.displayMode}`}>{modeLabel(branch.displayMode, language)}</span><b aria-hidden="true">→</b>{daughter ? <button type="button" onClick={() => jumpToDaughter(branch)}><strong>{nuclideLabel(daughter)}{branch.daughterStateId.endsWith(":g") ? "" : branch.daughterStateId.split(":")[1]}</strong><span>{branchFraction(branch, language)}</span></button> : <span>—</span>}</li>; })}</ol> : <p>{translate(language, "この状態には壊変レコードがありません。安定とは限りません。", "No decay record is attached to this state; this does not imply stability.")}</p>}{selectedBranches.length > 12 ? <small>{translate(language, `先頭12件を表示（全${selectedBranches.length}件）`, `Showing 12 of ${selectedBranches.length}`)}</small> : null}</div>}
          {selectedState.stability !== "stable" && selectedBranches.length ? <section className="atlas-trace-explorer" aria-labelledby="atlas-trace-title" aria-busy={traceStatus === "loading"}>
            <div className="atlas-trace-toolbar">
              <div><p className="eyebrow">TRACE FORWARD</p><h3 id="atlas-trace-title">{translate(language, "この先の壊変系列", "Forward decay trace")}</h3></div>
              <div className="atlas-trace-actions">
                <div className="atlas-trace-depth" role="group" aria-label={translate(language, "追跡する段数", "Trace depth")}>{TRACE_DEPTHS.map((depth) => <button type="button" key={depth} aria-pressed={traceDepth === depth} onClick={() => changeTraceDepth(depth)}>{depth}</button>)}</div>
                <div className="atlas-trace-view" role="group" aria-label={translate(language, "系列の表示", "Trace view")}><button type="button" aria-pressed={traceView === "tree"} onClick={() => changeTraceView("tree")}>{translate(language, "系図", "Tree")}</button><button type="button" aria-pressed={traceView === "table"} onClick={() => changeTraceView("table")}>{translate(language, "一覧", "Table")}</button></div>
                <button className="atlas-trace-share" type="button" onClick={copyTraceLink}>{translate(language, "リンク", "Link")}</button>
              </div>
            </div>
            <p className="visually-hidden" role="status" aria-live="polite">{shareStatus}</p>
            {traceStatus === "loading" ? <p className="atlas-trace-status" role="status">{translate(language, "系列を読み込み中…", "Loading decay trace…")}</p> : null}
            {traceStatus === "error" ? <p className="atlas-trace-status is-error" role="alert">{translate(language, "系列を読み込めませんでした。", "Decay trace could not be loaded.")}</p> : null}
            {traceStatus === "ready" && trace ? <>
              {traceView === "tree" ? <div className="atlas-trace-canvas"><button className="atlas-trace-root" type="button" onClick={() => jumpToState(trace.stateId)}>{traceStateLabel(trace.stateId, nuclideIndex)}</button><TraceTree node={trace} language={language} nuclides={nuclideIndex} onNavigate={jumpToState} /></div> : <div className="atlas-trace-table-wrap"><table className="atlas-trace-table"><thead><tr><th>{translate(language, "段", "Step")}</th><th>{translate(language, "親", "From")}</th><th>{translate(language, "変化", "Mode")}</th><th>{translate(language, "娘", "To")}</th><th>{translate(language, "比率 / 記録", "Ratio / records")}</th></tr></thead><tbody>{traceRows.map((row) => <tr key={row.id}><td>{row.depth}</td><td>{traceStateLabel(row.parentStateId, nuclideIndex)}</td><td>{modeLabel(row.displayMode, language)}<small>{row.rawModes.join(" / ")}</small></td><td><button type="button" onClick={() => jumpToState(row.daughterStateId)}>{traceStateLabel(row.daughterStateId, nuclideIndex)}</button></td><td>{fractionsLabel(row.reportedFractions, language)}{row.recordCount > 1 ? ` · ${row.recordCount}` : ""}</td></tr>)}</tbody></table></div>}
            </> : null}
          </section> : null}
        </> : null}
      </section>

      <section className="related-labs atlas-handoffs" aria-labelledby="related-labs-title"><div><p className="eyebrow">NEXT WINDOW</p><h2 id="related-labs-title">{translate(language, "次の観察", "Continue observing")}</h2></div><div className="related-lab-links"><Link href={hasDecayPreset && selectedCode ? `/labs/decay?nuclide=${encodeURIComponent(selectedCode)}` : "/labs/decay"}>Decay Lab <span>{hasDecayPreset ? translate(language, "この核種で壊変を観察", "observe this nuclide") : translate(language, "壊変モデルを開く", "open the decay model")}</span></Link><Link href={hasMappedSource ? `/labs/detector?source=${source}` : "/labs/detector"}>Detector Lab <span>{hasMappedSource ? translate(language, "応答を比較", "compare response") : translate(language, "検出器を比較", "compare detectors")}</span></Link><Link href={hasMappedSource ? `/labs/pulse?source=${source}` : "/labs/pulse"}>Pulse Lab <span>{hasMappedSource ? translate(language, "波形を観察", "inspect the waveform") : translate(language, "パルスモデルを開く", "open the pulse model")}</span></Link><Link href="/about#atlas">About <span>{translate(language, "モデルと制約を見る", "inspect model and limits")}</span></Link></div></section>
    </LabLayout>
  );
}
