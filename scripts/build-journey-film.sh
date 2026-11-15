#!/usr/bin/env bash
# Builds the single homepage film from the four source clips in media-src/films/.
# One continuous, seamlessly looping 35.2 s film: each clip dissolves (1.2 s) into
# the next, and the bottle dissolves back into the opening grove frame so the loop
# point is invisible. Keyframes sit on chapter starts (0, 8.8, 17.6, 26.4 s) so the
# chapter navigation seeks instantly. No audio track.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=media-src/films
OUT=public/video
FC="[0:v]trim=start=1.2,setpts=PTS-STARTPTS,format=yuv420p,fps=24[a];\
[1:v]format=yuv420p,fps=24,setpts=PTS-STARTPTS[b];\
[2:v]format=yuv420p,fps=24,setpts=PTS-STARTPTS[c];\
[3:v]format=yuv420p,fps=24,setpts=PTS-STARTPTS[d];\
[4:v]trim=end=1.2,setpts=PTS-STARTPTS,format=yuv420p,fps=24[e];\
[a][b]xfade=transition=fade:duration=1.2:offset=7.6[ab];\
[ab][c]xfade=transition=fade:duration=1.2:offset=16.4[abc];\
[abc][d]xfade=transition=fade:duration=1.2:offset=25.2[abcd];\
[abcd][e]xfade=transition=fade:duration=1.2:offset=34.0,format=yuv420p[out]"
ffmpeg -y -i $SRC/altin-dal-film-01.mp4 -i $SRC/altin-dal-film-02.mp4 -i $SRC/altin-dal-film-03.mp4 -i $SRC/altin-dal-film-04.mp4 -i $SRC/altin-dal-film-01.mp4 \
  -filter_complex "$FC" -map "[out]" -an -c:v libx264 -preset slow -crf 23 -maxrate 2800k -bufsize 5600k -profile:v high -pix_fmt yuv420p \
  -g 48 -keyint_min 24 -sc_threshold 0 -force_key_frames "0,8.8,17.6,26.4" -movflags +faststart $OUT/altin-dal-journey.mp4
ffmpeg -y -i $OUT/altin-dal-journey.mp4 -an -c:v libvpx-vp9 -crf 33 -b:v 0 -row-mt 1 -cpu-used 2 -deadline good -g 48 \
  -force_key_frames "0,8.8,17.6,26.4" -pix_fmt yuv420p $OUT/altin-dal-journey.webm
for pair in "0:journey-poster" "4.0:chapter-land" "12.5:chapter-harvest" "21.5:chapter-gold" "30.0:chapter-bottle"; do
  ffmpeg -v error -y -ss "${pair%%:*}" -i $OUT/altin-dal-journey.mp4 -frames:v 1 -c:v libwebp -quality 82 "public/film/${pair##*:}.webp"
done
