import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleSlash, Database, History, ShieldCheck } from "lucide-react";
import type { AdminEnvironment, AdminSnapshot } from "../../lib/admin-data";
import { draftPosts } from "../../lib/blog";

/** What this environment can and cannot do — stated plainly. */
export function AdminStatus({ env, snapshot }: { env: AdminEnvironment; snapshot: AdminSnapshot }) {
  const dbOk = snapshot.products !== null && snapshot.orders !== null;
  const rows = [
    { label: "Ortam", value: env.label, ok: true, Icon: ShieldCheck },
    { label: "Satış", value: env.commerce, ok: env.tone !== "production", Icon: CircleSlash },
    { label: "Ödeme", value: "Etkin değil — tahsilat yapılmaz", ok: false, Icon: CircleSlash },
    { label: "Veritabanı", value: dbOk ? "Bağlı" : "Bağlantı yok", ok: dbOk, Icon: Database },
    { label: "Ürün yayımlama", value: env.publishing ? "Açık (yalnızca Preview, onay + denetim kaydı ile)" : "Kapalı", ok: env.publishing, Icon: History },
  ];
  return (
    <section className="admin-status" aria-label="Ortam ve kısıtlar">
      {rows.map(({ label, value, ok, Icon }) => (
        <div key={label} className={ok ? "is-ok" : "is-off"}>
          <Icon size={16} aria-hidden="true" />
          <span>{label}</span>
          <b>{value}</b>
        </div>
      ))}
      {snapshot.problems.length > 0 && (
        <ul className="admin-problems" role="status">
          {snapshot.problems.map((problem) => <li key={problem}><AlertTriangle size={14} aria-hidden="true" /> {problem}</li>)}
        </ul>
      )}
    </section>
  );
}

export function AdminUnavailable({ what }: { what: string }) {
  return (
    <section className="admin-card wide admin-empty-state" role="status">
      <Database aria-hidden="true" />
      <h3>{what} şu anda gösterilemiyor</h3>
      <p>Veritabanına ulaşılamadı. Sayılar sıfır olarak gösterilmez; bağlantı kurulduğunda gerçek kayıtlar burada görünür.</p>
    </section>
  );
}

export function AuditPanel({ audit }: { audit: AdminSnapshot["audit"] }) {
  return (
    <section className="admin-card wide" aria-labelledby="audit-title">
      <div className="admin-card-head">
        <div><small>DENETİM</small><h2 id="audit-title">Ürün yayın kaydı</h2></div>
        <span>{audit ? `${audit.length} olay` : "Erişilemiyor"}</span>
      </div>
      <p className="admin-help">Her Preview yayımlaması, ürün değişikliğiyle aynı SQL ifadesinde silinemez bir denetim satırı yazar. Bu liste salt okunurdur.</p>
      {audit === null ? (
        <p className="admin-empty">Denetim kaydı okunamadı.</p>
      ) : audit.length === 0 ? (
        <p className="admin-empty">Henüz yayımlama yapılmadı.</p>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-data-table">
            <thead><tr><th scope="col">Zaman</th><th scope="col">Ürün</th><th scope="col">Yönetici</th><th scope="col">Fiyat</th><th scope="col">Onaylı stok</th></tr></thead>
            <tbody>
              {audit.map((event) => (
                <tr key={event.eventId}>
                  <td>{new Date(Number(event.occurredAt)).toLocaleString("tr-TR")}</td>
                  <td>{event.productId}</td>
                  <td>{event.actorEmail}</td>
                  <td>{(event.priceKurus / 100).toLocaleString("tr-TR")} TL</td>
                  <td>{event.approvedStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function ContentShortcut() {
  return (
    <section className="admin-card" aria-labelledby="content-title">
      <div className="admin-card-head"><div><small>İÇERİK</small><h2 id="content-title">Günlük taslakları</h2></div><span>{draftPosts.length} taslak</span></div>
      <p className="admin-help">Taslaklar sitede görünmez ve otomatik yayımlanmaz.</p>
      <ul className="admin-mini-list">
        {draftPosts.slice(0, 4).map((post) => <li key={post.slug}><CheckCircle2 size={14} aria-hidden="true" /><Link href={`/admin/blog/onizleme/${post.slug}`}>{post.title}</Link></li>)}
      </ul>
      <Link className="admin-action" href="/admin/blog">Tüm içerik</Link>
    </section>
  );
}
