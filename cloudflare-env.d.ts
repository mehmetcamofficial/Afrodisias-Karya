declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    /** Comma-separated e-mail allowlist for /admin and admin APIs. Unset = no admins (fail closed). */
    ADMIN_EMAILS?: string;
  }
}
