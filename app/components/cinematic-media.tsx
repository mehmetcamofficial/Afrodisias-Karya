"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { videoFor, type Locale, type MediaSlot } from "../../lib/media";

/**
 * Full-bleed background media: an optimized poster image, plus an optional
 * muted loop video.
 *
 * - The poster always renders first (it is the LCP element), so a missing or
 *   slow video never leaves an empty hero.
 * - The video is only mounted on the client when a source is registered in
 *   the media manifest and the visitor has not asked for reduced motion.
 * - `playWhenVisible` videos only play while on screen, so the page never runs
 *   several autoplaying videos at once.
 * - The layer is `pointer-events: none` and never intercepts clicks.
 */
export function CinematicMedia({
  slot,
  locale = "tr",
  priority = false,
  playWhenVisible = false,
  className = "",
}: {
  slot: MediaSlot;
  locale?: Locale;
  priority?: boolean;
  playWhenVisible?: boolean;
  className?: string;
}) {
  const source = videoFor(slot, locale);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionAllowed(!query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playWhenVisible) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void video.play().catch(() => undefined);
      else video.pause();
    }, { threshold: 0.25 });
    observer.observe(video);
    return () => observer.disconnect();
  }, [playWhenVisible, motionAllowed, source]);

  return (
    <div className={`cinematic-media ${className}`} aria-hidden={slot.alt ? undefined : true}>
      <Image src={slot.poster} alt={slot.alt} fill priority={priority} sizes="100vw" />
      {source && motionAllowed && (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          autoPlay={!playWhenVisible}
          preload={playWhenVisible ? "none" : "metadata"}
          poster={slot.poster}
          aria-hidden="true"
        >
          {source.webm && <source src={source.webm} type="video/webm" />}
          {source.mp4 && <source src={source.mp4} type="video/mp4" />}
        </video>
      )}
    </div>
  );
}
