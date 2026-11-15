import { listAdminUsers, type AdminUserRow } from "../../../db/postgres/cms-repository";
import { requirePostgres } from "../../../db/postgres/driver";
import { parseAdminAllowlist } from "../../../lib/admin-access";
import { can } from "../../../lib/cms-permissions";
import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";
import { AdminUnavailable } from "../AdminPanels";
import { UserManager } from "../ModuleClients";

export const dynamic = "force-dynamic";

export default async function Page() {
  const access = await requireAdminPage("/admin/kullanicilar");
  if (access.status !== "admin") return <AdminForbidden email={access.user.email} configured={access.configured} />;
  if (!can(access.role, "users.manage")) return <AdminShell kicker="KULLANICILAR & ROLLER" title="Yetki gerekli"><p className="admin-notice">Kullanıcı ve rol yönetimi yalnızca sahip (owner) hesaplarına açıktır.</p></AdminShell>;
  let users: AdminUserRow[] | null = null;
  try { users = await listAdminUsers(requirePostgres()); } catch { users = null; }
  return (
    <AdminShell kicker="KULLANICILAR & ROLLER" title="Ekip ve yetkiler">
      <div className="admin-notice" role="note">Roller sunucu tarafında uygulanır: <b>Sahip</b> her şeyi yapar; <b>Editör</b> taslak oluşturur, düzenler, incelemeye gönderir, talepleri yönetir ve AI taslak araçlarını kullanır; <b>İzleyici</b> yalnızca okur. Onay, yayın, geri yükleme ve kalıcı silme yalnızca sahiplerdedir.</div>
      {users ? <UserManager initial={users} owners={[...parseAdminAllowlist(process.env.ADMIN_EMAILS)]} /> : <AdminUnavailable what="Kullanıcı yönetimi" />}
    </AdminShell>
  );
}
