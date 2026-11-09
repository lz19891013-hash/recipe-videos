#!/usr/bin/env bash
# usage: lib/master.sh <episodeDir> <out.mp4>
# Two-pass EBU R128 loudnorm of build/mix.wav to -14 LUFS / -1.5 dBTP, then mux with build/video_silent.mp4.
set -euo pipefail
EP="$1"; OUT="$2"; B="$EP/build"; I=-14; TP=-1.5; LRA=20
J=$(ffmpeg -hide_banner -nostats -i "$B/mix.wav" -af loudnorm=I=$I:TP=$TP:LRA=$LRA:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g(){ echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
echo "pass1: I=$(g input_i) TP=$(g input_tp) LRA=$(g input_lra) thresh=$(g input_thresh)"
ffmpeg -y -hide_banner -loglevel error -i "$B/mix.wav" -af "loudnorm=I=$I:TP=$TP:LRA=$LRA:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true:print_format=summary,aresample=48000" -ar 48000 -c:a pcm_s24le "$B/mix_norm.wav"
ffmpeg -y -hide_banner -loglevel error -i "$B/video_silent.mp4" -i "$B/mix_norm.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "$OUT"
echo "muxed -> $OUT"
