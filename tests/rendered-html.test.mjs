import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Phenomena catalogue", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="ja">/i);
  assert.match(html, /<title>Phenomena \| Foundation v1<\/title>/i);
  assert.match(html, /PHENOMENA/);
  assert.match(html, /Make the invisible tangible/i);
  assert.match(html, /Nuclear Collection/);
  for (const slug of ["decay", "atlas", "detector", "pulse"]) assert.match(html, new RegExp(`/labs/${slug}`));
  assert.match(html, /LAB <!-- -->01/);
  assert.match(html, /LAB <!-- -->04/);
  assert.match(html, /教育用の簡略モデル/);
});

test("server-renders each Foundation lab route", async () => {
  const routes = [
    ["/labs/decay", /particle-svg/, /SIMULATOR/],
    ["/labs/atlas", /核種マップ/, /GENEALOGY/],
    ["/labs/detector", /LIVE COUNTS/, /GM/],
    ["/labs/pulse", /簡易スペクトル/, /蓄積イベント/],
  ];
  for (const [pathname, first, second] of routes) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.match(html, /PHENOMENA/);
    assert.match(html, first, pathname);
    assert.match(html, second, pathname);
  }
});

test("ships the shared registry, deterministic models, and existing decay implementation", async () => {
  const [registry, models, experiment, decay, pulse, css, packageJson, dataLicense] = await Promise.all([
    readFile(new URL("../app/lib/labs.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/nuclear-models.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/experiment.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/labs/decay/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/labs/pulse/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../public/data/LICENSE.ICRP-07.txt", import.meta.url), "utf8"),
  ]);
  assert.match(registry, /satisfies readonly LabManifest\[\]/);
  for (const id of ["decay", "atlas", "detector", "pulse"]) assert.match(registry, new RegExp(`id: "${id}"`));
  assert.match(registry, /datasets/);
  assert.match(registry, /assumptions/);
  assert.match(registry, /safety/);
  assert.match(experiment, /createSeededRandom/);
  assert.match(experiment, /saveExperimentState/);
  assert.match(experiment, /downloadCsv/);
  assert.match(models, /computeDetectorResponse/);
  assert.match(models, /generatePulseRun/);
  assert.match(models, /resolutionFwhm/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(decay, /requestAnimationFrame/);
  assert.match(decay, /exportHistoryCsv/);
  assert.match(decay, /NuclideGenealogy/);
  assert.match(decay, /DetectorLab/);
  assert.match(pulse, /generatePulseRun/);
  assert.match(packageJson, /"build:pages"/);
  assert.match(dataLicense, /Copyright \(c\) 2008 A\. Endo and K\.F\. Eckerman/);
});

test("keeps the old preview-only starter route absent", async () => {
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
