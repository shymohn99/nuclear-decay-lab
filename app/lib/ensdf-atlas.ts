import indexJson from "../generated/ensdf-atlas-index.json";

export type EnsdfDisplayMode =
  | "stable"
  | "alpha"
  | "beta-minus"
  | "beta-plus-ec"
  | "electron-capture"
  | "isomeric-transition"
  | "other";

export type EnsdfAtlasNuclide = Readonly<{
  id: string;
  symbol: string;
  name: string;
  z: number;
  a: number;
  n: number;
  stateIds: readonly string[];
  stateCount: number;
  metastableCount: number;
  branchCount: number;
  incomingCount: number;
  stable: boolean;
  displayMode: EnsdfDisplayMode;
  detailShard: string;
}>;

export type EnsdfAtlasState = Readonly<{
  id: string;
  nuclideId: string;
  label: string;
  stateIndex: number;
  metastable: boolean;
  stability: "stable" | "radioactive-or-unknown" | "unknown";
  excitationEnergyKeV: number | null;
  halfLife: Readonly<{ value: number; unit: string }> | null;
  halfLifeSeconds: number | null;
  spinParity: string | null;
  decayBranchingRatios: Readonly<Record<string, Readonly<{ value?: number; unit?: string }>>> | null;
  source?: Readonly<{ levelId?: number; dataset?: Readonly<Record<string, unknown>> }> | null;
}>;

export type EnsdfAtlasBranch = Readonly<{
  id: string;
  parentStateId: string;
  daughterStateId: string;
  rawMode: string;
  displayMode: EnsdfDisplayMode;
  branchingFractionReported: number | null;
  normalizationIncludesBranchingRatio: boolean;
  qValueKeV: number | null;
  source: Readonly<{
    decayId: number;
    dataset?: Readonly<{ datasetName?: string; cutoffDate?: string }>;
  }>;
}>;

export type EnsdfAtlasShard = Readonly<{
  schemaVersion: 1;
  z: number;
  nuclides: readonly EnsdfAtlasNuclide[];
  states: readonly EnsdfAtlasState[];
  branches: readonly EnsdfAtlasBranch[];
  integrity: Readonly<{ algorithm: "sha256"; value: string }>;
}>;

export type EnsdfAtlasIndex = Readonly<{
  schemaVersion: 1;
  source: Readonly<{
    provider: string;
    database: string;
    apiStatus: string;
    dataGeneratedAt: string;
    snapshotDataIntegrity: string;
    redistributionStatus: string;
  }>;
  counts: Readonly<{
    nuclides: number;
    states: number;
    groundStates: number;
    metastableStates: number;
    branches: number;
    stableStates: number;
    shards: number;
  }>;
  modes: readonly EnsdfDisplayMode[];
  shards: readonly Readonly<{
    z: number;
    path: string;
    nuclides: number;
    states: number;
    branches: number;
    sha256: string;
  }>[];
  nuclides: readonly EnsdfAtlasNuclide[];
}>;

export const ENSDF_ATLAS_INDEX = indexJson as unknown as EnsdfAtlasIndex;

export function nuclideIdFromStateId(stateId: string): string {
  return stateId.split(":", 1)[0];
}

export function stateIndexFromId(stateId: string): number {
  const label = stateId.split(":")[1] ?? "g";
  return label === "g" ? 0 : Number.parseInt(label.replace(/^m/, ""), 10) || 1;
}

export function canonicalizeAtlasNuclideKey(value: string): string {
  if (/^z\d+-a\d+$/.test(value)) return value;
  const legacy = value.match(/^[A-Za-z]{1,3}-(\d+)-(\d+)$/);
  return legacy ? `z${Number(legacy[2])}-a${Number(legacy[1])}` : value;
}
