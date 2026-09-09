import { MAP_RADIONUCLIDES, type MapDecayCode, type MapRadionuclideRecord } from "../radionuclides";

export type NuclideCatalogScope = "ground-state-parent-principal-branch" | "evaluated-decay-network";
export type NuclideStability = "stable" | "radioactive" | "unknown";

export type CatalogSource = Readonly<{
  id: string;
  provider: string;
  database: string;
  version: string;
  scope: NuclideCatalogScope;
  retrievedAt: string | null;
  dataGeneratedAt: string | null;
  checksumSha256: string | null;
  sourceHref: string;
  licenseSummary: string;
}>;

export type CatalogNuclide = Readonly<{
  id: string;
  symbol: string;
  massNumber: number;
  protonNumber: number;
  neutronNumber: number;
}>;

export type CatalogHalfLife = Readonly<{
  value: number;
  unit: MapRadionuclideRecord[8];
  seconds: number;
}>;

export type CatalogState = Readonly<{
  id: string;
  nuclideId: string;
  stateIndex: number;
  metastable: boolean;
  excitationEnergyKeV: number | null;
  halfLife: CatalogHalfLife | null;
  stability: NuclideStability;
}>;

export type CatalogDecayBranch = Readonly<{
  id: string;
  parentStateId: string;
  daughterStateId: string;
  mode: MapDecayCode;
  branchingFraction: number | null;
  qValueKeV: number | null;
  sourceRecordId: string;
}>;

export type NuclideCatalog = Readonly<{
  schemaVersion: 1;
  source: CatalogSource;
  nuclides: readonly CatalogNuclide[];
  states: readonly CatalogState[];
  branches: readonly CatalogDecayBranch[];
}>;

const UNIT_SECONDS: Readonly<Record<MapRadionuclideRecord[8], number>> = {
  秒: 1,
  分: 60,
  時間: 3_600,
  日: 86_400,
  年: 31_557_600,
};

export function catalogNuclideId(protonNumber: number, massNumber: number): string {
  return `z${protonNumber}-a${massNumber}`;
}

export function catalogStateId(nuclideId: string, stateIndex = 0): string {
  return `${nuclideId}:${stateIndex === 0 ? "g" : `m${stateIndex}`}`;
}

function legacyHalfLife(record: MapRadionuclideRecord): CatalogHalfLife {
  return { value: record[7], unit: record[8], seconds: record[7] * UNIT_SECONDS[record[8]] };
}

function compareNuclides(a: CatalogNuclide, b: CatalogNuclide): number {
  return a.protonNumber - b.protonNumber || a.neutronNumber - b.neutronNumber || a.symbol.localeCompare(b.symbol);
}

export function buildLegacyNuclideCatalog(records: readonly MapRadionuclideRecord[]): NuclideCatalog {
  const nuclides = new Map<string, CatalogNuclide>();
  const states = new Map<string, CatalogState>();
  const branches: CatalogDecayBranch[] = [];

  const addNuclide = (symbol: string, massNumber: number, protonNumber: number) => {
    const id = catalogNuclideId(protonNumber, massNumber);
    if (!nuclides.has(id)) {
      nuclides.set(id, { id, symbol, massNumber, protonNumber, neutronNumber: massNumber - protonNumber });
    }
    return id;
  };

  for (const [index, record] of records.entries()) {
    const parentNuclideId = addNuclide(record[0], record[1], record[2]);
    const daughterNuclideId = addNuclide(record[3], record[4], record[5]);
    const parentStateId = catalogStateId(parentNuclideId);
    const daughterStateId = catalogStateId(daughterNuclideId, record[6] ? 1 : 0);

    states.set(parentStateId, {
      id: parentStateId,
      nuclideId: parentNuclideId,
      stateIndex: 0,
      metastable: false,
      excitationEnergyKeV: 0,
      halfLife: legacyHalfLife(record),
      stability: "radioactive",
    });
    if (!states.has(daughterStateId)) {
      states.set(daughterStateId, {
        id: daughterStateId,
        nuclideId: daughterNuclideId,
        stateIndex: record[6] ? 1 : 0,
        metastable: record[6],
        excitationEnergyKeV: record[6] ? null : 0,
        halfLife: null,
        stability: "unknown",
      });
    }
    branches.push({
      id: `legacy-${index}-${parentStateId}-${record[9]}`,
      parentStateId,
      daughterStateId,
      mode: record[9],
      branchingFraction: record[10],
      qValueKeV: null,
      sourceRecordId: `radionuclides.ts:${index}`,
    });
  }

  return {
    schemaVersion: 1,
    source: {
      id: "foundation-radionuclide-catalog",
      provider: "radioactivedecay",
      database: "ICRP-107 / AME2020 / Nubase2020",
      version: "radioactivedecay 0.6.1-derived",
      scope: "ground-state-parent-principal-branch",
      retrievedAt: null,
      dataGeneratedAt: null,
      checksumSha256: null,
      sourceHref: "https://github.com/radioactivedecay/radioactivedecay",
      licenseSummary: "Separate ICRP-07 terms; see public/data/LICENSE.TXT.",
    },
    nuclides: [...nuclides.values()].sort(compareNuclides),
    states: [...states.values()].sort((a, b) => a.id.localeCompare(b.id)),
    branches,
  };
}

export function projectLegacyNuclideRecords(catalog: NuclideCatalog): readonly MapRadionuclideRecord[] {
  const nuclides = new Map(catalog.nuclides.map((nuclide) => [nuclide.id, nuclide]));
  const states = new Map(catalog.states.map((state) => [state.id, state]));
  return catalog.branches.map((branch) => {
    const parentState = states.get(branch.parentStateId);
    const daughterState = states.get(branch.daughterStateId);
    const parent = parentState ? nuclides.get(parentState.nuclideId) : undefined;
    const daughter = daughterState ? nuclides.get(daughterState.nuclideId) : undefined;
    if (!parentState?.halfLife || !daughterState || !parent || !daughter || branch.branchingFraction === null) {
      throw new Error(`Catalog branch cannot be projected to the Foundation tuple: ${branch.id}`);
    }
    return [
      parent.symbol,
      parent.massNumber,
      parent.protonNumber,
      daughter.symbol,
      daughter.massNumber,
      daughter.protonNumber,
      daughterState.metastable,
      parentState.halfLife.value,
      parentState.halfLife.unit,
      branch.mode,
      branch.branchingFraction,
    ] as const;
  });
}

export function validateNuclideCatalog(catalog: NuclideCatalog): readonly string[] {
  const issues: string[] = [];
  const nuclideIds = new Set<string>();
  const stateIds = new Set<string>();
  const branchIds = new Set<string>();
  const nuclidesById = new Map(catalog.nuclides.map((nuclide) => [nuclide.id, nuclide]));
  const statesById = new Map(catalog.states.map((state) => [state.id, state]));

  for (const nuclide of catalog.nuclides) {
    if (nuclideIds.has(nuclide.id)) issues.push(`Duplicate nuclide id: ${nuclide.id}`);
    nuclideIds.add(nuclide.id);
    if (nuclide.massNumber !== nuclide.protonNumber + nuclide.neutronNumber) issues.push(`A != Z + N: ${nuclide.id}`);
    if (nuclide.massNumber < 1 || nuclide.protonNumber < 0 || nuclide.neutronNumber < 0) issues.push(`Invalid nuclide coordinates: ${nuclide.id}`);
  }
  for (const state of catalog.states) {
    if (stateIds.has(state.id)) issues.push(`Duplicate state id: ${state.id}`);
    stateIds.add(state.id);
    if (!nuclideIds.has(state.nuclideId)) issues.push(`Missing state nuclide: ${state.id}`);
    if (state.halfLife && (!Number.isFinite(state.halfLife.seconds) || state.halfLife.seconds <= 0)) issues.push(`Invalid half-life: ${state.id}`);
  }
  for (const branch of catalog.branches) {
    if (branchIds.has(branch.id)) issues.push(`Duplicate branch id: ${branch.id}`);
    branchIds.add(branch.id);
    if (!stateIds.has(branch.parentStateId)) issues.push(`Missing branch parent: ${branch.id}`);
    if (!stateIds.has(branch.daughterStateId)) issues.push(`Missing branch daughter: ${branch.id}`);
    if (branch.branchingFraction !== null && (branch.branchingFraction <= 0 || branch.branchingFraction > 1)) issues.push(`Invalid branch fraction: ${branch.id}`);
    const parent = nuclidesById.get(statesById.get(branch.parentStateId)?.nuclideId ?? "");
    const daughter = nuclidesById.get(statesById.get(branch.daughterStateId)?.nuclideId ?? "");
    if (parent && daughter) {
      const deltaA = daughter.massNumber - parent.massNumber;
      const deltaZ = daughter.protonNumber - parent.protonNumber;
      const expected = branch.mode === "alpha" ? [-4, -2]
        : branch.mode === "beta-minus" ? [0, 1]
          : branch.mode === "beta-plus-ec" || branch.mode === "electron-capture" ? [0, -1]
            : [0, 0];
      if (deltaA !== expected[0] || deltaZ !== expected[1]) issues.push(`Decay identity mismatch: ${branch.id}`);
    }
  }
  return issues;
}

export const FOUNDATION_NUCLIDE_CATALOG = buildLegacyNuclideCatalog(MAP_RADIONUCLIDES);
