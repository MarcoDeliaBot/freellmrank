# Video verticali automatici (1080x1920, per Shorts, TikTok, Reels) dai dati del sito.
# Uso: python script/video.py nuovo        → il modello nuovo più recente
#      python script/video.py settimana    → il report settimanale (i primi 5 in chat)
# Esce un MP4 senza voce in video/<nome>.mp4. Costo zero: Pillow per le immagini, ffmpeg per montarle.
# In GitHub Actions ffmpeg c'è già; sul PC si usa quello di imageio-ffmpeg.
import json, os, shutil, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.join(QUI, '..')
W, H, FPS = 1080, 1920, 30
SFONDO, INK, MUTED, VERDE, VERDE_SCURO, LINEA, SUPERFICIE = '#0e1419', '#e7edf2', '#9aa7b3', '#4ccb8b', '#0d7a47', '#2a3642', '#161e26'
SERIE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4']

def font(grassetto, corpo):
    for f in (['C:/Windows/Fonts/segoeuib.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'] if grassetto
              else ['C:/Windows/Fonts/segoeui.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']):
        if os.path.exists(f): return ImageFont.truetype(f, corpo)
    return ImageFont.load_default()

def ffmpeg():
    if shutil.which('ffmpeg'): return 'ffmpeg'
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()

def a_capo(d, testo, f, larghezza):
    righe, riga = [], ''
    for parola in str(testo).split():
        prova = (riga + ' ' + parola).strip()
        if d.textlength(prova, font=f) <= larghezza: riga = prova
        else: righe.append(riga); riga = parola
    return righe + ([riga] if riga else [])

def tela(numero, totale):
    im = Image.new('RGB', (W, H), SFONDO)
    d = ImageDraw.Draw(im)
    # marchio in alto e avanzamento in basso
    d.rounded_rectangle([80, 120, 152, 192], radius=16, fill=VERDE_SCURO)
    for x, alto in [(96, 30), (113, 48), (130, 38)]:
        d.rounded_rectangle([x, 178 - alto, x + 12, 178], radius=3, fill='white')
    f = font(True, 52)
    d.text((176, 126), 'FreeLLM', font=f, fill=INK)
    d.text((176 + d.textlength('FreeLLM', font=f), 126), 'Arena', font=f, fill=VERDE)
    for i in range(totale):
        d.rounded_rectangle([80 + i * (920 / totale), 1780, 80 + (i + 1) * (920 / totale) - 12, 1790], radius=5, fill=VERDE if i <= numero else LINEA)
    return im, d

def scrivi(d, y, testo, corpo, colore=INK, grassetto=True, spazio=1.25):
    # una parola troppo lunga (nomi come "DeepSeek-V4.1-Flash-1017") non va a capo: si rimpicciolisce il testo
    while corpo > 30 and max(d.textlength(p, font=font(grassetto, corpo)) for p in str(testo).split()) > 920:
        corpo -= 4
    f = font(grassetto, corpo)
    for r in a_capo(d, testo, f, 920):
        d.text((80, y), r, font=f, fill=colore); y += int(corpo * spazio)
    return y

def diapositive_nuovo(dati):
    nuovi = sorted(dati.get('nuovi') or [], key=lambda m: m.get('creato') or '', reverse=True)
    m = next((x for x in nuovi if x.get('hf')), nuovi[0])
    hf = m.get('hf') or {}
    b = hf.get('b') or 0
    attivi = hf.get('att') if hf.get('att') and hf.get('att') < b * 0.6 else None
    gb4 = b * 0.606 + 1.2
    adatta = sorted([s for s in dati['schede']['schede'] if s['marca'] != 'Data center' and (s['gb'] * (0.75 if s.get('unificata') else 1)) >= gb4 + 1.5], key=lambda s: (s['gb'], -s['banda']))
    scheda = adatta[0]['nome'] if adatta else None
    nome = m['nome']
    s = []
    def uno(i, n):
        im, d = tela(i, n); return im, d
    n = 4
    im, d = uno(0, n); y = scrivi(d, 520, 'NEW FREE AI MODEL', 54, VERDE); y = scrivi(d, y + 30, nome, 104); scrivi(d, y + 30, f"by {m.get('org') or ''}" + (f" · released {m['creato']}" if m.get('creato') else ''), 46, MUTED, False); s.append((im, 3.2))
    im, d = uno(1, n); y = scrivi(d, 440, 'How big is it?', 64)
    y = scrivi(d, y + 60, f"{b:.1f} B parameters" if b else 'Size not public', 92, VERDE)
    if attivi: y = scrivi(d, y + 10, f"only {attivi:.0f} B used per word (mixture of experts)", 50, INK, False)
    if b: y = scrivi(d, y + 30, f"About {gb4:.0f} GB to download at 4-bit", 54, INK, False)
    if scheda: scrivi(d, y + 60, f"Smallest card that runs it fully: {scheda}", 54, MUTED, False)
    s.append((im, 4.2))
    im, d = uno(2, n); y = scrivi(d, 440, 'Is it free?', 64)
    y = scrivi(d, y + 60, 'Yes: open weights on Hugging Face.' if m.get('hf') else 'Yes: free API on OpenRouter.', 72, VERDE)
    scrivi(d, y + 60, 'Arena has not voted on it yet. When it does, it enters our free leaderboard the next night.', 52, INK, False); s.append((im, 4.5))
    im, d = uno(3, n); y = scrivi(d, 620, 'Compare it with every free model', 72); scrivi(d, y + 60, 'freellmarena.com', 96, VERDE); s.append((im, 3.2))
    return f"nuovo-{nome.lower().replace('/', '-').replace(' ', '-')}", s

def diapositive_settimana(dati):
    chat = next(c for c in dati['categorie'] if c['id'] == 'chat')
    gratis = [m for m in chat['modelli'] if m.get('aperto') or (m.get('or') or {}).get('gratis')][:5]
    s = []
    im, d = tela(0, 3); y = scrivi(d, 560, 'THIS WEEK', 54, VERDE); y = scrivi(d, y + 30, 'The 5 best free AI models for chat', 100); scrivi(d, y + 30, f"Arena votes · {dati.get('aggiornato', '')}", 46, MUTED, False); s.append((im, 3.2))
    im, d = tela(1, 3); scrivi(d, 330, 'Top 5, free', 64)
    massimo = max(m['punti'] for m in gratis); minimo = min(m['punti'] for m in gratis) - 40
    for i, m in enumerate(gratis):
        y = 500 + i * 230
        d.text((80, y), f"{i + 1}", font=font(True, 70), fill=MUTED)
        d.text((170, y), m['nome'][:26], font=font(True, 58), fill=INK)
        larga = int(760 * (m['punti'] - minimo) / (massimo - minimo))
        d.rounded_rectangle([170, y + 92, 170 + larga, y + 136], radius=10, fill=SERIE[i])
        d.text((190 + larga, y + 86), str(m['punti']), font=font(True, 46), fill=INK)
    s.append((im, 6.0))
    im, d = tela(2, 3); y = scrivi(d, 620, 'Which one runs on your GPU?', 76); scrivi(d, y + 60, 'freellmarena.com', 96, VERDE); s.append((im, 3.2))
    return f"settimana-{dati.get('aggiornato', '')}", s

def monta(nome, diapositive):
    uscita = os.path.join(RADICE, 'video'); os.makedirs(uscita, exist_ok=True)
    mp4 = os.path.join(uscita, nome + '.mp4')
    with tempfile.TemporaryDirectory() as tmp:
        elenco = []
        for i, (im, secondi) in enumerate(diapositive):
            p = os.path.join(tmp, f'{i:02d}.png'); im.save(p); elenco.append((p, secondi))
        # ogni immagine diventa un pezzo con dissolvenza in entrata e in uscita, poi si incollano
        pezzi = []
        for i, (p, sec) in enumerate(elenco):
            out = os.path.join(tmp, f'p{i:02d}.mp4')
            subprocess.run([ffmpeg(), '-y', '-loglevel', 'error', '-loop', '1', '-t', str(sec), '-i', p,
                            '-vf', f'fade=t=in:st=0:d=0.35,fade=t=out:st={sec - 0.35}:d=0.35,format=yuv420p', '-r', str(FPS),
                            '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', out], check=True)
            pezzi.append(out)
        lista = os.path.join(tmp, 'lista.txt')
        with open(lista, 'w') as f: f.write(''.join(f"file '{x.replace(os.sep, '/')}'\n" for x in pezzi))
        subprocess.run([ffmpeg(), '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', '-movflags', '+faststart', mp4], check=True)
        # anteprima: la prima immagine, per controllare senza aprire il video
        diapositive[0][0].resize((360, 640)).save(os.path.join(uscita, nome + '.jpg'))
    return mp4

if __name__ == '__main__':
    tipo = sys.argv[1] if len(sys.argv) > 1 else 'nuovo'
    dati = json.load(open(os.path.join(RADICE, 'sito', 'data.json'), encoding='utf-8'))
    nome, diap = (diapositive_settimana if tipo == 'settimana' else diapositive_nuovo)(dati)
    print(monta(nome, diap))
