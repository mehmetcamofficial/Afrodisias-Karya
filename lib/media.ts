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

/**
 * The homepage film: the four source clips (media-src/films/) joined into one
 * continuous, seamlessly looping film with dissolves (scripts/build-journey-film.sh).
 * Chapter times are in seconds of that file; `start` is where a chapter is fully
 * on screen (a keyframe), `from` is where its dissolve begins.
 */
export const journeyFilm = {
  webm: "/video/altin-dal-journey.webm",
  mp4: "/video/altin-dal-journey.mp4",
  poster: "/film/journey-poster.webp",
  posterAlt: "Şafakta Ataeymir vadisindeki zeytinlikler",
  duration: 35.2,
  chapters: [
    { id: "land", label: "Toprak", line: "Ataeymir'in şafağında yaşlı ağaçlar.", from: 0, start: 0, still: "/film/chapter-land.webp", stillAlt: "Gün doğumunda yaşlı zeytin ağaçları", href: "/hikayemiz" },
    { id: "harvest", label: "Hasat", line: "Zeytin, mevsiminde elle toplanır.", from: 7.6, start: 8.8, still: "/film/chapter-harvest.webp", stillAlt: "Elle toplanmış yeşil zeytinlerle dolu ahşap kasa", href: "/hasat" },
    { id: "gold", label: "Sıvı altın", line: "Soğuk sıkım; bir damlada mevsim.", from: 16.4, start: 17.6, still: "/film/chapter-gold.webp", stillAlt: "Taş kaseye akan zeytinyağı", href: "/gunluk/uretim" },
    { id: "bottle", label: "Şişe", line: "Bu topraktan, sofranıza.", from: 25.2, start: 26.4, still: "/film/chapter-bottle.webp", stillAlt: "Traverten kaide üzerinde Altın Dal şişesi", href: "/koleksiyon" },
  ],
} as const;
export type JourneyChapter = (typeof journeyFilm.chapters)[number];

/** Chapter shown at film time `t`: switches at the middle of each 1.2 s dissolve. */
export function chapterAt(t: number) {
  const chapters = journeyFilm.chapters;
  const time = ((t % journeyFilm.duration) + journeyFilm.duration) % journeyFilm.duration;
  // The final dissolve (34.0–35.2 s) returns to the opening grove.
  if (time >= journeyFilm.duration - 0.6) return 0;
  let index = 0;
  for (let i = 0; i < chapters.length; i++) if (time >= chapters[i].from + 0.6) index = i;
  return index;
}

export function videoFor(slot: MediaSlot, locale: Locale): VideoSource | undefined {
  const source = slot.video[locale] ?? slot.video.default;
  return source && (source.mp4 || source.webm) ? source : undefined;
}
