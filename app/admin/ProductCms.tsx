"use client";

import Image from "next/image";
import { Archive, Copy, Eye, History, Plus, RefreshCw, RotateCcw, Save, Send, ShieldCheck, Trash2, Undo2, Upload } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { CmsProduct, ProductStatus, AuditRow, RevisionRow } from "../../db/postgres/cms-repository";
import { BLOCKER_LABELS } from "../../lib/publish-blockers";
import { can, type Role } from "../../lib/cms-permissions";
import { AiAssist } from "./AiAssist";
import { api, CollectionsPanel, MediaPanel, PricePanel, ReadinessPanel, type CollectionLite } from "./ProductCmsPanels";
import { PACKAGING } from "../../lib/cms-validation";

/**
 * Product CMS. Every button calls the real API; success is only shown after
 * the server confirms the write. The server enforces permissions — buttons
 * are hidden here only for convenience.
 */
type Detail = { product: CmsProduct; revisions: RevisionRow[]; audit: AuditRow[] };
type Text = "Name" | "Description" | "SeoTitle" | "SeoDescription" | "Origin" | "Ingredients" | "Usage" | "Storage";
type Form = {
  id: string; sku: string; sizeFamily: string; category: string; size: string; packaging: string; netVolumeMl: string; netWeightG: string;
  priceTl: string; priceEur: string; priceUsd: string; stock: string; shipsTo: string; tags: string;
} & Record<`tr${Text}` | `en${Text}`, string>;

const PACKAGING_LABEL: Record<(typeof PACKAGING)[number], string> = {
  glass_bottle: "Cam şişe", tin: "Teneke", gift_box: "Hediye kutusu", jar: "Kavanoz", pouch: "Poşet", box: "Kutu", set: "Set",
  subscription: "Abonelik", experience: "Deneyim",
};
const TEXTS: Text[] = ["Name", "Description", "SeoTitle", "SeoDescription", "Origin", "Ingredients", "Usage", "Storage"];
const KEY: Record<Text, keyof CmsProduct["tr"]> = { Name: "name", Description: "description", SeoTitle: "seoTitle", SeoDescription: "seoDescription", Origin: "origin", Ingredients: "ingredients", Usage: "usage", Storage: "storage" };

const STATUS_LABEL: Record<ProductStatus, string> = { draft: "Taslak", in_review: "İncelemede", approved: "Onaylı", published: "Yayında", archived: "Arşivde" };
const STATUS_TONE: Record<ProductStatus, string> = { draft: "muted", in_review: "warn", approved: "ok", published: "live", archived: "bad" };
const CATEGORIES = [["glass", "Cam seri"], ["luxury", "Özel seri"], ["tin", "Teneke"], ["pantry", "Kiler"], ["subscription", "Abonelik"]] as const;

const emptyForm = {
  id: "", sku: "", sizeFamily: "", category: "glass", size: "", packaging: "", netVolumeMl: "", netWeightG: "",
  priceTl: "", priceEur: "", priceUsd: "", stock: "0", shipsTo: "TR", tags: "",
  ...Object.fromEntries(TEXTS.flatMap((t) => [[`tr${t}`, ""], [`en${t}`, ""]])),
} as Form;

const toMoney = (minor: number | null) => minor === null ? "" : String(minor / 100);
const toMinor = (value: string) => value.trim() === "" ? null : Math.round(Number(value.replace(",", ".")) * 100);
const toInt = (value: string) => value.trim() === "" ? null : Number(value);

function toForm(p: CmsProduct): Form {
  return {
    id: p.id, sku: p.sku ?? "", sizeFamily: p.sizeFamily ?? "", category: p.category, size: p.size, packaging: p.packaging ?? "",
    netVolumeMl: p.netVolumeMl === null ? "" : String(p.netVolumeMl), netWeightG: p.netWeightG === null ? "" : String(p.netWeightG),
    priceTl: toMoney(p.priceKurus), priceEur: toMoney(p.priceEurCents), priceUsd: toMoney(p.priceUsdCents),
    stock: String(p.stock), shipsTo: p.shipsTo.join(", "), tags: p.tags.join(", "),
    ...Object.fromEntries(TEXTS.flatMap((t) => [[`tr${t}`, p.tr[KEY[t]] ?? ""], [`en${t}`, p.en[KEY[t]] ?? ""]])),
  } as Form;
}

function toPayload(form: Form) {
  const text = (lang: "tr" | "en") => Object.fromEntries(TEXTS.map((t) => [KEY[t], form[`${lang}${t}`]]));
  return {
    ...(form.id ? { id: form.id } : {}),
    sku: form.sku.trim() ? form.sku.trim() : null,
    sizeFamily: form.sizeFamily.trim() ? form.sizeFamily.trim() : null,
    category: form.category, size: form.size,
    packaging: form.packaging || null, netVolumeMl: toInt(form.netVolumeMl), netWeightG: toInt(form.netWeightG),
    priceKurus: toMinor(form.priceTl) ?? 0, priceEurCents: toMinor(form.priceEur), priceUsdCents: toMinor(form.priceUsd),
    currency: "TRY", stock: Number(form.stock),
    shipsTo: form.shipsTo.split(",").map((code) => code.trim().toUpperCase()).filter(Boolean),
    tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    tr: text("tr"), en: text("en"),
  };
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
  const [collections, setCollections] = useState<CollectionLite[] | null>(null);
  const [lang, setLang] = useState<"tr" | "en">("tr");

  const reloadList = useCallback(async (archived = showArchived) => {
    setProducts(await api<CmsProduct[]>(`/api/admin/cms/products${archived ? "?archived=1" : ""}`));
  }, [showArchived]);

  const open = useCallback(async (id: string) => {
    setSelected(id); setNotice(null); setConfirmation(""); setNote("");
    try {
      const [data, list] = await Promise.all([
        api<Detail>(`/api/admin/cms/products/${encodeURIComponent(id)}`),
        api<{ collections: CollectionLite[] }>("/api/admin/cms/collections").catch(() => null),
      ]);
      setDetail(data); setForm(toForm(data.product)); setCopyId(`${id}-kopya`); setCollections(list?.collections ?? null);
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

  const panelRun = (label: string, work: () => Promise<unknown>) => { if (detail) void run(label, work, detail.product.id); };
  const dirty = {
    TRY: Boolean(detail) && toMinor(form.priceTl) !== detail!.product.priceKurus,
    EUR: Boolean(detail) && toMinor(form.priceEur) !== detail!.product.priceEurCents,
    USD: Boolean(detail) && toMinor(form.priceUsd) !== detail!.product.priceUsdCents,
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
            <thead><tr><th scope="col">Görsel</th><th scope="col">Ürün</th><th scope="col">Durum</th><th scope="col">TL fiyatı</th><th scope="col">Stok</th><th scope="col">Yayına hazır</th><th scope="col"><span className="sr-only">Aç</span></th></tr></thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} className={selected === p.id ? "is-selected" : ""}>
                  <td><span className="admin-thumb is-concept">{images[p.id] ? <Image src={images[p.id].src} alt="" width={64} height={64} sizes="64px" /> : null}</span></td>
                  <td><b>{p.tr.name}</b><small>{p.sku ?? "SKU yok"}{p.sizeFamily ? ` · ${p.sizeFamily}` : ""} · <code>{p.id}</code></small></td>
                  <td><span className={`status-pill status-${STATUS_TONE[p.status]}`}>{STATUS_LABEL[p.status]}</span></td>
                  <td>{(p.priceKurus / 100).toLocaleString("tr-TR")} TL{p.priceApprovals.some((a) => a.currency === "TRY" && a.amountMinor === p.priceKurus)
                    ? <small className="status-pill status-ok">Onaylı</small> : <small className="status-pill status-warn">Onaysız</small>}</td>
                  <td>{p.stock}</td>
                  <td>{p.publishBlockers.length === 0 ? <span className="status-pill status-ok">Hazır</span> : <span className="status-pill status-bad">{p.publishBlockers.length} eksik</span>}<small>v{p.version}</small></td>
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
          {detail && <ReadinessPanel product={detail.product} />}
          {detail && !editable && <p className="admin-notice">{status === "published" ? "Yayındaki ürün düzenlenemez. Değiştirmek için önce yayından kaldırın." : "Arşivdeki ürün düzenlenemez. Önce geri yükleyin."}</p>}
          <form className="cms-form" onSubmit={(event) => { event.preventDefault(); save(); }}>
            <fieldset><legend>Kimlik ve ambalaj</legend>
              <label>Kimlik (URL)<input {...field("id")} required pattern="[a-z0-9][a-z0-9-]{1,62}" disabled={selected !== "new"} /></label>
              <label>SKU <small>yayın için zorunlu</small><input {...field("sku")} placeholder="AD-…" pattern="[A-Z0-9][A-Z0-9-]{2,40}" /></label>
              <label>Ürün ailesi (boy grubu)<input {...field("sizeFamily")} placeholder="ör. cam-seri" pattern="[a-z0-9][a-z0-9-]{1,39}" /></label>
              <label>Kategori<select {...field("category")}>{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Ambalaj tipi <small>yayın için zorunlu</small><select {...field("packaging")}><option value="">Seçilmedi</option>{PACKAGING.map((value) => <option key={value} value={value}>{PACKAGING_LABEL[value]}</option>)}</select></label>
              <label>Boyut etiketi<input {...field("size")} required placeholder="500 ml" /></label>
              <label>Net hacim (ml)<input {...field("netVolumeMl")} type="number" min="1" inputMode="numeric" /></label>
              <label>Net ağırlık (g)<input {...field("netWeightG")} type="number" min="1" inputMode="numeric" /></label>
            </fieldset>
            <fieldset><legend>Fiyat, stok ve satış</legend>
              <label>TL fiyatı (taban)<input {...field("priceTl")} inputMode="decimal" required /></label>
              <label>EUR fiyatı <small>boş = EUR satış yok</small><input {...field("priceEur")} inputMode="decimal" /></label>
              <label>USD fiyatı <small>boş = USD satış yok</small><input {...field("priceUsd")} inputMode="decimal" /></label>
              <label>Stok (doğrulanmış)<input {...field("stock")} type="number" min="0" required /></label>
              <label>Gönderim ülkeleri <small>ISO kodları, virgülle</small><input {...field("shipsTo")} placeholder="TR" /></label>
              <label>Etiketler (virgülle)<input {...field("tags")} /></label>
              <p className="admin-help">Fiyatlar kurla hesaplanmaz. Fiyatı değiştirmek o para birimindeki ticari onayı iptal eder. Sipariş şu an yalnızca TL ve Türkiye için alınır.</p>
            </fieldset>
            <fieldset className="cms-lang"><legend>Ürün içeriği</legend>
              <div className="cms-segment" role="tablist" aria-label="İçerik dili">
                <button type="button" role="tab" aria-selected={lang === "tr"} onClick={() => setLang("tr")}>Türkçe</button>
                <button type="button" role="tab" aria-selected={lang === "en"} onClick={() => setLang("en")}>English</button>
              </div>
              {(["tr", "en"] as const).map((l) => (
                <div key={l} role="tabpanel" hidden={lang !== l} className="cms-lang-panel" lang={l}>
                  <label>{l === "tr" ? "Ad" : "Name"}<input {...field(`${l}Name`)} required={l === "tr"} /></label>
                  <label>{l === "tr" ? "Açıklama" : "Description"}<textarea {...field(`${l}Description`)} rows={4} /></label>
                  <label>{l === "tr" ? "Köken" : "Origin"}<textarea {...field(`${l}Origin`)} rows={2} placeholder={l === "tr" ? "Doğrulanmış bilgi yoksa boş bırakın" : "Leave empty unless verified"} /></label>
                  <label>{l === "tr" ? "İçerik / bileşenler" : "Ingredients"}<textarea {...field(`${l}Ingredients`)} rows={2} /></label>
                  <label>{l === "tr" ? "Kullanım" : "Usage"}<textarea {...field(`${l}Usage`)} rows={2} /></label>
                  <label>{l === "tr" ? "Saklama" : "Storage"}<textarea {...field(`${l}Storage`)} rows={2} /></label>
                  <label>{l === "tr" ? "SEO başlığı" : "SEO title"} <small>{form[`${l}SeoTitle`].length}/70</small><input {...field(`${l}SeoTitle`)} maxLength={70} /></label>
                  <label>{l === "tr" ? "Meta açıklama" : "Meta description"} <small>{form[`${l}SeoDescription`].length}/170</small><textarea {...field(`${l}SeoDescription`)} maxLength={170} rows={2} /></label>
                </div>
              ))}
            </fieldset>
            {editable && can(role, "product.write") && <button type="submit" className="cms-primary" disabled={busy}><Save size={16} aria-hidden="true" /> {selected === "new" ? "Taslak olarak oluştur" : "Değişiklikleri kaydet"}</button>}
            {selected !== "new" && editable && <small className="cms-hint">Kaydetmek incelenmiş/onaylı ürünü yeniden taslağa alır.</small>}
          </form>

          {detail && <PricePanel product={detail.product} role={role} editable={Boolean(editable)} dirty={dirty} run={panelRun} />}
          {detail && <MediaPanel product={detail.product} role={role} editable={Boolean(editable)} run={panelRun} />}
          {detail && <CollectionsPanel product={detail.product} role={role} collections={collections} run={panelRun} />}

          {can(role, "ai.use") && <AiAssist form={form} productId={detail?.product.id} disabled={!editable || !can(role, "product.write")} onApply={(patch) => setForm({ ...form, ...patch })} />}

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
                  {detail.product.publishBlockers.length > 0 && <p className="admin-help" role="note"><b>Yayımlanamaz — eksik:</b> {detail.product.publishBlockers.map((b) => BLOCKER_LABELS[b] ?? b).join(", ")}.</p>}
                  <button type="button" onClick={() => act("publish", "Yayımlandı")} disabled={busy || !publishingEnabled || detail.product.publishBlockers.length > 0 || confirmation !== `YAYINLA:${detail.product.id}`}><Upload size={14} aria-hidden="true" /> Yayımla</button>
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
