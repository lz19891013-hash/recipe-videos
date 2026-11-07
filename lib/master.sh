#!/usr/bin/env bash
# Two-pass loudnorm (linear) + AAC 256k + faststart mux onto silent H.264.
set -euo pipefail
EP="${1:?episode dir}"; OUT="${2:?out mp4}"
SILENT="$EP/build/video_silent.mp4"
WAV="$EP/build/mix.wav"
TMP="$EP/build/norm.wav"
python3 - <<'PY' "$WAV" "$TMP"
import json, subprocess, sys, re, os
wav, tmp = sys.argv[1], sys.argv[2]
cmd = ["ffmpeg","-hide_banner","-i",wav,"-af","loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json","-f","null","-"]
p = subprocess.run(cmd, capture_output=True, text=True)
txt = p.stderr
m = re.search(r"\{[\s\S]*?\}", txt[txt.rfind("{"):] if "{" in txt else "")
if not m:
    print(txt[-2000:]); raise SystemExit("loudnorm pass1 json missing")
j = json.loads(m.group(0))
filt = (
    "loudnorm=I=-14:TP=-1.5:LRA=11:linear=true:"
    f"measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
    f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:"
    f"offset={j['target_offset']}"
)
r = subprocess.run(["ffmpeg","-y","-i",wav,"-af",filt,tmp], capture_output=True, text=True)
if r.returncode != 0:
    print(r.stderr[-2000:]); raise SystemExit("loudnorm pass2 failed")
print("loudnorm", j.get("input_i"), "-> target -14")
PY
ffmpeg -y -i "$SILENT" -i "$TMP" -map 0:v:0 -map 1:a:0 \
  -c:v copy -c:a aac -b:a 256k -ar 48000 -ac 2 \
  -shortest -movflags +faststart "$OUT"
echo "mastered $OUT"
