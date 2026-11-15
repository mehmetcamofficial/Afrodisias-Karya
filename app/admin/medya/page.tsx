import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";
import { loadCms, mediaLibrary } from "../modules";

export const dynamic = "force-dynamic";

const KIND: Record<string, string> = { concept: "AI konsept tasarım", range: "Seri fotoğrafı", variant: "Ürün fotoğrafı", editorial: "Editoryal", photo: "Fotoğraf", illustration: "İllüstrasyon" };

export default async function Page() {
  const access = await requireAdminPage("/admin/medya");
  if (access.status !== "admin") return <AdminForbidden email={access.user.email} configured={access.configured} />;
  const cms = await loadCms();
  const items = mediaLibrary(cms.posts);
  const missingCredit = items.filter((item) => item.external && !item.credit);
  return (
    <AdminShell kicker="MEDYA KÜTÜPHANESİ" title="Sitede kullanılan görseller">
      <div className="admin-notice" role="note"><b>Yükleme: BLOCKED.</b> Güvenli dosya depolaması (ör. Vercel Blob) için erişim anahtarı yapılandırılmadı; görseller şimdilik depo içi dosya veya kaynak/lisans bilgisiyle URL olarak eklenir. Bu liste salt okunurdur.</div>
      <section className="metric-grid admin-metrics-compact" aria-label="Medya özeti">
        <article><div><span>Toplam kullanım</span></div><b>{items.length}</b><small>Ürün, günlük ve CMS yazıları</small></article>
        <article><div><span>AI konsept</span></div><b>{items.filter((item) => item.kind === "concept").length}</b><small>Gerçek ürün fotoğrafı değildir</small></article>
        <article><div><span>Kaynağı eksik dış görsel</span></div><b>{missingCredit.length}</b><small>{missingCredit.length ? "Düzeltilmeli" : "Tümünde kaynak var"}</small></article>
        {!cms.posts && <article><div><span>CMS</span></div><b>—</b><small>Veritabanına ulaşılamadı; yalnızca koddaki görseller listelendi</small></article>}
      </section>
      <section className="admin-card wide" aria-labelledby="media-title">
        <div className="admin-card-head"><div><small>KULLANIM</small><h2 id="media-title">Görseller</h2></div></div>
        <div className="media-grid">
          {items.map((item, index) => (
            <figure key={`${item.src}-${index}`} className="media-tile">
              {/* eslint-disable-next-line @next/next/no-img-element -- mixed local/external sources */}
              <img src={item.src} alt={item.alt} loading="lazy" decoding="async" />
              <figcaption><b>{KIND[item.kind] ?? item.kind}</b><span>{item.usedBy}</span>{item.credit && <small>{item.credit}{item.license ? ` · ${item.license}` : ""}</small>}{item.external && !item.credit && <small className="is-bad">Kaynak/lisans eksik</small>}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
