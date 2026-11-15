"use client";

import { useState } from "react";
import type { InquiryRow } from "../../db/postgres/cms-repository";

const LABELS: Record<string, string> = { new: "Yeni", in_progress: "İşlemde", answered: "Yanıtlandı", spam: "Spam", closed: "Kapalı" };
const TOPICS: Record<string, string> = { product: "Ürün", order: "Sipariş", corporate: "Kurumsal", club: "Olive Club", other: "Diğer" };

/** Real status updates; the row only changes after the server confirms. */
export function InquiryManager({ initial, canManage }: { initial: InquiryRow[]; canManage: boolean }) {
  const [rows, setRows] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const update = async (id: string, status: string) => {
    setMessage(null);
    const response = await fetch("/api/admin/cms/inquiries", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status }) });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) { setMessage(body.error ?? "Durum güncellenemedi"); return; }
    setRows((current) => current.map((row) => row.id === id ? { ...row, status } : row));
    setMessage("Durum kaydedildi.");
  };
  if (rows.length === 0) return <div className="admin-card wide admin-empty-state"><h3>Henüz talep yok</h3><p>Sitedeki yardım formundan gelen mesajlar burada listelenir.</p></div>;
  return (
    <section className="admin-card wide" aria-labelledby="inq-title">
      <div className="admin-card-head"><div><small>TALEPLER</small><h2 id="inq-title">Ziyaretçi mesajları</h2></div><span>{rows.length} kayıt</span></div>
      {message && <p className="admin-help" role="status">{message}</p>}
      <div className="admin-table-scroll">
        <table className="admin-data-table">
          <thead><tr><th scope="col">Tarih</th><th scope="col">Kişi</th><th scope="col">Konu</th><th scope="col">Mesaj</th><th scope="col">Durum</th></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.id}>
              <td>{new Date(row.createdAt).toLocaleString("tr-TR")}</td>
              <td><b>{row.name}</b><small><a href={`mailto:${row.email}`}>{row.email}</a></small></td>
              <td>{TOPICS[row.topic] ?? row.topic}</td>
              <td className="inquiry-message">{row.message}</td>
              <td>{canManage
                ? <select aria-label={`${row.name} talebinin durumu`} value={row.status} onChange={(event) => void update(row.id, event.target.value)}>{Object.entries(LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                : LABELS[row.status] ?? row.status}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
