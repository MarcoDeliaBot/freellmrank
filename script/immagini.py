# Disegna l'icona del sito e le immagini di anteprima per i social (una per sezione).
# Si lancia a mano, una volta: i PNG stanno in sorgente/ e la build li copia.
# Uso: python script/immagini.py   (su Windows, usa i caratteri Segoe UI)
import os
from PIL import Image, ImageDraw, ImageFont

QUI = os.path.dirname(os.path.abspath(__file__))
SORGENTE = os.path.join(QUI, '..', 'sorgente')
FONT = 'C:/Windows/Fonts/segoeui.ttf'
FONT_B = 'C:/Windows/Fonts/segoeuib.ttf'
SFONDO, VERDE, VERDE_CHIARO, INK, MUTED, LINEA, SUPERFICIE = '#0e1419', '#0d7a47', '#4ccb8b', '#e7edf2', '#9aa7b3', '#2a3642', '#161e26'
SERIE = ['#2a78d6', '#1baf7a', '#eb6834', '#eda100', '#e87ba4']
W, H = 1200, 630


def icona(lato):
    # quadrato verde con tre barre bianche (la classifica)
    s = 4  # disegno grande e riduco, così i bordi sono morbidi
    L = lato * s
    im = Image.new('RGBA', (L, L), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, L - 1, L - 1], radius=L * 0.22, fill=VERDE)
    larga = L * 0.16
    for x, alto in [(0.22, 0.38), (0.42, 0.62), (0.62, 0.48)]:
        x0 = L * x
        d.rounded_rectangle([x0, L * (0.80 - alto), x0 + larga, L * 0.80], radius=larga * 0.3, fill='white')
    return im.resize((lato, lato), Image.LANCZOS)


# ---- disegni a destra, ognuno nel riquadro x 790..1150, y 190..530 ----

def barre(d):
    base, x = 520, 820
    for i, alto in enumerate([300, 250, 215, 175, 140]):
        d.rounded_rectangle([x, base - alto, x + 50, base], radius=8, fill=SERIE[i])
        x += 68
    d.line([800, base + 1, 1150, base + 1], fill=LINEA, width=3)


def griglia(d):
    for r in range(3):
        for c in range(3):
            x, y = 810 + c * 115, 200 + r * 110
            d.rounded_rectangle([x, y, x + 100, y + 95], radius=14, fill=SUPERFICIE, outline=LINEA, width=2)
            d.rounded_rectangle([x + 14, y + 16, x + 14 + 46, y + 26], radius=4, fill=SERIE[(r * 3 + c) % 5])
            d.rounded_rectangle([x + 14, y + 40, x + 86, y + 48], radius=4, fill=LINEA)
            d.rounded_rectangle([x + 14, y + 58, x + 66, y + 66], radius=4, fill=LINEA)


def albero(d):
    # una domanda, due strade, una scelta
    nodo = lambda x, y, col: d.ellipse([x - 26, y - 26, x + 26, y + 26], fill=col)
    for (x0, y0, x1, y1) in [(970, 230, 870, 360), (970, 230, 1070, 360), (870, 360, 820, 480), (870, 360, 920, 480)]:
        d.line([x0, y0, x1, y1], fill=LINEA, width=6)
    nodo(970, 230, SERIE[0])
    nodo(870, 360, VERDE_CHIARO)
    nodo(1070, 360, '#3a4652')
    nodo(820, 480, '#3a4652')
    nodo(920, 480, VERDE_CHIARO)
    f = ImageFont.truetype(FONT_B, 30)
    d.text((1000, 462), '87%', font=f, fill=VERDE_CHIARO)


def chat(d):
    f = ImageFont.truetype(FONT_B, 34)
    for i, (x, col, lett) in enumerate([(800, SERIE[0], 'A'), (985, SERIE[2], 'B')]):
        d.rounded_rectangle([x, 200, x + 165, 520], radius=18, fill=SUPERFICIE, outline=LINEA, width=2)
        d.ellipse([x + 18, 216, x + 64, 262], fill=col)
        d.text((x + 41, 239), lett, font=f, fill='white', anchor='mm')
        for j, lung in enumerate([120, 100, 128, 80, 112, 60]):
            d.rounded_rectangle([x + 18, 290 + j * 34, x + 18 + lung, 302 + j * 34], radius=5, fill=LINEA)
    fv = ImageFont.truetype(FONT_B, 30)
    d.text((975, 545), 'vs', font=fv, fill=MUTED, anchor='mm')


def gpu(d):
    # una scheda video con la memoria che si riempie
    d.rounded_rectangle([800, 230, 1150, 430], radius=18, fill=SUPERFICIE, outline=LINEA, width=3)
    for cx in (900, 1050):
        d.ellipse([cx - 62, 268, cx + 62, 392], outline=LINEA, width=6)
        d.ellipse([cx - 16, 314, cx + 16, 346], fill=LINEA)
    for i in range(10):
        d.rectangle([830 + i * 30, 430, 846 + i * 30, 452], fill='#c9a227')
    # barra della memoria
    d.rounded_rectangle([800, 480, 1150, 512], radius=8, fill=LINEA)
    d.rounded_rectangle([800, 480, 1010, 512], radius=8, fill=SERIE[0])
    d.rectangle([1004, 480, 1070, 512], fill=SERIE[1])
    f = ImageFont.truetype(FONT_B, 26)
    d.text((800, 524), '24 GB', font=f, fill=MUTED)
    d.text((1150, 524), '42 tok/s', font=f, fill=VERDE_CHIARO, anchor='ra')


def foglio(d):
    for k, (x, y) in enumerate([(870, 215), (830, 245)]):
        d.rounded_rectangle([x, y, x + 280, y + 300], radius=16, fill=SUPERFICIE if k else '#1c2630', outline=LINEA, width=2)
    x, y = 830, 245
    d.rounded_rectangle([x + 28, y + 30, x + 200, y + 50], radius=6, fill=VERDE_CHIARO)
    for j, lung in enumerate([220, 200, 224, 160, 210, 120]):
        d.rounded_rectangle([x + 28, y + 80 + j * 32, x + 28 + lung, y + 92 + j * 32], radius=5, fill=LINEA)


def anteprima(file, righe, sotto, disegno):
    im = Image.new('RGB', (W, H), SFONDO)
    d = ImageDraw.Draw(im)
    f_logo = ImageFont.truetype(FONT_B, 46)
    f_sub = ImageFont.truetype(FONT, 32)
    f_dom = ImageFont.truetype(FONT_B, 30)
    ic = icona(64)
    im.paste(ic, (72, 66), ic)
    d.text((152, 70), 'FreeLLM', font=f_logo, fill=INK)
    d.text((152 + d.textlength('FreeLLM', font=f_logo), 70), 'Arena', font=f_logo, fill=VERDE_CHIARO)
    # il titolo si rimpicciolisce finché sta a sinistra del disegno
    corpo = 70
    while corpo > 44 and max(d.textlength(r, font=ImageFont.truetype(FONT_B, corpo)) for r in righe) > 690:
        corpo -= 2
    f_tit = ImageFont.truetype(FONT_B, corpo)
    y = 200
    for r in righe:
        d.text((72, y), r, font=f_tit, fill=INK)
        y += int(corpo * 1.23)
    y += 24
    for r in sotto:
        d.text((72, y), r, font=f_sub, fill=MUTED)
        y += 42
    d.text((72, H - 82), 'freellmarena.com', font=f_dom, fill=VERDE_CHIARO)
    disegno(d)
    im.save(os.path.join(SORGENTE, file), optimize=True)


icona(32).save(os.path.join(SORGENTE, 'favicon-32.png'))
icona(180).save(os.path.join(SORGENTE, 'apple-touch-icon.png'))

anteprima('anteprima.png', ['The best AI models', 'you can use for free'],
          ['Ranked by real human votes.', 'Free online  ·  Run at home on your GPUs'], barre)
anteprima('anteprima-modelli.png', ['Every free AI model,', 'one page each'],
          ['Votes, size, license, where to use it.', 'Free online or on your own GPUs'], griglia)
anteprima('anteprima-decisioni.png', ['Decision models,', 'ranked'],
          ['Open models that pick, score or say yes/no', 'with a probability. Speed and license.'], albero)
anteprima('anteprima-confronto.png', ['Try two free AI models', 'side by side'],
          ['Same question, two answers.', 'Pick the better one. No payment.'], chat)
anteprima('anteprima-casa.png', ['The best model', 'your GPU can run'],
          ['Pick your card and how many you have.', 'See what fits and how fast it writes.'], gpu)
anteprima('anteprima-blog.png', ['Free AI models:', 'guides and weekly reports'],
          ['What changed in the rankings this week,', 'and how to use the best ones for free.'], foglio)
print('ok')
