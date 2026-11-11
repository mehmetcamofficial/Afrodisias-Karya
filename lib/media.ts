/**
 * Media manifest — the single place where brand video files are registered.
 *
 * The original pages referenced `/video/altin-dal-hero.mp4`,
 * `/video/ataeymir-grove.mp4` and `/video/altin-dal-cinematic.mp4`, but those
 * files are not in the repository and returned 404 on every page view.
 * Slots below stay empty until the approved files are added under
 * `public/video/`; until then every slot renders its poster image only.
 *
 * Per-locale sources let Turkish visitors get Turkish-language footage when it
 * exists; `default` is used for any locale without its own file and must be
 * language-neutral (no burned-in text or voice-over).
 */
export type Locale = "tr" | "en";
export type VideoSource = { mp4?: string; webm?: string };
export type MediaSlot = {
  poster: string;
  /** Describes the poster for screen readers; empty string when decorative. */
  alt: string;
  video: Partial<Record<Locale | "default", VideoSource>>;
};

export const media = {
  hero: {
    poster: "/hero-tetrapylon-grove.webp",
    alt: "Aphrodisias Tetrapylon kemerlerinden görünen gün batımında zeytinlik",
    video: {
      // default: { mp4: "/video/altin-dal-hero.mp4" },
    },
  },
  grove: {
    poster: "/hero-tetrapylon-grove.webp",
    alt: "",
    video: {
      // default: { mp4: "/video/ataeymir-grove.mp4" },
    },
  },
  experience: {
    poster: "/altin-dal-gift-box.webp",
    alt: "",
    video: {
      // default: { mp4: "/video/altin-dal-cinematic.mp4" },
    },
  },
} satisfies Record<string, MediaSlot>;

export function videoFor(slot: MediaSlot, locale: Locale): VideoSource | undefined {
  const source = slot.video[locale] ?? slot.video.default;
  return source && (source.mp4 || source.webm) ? source : undefined;
}
