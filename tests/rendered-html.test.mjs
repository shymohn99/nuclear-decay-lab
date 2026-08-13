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
  assert.match(html, /A FIRST PASS \/ CO-60/);
  assert.match(html, /\/labs\/atlas\?nuclide=Co-60/);
  assert.match(html, /\/labs\/decay\?nuclide=Co-60/);
  assert.match(html, /\/labs\/detector\?source=cobalt-60/);
  assert.match(html, /\/labs\/pulse\?source=cobalt-60/);
  for (const slug of ["decay", "atlas", "detector", "pulse"]) {
    assert.match(html, new RegExp(`/labs/${slug}`));
  }
  assert.match(html, /LAB <!-- -->01/);
  assert.match(html, /LAB <!-- -->04/);
  assert.match(html, /教育用の概念モデルです/);
});

test("server-renders every Foundation Lab route and migration route", async () => {
  const routes = [
    ["/labs/decay", /particle-svg/, /SIMULATOR/, /<title>Decay Lab \| Phenomena<\/title>/],
    ["/labs/atlas", /MAP \/ SELECTION/, /atlas-nuclide-search/, /<title>Nuclide Atlas \| Phenomena<\/title>/],
    ["/labs/detector", /RELATIVE EXPECTATION/, /GM/, /<title>Detector Lab \| Phenomena<\/title>/],
    ["/labs/pulse", /EVENT STREAM/, /Pulse Lab/, /<title>Pulse Lab \| Phenomena<\/title>/],
    ["/decay", /Decay Lab has moved/, /Open Decay Lab/, /<title>Decay Lab \| Phenomena<\/title>/],
  ];
  for (const [pathname, first, second, title] of routes) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.match(html, first, pathname);
    assert.match(html, second, pathname);
    if (title) assert.match(html, title, pathname);
  }
});

test("ships a typed registry, common state primitives, and bounded science models", async () => {
  const [registry, shell, experiment, models, home, legacyDecay, decay, atlas, detector, pulse, layout, site, pagesBuild, css, readme, authoring, provenance, stateDocument, sitemap, dataLicense] = await Promise.all([
    readFile(new URL("../app/lib/labs.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/PhenomenaShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/experiment.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/nuclear-models.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/decay/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/labs/decay/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/labs/atlas/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/labs/detector/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/labs/pulse/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/site.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/build-pages.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/LAB_AUTHORING.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/DATA_PROVENANCE.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/PHENOMENA_STATE.md", import.meta.url), "utf8"),
    readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8"),
    readFile(new URL("../public/data/LICENSE.TXT", import.meta.url), "utf8"),
  ]);
  assert.match(registry, /satisfies readonly LabManifest\[\]/);
  assert.match(registry, /licenseHref/);
  for (const id of ["decay", "atlas", "detector", "pulse"]) assert.match(registry, new RegExp(`id: "${id}"`));
  for (const field of ["datasets", "assumptions", "constraints", "variables", "stateKey", "citations", "licenses", "safety"]) assert.match(registry, new RegExp(field));
  assert.match(registry, /id: "reset-seed"/);
  assert.match(shell, /LabStateTools/);
  assert.match(shell, /ModelDisclosure/);
  assert.match(shell, /stateStatus/);
  assert.match(shell, /lab-state-tools" role="group"/);
  assert.match(shell, /skip-link/);
  assert.match(shell, /provenance-link/);
  assert.match(shell, /opens in a new tab/);
  assert.match(shell, /restoreOnMount/);
  assert.match(shell, /aria-current=.*page/);
  assert.doesNotMatch(shell, /onRestore\(fallback\)/);
  assert.match(experiment, /createSeededRandom/);
  assert.match(experiment, /saveExperimentState/);
  assert.match(experiment, /downloadCsv/);
  assert.match(experiment, /experimentProvenanceRows/);
  assert.match(experiment, /withExperimentQuery/);
  assert.match(experiment, /readExperimentQuery/);
  assert.match(experiment, /replaceExperimentQuery/);
  assert.match(home, /"#simulator": "\/labs\/decay"/);
  assert.match(home, /"#detector-lab": "\/labs\/detector"/);
  assert.match(home, /"#genealogy": "\/labs\/atlas"/);
  assert.match(home, /\$\{legacyTarget\}\$\{window\.location\.search\}/);
  assert.match(home, /skip-link/);
  assert.match(home, /opens in a new tab/);
  assert.match(models, /computeDetectorResponse/);
  assert.match(models, /generatePulseRun/);
  assert.match(models, /binPulseEvents/);
  assert.match(models, /Uniform background is intentional/);
  assert.match(decay, /RELATIVE DETECTOR MODEL/);
  assert.match(decay, /RELATIVE RESPONSE/);
  assert.match(decay, /Lab navigation/);
  assert.match(decay, /01 \/ Decay/);
  assert.match(decay, /skip-link/);
  assert.match(decay, /Known nuclides: NNDC NuDat/);
  assert.match(decay, /Display limit — decay continues/);
  assert.match(decay, /at display limit/);
  assert.match(decay, /chain-track-instructions/);
  assert.match(decay, /tabIndex=\{0\}/);
  assert.match(decay, /handleChainTrackKeyDown/);
  assert.doesNotMatch(decay, /reached stable/);
  assert.match(decay, /opens in a new tab/);
  assert.match(decay, /Software: MIT/);
  assert.doesNotMatch(decay, /all rights reserved/);
  assert.match(decay, /routeNuclide/);
  assert.match(decay, /requestedRoutePreset/);
  assert.match(decay, /decayRandomRef/);
  assert.match(decay, /interactionRandomRef/);
  assert.match(decay, /RESET SEED/);
  assert.match(decay, /commitResetSeed/);
  assert.match(decay, /MAX_RESET_SEED/);
  assert.match(decay, /hasInitializedSimulationRef/);
  assert.match(decay, /inputMode="numeric"/);
  assert.doesNotMatch(decay, /Math\.random/);
  assert.doesNotMatch(decay, /<small>cps<\/small>/);
  assert.match(legacyDecay, /window\.location\.search/);
  assert.match(legacyDecay, /window\.location\.hash/);
  assert.match(atlas, /normalizeNuclideSearch/);
  assert.match(atlas, /matchesDecay/);
  assert.match(atlas, /atlas-nuclide-search/);
  assert.match(atlas, /atlas-search-results" role="group"/);
  assert.match(atlas, /searchMatches\.slice\(0, 12\)/);
  assert.match(atlas, /onKeyDown/);
  assert.doesNotMatch(atlas, /atlas-nuclide-select/);
  for (const lab of [atlas, detector, pulse, decay]) assert.match(lab, /replaceExperimentQuery/);
  for (const lab of [atlas, detector, pulse, decay]) assert.match(lab, /requestedRoute/);
  assert.match(atlas, /restoreOnMount=\{!requestedRouteRecord\}/);
  assert.match(detector, /restoreOnMount=\{!requestedRouteSource\}/);
  assert.match(pulse, /restoreOnMount=\{!requestedRouteSource\}/);
  assert.match(decay, /restoreOnMount=\{!requestedRoutePreset\}/);
  for (const lab of [detector, pulse, decay]) assert.match(lab, /experimentProvenanceRows/);
  assert.match(detector, /SHAREABLE SOURCE/);
  assert.match(detector, /relativeVariationIndexPercent/);
  assert.doesNotMatch(detector, /√N/);
  assert.match(pulse, /SHAREABLE SOURCE/);
  assert.match(detector, /\/labs\/pulse\?source=\$\{source\.id\}/);
  assert.match(pulse, /\/labs\/detector\?source=\$\{source\.id\}/);
  assert.match(pulse, /role="status"/);
  assert.doesNotMatch(pulse, /pulse-event-stream" aria-live/);
  assert.doesNotMatch([home, decay, atlas, detector, pulse].join("\n"), /\bfetch\s*\(/);
  assert.match(layout, /socialImagePath/);
  assert.match(site, /createLabMetadata/);
  assert.match(site, /siteBasePath/);
  assert.match(site, /og-phenomena\.png/);
  assert.match(site, /\/labs\/\$\{slug\}\//);
  assert.match(site, /https:\/\/shymohn99\.github\.io/);
  assert.doesNotMatch(site, /chatgpt\.site/);
  assert.match(pagesBuild, /verifyPagesOutput/);
  assert.match(pagesBuild, /The catalogue is missing its Pages canonical URL/);
  assert.match(pagesBuild, /LICENSE\.TXT/);
  assert.match(pagesBuild, /LICENSE\.ICRP-07\.txt/);
  for (const slug of ["decay", "atlas", "detector", "pulse"]) assert.match(sitemap, new RegExp(`/labs/${slug}/`));
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /transition-duration: 0\.01ms !important/);
  assert.match(css, /\.atlas-search-results/);
  assert.match(css, /\.header-links \{ flex: 1 0 100%; order: 2;/);
  assert.match(css, /@media \(max-width: 340px\)/);
  assert.match(css, /\.phenomena-header/);
  assert.match(css, /\.chain-stage\.is-display-limit/);
  assert.match(css, /DISPLAY LIMIT/);
  assert.match(css, /\.chain-track:focus-visible/);
  assert.match(css, /\.reset-seed/);
  assert.match(css, /\.reset-seed input/);
  assert.match(css, /\.pulse-spectrum/);
  assert.match(readme, /Phenomena Foundation v1/);
  assert.match(authoring, /createLabMetadata/);
  assert.match(authoring, /app\/labs\/\<slug\>\/layout\.tsx/);
  assert.match(provenance, /ICRP-07/);
  assert.match(provenance, /not for radiation safety/i);
  for (const heading of ["Current phase", "Baseline and confirmed decisions", "Verification checkpoint", "Known scientific and product limits", "Recommended next goal"]) assert.match(stateDocument, new RegExp(heading));
  assert.ok(stateDocument.split(/\r?\n/).length <= 110);
  assert.match(dataLicense, /Copyright \(c\) 2008 A\. Endo and K\.F\. Eckerman/);
});

test("keeps the preview-only starter route absent", async () => {
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
