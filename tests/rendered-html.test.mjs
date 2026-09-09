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

test("server-renders the visual-first four-Lab index", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="ja">/i);
  assert.match(html, /<title>Phenomena \| Foundation v1<\/title>/i);
  assert.match(html, /PHENOMENA/);
  assert.match(html, /Make the invisible tangible/i);
  assert.match(html, /SELECT A LAB/);
  assert.match(html, /何を観察しますか？/);
  assert.match(html, /href="\/about"/);
  for (const slug of ["decay", "atlas", "detector", "pulse"]) {
    assert.match(html, new RegExp(`/labs/${slug}`));
    assert.match(html, new RegExp(`home-lab-card--${slug}`));
  }
  assert.equal(html.match(/class="home-lab-card home-lab-card--/g)?.length, 4);
  assert.match(html, /LAB <!-- -->01/);
  assert.match(html, /LAB <!-- -->04/);
  assert.doesNotMatch(html, /放射線安全、被ばく線量/);
});

test("server-renders every Foundation Lab route and migration route", async () => {
  const routes = [
    ["/labs/decay", /particle-svg/, /SIMULATOR/, /<title>Decay Lab \| Phenomena<\/title>/],
    ["/labs/atlas", /MAP \/ SELECTION/, /atlas-nuclide-search/, /<title>Nuclide Atlas \| Phenomena<\/title>/],
    ["/labs/detector", /RELATIVE EXPECTATION/, /GM/, /<title>Detector Lab \| Phenomena<\/title>/],
    ["/labs/pulse", /EVENT STREAM/, /Pulse Lab/, /<title>Pulse Lab \| Phenomena<\/title>/],
    ["/decay", /Decay Lab has moved/, /Open Decay Lab/, /<title>Decay Lab \| Phenomena<\/title>/],
    ["/about", /MODEL INDEX/, /大学教育のためのモデルです。/, /<title>About the models \| Phenomena<\/title>/],
  ];
  for (const [pathname, first, second, title] of routes) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.match(html, first, pathname);
    assert.match(html, second, pathname);
    if (title) assert.match(html, title, pathname);
    const labSlug = pathname.match(/^\/labs\/([^/]+)$/)?.[1];
    if (labSlug) assert.match(html, new RegExp(`href="/about#${labSlug}"`), pathname);
  }

  const decayResponse = await render("/labs/decay");
  const decayHtml = await decayResponse.text();
  assert.match(decayHtml, /field-play-toggle/);
  assert.match(decayHtml, /primary-nuclide-select/);
  assert.match(decayHtml, /<details class="advanced-details">/);
  assert.match(decayHtml, /decay-handoff-card--atlas/);
  assert.match(decayHtml, /decay-handoff-card--detector/);
  assert.match(decayHtml, /href="\/about#decay"/);
  assert.doesNotMatch(decayHtml, /nuclide-map-stage/);
  assert.doesNotMatch(decayHtml, /genealogy-panel/);
  assert.doesNotMatch(decayHtml, /detector-section/);
});

test("ships a typed registry, common state primitives, and bounded science models", async () => {
  const [registry, shell, experiment, models, home, about, legacyDecay, decay, atlas, detector, pulse, layout, site, pagesBuild, css, readme, authoring, provenance, stateDocument, sitemap, dataLicense] = await Promise.all([
    readFile(new URL("../app/lib/labs.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/PhenomenaShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/experiment.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/nuclear-models.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/about/page.tsx", import.meta.url), "utf8"),
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
  assert.match(home, /home-lab-grid/);
  for (const id of ["decay", "atlas", "detector", "pulse"]) {
    assert.match(home, new RegExp(`lab-preview--${id}`));
  }
  assert.match(home, /onPointerEnter/);
  assert.match(home, /onPointerDown/);
  assert.match(home, /onFocusCapture/);
  assert.match(home, /home-lab-card__preview-trigger/);
  assert.match(home, /Wake preview/);
  assert.doesNotMatch(home, /openFromCard/);
  assert.doesNotMatch(home, /event\.preventDefault\(\)/);
  assert.match(home, /href="\/about"/);
  assert.doesNotMatch(home, /SafetyNote/);
  assert.doesNotMatch(home, /principles-section/);
  assert.match(about, /id=\{lab\.id\}/);
  assert.match(about, /modelNotes/);
  assert.match(about, /about-formula/);
  assert.match(about, /lab\.assumptions/);
  assert.match(about, /lab\.constraints/);
  assert.match(about, /lab\.datasets/);
  assert.match(about, /\.\.\.lab\.citations, \.\.\.lab\.licenses/);
  assert.doesNotMatch(about, /<b aria-hidden="true">↓<\/b>/);
  assert.match(about, /大学教育のためのモデルです。/);
  assert.match(about, /放射線安全、被ばく線量/);
  assert.match(models, /computeDetectorResponse/);
  assert.match(models, /generatePulseRun/);
  assert.match(models, /binPulseEvents/);
  assert.match(models, /Uniform background is intentional/);
  assert.match(decay, /Lab navigation/);
  assert.match(decay, /01 \/ Decay/);
  assert.match(decay, /skip-link/);
  assert.match(decay, /field-play-toggle/);
  assert.match(decay, /aria-pressed=\{!paused\}/);
  assert.match(decay, /primary-nuclide-select/);
  assert.match(decay, /advanced-details/);
  assert.match(decay, /decay-handoff-card--atlas/);
  assert.match(decay, /encodeURIComponent\(handoffNuclide\)/);
  assert.match(decay, /decay-handoff-card--detector/);
  assert.match(decay, /\/about#decay/);
  assert.match(decay, /Display limit — decay continues/);
  assert.match(decay, /at display limit/);
  assert.match(decay, /chain-track-instructions/);
  assert.match(decay, /tabIndex=\{0\}/);
  assert.match(decay, /handleChainTrackKeyDown/);
  assert.doesNotMatch(decay, /reached stable/);
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
  assert.match(css, /--lab-decay-text: #a64221/);
  assert.match(css, /--lab-detector-text: #536918/);
  assert.match(css, /\.home-lab-card__preview-trigger/);
  assert.match(css, /@media \(min-width: 921px\)/);
  assert.match(css, /\.chain-stage\.is-display-limit/);
  assert.match(css, /DISPLAY LIMIT/);
  assert.match(css, /\.chain-track:focus-visible/);
  assert.match(css, /\.reset-seed/);
  assert.match(css, /\.reset-seed input/);
  assert.match(css, /\.lab-shell:has\(\.field-play-toggle\)/);
  assert.match(css, /\.field-play-toggle/);
  assert.match(css, /\.advanced-details/);
  assert.match(css, /\.decay-handoff-grid/);
  assert.match(css, /\.decay-boundary/);
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
