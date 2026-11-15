import "server-only";
import { neon } from "@neondatabase/serverless";
import type { SqlDriver } from "./repository";

/**
 * Neon HTTP driver for serverless Next.js API routes.
 * DATABASE_URL is server-side only and must point to the intended environment.
 * No credentials are logged, returned to clients, or committed to Git.
 */
export function requirePostgres(): SqlDriver {
  const url = process.env.DATABASE_URL;
  if (!url || !/^postgres(ql)?:\/\//.test(url)) {
    throw new Error("DATABASE_URL is missing or invalid");
  }
  if (isLocalTestDatabase(url)) return localDriver(url);
  const sql = neon(url);
  return {
    async query<T extends Record<string, unknown>>(statement: string, params: readonly unknown[] = []) {
      const rows = await sql.query(statement, [...params]) as T[];
      // Used for UPDATE ... RETURNING; other callers rely on returned rows.
      return { rows, rowCount: rows.length };
    },
  };
}

/**
 * Local admin E2E only: a plain TCP PostgreSQL on localhost (the Neon HTTP driver
 * cannot reach it). Never active on Vercel, never without the explicit opt-in flag,
 * never for a non-localhost host.
 */
export function isLocalTestDatabase(url: string, env: Record<string, string | undefined> = process.env) {
  return env.VERCEL !== "1" && env.LOCAL_PG_DRIVER === "1" && /^postgres(ql)?:\/\/[^@/]+@(localhost|127\.0\.0\.1)(:\d+)?\/[a-z0-9_]+$/.test(url);
}

type Pool = { query: (sql: string, params: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }> };
let localPool: Promise<Pool> | null = null;
function localDriver(url: string): SqlDriver {
  localPool ??= import(/* webpackIgnore: true */ "pg").then((mod) => {
    const pool = new (mod.default ?? mod).Pool({ connectionString: url, max: 4 });
    // An idle client dropped by the server must not crash the process; the next query reconnects.
    pool.on("error", () => undefined);
    return pool as unknown as Pool;
  });
  return {
    async query<T extends Record<string, unknown>>(statement: string, params: readonly unknown[] = []) {
      const result = await (await localPool!).query(statement, [...params]);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
  };
}
