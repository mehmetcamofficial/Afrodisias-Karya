import { adminEnvironment } from "../../../lib/admin-environment";
import { aiStatus } from "../../../lib/ai/provider";
import { clerkPreviewConfigured } from "../../../lib/clerk-preview";
import { contactConfig } from "../../../lib/contact-config";
import { isProductionShowcase } from "../../../lib/showcase-mode";
import { SITE_URL } from "../../../lib/site";
import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";

export const dynamic = "force-dynamic";

/**
 * Site settings that come from deployment configuration. Shown read-only
 * with where to change them — no fake save buttons, and no secret values.
 */
export default async function Page() {
  const access = await requireAdminPage("/admin/ayarlar");
  if (access.status !== "admin") return <AdminForbidden email={access.user.email} configured={access.configured} />;
  const env = adminEnvironment();
  const contact = contactConfig();
  const ai = aiStatus();
  const set = (value: boolean) => (value ? "Tanımlı" : "Tanımlı değil");
  const rows: Array<[string, string, string]> = [
    ["Ortam", env.label, "Vercel tarafından belirlenir"],
    ["Satış / ödeme", isProductionShowcase() ? "Kapalı (tanıtım modu)" : env.commerce, "Production'da kod düzeyinde kapalı; açmak ayrı onay gerektirir"],
    ["Yayımlama kapısı", env.publishing ? "Açık (Preview)" : "Kapalı", "PREVIEW_CATALOG_PUBLISH_ENABLED (yalnızca Preview)"],
    ["Site adresi", SITE_URL, "NEXT_PUBLIC_SITE_URL"],
    ["WhatsApp", contact.whatsapp ? `Tanımlı (+${contact.whatsapp.slice(0, 2)}…)` : "Tanımlı değil — düğme gizli", "NEXT_PUBLIC_WHATSAPP_NUMBER (E.164 rakamları)"],
    ["İletişim e-postası", contact.email ?? "Tanımlı değil — gizli", "NEXT_PUBLIC_CONTACT_EMAIL"],
    ["Yapay zekâ", ai.enabled ? `Etkin · ${ai.model}` : `Kapalı — ${ai.reason}`, "ANTHROPIC_API_KEY, AI_ENABLED, AI_MODEL, AI_*_LIMIT"],
    ["Yönetici girişi (Preview)", set(clerkPreviewConfigured()), "Clerk anahtarları (Preview ortamı)"],
    ["Yönetici sahipleri", set(Boolean(process.env.ADMIN_EMAILS)), "ADMIN_EMAILS"],
    ["Veritabanı", set(Boolean(process.env.DATABASE_URL)), "DATABASE_URL (Production ve Preview ayrı Neon dalları)"],
    ["Medya yükleme", "BLOCKED — depolama yapılandırılmadı", "Depolama erişim anahtarı gerekir"],
  ];
  return (
    <AdminShell kicker="SİTE AYARLARI" title="Yapılandırma durumu">
      <div className="admin-notice" role="note">Bu değerler dağıtım yapılandırmasından okunur ve burada değiştirilemez (gizli değerler gösterilmez). Değiştirmek için Vercel proje ayarlarında ilgili ortam değişkenini güncelleyip yeniden dağıtın.</div>
      <section className="admin-card wide" aria-labelledby="settings-title">
        <div className="admin-card-head"><div><small>YAPILANDIRMA</small><h2 id="settings-title">Ayarlar</h2></div></div>
        <div className="admin-table-scroll"><table className="admin-data-table">
          <thead><tr><th scope="col">Ayar</th><th scope="col">Durum</th><th scope="col">Nereden değişir</th></tr></thead>
          <tbody>{rows.map(([name, value, where]) => <tr key={name}><td>{name}</td><td>{value}</td><td><code>{where}</code></td></tr>)}</tbody>
        </table></div>
      </section>
    </AdminShell>
  );
}
