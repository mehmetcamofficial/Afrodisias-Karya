"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Accessible, lazy video: shows the poster immediately, attaches the source
 * only when the player nears the viewport, never autoplays, and keeps native
 * controls (keyboard + screen reader support). preload="none" keeps mobile data low.
 */
export function LazyVideo({ src, poster, label, captions }: { src: string; poster: string; label: string; captions?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  // Browsers without IntersectionObserver load the source immediately (still preload="none").
  const [near, setNear] = useState(() => typeof window !== "undefined" && !("IntersectionObserver" in window));
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) { setNear(true); observer.disconnect(); } }, { rootMargin: "300px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);
  return (
    <video ref={ref} className="showcase-video" poster={poster} controls playsInline preload="none" aria-label={label} data-loaded={near ? "true" : "false"}>
      {near && <source src={src} type={src.endsWith(".webm") ? "video/webm" : "video/mp4"} />}
      {near && captions && <track kind="captions" src={captions} srcLang="tr" label="Türkçe" default />}
    </video>
  );
}
