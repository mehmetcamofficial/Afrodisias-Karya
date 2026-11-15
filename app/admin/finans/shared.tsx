import Link from "next/link";
import { requirePostgres } from "../../../db/postgres/driver";
import type { SqlDriver } from "../../../db/postgres/repository";
import { can, type Role } from "../../../lib/cms-permissions";
import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";
import { AdminUnavailable } from "../AdminPanels";

export const FINANCE_TABS = [
  ["Genel Bakış", "/admin/finans"], ["Gelir ve Giderler", "/admin/finans/hareketler"], ["Ürün Maliyetleri", "/admin/finans/maliyetler"],
  ["Cari Hesaplar", "/admin/finans/cariler"], ["Tahsilatlar", "/admin/finans/tahsilatlar"], ["Raporlar", "/admin/finans/raporlar"],
] as const;

export function FinanceTabs({ current }: { current: string }) {
  return (
    <nav className="finance-tabs" aria-label="Finans bölümleri">
      {FINANCE_TABS.map(([label, href]) => <Link key={href} href={href} aria-current={href === current ? "page" : undefined}>{label}</Link>)}
    </nav>
  );
}

/**
 * Finance page frame: admin session + finance.read, DB availability, honest notes.
 * Renders the page body with the DB handle and whether the user may write.
 */
export async function FinancePage({ path, title, children }: { path: string; title: string; children: (ctx: { db: SqlDriver; canWrite: boolean; role: Role }) => Promise<React.ReactNode> }) {
  const access = await requireAdminPage(path);
  if (access.status !== "admin") return <AdminForbidden email={access.user.email} configured={access.configured} />;
  if (!can(access.role, "finance.read")) {
    return <AdminShell kicker="FİNANS" title="Yetki gerekli"><p className="admin-notice">Finans ekranları yalnızca sahip ve muhasebe rollerine açıktır.</p></AdminShell>;
  }
  let body: React.ReactNode;
  try { body = await children({ db: requirePostgres(), canWrite: can(access.role, "finance.write"), role: access.role }); }
  catch { body = <AdminUnavailable what="Finans verileri" />; }
  return (
    <AdminShell kicker="FİNANS · ÖN MUHASEBE" title={title}>
      <FinanceTabs current={path} />
      <p className="admin-notice finance-note" role="note">Ön muhasebe kayıtlarıdır; resmî defter, e-fatura veya vergi beyanı yerine geçmez. Ödeme sağlayıcısına bağlı değildir. Kayıtlar silinmez; hatalı kayıt ters kayıtla iptal edilir.</p>
      {body}
    </AdminShell>
  );
}
