"use client";

import { useState } from "react";
import { Check, CircleAlert, ImagePlus, Link2, ShieldCheck, ShieldOff, Trash2, X } from "lucide-react";
import type { CmsProduct } from "../../db/postgres/cms-repository";
import type { ProductMedia } from "../../db/postgres/product-cms-repository";
import { can, type Role } from "../../lib/cms-permissions";
import { MEDIA_TRUTHS, MIN_PHOTO_SIDE, TRUTH_LABELS, type MediaTruth } from "../../lib/media-validation";
import { BLOCKER_LABELS, type PublishBlocker } from "../../lib/publish-blockers";

type Currency = "TRY" | "EUR" | "USD";
export type Run = (label: string, work: () => Promise<unknown>) => void;
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const response = await fetch(url, { ...init, headers: isForm ? init?.headers : { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const body = (await response.json().catch(() => ({}))) as { error?: string; issues?: Array<{ path: string; message: string }> } & Record<string, unknown>;
  if (!response.ok) {
    const issues = Array.isArray(body.issues) ? " — " + body.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ") : "";
    throw new Error((body.error ?? `İstek başarısız (${response.status})`) + issues);
  }
  return body as T;
}

const fmt = (minor: number, currency: Currency) =>
  (minor / 100).toLocaleString(currency === "TRY" ? "tr-TR" : "en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 });
const when = (ms: number) => new Date(ms).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });

/** Every condition, in order, with its current state — so an admin sees what is missing before trying to publish. */
const READINESS: Array<{ key: PublishBlocker; group: string }> = [
  { key: "sku", group: "Kimlik" }, { key: "packaging", group: "Kimlik" }, { key: "content_tr", group: "İçerik" },
  { key: "price_try", group: "Fiyat" }, { key: "price_try_approval", group: "Fiyat" }, { key: "price_eur_approval", group: "Fiyat" },
  { key: "price_usd_approval", group: "Fiyat" }, { key: "stock", group: "Stok" }, { key: "photo", group: "Görsel" },
];

export function ReadinessPanel({ product }: { product: CmsProduct }) {
  const missing = new Set(product.publishBlockers);
  const rows = READINESS.filter((r) => r.key === "price_eur_approval" ? product.priceEurCents !== null : r.key === "price_usd_approval" ? product.priceUsdCents !== null : true);
  const ready = missing.size === 0;
  return (
    <section className={`cms-readiness${ready ? " is-ready" : ""}`} aria-labelledby="readiness-title">
      <header>
        <h3 id="readiness-title">{ready ? <Check size={16} aria-hidden="true" /> : <CircleAlert size={16} aria-hidden="true" />} Yayına hazırlık</h3>
        <p>{ready ? "Tüm koşullar sağlandı. Onaylı (approved) ürün yayımlanabilir." : `${missing.size} koşul eksik — eksikler giderilmeden yayımlama veritabanında engellenir.`}</p>
      </header>
      <ul>
        {rows.map((r) => (
          <li key={r.key} className={missing.has(r.key) ? "is-missing" : "is-ok"}>
            {missing.has(r.key) ? <X size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
            <span><small>{r.group}</small>{BLOCKER_LABELS[r.key]}</span>
            <b className="sr-only">{missing.has(r.key) ? "eksik" : "tamam"}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Saved prices with their commercial approval. Approval acts on the SAVED amount only. */
export function PricePanel({ product, role, editable, dirty, run }: { product: CmsProduct; role: Role; editable: boolean; dirty: Record<Currency, boolean>; run: Run }) {
  const saved: Record<Currency, number | null> = { TRY: product.priceKurus, EUR: product.priceEurCents, USD: product.priceUsdCents };
  const mayApprove = can(role, "price.approve");
  return (
    <section className="cms-prices" aria-labelledby="prices-title">
      <h3 id="prices-title"><ShieldCheck size={16} aria-hidden="true" /> Fiyatlar ve ticari onay</h3>
      <p className="admin-help">Seed fiyatları onaylı sayılmaz. Onay; onaylayanı, zamanı, para birimini ve tutarı kaydeder. Fiyat değişirse onay otomatik iptal edilir. EUR/USD kurla hesaplanmaz; boş bırakılan para biriminde satış yapılmaz.</p>
      <table className="admin-data-table cms-price-table">
        <thead><tr><th scope="col">Para birimi</th><th scope="col">Kayıtlı tutar</th><th scope="col">Ticari onay</th><th scope="col"><span className="sr-only">İşlem</span></th></tr></thead>
        <tbody>
          {(["TRY", "EUR", "USD"] as Currency[]).map((currency) => {
            const amount = saved[currency];
            const approval = product.priceApprovals.find((a) => a.currency === currency);
            const valid = approval && amount !== null && approval.amountMinor === amount;
            return (
              <tr key={currency} data-currency={currency}>
                <th scope="row">{currency}</th>
                <td>{amount === null ? <span className="status-pill status-muted">Satış yok</span> : fmt(amount, currency)}</td>
                <td>
                  {amount === null ? "—" : valid
                    ? <span className="status-pill status-ok">Onaylı</span>
                    : <span className="status-pill status-warn">Onay bekliyor</span>}
                  {valid && <small>{approval!.approvedBy} · {when(approval!.approvedAt)}</small>}
                </td>
                <td>
                  {mayApprove && editable && amount !== null && !valid && (
                    <button type="button" className="admin-action" disabled={dirty[currency]} title={dirty[currency] ? "Önce fiyat değişikliğini kaydedin" : undefined}
                      onClick={() => run(`${currency} fiyatı onaylandı`, () => api(`/api/admin/cms/products/${product.id}/prices`, { method: "POST", body: JSON.stringify({ action: "approve", currency, amountMinor: amount, expectedVersion: product.version }) }))}>
                      <ShieldCheck size={13} aria-hidden="true" /> {fmt(amount, currency)} onayla
                    </button>
                  )}
                  {mayApprove && editable && valid && (
                    <button type="button" className="admin-action" onClick={() => run(`${currency} fiyat onayı kaldırıldı`, () => api(`/api/admin/cms/products/${product.id}/prices`, { method: "POST", body: JSON.stringify({ action: "revoke", currency }) }))}>
                      <ShieldOff size={13} aria-hidden="true" /> Onayı kaldır
                    </button>
                  )}
                  {!mayApprove && amount !== null && !valid && <small>Yalnızca yetkili sahip onaylar</small>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

const truthTone: Record<MediaTruth, string> = { photo: "ok", editorial: "muted", concept: "warn", range: "warn" };

export function MediaPanel({ product, role, editable, run }: { product: CmsProduct; role: Role; editable: boolean; run: Run }) {
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [truth, setTruth] = useState<MediaTruth>("photo");
  const mayWrite = can(role, "media.write") && editable;
  const mayApprove = can(role, "media.approve") && editable;
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const url = `/api/admin/cms/products/${product.id}/media`;
    run(mode === "upload" ? "Görsel yüklendi" : "Görsel bağlandı", async () => {
      if (mode === "upload") await api(url, { method: "POST", body: data });
      else await api(url, { method: "POST", body: JSON.stringify(Object.fromEntries(data)) });
      form.reset();
    });
  };
  return (
    <section className="cms-media" aria-labelledby="media-title">
      <h3 id="media-title"><ImagePlus size={16} aria-hidden="true" /> Ürün görselleri</h3>
      <p className="admin-help">Gerçek ürün fotoğrafı, konsept ve editoryal görseller ayrı tutulur. Yayın için <b>sahibin onayladığı gerçek fotoğraf</b> gerekir; konsept veya seri görseli asla onaylanamaz.</p>
      {product.media.length === 0 ? <p className="cms-empty">Bu ürüne bağlı görsel yok.</p> : (
        <ul className="cms-media-grid">
          {product.media.map((m: ProductMedia) => (
            <li key={m.id} data-truth={m.truth}>
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of DB-hosted images */}
              <img src={m.url} alt={m.altTr} loading="lazy" width={160} height={160} />
              <div>
                <span className={`status-pill status-${truthTone[m.truth]}`}>{TRUTH_LABELS[m.truth]}</span>
                {(m.truth === "photo" || m.truth === "editorial") && (m.approvedAt
                  ? <span className="status-pill status-ok">Onaylı</span>
                  : <span className="status-pill status-warn">Onay bekliyor</span>)}
                <small>{m.width && m.height ? `${m.width}×${m.height} · ` : ""}{m.mime.replace("image/", "")}{m.credit ? ` · ${m.credit}` : ""}</small>
                {m.approvedAt && <small>{m.approvedBy} · {when(m.approvedAt)}</small>}
                <div className="cms-media-actions">
                  {mayApprove && (m.truth === "photo" || m.truth === "editorial") && (
                    <button type="button" className="admin-action" onClick={() => run(m.approvedAt ? "Görsel onayı kaldırıldı" : "Görsel onaylandı", () => api(`/api/admin/cms/media/${m.id}/approval`, { method: "POST", body: JSON.stringify({ approve: !m.approvedAt }) }))}>
                      {m.approvedAt ? <><ShieldOff size={13} aria-hidden="true" /> Onayı kaldır</> : <><ShieldCheck size={13} aria-hidden="true" /> Gerçek görsel olarak onayla</>}
                    </button>
                  )}
                  {mayWrite && (
                    <button type="button" className="admin-action" aria-label={`${m.altTr} görselini üründen kaldır`} onClick={() => run("Görsel kaldırıldı", () => api(`/api/admin/cms/products/${product.id}/media/${m.id}`, { method: "DELETE" }))}>
                      <Trash2 size={13} aria-hidden="true" /> Kaldır
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {mayWrite && (
        <form className="cms-form cms-media-form" onSubmit={submit}>
          <div className="cms-segment" role="radiogroup" aria-label="Görsel ekleme yöntemi">
            <label><input type="radio" name="mode" checked={mode === "upload"} onChange={() => setMode("upload")} /> Dosya yükle</label>
            <label><input type="radio" name="mode" checked={mode === "link"} onChange={() => { setMode("link"); if (truth === "photo") setTruth("concept"); }} /> <Link2 size={13} aria-hidden="true" /> Sitedeki görseli bağla</label>
          </div>
          <fieldset><legend>Yeni görsel</legend>
            {mode === "upload"
              ? <label>Dosya (JPEG, PNG, WebP, AVIF · en fazla 4 MB)<input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required /></label>
              : <label>Görsel yolu<input name="url" placeholder="/products/concepts/tin-3l.webp" required pattern="/.+\.(webp|jpe?g|png|avif)" /></label>}
            <label>Görsel türü
              <select name="truth" value={truth} onChange={(event) => setTruth(event.target.value as MediaTruth)}>
                {MEDIA_TRUTHS.filter((t) => mode === "upload" || t !== "photo").map((t) => <option key={t} value={t}>{TRUTH_LABELS[t]}</option>)}
              </select>
            </label>
            <label>Alternatif metin (TR)<input name="altTr" required minLength={3} maxLength={240} /></label>
            <label>Alternatif metin (EN)<input name="altEn" maxLength={240} /></label>
            <label>Kaynak / fotoğrafçı<input name="credit" maxLength={160} /></label>
            <label>Lisans<input name="license" maxLength={160} /></label>
            {truth === "photo" && <p className="admin-help">Gerçek fotoğrafın kısa kenarı en az {MIN_PHOTO_SIDE} px olmalı. Yüklemek onay değildir; sahibin ayrıca onaylaması gerekir.</p>}
          </fieldset>
          <button type="submit" className="cms-primary"><ImagePlus size={15} aria-hidden="true" /> {mode === "upload" ? "Yükle" : "Bağla"}</button>
        </form>
      )}
    </section>
  );
}

export type CollectionLite = { id: string; status: string; version: number; tr: { title: string }; productIds: string[] };

/** Membership is written through the collection API (its own RBAC, audit and version check). */
export function CollectionsPanel({ product, role, collections, run }: { product: CmsProduct; role: Role; collections: CollectionLite[] | null; run: Run }) {
  const mayEdit = can(role, "blog.write");
  return (
    <section className="cms-collections-panel" aria-labelledby="collections-title">
      <h3 id="collections-title">Koleksiyonlar</h3>
      {collections === null ? <p className="cms-empty">Koleksiyonlar yüklenemedi.</p> : collections.length === 0 ? <p className="cms-empty">Henüz koleksiyon yok (Koleksiyonlar ekranından oluşturulur).</p> : (
        <ul>
          {collections.map((c) => {
            const member = c.productIds.includes(product.id);
            return (
              <li key={c.id}>
                <label className="cms-check">
                  <input type="checkbox" checked={member} disabled={!mayEdit}
                    onChange={() => run(member ? `"${c.tr.title}" koleksiyonundan çıkarıldı` : `"${c.tr.title}" koleksiyonuna eklendi`, () => api(`/api/admin/cms/collections/${c.id}/products`, {
                      method: "PUT", body: JSON.stringify({ expectedVersion: c.version, productIds: member ? c.productIds.filter((id) => id !== product.id) : [...c.productIds, product.id] }),
                    }))} />
                  {c.tr.title} <span className={`status-pill status-${c.status === "published" ? "live" : "muted"}`}>{c.status === "published" ? "Yayında" : c.status === "archived" ? "Arşivde" : "Taslak"}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
