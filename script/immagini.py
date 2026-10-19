# Disegna l'icona del sito e l'immagine di anteprima per i social (una volta sola: i PNG stanno in sorgente/).
# Uso: python script/immagini.py   (su Windows, usa i caratteri Segoe UI)
import os
from PIL import Image, ImageDraw, ImageFont

QUI = os.path.dirname(os.path.abspath(__file__))
SORGENTE = os.path.join(QUI, '..', 'sorgente')
FONT = 'C:/Windows/Fonts/segoeui.ttf'
FONT_B = 'C:/Windows/Fonts/segoeuib.ttf'
SFONDO, VERDE, INK, MUTED, LINEA = '#0e1419', '#0d7a47', '#e7edf2', '#9aa7b3', '#2a3642'
SERIE = ['#2a78d6', '#1baf7a', '#eb6834', '#eda100', '#e87ba4']


def icona(lato):
    # quadrato verde con tre barre bianche (la classifica)
    s = 4  # disegno grande e riduco, così i bordi sono morbidi
    L = lato * s
    im = Image.new('RGBA', (L, L), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, L - 1, L - 1], radius=L * 0.22, fill=VERDE)
    larga = L * 0.16
    for i, (x, alto) in enumerate([(0.22, 0.38), (0.42, 0.62), (0.62, 0.48)]):
        x0 = L * x
        d.rounded_rectangle([x0, L * (0.80 - alto), x0 + larga, L * 0.80], radius=larga * 0.3, fill='white')
    return im.resize((lato, lato), Image.LANCZOS)


icona(32).save(os.path.join(SORGENTE, 'favicon-32.png'))
icona(180).save(os.path.join(SORGENTE, 'apple-touch-icon.png'))


# anteprima social 1200x630
W, H = 1200, 630
im = Image.new('RGB', (W, H), SFONDO)
d = ImageDraw.Draw(im)
f_logo = ImageFont.truetype(FONT_B, 46)
f_tit = ImageFont.truetype(FONT_B, 70)
f_sub = ImageFont.truetype(FONT, 32)
f_dom = ImageFont.truetype(FONT_B, 30)

im.paste(icona(64), (72, 66), icona(64))
d.text((152, 70), 'FreeLLM', font=f_logo, fill=INK)
d.text((152 + d.textlength('FreeLLM', font=f_logo), 70), 'Arena', font=f_logo, fill='#4ccb8b')

y = 200
for riga in ['The best AI models', 'you can use for free']:
    d.text((72, y), riga, font=f_tit, fill=INK)
    y += 86
d.text((72, y + 24), 'Ranked by real human votes.', font=f_sub, fill=MUTED)
d.text((72, y + 66), 'Free online  ·  Run at home on your GPUs', font=f_sub, fill=MUTED)
d.text((72, H - 82), 'freellmarena.com', font=f_dom, fill='#4ccb8b')

# barre a destra, dalla più alta
base, x = 520, 820
for i, alto in enumerate([300, 250, 215, 175, 140]):
    d.rounded_rectangle([x, base - alto, x + 50, base], radius=8, fill=SERIE[i])
    x += 68
d.line([800, base + 1, 1150, base + 1], fill=LINEA, width=3)

im.save(os.path.join(SORGENTE, 'anteprima.png'), optimize=True)
print('ok')
