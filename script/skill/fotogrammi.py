"""Publication gate: actual encoded frames, dimensions, timing and browser layout."""
import functools
import http.server
import json
import pathlib
import subprocess
import sys
import threading
from playwright.sync_api import sync_playwright

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
if not (folder/'video.srt').read_text(encoding='utf-8').strip():
    errors.append('missing captions')

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_): pass

server = http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(folder)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/'
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width':w,'height':h})
    for i, scene in enumerate(times['scene']):
        frame = frame_dir/f'scena-{i+1:02}.jpg'
        at = scene['inizio'] + scene['durata'] - .2
        subprocess.run(['ffmpeg','-v','error','-y','-ss',str(at),'-i',str(folder/'video.mp4'),'-frames:v','1','-q:v','2',str(frame)],check=True)
        frames.append(str(frame.relative_to(folder)))
        name = f"{i+1:02}-{scene['stampo']}.html"
        template = (folder/'compositions/frames'/name).read_text(encoding='utf-8').replace('<template>','').replace('</template>','')
        html = f'<html><head><base href="{base}"></head><body style="margin:0">{template}</body></html>'
        page.set_content(html,wait_until='networkidle')
        page.evaluate('document.fonts.ready')
        page.evaluate('(at)=>Object.values(window.__timelines||{}).forEach(t=>t.seek(at))',scene['durata']-.25)
        issues = page.evaluate('''({w,limit}) => [...document.querySelectorAll('[id$="palco"] *')].filter(e=>!e.children.length && e.textContent.trim() && !e.closest('svg')).flatMap(e=>{
          const b=e.getBoundingClientRect(),style=getComputedStyle(e);
          if (style.display==='none') return [];
          const problem=b.left<0 || b.right>w+.5 || b.top<0 || b.bottom>limit+.5 || e.scrollWidth>e.clientWidth+2 || e.scrollHeight>e.clientHeight+2;
          return problem ? [{text:e.textContent,box:{x:b.x,y:b.y,w:b.width,h:b.height},scroll:[e.scrollWidth,e.scrollHeight],client:[e.clientWidth,e.clientHeight]}] : [];
        })''',{'w':w,'limit':limit})
        layouts.append({'scene':i+1,'passed':not issues,'issues':issues})
        if issues: errors.append({'scene':i+1,'layout':issues})
    browser.close()
server.shutdown()
(folder/'controllo.json').write_text(json.dumps({'passed':not errors,'width':w,'height':h,'seconds':duration,'frames':frames,'layouts':layouts,'errors':errors},indent=1),encoding='utf-8')
if errors:
    print(json.dumps(errors))
    raise SystemExit(1)
print(f'Validated {len(frames)} encoded frames and layouts, {w}x{h}, {duration:.2f}s')
