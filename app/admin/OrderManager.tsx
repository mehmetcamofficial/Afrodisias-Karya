"use client";

import { Download, PackageCheck, Search } from "lucide-react";
import { useMemo, useState } from "react";

export type ManagedOrder = { id: string; customerName: string; email: string; totalKurus: number; status: string; provider: string; createdAt: number };
const statuses = [
  ["payment_pending", "Ödeme bekliyor"],
  ["preparing", "Hazırlanıyor"],
  ["shipped", "Kargolandı"],
  ["completed", "Tamamlandı"],
  ["cancelled", "İptal"],
] as const;

function statusLabel(status: string) {
  return statuses.find(([value]) => value === status)?.[1] ?? status;
}

export function OrderManager({ initialOrders }: { initialOrders: ManagedOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const visible = useMemo(() => orders.filter((order) => {
    const matchesFilter = filter === "all" || order.status === filter;
    const haystack = `${order.id} ${order.customerName} ${order.email}`.toLocaleLowerCase("tr-TR");
    return matchesFilter && haystack.includes(query.toLocaleLowerCase("tr-TR"));
  }), [filter, orders, query]);

  const updateStatus = async (id: string, status: string) => {
    setSaving(id);
    setMessage("");
    const response = await fetch("/api/orders", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status }) });
    if (response.ok) {
      setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
      setMessage(`${id} durumu güncellendi.`);
    } else {
      setMessage("Sipariş durumu güncellenemedi.");
    }
    setSaving(null);
  };

  const downloadCsv = () => {
    const rows = [["Sipariş", "Müşteri", "E-posta", "Tutar", "Durum", "Ödeme"], ...visible.map((order) => [order.id, order.customerName, order.email, String(order.totalKurus / 100), statusLabel(order.status), order.provider])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "altin-dal-siparisler.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="admin-card wide">
      <div className="admin-card-head"><div><small>OPERASYON</small><h2>Sipariş akışı</h2></div><span>{visible.length} kayıt</span></div>
      <div className="order-toolbar">
        <label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sipariş veya müşteri ara"/></label>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Sipariş durumu filtresi"><option value="all">Tüm durumlar</option>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button onClick={downloadCsv} disabled={!visible.length}><Download size={15}/> CSV indir</button>
      </div>
      {message && <p className="admin-message">{message}</p>}
      {visible.length === 0 ? <div className="admin-empty-state"><PackageCheck/><h3>Sipariş bulunamadı</h3><p>Filtreyi veya arama terimini değiştirin.</p></div> : <div className="order-table"><div className="order-table-head"><span>Sipariş</span><span>Müşteri</span><span>Tutar</span><span>Ödeme</span><span>Durum</span></div>{visible.map((order) => <article key={order.id}><div><b>{order.id}</b><small>{new Date(order.createdAt).toLocaleDateString("tr-TR")}</small></div><div><b>{order.customerName}</b><small>{order.email}</small></div><strong>{(order.totalKurus / 100).toLocaleString("tr-TR")} TL</strong><span>{order.provider || "—"}</span><select value={order.status} disabled={saving === order.id} onChange={(event) => void updateStatus(order.id, event.target.value)} aria-label={`${order.id} sipariş durumu`}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></article>)}</div>}
    </section>
  );
}
