"use client";

import { ArrowDown, ArrowUp, Plus, Save, Send, Trash2, Undo2, Archive, RotateCcw } from "lucide-react";
import { useCallback, useState } from "react";
import type { CmsCollection, CmsExperienceSection, ShowcaseStatus } from "../../db/postgres/showcase-repository";
import { can, type Role } from "../../lib/cms-permissions";
import { EXPERIENCE_KINDS, experienceKindLabels } from "../../lib/showcase-validation";

/**
 * Collections and experience CMS. Every action calls the real API and reports
 * success only after the server confirms. Publishing needs owner + typed confirmation.
 */
const STATUS: Record<ShowcaseStatus, string> = { draft: "Taslak", published: "Yayında", archived: "Arşivde" };
const TONE: Record<ShowcaseStatus, string> = { draft: "muted", published: "live", archived: "bad" };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json" } });
  const body = (await response.json().catch(() => ({}))) as { error?: string; issues?: Array<{ path: string; message: string }> };
  if (!response.ok) throw new Error((body.error ?? `İstek başarısız (${response.status})`) + (body.issues ? " — " + body.issues.map((i) => `${i.path}: ${i.message}`).join("; ") : ""));
  return body as T;
}

function useRunner(reload: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const run = async (label: string, work: () => Promise<unknown>, after?: () => Promise<void>) => {
    setBusy(true); setNotice(null);
    try { await work(); await reload(); if (after) await after(); setNotice({ tone: "ok", text: `${label}: veritabanına kaydedildi.` }); return true; }
    catch (error) { setNotice({ tone: "error", text: `${label} başarısız: ${(error as Error).message}` }); return false; }
    finally { setBusy(false); }
  };
  return { busy, notice, run };
}

function Workflow({ status, id, version, role, publishingEnabled, endpoint, run, busy }: { status: ShowcaseStatus; id: string; version: number; role: Role; publishingEnabled: boolean; endpoint: string; run: (label: string, work: () => Promise<unknown>) => Promise<boolean>; busy: boolean }) {
  const [confirmation, setConfirmation] = useState("");
  const act = (action: string, label: string) => void run(label, () => api(`${endpoint}/${id}/actions`, { method: "POST", body: JSON.stringify({ action, expectedVersion: version, confirmation }) })).then((ok) => ok && setConfirmation(""));
  return (
    <div className="cms-workflow">
      <div className="cms-actions">
        {status === "published" && can(role, "blog.publish") && <button type="button" disabled={busy} onClick={() => act("unpublish", "Yayından kaldırıldı")}><Undo2 size={14} aria-hidden="true" /> Yayından kaldır</button>}
        {status === "draft" && can(role, "blog.write") && <button type="button" disabled={busy} onClick={() => act("archive", "Arşivlendi")}><Archive size={14} aria-hidden="true" /> Arşivle</button>}
        {status === "archived" && can(role, "blog.publish") && <button type="button" disabled={busy} onClick={() => act("restore", "Geri yüklendi")}><RotateCcw size={14} aria-hidden="true" /> Geri yükle</button>}
      </div>
      {status === "draft" && can(role, "blog.publish") && (
        <div className="cms-danger">
          <h4>Yayımla</h4>
          {!publishingEnabled && <p className="admin-help">Bu ortamda yayımlama kapalı (yalnızca Preview + PREVIEW_CATALOG_PUBLISH_ENABLED).</p>}
          <label>Onay için <code>YAYINLA:{id}</code> yazın<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></label>
          <button type="button" disabled={busy || !publishingEnabled || confirmation !== `YAYINLA:${id}`} onClick={() => act("publish", "Yayımlandı")}><Send size={14} aria-hidden="true" /> Yayımla</button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ collections

type CForm = { slugTr: string; slugEn: string; position: string; coverUrl: string; coverAlt: string; coverCredit: string; coverLicense: string; trTitle: string; trIntro: string; trSeoTitle: string; trSeoDescription: string; enTitle: string; enIntro: string; enSeoTitle: string; enSeoDescription: string };
const emptyC: CForm = { slugTr: "", slugEn: "", position: "0", coverUrl: "", coverAlt: "", coverCredit: "", coverLicense: "", trTitle: "", trIntro: "", trSeoTitle: "", trSeoDescription: "", enTitle: "", enIntro: "", enSeoTitle: "", enSeoDescription: "" };
const toCForm = (c: CmsCollection): CForm => ({ slugTr: c.slugTr, slugEn: c.slugEn ?? "", position: String(c.position), coverUrl: c.cover?.url ?? "", coverAlt: c.cover?.alt ?? "", coverCredit: c.cover?.credit ?? "", coverLicense: c.cover?.license ?? "", trTitle: c.tr.title, trIntro: c.tr.intro, trSeoTitle: c.tr.seoTitle, trSeoDescription: c.tr.seoDescription, enTitle: c.en.title, enIntro: c.en.intro, enSeoTitle: c.en.seoTitle, enSeoDescription: c.en.seoDescription });
const cPayload = (f: CForm) => ({
  slugTr: f.slugTr.trim(), slugEn: f.slugEn.trim() || null, position: Number(f.position) || 0,
  cover: f.coverUrl.trim() ? { url: f.coverUrl.trim(), alt: f.coverAlt, credit: f.coverCredit, license: f.coverLicense } : null,
  tr: { title: f.trTitle, intro: f.trIntro, seoTitle: f.trSeoTitle, seoDescription: f.trSeoDescription },
  en: { title: f.enTitle, intro: f.enIntro, seoTitle: f.enSeoTitle, seoDescription: f.enSeoDescription },
});

export function CollectionsCms({ initial, products, role, publishingEnabled }: { initial: CmsCollection[]; products: Array<{ id: string; name: string; status: string }>; role: Role; publishingEnabled: boolean }) {
  const [items, setItems] = useState(initial);
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<CForm>(emptyC);
  const [order, setOrder] = useState<string[]>([]);
  const reload = useCallback(async () => { setItems((await api<{ collections: CmsCollection[] }>("/api/admin/cms/collections?archived=1")).collections); }, []);
  const { busy, notice, run } = useRunner(reload);
  const current = items.find((c) => c.id === selected) ?? null;
  const editable = selected === "new" || (current ? current.status !== "archived" : false);
  const canWrite = can(role, "blog.write") && editable;
  const field = (key: keyof CForm) => ({ value: form[key], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value }), disabled: !canWrite });
  const open = (c: CmsCollection) => { setSelected(c.id); setForm(toCForm(c)); setOrder(c.productIds); };
  const move = (index: number, delta: number) => { const next = [...order]; const [x] = next.splice(index, 1); next.splice(index + delta, 0, x); setOrder(next); };
  const save = () => selected === "new"
    ? void run("Koleksiyon oluşturuldu", () => api("/api/admin/cms/collections", { method: "POST", body: JSON.stringify(cPayload(form)) }), async () => setSelected(form.slugTr.trim()))
    : current && void run("Koleksiyon kaydedildi", () => api(`/api/admin/cms/collections/${current.id}`, { method: "PATCH", body: JSON.stringify({ ...cPayload(form), expectedVersion: current.version }) }));
  const saveProducts = () => current && void run("Ürün sırası", () => api(`/api/admin/cms/collections/${current.id}/products`, { method: "PUT", body: JSON.stringify({ expectedVersion: current.version, productIds: order }) }));
  const name = (id: string) => products.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="cms">
      <section className="admin-card wide" aria-labelledby="col-title">
        <div className="admin-card-head"><div><small>KOLEKSİYONLAR · POSTGRESQL</small><h2 id="col-title">Koleksiyonlar</h2></div>
          {can(role, "blog.write") && <button type="button" className="admin-action" onClick={() => { setSelected("new"); setForm(emptyC); setOrder([]); }}><Plus size={14} aria-hidden="true" /> Yeni koleksiyon</button>}</div>
        {items.length === 0 ? <p className="admin-help">Henüz koleksiyon yok. Yayımlanmış koleksiyon olmadığında /koleksiyon sayfası mevcut seri görünümünü gösterir.</p> : (
          <div className="admin-table-scroll"><table className="admin-data-table">
            <thead><tr><th scope="col">Başlık</th><th scope="col">Slug (TR / EN)</th><th scope="col">Ürün</th><th scope="col">Durum</th><th scope="col"><span className="sr-only">İşlem</span></th></tr></thead>
            <tbody>{items.map((c) => <tr key={c.id}><td><b>{c.tr.title}</b></td><td>/{c.slugTr} · {c.slugEn ? `/${c.slugEn}` : "—"}</td><td>{c.productIds.length}</td><td><span className={`cms-status is-${TONE[c.status]}`}>{STATUS[c.status]} · v{c.version}</span></td><td><button type="button" className="admin-action" onClick={() => open(c)}>Aç</button></td></tr>)}</tbody>
          </table></div>)}
      </section>
      {notice && <p className={`cms-notice is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p>}
      {selected && (
        <section className="admin-card wide cms-editor" aria-labelledby="col-editor">
          <div className="admin-card-head"><div><small>{selected === "new" ? "YENİ · TASLAK" : `${STATUS[current!.status]} · v${current!.version}`}</small><h2 id="col-editor">{form.trTitle || "Yeni koleksiyon"}</h2></div>
            {current?.status === "published" && <a className="admin-action" href={`/koleksiyon/${current.slugTr}`} target="_blank" rel="noreferrer">Sitede gör</a>}</div>
          {current?.status === "published" && <p className="admin-notice">Kaydetmek veya ürün sırasını değiştirmek koleksiyonu taslağa alır; yeniden yayımlanana kadar sitede görünmez.</p>}
          <form className="cms-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <fieldset><legend>Temel</legend>
              <label>TR slug<input {...field("slugTr")} required pattern="[a-z0-9-]{2,80}" /></label>
              <label>EN slug (isteğe bağlı)<input {...field("slugEn")} pattern="[a-z0-9-]{2,80}" /></label>
              <label>Sıra<input {...field("position")} type="number" min="0" /></label>
              <label>Kapak URL<input {...field("coverUrl")} /></label>
              <label>Kapak alt metni<input {...field("coverAlt")} /></label>
              <label>Kaynak<input {...field("coverCredit")} /></label>
              <label>Lisans<input {...field("coverLicense")} /></label>
            </fieldset>
            <fieldset><legend>Türkçe</legend>
              <label>Başlık<input {...field("trTitle")} required /></label>
              <label>Giriş<textarea {...field("trIntro")} rows={3} /></label>
              <label>SEO başlığı <small>{form.trSeoTitle.length}/70</small><input {...field("trSeoTitle")} maxLength={70} /></label>
              <label>Meta açıklama <small>{form.trSeoDescription.length}/170</small><textarea {...field("trSeoDescription")} maxLength={170} rows={2} /></label>
            </fieldset>
            <fieldset><legend>English</legend>
              <label>Title<input {...field("enTitle")} /></label>
              <label>Intro<textarea {...field("enIntro")} rows={3} /></label>
              <label>SEO title <small>{form.enSeoTitle.length}/70</small><input {...field("enSeoTitle")} maxLength={70} /></label>
              <label>Meta description <small>{form.enSeoDescription.length}/170</small><textarea {...field("enSeoDescription")} maxLength={170} rows={2} /></label>
            </fieldset>
            {canWrite && <button type="submit" className="cms-primary" disabled={busy}><Save size={16} aria-hidden="true" /> {selected === "new" ? "Taslak oluştur" : "Kaydet"}</button>}
          </form>
          {current && current.status !== "archived" && (
            <div className="cms-workflow">
              <h3>Ürünler ve sıralama</h3>
              <ol className="showcase-order">{order.map((id, index) => (
                <li key={id}><span>{index + 1}. {name(id)}</span>
                  <button type="button" aria-label={`${name(id)} yukarı`} disabled={!canWrite || index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></button>
                  <button type="button" aria-label={`${name(id)} aşağı`} disabled={!canWrite || index === order.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></button>
                  <button type="button" aria-label={`${name(id)} çıkar`} disabled={!canWrite} onClick={() => setOrder(order.filter((x) => x !== id))}><Trash2 size={14} /></button>
                </li>))}</ol>
              {canWrite && <label>Ürün ekle<select value="" onChange={(e) => e.target.value && setOrder([...order, e.target.value])}>
                <option value="">Seçin…</option>{products.filter((p) => !order.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.status})</option>)}
              </select></label>}
              {canWrite && <button type="button" className="cms-primary" disabled={busy} onClick={saveProducts}>Ürün listesini kaydet</button>}
            </div>
          )}
          {current && <Workflow status={current.status} id={current.id} version={current.version} role={role} publishingEnabled={publishingEnabled} endpoint="/api/admin/cms/collections" run={run} busy={busy} />}
        </section>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ experience

type Media = CmsExperienceSection["media"][number];
type EForm = { kind: string; position: string; related: string; relatedCollections: string; media: Media[]; trTitle: string; trLead: string; trBody: string; enTitle: string; enLead: string; enBody: string };
const emptyE: EForm = { kind: "region", position: "0", related: "", relatedCollections: "", media: [], trTitle: "", trLead: "", trBody: "", enTitle: "", enLead: "", enBody: "" };
const toEForm = (s: CmsExperienceSection): EForm => ({ kind: s.kind, position: String(s.position), related: s.relatedProductIds.join(", "), relatedCollections: s.relatedCollectionIds.join(", "), media: s.media, trTitle: s.tr.title, trLead: s.tr.lead, trBody: s.tr.bodyMd, enTitle: s.en.title, enLead: s.en.lead, enBody: s.en.bodyMd });
const list = (text: string) => text.split(",").map((x) => x.trim()).filter(Boolean);
const ePayload = (f: EForm) => ({ kind: f.kind, position: Number(f.position) || 0, relatedProductIds: list(f.related), relatedCollectionIds: list(f.relatedCollections), media: f.media,
  tr: { title: f.trTitle, lead: f.trLead, bodyMd: f.trBody }, en: { title: f.enTitle, lead: f.enLead, bodyMd: f.enBody } });

export function ExperienceCms({ initial, role, publishingEnabled }: { initial: CmsExperienceSection[]; role: Role; publishingEnabled: boolean }) {
  const [items, setItems] = useState(initial);
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<EForm>(emptyE);
  const reload = useCallback(async () => { setItems((await api<{ sections: CmsExperienceSection[] }>("/api/admin/cms/experience?archived=1")).sections); }, []);
  const { busy, notice, run } = useRunner(reload);
  const current = items.find((s) => s.id === selected) ?? null;
  const editable = selected === "new" || (current ? current.status !== "archived" : false);
  const canWrite = can(role, "blog.write") && editable;
  const field = (key: Exclude<keyof EForm, "media">) => ({ value: form[key], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value }), disabled: !canWrite });
  const setMedia = (index: number, patch: Partial<Media>) => setForm({ ...form, media: form.media.map((m, i) => (i === index ? ({ ...m, ...patch } as Media) : m)) });
  const save = () => selected === "new"
    ? void run("Bölüm oluşturuldu", () => api<{ id: string }>("/api/admin/cms/experience", { method: "POST", body: JSON.stringify(ePayload(form)) }).then((r) => setSelected(r.id)))
    : current && void run("Bölüm kaydedildi", () => api(`/api/admin/cms/experience/${current.id}`, { method: "PATCH", body: JSON.stringify({ ...ePayload(form), expectedVersion: current.version }) }));

  return (
    <div className="cms">
      <section className="admin-card wide" aria-labelledby="exp-title">
        <div className="admin-card-head"><div><small>DENEYİM · POSTGRESQL</small><h2 id="exp-title">Deneyim bölümleri</h2></div>
          {can(role, "blog.write") && <button type="button" className="admin-action" onClick={() => { setSelected("new"); setForm(emptyE); }}><Plus size={14} aria-hidden="true" /> Yeni bölüm</button>}</div>
        <p className="admin-help">Gerçek içerik yoksa bölümü taslakta bırakın. Sertifika, ödül, organik veya coğrafi işaret iddiası içeren metin belge olmadan yayımlanamaz.</p>
        {items.length > 0 && <div className="admin-table-scroll"><table className="admin-data-table">
          <thead><tr><th scope="col">Başlık</th><th scope="col">Tür</th><th scope="col">Medya</th><th scope="col">Durum</th><th scope="col"><span className="sr-only">İşlem</span></th></tr></thead>
          <tbody>{items.map((s) => <tr key={s.id}><td><b>{s.tr.title}</b><small>{s.en.title ? "TR + EN" : "Yalnızca TR"}</small></td><td>{experienceKindLabels[s.kind].tr}</td><td>{s.media.length}</td><td><span className={`cms-status is-${TONE[s.status]}`}>{STATUS[s.status]} · v{s.version}</span></td><td><button type="button" className="admin-action" onClick={() => { setSelected(s.id); setForm(toEForm(s)); }}>Aç</button></td></tr>)}</tbody>
        </table></div>}
      </section>
      {notice && <p className={`cms-notice is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p>}
      {selected && (
        <section className="admin-card wide cms-editor" aria-labelledby="exp-editor">
          <div className="admin-card-head"><div><small>{selected === "new" ? "YENİ · TASLAK" : `${STATUS[current!.status]} · v${current!.version}`}</small><h2 id="exp-editor">{form.trTitle || "Yeni bölüm"}</h2></div></div>
          <form className="cms-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <fieldset><legend>Temel</legend>
              <label>Tür<select {...field("kind")}>{EXPERIENCE_KINDS.map((k) => <option key={k} value={k}>{experienceKindLabels[k].tr}</option>)}</select></label>
              <label>Sıra<input {...field("position")} type="number" min="0" /></label>
              <label>İlgili ürünler (kimlik, virgülle)<input {...field("related")} /></label>
              <label>İlgili koleksiyonlar (kimlik, virgülle)<input {...field("relatedCollections")} /></label>
            </fieldset>
            <fieldset><legend>Medya (görsel / video)</legend>
              {form.media.map((m, index) => (
                <div key={index} className="showcase-media-row">
                  <b>{m.type === "video" ? "Video" : "Görsel"} {index + 1}</b>
                  <label>URL<input value={m.url} disabled={!canWrite} onChange={(e) => setMedia(index, { url: e.target.value })} /></label>
                  {m.type === "video" && <label>Poster görseli (zorunlu)<input value={m.poster} disabled={!canWrite} onChange={(e) => setMedia(index, { poster: e.target.value })} /></label>}
                  {m.type === "video" && <label>Altyazı (.vtt, isteğe bağlı)<input value={m.captionsUrl} disabled={!canWrite} onChange={(e) => setMedia(index, { captionsUrl: e.target.value })} /></label>}
                  <label>Açıklama / alt metin<input value={m.alt} disabled={!canWrite} onChange={(e) => setMedia(index, { alt: e.target.value })} /></label>
                  <label>Kaynak<input value={m.credit} disabled={!canWrite} onChange={(e) => setMedia(index, { credit: e.target.value })} /></label>
                  <label>Lisans<input value={m.license} disabled={!canWrite} onChange={(e) => setMedia(index, { license: e.target.value })} /></label>
                  {canWrite && <button type="button" onClick={() => setForm({ ...form, media: form.media.filter((_, i) => i !== index) })}>Kaldır</button>}
                </div>))}
              {canWrite && <div className="cms-actions">
                <button type="button" onClick={() => setForm({ ...form, media: [...form.media, { type: "image", url: "", alt: "", credit: "", license: "", kind: "photo" }] })}>+ Görsel</button>
                <button type="button" onClick={() => setForm({ ...form, media: [...form.media, { type: "video", url: "", poster: "", alt: "", credit: "", license: "", captionsUrl: "" }] })}>+ Video</button>
              </div>}
              <small className="cms-hint">Dosya yükleme depolaması yapılandırılmadı (BLOCKED); medya URL ile eklenir. Dış kaynaklı medyada kaynak ve lisans zorunlu.</small>
            </fieldset>
            <fieldset><legend>Türkçe</legend>
              <label>Başlık<input {...field("trTitle")} required /></label>
              <label>Giriş<textarea {...field("trLead")} rows={2} maxLength={400} /></label>
              <label>Metin (## başlık, - liste, **kalın**)<textarea {...field("trBody")} rows={10} /></label>
            </fieldset>
            <fieldset><legend>English</legend>
              <label>Title<input {...field("enTitle")} /></label>
              <label>Lead<textarea {...field("enLead")} rows={2} maxLength={400} /></label>
              <label>Body<textarea {...field("enBody")} rows={10} /></label>
            </fieldset>
            {canWrite && <button type="submit" className="cms-primary" disabled={busy}><Save size={16} aria-hidden="true" /> {selected === "new" ? "Taslak oluştur" : "Kaydet"}</button>}
          </form>
          {current && <Workflow status={current.status} id={current.id} version={current.version} role={role} publishingEnabled={publishingEnabled} endpoint="/api/admin/cms/experience" run={run} busy={busy} />}
        </section>
      )}
    </div>
  );
}
