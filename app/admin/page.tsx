import { adminEnvironment, loadAdminSnapshot } from "../../lib/admin-data";
import { requireAdminPage } from "../admin-auth";
import { AdminForbidden } from "../components/admin-forbidden";
import { AdminShell } from "../components/admin-shell";
import AdminClient from "./AdminClient";
import { AdminStatus, AdminUnavailable, AuditPanel, ContentShortcut } from "./AdminPanels";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const access = await requireAdminPage("/admin");
  if (access.status !== "admin") return <AdminForbidden email={access.user.email} configured={access.configured} />;
  const [snapshot, env] = [await loadAdminSnapshot(), adminEnvironment()];
  return (
    <AdminShell kicker="ALTIN DAL · YÖNETİM" title="Genel bakış">
      <AdminStatus env={env} snapshot={snapshot} />
      {snapshot.products && snapshot.orders
        ? <AdminClient initialProducts={snapshot.products} initialOrders={snapshot.orders} canPublish={env.publishing} />
        : <AdminUnavailable what="Katalog ve siparişler" />}
      <div className="admin-grid">
        <ContentShortcut />
        <AuditPanel audit={snapshot.audit} />
      </div>
    </AdminShell>
  );
}
