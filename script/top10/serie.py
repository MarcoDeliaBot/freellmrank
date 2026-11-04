"""Tempi e testi a schermo della serie «Top 10 Free AI Models», settimana per settimana.

Nata in OpenMontage il 3-4/11/2026 (C:\\OpenMontage\\projects\\top-10-free-ai-models-nov-2026), portata qui il 4/11 per
farla girare da sola su GitHub (Marco, 4/11: «Escono da soli»). Date, mese e fonte non sono più scritti a mano: escono
da top10_data.json, che dati_top10.py scrive leggendo sito/data.json.
La cartella di lavoro è TOP10_DIR (predefinita: video/top10): dentro top10_data.json, hyperframes/, renders/, pubblica/.
"""
from __future__ import annotations

import json
import os
from datetime import date
from pathlib import Path

RADICE = Path(__file__).resolve().parents[2]
PROGETTO = Path(os.environ.get("TOP10_DIR") or RADICE / "video" / "top10").resolve()
ID_PROGETTO = "top10"
DATI = PROGETTO / "top10_data.json"

# ---- tempi (secondi) -------------------------------------------------------------------------
DURATA = 16.5
INTRO = (0.0, 1.0)
HUD = (0.85, 11.0)
COUNTDOWN = (1.0, 11.0)
SLOT = (COUNTDOWN[1] - COUNTDOWN[0]) / 9  # nove schede, dal 10 al 2
WHO = (11.0, 11.5)
TOP1 = (11.5, 14.0)
OUTRO = (14.0, 16.5)
COPERTINA = 11.3  # fotogramma di «WHO'S #1?»

# ---- testi fissi (approvati il 3-4/11/2026) -----------------------------------------------------
TITOLO_1 = "TOP 10"
TITOLO_2 = "FREE AI MODELS"
ETICHETTA_PUNTEGGIO = "ARENA CHAT SCORE"
DOMANDA = "WHO'S #1?"
CHIUSURA_1 = "Full ranking:"
CHIUSURA_URL = "freellmarena.com"
ISCRIVITI = "Subscribe so you don't miss the latest free AI news"
COMMENTO_FISSATO = "Full ranking of the free models: freellmarena.com. Which one do you use most?"

MESI = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def carica_dati() -> dict:
    return json.loads(DATI.read_text(encoding="utf-8"))


def _giorno(iso: str) -> date:
    return date.fromisoformat(iso[:10])


# ---- testi che dipendono dalla settimana: la data della classifica di Arena -----------------------
_d = _giorno(carica_dati()["arena_date"]) if DATI.exists() else date(2026, 10, 28)
FONTE = f"Arena leaderboard, {_d.day} {MESI[_d.month - 1][:3]} {_d.year}, CC BY 4.0"
DATA_FONTE = f"{_d.day} {MESI[_d.month - 1][:3]} {_d.year}"
# il mese è quello in cui esce il video, come «NOV 2026» del primo (classifica del 28/10, uscito il 4/11)
_oggi = date.fromisoformat(os.environ["TOP10_OGGI"]) if os.environ.get("TOP10_OGGI") else date.today()
MESE = f"{MESI[_oggi.month - 1][:3].upper()} {_oggi.year}"
TITOLO_YOUTUBE = f"Top 10 Free AI Models Right Now ({MESI[_oggi.month - 1]} {_oggi.year})"


def controlla_testi_fissi(dati: dict) -> None:
    """I testi citano date e numeri: devono coincidere con i dati letti."""
    assert DATA_FONTE in FONTE and _giorno(dati["arena_date"]) == _d, (FONTE, dati["arena_date"])
    assert len(dati["top10"]) == 10, len(dati["top10"])
    # Il sito non mostra tutti i modelli gratuiti (la tabella ne ha 60): il commento non cita numeri.
    assert not any(c.isdigit() for c in COMMENTO_FISSATO), COMMENTO_FISSATO
    assert len(TITOLO_YOUTUBE) <= 100, TITOLO_YOUTUBE


def slot(k: int) -> tuple[float, float]:
    """Tempo della scheda k (0 = n. 10, 8 = n. 2)."""
    a = COUNTDOWN[0] + k * SLOT
    return round(a, 3), round(a + SLOT, 3)


def prova_n1(dati: dict) -> str:
    n1 = dati["top10"][0]
    return f"#{n1['arena_pos']} of {dati['total_models']} · paid models included"
