"use client";

import { AlertTriangle, Boxes, CircleDollarSign, PackageCheck, RefreshCw, Save } from "lucide-react";
import { useCallback, useState } from "react";

export type AdminProduct = { id: string; name: string; type: string; size: string; note: string; priceKurus: number; stock: number; active: boolean };
export type AdminOrder = { id: string; customerName: string; email: string; totalKurus: number; status: string; createdAt: number };
type Product = AdminProduct;
type Order = AdminOrder;
const empty: Product = { id: "", name: "", type: "Natürel Sızma", size: "500 ml", note: "", priceKurus: 0, stock: 0, active: false };

export default function AdminClient({ initialProducts, initialOrders, canPublish = false }: { initialProducts: Product[]; initialOrders: Order[]; canPublish?: boolean }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [form, setForm] = useState(empty);
  const [approvedStock, setApprovedStock] = useState<number>(0);
  const [publishConfirmation, setPublishConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [productResponse, orderResponse] = await Promise.all([fetch("/api/admin/products"), fetch("/api/orders")]);
      if (!productResponse.ok || !orderResponse.ok) throw new Error("Dashboard verileri alınamadı.");
      setProducts(await productResponse.json() as Product[]);
      setOrders(await orderResponse.json() as Order[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Veriler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    setMessage(response.ok ? "Ürün taslağı kaydedildi; satışa açılmadı." : "Kayıt başarısız.");
    if (response.ok) { setForm(empty); await load(); }
  };

  const publish = async () => {
    setError("");
    setMessage("");
    if (!form.id || form.active || approvedStock < 1 || !Number.isSafeInteger(approvedStock)
        || publishConfirmation !== `YAYINLA:${form.id}`) {
      setError("Yayımlama için stok ve ürün onayını doğrulayın.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/admin/products/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          expectedPriceKurus: form.priceKurus,
          approvedStock,
          confirmation: publishConfirmation,
        }),
      });
      if (!response.ok) throw new Error("Yayımlama reddedildi; fiyatı ve yetkiyi yeniden kontrol edin.");
      setMessage("Ürün Preview mağazada yayımlandı.");
      setForm(empty);
      setApprovedStock(0);
      setPublishConfirmation("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Yayımlama başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const revenue = orders.reduce((sum, order) => sum + order.totalKurus, 0);
  const stockWarnings = products.filter((product) => product.active && product.stock < 25).length;
  const metrics = [
    { label: "Toplam ciro", value: `${(revenue / 100).toLocaleString("tr-TR")} TL`, note: "Kaydedilen siparişler", Icon: CircleDollarSign },
    { label: "Siparişler", value: orders.length.toLocaleString("tr-TR"), note: "Toplam kayıt", Icon: PackageCheck },
    { label: "Aktif katalog", value: products.filter((product) => product.active).length.toLocaleString("tr-TR"), note: "Satışa açık ürün", Icon: Boxes },
    { label: "Stok uyarısı", value: stockWarnings.toLocaleString("tr-TR"), note: "25 adedin altında", Icon: AlertTriangle },
  ];

  return (
    <>
      <div className="admin-commandbar"><div><span><i/> Neon kataloğu bağlantısı</span>{error && <b>{error}</b>}</div><button onClick={() => { setLoading(true); setError(""); void load(); }} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""}/>{loading ? "Yükleniyor" : "Verileri yenile"}</button></div>
      <section className="metric-grid">{metrics.map(({ label, value, note, Icon }) => <article key={label}><div><span>{label}</span><Icon size={19}/></div><b>{loading ? "—" : value}</b><small>{note}</small></article>)}</section>
      <div className="admin-grid">
        <section className="admin-card">
          <div className="admin-card-head"><div><small>KATALOG</small><h2>Ürün düzenleyici</h2></div><span>{products.length} kayıt</span></div>
          {products.length === 0 ? <p className="admin-empty">Neon kataloğu henüz boş. Ürünleri satışa kapalı taslak olarak ekleyin.</p> : <div className="admin-list">{products.map((product) => <button key={product.id} onClick={() => { setForm(product); setApprovedStock(0); setPublishConfirmation(""); }}><span><b>{product.name}</b><small>{product.size} · {product.active ? "Aktif" : "Taslak · satışa kapalı"}</small></span><strong>{(product.priceKurus / 100).toLocaleString("tr-TR")} TL</strong><i className={product.stock < 25 ? "warning" : ""}>{product.stock} stok</i></button>)}</div>}
          <form className="admin-form" onSubmit={save}>
            <div className="admin-form-title"><h3>{form.id ? "Ürünü düzenle" : "Yeni ürün"}</h3><small>Fiyat, stok ve katalog bilgileri</small></div>
            <label>Ürün adı<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required/></label>
            <div className="admin-form-row"><label>Seri / tür<input value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}/></label><label>Hacim<input value={form.size} onChange={(event) => setForm({ ...form, size: event.target.value })}/></label></div>
            <label>Tadım notu<input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })}/></label>
            <div className="admin-form-row"><label>Fiyat (kuruş)<input type="number" min="1" value={form.priceKurus || ""} onChange={(event) => setForm({ ...form, priceKurus: Number(event.target.value) })} required/></label><label>Stok<input type="number" min="0" value={form.stock || ""} onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })}/></label></div>
            <button type="submit"><Save size={16}/> Taslak olarak kaydet</button>
            {canPublish && form.id && !form.active && (
              <div className="admin-publish-review">
                <h3>Preview yayımlama onayı</h3>
                <p>Ürünün adını, ambalajını, fiyatını ve gerçek stokunu doğrulamadan yayımlamayın. Kayıt değiştiyse yayımlama reddedilir.</p>
                <label>Doğrulanmış stok<input type="number" min="1" max="100000" value={approvedStock || ""} onChange={(event) => setApprovedStock(Number(event.target.value))}/></label>
                <label>Yayımlamak için `YAYINLA:{form.id}` yazın
                  <input value={publishConfirmation} onChange={(event) => setPublishConfirmation(event.target.value)}/>
                </label>
                <button type="button" disabled={loading || approvedStock < 1 || publishConfirmation !== `YAYINLA:${form.id}`} onClick={() => void publish()}>
                  <PackageCheck size={16}/> İncelenen ürünü Preview ortamında yayımla
                </button>
              </div>
            )}
            {message && <p className="admin-message">{message}</p>}
          </form>
        </section>
        <section className="admin-card">
          <div className="admin-card-head"><div><small>AKIŞ</small><h2>Son siparişler</h2></div><span>{orders.length} kayıt</span></div>
          {orders.length === 0 ? <div className="admin-empty-state"><PackageCheck/><h3>Henüz sipariş yok</h3><p>Yeni siparişler ödeme ve teslimat durumlarıyla burada görünür.</p></div> : <div className="orders">{orders.slice(0, 8).map((order) => <article key={order.id}><div><b>{order.id}</b><span>{order.customerName}</span><small>{order.email}</small></div><strong>{(order.totalKurus / 100).toLocaleString("tr-TR")} TL</strong><i>{order.status}</i></article>)}</div>}
        </section>
      </div>
    </>
  );
}
