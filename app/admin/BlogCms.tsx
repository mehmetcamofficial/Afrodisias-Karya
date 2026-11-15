"use client";

import { Archive, CalendarClock, Download, Eye, Heading2, List, Plus, Quote, RotateCcw, Save, Send, ShieldCheck, Trash2, Undo2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { BlogStatus, BlogVersionRow, CmsBlogPost } from "../../db/postgres/blog-repository";
import type { AuditRow } from "../../db/postgres/cms-repository";
import { can, type Role } from "../../lib/cms-permissions";
import { ArticleBody } from "../components/journal-card";

/**
 * Blog CMS. Every button calls the real API and reports success only after the
 * server confirms. Publishing/scheduling need a typed confirmation and are
 * gated server-side; AI drafts never reach this workflow automatically.
 */
type Media = { url: string; alt: string; credit: string; license: string; kind: "photo" | "illustration" | "concept" };
type Detail = { post: CmsBlogPost; versions: BlogVersionRow[]; audit: AuditRow[] };
const STATUS: Record<BlogStatus, string> = { draft: "Taslak", in_review: "İncelemede", approved: "Onaylı", scheduled: "Zamanlandı", published: "Yayında", archived: "Arşivde" };
const TONE: Record<BlogStatus, string> = { draft: "muted", in_review: "warn", approved: "ok", scheduled: "warn", published: "live", archived: "bad" };

type Form = {
  slug: string; category: string; author: string; featured: boolean; tags: string; template: "article" | "recipe";
  servings: string; prep: string; cook: string; ingredients: string; steps: string; related: string;
  coverUrl: string; coverAlt: string; coverCredit: string; coverLicense: string; gallery: string; videoUrl: string;
  trTitle: string; trExcerpt: string; trBody: string; trSeoTitle: string; trSeoDescription: string;
  enTitle: string; enExcerpt: string; enBody: string; enSeoTitle: string; enSeoDescription: string;
};
const empty = (categories: string[]): Form => ({ slug: "", category: categories[0], author: "Altın Dal", featured: false, tags: "", template: "article", servings: "", prep: "", cook: "", ingredients: "", steps: "", related: "", coverUrl: "", coverAlt: "", coverCredit: "", coverLicense: "", gallery: "", videoUrl: "", trTitle: "", trExcerpt: "", trBody: "", trSeoTitle: "", trSeoDescription: "", enTitle: "", enExcerpt: "", enBody: "", enSeoTitle: "", enSeoDescription: "" });

const lines = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean);
const galleryToText = (gallery: Array<Pick<Media, "url" | "alt" | "credit" | "license">>) => gallery.map((m) => [m.url, m.alt, m.credit, m.license].join(" | ")).join("\n");
const textToGallery = (text: string): Media[] => lines(text).map((line) => { const [url = "", alt = "", credit = "", license = ""] = line.split("|").map((part) => part.trim()); return { url, alt, credit, license, kind: "photo" }; });
const num = (value: string) => (value.trim() === "" ? null : Number(value));

function toForm(p: CmsBlogPost): Form {
  return { slug: p.slug, category: p.category, author: p.author, featured: p.featured, tags: p.tags.join(", "), template: p.template,
    servings: p.recipe.servings ?? "", prep: p.recipe.prepMinutes?.toString() ?? "", cook: p.recipe.cookMinutes?.toString() ?? "",
    ingredients: (p.recipe.ingredients ?? []).join("\n"), steps: (p.recipe.steps ?? []).join("\n"), related: p.relatedProductIds.join(", "),
    coverUrl: p.cover?.url ?? "", coverAlt: p.cover?.alt ?? "", coverCredit: p.cover?.credit ?? "", coverLicense: p.cover?.license ?? "",
    gallery: galleryToText(p.gallery), videoUrl: p.videoUrl,
    trTitle: p.tr.title, trExcerpt: p.tr.excerpt, trBody: p.tr.bodyMd, trSeoTitle: p.tr.seoTitle, trSeoDescription: p.tr.seoDescription,
    enTitle: p.en.title, enExcerpt: p.en.excerpt, enBody: p.en.bodyMd, enSeoTitle: p.en.seoTitle, enSeoDescription: p.en.seoDescription };
}

function toPayload(f: Form) {
  return {
    slug: f.slug.trim(), category: f.category, author: f.author, featured: f.featured,
    tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean), template: f.template,
    recipe: { servings: f.servings, prepMinutes: num(f.prep), cookMinutes: num(f.cook), ingredients: lines(f.ingredients), steps: lines(f.steps) },
    relatedProductIds: f.related.split(",").map((t) => t.trim()).filter(Boolean),
    cover: f.coverUrl.trim() ? { url: f.coverUrl.trim(), alt: f.coverAlt, credit: f.coverCredit, license: f.coverLicense, kind: "photo" } : null,
    gallery: textToGallery(f.gallery), videoUrl: f.videoUrl.trim(),
    tr: { title: f.trTitle, excerpt: f.trExcerpt, bodyMd: f.trBody, seoTitle: f.trSeoTitle, seoDescription: f.trSeoDescription },
    en: { title: f.enTitle, excerpt: f.enExcerpt, bodyMd: f.enBody, seoTitle: f.enSeoTitle, seoDescription: f.enSeoDescription },
  };
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json" } });
  const body = (await response.json().catch(() => ({}))) as { error?: string; issues?: Array<{ path: string; message: string }> };
  if (!response.ok) throw new Error((body.error ?? `İstek başarısız (${response.status})`) + (body.issues ? " — " + body.issues.map((i) => `${i.path}: ${i.message}`).join("; ") : ""));
  return body as T;
}

/** Minimal Markdown toolbar for the constrained format the site renders. */
function BodyEditor({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrap = (prefix: string, suffix = "", linePrefix = false) => {
    const el = ref.current; if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const selected = value.slice(a, b) || "metin";
    const insert = linePrefix ? selected.split("\n").map((line) => prefix + line).join("\n") : prefix + selected + suffix;
    const before = linePrefix && a > 0 && value[a - 1] !== "\n" ? "\n" : "";
    onChange(value.slice(0, a) + before + insert + value.slice(b));
    requestAnimationFrame(() => el.focus());
  };
  return (
    <div className="blog-editor">
      <div className="blog-toolbar" role="toolbar" aria-label={`${label} biçimlendirme`}>
        <button type="button" disabled={disabled} onClick={() => wrap("## ", "", true)} aria-label="Ara başlık"><Heading2 size={14} /></button>
        <button type="button" disabled={disabled} onClick={() => wrap("**", "**")} aria-label="Kalın"><b>B</b></button>
        <button type="button" disabled={disabled} onClick={() => wrap("*", "*")} aria-label="İtalik"><i>I</i></button>
        <button type="button" disabled={disabled} onClick={() => wrap("- ", "", true)} aria-label="Liste"><List size={14} /></button>
        <button type="button" disabled={disabled} onClick={() => wrap("> ", "", true)} aria-label="Alıntı"><Quote size={14} /></button>
        <button type="button" disabled={disabled} onClick={() => wrap("[", "](https://)")} aria-label="Bağlantı">🔗</button>
      </div>
      <label>{label}<textarea ref={ref} value={value} onChange={(event) => onChange(event.target.value)} rows={14} disabled={disabled} /></label>
    </div>
  );
}

export function BlogCms({ initialPosts, role, publishingEnabled, categories, codeDrafts }: { initialPosts: CmsBlogPost[]; role: Role; publishingEnabled: boolean; categories: string[]; codeDrafts: Array<{ slug: string; title: string }> }) {
  const [posts, setPosts] = useState(initialPosts);
  const [archived, setArchived] = useState(false);
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [form, setForm] = useState<Form>(empty(categories));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [preview, setPreview] = useState<"tr" | "en" | null>(null);

  const reload = useCallback(async (withArchived = archived) => {
    setPosts((await api<{ posts: CmsBlogPost[] }>(`/api/admin/cms/blog${withArchived ? "?archived=1" : ""}`)).posts);
  }, [archived]);
  const open = useCallback(async (id: string) => {
    setSelected(id); setNotice(null); setConfirmation(""); setNote(""); setPreview(null);
    try { const data = await api<Detail>(`/api/admin/cms/blog/${encodeURIComponent(id)}`); setDetail(data); setForm(toForm(data.post)); }
    catch (error) { setNotice({ tone: "error", text: (error as Error).message }); }
  }, []);
  const run = async (label: string, work: () => Promise<unknown>, reopen?: string) => {
    setBusy(true); setNotice(null);
    try { await work(); await reload(); if (reopen) await open(reopen); setNotice({ tone: "ok", text: `${label}: veritabanına kaydedildi.` }); setConfirmation(""); }
    catch (error) { setNotice({ tone: "error", text: `${label} başarısız: ${(error as Error).message}` }); }
    finally { setBusy(false); }
  };

  const status = detail?.post.status;
  const editable = selected === "new" || (status ? ["draft", "in_review", "approved", "scheduled"].includes(status) : false);
  const canWrite = can(role, "blog.write") && editable;
  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));
  const input = (key: keyof Form) => ({ value: String(form[key]), onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(key)(event.target.value as never), disabled: !canWrite });

  const save = () => {
    if (selected === "new") void run("Yazı oluşturuldu", () => api("/api/admin/cms/blog", { method: "POST", body: JSON.stringify(toPayload(form)) }), form.slug.trim());
    else if (detail) void run("Değişiklikler", () => api(`/api/admin/cms/blog/${detail.post.id}`, { method: "PATCH", body: JSON.stringify({ ...toPayload(form), expectedVersion: detail.post.version }) }), detail.post.id);
  };
  const act = (action: string, label: string, extra: Record<string, unknown> = {}) => {
    if (!detail) return;
    const id = detail.post.id;
    void run(label, () => api(`/api/admin/cms/blog/${id}/actions`, { method: "POST", body: JSON.stringify({ action, expectedVersion: detail.post.version, note, confirmation, ...extra }) }), action === "delete" ? undefined : id);
    if (action === "delete") { setSelected(null); setDetail(null); }
  };
  const importDraft = (slug: string) => void run("Taslak içe aktarıldı", () => api("/api/admin/cms/blog/import", { method: "POST", body: JSON.stringify({ slug }) }), slug);
  const imported = new Set(posts.map((p) => p.slug));

  return (
    <div className="cms">
      <section className="admin-card wide" aria-labelledby="blog-list-title">
        <div className="admin-card-head">
          <div><small>BLOG CMS · POSTGRESQL</small><h2 id="blog-list-title">Yazılar</h2></div>
          <div className="cms-toolbar">
            <label className="cms-check"><input type="checkbox" checked={archived} onChange={(event) => { const next = event.target.checked; setArchived(next); void reload(next).catch((error) => setNotice({ tone: "error", text: (error as Error).message })); }} /> Arşivi göster</label>
            {can(role, "blog.write") && <button type="button" className="admin-action" onClick={() => { setSelected("new"); setDetail(null); setForm(empty(categories)); setNotice(null); }}><Plus size={14} aria-hidden="true" /> Yeni yazı</button>}
          </div>
        </div>
        {posts.length === 0 ? <p className="admin-help">Veritabanında henüz yazı yok. Yeni yazı oluşturun veya aşağıdan kod tabanlı bir taslağı içe aktarın.</p> : (
          <div className="admin-table-scroll"><table className="admin-data-table">
            <thead><tr><th scope="col">Başlık</th><th scope="col">Kategori</th><th scope="col">Durum</th><th scope="col">Sürüm</th><th scope="col"><span className="sr-only">İşlem</span></th></tr></thead>
            <tbody>{posts.map((p) => (
              <tr key={p.id} aria-current={selected === p.id ? "true" : undefined}>
                <td><b>{p.tr.title}</b><small>/{p.slug}{p.featured ? " · öne çıkan" : ""}{p.template === "recipe" ? " · tarif" : ""}</small></td>
                <td>{p.category}</td>
                <td><span className={`cms-status is-${TONE[p.status]}`}>{STATUS[p.status]}{p.status === "scheduled" && p.publishAt ? ` · ${new Date(p.publishAt).toLocaleString("tr-TR")}` : ""}</span></td>
                <td>v{p.version}</td>
                <td><button type="button" className="admin-action" onClick={() => void open(p.id)}>Aç</button></td>
              </tr>))}</tbody>
          </table></div>
        )}
        {can(role, "blog.write") && codeDrafts.some((d) => !imported.has(d.slug)) && (
          <details className="blog-import"><summary>Kod tabanlı taslakları içe aktar ({codeDrafts.filter((d) => !imported.has(d.slug)).length})</summary>
            <p className="cms-hint">İçe aktarılan yazı <b>taslak</b> olarak oluşturulur; yayın öncesi doğrulama notları metnin başına eklenir ve silinmeden yayımlanamaz.</p>
            <ul>{codeDrafts.filter((d) => !imported.has(d.slug)).map((d) => <li key={d.slug}>{d.title} <button type="button" className="admin-action" disabled={busy} onClick={() => importDraft(d.slug)}><Download size={14} aria-hidden="true" /> İçe aktar</button></li>)}</ul>
          </details>
        )}
      </section>

      {notice && <p className={`cms-notice is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p>}

      {selected && (
        <section className="admin-card wide cms-editor" aria-labelledby="blog-editor-title">
          <div className="admin-card-head">
            <div><small>{selected === "new" ? "YENİ YAZI · TASLAK" : `${STATUS[status!]} · v${detail?.post.version}`}</small><h2 id="blog-editor-title">{selected === "new" ? "Yeni yazı" : form.trTitle}</h2></div>
            {detail && <a className="admin-action" href={`/admin/blog/onizleme/${detail.post.slug}`} target="_blank" rel="noreferrer"><Eye size={14} aria-hidden="true" /> Önizle</a>}
          </div>
          {detail && !editable && <p className="admin-notice">{status === "published" ? "Yayındaki yazı düzenlenemez. Değiştirmek için önce yayından kaldırın." : "Arşivdeki yazı düzenlenemez. Önce geri yükleyin."}</p>}
          <form className="cms-form" onSubmit={(event) => { event.preventDefault(); save(); }}>
            <fieldset><legend>Temel bilgiler</legend>
              <label>Slug (URL)<input {...input("slug")} required pattern="[a-z0-9-]{3,90}" /></label>
              <label>Kategori<select {...input("category")}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label>Yazar<input {...input("author")} required /></label>
              <label>Şablon<select {...input("template")}><option value="article">Makale</option><option value="recipe">Tarif</option></select></label>
              <label>Etiketler (virgülle)<input {...input("tags")} /></label>
              <label>İlgili ürünler (kimlik, virgülle)<input {...input("related")} placeholder="glass-500, tin-5l" /></label>
              <label className="cms-check"><input type="checkbox" checked={form.featured} onChange={(event) => set("featured")(event.target.checked)} disabled={!canWrite} /> Öne çıkan</label>
            </fieldset>
            {form.template === "recipe" && (
              <fieldset><legend>Tarif</legend>
                <label>Porsiyon<input {...input("servings")} placeholder="4 kişilik" /></label>
                <label>Hazırlık (dk)<input {...input("prep")} type="number" min="0" /></label>
                <label>Pişirme (dk)<input {...input("cook")} type="number" min="0" /></label>
                <label>Malzemeler (her satıra bir)<textarea {...input("ingredients")} rows={6} /></label>
                <label>Adımlar (her satıra bir)<textarea {...input("steps")} rows={6} /></label>
              </fieldset>
            )}
            <fieldset><legend>Medya</legend>
              <label>Kapak URL (/ veya https://)<input {...input("coverUrl")} /></label>
              <label>Kapak alt metni<input {...input("coverAlt")} /></label>
              <label>Fotoğrafçı / kaynak<input {...input("coverCredit")} /></label>
              <label>Lisans<input {...input("coverLicense")} placeholder="CC BY-SA 4.0" /></label>
              <label>Galeri (her satır: url | alt | kaynak | lisans)<textarea {...input("gallery")} rows={3} /></label>
              <label>Video URL (mp4/webm; / veya https://)<input {...input("videoUrl")} /></label>
              <small className="cms-hint">Dış kaynaklı görsellerde kaynak ve lisans zorunludur. Dosya yükleme depolaması henüz yapılandırılmadı; görseller URL ile eklenir.</small>
            </fieldset>
            <fieldset><legend>Türkçe</legend>
              <label>Başlık<input {...input("trTitle")} required /></label>
              <label>Özet<textarea {...input("trExcerpt")} rows={2} maxLength={400} /></label>
              <BodyEditor label="Metin" value={form.trBody} onChange={set("trBody")} disabled={!canWrite} />
              <label>SEO başlığı <small>{form.trSeoTitle.length}/70</small><input {...input("trSeoTitle")} maxLength={70} /></label>
              <label>Meta açıklama <small>{form.trSeoDescription.length}/170</small><textarea {...input("trSeoDescription")} maxLength={170} rows={2} /></label>
            </fieldset>
            <fieldset><legend>English</legend>
              <label>Title<input {...input("enTitle")} /></label>
              <label>Excerpt<textarea {...input("enExcerpt")} rows={2} maxLength={400} /></label>
              <BodyEditor label="Body" value={form.enBody} onChange={set("enBody")} disabled={!canWrite} />
              <label>SEO title <small>{form.enSeoTitle.length}/70</small><input {...input("enSeoTitle")} maxLength={70} /></label>
              <label>Meta description <small>{form.enSeoDescription.length}/170</small><textarea {...input("enSeoDescription")} maxLength={170} rows={2} /></label>
            </fieldset>
            <div className="cms-actions">
              {canWrite && <button type="submit" className="cms-primary" disabled={busy}><Save size={16} aria-hidden="true" /> {selected === "new" ? "Taslak olarak oluştur" : "Değişiklikleri kaydet"}</button>}
              <button type="button" onClick={() => setPreview(preview === "tr" ? null : "tr")}><Eye size={14} aria-hidden="true" /> Canlı önizleme (TR)</button>
              <button type="button" onClick={() => setPreview(preview === "en" ? null : "en")}><Eye size={14} aria-hidden="true" /> Preview (EN)</button>
            </div>
            {selected !== "new" && editable && <small className="cms-hint">Kaydetmek incelenmiş/onaylı/zamanlanmış yazıyı yeniden taslağa alır ve zamanlamayı iptal eder.</small>}
          </form>
          {preview && <article className="admin-card wide admin-preview article-body blog-live-preview" aria-label="Canlı önizleme"><h1>{preview === "tr" ? form.trTitle : form.enTitle}</h1><p className="article-lead">{preview === "tr" ? form.trExcerpt : form.enExcerpt}</p><ArticleBody blocks={lines(preview === "tr" ? form.trBody : form.enBody)} /></article>}

          {detail && (
            <div className="cms-workflow">
              <h3><ShieldCheck size={16} aria-hidden="true" /> İş akışı</h3>
              <label>Not (onay geçmişine yazılır)<input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} /></label>
              <div className="cms-actions">
                {status === "draft" && can(role, "blog.write") && <button type="button" disabled={busy} onClick={() => act("submit", "İncelemeye gönderildi")}><Send size={14} aria-hidden="true" /> İncelemeye gönder</button>}
                {status === "in_review" && can(role, "blog.publish") && <button type="button" disabled={busy} onClick={() => act("approve", "Onaylandı")}><ShieldCheck size={14} aria-hidden="true" /> Onayla</button>}
                {(status === "in_review" || status === "approved") && can(role, "blog.publish") && <button type="button" disabled={busy} onClick={() => act("reject", "Taslağa iade edildi")}><Undo2 size={14} aria-hidden="true" /> Reddet</button>}
                {(status === "published" || status === "scheduled") && can(role, "blog.publish") && <button type="button" disabled={busy} onClick={() => act("unpublish", "Yayından kaldırıldı")}><Undo2 size={14} aria-hidden="true" /> Yayından kaldır</button>}
                {status && ["draft", "in_review", "approved"].includes(status) && can(role, "blog.write") && <button type="button" disabled={busy} onClick={() => act("archive", "Arşivlendi")}><Archive size={14} aria-hidden="true" /> Arşivle</button>}
                {status === "archived" && can(role, "blog.publish") && <button type="button" disabled={busy} onClick={() => act("restore", "Geri yüklendi")}><RotateCcw size={14} aria-hidden="true" /> Geri yükle</button>}
              </div>
              {(status === "approved" || status === "scheduled") && can(role, "blog.publish") && (
                <div className="cms-danger">
                  <h4>Yayımla veya zamanla</h4>
                  {!publishingEnabled && <p className="admin-help">Bu ortamda yayımlama kapalı (yalnızca Preview + PREVIEW_CATALOG_PUBLISH_ENABLED).</p>}
                  <label>Onay için <code>YAYINLA:{detail.post.id}</code> yazın<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></label>
                  <div className="cms-actions">
                    <button type="button" disabled={busy || !publishingEnabled || confirmation !== `YAYINLA:${detail.post.id}`} onClick={() => act("publish", "Yayımlandı")}><Send size={14} aria-hidden="true" /> Şimdi yayımla</button>
                    {status === "approved" && <>
                      <label>Yayın zamanı<input type="datetime-local" value={publishAt} onChange={(event) => setPublishAt(event.target.value)} /></label>
                      <button type="button" disabled={busy || !publishingEnabled || !publishAt || confirmation !== `YAYINLA:${detail.post.id}`} onClick={() => act("schedule", "Zamanlandı", { publishAt: new Date(publishAt).getTime() })}><CalendarClock size={14} aria-hidden="true" /> Zamanla</button>
                    </>}
                  </div>
                </div>
              )}
              {status === "archived" && can(role, "blog.delete") && (
                <div className="cms-danger">
                  <h4>Kalıcı silme</h4>
                  <p className="admin-help">Yalnızca hiç yayımlanmamış arşiv yazıları silinebilir; son hâli denetim kaydında kalır.</p>
                  <label>Onay için <code>SIL:{detail.post.id}</code> yazın<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></label>
                  <button type="button" disabled={busy || confirmation !== `SIL:${detail.post.id}`} onClick={() => act("delete", "Silindi")}><Trash2 size={14} aria-hidden="true" /> Kalıcı olarak sil</button>
                </div>
              )}
              <details><summary>Sürümler ({detail.versions.length}) ve denetim kaydı ({detail.audit.length})</summary>
                <ul>{detail.versions.map((v) => <li key={v.version}>v{v.version} · {v.status} · {v.actorEmail} · {new Date(v.createdAt).toLocaleString("tr-TR")}</li>)}</ul>
                <ul>{detail.audit.map((a, i) => <li key={i}>{a.action} · {a.actorEmail} · {new Date(a.createdAt).toLocaleString("tr-TR")}</li>)}</ul>
              </details>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
