"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CURRENCIES, formatMinor, parseMajor, type Currency } from "../../../lib/money";

/**
 * Finance forms. Each form carries an idempotency key created when the form is
 * shown; a double click or network retry re-sends the same key, so the server
 * returns the original entry instead of posting twice. Success is shown only
 * after the server confirms; the page then re-reads data from the database.
 */
type Option = { id: string; label: string; currency?: Currency; direction?: string };
const newKey = () => `ui-${crypto.randomUUID()}`;
const today = () => new Date().toISOString().slice(0, 10);

async function send(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await response.json().catch(() => ({}))) as { error?: string; issues?: Array<{ path: string; message: string }>; replayed?: boolean };
  if (!response.ok) throw new Error((data.error ?? `İstek başarısız (${response.status})`) + (data.issues ? " — " + data.issues.map((i) => `${i.path}: ${i.message}`).join("; ") : ""));
  return data;
}

function useSubmit() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const run = async (label: string, work: () => Promise<{ replayed?: boolean } | unknown>) => {
    setBusy(true); setNotice(null);
    try {
      const result = (await work()) as { replayed?: boolean } | undefined;
      setNotice({ tone: "ok", text: result?.replayed ? `${label}: bu işlem zaten kayıtlıydı; ikinci kez eklenmedi.` : `${label}: veritabanına kaydedildi.` });
      router.refresh();
      return true;
    } catch (error) { setNotice({ tone: "error", text: `${label} başarısız: ${(error as Error).message}` }); return false; }
    finally { setBusy(false); }
  };
  return { busy, notice, run };
}

const Notice = ({ notice }: { notice: { tone: "ok" | "error"; text: string } | null }) =>
  notice ? <p className={`cms-notice is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p> : null;

function FxFields({ currency, base }: { currency: Currency; base: Currency }) {
  if (currency === base) return null;
  return (
    <fieldset className="finance-fx"><legend>Döviz kuru ({currency} → {base})</legend>
      <label>Kur<input name="rate" inputMode="decimal" required placeholder="35.250000" pattern="\d{1,8}(\.\d{1,6})?" /></label>
      <label>Kur kaynağı<input name="rateSource" required minLength={2} maxLength={80} placeholder="TCMB döviz alış" /></label>
      <label>Kur tarihi<input name="rateDate" type="date" required /></label>
    </fieldset>
  );
}

/** Income / expense / collection / payment form. */
export function EntryForm({ kinds, accounts, categories, counterparties, orders, base }: {
  kinds: Array<"income" | "expense" | "collection" | "payment">; accounts: Option[]; categories: Option[]; counterparties: Option[]; orders?: Option[]; base: Currency;
}) {
  const { busy, notice, run } = useSubmit();
  const [kind, setKind] = useState(kinds[0]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [key, setKey] = useState(newKey);
  const currency = accounts.find((a) => a.id === accountId)?.currency ?? base;
  const label = { income: "Gelir", expense: "Gider", collection: "Tahsilat", payment: "Ödeme" }[kind];
  if (!accounts.length) return <p className="admin-help">Önce bir kasa/banka hesabı oluşturun (Gelir ve Giderler → Hesaplar).</p>;
  return (
    <form className="cms-form finance-form" onSubmit={(event) => {
      event.preventDefault();
      const f = new FormData(event.currentTarget);
      const amountMinor = parseMajor(String(f.get("amount") ?? ""));
      if (!amountMinor) { void run(label, async () => { throw new Error("Tutar geçersiz (ör. 1.250,50)"); }); return; }
      const form = event.currentTarget;
      void run(label, () => send("/api/admin/finance/entries", {
        kind, occurredOn: f.get("occurredOn"), accountId, currency, amountMinor,
        categoryId: (kind === "income" || kind === "expense") ? f.get("categoryId") || null : null,
        counterpartyId: f.get("counterpartyId") || null, orderId: kind === "collection" ? f.get("orderId") || null : null,
        rate: f.get("rate") ?? undefined, rateSource: f.get("rateSource") ?? undefined, rateDate: f.get("rateDate") ?? undefined,
        description: f.get("description") ?? "", externalRef: f.get("externalRef") ?? "", idempotencyKey: key,
      })).then((ok) => { if (ok) { form.reset(); setKey(newKey()); } });
    }}>
      <fieldset><legend>Yeni {label.toLocaleLowerCase("tr")}</legend>
        {kinds.length > 1 && <label>Tür<select aria-label="Kayıt türü" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>{kinds.map((k) => <option key={k} value={k}>{{ income: "Gelir", expense: "Gider", collection: "Tahsilat", payment: "Ödeme" }[k]}</option>)}</select></label>}
        <label>Tarih<input name="occurredOn" type="date" required defaultValue={today()} /></label>
        <label>Hesap<select aria-label="Hesap" value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.label} ({a.currency})</option>)}</select></label>
        <label>Tutar ({currency})<input name="amount" inputMode="decimal" required placeholder="1.250,50" /></label>
        {(kind === "income" || kind === "expense") && <label>Kategori<select name="categoryId" required>{categories.filter((c) => c.direction === kind).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}
        <label>Cari (isteğe bağlı)<select name="counterpartyId"><option value="">—</option>{counterparties.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        {kind === "collection" && orders && <label>Sipariş (isteğe bağlı)<select name="orderId"><option value="">—</option>{orders.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>}
        {(kind === "collection" || kind === "payment") && <label>Banka/POS referansı (çift kayıt kontrolü)<input name="externalRef" maxLength={80} pattern="[\p{L}\p{N} ._/\-]*" /></label>}
        <label>Açıklama<input name="description" maxLength={500} /></label>
      </fieldset>
      <FxFields currency={currency} base={base} />
      <button type="submit" className="cms-primary" disabled={busy}>{busy ? "Kaydediliyor…" : `${label} kaydet`}</button>
      <Notice notice={notice} />
    </form>
  );
}

export type EntryView = { id: string; kind: string; occurredOn: string; accountName: string; categoryName: string | null; counterpartyName: string | null; orderId: string | null;
  currency: Currency; amountMinor: number; fxRate: string; fxSource: string; fxDate: string; baseCurrency: Currency; baseAmountMinor: number; description: string; externalRef: string;
  reversalOf: string | null; status: string; voidReason: string; version: number };

export function EntryTable({ entries, canWrite }: { entries: EntryView[]; canWrite: boolean }) {
  const { busy, notice, run } = useSubmit();
  if (!entries.length) return <p className="admin-empty-state finance-empty" role="status">Henüz kayıt yok. Bu ekrandaki tutarlar yalnızca girilen gerçek kayıtlardan hesaplanır.</p>;
  const KIND: Record<string, string> = { income: "Gelir", expense: "Gider", collection: "Tahsilat", payment: "Ödeme" };
  return (
    <>
      <Notice notice={notice} />
      <div className="admin-table-scroll"><table className="admin-data-table finance-table">
        <thead><tr><th scope="col">Tarih</th><th scope="col">Tür</th><th scope="col">Hesap / Kategori</th><th scope="col">Cari / Sipariş</th><th scope="col">Tutar</th><th scope="col">Kur</th><th scope="col">Durum</th><th scope="col"><span className="sr-only">İşlem</span></th></tr></thead>
        <tbody>{entries.map((e) => (
          <tr key={e.id} className={e.reversalOf ? "is-reversal" : e.status === "voided" ? "is-voided" : ""}>
            <td>{e.occurredOn}</td>
            <td>{e.reversalOf ? `Ters kayıt (${KIND[e.kind]})` : KIND[e.kind]}</td>
            <td>{e.accountName}{e.categoryName ? <small>{e.categoryName}</small> : null}</td>
            <td>{e.counterpartyName ?? "—"}{e.orderId ? <small>Sipariş {e.orderId}</small> : null}{e.externalRef ? <small>Ref {e.externalRef}</small> : null}</td>
            <td className="finance-amount">{e.reversalOf ? "−" : ""}{formatMinor(e.amountMinor, e.currency)}{e.currency !== e.baseCurrency && <small>= {formatMinor(e.baseAmountMinor, e.baseCurrency)}</small>}</td>
            <td>{e.currency === e.baseCurrency ? "—" : <small>{Number(e.fxRate).toFixed(6)} · {e.fxSource} · {e.fxDate}</small>}</td>
            <td>{e.status === "voided" ? <span className="cms-status is-bad">İptal{e.voidReason ? `: ${e.voidReason}` : ""}</span> : <span className="cms-status is-ok">Kayıtlı</span>}</td>
            <td>{canWrite && e.status === "posted" && !e.reversalOf && (
              <button type="button" className="admin-action" disabled={busy} onClick={() => {
                const reason = window.prompt("İptal gerekçesi (en az 5 karakter). Kayıt silinmez; ters kayıt oluşturulur.");
                if (reason) void run("İptal", () => send(`/api/admin/finance/entries/${e.id}/void`, { expectedVersion: e.version, reason }));
              }}>İptal et</button>)}</td>
          </tr>))}</tbody>
      </table></div>
    </>
  );
}

export function AccountForm() {
  const { busy, notice, run } = useSubmit();
  return (
    <form className="cms-form inline" onSubmit={(event) => {
      event.preventDefault();
      const f = new FormData(event.currentTarget); const form = event.currentTarget;
      void run("Hesap", () => send("/api/admin/finance/accounts", { name: f.get("name"), kind: f.get("kind"), currency: f.get("currency") })).then((ok) => ok && form.reset());
    }}>
      <label>Hesap adı<input name="name" required minLength={2} maxLength={80} placeholder="Ana kasa" /></label>
      <label>Tür<select name="kind" aria-label="Hesap türü"><option value="cash">Kasa</option><option value="bank">Banka</option><option value="pos">POS</option><option value="other">Diğer</option></select></label>
      <label>Para birimi<select name="currency">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
      <button type="submit" className="admin-action" disabled={busy}>Hesap ekle</button>
      <Notice notice={notice} />
    </form>
  );
}

export function CategoryForm() {
  const { busy, notice, run } = useSubmit();
  return (
    <form className="cms-form inline" onSubmit={(event) => {
      event.preventDefault();
      const f = new FormData(event.currentTarget); const form = event.currentTarget;
      void run("Kategori", () => send("/api/admin/finance/categories", { name: f.get("name"), direction: f.get("direction") })).then((ok) => ok && form.reset());
    }}>
      <label>Kategori adı<input name="name" required minLength={2} maxLength={80} placeholder="Ambalaj" /></label>
      <label>Yön<select name="direction"><option value="expense">Gider</option><option value="income">Gelir</option></select></label>
      <button type="submit" className="admin-action" disabled={busy}>Kategori ekle</button>
      <Notice notice={notice} />
    </form>
  );
}

export function CounterpartyForm() {
  const { busy, notice, run } = useSubmit();
  return (
    <form className="cms-form" onSubmit={(event) => {
      event.preventDefault();
      const f = new FormData(event.currentTarget); const form = event.currentTarget;
      void run("Cari", () => send("/api/admin/finance/counterparties", { kind: f.get("kind"), name: f.get("name"), taxId: f.get("taxId") ?? "", email: f.get("email") ?? "", phone: f.get("phone") ?? "", notes: f.get("notes") ?? "" })).then((ok) => ok && form.reset());
    }}>
      <fieldset><legend>Yeni cari hesap</legend>
        <label>Ad / unvan<input name="name" required minLength={2} maxLength={160} /></label>
        <label>Tür<select name="kind"><option value="supplier">Tedarikçi</option><option value="customer">Müşteri</option><option value="both">İkisi de</option></select></label>
        <label>Vergi / TC kimlik no<input name="taxId" inputMode="numeric" pattern="(\d{10}|\d{11})?" /></label>
        <label>E-posta<input name="email" type="email" /></label>
        <label>Telefon<input name="phone" maxLength={30} /></label>
        <label>Not<input name="notes" maxLength={1000} /></label>
      </fieldset>
      <button type="submit" className="cms-primary" disabled={busy}>Cari ekle</button>
      <Notice notice={notice} />
    </form>
  );
}

export function CostForm({ products, base }: { products: Option[]; base: Currency }) {
  const { busy, notice, run } = useSubmit();
  const [currency, setCurrency] = useState<Currency>(base);
  return (
    <form className="cms-form finance-form" onSubmit={(event) => {
      event.preventDefault();
      const f = new FormData(event.currentTarget); const form = event.currentTarget;
      const amountMinor = parseMajor(String(f.get("amount") ?? ""));
      if (!amountMinor) { void run("Maliyet", async () => { throw new Error("Tutar geçersiz"); }); return; }
      void run("Maliyet bileşeni", () => send("/api/admin/finance/costs", {
        productId: f.get("productId"), component: f.get("component"), label: f.get("label") ?? "", currency, amountMinor, effectiveFrom: f.get("effectiveFrom"),
        rate: f.get("rate") ?? undefined, rateSource: f.get("rateSource") ?? undefined, rateDate: f.get("rateDate") ?? undefined,
      })).then((ok) => ok && form.reset());
    }}>
      <fieldset><legend>Birim maliyet bileşeni</legend>
        <label>Ürün<select name="productId">{products.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
        <label>Bileşen<select name="component">{[["oil", "Zeytinyağı"], ["olive", "Zeytin"], ["bottle", "Şişe"], ["tin", "Teneke"], ["label", "Etiket"], ["packaging", "Ambalaj"], ["labor", "İşçilik"], ["shipping", "Kargo"], ["other", "Diğer"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Açıklama<input name="label" maxLength={120} /></label>
        <label>Para birimi<select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Birim tutar ({currency})<input name="amount" inputMode="decimal" required placeholder="25,00" /></label>
        <label>Geçerlilik başlangıcı<input name="effectiveFrom" type="date" required defaultValue={today()} /></label>
      </fieldset>
      <FxFields currency={currency} base={base} />
      <button type="submit" className="cms-primary" disabled={busy}>Bileşen ekle</button>
      <Notice notice={notice} />
    </form>
  );
}

export function ArchiveCostButton({ id, version }: { id: string; version: number }) {
  const { busy, notice, run } = useSubmit();
  return <>
    <button type="button" className="admin-action" disabled={busy} onClick={() => void run("Arşiv", () => send(`/api/admin/finance/costs/${id}/archive`, { expectedVersion: version }))}>Arşivle</button>
    <Notice notice={notice} />
  </>;
}

/** Client-side CSV of the report rows already on screen (no extra data access). */
export function CsvButton({ filename, rows }: { filename: string; rows: Array<Array<string | number>> }) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  return <a className="admin-action" download={filename} href={`data:text/csv;charset=utf-8,${encodeURIComponent("﻿" + csv)}`}>CSV indir</a>;
}
