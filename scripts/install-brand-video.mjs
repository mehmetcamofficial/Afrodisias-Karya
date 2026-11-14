/**
 * Install one approved, locally supplied brand film into the Next.js project.
 * Usage: node scripts/install-brand-video.mjs hero /absolute/path/video.mp4 /absolute/path/poster.webp
 *
 * No network, no Production deployment, no Git operations. This script only
 * copies media and updates lib/media.ts when both files exist.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const [slot, videoArg, posterArg] = process.argv.slice(2);
const slots = {
  hero: "altin-dal-hero",
  grove: "altin-dal-harvest",
  experience: "altin-dal-experience",
};
if (!Object.hasOwn(slots, slot) || !videoArg || !posterArg)
  throw new Error("Usage: node scripts/install-brand-video.mjs <hero|grove|experience> <video.mp4> <poster.webp>");
if (process.env.VERCEL || process.env.VERCEL_ENV === "production")
  throw new Error("Do not install media in a Vercel/Production build runtime");
const video = resolve(videoArg), poster = resolve(posterArg);
if (!existsSync(video) || !existsSync(poster)) throw new Error("Both local media files must exist");
if (extname(video).toLowerCase() !== ".mp4" || extname(poster).toLowerCase() !== ".webp")
  throw new Error("Expected H.264 MP4 video and WebP poster");
if (statSync(video).size > 24 * 1024 * 1024) throw new Error("Video is too large for web; optimize first");
if (statSync(video).size < 100_000 || statSync(poster).size < 1000)
  throw new Error("Media seems corrupted");
const manifestFile = join(root, "lib", "media.ts");
let manifest = readFileSync(manifestFile, "utf8");
const start = manifest.indexOf(`  ${slot}: {`);
const next = manifest.indexOf("\n  },", start);
if (start < 0 || next < 0) throw new Error(`Cannot find media slot ${slot}`);
const prefix = slots[slot];
const videoPath = `/video/${prefix}.mp4`;
const posterPath = `/video/${prefix}-poster.webp`;
let block = manifest.slice(start, next + 5);
if (!/poster: "[^"]+"/.test(block) || !/video: \{[\s\S]*?\n    \},/.test(block))
  throw new Error("Media manifest format changed; review before installing");
block = block.replace(/poster: "[^"]+"/, `poster: "${posterPath}"`);
block = block.replace(/video: \{[\s\S]*?\n    \},/, `video: { default: { mp4: "${videoPath}" } },`);
const destDir = join(root, "public", "video");
mkdirSync(destDir, { recursive: true });
// Finish all validations before the first copy/write.
copyFileSync(video, join(destDir, basename(videoPath)));
copyFileSync(poster, join(destDir, basename(posterPath)));
manifest = manifest.slice(0, start) + block + manifest.slice(next + 5);
writeFileSync(manifestFile, manifest, "utf8");
console.log(`Installed ${slot}: ${videoPath} and ${posterPath}. Check Git diff, run tests, and commit only after review.`);
