#!/usr/bin/env bash
# Builds per-page stills and the Hasat loop from the owner's source films (media-src/films, not deployed),
# so Hikâyemiz, Deneyim and Hasat each have their own imagery instead of repeating one hero photo.
set -euo pipefail
src=media-src/films; out=public/pages; mkdir -p "$out"
still() { ffmpeg -loglevel error -y -ss "$2" -i "$src/altin-dal-film-0$1.mp4" -frames:v 1 -vf "scale=1280:-1" -c:v libwebp -quality 80 "$out/$3.webp"; }
# Hikâyemiz
still 1 0.5 story-valley; still 1 6.5 story-grove; still 2 8.5 story-crate
# Deneyim
still 1 4.5 route-grove; still 3 6.5 route-table
# Hasat (six stages + loop poster)
still 1 2.5 harvest-tree; still 2 2.5 harvest-season; still 2 6.5 harvest-picking
still 3 2.5 harvest-pressing; still 4 4.5 harvest-storage; still 3 8.5 harvest-table; still 2 0.5 harvest-poster
# Aphrodisias crops from the editorial photo (1672x941): columns detail and arch
ffmpeg -loglevel error -y -i public/hero-tetrapylon-grove.webp -vf "crop=900:941:700:0,scale=900:-1" -c:v libwebp -quality 80 "$out/story-aphrodisias.webp"
ffmpeg -loglevel error -y -i public/hero-tetrapylon-grove.webp -vf "crop=760:941:0:0,scale=760:-1" -c:v libwebp -quality 80 "$out/route-heritage.webp"
# Hasat loop: 10 s, 960 px, muted, seamless enough for a background (fades are in CSS).
ffmpeg -loglevel error -y -i "$src/altin-dal-film-02.mp4" -an -vf "scale=960:-2,fps=24" -c:v libvpx-vp9 -crf 38 -b:v 0 -row-mt 1 -cpu-used 2 -g 48 public/video/harvest-loop.webm
ffmpeg -loglevel error -y -i "$src/altin-dal-film-02.mp4" -an -vf "scale=960:-2,fps=24" -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -g 48 -movflags +faststart public/video/harvest-loop.mp4
