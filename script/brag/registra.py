# Registra le scene di genera.mjs (in video/brag/) in MP4 verticali 1080x1920 a 30 fotogrammi.
# Dal 21/10/2026: voce fuori campo con Piper (gratis, gira qui, nessun servizio esterno), tempi delle scene presi dalla voce,
# sottotitoli parola per parola, musica fatta qui (numpy) che si abbassa quando parla la voce.
# Uso: python registra.py foto <video> t1 t2 ...   → solo fotogrammi di controllo in brag-output-<video>/work/
#      python registra.py video <video>              → brag-output-<video>/brag.mp4, brag.jpg, share-copy.txt
#      (<video> = nuovo | settimana | gpu, con -it per l'italiano: nuovo-it, …)
import os, sys, wave, subprocess, shutil, json, re, urllib.request
import numpy as np
from playwright.sync_api import sync_playwright
import imageio_ffmpeg

QUI = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'video', 'brag')
VOCI_DIR = os.environ.get('VOCI_DIR', os.path.join(QUI, '..', 'voci'))
FPS, SR = 30, 44100
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
# voci Piper (licenza dei modelli nella scheda di rhasspy/piper-voices); una per lingua
VOCI = {'en': 'en/en_US/lessac/high/en_US-lessac-high', 'it': 'it/it_IT/paola/medium/it_IT-paola-medium'}

def pagina(p, nome):
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1080, 'height': 1920}, color_scheme='dark')
    pg.goto('file:///' + os.path.join(QUI, f'scena-{nome}.html').replace('\\', '/'))
    pg.evaluate('document.fonts.ready')
    return b, pg

def foto(nome, tempi):
    out = os.path.join(QUI, f'brag-output-{nome}', 'work'); os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        b, pg = pagina(p, nome)
        for t in tempi:
            pg.evaluate(f'render({t})'); pg.screenshot(path=os.path.join(out, f'foto-{t}.png'))
        b.close()

# ---------- voce ----------
def modello_voce(lingua):
    os.makedirs(VOCI_DIR, exist_ok=True)
    rel = VOCI[lingua]; base = os.path.join(VOCI_DIR, os.path.basename(rel))
    for est in ('.onnx', '.onnx.json'):
        if not os.path.exists(base + est):
            urllib.request.urlretrieve(f'https://huggingface.co/rhasspy/piper-voices/resolve/main/{rel}{est}', base + est)
    return base + '.onnx'

def parla(voce, testo):
    """Audio della frase a 44,1 kHz, senza il silenzio all'inizio e alla fine."""
    from piper import SynthesisConfig
    pezzi = [c.audio_float_array for c in voce.synthesize(testo, SynthesisConfig(length_scale=0.95))]
    a = np.concatenate(pezzi).astype(np.float64)
    sr = voce.config.sample_rate
    soglia = 0.02 * np.max(np.abs(a))
    dove = np.where(np.abs(a) > soglia)[0]
    a = a[max(0, dove[0] - int(0.03 * sr)): dove[-1] + int(0.08 * sr)]
    x = np.arange(int(len(a) * SR / sr)) / SR
    return np.interp(x, np.arange(len(a)) / sr, a)

def sottotitoli(testo, inizio, durata):
    """Pezzi da 4 parole al massimo (si spezza dopo la punteggiatura); ogni parola ha il suo istante, in proporzione alla lunghezza."""
    parole = testo.split()
    pesi = [len(re.sub(r'[^\w]', '', w)) + 1.5 for w in parole]
    tot = sum(pesi); quando = []; acc = 0
    for p in pesi: quando.append(inizio + durata * acc / tot); acc += p
    pezzi, cur = [], []
    for i, w in enumerate(parole):
        cur.append(i)
        if len(cur) == 4 or re.search(r'[.,:;?!]$', w) and len(cur) >= 2 or i == len(parole) - 1:
            pezzi.append(cur); cur = []
    out = []
    for k, idx in enumerate(pezzi):
        da = quando[idx[0]]; a = quando[pezzi[k + 1][0]] if k + 1 < len(pezzi) else inizio + durata + 0.35
        out.append({'da': round(da, 3), 'a': round(a, 3), 'parole': [[parole[i], round(quando[i], 3)] for i in idx]})
    return out

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
    if 0 <= i < len(traccia): traccia[i:j] += suono[:j - i] * vol

def hz(m): return 440 * 2 ** ((m - 69) / 12)

def musica(cambi, durata):
    n = int(SR * durata); mix = np.zeros(n)
    batt = 60 / 112
    accordi = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G
    for b in range(int(durata / batt) + 1):
        s = b * batt
        if s >= durata - 0.4: break
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
    for m in [57, 64, 69, 72]: metti(mix, nota(hz(m), 2.5, 'sin', 0.02, 1.2), durata - 2.6, 0.06)
    fade = np.ones(n); fade[-int(1.2 * SR):] = np.linspace(1, 0, int(1.2 * SR)); fade[:int(0.05 * SR)] = np.linspace(0, 1, int(0.05 * SR))
    mix = np.tanh(mix * 1.4) * fade
    return mix / (np.max(np.abs(mix)) + 1e-9)

def video(nome):
    from piper import PiperVoice
    info = json.load(open(os.path.join(QUI, f'info-{nome}.json'), encoding='utf-8'))
    voce = PiperVoice.load(modello_voce(info.get('lingua', 'en')))
    # tempi: ogni scena dura quanto la sua frase più una pausa, mai meno della durata minima delle animazioni
    frasi, inizi, durate, sotto = [], [], [], []
    t = 0.0
    for s in info['scene']:
        a = parla(voce, s['voce']); lv = len(a) / SR
        d = max(s['min'], lv + 0.9)
        frasi.append((t + 0.3, a)); inizi.append(t); durate.append(d)
        sotto += sottotitoli(s['voce'], t + 0.3, lv)
        t += d
    durata = round(t, 2)
    base = os.path.join(QUI, f'brag-output-{nome}'); work = os.path.join(base, 'work', 'fotogrammi')
    shutil.rmtree(work, ignore_errors=True); os.makedirs(work)
    with sync_playwright() as p:
        b, pg = pagina(p, nome)
        pg.evaluate('([inizi, durate, sotto, tot]) => { document.querySelectorAll(".scena").forEach((s, i) => { s.dataset.da = inizi[i]; s.dataset.a = inizi[i] + durate[i]; }); window.SOTTO = sotto; DURATA = tot; }', [inizi, durate, sotto, durata])
        for i in range(int(durata * FPS)):
            pg.evaluate(f'render({i / FPS})'); pg.screenshot(path=os.path.join(work, f'{i:04d}.png'))
        b.close()
    # copertina: la terza scena (grafico o schede), a testo fermo e senza sottotitolo, anche come fotogramma 0
    k = min(2, len(inizi) - 1); poster = inizi[k] + min(durate[k] - 0.4, 3.6)
    with sync_playwright() as p:
        b, pg = pagina(p, nome)
        pg.evaluate('([inizi, durate, tot]) => { document.querySelectorAll(".scena").forEach((s, i) => { s.dataset.da = inizi[i]; s.dataset.a = inizi[i] + durate[i]; }); DURATA = tot; }', [inizi, durate, durata])
        pg.evaluate(f'render({poster})'); pg.screenshot(path=os.path.join(work, 'copertina.png')); b.close()
    shutil.copy(os.path.join(work, 'copertina.png'), os.path.join(work, '0000.png'))
    subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', os.path.join(work, 'copertina.png'), '-q:v', '3', os.path.join(base, 'brag.jpg')], check=True)
    # audio: voce davanti, musica sotto; quando la voce parla la musica scende (con salite e discese morbide)
    n = int(SR * durata)
    traccia_voce = np.zeros(n)
    attiva = np.zeros(n)
    for (da, a) in frasi:
        metti(traccia_voce, a, da, 1.0)
        i = int(da * SR); attiva[max(0, i - int(0.15 * SR)): min(n, i + len(a) + int(0.25 * SR))] = 1
    liscia = int(0.25 * SR)
    attiva = np.convolve(attiva, np.ones(liscia) / liscia, 'same')
    sotto_musica = musica(inizi[1:], durata) * (0.42 - 0.27 * attiva)
    mix = traccia_voce / (np.max(np.abs(traccia_voce)) + 1e-9) * 0.9 + sotto_musica
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.89
    audio = (mix * 32767).astype(np.int16)
    wav = os.path.join(base, 'work', 'audio.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(audio.tobytes())
    subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(work, '%04d.png'), '-i', wav,
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart',
                    os.path.join(base, 'brag.mp4')], check=True)
    open(os.path.join(base, 'share-copy.txt'), 'w', encoding='utf-8').write(info['condividi'] + '\n')
    print(os.path.join(base, 'brag.mp4'), f'{durata} s')

if __name__ == '__main__':
    modo, nome = sys.argv[1], sys.argv[2]
    if modo == 'foto': foto(nome, [float(x) for x in sys.argv[3:]])
    else: video(nome)
