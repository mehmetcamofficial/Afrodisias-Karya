import { baseCurrency, listCosts, unitCosts } from "../../../../db/postgres/finance-repository";
import { formatMinor, productMargin } from "../../../../lib/money";
import { ArchiveCostButton, CostForm } from "../FinanceClient";
import { FinancePage } from "../shared";

export const dynamic = "force-dynamic";

const COMPONENT: Record<string, string> = { oil: "Zeytinyağı", olive: "Zeytin", bottle: "Şişe", tin: "Teneke", label: "Etiket", packaging: "Ambalaj", labor: "İşçilik", shipping: "Kargo", other: "Diğer" };

export default function Page() {
  return <FinancePage path="/admin/finans/maliyetler" title="Ürün maliyetleri">{async ({ db, canWrite }) => {
    const [base, costs, units] = await Promise.all([baseCurrency(db), listCosts(db), unitCosts(db)]);
    return <>
      {canWrite && <section className="admin-card wide"><CostForm base={base} products={units.map((u) => ({ id: u.productId, label: u.productName }))} /></section>}
      <section className="admin-card wide" aria-labelledby="unit-title"><div className="admin-card-head"><div><small>BİRİM MALİYET</small><h2 id="unit-title">Ürün başına maliyet ve marj</h2></div></div>
        <div className="admin-table-scroll"><table className="admin-data-table"><thead><tr><th scope="col">Ürün</th><th scope="col">Bileşen</th><th scope="col">Birim maliyet</th><th scope="col">Liste fiyatı</th><th scope="col">Marj</th></tr></thead>
          <tbody>{units.map((u) => {
            const m = productMargin(u.unitCostMinor, u.active ? u.listPriceMinor : null);
            return <tr key={u.productId}><td>{u.productName}</td><td>{u.components}</td><td>{u.components ? formatMinor(u.unitCostMinor, base) : "—"}</td>
              <td>{u.active ? formatMinor(u.listPriceMinor, "TRY") : <small>Satışta değil · fiyat onaylı değil</small>}</td>
              <td>{u.components && m.marginPct !== null ? `${formatMinor(m.marginMinor!, base)} (%${m.marginPct.toFixed(2)})` : "—"}</td></tr>;
          })}</tbody></table></div>
        <p className="admin-help">Marj yalnızca yayındaki (onaylı fiyatlı) ürünler için hesaplanır. Bileşen yoksa maliyet gösterilmez.</p>
      </section>
      <section className="admin-card wide" aria-labelledby="comp-title"><div className="admin-card-head"><div><small>BİLEŞENLER</small><h2 id="comp-title">Maliyet bileşenleri</h2></div></div>
        {costs.length ? <div className="admin-table-scroll"><table className="admin-data-table"><thead><tr><th scope="col">Ürün</th><th scope="col">Bileşen</th><th scope="col">Tutar</th><th scope="col">Kur</th><th scope="col">Geçerlilik</th><th scope="col"><span className="sr-only">İşlem</span></th></tr></thead>
          <tbody>{costs.map((c) => <tr key={c.id} className={c.archived ? "is-voided" : ""}><td>{c.productId}</td><td>{COMPONENT[c.component]}{c.label && <small>{c.label}</small>}</td>
            <td>{formatMinor(c.amountMinor, c.currency)}{c.currency !== base && <small>= {formatMinor(c.baseAmountMinor, base)}</small>}</td>
            <td>{c.currency === base ? "—" : <small>{Number(c.fxRate).toFixed(6)} · {c.fxSource} · {c.fxDate}</small>}</td><td>{c.effectiveFrom}{c.archived && <small>arşiv</small>}</td>
            <td>{canWrite && !c.archived && <ArchiveCostButton id={c.id} version={c.version} />}</td></tr>)}</tbody></table></div>
          : <p className="admin-empty-state finance-empty" role="status">Henüz maliyet bileşeni girilmedi.</p>}
      </section>
    </>;
  }}</FinancePage>;
}
