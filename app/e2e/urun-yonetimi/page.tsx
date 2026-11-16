import { notFound } from "next/navigation";
import { AdminShell } from "../../components/admin-shell";
import { ProductCms } from "../../admin/ProductCms";
import { e2eAdminProducts } from "../../../lib/e2e-admin-fixtures";
import { isRole } from "../../../lib/cms-permissions";

declare const __ALTINDAL_E2E_FIXTURE__: boolean;
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

/**
 * E2E harness for the product CMS UI. Exists ONLY in the Vite test build
 * (__ALTINDAL_E2E_FIXTURE__); every Next/Vercel build answers 404. The API is
 * mocked by the test; server-side RBAC is covered by unit + PostgreSQL tests.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  if (!(typeof __ALTINDAL_E2E_FIXTURE__ !== "undefined" && __ALTINDAL_E2E_FIXTURE__)) notFound();
  const { role } = await searchParams;
  return (
    <AdminShell kicker="ÜRÜN CMS · E2E TEST" title="Ürün yönetimi (test)">
      <ProductCms initialProducts={e2eAdminProducts} role={isRole(role) ? role : "owner"} publishingEnabled images={{}} />
    </AdminShell>
  );
}
