/**
 * Cost guards. Numbers come from env with conservative defaults.
 *  AI_ADMIN_DAILY_LIMIT   admin AI drafts per rolling 24h (counted in audit_logs, shared across instances)
 *  AI_PUBLIC_DAILY_LIMIT  visitor assistant answers per 24h per server instance
 *  AI_PUBLIC_PER_IP       visitor assistant answers per IP hash per 10 minutes per instance
 */
export function limitFromEnv(name: string, fallback: number, env: Record<string, string | undefined> = process.env) {
  const value = Number(env[name]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

export const MAX_INPUT_CHARS = 6000;

/** Sliding-window in-memory limiter (per server instance; documented as such). */
export class WindowLimiter {
  private hits = new Map<string, number[]>();
  constructor(private readonly max: number, private readonly windowMs: number) {}
  take(key: string, now = Date.now()) {
    const recent = (this.hits.get(key) ?? []).filter((time) => time > now - this.windowMs);
    if (recent.length >= this.max) { this.hits.set(key, recent); return false; }
    recent.push(now); this.hits.set(key, recent);
    if (this.hits.size > 5000) this.hits.delete(this.hits.keys().next().value!);
    return true;
  }
}
