import type { Language } from "./labs";

export type ExperimentEnvelope<T> = {
  version: 1;
  labId: string;
  savedAt: string;
  state: T;
};

const STATE_PREFIX = "phenomena-foundation-state:";

export function translate(language: Language, japanese: string, english: string): string {
  return language === "ja" ? japanese : english;
}

export function createSeededRandom(seed: number): () => number {
  let state = (Math.trunc(seed) >>> 0) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function loadExperimentState<T>(labId: string): ExperimentEnvelope<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STATE_PREFIX}${labId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExperimentEnvelope<T>;
    return parsed?.version === 1 && parsed.labId === labId ? parsed : null;
  } catch {
    return null;
  }
}

export function saveExperimentState<T>(labId: string, state: T): ExperimentEnvelope<T> | null {
  if (typeof window === "undefined") return null;
  const envelope: ExperimentEnvelope<T> = {
    version: 1,
    labId,
    savedAt: new Date().toISOString(),
    state,
  };
  try {
    window.localStorage.setItem(`${STATE_PREFIX}${labId}`, JSON.stringify(envelope));
    return envelope;
  } catch {
    return null;
  }
}

export function clearExperimentState(labId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${STATE_PREFIX}${labId}`);
  } catch {
    // Storage is optional; experiments still work without it.
  }
}

export function downloadCsv(filename: string, rows: readonly (readonly unknown[])[]): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const escapeCell = (value: unknown) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
