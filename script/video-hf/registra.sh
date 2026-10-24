#!/usr/bin/env bash
# Registra un video dei generatori di prima (nuovo, settimana, gpu, lungo, modello, notizia-corto) con gli stampi
# (24/10/2026 sera, Marco: «li vorrei tutti così»), al posto di script/brag/registra.py. Scrive gli stessi file di prima
# in video/brag/brag-output-<video>/ (brag.mp4, brag.jpg, brag.srt, share-copy.txt), così il resto del workflow non cambia.
# Se il piano manca o non regge (controlla.mjs) o il montaggio fallisce, registra alla vecchia maniera: il video esce comunque.
# Uso: bash script/video-hf/registra.sh <video>
set -u
v="$1"
piano="video/brag/piano-$v.json"
out="video/brag/brag-output-$v"
lavoro="video/hf/brag-$v"
vecchio() { echo "Video $v alla vecchia maniera (registra.py)"; python script/brag/registra.py video "$v"; exit $?; }
[ -f "$piano" ] || vecchio
node script/video-hf/controlla.mjs "$piano" || vecchio
rm -rf "$lavoro"
node script/video-hf/monta.mjs "$piano" "$lavoro" || vecchio
mkdir -p "$out"
cp "$lavoro/video.mp4" "$out/brag.mp4"
cp "$lavoro/copertina.jpg" "$out/brag.jpg"
cp "$lavoro/video.srt" "$out/brag.srt"
node -p "require('./video/brag/info-$v.json').condividi" > "$out/share-copy.txt"
echo "$out/brag.mp4 (stampi)"
