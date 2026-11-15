import { listAccounts, listCategories, listCounterparties, listEntries, baseCurrency } from "../../../../db/postgres/finance-repository";
import { AccountForm, CategoryForm, EntryForm, EntryTable } from "../FinanceClient";
import { FinancePage } from "../shared";

export const dynamic = "force-dynamic";

export default function Page() {
  return <FinancePage path="/admin/finans/hareketler" title="Gelir ve giderler">{async ({ db, canWrite }) => {
    const [base, accounts, categories, counterparties, entries] = await Promise.all([baseCurrency(db), listAccounts(db), listCategories(db), listCounterparties(db), listEntries(db, { kinds: ["income", "expense"] })]);
    const live = accounts.filter((a) => !a.archived);
    return <>
      {canWrite && <section className="admin-card wide" aria-labelledby="new-entry"><div className="admin-card-head"><div><small>KAYIT</small><h2 id="new-entry">Gelir / gider ekle</h2></div></div>
        {categories.length ? <EntryForm kinds={["expense", "income"]} base={base} accounts={live.map((a) => ({ id: a.id, label: a.name, currency: a.currency }))}
          categories={categories.filter((c) => !c.archived).map((c) => ({ id: c.id, label: c.name, direction: c.direction }))} counterparties={counterparties.filter((c) => !c.archived).map((c) => ({ id: c.id, label: c.name }))} />
          : <p className="admin-help">Önce aşağıdan en az bir gelir ve bir gider kategorisi oluşturun.</p>}
      </section>}
      <section className="admin-card wide" aria-labelledby="entries-title"><div className="admin-card-head"><div><small>DEFTER</small><h2 id="entries-title">Gelir ve gider kayıtları</h2></div></div>
        <EntryTable entries={entries} canWrite={canWrite} /></section>
      <section className="admin-card wide" aria-labelledby="setup-title"><div className="admin-card-head"><div><small>TANIMLAR</small><h2 id="setup-title">Hesaplar ve kategoriler</h2></div></div>
        <h3>Hesaplar</h3>
        {accounts.length ? <ul className="finance-list">{accounts.map((a) => <li key={a.id}><span>{a.name} · {a.kind} {a.archived ? "(arşiv)" : ""}</span><b>{a.currency}</b></li>)}</ul> : <p className="admin-help">Hesap yok.</p>}
        {canWrite && <AccountForm />}
        <h3>Kategoriler</h3>
        {categories.length ? <ul className="finance-list">{categories.map((c) => <li key={c.id}><span>{c.name}</span><b>{c.direction === "income" ? "Gelir" : "Gider"}</b></li>)}</ul> : <p className="admin-help">Kategori yok.</p>}
        {canWrite && <CategoryForm />}
      </section>
    </>;
  }}</FinancePage>;
}
