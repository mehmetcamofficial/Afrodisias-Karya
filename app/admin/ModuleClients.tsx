"use client";

import { useState } from "react";
import type { AdminUserRow, AuditRow } from "../../db/postgres/cms-repository";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json" } });
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? `İstek başarısız (${response.status})`);
  return body as T;
}

/** Owner-only role management for editors/viewers. Owners are listed read-only (ADMIN_EMAILS). */
export function UserManager({ initial, owners }: { initial: AdminUserRow[]; owners: string[] }) {
  const [users, setUsers] = useState(initial);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const save = async (target: string, nextRole: "editor" | "viewer", disabled: boolean) => {
    setMessage(null);
    try {
      await api("/api/admin/cms/users", { method: "POST", body: JSON.stringify({ email: target, role: nextRole, disabled }) });
      setUsers((await api<{ users: AdminUserRow[] }>("/api/admin/cms/users")).users);
      setMessage({ tone: "ok", text: `${target}: kaydedildi.` });
      setEmail("");
    } catch (error) { setMessage({ tone: "error", text: (error as Error).message }); }
  };
  return (
    <>
      <section className="admin-card wide" aria-labelledby="owners-title">
        <div className="admin-card-head"><div><small>SAHİPLER</small><h2 id="owners-title">Sahip hesapları (ADMIN_EMAILS)</h2></div></div>
        <p className="admin-help">Sahipler ortam değişkeninden gelir ve bu ekrandan değiştirilemez.</p>
        <ul>{owners.map((owner) => <li key={owner}>{owner}</li>)}</ul>
      </section>
      <section className="admin-card wide" aria-labelledby="users-title">
        <div className="admin-card-head"><div><small>EDİTÖR & İZLEYİCİ</small><h2 id="users-title">Ekip</h2></div><span>{users.length} hesap</span></div>
        <form className="cms-form inline" onSubmit={(event) => { event.preventDefault(); void save(email, role, false); }}>
          <label>E-posta<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Rol<select value={role} onChange={(event) => setRole(event.target.value as "editor" | "viewer")}><option value="editor">Editör</option><option value="viewer">İzleyici</option></select></label>
          <button type="submit" className="cms-primary">Ekle / güncelle</button>
        </form>
        {message && <p className={`cms-notice is-${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p>}
        <div className="admin-table-scroll"><table className="admin-data-table">
          <thead><tr><th scope="col">E-posta</th><th scope="col">Rol</th><th scope="col">Durum</th><th scope="col">Ekleyen</th><th scope="col"><span className="sr-only">İşlem</span></th></tr></thead>
          <tbody>{users.map((user) => (
            <tr key={user.email}>
              <td>{user.email}</td>
              <td>{user.role === "owner" ? "Sahip" : (
                <select aria-label={`${user.email} rolü`} value={user.role} onChange={(event) => void save(user.email, event.target.value as "editor" | "viewer", user.disabled)}>
                  <option value="editor">Editör</option><option value="viewer">İzleyici</option>
                </select>)}</td>
              <td>{user.disabled ? "Devre dışı" : "Etkin"}</td>
              <td>{user.createdBy}</td>
              <td>{user.role !== "owner" && <button type="button" className="admin-action" onClick={() => void save(user.email, user.role as "editor" | "viewer", !user.disabled)}>{user.disabled ? "Etkinleştir" : "Devre dışı bırak"}</button>}</td>
            </tr>))}</tbody>
        </table></div>
      </section>
    </>
  );
}

/** Read-only audit log with filters and cursor pagination. */
export function AuditViewer({ initial, initialNext }: { initial: AuditRow[]; initialNext: number | null }) {
  const [rows, setRows] = useState(initial);
  const [next, setNext] = useState(initialNext);
  const [type, setType] = useState("");
  const [action, setAction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const load = async (append: boolean) => {
    setError(null);
    const q = new URLSearchParams();
    if (type) q.set("type", type);
    if (action) q.set("action", action);
    if (append && next) q.set("before", String(next));
    try {
      const data = await api<{ rows: AuditRow[]; next: number | null }>(`/api/admin/cms/audit?${q}`);
      setRows(append ? [...rows, ...data.rows] : data.rows); setNext(data.next);
    } catch (err) { setError((err as Error).message); }
  };
  return (
    <section className="admin-card wide" aria-labelledby="audit-title">
      <div className="admin-card-head"><div><small>DENETİM KAYDI · DEĞİŞTİRİLEMEZ</small><h2 id="audit-title">Tüm işlemler</h2></div></div>
      <form className="cms-form inline" onSubmit={(event) => { event.preventDefault(); void load(false); }}>
        <label>Varlık<select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">Tümü</option><option value="product">Ürün</option><option value="blog_post">Blog</option><option value="contact_inquiry">Talep</option><option value="admin_user">Kullanıcı</option><option value="ai">AI</option>
        </select></label>
        <label>İşlem öneki<input value={action} onChange={(event) => setAction(event.target.value)} placeholder="ör. product.publish" pattern="[a-z_.]{2,40}" /></label>
        <button type="submit" className="admin-action">Filtrele</button>
      </form>
      {error && <p className="cms-notice is-error" role="alert">{error}</p>}
      <div className="admin-table-scroll"><table className="admin-data-table">
        <thead><tr><th scope="col">Zaman</th><th scope="col">Kişi</th><th scope="col">İşlem</th><th scope="col">Varlık</th><th scope="col">Ayrıntı</th></tr></thead>
        <tbody>{rows.map((row) => (
          <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString("tr-TR")}</td><td>{row.actorEmail}</td><td><code>{row.action}</code></td><td>{row.entityType} · {row.entityId}</td>
            <td><details><summary>Göster</summary><pre className="audit-detail">{JSON.stringify(row.detail, null, 2).slice(0, 2000)}</pre></details></td></tr>))}</tbody>
      </table></div>
      {rows.length === 0 && <p className="admin-help">Kayıt yok.</p>}
      {next && <button type="button" className="admin-action" onClick={() => void load(true)}>Daha eski kayıtlar</button>}
    </section>
  );
}

type AiTaskResult = Record<string, unknown>;
/** Free-standing AI tools. Output is text to copy; nothing is saved or published. */
export function AiStudio({ status }: { status: { enabled: boolean; reason: string; model: string | null; used24h: number | null; dailyLimit: number } }) {
  const [tool, setTool] = useState<"blog_draft" | "translate" | "alt_text">("blog_draft");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<AiTaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true); setError(null); setResult(null);
    const payload = tool === "blog_draft" ? { task: "blog_draft", locale: "tr", input: { topic, notes } }
      : tool === "translate" ? { task: "translate", from: "tr", input: { name: topic, description: notes, seoTitle: "", seoDescription: "" } }
      : { task: "alt_text", input: { product: topic, imageKind: "editorial", context: notes } };
    try { setResult((await api<{ draft: AiTaskResult }>("/api/admin/ai/draft", { method: "POST", body: JSON.stringify(payload) })).draft); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <>
      <section className="metric-grid admin-metrics-compact" aria-label="AI durumu">
        <article><div><span>Durum</span></div><b>{status.enabled ? "Etkin" : "Kapalı"}</b><small>{status.reason}</small></article>
        <article><div><span>Model</span></div><b>{status.model ?? "—"}</b><small>Sağlayıcı değiştirilebilir (AI_PROVIDER / AI_MODEL)</small></article>
        <article><div><span>Son 24 saat</span></div><b>{status.used24h ?? "—"} / {status.dailyLimit}</b><small>Yönetici taslak çağrısı (denetim kaydından)</small></article>
      </section>
      <section className="admin-card wide" aria-labelledby="studio-title">
        <div className="admin-card-head"><div><small>AI STÜDYO · YALNIZCA TASLAK</small><h2 id="studio-title">Taslak araçları</h2></div></div>
        <p className="admin-help">Çıktılar kaydedilmez ve yayımlanmaz; kopyalayıp ilgili editörde kontrol ederek kullanın. Ürün metinleri için ürün editöründeki AI panelini kullanın.</p>
        <form className="cms-form" onSubmit={(event) => { event.preventDefault(); void run(); }}>
          <label>Araç<select value={tool} onChange={(event) => setTool(event.target.value as typeof tool)}>
            <option value="blog_draft">Blog / tarif taslağı (TR)</option><option value="translate">TR → EN çeviri</option><option value="alt_text">Görsel alt metni</option>
          </select></label>
          <label>{tool === "blog_draft" ? "Konu" : tool === "translate" ? "Başlık" : "Görselin konusu"}<input value={topic} onChange={(event) => setTopic(event.target.value)} required minLength={3} maxLength={200} /></label>
          <label>{tool === "blog_draft" ? "Doğrulanmış bilgiler / notlar" : tool === "translate" ? "Çevrilecek metin" : "Bağlam"}<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={6} maxLength={6000} /></label>
          <button type="submit" className="cms-primary" disabled={busy || !status.enabled}>{busy ? "Hazırlanıyor…" : "Taslak üret"}</button>
        </form>
        {error && <p className="cms-notice is-error" role="alert">{error}</p>}
        {result && <div className="cms-ai-result" role="status"><small>Taslak — kontrol etmeden kullanmayın</small>
          <dl>{Object.entries(result).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{Array.isArray(value) ? value.join("; ") : String(value)}</dd></div>)}</dl></div>}
      </section>
    </>
  );
}
