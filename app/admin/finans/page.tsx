import Link from "next/link";
import { formatMinor } from "../../../lib/money";
import { loadFinanceReport } from "../../../lib/finance-report";
import { FinancePage } from "./shared";

export const dynamic = "force-dynamic";

export default function Page() {
  return <FinancePage path="/admin/finans" title="Genel bakış">{async ({ db }) => {
    const r = await loadFinanceReport(db);
    const base = r.baseCurrency;
    const outstanding = r.orders.filter((o) => o.status !== "cancelled" && o.outstandingMinor > 0);
    if (r.entryCount === 0 && r.accounts.length === 0) {
      return <section className="admin-card wide admin-empty-state finance-empty" role="status">
        <h2>Henüz finans kaydı yok</h2>
        <p>Başlamak için <Link href="/admin/finans/hareketler">Gelir ve Giderler</Link> ekranında bir kasa/banka hesabı ve kategori oluşturun. Bu panel yalnızca girilen gerçek kayıtları gösterir; örnek veya tahmini rakam kullanılmaz.</p>
      </section>;
    }
    return <>
      <section className="metric-grid admin-metrics-compact" aria-label="Tüm zamanlar özeti">
        <article><div><span>Gelir</span></div><b>{formatMinor(r.pl.incomeMinor, base)}</b><small>{r.entryCount} kayıt</small></article>
        <article><div><span>Gider</span></div><b>{formatMinor(r.pl.expenseMinor, base)}</b><small>Ters kayıtlar düşülmüş</small></article>
        <article><div><span>Net (kâr/zarar)</span></div><b className={r.pl.netMinor < 0 ? "is-negative" : ""}>{formatMinor(r.pl.netMinor, base)}</b><small>Gelir − gider</small></article>
        <article><div><span>Nakit akışı</span></div><b>{formatMinor(r.pl.cashNetMinor, base)}</b><small>Tahsilat − ödeme</small></article>
      </section>
      <section className="admin-card wide" aria-labelledby="acc-title">
        <div className="admin-card-head"><div><small>HESAPLAR</small><h2 id="acc-title">Kasa ve banka bakiyeleri</h2></div></div>
        {r.accounts.length ? <ul className="finance-list">{r.accounts.map((a) => <li key={a.id}><span>{a.name}{a.archived ? " (arşiv)" : ""}</span><b>{formatMinor(a.balanceMinor, a.currency)}</b></li>)}</ul> : <p className="admin-help">Hesap yok.</p>}
      </section>
      <section className="admin-card wide" aria-labelledby="ord-title">
        <div className="admin-card-head"><div><small>SİPARİŞLER</small><h2 id="ord-title">Tahsil edilmemiş siparişler</h2></div><Link className="admin-action" href="/admin/finans/tahsilatlar">Tahsilatlar</Link></div>
        {outstanding.length ? <ul className="finance-list">{outstanding.slice(0, 10).map((o) => <li key={o.id}><span>{o.customerName} · {o.id}</span><b>{formatMinor(o.outstandingMinor, "TRY")}</b></li>)}</ul> : <p className="admin-help">Bekleyen tahsilat yok.</p>}
      </section>
    </>;
  }}</FinancePage>;
}
