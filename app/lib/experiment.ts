import type { LabManifest, Language } from "./labs";

const STATE_VERSION = 1;
const STATE_PREFIX = "phenomena:experiment:";

export type SavedExperiment<T> = Readonly<{
  version: number;
  savedAt: string;
  state: T;
}>;

export function translate(language: Language, japanese: string, english: string): string {
  return language === "ja" ? japanese : english;
}

export function withExperimentQuery(url: URL, key: string, value: string): string {
  const next = new URL(url.href);
  next.searchParams.set(key, value);
  return `${next.pathname}${next.search}${next.hash}`;
}

export function readExperimentQuery(search: string, key: string): string | null {
  return new URLSearchParams(search).get(key);
}

export function replaceExperimentQuery(key: string, value: string): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", withExperimentQuery(new URL(window.location.href), key, value));
}

export function createSeededRandom(seed: number): () => number {
  let state = Math.trunc(seed) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function saveExperimentState<T>(labKey: string, state: T): SavedExperiment<T> | null {
  const envelope: SavedExperiment<T> = {
    version: STATE_VERSION,
    savedAt: new Date().toISOString(),
    state,
  };
  try {
    window.localStorage.setItem(`${STATE_PREFIX}${labKey}`, JSON.stringify(envelope));
    return envelope;
  } catch {
    return null;
  }
}

export function loadExperimentState<T>(labKey: string): SavedExperiment<T> | null {
  try {
    const raw = window.localStorage.getItem(`${STATE_PREFIX}${labKey}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as { version?: unknown }).version !== STATE_VERSION ||
      typeof (parsed as { savedAt?: unknown }).savedAt !== "string" ||
      !("state" in parsed)
    ) {
      return null;
    }
    return parsed as SavedExperiment<T>;
  } catch {
    return null;
  }
}

export function clearExperimentState(labKey: string): void {
  try {
    window.localStorage.removeItem(`${STATE_PREFIX}${labKey}`);
  } catch {
    // Keeping the visible state is preferable to surfacing a storage exception.
  }
}

export type CsvCell = string | number | boolean | null | undefined;
export type CsvRow = readonly CsvCell[];

export function experimentProvenanceRows(lab: Pick<LabManifest, "id" | "slug" | "datasets" | "assumptions" | "constraints" | "citations" | "licenses" | "safety">): readonly CsvRow[] {
  return [
    ["product", "Phenomena Foundation v1"],
    ["lab_id", lab.id],
    ["lab_route", `/labs/${lab.slug}`],
    ["dataset_versions", lab.datasets.map((dataset) => `${dataset.id}@${dataset.version}`).join(" | ")],
    ["dataset_sources", lab.datasets.map((dataset) => dataset.source).join(" | ")],
    ["dataset_licenses", lab.datasets.map((dataset) => dataset.license).join(" | ")],
    ["citations", lab.citations.join(" | ")],
    ["model_assumptions", lab.assumptions.map((item) => item.en).join(" | ")],
    ["model_constraints", lab.constraints.map((item) => item.en).join(" | ")],
    ["safety_boundary", lab.safety.map((item) => item.en).join(" | ")],
  ];
}

function csvField(value: CsvCell): string {
  let text = value == null ? "" : String(value);
  // Preserve textual metadata when a spreadsheet would otherwise interpret it as a formula.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(rows: readonly CsvRow[]): string {
  return `\ufeff${rows.map((row) => row.map(csvField).join(",")).join("\r\n")}\r\n`;
}

export function downloadCsv(
  filename: string,
  rows: readonly CsvRow[],
): void {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 0);
}
