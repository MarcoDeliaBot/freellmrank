"""Scrive la composizione HyperFrames (atelier) del video «Top 10 Free AI Models» da top10_data.json (cartella TOP10_DIR).

Uso (Python con fontTools, per esempio quello di sistema):
  python genera_composizione.py

- Copia in hyperframes/assets/ i due caratteri locali del canale (con le licenze OFL) e GSAP dal pacchetto
  hyperframes già installato: al render non serve la rete.
- Misura i testi sui file dei caratteri (fontTools) per scegliere le dimensioni: niente testo che esce dallo schermo.
- Ogni numero viene da top10_data.json (scritto da dati_top10.py leggendo data.json).
"""
from __future__ import annotations

import html
import json
import math
import os
import re
import shutil
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import serie as S  # noqa: E402

FONTI = S.RADICE / "script" / "video-hf" / "fonti"
LOGO = S.RADICE / "sorgente" / "favicon.svg"  # il logo del sito, lo stesso dei video delle notizie


def trova_gsap() -> Path:
    """GSAP 3.15.0 dal pacchetto hyperframes già scaricato da npx (HF_GSAP per indicarlo a mano)."""
    if os.environ.get("HF_GSAP"):
        return Path(os.environ["HF_GSAP"])
    radici = [Path.home() / ".npm" / "_npx", Path(os.environ.get("LOCALAPPDATA", "")) / "npm-cache" / "_npx"]
    for r in radici:
        for p in sorted(r.glob("*/node_modules/hyperframes/dist/vendor/npm/gsap@3.15.0/dist/gsap.min.js")) if r.is_dir() else []:
            return p
    raise SystemExit("gsap.min.js non trovato: lanciare prima «npx --yes hyperframes@0.9.9 --version» o impostare HF_GSAP")


WS = S.PROGETTO / "hyperframes"

W, H = 1080, 1920
M = 72
L = W - 2 * M  # 936: larghezza utile
# Colori di Claude, versione chiara, scelti da Marco il 04/11/2026 al posto del verde (decision_log d-022):
# https://github.com/anthropics/skills/blob/main/skills/brand-guidelines/SKILL.md
# Sul crema l'arancione come scritta ha contrasto 2,96: resta sulle tacche, i punteggi vanno in quasi nero.
C = {
    "fondo": "#faf9f5", "fondoBasso": "#e8e6dc", "etichetta": "#e8e6dc",
    "taccaSpenta": "#e8e6dc", "taccaAttiva": "#d97757", "taccaPassata": "#e39e86",
    "punteggio": "#141413", "testo": "#141413", "testo2": "#6b6b69",
    "marchio": "#0d7a47",  # verde del logo FreeLLMArena, anche per «Arena» nel nome
}
PASSO_TACCA = (L + 12) / 10  # dieci tacche con 12 px di spazio: 82,8 px l'una, larghe in tutto 936 px
TK = 260      # altezza di una riga del tabellone del punteggio
TK1 = 330     # altezza della riga del numero del n. 1


class Misura:
    """Larghezza dei testi in em, dai file dei caratteri (senza crenatura: stima prudente)."""

    def __init__(self, percorso: Path, **assi: float) -> None:
        f = TTFont(str(percorso))
        if assi and "fvar" in f:
            f = instantiateVariableFont(f, assi)
        self.upm = f["head"].unitsPerEm
        self.cmap = f.getBestCmap()
        self.hmtx = f["hmtx"]

    def em(self, testo: str) -> float:
        tot = 0
        for ch in testo:
            g = self.cmap.get(ord(ch))
            if g is None:
                raise ValueError(f"carattere {ch!r} assente nel font")
            tot += self.hmtx[g][0]
        return tot / self.upm

    def px(self, testo: str, size: float, spaziatura_em: float = 0.0) -> float:
        return self.em(testo) * size + spaziatura_em * size * len(testo)

    def adatta(self, testo: str, massimo: int, larghezza: float = L, margine: float = 0.96) -> int:
        return int(min(massimo, math.floor(larghezza * margine / self.em(testo))))


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def f3(x: float) -> str:
    return f"{x:.3f}".rstrip("0").rstrip(".")


def trasparente(colore: str) -> str:
    """Lo stesso colore con opacità 0: l'inizio della sfumatura del fondo."""
    r, g, b = (int(colore[i:i + 2], 16) for i in (1, 3, 5))
    return f"rgba({r}, {g}, {b}, 0)"


def spezza_nome(nome: str, mis: Misura) -> tuple[str, str]:
    candidati = []
    for i, ch in enumerate(nome):
        if ch == "-" and 0 < i < len(nome) - 1:
            candidati.append((nome[: i + 1], nome[i + 1:]))
        if ch == " ":
            candidati.append((nome[:i], nome[i + 1:]))
    if not candidati:
        raise ValueError(f"nome senza punti di a capo: {nome}")
    return min(candidati, key=lambda c: max(mis.em(c[0]), mis.em(c[1])))


def basi_gsap(righe: list[str]) -> list[str]:
    """Il primo fromTo di ogni elemento resta con immediateRender (fa da base prima del suo inizio);
    tutti i successivi sullo stesso elemento ricevono `immediateRender: false` scritto per esteso,
    come chiede il lint di HyperFrames (gsap_repeated_fromto_without_baseline)."""
    visti: set[str] = set()
    uscita = []
    for r in righe:
        if r.startswith("tl.fromTo("):
            bersaglio = r[len("tl.fromTo("): r.index(", {")]
            nomi = re.findall(r'"([^"]+)"', bersaglio)
            gia = any(n in visti for n in nomi)
            visti.update(nomi)
            r = r.replace("...F, ", "immediateRender: false, " if gia else "")
        uscita.append(r)
    return uscita


def impagina_nome(nome: str, mis: Misura) -> dict:
    uno = mis.adatta(nome, 96)
    if uno >= 80:
        return {"righe": [nome], "size": uno}
    a, b = spezza_nome(nome, mis)
    due = int(min(84, math.floor(L * 0.96 / max(mis.em(a), mis.em(b)))))
    if due < 56:
        raise ValueError(f"nome troppo lungo anche su due righe: {nome}")
    return {"righe": [a, b], "size": due}


def copia_risorse() -> list[dict]:
    copie = []
    (WS / "assets" / "fonts").mkdir(parents=True, exist_ok=True)
    (WS / "assets" / "vendor").mkdir(parents=True, exist_ok=True)
    for nome in ("Source_Serif_4.ttf", "JetBrains_Mono.ttf", "OFL-SourceSerif4.txt", "OFL-JetBrainsMono.txt"):
        shutil.copy2(FONTI / nome, WS / "assets" / "fonts" / nome)
        copie.append({"from": str(FONTI / nome), "to": f"hyperframes/assets/fonts/{nome}"})
    gsap = trova_gsap()
    shutil.copy2(gsap, WS / "assets" / "vendor" / "gsap.min.js")
    copie.append({"from": str(gsap), "to": "hyperframes/assets/vendor/gsap.min.js"})
    return copie


def genera() -> dict:
    dati = S.carica_dati()
    S.controlla_testi_fissi(dati)
    top = dati["top10"]
    serif = {w: Misura(FONTI / "Source_Serif_4.ttf", wght=w, opsz=60) for w in (500, 600, 700, 800)}
    mono = Misura(FONTI / "JetBrains_Mono.ttf", wght=500)
    logo = LOGO.read_text(encoding="utf-8").strip()
    if not (logo.startswith("<svg") and logo.endswith("</svg>")) or "<script" in logo:
        raise ValueError(f"logo inatteso: {LOGO}")
    controlli: list[str] = []

    def verifica(nome: str, larghezza: float, limite: float = L) -> None:
        ok = larghezza <= limite
        controlli.append(f"{'ok' if ok else 'TROPPO LARGO'} {nome}: {larghezza:.0f} px su {limite:.0f}")
        if not ok:
            raise ValueError(controlli[-1])

    # --- dimensioni decise qui, non nel browser ---
    s_top = serif[800].adatta(S.TITOLO_1, 300)
    s_free = serif[700].adatta(S.TITOLO_2, 124)
    s_who = serif[800].adatta(S.DOMANDA, 170, margine=0.92)
    s_url = serif[800].adatta(S.CHIUSURA_URL, 118)
    n1 = top[0]
    s_n1 = serif[700].adatta(n1["name"], 124)
    s_sub = 66
    verifica("TOP 10", serif[800].px(S.TITOLO_1, s_top))
    verifica("FREE AI MODELS", serif[700].px(S.TITOLO_2, s_free))
    verifica("WHO'S #1?", serif[800].px(S.DOMANDA, s_who))
    verifica("freellmarena.com", serif[800].px(S.CHIUSURA_URL, s_url))
    verifica("nome n. 1", serif[700].px(n1["name"], s_n1))
    verifica("punteggio n. 1", serif[800].px(str(n1["score"]), 310))
    verifica("fonte", mono.px("● " + S.FONTE, 32))
    verifica("marchio e mese", 64 + 18 + serif[700].px("FreeLLMArena", 44) + 40 + mono.px(S.MESE, 32, 0.12))
    verifica("prova n. 1", mono.px(S.prova_n1(dati), 34))
    verifica("etichetta n. 1", mono.px(n1["why_free"], 32) + 36)

    schede = []
    for k in range(9):
        m = top[9 - k]
        imp = impagina_nome(m["name"], serif[600])
        for i, riga in enumerate(imp["righe"]):
            verifica(f"nome n. {m['rank']} riga {i + 1}", serif[600].px(riga, imp["size"]))
        verifica(f"etichetta n. {m['rank']}", mono.px(m["why_free"], 32) + 36)
        verifica(f"posizione e laboratorio n. {m['rank']}", serif[700].px(f"#{m['rank']}", 112) + 28 + mono.px(m["lab"], 34))
        verifica(f"punteggio n. {m['rank']}", serif[700].px(str(m["score"]), 240))
        schede.append({"k": k, "m": m, "nome": imp})

    # valori distinti del tabellone, nell'ordine in cui compaiono (10 → 2)
    valori: list[int] = []
    indice: list[int] = []
    for sch in schede:
        v = sch["m"]["score"]
        if not valori or valori[-1] != v:
            valori.append(v)
        indice.append(len(valori) - 1)

    # --- HTML ---
    css = f"""
    @font-face {{ font-family: "Source Serif 4"; src: url("assets/fonts/Source_Serif_4.ttf") format("truetype"); font-weight: 200 900; font-style: normal; font-display: block; }}
    @font-face {{ font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrains_Mono.ttf") format("truetype"); font-weight: 100 800; font-style: normal; font-display: block; }}
    html, body {{ margin: 0; padding: 0; background: {C['fondo']}; }}
    #root {{ position: relative; width: {W}px; height: {H}px; overflow: hidden; color: {C['testo']}; font-family: "Source Serif 4", Georgia, serif; }}
    .clip {{ position: absolute; left: 0; top: 0; width: {W}px; height: {H}px; }}
    .mono {{ font-family: "JetBrains Mono", monospace; font-weight: 500; }}
    .abs {{ position: absolute; display: block; }}
    #bg {{ z-index: 0; }}
    #bg-fill {{ position: absolute; inset: 0; background-color: {C['fondo']}; background-image: linear-gradient(to bottom, {trasparente(C['fondoBasso'])} 50%, {C['fondoBasso']} 100%); }}
    #hud {{ z-index: 3; }}
    #intro, #countdown, #who, #top1, #outro {{ z-index: 2; }}
    #source {{ z-index: 5; }}
    #brand {{ z-index: 4; }}
    /* intro */
    #intro-l1 {{ left: {M}px; top: 360px; width: {L}px; font-weight: 800; font-size: {s_top}px; line-height: {round(s_top * 1.0)}px; letter-spacing: -0.01em; }}
    #intro-l2 {{ left: {M}px; top: {360 + round(s_top * 1.0) + 30}px; width: {L}px; font-weight: 700; font-size: {s_free}px; line-height: {round(s_free * 1.1)}px; }}
    #intro-rule {{ left: {M}px; top: {360 + round(s_top * 1.0) + 30 + round(s_free * 1.1) + 18}px; width: {L}px; height: 4px; background: {C['testo2']}; transform-origin: left center; transform: scaleX(0); }}
    #intro-month {{ left: {M}px; top: {360 + round(s_top * 1.0) + 30 + round(s_free * 1.1) + 54}px; font-size: 44px; line-height: 56px; letter-spacing: 0.2em; color: {C['testo2']}; }}
    /* HUD */
    #hud-inner {{ position: absolute; inset: 0; }}
    #hud-bar {{ left: {M}px; top: 150px; width: {L}px; height: 64px; display: flex; justify-content: flex-end; align-items: center; font-size: 32px; letter-spacing: 0.12em; color: {C['testo2']}; opacity: 0; }}
    #hud-rule {{ left: {M}px; top: 230px; width: {L}px; height: 2px; background: {C['testo2']}; opacity: 0.35; transform-origin: left center; transform: scaleX(0); }}
    .tick {{ position: absolute; top: 262px; width: {PASSO_TACCA - 12:.1f}px; height: 12px; border-radius: 6px; background-color: {C['taccaSpenta']}; opacity: 0; }}
    /* schede */
    .card {{ position: absolute; left: {M}px; top: 300px; width: {L}px; height: 800px; opacity: 0; }}
    .rank-row {{ position: absolute; left: 0; top: 0; width: {L}px; height: 130px; display: flex; align-items: baseline; gap: 28px; }}
    .rank {{ font-weight: 700; font-size: 112px; line-height: 130px; color: {C['testo2']}; }}
    .lab {{ font-size: 34px; line-height: 44px; color: {C['testo2']}; }}
    .name {{ position: absolute; left: 0; top: 150px; width: {L}px; height: 200px; font-weight: 600; color: {C['testo']}; }}
    .name-line {{ display: block; white-space: nowrap; }}
    .tag {{ position: absolute; left: 0; top: 745px; display: block; font-size: 32px; line-height: 44px; padding: 6px 18px; border-radius: 8px; background: {C['etichetta']}; color: {C['testo']}; white-space: nowrap; }}
    #tk {{ position: absolute; left: {M}px; top: 690px; width: {L}px; height: {TK}px; overflow: hidden; }}
    #tk-stack {{ position: absolute; left: 0; top: 0; width: {L}px; transform: translateY({TK}px); }}
    .tk-item {{ display: block; height: {TK}px; line-height: {TK}px; font-weight: 700; font-size: 240px; color: {C['punteggio']}; font-variant-numeric: tabular-nums; white-space: nowrap; }}
    #score-label {{ left: {M}px; top: 962px; font-size: 32px; line-height: 44px; letter-spacing: 0.14em; color: {C['testo2']}; opacity: 0; }}
    /* domanda */
    #who-text {{ left: {M}px; top: {665 - round(s_who * 0.6)}px; width: {L}px; text-align: center; font-weight: 800; font-size: {s_who}px; line-height: {round(s_who * 1.2)}px; opacity: 0; }}
    /* n. 1 */
    #t1-wrap {{ position: absolute; inset: 0; }}
    #t1-rank-row {{ left: {M}px; top: 240px; width: {L}px; height: 160px; display: flex; align-items: baseline; gap: 30px; opacity: 0; }}
    #t1-rank {{ font-weight: 800; font-size: 150px; line-height: 160px; color: {C['testo']}; }}
    #t1-lab {{ font-size: 34px; line-height: 44px; color: {C['testo2']}; }}
    #t1-name {{ left: {M}px; top: 420px; width: {L}px; font-weight: 700; font-size: {s_n1}px; line-height: {round(s_n1 * 1.1)}px; white-space: nowrap; opacity: 0; }}
    #t1-box {{ position: absolute; left: {M}px; top: 580px; width: {L}px; height: {TK1}px; overflow: hidden; }}
    #t1-num {{ position: absolute; left: 0; top: 0; width: {L}px; height: {TK1}px; line-height: {TK1}px; font-weight: 800; font-size: 310px; color: {C['punteggio']}; font-variant-numeric: tabular-nums; white-space: nowrap; transform: translateY({TK1}px); }}
    #t1-label {{ left: {M}px; top: 925px; font-size: 32px; line-height: 44px; letter-spacing: 0.14em; color: {C['testo2']}; opacity: 0; }}
    #t1-proof {{ left: {M}px; top: 985px; font-size: 34px; line-height: 44px; color: {C['testo']}; white-space: nowrap; opacity: 0; }}
    #t1-tag {{ left: {M}px; top: 1045px; font-size: 32px; line-height: 44px; padding: 6px 18px; border-radius: 8px; background: {C['etichetta']}; color: {C['testo']}; white-space: nowrap; opacity: 0; }}
    /* chiusura */
    #o-lead {{ left: {M}px; top: 430px; font-weight: 500; font-size: 64px; line-height: 76px; color: {C['testo2']}; opacity: 0; }}
    #o-url {{ left: {M}px; top: 520px; width: {L}px; font-weight: 800; font-size: {s_url}px; line-height: {round(s_url * 1.2)}px; white-space: nowrap; opacity: 0; }}
    #o-rule {{ left: {M}px; top: 680px; width: {L}px; height: 2px; background: {C['testo2']}; opacity: 0.35; transform-origin: left center; transform: scaleX(0); }}
    #o-sub {{ left: {M}px; top: 720px; width: {L}px; font-weight: 600; font-size: {s_sub}px; line-height: {round(s_sub * 1.16)}px; opacity: 0; }}
    /* fonte */
    #source-line {{ left: {M}px; top: 1124px; width: {L}px; font-size: 32px; line-height: 44px; color: {C['testo2']}; white-space: nowrap; }}
    #source-dot {{ color: {C['testo2']}; }}
    /* marchio */
    #brand-row {{ left: {M}px; top: 150px; height: 64px; display: flex; align-items: center; gap: 18px; }}
    #brand-row svg {{ width: 64px; height: 64px; display: block; }}
    #brand-name {{ font-weight: 700; font-size: 44px; line-height: 64px; color: {C['testo']}; white-space: nowrap; }}
    #brand-arena {{ color: {C['marchio']}; }}
    #o-logo {{ left: {M}px; top: 250px; width: 150px; height: 150px; opacity: 0; }}
    #o-logo svg {{ width: 150px; height: 150px; display: block; }}
    """

    ticks = "".join(
        f'<div class="tick" id="tick-{i}" style="left: {M + i * PASSO_TACCA:.1f}px"></div>' for i in range(10)
    )
    carte = []
    for sch in schede:
        m, imp = sch["m"], sch["nome"]
        righe = "".join(f'<span class="name-line">{esc(r)}</span>' for r in imp["righe"])
        lh = round(imp["size"] * 1.04)
        carte.append(
            f'<div class="card" id="card-{m["rank"]}">'
            f'<div class="rank-row"><span class="rank">#{m["rank"]}</span><span class="lab mono">{esc(m["lab"])}</span></div>'
            f'<div class="name" style="font-size: {imp["size"]}px; line-height: {lh}px">{righe}</div>'
            f'<div class="tag mono">{esc(m["why_free"])}</div>'
            f'</div>'
        )
    pila = "".join(f'<span class="tk-item">{v}</span>' for v in valori)

    corpo = f"""
  <div id="root" data-composition-id="top10" data-width="{W}" data-height="{H}" data-duration="{f3(S.DURATA)}">
    <div id="bg" class="clip" data-start="0" data-duration="{f3(S.DURATA)}" data-track-index="0"><div id="bg-fill"></div></div>
    <div id="hud" class="clip" data-start="{f3(S.HUD[0])}" data-duration="{f3(S.HUD[1] - S.HUD[0])}" data-track-index="1">
      <div id="hud-inner">
        <div id="hud-bar" class="abs mono"><span>{esc(S.MESE)}</span></div>
        <div id="hud-rule" class="abs"></div>
        {ticks}
      </div>
    </div>
    <div id="intro" class="clip" data-start="{f3(S.INTRO[0])}" data-duration="{f3(S.INTRO[1] - S.INTRO[0])}" data-track-index="2">
      <div id="intro-l1" class="abs">{esc(S.TITOLO_1)}</div>
      <div id="intro-l2" class="abs">{esc(S.TITOLO_2)}</div>
      <div id="intro-rule" class="abs"></div>
      <div id="intro-month" class="abs mono">{esc(S.MESE)}</div>
    </div>
    <div id="countdown" class="clip" data-start="{f3(S.COUNTDOWN[0])}" data-duration="{f3(S.COUNTDOWN[1] - S.COUNTDOWN[0])}" data-track-index="2">
      {''.join(carte)}
      <div id="tk" data-layout-allow-overflow="true"><div id="tk-stack">{pila}</div></div>
      <div id="score-label" class="abs mono">{esc(S.ETICHETTA_PUNTEGGIO)}</div>
    </div>
    <div id="who" class="clip" data-start="{f3(S.WHO[0])}" data-duration="{f3(S.WHO[1] - S.WHO[0])}" data-track-index="2">
      <div id="who-text" class="abs">{esc(S.DOMANDA)}</div>
    </div>
    <div id="top1" class="clip" data-start="{f3(S.TOP1[0])}" data-duration="{f3(S.TOP1[1] - S.TOP1[0])}" data-track-index="2">
      <div id="t1-wrap">
        <div id="t1-rank-row" class="abs"><span id="t1-rank">#1</span><span id="t1-lab" class="mono">{esc(n1["lab"])}</span></div>
        <div id="t1-name" class="abs">{esc(n1["name"])}</div>
        <div id="t1-box" data-layout-allow-overflow="true"><div id="t1-num">{n1["score"]}</div></div>
        <div id="t1-label" class="abs mono">{esc(S.ETICHETTA_PUNTEGGIO)}</div>
        <div id="t1-proof" class="abs mono">{esc(S.prova_n1(dati))}</div>
        <div id="t1-tag" class="abs mono">{esc(n1["why_free"])}</div>
      </div>
    </div>
    <div id="outro" class="clip" data-start="{f3(S.OUTRO[0])}" data-duration="{f3(S.OUTRO[1] - S.OUTRO[0])}" data-track-index="2">
      <div id="o-logo" class="abs">{logo}</div>
      <div id="o-lead" class="abs">{esc(S.CHIUSURA_1)}</div>
      <div id="o-url" class="abs">{esc(S.CHIUSURA_URL)}</div>
      <div id="o-rule" class="abs"></div>
      <div id="o-sub" class="abs">{esc(S.ISCRIVITI)}</div>
    </div>
    <div id="brand" class="clip" data-start="0" data-duration="{f3(S.TOP1[1])}" data-track-index="4">
      <div id="brand-row" class="abs">{logo}<div id="brand-name">FreeLLM<span id="brand-arena">Arena</span></div></div>
    </div>
    <div id="source" class="clip" data-start="0" data-duration="{f3(S.DURATA)}" data-track-index="3">
      <div id="source-line" class="abs mono"><span id="source-dot">●</span> {esc(S.FONTE)}</div>
    </div>
  </div>"""

    # --- timeline: una sola, in pausa, costruita subito ---
    js = [
        "window.__timelines = window.__timelines || {};",
        "const tl = gsap.timeline({ paused: true });",
        "// intro: tutto già leggibile al fotogramma 0",
        'tl.fromTo("#intro-rule", { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power3.out" }, 0.1);',
        'tl.fromTo(["#intro-l1", "#intro-l2", "#intro-rule", "#intro-month"], { opacity: 1, y: 0 }, { ...F, opacity: 0, y: -50, duration: 0.16, ease: "power2.in", stagger: 0.012 }, 0.8);',
        "// HUD",
        f'tl.fromTo("#hud-bar", {{ opacity: 0, y: -16 }}, {{ ...F, opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }}, {f3(S.HUD[0])});',
        f'tl.fromTo("#hud-rule", {{ scaleX: 0 }}, {{ ...F, scaleX: 1, duration: 0.4, ease: "power3.out" }}, {f3(S.HUD[0] + 0.05)});',
        f'tl.fromTo(".tick", {{ opacity: 0 }}, {{ ...F, opacity: 1, duration: 0.2, ease: "power3.out", stagger: 0.015 }}, {f3(S.HUD[0] + 0.1)});',
        f'tl.fromTo("#hud-inner", {{ opacity: 1 }}, {{ ...F, opacity: 0, duration: 0.16, ease: "power2.in" }}, {f3(S.HUD[1] - 0.16)});',
        "// conto alla rovescia",
        f'tl.fromTo("#score-label", {{ opacity: 0, y: 20 }}, {{ ...F, opacity: 1, y: 0, duration: 0.28, ease: "expo.out" }}, {f3(S.COUNTDOWN[0])});',
    ]
    y_prima = TK
    for sch in schede:
        k, m = sch["k"], sch["m"]
        a, b = S.slot(k)
        js.append(f'tl.fromTo("#card-{m["rank"]}", {{ opacity: 0, y: 36 }}, {{ ...F, opacity: 1, y: 0, duration: 0.28, ease: "expo.out" }}, {f3(a)});')
        js.append(f'tl.fromTo("#card-{m["rank"]}", {{ opacity: 1, y: 0 }}, {{ ...F, opacity: 0, y: -24, duration: 0.16, ease: "power2.in" }}, {f3(b - 0.16)});')
        y_dopo = -TK * indice[k]
        if y_dopo != y_prima:
            js.append(f'tl.fromTo("#tk-stack", {{ y: {y_prima} }}, {{ ...F, y: {y_dopo}, duration: 0.3, ease: "expo.out" }}, {f3(a)});')
            y_prima = y_dopo
        js.append(f'tl.fromTo("#tick-{k}", {{ backgroundColor: "{C["taccaSpenta"]}" }}, {{ ...F, backgroundColor: "{C["taccaAttiva"]}", duration: 0.2, ease: "power3.out" }}, {f3(a)});')
        if k > 0:
            js.append(f'tl.fromTo("#tick-{k - 1}", {{ backgroundColor: "{C["taccaAttiva"]}" }}, {{ ...F, backgroundColor: "{C["taccaPassata"]}", duration: 0.2, ease: "power3.out" }}, {f3(a)});')
    js += [
        f'tl.fromTo(["#score-label", "#tk"], {{ opacity: 1 }}, {{ ...F, opacity: 0, duration: 0.16, ease: "power2.in" }}, {f3(S.COUNTDOWN[1] - 0.16)});',
        "// pausa",
        f'tl.fromTo("#who-text", {{ opacity: 0, scale: 0.9 }}, {{ ...F, opacity: 1, scale: 1, duration: 0.18, ease: "circ.out" }}, {f3(S.WHO[0])});',
        f'tl.fromTo("#who-text", {{ opacity: 1 }}, {{ ...F, opacity: 0, duration: 0.08, ease: "power2.in" }}, {f3(S.WHO[1] - 0.08)});',
        "// n. 1",
        f'tl.fromTo("#t1-rank-row", {{ opacity: 0, y: 30 }}, {{ ...F, opacity: 1, y: 0, duration: 0.3, ease: "expo.out" }}, {f3(S.TOP1[0])});',
        f'tl.fromTo("#t1-name", {{ opacity: 0, y: 30 }}, {{ ...F, opacity: 1, y: 0, duration: 0.3, ease: "expo.out" }}, {f3(S.TOP1[0] + 0.06)});',
        f'tl.fromTo("#t1-num", {{ y: {TK1} }}, {{ ...F, y: 0, duration: 0.45, ease: "expo.out" }}, {f3(S.TOP1[0] + 0.12)});',
        f'tl.fromTo("#t1-label", {{ opacity: 0, y: 20 }}, {{ ...F, opacity: 1, y: 0, duration: 0.3, ease: "expo.out" }}, {f3(S.TOP1[0] + 0.45)});',
        f'tl.fromTo("#t1-proof", {{ opacity: 0, y: 20 }}, {{ ...F, opacity: 1, y: 0, duration: 0.3, ease: "expo.out" }}, {f3(S.TOP1[0] + 0.53)});',
        f'tl.fromTo("#t1-tag", {{ opacity: 0, y: 20 }}, {{ ...F, opacity: 1, y: 0, duration: 0.3, ease: "expo.out" }}, {f3(S.TOP1[0] + 0.61)});',
        f'tl.fromTo("#t1-wrap", {{ opacity: 1 }}, {{ ...F, opacity: 0, duration: 0.16, ease: "power2.in" }}, {f3(S.TOP1[1] - 0.16)});',
        f'tl.fromTo("#brand-row", {{ opacity: 1 }}, {{ ...F, opacity: 0, duration: 0.16, ease: "power2.in" }}, {f3(S.TOP1[1] - 0.16)});',
        "// chiusura: entra e poi sta ferma fino all'ultimo fotogramma",
        f'tl.fromTo("#o-logo", {{ opacity: 0, y: 40 }}, {{ ...F, opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }}, {f3(S.OUTRO[0])});',
        f'tl.fromTo("#o-lead", {{ opacity: 0, y: 40 }}, {{ ...F, opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }}, {f3(S.OUTRO[0])});',
        f'tl.fromTo("#o-url", {{ opacity: 0, y: 40 }}, {{ ...F, opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }}, {f3(S.OUTRO[0] + 0.08)});',
        f'tl.fromTo("#o-rule", {{ scaleX: 0 }}, {{ ...F, scaleX: 1, duration: 0.4, ease: "power3.out" }}, {f3(S.OUTRO[0] + 0.2)});',
        f'tl.fromTo("#o-sub", {{ opacity: 0, y: 40 }}, {{ ...F, opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }}, {f3(S.OUTRO[0] + 0.25)});',
        'window.__timelines["top10"] = tl;',
    ]

    js = basi_gsap(js)

    pagina = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width={W}, height={H}" />
  <title>{esc(S.TITOLO_YOUTUBE)}</title>
  <!-- Composizione generata da scripts/genera_composizione.py: non modificare a mano, rigenerare. -->
  <script src="assets/vendor/gsap.min.js"></script>
  <style>{css}
  </style>
</head>
<body>{corpo}
  <script>
    {chr(10).join('    ' + r if i else r for i, r in enumerate(js))}
  </script>
</body>
</html>
"""
    copie = copia_risorse()
    (WS / "index.html").write_text(pagina, encoding="utf-8")
    riepilogo = {
        "workspace": str(WS),
        "entry": str(WS / "index.html"),
        "composition_id": "top10",
        "duration_seconds": S.DURATA,
        "sizes": {"top": s_top, "free": s_free, "who": s_who, "url": s_url, "n1_name": s_n1,
                  "names": {sch["m"]["name"]: sch["nome"] for sch in schede}},
        "ticker_values": valori,
        "ticker_index_per_card": indice,
        "width_checks": controlli,
        "copies": copie,
        "logo": str(LOGO),
        "data_sha256": dati["source_sha256"],
    }
    (S.PROGETTO / "composition_build.json").write_text(json.dumps(riepilogo, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return riepilogo


if __name__ == "__main__":
    r = genera()
    print("scritto", r["entry"])
    print("dimensioni:", json.dumps({k: v for k, v in r["sizes"].items() if k != "names"}))
    for nome, imp in r["sizes"]["names"].items():
        print(f"  {nome}: {imp['size']} px, {len(imp['righe'])} riga/e -> {imp['righe']}")
    print("tabellone:", r["ticker_values"], r["ticker_index_per_card"])
    for c in r["width_checks"]:
        print("  ", c)
