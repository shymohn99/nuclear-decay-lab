import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

const API_ROOT = "https://www.nndc.bnl.gov/ensdf-api/";
const DEFAULT_OUTPUT = "work/ensdf/ensdf-atlas.snapshot.json";

function outputPathFromArgs() {
  const index = process.argv.indexOf("--output");
  const requested = index >= 0 ? process.argv[index + 1] : DEFAULT_OUTPUT;
  if (!requested) throw new Error("--output requires a path");
  const output = resolve(process.cwd(), requested);
  const workRoot = resolve(process.cwd(), "work");
  const pathFromWork = relative(workRoot, output);
  if (pathFromWork.startsWith("..") || resolve(workRoot, pathFromWork) !== output) {
    throw new Error("ENSDF snapshots must stay inside the ignored work/ directory until redistribution review is complete.");
  }
  return output;
}

async function fetchJson(path) {
  const response = await fetch(new URL(path.replace(/^\//, ""), API_ROOT), { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${response.url}`);
  return response.json();
}

async function fetchPages(path, limit) {
  const results = [];
  let offset = 0;
  let expectedTotal = null;
  while (expectedTotal === null || offset < expectedTotal) {
    const separator = path.includes("?") ? "&" : "?";
    const page = await fetchJson(`${path}${separator}limit=${limit}&offset=${offset}`);
    if (!page?.meta || !Array.isArray(page.results)) throw new Error(`Unexpected page shape: ${path}`);
    if (expectedTotal === null) expectedTotal = page.meta.total;
    if (page.meta.total !== expectedTotal) throw new Error(`Total changed during fetch: ${path}`);
    results.push(...page.results);
    if (!page.results.length) break;
    offset += page.results.length;
  }
  if (results.length !== expectedTotal) throw new Error(`Incomplete fetch for ${path}: ${results.length}/${expectedTotal}`);
  return results;
}

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

const output = outputPathFromArgs();
const retrievedAt = new Date().toISOString();
const release = await fetchJson("/meta/release");
const [nuclides, groundStates, decays] = await Promise.all([
  fetchPages("/nuclides", 500),
  fetchPages("/levels?document-type=adopted&level-index-max=0", 2_000),
  fetchPages("/decays", 2_000),
]);

const knownNuclideNames = new Set(nuclides.map((nuclide) => nuclide.name.toUpperCase()));
const danglingDecays = decays.filter((decay) =>
  !knownNuclideNames.has(decay.parent?.name?.toUpperCase()) ||
  !knownNuclideNames.has(decay.daughter?.name?.toUpperCase()));
if (danglingDecays.length) throw new Error(`${danglingDecays.length} decay records reference missing nuclides`);

const data = {
  release,
  counts: { nuclides: nuclides.length, groundStates: groundStates.length, decays: decays.length },
  nuclides,
  groundStates,
  decays,
};
const payload = {
  schemaVersion: 1,
  source: {
    provider: "National Nuclear Data Center",
    database: "ENSDF",
    apiRoot: API_ROOT,
    apiStatus: "public-beta",
    retrievedAt,
    dataGeneratedAt: release.dataGeneratedAt ?? null,
    termsHref: "https://www.nndc.bnl.gov/nudat3/guide/#terms",
    redistributionStatus: "review-required-before-bundling",
  },
  dataIntegrity: { algorithm: "sha256", value: sha256(data) },
  ...data,
};
const snapshot = { ...payload, integrity: { algorithm: "sha256", value: sha256(payload) } };

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(snapshot)}\n`, "utf8");
console.log(`ENSDF snapshot: ${relative(process.cwd(), output)}`);
console.log(`Release: ${snapshot.source.dataGeneratedAt ?? "unknown"}`);
console.log(`Nuclides: ${snapshot.counts.nuclides}; ground states: ${snapshot.counts.groundStates}; decays: ${snapshot.counts.decays}`);
console.log(`Data SHA-256: ${snapshot.dataIntegrity.value}`);
console.log(`SHA-256: ${snapshot.integrity.value}`);
