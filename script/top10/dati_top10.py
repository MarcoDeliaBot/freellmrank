"""Top 10 gratuita della classifica chat di Arena, presa da data.json di FreeLLMArena.

Stessa regola del sito (classifica-llm-gratis/script/costruisci-sito.mjs, riga 42):
un modello è gratis se m.aperto || m.or.gratis. «Lab chat» è solo l'etichetta che il sito
mette ai modelli aperti il cui laboratorio ha una chat web (CHAT_WEB in script/sito/comune.mjs).
Nomi dei laboratori come nomeLab() di script/sito/laboratori.mjs.

Uso: python dati_top10.py [percorso data.json] [uscita.json]
Ogni numero che finisce a schermo esce da qui: nessun valore scritto a mano.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

RADICE = Path(__file__).resolve().parents[2]
DATA_JSON = RADICE / "sito" / "data.json"
USCITA = Path(os.environ.get("TOP10_DIR") or RADICE / "video" / "top10") / "top10_data.json"

# copia di CHAT_WEB (script/sito/comune.mjs, righe 30-34)
CHAT_WEB = {
    "deepseek": "https://chat.deepseek.com", "moonshot": "https://www.kimi.com", "zai": "https://chat.z.ai",
    "alibaba": "https://chat.qwen.ai", "minimax": "https://agent.minimax.io", "tencent": "https://yuanbao.tencent.com",
    "google": "https://aistudio.google.com", "nvidia": "https://build.nvidia.com",
}
# nomi dei laboratori come LAB[org][0] in script/sito/laboratori.mjs (solo quelli che servono qui)
NOMI_LAB = {"deepseek": "DeepSeek", "zai": "GLM (Z.ai)", "moonshot": "Kimi (Moonshot)", "xiaomi": "Xiaomi"}


def nome_lab(org: str) -> str:
    if org in NOMI_LAB:
        return NOMI_LAB[org]
    return org[:1].upper() + org[1:] if org else "Other"


def gratis(m: dict) -> bool:
    return bool(m.get("aperto")) or bool((m.get("or") or {}).get("gratis"))


def etichetta(m: dict) -> str:
    """Testo «perché è gratis» a schermo, con le parole del sito."""
    parti = []
    if m.get("aperto"):
        parti.append("Open weights")
        if m.get("licenza"):
            parti.append(m["licenza"])
    if (m.get("or") or {}).get("gratis"):
        parti.append("Free API")
    if m.get("aperto") and CHAT_WEB.get(m.get("org", "")):
        parti.append("Lab chat")
    return " · ".join(parti)


def calcola(data_json: Path) -> dict:
    grezzo = data_json.read_bytes()
    dati = json.loads(grezzo.decode("utf-8"))
    chat = next(c for c in dati["categorie"] if c["id"] == "chat")
    modelli = chat["modelli"]
    for a, b in zip(modelli, modelli[1:]):
        if b["pos"] < a["pos"] or b["punti"] > a["punti"]:
            raise SystemExit(f"Ordine inatteso in data.json: {a['nome']} -> {b['nome']}")
    lista = [m for m in modelli if gratis(m)]
    pagato = next(m for m in modelli if not gratis(m))
    top = []
    for i, m in enumerate(lista[:10]):
        top.append({
            "rank": i + 1,
            "name": m["nome"],
            "lab_key": m["org"],
            "lab": nome_lab(m["org"]),
            "score": m["punti"],
            "arena_pos": m["pos"],
            "votes": m["voti"],
            "license": m.get("licenza"),
            "open_weights": bool(m.get("aperto")),
            "free_api": bool((m.get("or") or {}).get("gratis")),
            "lab_chat": CHAT_WEB.get(m["org"]) if m.get("aperto") else None,
            "hf_repo": (m.get("hf") or {}).get("repo"),
            "why_free": etichetta(m),
        })
    return {
        "source_file": data_json.name,
        "source_sha256": hashlib.sha256(grezzo).hexdigest(),
        "read_at": datetime.now(timezone.utc).isoformat(),
        "data_updated": dati["aggiornato"],
        "data_source": dati.get("fonte"),
        "category": "chat",
        "arena_date": chat["data"],
        "total_models": chat["totale"],
        "free_models": len(lista),
        "best_paid": {"name": pagato["nome"], "score": pagato["punti"], "arena_pos": pagato["pos"]},
        "rule": "aperto || or.gratis (script/costruisci-sito.mjs riga 42)",
        "top10": top,
    }


if __name__ == "__main__":
    sorgente = Path(sys.argv[1]) if len(sys.argv) > 1 else DATA_JSON
    uscita = Path(sys.argv[2]) if len(sys.argv) > 2 else USCITA
    risultato = calcola(sorgente)
    uscita.parent.mkdir(parents=True, exist_ok=True)
    uscita.write_text(json.dumps(risultato, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"scritto {uscita}: {risultato['free_models']} gratis su {risultato['total_models']} (Arena {risultato['arena_date']})")
    for t in risultato["top10"]:
        print(f"  #{t['rank']:>2} {t['name']:<36} {t['score']}  #{t['arena_pos']} of {risultato['total_models']}  {t['why_free']}")
