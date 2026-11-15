import { listAuditLogs, type AuditRow } from "../../../db/postgres/cms-repository";
import { requirePostgres } from "../../../db/postgres/driver";
import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";
import { AdminUnavailable } from "../AdminPanels";
import { AuditViewer } from "../ModuleClients";

export const dynamic = "force-dynamic";

export default async function Page() {
  const access = await requireAdminPage("/admin/denetim");
  if (access.status !== "admin") return <AdminForbidden email={access.user.email} configured={access.configured} />;
  let rows: AuditRow[] | null = null;
  try { rows = await listAuditLogs(requirePostgres(), { limit: 50 }); } catch { rows = null; }
  return (
    <AdminShell kicker="DENETİM KAYITLARI" title="Kim, neyi, ne zaman değiştirdi">
      <div className="admin-notice" role="note">Denetim tablosu veritabanı tetikleyicisiyle yalnızca eklemeye açıktır; kayıtlar güncellenemez veya silinemez. AI kayıtları yalnızca görev, model ve token sayısını içerir.</div>
      {rows ? <AuditViewer initial={rows} initialNext={rows.length === 50 ? rows[rows.length - 1].id : null} /> : <AdminUnavailable what="Denetim kayıtları" />}
    </AdminShell>
  );
}
