import { listCmsProducts } from "../../../db/postgres/cms-repository";
import { requirePostgres } from "../../../db/postgres/driver";
import { listCollections, type CmsCollection } from "../../../db/postgres/showcase-repository";
import { adminEnvironment } from "../../../lib/admin-environment";
import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";
import { AdminUnavailable } from "../AdminPanels";
import { CollectionsCms } from "../ShowcaseCms";

export const dynamic = "force-dynamic";

export default async function Page() {
  const access = await requireAdminPage("/admin/koleksiyonlar");
  if (access.status !== "admin") return <AdminForbidden email={access.user.email} configured={access.configured} />;
  let data: { collections: CmsCollection[]; products: Array<{ id: string; name: string; status: string }> } | null = null;
  try {
    const db = requirePostgres();
    const [collections, products] = await Promise.all([listCollections(db, { includeArchived: true }), listCmsProducts(db)]);
    data = { collections, products: products.map((p) => ({ id: p.id, name: p.tr.name, status: p.status })) };
  } catch { data = null; }
  return (
    <AdminShell kicker="KOLEKSİYON CMS" title="Koleksiyonlar">
      {data ? <CollectionsCms initial={data.collections} products={data.products} role={access.role} publishingEnabled={adminEnvironment().publishing} /> : <AdminUnavailable what="Koleksiyon CMS" />}
    </AdminShell>
  );
}
