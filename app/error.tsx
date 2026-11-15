"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BrandShell } from "./components/site-shell";

/** Branded error boundary: never a blank or unstyled page; no error details are shown to visitors. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("page error", error.digest ?? ""); }, [error]);
  return <BrandShell>
    <section className="status-page" aria-labelledby="status-title" role="alert">
      <p>BİR SORUN OLUŞTU</p>
      <h1 id="status-title">Sayfa şu anda<br/><em>yüklenemedi.</em></h1>
      <span>Geçici bir sorun olabilir. Lütfen tekrar deneyin; sorun sürerse sağ alttaki Yardım düğmesinden bize yazabilirsiniz.</span>
      <nav aria-label="Devam et">
        <button type="button" onClick={() => reset()}>Tekrar dene</button>
        <Link href="/">Ana sayfa</Link>
      </nav>
    </section>
  </BrandShell>;
}
