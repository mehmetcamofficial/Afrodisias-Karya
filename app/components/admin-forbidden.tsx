import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { chatGPTSignOutPath } from "../chatgpt-auth";

/** Shown to signed-in users who are not on the ADMIN_EMAILS allowlist. */
export function AdminForbidden({ email, configured }: { email: string; configured: boolean }) {
  return (
    <main className="admin-page admin-forbidden">
      <section role="alert">
        <ShieldAlert aria-hidden="true" />
        <p>ALTIN DAL · YÖNETİM</p>
        <h1>Bu alana erişim yetkiniz yok</h1>
        <span>
          <b>{email}</b> hesabı yönetici listesinde değil.
          {!configured && " Yönetici listesi (ADMIN_EMAILS) henüz yapılandırılmamış; güvenlik nedeniyle yönetim paneli kapalı tutuluyor."}
        </span>
        <nav>
          <Link href="/">Siteye dön</Link>
          <a href={chatGPTSignOutPath("/admin")}>Farklı hesapla giriş yap</a>
        </nav>
      </section>
    </main>
  );
}
