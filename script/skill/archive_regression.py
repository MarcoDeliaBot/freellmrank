"""Preserve the original trial-2 evidence for an offline CI regression test.

No MP4/WAV is committed: WAV measurements and source hashes are recorded.
Every text, timing, SRT and JPEG file is copied byte for byte.
"""
import hashlib,json,pathlib,shutil,sys
from editorial_gate import voice_span
source=pathlib.Path(sys.argv[1]).resolve()
target=pathlib.Path(__file__).parent/'fixtures/prova-2'
manifest={'run':'https://github.com/MarcoDeliaBot/freellmrank/actions/runs/41152536447','videos':[]}
for plan in sorted(source.glob('*/*/piano.json')):
    folder=plan.parent;name=f'{folder.parent.name}-{folder.name}'
    dest=target/name;dest.mkdir(parents=True,exist_ok=True)
    files=[folder/'piano.json',folder/'tempi.json',folder/'video.srt',*sorted((folder/'assets/voice').glob('*.txt')),*sorted((folder/'fotogrammi').glob('scena-*.jpg'))]
    hashes={}
    for file in files:
        rel=file.relative_to(folder);out=dest/rel;out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(file,out)
        hashes[str(rel).replace('\\','/')]=hashlib.sha256(file.read_bytes()).hexdigest()
    voices=[]
    for file in sorted((folder/'assets/voice').glob('[0-9][0-9].wav')):
        onset,end=voice_span(file)
        voices.append({'onset':onset,'end':end,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'source':str(file.relative_to(folder)).replace('\\','/')})
    (dest/'voice-measurements.json').write_text(json.dumps(voices,indent=1),encoding='utf-8')
    manifest['videos'].append({'folder':name,'tool':folder.parent.name.startswith('tutorial-'),'sha256':hashes})
(target/'manifest.json').write_text(json.dumps(manifest,indent=1),encoding='utf-8')
print(f'Archived {len(manifest["videos"])} unchanged trial-2 evidence bundles')
