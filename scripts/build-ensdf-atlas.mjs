import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const inputPath = resolve(process.cwd(), "work/ensdf/ensdf-atlas.snapshot.json");
const appIndexPath = resolve(process.cwd(), "app/generated/ensdf-atlas-index.json");
const publicIndexPath = resolve(process.cwd(), "public/data/ensdf-atlas/index.json");
const shardRoot = resolve(process.cwd(), "public/data/ensdf-atlas");

const snapshot = JSON.parse(await readFile(inputPath, "utf8"));

const sha256 = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const nuclideId = (z, a) => `z${z}-a${a}`;
const groundStateId = (z, a) => `${nuclideId(z, a)}:g`;
const finite = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
const formatSymbol = (value) => `${String(value).slice(0, 1).toUpperCase()}${String(value).slice(1).toLowerCase()}`;
const stateFingerprint = (parent) => JSON.stringify([
  finite(parent?.levelEnergy?.value),
  parent?.levelEnergy?.offsetLabel ?? null,
  finite(parent?.halfLifeSeconds?.value),
  parent?.spinParity?.stringRepresentation ?? null,
]);

function displayMode(rawMode) {
  const mode = String(rawMode ?? "").toUpperCase();
  if (mode === "A") return "alpha";
  if (mode.startsWith("B-")) return "beta-minus";
  if (mode.startsWith("B+")) return "beta-plus-ec";
  if (mode.startsWith("EC")) return "electron-capture";
  if (mode === "IT") return "isomeric-transition";
  return "other";
}

const nuclides = snapshot.nuclides
  .filter((item) => item.z >= 1 && item.a >= 1 && item.n >= 0)
  .map((item) => ({
    id: nuclideId(item.z, item.a),
    symbol: formatSymbol(item.elementSymbol),
    name: item.name,
    z: item.z,
    a: item.a,
    n: item.n,
    sourceNuclideId: item.id,
  }))
  .sort((a, b) => a.z - b.z || a.n - b.n);

const nuclideBySourceId = new Map(nuclides.map((item) => [item.sourceNuclideId, item]));
const nuclideById = new Map(nuclides.map((item) => [item.id, item]));
const groundByNuclideId = new Map();
for (const level of snapshot.groundStates) {
  const identity = nuclideBySourceId.get(level.datasetSummary?.nuclideId);
  if (identity && !groundByNuclideId.has(identity.id)) groundByNuclideId.set(identity.id, level);
}

const decayParentsByNuclide = new Map();
for (const decay of snapshot.decays) {
  const id = nuclideId(decay.parent?.z, decay.parent?.a);
  if (!nuclideById.has(id)) continue;
  const parents = decayParentsByNuclide.get(id) ?? new Map();
  parents.set(stateFingerprint(decay.parent), decay.parent);
  decayParentsByNuclide.set(id, parents);
}

const states = [];
const stateIdByFingerprint = new Map();
for (const nuclide of nuclides) {
  const ground = groundByNuclideId.get(nuclide.id);
  states.push({
    id: groundStateId(nuclide.z, nuclide.a),
    nuclideId: nuclide.id,
    label: "g",
    stateIndex: 0,
    metastable: false,
    stability: ground?.isStable === true ? "stable" : ground ? "radioactive-or-unknown" : "unknown",
    excitationEnergyKeV: 0,
    halfLife: ground?.halflife ?? null,
    halfLifeSeconds: finite(ground?.halflifeSeconds),
    spinParity: ground?.spinParity?.stringRepresentation ?? null,
    decayBranchingRatios: ground?.decayBranchingRatios ?? null,
    source: ground ? { levelId: ground.id, dataset: ground.datasetSummary } : null,
  });
  const parentStates = [...(decayParentsByNuclide.get(nuclide.id)?.entries() ?? [])]
    .filter(([, parent]) => finite(parent.levelEnergy?.value) !== 0)
    .sort(([, a], [, b]) =>
      (finite(a.levelEnergy?.value) ?? Number.MAX_VALUE) - (finite(b.levelEnergy?.value) ?? Number.MAX_VALUE) ||
      (finite(a.halfLifeSeconds?.value) ?? Number.MAX_VALUE) - (finite(b.halfLifeSeconds?.value) ?? Number.MAX_VALUE) ||
      String(a.spinParity?.stringRepresentation ?? "").localeCompare(String(b.spinParity?.stringRepresentation ?? "")));
  parentStates.forEach(([fingerprint, parent], index) => {
    const stateIndex = index + 1;
    const id = `${nuclide.id}:m${stateIndex}`;
    stateIdByFingerprint.set(`${nuclide.id}|${fingerprint}`, id);
    states.push({
      id,
      nuclideId: nuclide.id,
      label: `m${stateIndex}`,
      stateIndex,
      metastable: true,
      stability: "radioactive-or-unknown",
      excitationEnergyKeV: finite(parent.levelEnergy?.value),
      halfLife: parent.halfLife ?? null,
      halfLifeSeconds: finite(parent.halfLifeSeconds?.value),
      spinParity: parent.spinParity?.stringRepresentation ?? null,
      decayBranchingRatios: null,
      source: null,
    });
  });
}

const statesById = new Map(states.map((state) => [state.id, state]));
const branches = [];
for (const decay of snapshot.decays) {
  const parentNuclide = nuclideById.get(nuclideId(decay.parent?.z, decay.parent?.a));
  const daughterNuclide = nuclideById.get(nuclideId(decay.daughter?.z, decay.daughter?.a));
  if (!parentNuclide || !daughterNuclide) continue;
  const parentEnergy = finite(decay.parent?.levelEnergy?.value);
  const parentStateId = parentEnergy === 0
    ? groundStateId(parentNuclide.z, parentNuclide.a)
    : stateIdByFingerprint.get(`${parentNuclide.id}|${stateFingerprint(decay.parent)}`);
  if (!parentStateId || !statesById.has(parentStateId)) continue;
  const rawBranching = finite(decay.parent?.normalizations?.branchingRatio?.value);
  const stableIdentity = {
    parentStateId,
    daughterId: daughterNuclide.id,
    mode: decay.decayMode,
    datasetName: decay.datasetSummary?.datasetName ?? null,
    cutoffDate: decay.datasetSummary?.cutoffDate ?? null,
    qValue: finite(decay.parent?.qValue?.value),
  };
  branches.push({
    id: `branch-${sha256(stableIdentity).slice(0, 16)}`,
    parentStateId,
    daughterStateId: groundStateId(daughterNuclide.z, daughterNuclide.a),
    rawMode: decay.decayMode,
    displayMode: displayMode(decay.decayMode),
    branchingFractionReported: rawBranching !== null && rawBranching >= 0 && rawBranching <= 1 ? rawBranching : null,
    normalizationIncludesBranchingRatio: decay.parent?.normalizations?.branchingRatio?.includesBranchingRatio === true,
    qValueKeV: finite(decay.parent?.qValue?.value),
    source: { decayId: decay.id, dataset: decay.datasetSummary },
  });
}

const branchesByParentState = new Map();
const incomingCountByNuclide = new Map();
for (const branch of branches) {
  const outgoing = branchesByParentState.get(branch.parentStateId) ?? [];
  outgoing.push(branch);
  branchesByParentState.set(branch.parentStateId, outgoing);
  const daughterNuclideId = statesById.get(branch.daughterStateId)?.nuclideId;
  if (daughterNuclideId) incomingCountByNuclide.set(daughterNuclideId, (incomingCountByNuclide.get(daughterNuclideId) ?? 0) + 1);
}

const statesByNuclide = new Map();
for (const state of states) {
  const values = statesByNuclide.get(state.nuclideId) ?? [];
  values.push(state);
  statesByNuclide.set(state.nuclideId, values);
}

const indexNuclides = nuclides.map((sourceNuclide) => {
  const nuclide = {
    id: sourceNuclide.id,
    symbol: sourceNuclide.symbol,
    name: sourceNuclide.name,
    z: sourceNuclide.z,
    a: sourceNuclide.a,
    n: sourceNuclide.n,
  };
  const nuclideStates = statesByNuclide.get(nuclide.id) ?? [];
  const ground = nuclideStates.find((state) => state.stateIndex === 0);
  const outgoing = nuclideStates.flatMap((state) => branchesByParentState.get(state.id) ?? []);
  const rawGroundModes = ground?.decayBranchingRatios ? Object.entries(ground.decayBranchingRatios) : [];
  const primaryRawMode = rawGroundModes.sort(([, a], [, b]) => (finite(b?.value) ?? 0) - (finite(a?.value) ?? 0))[0]?.[0];
  const displayModeValue = ground?.stability === "stable" ? "stable" : displayMode(primaryRawMode ?? outgoing[0]?.rawMode);
  return {
    ...nuclide,
    stateIds: nuclideStates.map((state) => state.id),
    stateCount: nuclideStates.length,
    metastableCount: nuclideStates.filter((state) => state.metastable).length,
    branchCount: outgoing.length,
    incomingCount: incomingCountByNuclide.get(nuclide.id) ?? 0,
    stable: ground?.stability === "stable",
    displayMode: displayModeValue,
    detailShard: `/data/ensdf-atlas/z-${String(nuclide.z).padStart(3, "0")}.json`,
  };
});

const zValues = [...new Set(indexNuclides.map((nuclide) => nuclide.z))];
const shardDescriptors = [];
for (const z of zValues) {
  const shardNuclides = indexNuclides.filter((nuclide) => nuclide.z === z);
  const ids = new Set(shardNuclides.map((nuclide) => nuclide.id));
  const shardStates = states.filter((state) => ids.has(state.nuclideId));
  const stateIds = new Set(shardStates.map((state) => state.id));
  const shardBranches = branches.filter((branch) => stateIds.has(branch.parentStateId));
  const payload = { schemaVersion: 1, z, nuclides: shardNuclides, states: shardStates, branches: shardBranches };
  const integrity = sha256(payload);
  const filename = `z-${String(z).padStart(3, "0")}.json`;
  await mkdir(shardRoot, { recursive: true });
  await writeFile(resolve(shardRoot, filename), `${JSON.stringify({ ...payload, integrity: { algorithm: "sha256", value: integrity } })}\n`, "utf8");
  shardDescriptors.push({ z, path: `/data/ensdf-atlas/${filename}`, nuclides: shardNuclides.length, states: shardStates.length, branches: shardBranches.length, sha256: integrity });
}

const indexPayload = {
  schemaVersion: 1,
  source: {
    provider: snapshot.source.provider,
    database: snapshot.source.database,
    apiStatus: snapshot.source.apiStatus,
    dataGeneratedAt: snapshot.source.dataGeneratedAt,
    snapshotDataIntegrity: snapshot.dataIntegrity.value,
    redistributionStatus: snapshot.source.redistributionStatus,
  },
  counts: {
    nuclides: indexNuclides.length,
    states: states.length,
    groundStates: states.filter((state) => state.stateIndex === 0).length,
    metastableStates: states.filter((state) => state.metastable).length,
    branches: branches.length,
    stableStates: states.filter((state) => state.stability === "stable").length,
    shards: shardDescriptors.length,
  },
  modes: [...new Set(indexNuclides.map((nuclide) => nuclide.displayMode))],
  shards: shardDescriptors,
  nuclides: indexNuclides,
};
const index = { ...indexPayload, integrity: { algorithm: "sha256", value: sha256(indexPayload) } };

await mkdir(dirname(appIndexPath), { recursive: true });
await mkdir(dirname(publicIndexPath), { recursive: true });
const serialized = `${JSON.stringify(index)}\n`;
await writeFile(appIndexPath, serialized, "utf8");
await writeFile(publicIndexPath, serialized, "utf8");

console.log(`Atlas index: ${index.counts.nuclides} nuclides, ${index.counts.states} states, ${index.counts.branches} branches`);
console.log(`Stable: ${index.counts.stableStates}; metastable: ${index.counts.metastableStates}; shards: ${index.counts.shards}`);
console.log(`Index SHA-256: ${index.integrity.value}`);
