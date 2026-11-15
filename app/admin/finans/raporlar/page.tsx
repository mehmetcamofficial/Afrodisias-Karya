import { loadFinanceReport } from "../../../../lib/finance-report";
import { formatMinor } from "../../../../lib/money";
import { CsvButton } from "../FinanceClient";
import { FinancePage } from "../shared";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from, to } = await searchParams;
  return <FinancePage path="/admin/finans/raporlar" title="Raporlar">{async ({ db }) => {
    const r = await loadFinanceReport(db, from, to);
    const base = r.baseCurrency;
    const rows: Array<Array<string | number>> = [["Kalem", "Tür", `Tutar (${base}, kuruş)`], ...r.pl.byCategory.map((c) => [c.name, c.kind === "income" ? "Gelir" : "Gider", c.amountMinor]),
      ["Toplam gelir", "", r.pl.incomeMinor], ["Toplam gider", "", r.pl.expenseMinor], ["Net", "", r.pl.netMinor], ["Tahsilat", "", r.pl.collectionsMinor], ["Ödeme", "", r.pl.paymentsMinor]];
    return <>
      <form className="cms-form inline" method="get" aria-label="Dönem">
        <label>Başlangıç<input type="date" name="from" defaultValue={r.period.from ?? ""} /></label>
        <label>Bitiş<input type="date" name="to" defaultValue={r.period.to ?? ""} /></label>
        <button type="submit" className="admin-action">Uygula</button>
      </form>
      <section className="admin-card wide" aria-labelledby="pl-title"><div className="admin-card-head"><div><small>KÂR / ZARAR · {r.period.from ?? "başlangıç"} → {r.period.to ?? "bugün"}</small><h2 id="pl-title">Gelir tablosu ({base})</h2></div>{r.entryCount > 0 && <CsvButton filename={`kar-zarar-${r.period.from ?? "tum"}-${r.period.to ?? "bugun"}.csv`} rows={rows} />}</div>
        {r.entryCount === 0 ? <p className="admin-empty-state finance-empty" role="status">Bu dönemde kayıt yok; rapor boş.</p> : <>
          <table className="admin-data-table finance-pl"><tbody>
            {r.pl.byCategory.filter((c) => c.kind === "income").map((c) => <tr key={`i-${c.categoryId}`}><th scope="row">{c.name}</th><td>{formatMinor(c.amountMinor, base)}</td></tr>)}
            <tr className="is-total"><th scope="row">Toplam gelir</th><td>{formatMinor(r.pl.incomeMinor, base)}</td></tr>
            {r.pl.byCategory.filter((c) => c.kind === "expense").map((c) => <tr key={`e-${c.categoryId}`}><th scope="row">{c.name}</th><td>−{formatMinor(c.amountMinor, base)}</td></tr>)}
            <tr className="is-total"><th scope="row">Toplam gider</th><td>−{formatMinor(r.pl.expenseMinor, base)}</td></tr>
            <tr className="is-grand"><th scope="row">Net kâr / zarar</th><td className={r.pl.netMinor < 0 ? "is-negative" : ""}>{formatMinor(r.pl.netMinor, base)}</td></tr>
          </tbody></table>
          <h3>Nakit hareketi</h3>
          <ul className="finance-list"><li><span>Tahsilat</span><b>{formatMinor(r.pl.collectionsMinor, base)}</b></li><li><span>Ödeme</span><b>−{formatMinor(r.pl.paymentsMinor, base)}</b></li><li><span>Net nakit</span><b>{formatMinor(r.pl.cashNetMinor, base)}</b></li></ul>
          {r.truncated && <p className="admin-help">Dönemde 1000 kayıttan fazlası var; daha kısa bir dönem seçin.</p>}
        </>}
      </section>
    </>;
  }}</FinancePage>;
}
