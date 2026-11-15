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
  const sql = neon(url);
  return {
    async query<T extends Record<string, unknown>>(statement: string, params: readonly unknown[] = []) {
      const rows = await sql.query(statement, [...params]) as T[];
      // Used for UPDATE ... RETURNING; other callers rely on returned rows.
      return { rows, rowCount: rows.length };
    },
  };
}
