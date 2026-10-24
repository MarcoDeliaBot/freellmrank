# Musica di sottofondo dei video a stampi (24/10/2026 sera: Marco ha chiesto di rimetterla; scelta: generata qui dal codice,
# nostra al 100%, gratis, senza diritti né reclami, e uguale a ogni corsa). Rispetto a quella di script/brag/registra.py:
# tappeto di accordi morbidi (tre voci leggermente scordate e filtrate), basso, arpeggio a campanella, ritmo leggero,
# un po' di spazio (eco) e un soffio prima di ogni cambio di scena. Si abbassa sotto la voce e risale nelle pause.
# Due caratteri: «calma» (notizie: lenta, senza cassa) e «vivace» (Short, modelli, classifica: più ritmo).
# Uso: python musica.py <richiesta.json> <uscita.wav>
#   richiesta: { "durata": s, "stile": "calma"|"vivace", "livello": "basso"|"presente",
#                "voce": [[inizio, fine], ...], "scene": [inizi delle scene] }
import json, sys, wave
import numpy as np

SR = 44100

def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)

def inviluppo(n, attacco, rilascio):
    e = np.ones(n)
    a = min(n, int(attacco * SR)); r = min(n - a, int(rilascio * SR))
    if a: e[:a] = np.linspace(0, 1, a)
    if r: e[-r:] = np.linspace(1, 0, r) ** 2
    return e

def passa_basso(x, taglio):
    # filtro a un polo (toglie l'asprezza delle onde a dente di sega), come convoluzione con la sua risposta all'impulso:
    # un ciclo in Python campione per campione era troppo lento (minuti per un video)
    a = np.exp(-2 * np.pi * taglio / SR)
    k = max(8, int(np.ceil(np.log(1e-4) / np.log(a))))
    h = (1 - a) * a ** np.arange(k)
    return np.convolve(x, h)[:len(x)]

def metti(mix, suono, da, gain):
    i = int(da * SR)
    if i >= len(mix) or i < 0: return
    k = min(len(suono), len(mix) - i)
    mix[i:i + k] += suono[:k] * gain

def tappeto(note, durata):
    n = int(durata * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in note:
        for d in (-0.07, 0.0, 0.07):  # tre voci scordate di pochi centesimi: suono largo
            f = hz(m) * 2 ** (d / 12)
            x += 2 * ((t * f) % 1) - 1
    x = passa_basso(x / (3 * len(note)), 900)
    return x * inviluppo(n, 0.9, 1.6)

def campanella(m, durata=0.9):
    n = int(durata * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * hz(m) * t) + 0.25 * np.sin(2 * np.pi * hz(m) * 2 * t) * np.exp(-t * 6)
    return x * np.exp(-t * 4.5) * inviluppo(n, 0.004, 0.05)

def basso(m, durata):
    n = int(durata * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * hz(m) * t) * inviluppo(n, 0.02, 0.25)

def cassa():
    n = int(0.3 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (48 + 60 * np.exp(-t * 28)) * t) * np.exp(-t * 10)

def fruscio(seme, durata=0.06):
    n = int(durata * SR)
    r = np.random.default_rng(seme).standard_normal(n)
    return np.diff(r, prepend=0) * np.exp(-np.arange(n) / SR * 70)

def soffio(seme, durata=0.8):
    n = int(durata * SR); t = np.arange(n) / SR
    r = np.random.default_rng(seme).standard_normal(n)
    return passa_basso(r, 600) * np.sin(np.pi * t / durata) ** 2

def eco(x, ritardo=0.31, ritorno=0.32, volte=4):
    y = x.copy(); k = int(ritardo * SR)
    for v in range(1, volte + 1):
        if k * v >= len(x): break
        y[k * v:] += x[:-k * v] * (ritorno ** v)
    return y

def musica(r):
    durata = float(r['durata']); vivace = r.get('stile') == 'vivace'
    n = int(durata * SR); mix = np.zeros(n)
    bpm = 104 if vivace else 80
    batt = 60 / bpm
    # vivace: Do Sol Lam Fa (I V vi IV); calma: Lam Fa Do Sol (vi IV I V)
    accordi = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]] if vivace else [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    battute = int(durata / (4 * batt)) + 1
    for b in range(battute):
        s = b * 4 * batt
        if s >= durata - 1.0: break
        acc = accordi[b % 4]
        metti(mix, tappeto(acc, 4 * batt + 1.2), s, 0.30)
        for q in range(4):
            tq = s + q * batt
            metti(mix, basso(acc[0] - 24, batt * 0.95), tq, 0.22 if q in (0, 2) else 0.12)
            # arpeggio: crome se vivace, semiminime se calma; entra dalla seconda battuta
            if b >= 1:
                passi = (0, 0.5) if vivace else (0,)
                for k, p in enumerate(passi):
                    m = (acc + [acc[0] + 12])[(q * len(passi) + k) % 4] + 12
                    metti(mix, campanella(m), tq + p * batt, 0.07 if vivace else 0.06)
            if vivace and b >= 1:
                metti(mix, cassa(), tq, 0.30 if q in (0, 2) else 0.16)
                metti(mix, fruscio(b * 8 + q), tq + batt / 2, 0.035)
            elif b >= 2 and q in (1, 3):
                metti(mix, fruscio(b * 8 + q), tq, 0.02)
    # un soffio leggero prima di ogni cambio di scena
    for i, c in enumerate(r.get('scene', [])[1:]):
        metti(mix, soffio(1000 + i), c - 0.55, 0.10)
    # finale: l'accordo di arrivo, lungo
    fin = accordi[0] if vivace else [57, 64, 69, 72]
    metti(mix, tappeto(fin, 3.0), max(0, durata - 3.2), 0.30)
    mix = eco(mix)
    mix = np.tanh(mix * 1.3)
    mix /= (np.max(np.abs(mix)) + 1e-9)
    # volume: più alta nelle pause, molto più bassa sotto la voce; transizioni morbide
    presente = r.get('livello') == 'presente'
    # misurato il 24/10: con 0.16 la musica degli Short stava solo 3 dB sotto la voce. Ora circa 12 dB sotto negli Short
    # e circa 18 dB sotto nei video lunghi (sotto la voce); nelle pause risale
    sotto, pausa = (0.06, 0.30) if presente else (0.022, 0.16)
    liv = np.full(n, pausa)
    for (a, z) in r.get('voce', []):
        liv[max(0, int((a - 0.15) * SR)):min(n, int((z + 0.1) * SR))] = sotto
    # media mobile di 0,35 s con le somme cumulate (np.convolve su tutto il video impiegava minuti)
    k = int(0.35 * SR)
    c = np.concatenate([[0.0], np.cumsum(np.pad(liv, (k // 2, k - k // 2), mode='edge'))])
    liv = (c[k:k + n] - c[:n]) / k
    fade = np.ones(n)
    fade[:int(0.6 * SR)] = np.linspace(0, 1, int(0.6 * SR))
    fade[-int(1.8 * SR):] = np.linspace(1, 0, int(1.8 * SR)) ** 1.5
    return mix * liv * fade

if __name__ == '__main__':
    richiesta = json.load(open(sys.argv[1], encoding='utf-8'))
    x = musica(richiesta)
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print(f'musica {richiesta.get("stile")} {richiesta.get("livello")} {len(x) / SR:.1f} s')
