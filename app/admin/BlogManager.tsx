import Link from "next/link";
import { AlertTriangle, CheckCircle2, Eye, FileText } from "lucide-react";
import { blogCategories, blogPosts, readMinutes, type BlogPost } from "../../lib/blog";

/**
 * Read-only editorial dashboard. Journal content lives in lib/blog.ts and is
 * changed through reviewed pull requests; this screen deliberately has NO
 * save/publish button, because no content database exists yet.
 */
const SEO_TITLE_MAX = 60;
const SEO_DESCRIPTION = [70, 160] as const;

function seoChecks(post: BlogPost) {
  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt;
  return [
    { ok: title.length <= SEO_TITLE_MAX, label: `SEO başlığı ${title.length}/${SEO_TITLE_MAX} karakter` },
    { ok: description.length >= SEO_DESCRIPTION[0] && description.length <= SEO_DESCRIPTION[1], label: `Açıklama ${description.length} karakter (önerilen ${SEO_DESCRIPTION[0]}–${SEO_DESCRIPTION[1]})` },
    { ok: Boolean(post.seoTitle && post.seoDescription), label: post.seoTitle && post.seoDescription ? "Özel SEO metaverisi var" : "Özel SEO metaverisi yok (başlık/özet kullanılıyor)" },
  ];
}

export function BlogManager() {
  const published = blogPosts.filter((post) => post.status === "published");
  const drafts = blogPosts.filter((post) => post.status === "draft");
  return (
    <>
      <div className="admin-notice" role="note">
        <b>İçerik nasıl yayımlanır?</b> Yazılar <code>lib/blog.ts</code> dosyasında tutulur. Bir taslağı yayımlamak için
        doğrulama notlarını tamamlayın ve <code>status</code> alanını <code>&quot;published&quot;</code> yapan değişikliği pull request ile inceletin.
        Bu ekran hiçbir içeriği kaydetmez veya otomatik yayımlamaz.
      </div>

      <section className="metric-grid admin-metrics-compact" aria-label="Günlük özeti">
        <article><div><span>Yayında</span><CheckCircle2 size={18} aria-hidden="true" /></div><b>{published.length}</b><small>Sitede görünen yazı</small></article>
        <article><div><span>Taslak</span><FileText size={18} aria-hidden="true" /></div><b>{drafts.length}</b><small>Yalnızca yöneticiler görür</small></article>
        <article><div><span>Kategori</span><FileText size={18} aria-hidden="true" /></div><b>{blogCategories.length}</b><small>{blogCategories.join(" · ")}</small></article>
      </section>

      <section className="admin-card wide" aria-labelledby="drafts-title">
        <div className="admin-card-head"><div><small>TASLAKLAR</small><h2 id="drafts-title">Yayın öncesi inceleme</h2></div><span>{drafts.length} taslak</span></div>
        <div className="admin-content-list">
          {drafts.map((post) => (
            <article key={post.slug} className="admin-content-row">
              <div className="admin-content-main">
                <span className="status-pill status-draft">Taslak</span>
                <b>{post.title}</b>
                <small>{post.category} · {readMinutes(post)} dk · son düzenleme {post.date}</small>
                <ul className="admin-checks">
                  {seoChecks(post).map((check) => <li key={check.label} className={check.ok ? "ok" : "warn"}>{check.ok ? <CheckCircle2 size={14} aria-hidden="true" /> : <AlertTriangle size={14} aria-hidden="true" />}{check.label}</li>)}
                </ul>
                {post.reviewNotes?.length ? (
                  <details>
                    <summary>Yayın öncesi doğrulanacaklar ({post.reviewNotes.length})</summary>
                    <ul>{post.reviewNotes.map((note) => <li key={note}>{note}</li>)}</ul>
                  </details>
                ) : null}
              </div>
              <Link className="admin-action" href={`/admin/blog/onizleme/${post.slug}`}><Eye size={15} aria-hidden="true" /> Önizle</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-card wide" aria-labelledby="published-title">
        <div className="admin-card-head"><div><small>YAYINDA</small><h2 id="published-title">Yayımlanmış yazılar</h2></div><span>{published.length} yazı</span></div>
        <div className="admin-content-list">
          {published.map((post) => (
            <article key={post.slug} className="admin-content-row">
              <div className="admin-content-main">
                <span className="status-pill status-live">Yayında</span>
                <b>{post.title}</b>
                <small>{post.category} · {readMinutes(post)} dk · {post.date}{post.featured ? " · Öne çıkan" : ""}</small>
                <ul className="admin-checks">
                  {seoChecks(post).map((check) => <li key={check.label} className={check.ok ? "ok" : "warn"}>{check.ok ? <CheckCircle2 size={14} aria-hidden="true" /> : <AlertTriangle size={14} aria-hidden="true" />}{check.label}</li>)}
                </ul>
              </div>
              <Link className="admin-action" href={`/gunluk/${post.slug}`} target="_blank"><Eye size={15} aria-hidden="true" /> Sitede gör</Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
