"""Render the isolated acceptance fixture at the requested widths; never production."""
import argparse
import functools
import http.server
import json
import pathlib
import threading
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--fixture', required=True, type=pathlib.Path)
parser.add_argument('--output', required=True, type=pathlib.Path)
args = parser.parse_args()
root = args.fixture.resolve()
site = root / 'site'
out = args.output.resolve()
out.mkdir(parents=True, exist_ok=True)
registry = json.loads((root / 'dati/skill-pagine.json').read_text(encoding='utf-8'))
skill = next(p['url'] for p in registry if p['tipo'] == 'skill' and p['stato'] == 'attiva' and 'agent-browser' in p['slug'])
withdrawn = next(p['url'] for p in registry if p['stato'] == 'ritirata')
pages = {'skill-history': skill, 'skill-withdrawn': withdrawn,
         'category': '/skills/for-coding.html', 'month': '/skills/best-agent-skills-2026-11.html',
         'skills-index': '/skills.html'}

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(site)))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'
results = []
issues = []
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for width in [360, 1280]:
            page = browser.new_page(viewport={'width': width, 'height': 900}, device_scale_factor=1)
            page.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base) else route.abort())
            for name, url in pages.items():
                response = page.goto(base + url, wait_until='networkidle')
                page.evaluate('document.fonts.ready')
                assert response.status == 200, (url, response.status)
                assert page.locator('main h1').count() == 1
                assert page.title() == page.locator('main h1').inner_text()
                if page.evaluate('document.documentElement.scrollWidth > innerWidth'):
                    issues.append([url, width, 'horizontal overflow'])
                if name == 'skill-withdrawn':
                    assert page.locator('meta[name=robots]').get_attribute('content') == 'noindex'
                    assert page.locator('main pre, main code, video, iframe').count() == 0
                if name == 'month':
                    page.wait_for_function("document.querySelector('[data-month-next]').getAttribute('href').includes('2026-12')")
                    target = page.locator('[data-month-next]').get_attribute('href')
                    assert page.request.get(base + target).status == 200
                if name == 'skill-history':
                    graph = page.locator('.skill-history svg')
                    assert graph.count() == 1
                    assert 'latest stars' in graph.get_attribute('aria-label')
                    physical_font = graph.evaluate("e => e.getBoundingClientRect().width / e.viewBox.baseVal.width * parseFloat(getComputedStyle(e.querySelector('text')).fontSize)")
                    if physical_font < 10:
                        issues.append([url, width, 'graph font under 10px', physical_font])
                    page.locator('.skill-history').screenshot(path=str(out / f'history-detail-{width}.png'))
                file = f'{name}-{width}.png'
                page.screenshot(path=str(out / file), full_page=True)
                results.append({'url': url, 'width': width, 'status': response.status, 'file': file})
            # The graph uses the site's explicit light/dark theme and no network.
            page.goto(base + skill, wait_until='networkidle')
            for theme in ['chiaro', 'scuro']:
                page.evaluate('(t) => document.documentElement.dataset.tema=t', theme)
                page.locator('.skill-history').screenshot(path=str(out / f'history-{theme}-{width}.png'))
                colors = page.locator('.skill-history svg').evaluate("e => ({color:getComputedStyle(e).color,background:getComputedStyle(document.body).backgroundColor})")
                results.append({'url': skill, 'width': width, 'theme': theme, 'colors': colors})
            page.close()
        browser.close()
finally:
    server.shutdown()
(out / 'layout.json').write_text(json.dumps({'passed': not issues, 'screenshots': 10, 'results': results, 'issues': issues}, indent=2), encoding='utf-8')
print(json.dumps({'screenshots': 10, 'widths': [360, 1280], 'issues': issues}))
if issues:
    raise SystemExit(1)
