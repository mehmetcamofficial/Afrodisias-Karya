import { ClerkProvider } from "@clerk/nextjs";
import { clerkPreviewConfigured } from "../../lib/clerk-preview";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!clerkPreviewConfigured()) return children;
  return (
    <ClerkProvider signInUrl="/admin/giris" signInFallbackRedirectUrl="/admin" allowedRedirectProtocols={["https:"]}>
      {children}
    </ClerkProvider>
  );
}
