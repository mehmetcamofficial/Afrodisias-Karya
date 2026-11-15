import { SignIn } from "@clerk/nextjs";
import { notFound } from "next/navigation";
import { clerkPreviewConfigured } from "../../../../lib/clerk-preview";

export const dynamic = "force-dynamic";

export default function AdminSignIn() {
  if (process.env.VERCEL_ENV !== "preview") notFound();
  return (
    <main id="main" className="admin-page admin-forbidden">
      {clerkPreviewConfigured()
        ? <SignIn path="/admin/giris" routing="path" fallbackRedirectUrl="/admin" />
        : <p role="alert">Preview yönetici girişi henüz yapılandırılmamış.</p>}
    </main>
  );
}
