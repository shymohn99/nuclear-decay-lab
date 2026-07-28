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
  assert.match(html, /ポロニウム210/);
  assert.match(html, /class="particle-svg"/i);
  assert.match(html, /aria-label="シミュレーション設定"/);
  assert.match(html, /N\(t\) = N₀/);
  assert.match(html, /¹³¹₅₃I → ¹³¹₅₄Xe/);
  assert.match(html, /@Shymohn all rights reserved/);
  assert.match(html, /fill="rgb\(221, 80, 78\)"/);
  assert.match(html, /stroke="rgb\(49, 163, 177\)"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("ships the simulation source without starter dependencies", async () => {
  const [page, css, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /requestAnimationFrame/);
  assert.match(page, /Math\.pow\(0\.5/);
  assert.match(page, /observedPoints/);
  assert.match(page, /stroke=\{daughterColor\}/);
  assert.match(page, /fill=\{particleColor\}/);
  assert.match(page, /appendHistoryPoint/);
  assert.match(page, /VISUAL_UPDATE_INTERVAL_MS/);
  assert.doesNotMatch(page, /feGaussianBlur/);
  assert.match(page, /iodine-131/);
  assert.match(page, /carbon-14/);
  assert.match(page, /cobalt-60/);
  assert.match(page, /polonium-210/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(layout, /lang="ja"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);

  await assert.rejects(
    access(new URL("../app/_sites-preview", import.meta.url)),
  );
});
