"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * A cover photograph that falls back to the brand's typographic cover when the image cannot load
 * (external host down, blocked or removed) — never alt text over a flat colour. Also catches images
 * that failed before hydration, when React's onError was not yet attached.
 */
export function CoverPhoto({ src, alt, sizes, label, fallback }: { src: string; alt: string; sizes: string; label: string; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) return <>{fallback}</>;
  return <>
    <Image ref={ref} src={src} alt={alt} fill unoptimized={src.startsWith("https://")} sizes={sizes} onError={() => setFailed(true)} />
    <span className="journal-photo-label">{label}</span>
  </>;
}
