#!/usr/bin/env bash
# One-shot build of an episode:  ./make.sh episodes/<slug> [/workspace/<out>.mp4]
# render frames -> silent H.264 -> synth audio -> 2-pass loudnorm + mux -> QA report
set -euo pipefail
cd "$(dirname "$0")"
EP="${1:?episode dir}"; SLUG=$(basename "$EP"); OUT="${2:-/workspace/${SLUG}.mp4}"
node lib/render.js "$EP" --workers "${WORKERS:-3}"
python3 "$EP/audio.py"
lib/master.sh "$EP" "$OUT"
python3 lib/check.py "$EP" "$OUT"
[ "${KEEP_FRAMES:-0}" = 1 ] || rm -rf "$EP/build/frames"   # ~1 GB of JPEGs, reproducible
echo "QA report: $EP/build/qa/report.json   contact sheets: $EP/build/qa/sheet*.png  (LOOK AT THEM before publishing)"
