import Link from "next/link";
import { products } from "../../lib/products";
import { sampleLot } from "../../lib/site-content";

/**
 * Lot registry is NOT implemented yet. The previous form showed
 * "Lot çalışma listesine eklendi" while saving nothing; this view is
 * read-only and says what exists.
 */
export function LotManager() {
  const lots = products.filter((product) => product.lot).map((product) => ({ id: product.lot!, product: product.name }));
  return (
    <>
      <div className="admin-notice" role="note">
        <b>Lot kaydı henüz bir veritabanına bağlı değil.</b> Yeni lot ekleme, analiz PDF’i yükleme ve QR üretimi
        bir sonraki backend aşamasında yapılacak. Aşağıdaki liste katalogda tanımlı lot kodlarıdır; laboratuvar sonucu içermez.
      </div>
      <div className="admin-grid">
        <section className="admin-card" aria-labelledby="lots-title">
          <div className="admin-card-head"><div><small>KATALOG</small><h2 id="lots-title">Tanımlı lot kodları</h2></div><span>{lots.length} kod</span></div>
          <div className="admin-table-scroll">
            <table className="admin-data-table">
              <thead><tr><th scope="col">Lot</th><th scope="col">Ürün</th><th scope="col">Analiz</th></tr></thead>
              <tbody>{lots.map((lot) => <tr key={lot.id}><td><code>{lot.id}</code></td><td>{lot.product}</td><td><span className="status-pill status-muted">Yüklenmedi</span></td></tr>)}</tbody>
            </table>
          </div>
        </section>
        <section className="admin-card" aria-labelledby="sample-title">
          <div className="admin-card-head"><div><small>ÖRNEK</small><h2 id="sample-title">Örnek izlenebilirlik sayfası</h2></div><span className="status-pill status-warn">Örnek · doğrulanmamış</span></div>
          <p className="admin-help">Lot {sampleLot.id} sayfası tasarım örneğidir ve sitede “örnek kayıt · doğrulanmamış” olarak işaretlidir.</p>
          <Link className="admin-action" href={`/traceability/${sampleLot.id}`} target="_blank">Örnek lot sayfasını aç</Link>
        </section>
      </div>
    </>
  );
}
