"use client";

import Image from "next/image";
import { Archive, Copy, Eye, History, Plus, RefreshCw, RotateCcw, Save, Send, ShieldCheck, Trash2, Undo2, Upload } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { CmsProduct, ProductStatus, AuditRow, RevisionRow } from "../../db/postgres/cms-repository";
import { can, type Role } from "../../lib/cms-permissions";

/**
 * Product CMS. Every button calls the real API; success is only shown after
 * the server confirms the write. The server enforces permissions — buttons
 * are hidden here only for convenience.
 */
type Detail = { product: CmsProduct; revisions: RevisionRow[]; audit: AuditRow[] };
type Form = {
  id: string; sku: string; category: string; size: string; priceTl: string; currency: string; stock: string; tags: string;
  trName: string; trDescription: string; trSeoTitle: string; trSeoDescription: string;
  enName: string; enDescription: string; enSeoTitle: string; enSeoDescription: string;
};

const STATUS_LABEL: Record<ProductStatus, string> = { draft: "Taslak", in_review: "İncelemede", approved: "Onaylı", published: "Yayında", archived: "Arşivde" };
const STATUS_TONE: Record<ProductStatus, string> = { draft: "muted", in_review: "warn", approved: "ok", published: "live", archived: "bad" };
const CATEGORIES = [["glass", "Cam seri"], ["luxury", "Özel seri"], ["tin", "Teneke"], ["pantry", "Kiler"], ["subscription", "Abonelik"]] as const;

const emptyForm: Form = { id: "", sku: "", category: "glass", size: "", priceTl: "", currency: "TRY", stock: "0", tags: "", trName: "", trDescription: "", trSeoTitle: "", trSeoDescription: "", enName: "", enDescription: "", enSeoTitle: "", enSeoDescription: "" };

function toForm(p: CmsProduct): Form {
  return {
    id: p.id, sku: p.sku ?? "", category: p.category, size: p.size, priceTl: String(p.priceKurus / 100), currency: p.currency, stock: String(p.stock), tags: p.tags.join(", "),
    trName: p.tr.name, trDescription: p.tr.description, trSeoTitle: p.tr.seoTitle, trSeoDescription: p.tr.seoDescription,
    enName: p.en.name, enDescription: p.en.description, enSeoTitle: p.en.seoTitle, enSeoDescription: p.en.seoDescription,
  };
}

function toPayload(form: Form) {
  return {
    ...(form.id ? { id: form.id } : {}),
    sku: form.sku.trim() ? form.sku.trim() : null,
    category: form.category, size: form.size,
    priceKurus: Math.round(Number(form.priceTl.replace(",", ".")) * 100),
    currency: form.currency, stock: Number(form.stock),
    tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    tr: { name: form.trName, description: form.trDescription, seoTitle: form.trSeoTitle, seoDescription: form.trSeoDescription },
    en: { name: form.enName, description: form.enDescription, seoTitle: form.enSeoTitle, seoDescription: form.enSeoDescription },
  };
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const body = (await response.json().catch(() => ({}))) as { error?: string; issues?: Array<{ path: string; message: string }> } & Record<string, unknown>;
  if (!response.ok) {
    const issues = Array.isArray(body.issues) ? " — " + body.issues.map((issue: { path: string; message: string }) => `${issue.path}: ${issue.message}`).join("; ") : "";
    throw new Error((body.error ?? `İstek başarısız (${response.status})`) + issues);
  }
  return body as T;
}

export function ProductCms({ initialProducts, role, publishingEnabled, images }: { initialProducts: CmsProduct[]; role: Role; publishingEnabled: boolean; images: Record<string, { src: string; kind: string }> }) {
  const [products, setProducts] = useState(initialProducts);
  const [showArchived, setShowArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [copyId, setCopyId] = useState("");

  const reloadList = useCallback(async (archived = showArchived) => {
    setProducts(await api<CmsProduct[]>(`/api/admin/cms/products${archived ? "?archived=1" : ""}`));
  }, [showArchived]);

  const open = useCallback(async (id: string) => {
    setSelected(id); setNotice(null); setConfirmation(""); setNote("");
    try {
      const data = await api<Detail>(`/api/admin/cms/products/${encodeURIComponent(id)}`);
      setDetail(data); setForm(toForm(data.product)); setCopyId(`${id}-kopya`);
    } catch (error) { setNotice({ tone: "error", text: (error as Error).message }); }
  }, []);


  const visible = useMemo(() => products.filter((p) => statusFilter === "all" || p.status === statusFilter), [products, statusFilter]);
  const editable = selected === "new" || (detail && ["draft", "in_review", "approved"].includes(detail.product.status));
  const field = (key: keyof Form) => ({ value: form[key], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [key]: event.target.value }), disabled: !editable || !can(role, "product.write") });

  const run = async (label: string, work: () => Promise<unknown>, reopen?: string) => {
    setBusy(true); setNotice(null);
    try {
      await work();
      await reloadList();
      if (reopen) await open(reopen);
      setNotice({ tone: "ok", text: `${label}: veritabanına kaydedildi.` });
      setConfirmation("");
    } catch (error) { setNotice({ tone: "error", text: `${label} başarısız: ${(error as Error).message}` }); }
    finally { setBusy(false); }
  };

  const save = () => {
    if (selected === "new") {
      void run("Ürün oluşturuldu", () => api("/api/admin/cms/products", { method: "POST", body: JSON.stringify(toPayload(form)) }), form.id);
    } else if (detail) {
      void run("Değişiklikler", () => api(`/api/admin/cms/products/${detail.product.id}`, { method: "PATCH", body: JSON.stringify({ ...toPayload(form), expectedVersion: detail.product.version }) }), detail.product.id);
    }
  };

  const act = (action: string, label: string, extra: Record<string, unknown> = {}) => {
    if (!detail) return;
    const id = detail.product.id;
    void run(label, () => api(`/api/admin/cms/products/${id}/actions`, { method: "POST", body: JSON.stringify({ action, expectedVersion: detail.product.version, note, confirmation, ...extra }) }),
      action === "delete" ? undefined : action === "duplicate" ? String(extra.newId) : id);
    if (action === "delete") { setSelected(null); setDetail(null); }
  };

  const status = detail?.product.status;
  return (
    <div className="cms">
      <section className="admin-card wide cms-list" aria-labelledby="cms-list-title">
        <div className="admin-card-head">
          <div><small>ÜRÜN CMS · NEON POSTGRESQL</small><h2 id="cms-list-title">Ürünler</h2></div>
          <div className="cms-toolbar">
            <label><span className="sr-only">Durum filtresi</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ProductStatus | "all")}>
                <option value="all">Tüm durumlar</option>
                {(Object.keys(STATUS_LABEL) as ProductStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="cms-check"><input type="checkbox" checked={showArchived} onChange={(event) => { const next = event.target.checked; setShowArchived(next); void reloadList(next).catch((error) => setNotice({ tone: "error", text: (error as Error).message })); }} /> Arşivi göster</label>
            <button type="button" className="admin-action" onClick={() => void reloadList()} disabled={busy}><RefreshCw size={14} aria-hidden="true" /> Yenile</button>
            {can(role, "product.write") && <button type="button" className="admin-action" onClick={() => { setSelected("new"); setDetail(null); setForm(emptyForm); setNotice(null); }}><Plus size={14} aria-hidden="true" /> Yeni ürün</button>}
          </div>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-data-table">
            <thead><tr><th scope="col">Görsel</th><th scope="col">Ürün</th><th scope="col">Durum</th><th scope="col">Fiyat</th><th scope="col">Stok</th><th scope="col">Sürüm</th><th scope="col"><span className="sr-only">Aç</span></th></tr></thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} className={selected === p.id ? "is-selected" : ""}>
                  <td><span className="admin-thumb is-concept">{images[p.id] ? <Image src={images[p.id].src} alt="" width={64} height={64} sizes="64px" /> : null}</span></td>
                  <td><b>{p.tr.name}</b><small>{p.sku ?? "SKU yok"} · <code>{p.id}</code></small></td>
                  <td><span className={`status-pill status-${STATUS_TONE[p.status]}`}>{STATUS_LABEL[p.status]}</span></td>
                  <td>{(p.priceKurus / 100).toLocaleString("tr-TR")} {p.currency}</td>
                  <td>{p.stock}</td>
                  <td>v{p.version}</td>
                  <td><button type="button" className="admin-action" onClick={() => void open(p.id)}>Aç</button></td>
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={7}>Bu filtreyle ürün yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {notice && <p className={`cms-notice is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p>}

      {selected && (
        <section className="admin-card wide cms-editor" aria-labelledby="cms-editor-title">
          <div className="admin-card-head">
            <div><small>{selected === "new" ? "YENİ ÜRÜN · TASLAK" : `${STATUS_LABEL[status!]} · v${detail?.product.version}`}</small><h2 id="cms-editor-title">{selected === "new" ? "Yeni ürün" : form.trName}</h2></div>
            {detail && <a className="admin-action" href={`/urun/${detail.product.id}`} target="_blank" rel="noreferrer"><Eye size={14} aria-hidden="true" /> Önizle</a>}
          </div>
          {detail && !editable && <p className="admin-notice">{status === "published" ? "Yayındaki ürün düzenlenemez. Değiştirmek için önce yayından kaldırın." : "Arşivdeki ürün düzenlenemez. Önce geri yükleyin."}</p>}
          <form className="cms-form" onSubmit={(event) => { event.preventDefault(); save(); }}>
            <fieldset><legend>Temel bilgiler</legend>
              <label>Kimlik (URL)<input {...field("id")} required pattern="[a-z0-9][a-z0-9-]{1,62}" disabled={selected !== "new"} /></label>
              <label>SKU<input {...field("sku")} placeholder="AD-T5-001" /></label>
              <label>Kategori<select {...field("category")}>{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Boyut / hacim<input {...field("size")} required /></label>
              <label>Fiyat<input {...field("priceTl")} inputMode="decimal" required /></label>
              <label>Para birimi<select {...field("currency")}><option>TRY</option><option>EUR</option><option>USD</option></select></label>
              <label>Stok (doğrulanmış)<input {...field("stock")} type="number" min="0" required /></label>
              <label>Etiketler (virgülle)<input {...field("tags")} /></label>
            </fieldset>
            <fieldset><legend>Türkçe</legend>
              <label>Ad<input {...field("trName")} required /></label>
              <label>Açıklama<textarea {...field("trDescription")} rows={4} /></label>
              <label>SEO başlığı <small>{form.trSeoTitle.length}/70</small><input {...field("trSeoTitle")} maxLength={70} /></label>
              <label>Meta açıklama <small>{form.trSeoDescription.length}/170</small><textarea {...field("trSeoDescription")} maxLength={170} rows={2} /></label>
            </fieldset>
            <fieldset><legend>English</legend>
              <label>Name<input {...field("enName")} /></label>
              <label>Description<textarea {...field("enDescription")} rows={4} /></label>
              <label>SEO title <small>{form.enSeoTitle.length}/70</small><input {...field("enSeoTitle")} maxLength={70} /></label>
              <label>Meta description <small>{form.enSeoDescription.length}/170</small><textarea {...field("enSeoDescription")} maxLength={170} rows={2} /></label>
            </fieldset>
            {editable && can(role, "product.write") && <button type="submit" className="cms-primary" disabled={busy}><Save size={16} aria-hidden="true" /> {selected === "new" ? "Taslak olarak oluştur" : "Değişiklikleri kaydet"}</button>}
            {selected !== "new" && editable && <small className="cms-hint">Kaydetmek incelenmiş/onaylı ürünü yeniden taslağa alır.</small>}
          </form>

          {detail && (
            <div className="cms-workflow">
              <h3><ShieldCheck size={16} aria-hidden="true" /> İş akışı</h3>
              <label>Not (onay geçmişine yazılır)<input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} /></label>
              <div className="cms-actions">
                {status === "draft" && can(role, "product.submit") && <button type="button" onClick={() => act("submit", "İncelemeye gönderildi")} disabled={busy}><Send size={14} aria-hidden="true" /> İncelemeye gönder</button>}
                {status === "in_review" && can(role, "product.approve") && <>
                  <button type="button" onClick={() => act("approve", "Onaylandı")} disabled={busy}><ShieldCheck size={14} aria-hidden="true" /> Onayla</button>
                  <button type="button" onClick={() => act("reject", "Taslağa iade edildi")} disabled={busy}><Undo2 size={14} aria-hidden="true" /> Reddet</button>
                </>}
                {status === "published" && can(role, "product.publish") && <button type="button" onClick={() => act("unpublish", "Yayından kaldırıldı")} disabled={busy}><Undo2 size={14} aria-hidden="true" /> Yayından kaldır</button>}
                {["draft", "in_review", "approved"].includes(status!) && can(role, "product.archive") && <button type="button" onClick={() => act("archive", "Arşivlendi")} disabled={busy}><Archive size={14} aria-hidden="true" /> Arşivle</button>}
                {status === "archived" && can(role, "product.restore") && <button type="button" onClick={() => act("restore", "Geri yüklendi")} disabled={busy}><RotateCcw size={14} aria-hidden="true" /> Geri yükle</button>}
              </div>
              {can(role, "product.write") && (
                <div className="cms-inline">
                  <label>Kopya kimliği<input value={copyId} onChange={(event) => setCopyId(event.target.value)} pattern="[a-z0-9][a-z0-9-]{1,62}" /></label>
                  <button type="button" onClick={() => act("duplicate", "Kopyalandı", { newId: copyId })} disabled={busy || !copyId}><Copy size={14} aria-hidden="true" /> Taslak kopya oluştur</button>
                </div>
              )}
              {status === "approved" && can(role, "product.publish") && (
                <div className="cms-danger">
                  <p><b>Yayımlama</b> ürünü mağazada satışa açar. Fiyatın, stokun ve ambalaj görselinin doğrulandığından emin olun.{!publishingEnabled && " Bu ortamda yayımlama kapalı (yalnızca Preview + PREVIEW_CATALOG_PUBLISH_ENABLED)."}</p>
                  <label>Onaylamak için <code>YAYINLA:{detail.product.id}</code> yazın<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
                  <button type="button" onClick={() => act("publish", "Yayımlandı")} disabled={busy || !publishingEnabled || confirmation !== `YAYINLA:${detail.product.id}`}><Upload size={14} aria-hidden="true" /> Yayımla</button>
                </div>
              )}
              {status === "archived" && can(role, "product.delete") && (
                <div className="cms-danger">
                  <p><b>Kalıcı silme</b> geri alınamaz. Siparişte veya yayın kaydında geçen ürünler silinemez; audit kaydı korunur.</p>
                  <label>Onaylamak için <code>SIL:{detail.product.id}</code> yazın<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
                  <button type="button" onClick={() => act("delete", "Kalıcı olarak silindi")} disabled={busy || confirmation !== `SIL:${detail.product.id}`}><Trash2 size={14} aria-hidden="true" /> Kalıcı sil</button>
                </div>
              )}
            </div>
          )}

          {detail && (
            <div className="cms-history">
              <h3><History size={16} aria-hidden="true" /> Değişiklik geçmişi</h3>
              <ol>{detail.revisions.map((revision) => <li key={revision.version}><b>v{revision.version}</b> · {revision.actorEmail} · {new Date(revision.createdAt).toLocaleString("tr-TR")}</li>)}</ol>
              <h3>Audit kaydı</h3>
              <ol>{detail.audit.map((row) => <li key={row.id}><code>{row.action}</code> · {row.actorEmail} · {new Date(row.createdAt).toLocaleString("tr-TR")}</li>)}</ol>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
