"use client";

import { SignOutButton } from "@clerk/nextjs";

export function ClerkAdminSignOut() {
  return <SignOutButton redirectUrl="/admin/giris"><button type="button">Farklı hesapla giriş yap</button></SignOutButton>;
}
