import Link from "next/link";
import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { categoryLabels, products } from "../../../lib/products";
import { AdminShell } from "../../components/admin-shell";
export default async function Page(){const access=await requireAdminPage("/admin/urunler");if(access.status!=="admin")return <AdminForbidden email={access.user.email} configured={access.configured}/>;return <AdminShell kicker="ÜRÜN YÖNETİMİ" title="Katalog, stok ve lotlar"><section className="admin-card wide"><div className="admin-toolbar"><Link href="/admin">Yeni ürün ekle</Link><Link href="/magaza" target="_blank">Mağazayı önizle</Link></div><div className="admin-table">{products.map(product=><article key={product.id}><b>{product.name}</b><span>{categoryLabels[product.category]} · {product.size}</span><strong>{product.prices.TRY?.toLocaleString("tr-TR")} TL</strong><small>{product.stock<25?"Stok uyarısı":`${product.stock} stok`} · Lot: {product.lot??"Atanacak"}</small><Link href={`/urun/${product.id}`} target="_blank">Önizle</Link></article>)}</div></section></AdminShell>}
