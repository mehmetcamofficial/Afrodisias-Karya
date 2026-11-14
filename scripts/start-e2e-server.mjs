// Local Playwright fixture only. No deployment or production startup may use this launcher.
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.DATABASE_URL)
  throw new Error("Refusing to run the fixture launcher in a hosted or DB-connected environment");
const dir = resolve(process.cwd(), ".sites-runtime");
mkdirSync(dir, { recursive: true });
const marker = resolve(dir, "e2e-catalog.fixture");
if (existsSync(marker))
  throw new Error("Stale E2E fixture marker found; clean it before running E2E");
writeFileSync(marker, "ephemeral\n", { flag: "wx", mode: 0o600 });
console.info("[E2E-FIXTURE-LAUNCH]", JSON.stringify({ cwd: process.cwd(), markerPath: marker, markerReady: existsSync(marker) }));
const child = spawn("pnpm", ["dev"], { stdio: "inherit", env: process.env });
const clean = () => { try { unlinkSync(marker); } catch { /* server interrupted */ } };
child.once("exit", (code) => { clean(); process.exit(code ?? 1); });
child.once("error", (error) => { clean(); console.error(error); process.exit(1); });
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => { child.kill(signal); clean(); });
}
