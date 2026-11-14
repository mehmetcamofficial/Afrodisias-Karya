import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { loadAdminSnapshot } from "../../../lib/admin-data";
import { categoryLabels, packagingLabels, products, type ProductImage } from "../../../lib/products";
import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";

export const dynamic = "force-dynamic";

const imageKind: Record<ProductImage["kind"], { label: string; tone: string }> = {
  variant: { label: "Ürün fotoğrafı", tone: "ok" },
  range: { label: "Seri fotoğrafı", tone: "warn" },
  editorial: { label: "Atmosfer görseli", tone: "warn" },
  concept: { label: "AI konsept tasarım", tone: "warn" },
};

/**
 * Product & media audit. Presentation data comes from the checked-in
 * catalogue; commercial state (published/draft, price, stock) only from Neon.
 * Static demo prices are deliberately NOT shown here.
 */
export default async function Page() {
  const access = await requireAdminPage("/admin/urunler");
  if (access.status !== "admin") return <AdminForbidden email={access.user.email} configured={access.configured} />;
  const snapshot = await loadAdminSnapshot();
  const rows = new Map((snapshot.products ?? []).map((row) => [row.id, row]));
  const missingPhotos = products.filter((product) => product.image?.kind !== "variant").length;
  return (
    <AdminShell kicker="ÜRÜN & MEDYA" title="Katalog ve görsel denetimi">
      <div className="admin-notice" role="note">
        <b>{missingPhotos} / {products.length}</b> üründe gerçek ürün fotoğrafı yok; bunlar sitede “temsili” veya “seri” notuyla gösterilir.
        Fiyat ve stok yalnızca Neon kaydından okunur. Fiyat/stok düzenleme ve onaylı yayımlama <Link href="/admin">Genel bakış</Link> ekranındadır.
        {snapshot.products === null && " Veritabanına ulaşılamadığı için satış durumu bilinmiyor."}
      </div>
      <section className="admin-card wide" aria-labelledby="media-title">
        <div className="admin-card-head"><div><small>KATALOG</small><h2 id="media-title">Ürünler, görseller ve durum</h2></div><span>{products.length} ürün</span></div>
        <div className="admin-table-scroll">
          <table className="admin-data-table admin-media-table">
            <thead><tr><th scope="col">Görsel</th><th scope="col">Ürün</th><th scope="col">Görsel türü</th><th scope="col">Ambalaj</th><th scope="col">Neon durumu</th><th scope="col"><span className="sr-only">Önizle</span></th></tr></thead>
            <tbody>
              {products.map((product) => {
                const row = rows.get(product.id);
                const kind = product.image ? imageKind[product.image.kind] : { label: "Görsel yok", tone: "bad" };
                const status = snapshot.products === null ? { label: "Bilinmiyor", tone: "muted" } : !row ? { label: "Kayıt yok", tone: "muted" } : row.active ? { label: "Yayında", tone: "ok" } : { label: "Taslak", tone: "warn" };
                return (
                  <tr key={product.id}>
                    <td>
                      <span className={`admin-thumb${product.image?.kind === "concept" ? " is-concept" : ""}`}>
                        {product.image ? <Image src={product.image.src} alt="" width={96} height={96} sizes="96px" /> : null}
                      </span>
                    </td>
                    <td><b>{product.name}</b><small>{categoryLabels[product.category]} · {product.size} · <code>{product.id}</code></small></td>
                    <td><span className={`status-pill status-${kind.tone}`}>{kind.label}</span></td>
                    <td>{packagingLabels[product.id] ?? <span className="status-pill status-bad">Doğrulanmadı</span>}</td>
                    <td>
                      <span className={`status-pill status-${status.tone}`}>{status.label}</span>
                      {row && <small>{(row.priceKurus / 100).toLocaleString("tr-TR")} TL · {row.stock} stok{row.active ? "" : " (onaysız)"}</small>}
                    </td>
                    <td><Link className="admin-action" href={`/urun/${product.id}`} target="_blank">Önizle <ExternalLink size={13} aria-hidden="true" /></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
