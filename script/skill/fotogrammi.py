"""Publication gate: actual encoded frames, dimensions, timing and browser layout."""
import functools
import http.server
import json
import pathlib
import subprocess
import sys
import threading
from playwright.sync_api import sync_playwright
from layout_check import CHECK_LAYOUT, TEXT_REGIONS, missing_text, CHECK_QUALITY
from PIL import Image

folder = pathlib.Path(sys.argv[1]).resolve()
plan = json.loads((folder/'piano.json').read_text(encoding='utf-8'))
times = json.loads((folder/'tempi.json').read_text(encoding='utf-8'))
vertical = plan['formato'] == 'verticale'
w, h, limit = (1080,1920,1180) if vertical else (1920,1080,860)
errors, frames, layouts = [], [], []
frame_dir = folder/'fotogrammi'
frame_dir.mkdir(exist_ok=True)
probe = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(folder/'video.mp4')]))
video = next(s for s in probe['streams'] if s['codec_type']=='video')
duration = float(probe['format']['duration'])
if (video['width'],video['height']) != (w,h):
    errors.append('wrong encoded dimensions')
if abs(duration-times['totale']) > .15 or (vertical and abs(duration-45)>.15):
    errors.append('wrong encoded duration')
if not vertical and not 120 <= duration <= 240:
    errors.append('encoded long video is outside 2-4 minutes')
if not (folder/'video.srt').read_text(encoding='utf-8').strip():
    errors.append('missing captions')

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_): pass
    def copyfile(self, source, outputfile):
        try: super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError): pass

server = http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(folder)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/'
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width':w,'height':h})
    # Set the real local origin before loading the standalone template so its
    # font requests are same-origin, as in the actual HyperFrames composition.
    page.goto(base,wait_until='domcontentloaded')
    for i, scene in enumerate(times['scene']):
        frame = frame_dir/f'scena-{i+1:02}.jpg'
        at = scene['inizio'] + scene['durata'] - .2
        subprocess.run(['ffmpeg','-v','error','-y','-ss',str(at),'-i',str(folder/'video.mp4'),'-frames:v','1','-q:v','2',str(frame)],check=True)
        frames.append(str(frame.relative_to(folder)))
        name = f"{i+1:02}-{scene['stampo']}.html"
        template = (folder/'compositions/frames'/name).read_text(encoding='utf-8').replace('<template>','').replace('</template>','')
        # Match the host composition's reset, including border-box sizing.
        reset = '*{margin:0;padding:0;box-sizing:border-box}'
        html = f'<html><head><base href="{base}"><style>{reset}</style></head><body>{template}</body></html>'
        page.set_content(html,wait_until='networkidle')
        page.evaluate('document.fonts.ready')
        page.evaluate('(at)=>Object.values(window.__timelines||{}).forEach(t=>t.seek(at))',scene['durata']-.25)
        issues = page.evaluate(CHECK_LAYOUT,{'w':w,'limit':limit})
        issues += page.evaluate(CHECK_QUALITY,{'w':w,'limit':limit,'opening':bool(plan['scene'][i].get('dati',{}).get('apertura'))})
        with Image.open(frame) as encoded:
            absent=missing_text(encoded,page.evaluate(TEXT_REGIONS))
        if absent: issues.append({'missing_encoded_text':absent})
        layouts.append({'scene':i+1,'passed':not issues,'issues':issues})
        if issues: errors.append({'scene':i+1,'layout':issues})
    browser.close()
server.shutdown()
(folder/'controllo.json').write_text(json.dumps({'passed':not errors,'width':w,'height':h,'seconds':duration,'frames':frames,'layouts':layouts,'errors':errors},indent=1),encoding='utf-8')
if errors:
    print(json.dumps(errors))
    raise SystemExit(1)
print(f'Validated {len(frames)} encoded frames and layouts, {w}x{h}, {duration:.2f}s')
