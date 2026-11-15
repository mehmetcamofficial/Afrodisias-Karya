import { BrandShell } from "../components/site-shell";
import "../components/editorial-pages.css";

/** Skeleton while the catalogue loads from the database: same layout, no fake products or prices. */
export default function Loading() {
  return <BrandShell>
    <section className="store-showcase" aria-busy="true" aria-label="Mağaza yükleniyor">
      <div className="store-showcase-copy"><p>ALTIN DAL MAĞAZA</p><h1>Bahçeden<br /><em>sofranıza.</em></h1></div>
    </section>
    <div className="store-page"><div className="product-grid store-skeleton" role="status" aria-live="polite">
      <span className="sr-only">Ürünler yükleniyor…</span>
      {Array.from({ length: 6 }, (_, i) => <div key={i} className="store-skeleton-card" aria-hidden="true"><i /><b /><b /></div>)}
    </div></div>
  </BrandShell>;
}
