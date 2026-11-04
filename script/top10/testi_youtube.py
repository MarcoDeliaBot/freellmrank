"""Scrive accanto all'MP4 il file di testo per YouTube (titolo, descrizione, commento fissato), in inglese,
e prepara in pubblica/<nome>/ i file della release per il flusso n8n che carica i video.

Numeri e nomi presi da top10_data.json. Nessun caricamento: il video lo carica n8n quando la release «video-<nome>»
esiste su GitHub. Dal 4/11/2026 la crea da solo il workflow top10.yml (Marco: «Escono da soli»).
Uso: python testi_youtube.py   (stampa il nome della release, ultima riga)
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import serie as S  # noqa: E402

DATASET = "https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset"
SITO = "https://freellmarena.com/"
# Flusso n8n «video su YouTube Shorts» (n8n/video-youtube.json di classifica-llm-gratis): legge le release «video-<nome>»
# con <nome>.mp4 e <nome>.json; il prefisso «breve-» lo fa trattare come Short. Una release per ogni classifica di Arena.
PACCHETTI = S.PROGETTO / "pubblica"


def descrizione(dati: dict) -> str:
    S.controlla_testi_fissi(dati)
    top = dati["top10"]
    righe = []
    for m in top:
        extra = f" · #{m['arena_pos']} of {dati['total_models']} overall, paid models included" if m["rank"] == 1 else ""
        righe.append(f"{m['rank']}. {m['name']} · {m['score']}{extra}")
    return "\n".join([
        f"The 10 strongest AI models you can use for free, ranked by their Arena chat score (blind human votes), as of {S.FONTE.split(', ')[1]}.",
        "",
        *righe,
        "",
        f"\"Free\" means open weights you can download or a free API, as defined on FreeLLMArena: {dati['free_models']} of the {dati['total_models']} models in Arena's chat ranking qualify. \"Lab chat\" = the lab runs its own chat website, linked on freellmarena.com.",
        "",
        f"Full free ranking: {SITO}",
        "",
        f"Data: {S.FONTE} · {DATASET} · free-model selection by FreeLLMArena.",
        "",
        f"{S.ISCRIVITI}.",
        "",
        "#Shorts #AI #FreeAI #LLM",
    ])


def testo(dati: dict) -> str:
    return "\n".join([
        "TITLE",
        S.TITOLO_YOUTUBE,
        "",
        "DESCRIPTION",
        descrizione(dati),
        "",
        "PINNED COMMENT",
        S.COMMENTO_FISSATO,
        "",
    ])


def nome_release(dati: dict) -> str:
    return f"breve-top10-{dati['arena_date']}"


def info_release(dati: dict) -> dict:
    """Il .json della release: i campi che legge il flusso n8n (titolo, descrizione, tag, lingua)."""
    modelli = [m["name"].split(" (")[0] for m in dati["top10"][:3]]
    return {
        "nome": nome_release(dati),
        "titolo": S.TITOLO_YOUTUBE,
        "descrizione": descrizione(dati),
        "tag": ["Top 10 free AI models", "free AI models", "best free AI", "open weights", "LLM leaderboard", "Arena", *modelli, "Shorts"],
        "lingua": "en",
    }


def pacchetto(dati: dict) -> Path:
    """Copia in pubblica/<nome>/ video, copertina in .jpg e .json della release. Non crea la release."""
    nome = nome_release(dati)
    cartella = PACCHETTI / nome
    cartella.mkdir(parents=True, exist_ok=True)
    shutil.copy2(S.PROGETTO / "renders" / f"{S.ID_PROGETTO}.mp4", cartella / f"{nome}.mp4")
    # copertina: il fotogramma di «WHO'S #1?»
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(S.COPERTINA), "-i", str(S.PROGETTO / "renders" / f"{S.ID_PROGETTO}.mp4"),
                    "-frames:v", "1", "-q:v", "2", str(cartella / f"{nome}.jpg")], check=True)
    (cartella / f"{nome}.json").write_text(json.dumps(info_release(dati), indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return cartella


if __name__ == "__main__":
    dati = S.carica_dati()
    uscita = S.PROGETTO / "renders" / f"{S.ID_PROGETTO}-youtube.txt"
    uscita.write_text(testo(dati), encoding="utf-8")
    print("scritto", uscita, len(S.TITOLO_YOUTUBE), "caratteri nel titolo")
    print("pacchetto per n8n in", pacchetto(dati))
