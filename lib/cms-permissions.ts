/**
 * CMS roles and permissions (pure; enforced server-side in every API route).
 *
 * - owner:  ADMIN_EMAILS bootstrap accounts. Everything, including approve,
 *           publish, restore, permanent delete and user management.
 * - editor: admin_users role. Create/edit/duplicate, submit for review,
 *           archive drafts, write blog drafts, use the AI studio (drafts only).
 * - viewer: admin_users role. Read-only.
 *
 * AI never holds a role: AI output is always a suggestion an editor saves.
 */
export type Role = "owner" | "editor" | "viewer" | "accountant";

export const PERMISSIONS = [
  "cms.read",
  "product.write",
  "product.submit",
  "product.archive",
  "product.approve",
  "product.publish",
  "product.restore",
  "product.delete",
  "blog.write",
  "blog.publish",
  "blog.delete",
  "inquiry.manage",
  "users.manage",
  "ai.use",
  "finance.read",
  "finance.write",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const grants: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  editor: ["cms.read", "product.write", "product.submit", "product.archive", "blog.write", "inquiry.manage", "ai.use"],
  viewer: ["cms.read"],
  // Finance-only role: no CMS rights; finance.write records entries but cannot change users or publish.
  accountant: ["finance.read", "finance.write"],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return Boolean(role) && grants[role!].includes(permission);
}

export function isRole(value: unknown): value is Role {
  return value === "owner" || value === "editor" || value === "viewer" || value === "accountant";
}
