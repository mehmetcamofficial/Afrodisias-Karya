import { listCounterparties } from "../../../../db/postgres/finance-repository";
import { formatMinor } from "../../../../lib/money";
import { CounterpartyForm } from "../FinanceClient";
import { FinancePage } from "../shared";

export const dynamic = "force-dynamic";

export default function Page() {
  return <FinancePage path="/admin/finans/cariler" title="Cari hesaplar">{async ({ db, canWrite }) => {
    const rows = await listCounterparties(db);
    return <>
      {canWrite && <section className="admin-card wide"><CounterpartyForm /></section>}
      <section className="admin-card wide" aria-labelledby="cp-title"><div className="admin-card-head"><div><small>CARİLER</small><h2 id="cp-title">Müşteri ve tedarikçiler</h2></div><span>{rows.length} kayıt</span></div>
        {rows.length ? <div className="admin-table-scroll"><table className="admin-data-table"><thead><tr><th scope="col">Ad</th><th scope="col">Tür</th><th scope="col">İletişim</th><th scope="col">Alacak</th><th scope="col">Borç</th></tr></thead>
          <tbody>{rows.map((c) => <tr key={c.id}><td><b>{c.name}</b>{c.taxId && <small>VKN/TCKN {c.taxId}</small>}</td><td>{{ customer: "Müşteri", supplier: "Tedarikçi", both: "İkisi de" }[c.kind]}</td><td>{c.email || "—"}{c.phone && <small>{c.phone}</small>}</td><td>{formatMinor(c.receivableMinor, "TRY")}</td><td>{formatMinor(c.payableMinor, "TRY")}</td></tr>)}</tbody></table></div>
          : <p className="admin-empty-state finance-empty" role="status">Henüz cari hesap yok.</p>}
        <p className="admin-help">Alacak = gelir − tahsilat; borç = gider − ödeme (ana para biriminde, ters kayıtlar düşülmüş).</p>
      </section>
    </>;
  }}</FinancePage>;
}
