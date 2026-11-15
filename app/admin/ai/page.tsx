import { countAiUsageSince } from "../../../db/postgres/cms-repository";
import { requirePostgres } from "../../../db/postgres/driver";
import { limitFromEnv } from "../../../lib/ai/limits";
import { aiStatus } from "../../../lib/ai/provider";
import { can } from "../../../lib/cms-permissions";
import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";
import { AiStudio } from "../ModuleClients";

export const dynamic = "force-dynamic";

async function usageLast24h() {
  try { return await countAiUsageSince(requirePostgres(), Date.now() - 86_400_000); } catch { return null; }
}

export default async function Page() {
  const access = await requireAdminPage("/admin/ai");
  if (access.status !== "admin") return <AdminForbidden email={access.user.email} configured={access.configured} />;
  const status = aiStatus();
  const used24h = await usageLast24h();
  return (
    <AdminShell kicker="AI STÜDYO" title="Yapay zekâ taslak araçları">
      <div className="admin-notice" role="note">AI yalnızca taslak üretir: yayımlamaz, fiyat veya stok değiştirmez, blog yayımlamaz, veri silmez. Ziyaretçi asistanı yalnızca SSS ve katalog bilgileriyle yanıt verir.</div>
      {can(access.role, "ai.use")
        ? <AiStudio status={{ enabled: status.enabled, reason: status.reason, model: status.model, used24h, dailyLimit: limitFromEnv("AI_ADMIN_DAILY_LIMIT", 100) }} />
        : <p className="admin-notice">AI araçları editör ve sahip rollerine açıktır.</p>}
    </AdminShell>
  );
}
