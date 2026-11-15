"use client";

import Image from "next/image";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { chapterAt, journeyFilm } from "../../lib/media";
import "./hero-film.css";

type Mode = "pending" | "film" | "stills";
type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/**
 * Homepage hero film: the four clips joined into ONE continuous film with
 * dissolves (scripts/build-journey-film.sh), so a single decoder plays it and
 * transitions are real cross-dissolves, not script-timed swaps.
 *
 * - The poster (= the film's first frame) is the LCP image and stays until the
 *   video actually renders frames, so there is never a black flash.
 * - Chapters follow the film's own clock; the rail updates through a CSS
 *   variable on each animation frame, without React re-renders.
 * - Visitors can pause (WCAG 2.2.2) and jump between chapters with the keyboard.
 * - Reduced motion, Save-Data, 2G or a video error → chapter stills instead.
 * - The film pauses off-screen and in background tabs.
 */
export function HeroFilm({ children, labelledBy }: { children: React.ReactNode; labelledBy: string }) {
  const chapters = journeyFilm.chapters;
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLOListElement>(null);
  const userPaused = useRef(false);
  const [mode, setMode] = useState<Mode>("pending");
  const [playing, setPlaying] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [chapter, setChapter] = useState(0);

  // Decide once on the client whether motion and data budget allow the film.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    const lowData = Boolean(connection?.saveData) || /(^|-)2g$/.test(connection?.effectiveType ?? "");
    const decide = () => setMode(reduced.matches || lowData ? "stills" : "film");
    decide();
    reduced.addEventListener("change", decide);
    return () => reduced.removeEventListener("change", decide);
  }, []);

  // Film clock → chapter state (only on change) and rail progress (CSS variable).
  useEffect(() => {
    if (mode !== "film") return;
    const video = videoRef.current;
    if (!video) return;
    let frame = 0;
    const tick = () => {
      const t = video.currentTime;
      const index = chapterAt(t);
      setChapter((current) => (current === index ? current : index));
      const begin = index === 0 && t >= journeyFilm.duration - 0.6 ? t : chapters[index].from + 0.6;
      const end = index === chapters.length - 1 ? journeyFilm.duration - 0.6 : chapters[index + 1].from + 0.6;
      const within = index === 0 && t >= journeyFilm.duration - 0.6 ? 0 : Math.min(1, Math.max(0, (t - begin) / (end - begin)));
      railRef.current?.style.setProperty("--chapter-progress", within.toFixed(4));
      frame = requestAnimationFrame(tick);
    };
    const start = () => { if (!frame) frame = requestAnimationFrame(tick); };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; };
    const onPlaying = () => { setPlaying(true); setRendering(true); start(); };
    const onPause = () => { setPlaying(false); stop(); };
    const onError = () => setMode("stills");
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);
    // <source> errors do not bubble to the video; the last one failing means no playable source.
    const lastSource = video.querySelector("source:last-of-type");
    lastSource?.addEventListener("error", onError);
    void video.play().catch(() => undefined); // autoplay may be refused; the poster stays and controls still work
    return () => {
      stop();
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
      lastSource?.removeEventListener("error", onError);
    };
  }, [mode, chapters]);

  // Pause off-screen and in hidden tabs; resume only if the visitor did not pause.
  useEffect(() => {
    if (mode !== "film") return;
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;
    let visible = true;
    const sync = () => {
      if (visible && !document.hidden && !userPaused.current) void video.play().catch(() => undefined);
      else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.intersectionRatio > 0.15; sync(); }, { threshold: [0, 0.15, 0.5] });
    observer.observe(section);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, [mode]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { userPaused.current = false; void video.play().catch(() => undefined); }
    else { userPaused.current = true; video.pause(); }
  }, []);

  const goTo = useCallback((index: number) => {
    setChapter(index);
    railRef.current?.style.setProperty("--chapter-progress", "0");
    const video = videoRef.current;
    if (mode === "film" && video) {
      video.currentTime = chapters[index].start; // keyframe-aligned: seeks instantly
      if (!userPaused.current) void video.play().catch(() => undefined);
    }
  }, [mode, chapters]);

  const current = chapters[chapter];
  return (
    <section ref={sectionRef} className={`landing-hero hero-film is-${mode}${rendering ? " is-rendering" : ""}`} aria-labelledby={labelledBy}>
      <div className="hero-film-media">
        {/* LCP: the film's first frame, so the hand-over to video is invisible. */}
        <Image className="hero-film-poster" src={journeyFilm.poster} alt={journeyFilm.posterAlt} fill priority sizes="100vw" />
        {mode === "stills" && chapters.map((c, index) => (
          <Image key={c.id} className={`hero-film-still${index === chapter ? " is-active" : ""}`} src={c.still} alt={index === chapter ? c.stillAlt : ""}
            aria-hidden={index === chapter ? undefined : true} fill sizes="100vw" loading={index === 0 ? "eager" : "lazy"} />
        ))}
        {mode === "film" && (
          <video ref={videoRef} className="hero-film-video" muted loop playsInline autoPlay preload="auto" poster={journeyFilm.poster} aria-hidden="true" tabIndex={-1}>
            <source src={journeyFilm.webm} type="video/webm" />
            <source src={journeyFilm.mp4} type="video/mp4" />
          </video>
        )}
      </div>
      <div className="hero-film-shade" aria-hidden="true" />
      {children}
      <div className="hero-film-controls">
        <p className="hero-film-caption" aria-hidden="true" key={current.id}>
          <span>{String(chapter + 1).padStart(2, "0")} · {current.label}</span>
          {current.line}
        </p>
        <nav className="hero-film-nav" aria-label="Film bölümleri">
          <ol ref={railRef}>
            {chapters.map((c, index) => (
              <li key={c.id} className={index === chapter ? "is-active" : index < chapter ? "is-done" : ""}>
                <button type="button" onClick={() => goTo(index)} aria-current={index === chapter ? "step" : undefined} aria-label={`${index + 1}. bölüm: ${c.label}`}>
                  <span className="hero-film-bar" aria-hidden="true"><i /></span>
                  <span className="hero-film-label">{String(index + 1).padStart(2, "0")} <b>{c.label}</b></span>
                </button>
              </li>
            ))}
          </ol>
          {mode === "film" && (
            <button type="button" className="hero-film-toggle" onClick={togglePlay} aria-pressed={!playing} aria-label={playing ? "Filmi duraklat" : "Filmi oynat"}>
              {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            </button>
          )}
        </nav>
        <Link className="hero-film-chapter-link" href={current.href}>{current.label} hakkında <span aria-hidden="true">→</span></Link>
      </div>
    </section>
  );
}
