import { requirePostgres } from "../../../db/postgres/driver";
import { listOrders } from "../../../db/postgres/repository";
import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";
import { OrderManager, type ManagedOrder } from "../OrderManager";

export const dynamic = "force-dynamic";

export default async function Page() {
  const access = await requireAdminPage("/admin/siparisler");
  if (access.status !== "admin")
    return <AdminForbidden email={access.user.email} configured={access.configured} />;
  const rows = await listOrders(requirePostgres());
  return (
    <AdminShell kicker="SİPARİŞ YÖNETİMİ" title="Ödeme, kargo ve fatura">
      <OrderManager initialOrders={rows as ManagedOrder[]} />
    </AdminShell>
  );
}
