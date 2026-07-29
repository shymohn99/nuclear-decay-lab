import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the nuclear decay lab", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="ja">/i);
  assert.match(html, /<title>Decay Lab \| 原子核崩壊シミュレーター<\/title>/i);
  assert.match(html, /核崩壊シミュレーター/);
  assert.match(html, /ヨウ素131/);
  assert.match(html, /核種と放射系列/);
  assert.match(html, /U-238系列/);
  assert.match(html, /Th-232系列/);
  assert.match(html, /U-235系列/);
  assert.match(html, /核種マップ/);
  assert.match(html, /放射系列の連鎖/);
  assert.match(html, /<th scope="col">娘核種<\/th>/);
  assert.match(html, /<th scope="col">半減期<\/th>/);
  assert.match(html, /現実の1秒/);
  assert.match(html, /約(?:<!-- -->)?1\.44日/);
  assert.match(html, /class="particle-svg"/i);
  assert.match(html, /aria-label="シミュレーション設定"/);
  assert.match(html, /N\(t\) = N₀/);
  assert.match(html, /<sup>131<\/sup><sub>53<\/sub>/);
  assert.match(html, /<sup>131<\/sup><sub>54<\/sub>/);
  assert.match(html, /@Shymohn all rights reserved/);
  assert.match(html, /fill="rgb\(221, 80, 78\)"/);
  assert.match(html, /stroke="rgb\(49, 163, 177\)"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("ships the simulation source without starter dependencies", async () => {
  const [page, css, layout, packageJson, radionuclides, dataLicense] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../app/radionuclides.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../public/data/LICENSE.ICRP-07.txt", import.meta.url),
        "utf8",
      ),
    ]);

  assert.match(page, /requestAnimationFrame/);
  assert.match(page, /Math\.pow\(0\.5/);
  assert.match(page, /observedPoints/);
  assert.match(page, /stroke=\{daughterColor\}/);
  assert.match(page, /fill=\{particleColor\}/);
  assert.match(page, /appendHistoryPoint/);
  assert.match(page, /points\.at\(-1\)\?\.remaining === point\.remaining/);
  assert.doesNotMatch(page, /MAX_HISTORY_POINTS|index % 2 === 0/);
  assert.match(page, /const toStepPath/);
  assert.match(page, /observedPath: toStepPath\(observed\)/);
  assert.match(page, /id="atom-count-input"/);
  assert.match(page, /MAX_ATOM_COUNT = 500/);
  assert.match(page, /VISUAL_UPDATE_INTERVAL_MS/);
  assert.match(page, /particleNodeRefs/);
  assert.doesNotMatch(page, /SIMULATION_FRAME_INTERVAL_MS/);
  assert.match(page, /copyEquation/);
  assert.match(page, /exportHistoryCsv/);
  assert.match(page, /function NuclideSymbol/);
  assert.match(page, /massNumber: 131, protonNumber: 53/);
  assert.match(page, /chartScale === "log"/);
  assert.match(page, /Math\.log10/);
  assert.match(page, /setChartScale\("log"\)/);
  assert.match(page, /className="decay-flow"/);
  assert.match(page, /https:\/\/x\.com\/Shymohn/);
  assert.match(page, /https:\/\/github\.com\/shymohn99/);
  assert.doesNotMatch(page, /feGaussianBlur/);
  assert.match(page, /iodine-131/);
  assert.match(page, /carbon-14/);
  assert.match(page, /cobalt-60/);
  assert.match(page, /polonium-210/);
  assert.match(page, /uranium-238/);
  assert.match(page, /thorium-232/);
  assert.match(page, /uranium-235/);
  assert.match(page, /radium-226/);
  assert.match(page, /radon-220/);
  assert.match(page, /actinium-227/);
  assert.match(page, /seriesPresets/);
  assert.match(page, /className="nuclide-table"/);
  assert.match(page, /type SimulationMode = "single" \| "chain"/);
  assert.match(page, /function getChainStages/);
  assert.match(page, /chainStage/);
  assert.match(page, /className="nuclide-map"/);
  assert.match(page, /startChainMode/);
  assert.match(page, /主要核種のみを表示しています/);
  assert.match(page, /className="chain-stage-copy"/);
  assert.match(page, /STEP \{String\(index \+ 1\)/);
  assert.match(page, /KNOWN_NUCLIDE_RANGES/);
  assert.match(page, /KNOWN_NUCLIDE_PATH/);
  assert.match(page, /MAP_RADIONUCLIDES/);
  assert.match(page, /MAP_ONLY_PRESETS/);
  assert.match(page, /FEATURED_INDEPENDENT_KEYS/);
  assert.match(page, /CORE_PRESETS\.filter/);
  assert.match(page, /選択可能/);
  assert.match(page, /function NuclideGenealogy/);
  assert.match(page, /NUCLIDE GENEALOGY/);
  assert.match(page, /PRESETS_BY_DAUGHTER/);
  assert.match(page, /DESCENDANTS \/ 娘核種への流れ/);
  assert.match(page, /function DetectorLab/);
  assert.match(page, /02 \/ DETECTOR LAB/);
  assert.match(page, /GM計数管/);
  assert.match(page, /シンチレーション検出器/);
  assert.match(page, /半導体検出器/);
  assert.match(page, /Math\.exp\(-shield\.coefficient/);
  assert.match(page, /信号 \/ 背景/);
  assert.match(page, /handleMapPointerMove/);
  assert.match(page, /addEventListener\("wheel", handleWheel, \{ passive: false \}\)/);
  assert.match(page, /event\.stopPropagation\(\)/);
  assert.match(page, /既知核種マップ: NNDC NuDat/);
  assert.match(page, /function formatSimulationRate/);
  assert.match(page, /SIMULATED_HALF_LIVES_PER_SECOND \*[\s\S]*speed/);
  assert.match(page, /TIME SCALE \/ 現実時間との対応/);
  assert.match(page, /経過時間（\$\{preset\.unit\} \/ \$\{preset\.parent\}基準）/);
  assert.match(page, /実時間が約/);
  assert.doesNotMatch(page, /段階T½|規格化時間|段階ごとに時間尺度/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /\.nuclide-map/);
  assert.match(css, /\.nuclide-map-known-field/);
  assert.match(css, /cursor:\s*grabbing/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /\.chain-track/);
  assert.match(css, /scroll-snap-type:\s*x proximity/);
  assert.match(css, /\.chain-stage-copy/);
  assert.match(css, /\.number-input/);
  assert.match(css, /\.genealogy-panel/);
  assert.match(css, /\.detector-lab-grid/);
  assert.match(css, /\.scope-bars/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(layout, /lang="ja"/);
  assert.match(radionuclides, /ICRP-107 \/ AME2020 \/ Nubase2020/);
  assert.ok(
    (radionuclides.match(/^\s+\["/gm) ?? []).length > 900,
    "核種マップ用データが900核種を超えている",
  );
  assert.doesNotMatch(radionuclides, /"\?+"/);
  assert.match(radionuclides, /unit: "秒" \| "分" \| "時間" \| "日" \| "年"/);
  assert.match(dataLicense, /Copyright \(c\) 2008 A\. Endo and K\.F\. Eckerman/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);

  await assert.rejects(
    access(new URL("../app/_sites-preview", import.meta.url)),
  );
});
