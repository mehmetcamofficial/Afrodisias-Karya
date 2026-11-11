/**
 * Admin authorization policy (pure, unit-testable).
 *
 * Authentication (who the user is) comes from the hosting platform's signed-in
 * user headers. Authorization (whether that user may administer the store) is
 * an explicit allowlist in the `ADMIN_EMAILS` environment variable, a comma or
 * whitespace separated list of e-mail addresses.
 *
 * Fail closed: when the allowlist is missing or empty, nobody is an admin.
 */
export function parseAdminAllowlist(raw: string | undefined | null): Set<string> {
  return new Set(
    (raw ?? "")
      .split(/[\s,;]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.includes("@")),
  );
}

export function isAdminEmail(email: string | null | undefined, allowlist: Set<string>): boolean {
  return Boolean(email) && allowlist.has(email!.trim().toLowerCase());
}
