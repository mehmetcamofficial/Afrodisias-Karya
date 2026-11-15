import { baseCurrency, listAccounts, listCounterparties, listEntries, orderBalances } from "../../../../db/postgres/finance-repository";
import { formatMinor } from "../../../../lib/money";
import { EntryForm, EntryTable } from "../FinanceClient";
import { FinancePage } from "../shared";

export const dynamic = "force-dynamic";

export default function Page() {
  return <FinancePage path="/admin/finans/tahsilatlar" title="Tahsilatlar ve ödemeler">{async ({ db, canWrite }) => {
    const [base, accounts, counterparties, entries, orders] = await Promise.all([baseCurrency(db), listAccounts(db), listCounterparties(db), listEntries(db, { kinds: ["collection", "payment"] }), orderBalances(db)]);
    return <>
      <p className="admin-notice" role="note">Gerçek ödeme sağlayıcısına bağlantı yoktur; tahsilatlar banka/POS dökümüne göre elle kaydedilir. Aynı banka/POS referansı ikinci kez kaydedilemez.</p>
      {canWrite && <section className="admin-card wide" aria-labelledby="new-col"><div className="admin-card-head"><div><small>KAYIT</small><h2 id="new-col">Tahsilat / ödeme ekle</h2></div></div>
        <EntryForm kinds={["collection", "payment"]} base={base} accounts={accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, label: a.name, currency: a.currency }))} categories={[]}
          counterparties={counterparties.filter((c) => !c.archived).map((c) => ({ id: c.id, label: c.name }))}
          orders={orders.filter((o) => o.status !== "cancelled").map((o) => ({ id: o.id, label: `${o.id} · ${o.customerName} · kalan ${formatMinor(o.outstandingMinor, "TRY")}` }))} />
      </section>}
      <section className="admin-card wide" aria-labelledby="col-title"><div className="admin-card-head"><div><small>HAREKETLER</small><h2 id="col-title">Tahsilat ve ödemeler</h2></div></div>
        <EntryTable entries={entries} canWrite={canWrite} /></section>
      <section className="admin-card wide" aria-labelledby="ord-title"><div className="admin-card-head"><div><small>SİPARİŞ ↔ TAHSİLAT</small><h2 id="ord-title">Sipariş bakiyeleri</h2></div></div>
        {orders.length ? <div className="admin-table-scroll"><table className="admin-data-table"><thead><tr><th scope="col">Sipariş</th><th scope="col">Durum</th><th scope="col">Tutar</th><th scope="col">Tahsil edilen</th><th scope="col">Kalan</th></tr></thead>
          <tbody>{orders.map((o) => <tr key={o.id}><td>{o.id}<small>{o.customerName}</small></td><td>{o.status}</td><td>{formatMinor(o.totalMinor, "TRY")}</td><td>{formatMinor(o.collectedMinor, "TRY")}</td><td className={o.outstandingMinor < 0 ? "is-negative" : ""}>{formatMinor(o.outstandingMinor, "TRY")}{o.outstandingMinor < 0 ? " (fazla tahsilat)" : ""}</td></tr>)}</tbody></table></div>
          : <p className="admin-empty-state finance-empty" role="status">Kayıtlı sipariş yok.</p>}
      </section>
    </>;
  }}</FinancePage>;
}
