#!/usr/bin/env bash
# Short verticale di un modello che ha già il suo video lungo (deciso da Marco il 23/10/2026: per ogni video lungo
# uno Short, e lo Short rimanda al video lungo). Usa il generatore degli Short «nuovo» con BRAG_NUOVO=<nome del modello>.
# Uso (dentro il workflow Video): bash script/brag/corto.sh "<nome del modello come in data.json>"
# Esce con 0 anche se lo Short c'è già: non deve fermare il resto della corsa.
set -u
modello="$1"
BRAG_NUOVO="$modello" node script/brag/genera.mjs || { echo "Short non generato per $modello"; exit 0; }
nome=$(python -c "import json; print(json.load(open('video/brag/info-nuovo.json', encoding='utf-8'))['nome'])")
lungo="modello-${nome#nuovo-}"
if gh release view "video-$nome" >/dev/null 2>&1; then echo "Short già fatto: $nome"; exit 0; fi
if ! gh release view "video-$lungo" >/dev/null 2>&1; then echo "Manca il video lungo $lungo: Short non fatto"; exit 0; fi
python script/brag/registra.py video nuovo || { echo "Registrazione non riuscita per $nome"; exit 0; }
d="video/brag/brag-output-nuovo"
cp "$d/brag.mp4" "$d/$nome.mp4"; cp "$d/brag.jpg" "$d/$nome.jpg"; cp "$d/brag.srt" "$d/$nome.srt"; cp video/brag/info-nuovo.json "$d/$nome.json"
python script/brag/collega.py "$d/$nome.json" "$lungo"
titolo=$(python -c "import json; print(json.load(open('$d/$nome.json', encoding='utf-8'))['titolo'])")
gh release create "video-$nome" "$d/$nome.mp4" "$d/$nome.jpg" "$d/$nome.srt" "$d/$nome.json" --title "$titolo" --notes-file "$d/share-copy.txt" --latest=false
echo "Pubblicato: $nome (collegato a $lungo)"
node script/video-post.mjs video/brag/info-nuovo.json "$d/brag.jpg" video/brag/scena-nuovo.html "video-$nome" || echo "Post non scritto per $nome: controllo dei fatti non superato"
exit 0
