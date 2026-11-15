import Link from "next/link";
import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";
import { loadCms, seoReport } from "../modules";

export const dynamic = "force-dynamic";

export default async function Page() {
  const access = await requireAdminPage("/admin/seo");
  if (access.status !== "admin") return <AdminForbidden email={access.user.email} configured={access.configured} />;
  const cms = await loadCms();
  const rows = seoReport(cms);
  const withIssues = rows.filter((row) => row.issues.length);
  return (
    <AdminShell kicker="SEO" title="Arama görünürlüğü denetimi">
      <div className="admin-notice" role="note">Bu rapor içerikteki SEO alanlarını kontrol eder; trafik veya sıralama verisi içermez (analitik bağlı değil). Alanları ürün ve blog editörlerinden düzeltin. <Link href="/sitemap.xml" target="_blank">sitemap.xml</Link> · <Link href="/robots.txt" target="_blank">robots.txt</Link></div>
      <section className="metric-grid admin-metrics-compact" aria-label="SEO özeti">
        <article><div><span>Denetlenen sayfa</span></div><b>{rows.length}</b><small>{cms.products ? "Kod + CMS" : "Yalnızca kod (CMS'e ulaşılamadı)"}</small></article>
        <article><div><span>Sorunlu</span></div><b>{withIssues.length}</b><small>En az bir uyarı</small></article>
      </section>
      <section className="admin-card wide" aria-labelledby="seo-title">
        <div className="admin-card-head"><div><small>SAYFALAR</small><h2 id="seo-title">Başlık ve açıklamalar</h2></div></div>
        <div className="admin-table-scroll"><table className="admin-data-table">
          <thead><tr><th scope="col">Sayfa</th><th scope="col">Tür</th><th scope="col">SEO başlığı</th><th scope="col">Uyarılar</th></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={`${row.kind}-${row.href}`}><td><Link href={row.href}>{row.name}</Link></td><td>{row.kind}</td><td>{row.title || "—"}</td>
              <td>{row.issues.length ? <ul className="admin-checks">{row.issues.map((issue) => <li key={issue} className="warn">{issue}</li>)}</ul> : <span className="cms-status is-ok">Tamam</span>}</td></tr>))}</tbody>
        </table></div>
      </section>
    </AdminShell>
  );
}
