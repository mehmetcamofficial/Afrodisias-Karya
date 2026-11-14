// Rasterise assets/product-illustrations/*.svg into optimised WebP files in
// public/products/illustrations/. Uses the preinstalled Playwright Chromium for
// faithful SVG text rendering and sharp for WebP encoding.
//
// Usage: node scripts/render-illustrations.mjs [srcDir] [outDir]
import { readdirSync, readFileSync, mkdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const sharp = require(process.env.SHARP_PATH || "sharp");

const src = process.argv[2] || "assets/product-illustrations";
const out = process.argv[3] || "public/products/illustrations";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
for (const file of readdirSync(src).filter((name) => name.endsWith(".svg")).sort()) {
  const svg = readFileSync(path.join(src, file), "utf8");
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`);
  const png = await page.locator("svg").screenshot({ type: "png" });
  const target = path.join(out, file.replace(/\.svg$/, ".webp"));
  await sharp(png).webp({ quality: 80, effort: 6 }).toFile(target);
  console.log(`${target} ${Math.round(statSync(target).size / 1024)} KB`);
}
await browser.close();
