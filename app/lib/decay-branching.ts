import { MAP_RADIONUCLIDES } from "../radionuclides";
import type { LocalizedText } from "./labs";

// These small teaching schemes reuse the bundled catalog's principal fraction.
// A grouped complement makes each displayed outcome split total 1 without
// claiming a complete evaluated level or gamma scheme; see DATA_PROVENANCE.md.
export const DECAY_BRANCHING_VERSION = "curated-outcome-splits-v1" as const;

export type DecayModelMode = "learn" | "physics";

export type DecayBranchOutcome = Readonly<{
  id: string;
  label: LocalizedText;
  daughter: LocalizedText;
  probability: number;
  role: "principal" | "grouped-remainder";
}>;

export type DecayBranchingScheme = Readonly<{
  id: "iodine-131" | "cesium-137" | "cobalt-60";
  parent: string;
  decay: "beta-minus";
  outcomes: readonly DecayBranchOutcome[];
  emissionMetadata: Readonly<{ betaMinus: boolean; gammaCascade?: string }>;
}>;

const catalogFraction = (symbol: string, mass: number): number => {
  const record = MAP_RADIONUCLIDES.find((candidate) => candidate[0] === symbol && candidate[1] === mass);
  if (!record) throw new Error(`Missing bundled catalog record for ${symbol}-${mass}`);
  return record[10];
};

const IODINE_131: DecayBranchingScheme = {
  id: "iodine-131", parent: "I-131", decay: "beta-minus",
  outcomes: [
    { id: "xe-131", label: { ja: "Xe-131 主結果", en: "Xe-131 principal outcome" }, daughter: { ja: "Xe-131", en: "Xe-131" }, probability: catalogFraction("I", 131), role: "principal" },
    { id: "iodine-131-grouped-remainder", label: { ja: "その他の結果（まとめ）", en: "Other outcomes (grouped)" }, daughter: { ja: "残余群", en: "Grouped remainder" }, probability: 0.01176, role: "grouped-remainder" },
  ],
  emissionMetadata: { betaMinus: true },
};

const CESIUM_137: DecayBranchingScheme = {
  id: "cesium-137", parent: "Cs-137", decay: "beta-minus",
  outcomes: [
    { id: "ba-137m", label: { ja: "Ba-137m", en: "Ba-137m" }, daughter: { ja: "Ba-137m", en: "Ba-137m" }, probability: catalogFraction("Cs", 137), role: "principal" },
    { id: "ba-137", label: { ja: "Ba-137 基底状態", en: "Ba-137 ground state" }, daughter: { ja: "Ba-137", en: "Ba-137" }, probability: 0.05601, role: "grouped-remainder" },
  ],
  emissionMetadata: { betaMinus: true },
};

const COBALT_60: DecayBranchingScheme = {
  id: "cobalt-60", parent: "Co-60", decay: "beta-minus",
  outcomes: [{ id: "ni-60", label: { ja: "Ni-60", en: "Ni-60" }, daughter: { ja: "Ni-60", en: "Ni-60" }, probability: catalogFraction("Co", 60), role: "principal" }],
  emissionMetadata: { betaMinus: true, gammaCascade: "β⁻ daughter de-excitation includes a γ cascade" },
};

export const DECAY_BRANCHING_SCHEMES: readonly DecayBranchingScheme[] = [IODINE_131, CESIUM_137, COBALT_60];

const aliases: Readonly<Record<string, DecayBranchingScheme["id"]>> = {
  "iodine-131": "iodine-131", "i-131": "iodine-131", i131: "iodine-131",
  "cesium-137": "cesium-137", "cs-137": "cesium-137", cs137: "cesium-137",
  "cobalt-60": "cobalt-60", "co-60": "cobalt-60", co60: "cobalt-60",
};

export function resolveDecayBranchingScheme(nuclide: string | null | undefined): DecayBranchingScheme | undefined {
  if (!nuclide) return undefined;
  const id = aliases[nuclide.trim().toLowerCase()];
  return id ? DECAY_BRANCHING_SCHEMES.find((scheme) => scheme.id === id) : undefined;
}

export function sampleDecayBranch(scheme: DecayBranchingScheme, randomValue: number): DecayBranchOutcome {
  const value = Math.max(0, Math.min(1 - Number.EPSILON, randomValue));
  let cumulative = 0;
  for (const outcome of scheme.outcomes) {
    cumulative += outcome.probability;
    if (value < cumulative) return outcome;
  }
  return scheme.outcomes[scheme.outcomes.length - 1];
}
