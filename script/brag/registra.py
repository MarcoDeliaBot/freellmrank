# Registra le scene di genera.mjs (in video/brag/) in MP4 verticali 1080x1920 a 30 fotogrammi, con musica fatta qui (numpy).
# Uso: python registra.py foto <tipo> t1 t2 ...   → solo fotogrammi di controllo in brag-output-<tipo>/work/
#      python registra.py video <tipo>              → brag-output-<tipo>/brag.mp4, brag.jpg, share-copy.txt
import os, sys, wave, subprocess, shutil
import numpy as np
from playwright.sync_api import sync_playwright
import imageio_ffmpeg

import json
QUI = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'video', 'brag')
FPS, DURATA, SR = 30, 20.0, 44100
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

def pagina(p, tipo):
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1080, 'height': 1920}, color_scheme='dark')
    pg.goto('file:///' + os.path.join(QUI, f'scena-{tipo}.html').replace('\\', '/'))
    pg.evaluate('document.fonts.ready')
    return b, pg

def foto(tipo, tempi):
    out = os.path.join(QUI, f'brag-output-{tipo}', 'work'); os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        b, pg = pagina(p, tipo)
        for t in tempi:
            pg.evaluate(f'render({t})'); pg.screenshot(path=os.path.join(out, f'foto-{t}.png'))
        b.close()

# ---------- musica: 112 bpm, la minore, Am F C G; effetti nella stessa tonalità, sotto la musica ----------
def nota(f, dur, forma='sin', att=0.01, rel=0.2):
    n = int(SR * dur); t = np.arange(n) / SR
    if forma == 'sin': w = np.sin(2 * np.pi * f * t)
    elif forma == 'saw': w = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 7)) * 0.6
    else: w = np.sign(np.sin(2 * np.pi * f * t)) * 0.4
    env = np.minimum(1, t / att) * np.exp(-t / rel) if rel else np.minimum(1, t / att)
    return w * env

def metti(traccia, suono, sec, vol):
    i = int(sec * SR); j = min(len(traccia), i + len(suono))
    if i < len(traccia): traccia[i:j] += suono[:j - i] * vol

def hz(m): return 440 * 2 ** ((m - 69) / 12)

def musica(cambi):
    n = int(SR * DURATA); mix = np.zeros(n)
    batt = 60 / 112
    accordi = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G
    for b in range(int(DURATA / batt) + 1):
        s = b * batt
        if s >= DURATA - 0.4: break
        acc = accordi[(b // 4) % 4]
        # cassa morbida su ogni battito, dalla seconda battuta
        if b >= 2:
            k = int(0.25 * SR); t = np.arange(k) / SR
            metti(mix, np.sin(2 * np.pi * (52 + 70 * np.exp(-t * 30)) * t) * np.exp(-t * 9), s, 0.55)
        # charleston sui controtempi, piano
        if b >= 4:
            r = np.random.default_rng(b).standard_normal(int(0.05 * SR)) * np.exp(-np.arange(int(0.05 * SR)) / SR * 80)
            metti(mix, np.diff(r, prepend=0), s + batt / 2, 0.05)
        # basso: la fondamentale, due ottave sotto
        metti(mix, nota(hz(acc[0] - 24), batt * 0.9, 'saw', 0.01, 0.35), s, 0.16)
        # arpeggio che sale
        for k, m in enumerate(acc + [acc[0] + 12]):
            metti(mix, nota(hz(m + 12), batt / 4, 'sin', 0.005, 0.12), s + k * batt / 4, 0.07)
        # tappeto: l'accordo a inizio battuta
        if b % 4 == 0:
            for m in acc: metti(mix, nota(hz(m), batt * 4, 'sin', 0.4, 2.5), s, 0.05)
    # cambi di scena: un soffio filtrato e una nota in la, sotto la musica
    for c in cambi:
        k = int(0.5 * SR); t = np.arange(k) / SR
        soffio = np.convolve(np.random.default_rng(int(c * 10)).standard_normal(k), np.ones(40) / 40, 'same') * np.sin(np.pi * t / 0.5)
        metti(mix, soffio, c - 0.3, 0.12)
        metti(mix, nota(hz(81), 0.6, 'sin', 0.005, 0.25), c, 0.06)
    # finale: accordo di la lungo e sfumatura
    for m in [57, 64, 69, 72]: metti(mix, nota(hz(m), 2.5, 'sin', 0.02, 1.2), DURATA - 2.6, 0.06)
    fade = np.ones(n); fade[-int(1.2 * SR):] = np.linspace(1, 0, int(1.2 * SR)); fade[:int(0.05 * SR)] = np.linspace(0, 1, int(0.05 * SR))
    mix = np.tanh(mix * 1.4) * fade
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.7
    return mix

def video(tipo, cambi):
    copia = json.load(open(os.path.join(QUI, f'info-{tipo}.json'), encoding='utf-8'))['condividi']
    base = os.path.join(QUI, f'brag-output-{tipo}'); work = os.path.join(base, 'work', 'fotogrammi')
    shutil.rmtree(work, ignore_errors=True); os.makedirs(work)
    with sync_playwright() as p:
        b, pg = pagina(p, tipo)
        for i in range(int(DURATA * FPS)):
            pg.evaluate(f'render({i / FPS})'); pg.screenshot(path=os.path.join(work, f'{i:04d}.png'))
        b.close()
    # copertina: il fotogramma più forte, a testo fermo, anche come fotogramma 0
    poster = {'settimana': 12.6, 'nuovo': 10.8}[tipo]
    shutil.copy(os.path.join(work, f'{int(poster * FPS):04d}.png'), os.path.join(work, '0000.png'))
    subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', os.path.join(work, f'{int(poster * FPS):04d}.png'), '-q:v', '3', os.path.join(base, 'brag.jpg')], check=True)
    audio = (musica(cambi) * 32767).astype(np.int16)
    wav = os.path.join(base, 'work', 'musica.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(audio.tobytes())
    subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(work, '%04d.png'), '-i', wav,
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart',
                    os.path.join(base, 'brag.mp4')], check=True)
    open(os.path.join(base, 'share-copy.txt'), 'w', encoding='utf-8').write(copia + '\n')
    print(os.path.join(base, 'brag.mp4'))

CAMBI = {'settimana': [3.6, 7.0, 13.4, 16.8], 'nuovo': [3.4, 6.6, 12.2, 16.2]}

if __name__ == '__main__':
    modo, tipo = sys.argv[1], sys.argv[2]
    if modo == 'foto': foto(tipo, [float(x) for x in sys.argv[3:]])
    else: video(tipo, CAMBI[tipo])
