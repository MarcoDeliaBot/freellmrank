# Foto della pagina della fonte di una notizia (5/11/2026, Marco: «i prossimi video li voglio tutti con questo stile»,
# cioè con schede vere della fonte). Due foto: larga per il video lungo, stretta (come sul telefono) per lo Short.
# Stampa in JSON se le foto sono buone (ok) e l'immagine di anteprima della pagina (og:image), se c'è. Niente login, niente cookie salvati.
# Uso: python foto-pagina.py <url> <larga.png> <stretta.png>
import json
import re
import sys

from playwright.sync_api import sync_playwright

# avvisi dei cookie e barre fisse che coprono la pagina: si nascondono, non si cliccano
NASCONDI = """
[id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i], [aria-label*="cookie" i],
#onetrust-banner-sdk, #onetrust-consent-sdk, .fc-consent-root, #CybotCookiebotDialog, [class*="gdpr" i],
[class*="newsletter" i][class*="modal" i], [role="dialog"] { display: none !important; }
html, body { overflow: auto !important; }
"""

ERRORE = re.compile(r"internal server error|page not found|\b404\b|access denied|just a moment|verify you are (a )?human|"
                    r"are you a robot|enable javascript and cookies|captcha|sign in to continue|log in to continue", re.I)


def foto(browser, url, out, larghezza, altezza, scala):
    pagina = browser.new_page(viewport={"width": larghezza, "height": altezza}, device_scale_factor=scala,
                              user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36")
    try:
        risposta = pagina.goto(url, wait_until="domcontentloaded", timeout=30000)
        # pagina di errore o bloccata (OpenAI dà 500 ai browser automatici): niente foto
        if risposta is None or risposta.status >= 400:
            return None
        try:
            pagina.wait_for_load_state("networkidle", timeout=8000)
        except Exception:
            pass
        testo = pagina.inner_text("body").strip()
        # pagine vuote, errori disegnati dalla pagina (OpenAI risponde 200 e scrive «500 Internal Server Error»),
        # muri anti-robot e richieste di login
        if len(testo) < 300 or ERRORE.search(testo[:4000]):
            return None
        pagina.add_style_tag(content=NASCONDI)
        pagina.wait_for_timeout(800)
        pagina.screenshot(path=out)
        og = pagina.evaluate("""() => { const m = document.querySelector('meta[property="og:image"], meta[name="twitter:image"]');
          return m ? new URL(m.content, location.href).href : ''; }""")
        return og
    finally:
        pagina.close()


def main():
    url, larga, stretta = sys.argv[1:4]
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            og = foto(browser, url, larga, 960, 600, 2)
            ok = og is not None and foto(browser, url, stretta, 560, 640, 2) is not None
        finally:
            browser.close()
    print(json.dumps({"ok": ok, "og": og or ""}))


if __name__ == "__main__":
    main()
