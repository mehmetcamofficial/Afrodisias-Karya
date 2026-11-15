import { requirePostgres } from "../../../db/postgres/driver";
import { listInquiries, type InquiryRow } from "../../../db/postgres/cms-repository";
import { can } from "../../../lib/cms-permissions";
import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";
import { AdminUnavailable } from "../AdminPanels";
import { InquiryManager } from "../InquiryManager";

export const dynamic = "force-dynamic";

export default async function Page() {
  const access = await requireAdminPage("/admin/talepler");
  if (access.status !== "admin") return <AdminForbidden email={access.user.email} configured={access.configured} />;
  let rows: InquiryRow[] | null = null;
  try { rows = await listInquiries(requirePostgres()); } catch { rows = null; }
  return (
    <AdminShell kicker="TALEPLER & İLETİŞİM" title="Ziyaretçi talepleri">
      <div className="admin-notice" role="note">Mesajlar yalnızca ziyaretçinin açık izniyle kaydedilir. Yanıtlar şimdilik e-posta ile manuel verilir; otomatik WhatsApp mesajı gönderilmez.</div>
      {rows ? <InquiryManager initial={rows} canManage={can(access.role, "inquiry.manage")} /> : <AdminUnavailable what="Talepler" />}
    </AdminShell>
  );
}
