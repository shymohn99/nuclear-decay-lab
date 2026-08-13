import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

const pagesBasePath = "/nuclear-decay-lab";

function verifyPagesOutput() {
  const requiredFiles = [
    "out/index.html",
    "out/decay/index.html",
    "out/labs/decay/index.html",
    "out/labs/atlas/index.html",
    "out/labs/detector/index.html",
    "out/labs/pulse/index.html",
    "out/og-phenomena.png",
    "out/data/LICENSE.TXT",
    "out/data/LICENSE.ICRP-07.txt",
    "out/sitemap.xml",
  ];
  for (const file of requiredFiles) {
    if (!existsSync(file)) throw new Error(`GitHub Pages output is missing ${file}.`);
  }

  const rootHtml = readFileSync("out/index.html", "utf8");
  const rootCanonical = `https://shymohn99.github.io${pagesBasePath}/`;
  if (!rootHtml.includes(`${pagesBasePath}/_next/`)) {
    throw new Error("The catalogue is missing a base-path-prefixed asset.");
  }
  if (!rootHtml.includes(`href="${rootCanonical}"`)) {
    throw new Error("The catalogue is missing its Pages canonical URL.");
  }
  if (!rootHtml.includes(`https://shymohn99.github.io${pagesBasePath}/og-phenomena.png`)) {
    throw new Error("The catalogue is missing its Pages social image.");
  }

  const routes = ["decay", "atlas", "detector", "pulse"];
  for (const slug of routes) {
    const html = readFileSync(`out/labs/${slug}/index.html`, "utf8");
    const canonical = `https://shymohn99.github.io${pagesBasePath}/labs/${slug}/`;
    if (!html.includes(`${pagesBasePath}/_next/`)) throw new Error(`${slug} is missing a base-path-prefixed asset.`);
    if (!html.includes(`href="${canonical}"`)) throw new Error(`${slug} is missing its Pages canonical URL.`);
    if (!html.includes(`https://shymohn99.github.io${pagesBasePath}/og-phenomena.png`)) throw new Error(`${slug} is missing its Pages social image.`);
  }

  const atlasHtml = readFileSync("out/labs/atlas/index.html", "utf8");
  if (!atlasHtml.includes(`href="${pagesBasePath}/data/LICENSE.TXT"`)) {
    throw new Error("Atlas is missing its base-path-prefixed ICRP LICENSE.TXT link.");
  }
  const legacyDecayHtml = readFileSync("out/decay/index.html", "utf8");
  if (!legacyDecayHtml.includes(`href="${pagesBasePath}/labs/decay/"`)) {
    throw new Error("The legacy Decay fallback link is missing its Pages base path.");
  }
  const sitemap = readFileSync("out/sitemap.xml", "utf8");
  for (const slug of routes) {
    const canonical = `https://shymohn99.github.io${pagesBasePath}/labs/${slug}/`;
    if (!sitemap.includes(`<loc>${canonical}</loc>`)) throw new Error(`Sitemap is missing ${slug}.`);
  }
}

const result = spawnSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", "build"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      GITHUB_PAGES: "true",
    },
  },
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

writeFileSync("out/.nojekyll", "");
verifyPagesOutput();
