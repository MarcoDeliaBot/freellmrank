"""Content/timing/pixel gate shared by publication and historical regression.

Background height is counted on decoded pixels, row by row, excluding only
the caption band. A row needs visible teaching ink or a content panel over
at least 2% of its width; the faint background grid does not qualify.
"""
import json
import pathlib
import re
import wave
import numpy as np
from PIL import Image

FORBIDDEN=re.compile(r'source-based walkthrough|this pipeline|does not execute|this review covers|static checks cannot prove|remote-code-load|sensitive-read|environment-secret-read|download-and-execute|remote-eval|external-data-send|multiline-data-send|unsafe-path-or-symlink|[\w./-]+\.(?:md|py|js|mjs):\d+',re.I)
TECHNICAL=re.compile(r'[<>/\\]|(?:^|\s)-[a-z0-9-]+\b|\b(?:npx|curl|wget|npm|pip|irm|iex|localhost)\b|\b[\w.-]+\.(?:md|html|json|py|mjs|js|txt|sh|png|com|org)\b|\b(?:ollama|agent-browser|lms|git|docker|brew|llama-cli)\s+(?:run|pull|launch|ls|open|snapshot|click|skills|install|chat|clone|status|diff|checkout|commit|build|get|load|serve)\b|@e\d|:\d+|[_{}=]|`',re.I)

def norm(s): return re.sub(r'[^a-z0-9]+',' ',s.lower()).strip()

def text_issues(value,voice=False,tool=False):
    out=[]
    if FORBIDDEN.search(value):out.append('forbidden internal wording')
    if re.search(r':\s*$',value):out.append('unfinished sentence ending with colon')
    if voice and TECHNICAL.search(value):out.append('technical command or path in narration')
    if tool and re.search(r'\bskills?\b',value,re.I):out.append('skill wording in a tool tutorial')
    return out

def sentences(text):
    return [norm(s) for s in re.split(r'(?<=[.!?])\s+|\n+',text) if norm(s) and (len(norm(s).split())>=4 or re.search(r'[.!?]$',s.strip()))]

def background_height(image,caption_band):
    pixels=np.asarray(image.convert('RGB'),dtype=np.int16)
    # Video YUV conversion and JPEG extraction shift the brand RGB values. Read
    # the actual background from the empty outer gutters instead of comparing
    # an encoded frame with the unencoded CSS color. The 35% limit is unchanged.
    gutters=np.concatenate((pixels[:,:24].reshape(-1,3),pixels[:,-24:].reshape(-1,3)))
    base=np.median(gutters,axis=0)
    foreground=np.max(np.abs(pixels-base),axis=2)>12
    occupied=(foreground.sum(axis=1)>=max(12,image.width*.02))
    mask=np.ones(image.height,dtype=bool)
    mask[max(0,caption_band[0]):min(image.height,caption_band[1])]=False
    return round(float((~occupied[mask]).mean()*100),3)

def caption_visible(image,band):
    crop=np.asarray(image.convert('RGB'))[band[0]:band[1]]
    return bool(((crop[:,:,0]>180)&(crop[:,:,1]>185)&(crop[:,:,2]>175)).sum()>150)

def parse_srt(text):
    def seconds(t):
        h,m,s,ms=map(int,re.split('[:,]',t));return h*3600+m*60+s+ms/1000
    out=[]
    for block in re.split(r'\r?\n\s*\r?\n',text.strip()):
        match=re.search(r'(\d\d:\d\d:\d\d,\d{3}) --> (\d\d:\d\d:\d\d,\d{3})\s*\n([\s\S]*)',block)
        if match:out.append({'start':seconds(match[1]),'end':seconds(match[2]),'text':match[3].replace('\n',' ')})
    return out

def union_length(intervals):
    end=-1;total=0
    for a,b in sorted(intervals):
        total+=max(0,b-max(a,end));end=max(end,b)
    return total

def voice_span(file):
    # Measure the actual TTS file, not the planned narration length. Internal
    # pauses remain part of a spoken sentence; leading/trailing silence does not.
    with wave.open(str(file),'rb') as wav:
        rate=wav.getframerate();width=wav.getsampwidth();channels=wav.getnchannels()
        if width not in (2,4):raise ValueError('Unsupported voice sample width')
        data=np.frombuffer(wav.readframes(wav.getnframes()),dtype='<i2' if width==2 else '<i4').astype(float)
        data=data.reshape(-1,channels).mean(axis=1)/(2**(width*8-1))
    size=max(1,int(rate*.02));pad=(-len(data))%size
    rms=np.sqrt((np.pad(data,(0,pad)).reshape(-1,size)**2).mean(axis=1))
    active=np.flatnonzero(rms>max(.002,float(rms.max())*.025))
    return (float(active[0])*.02,float(active[-1]+1)*.02) if len(active) else (0,0)

def inspect_video(folder,tool=None,check_frames=True,recorded_voice=False):
    folder=pathlib.Path(folder)
    plan=json.loads((folder/'piano.json').read_text(encoding='utf-8'))
    times=json.loads((folder/'tempi.json').read_text(encoding='utf-8'))
    short=plan.get('formato')=='verticale'
    tool=('tutorial-' in str(folder) and 'install-and-use-' not in str(folder)) if tool is None else tool
    errors=[];seen_voice={};seen_screen={};seen_code={};details=[]
    captions=parse_srt((folder/'video.srt').read_text(encoding='utf-8'))
    if not captions:errors.append('missing captions')
    if short:
        if [s.get('durata') for s in plan['scene']]!=[3,7,7,7,8,8,5]:errors.append('incorrect Short timing or scene count')
        if len(plan['scene'])<2 or plan['scene'][1].get('etichetta')!='What it is':errors.append('Short scene 2 must be What it is')
        if sum(s.get('role')=='feature' for s in plan['scene'])!=3:errors.append('Short needs exactly three features or steps')
        for scene in plan['scene'][2:5]:
            if not any(scene.get('dati',{}).get(k) for k in ['nodi','elementi','comando']):errors.append('Short step needs a documented diagram, quotation or command panel')
        if times['scene'][1]['durata']<5:errors.append('Short identity shorter than five seconds')
        if times['scene'][1].get('timingFit',{}).get('speed',1)<.999:errors.append('Short identity speech was slowed down')
        if len(plan['scene'][0].get('dati',{}).get('titolo','').split())>6:errors.append('hook exceeds six words')
        if not plan['scene'][5].get('dati',{}).get('comando'):errors.append('Short installation command missing')
        if plan['scene'][-1].get('voce')!='Link in the description.':errors.append('Short link narration incorrect')
    for i,(scene,timing) in enumerate(zip(plan['scene'],times['scene'])):
        data=scene.get('dati',{})
        voicefile=folder/'assets/voice'/f'{i+1:02}.txt'
        voice=voicefile.read_text(encoding='utf-8') if voicefile.exists() else timing.get('testo',scene.get('voce',''))
        if voice!=scene.get('voce') or voice!=timing.get('testo'):errors.append(f'scene {i+1}: narration artifact differs from plan')
        for e in text_issues(voice,True,tool):errors.append(f'scene {i+1}: {e}')
        for key in sentences(voice):
            if key in seen_voice:errors.append(f'scene {i+1}: repeated narration from {seen_voice[key]}')
            seen_voice[key]=i+1
        for value in [scene.get('etichetta'),data.get('titolo'),data.get('testo'),data.get('risultato'),*data.get('elementi',[]),*data.get('nodi',[])]:
            if not value:continue
            # Repository URL is deliberately shown once, in the final card.
            for e in text_issues(value,False,tool):errors.append(f'scene {i+1}: {e}')
            for key in sentences(value):
                if key in seen_screen:errors.append(f'scene {i+1}: repeated screen sentence from {seen_screen[key]}')
                seen_screen[key]=i+1
        if data.get('comando'):
            if FORBIDDEN.search(data['comando']):errors.append(f'scene {i+1}: forbidden internal wording in code')
            key=norm(data['comando'])
            if key in seen_code:errors.append(f'scene {i+1}: repeated code from {seen_code[key]}')
            seen_code[key]=i+1
        a=timing['inizio'];b=a+timing['durata']
        subs=[(max(a,c['start']),min(b,c['end'])) for c in captions if c['start']<b and c['end']>a]
        coverage=union_length(subs)/timing['durata']
        if coverage<(.8 if short else .01):errors.append(f'scene {i+1}: subtitle coverage {coverage:.3f}')
        wav=folder/'assets/voice'/f'{i+1:02}.wav'
        if wav.exists():onset,end=voice_span(wav)
        elif recorded_voice:
            evidence=json.loads((folder/'voice-measurements.json').read_text(encoding='utf-8'))[i]
            onset,end=evidence['onset'],evidence['end']
        else:
            onset,end=0,0;errors.append(f'scene {i+1}: missing actual voice WAV')
        if short and onset>.3:errors.append(f'scene {i+1}: voice starts at {onset:.3f}s')
        details.append({'scene':i+1,'voiceStart':onset,'voiceEnd':end,'voiceSeconds':end-onset,'captionCoverage':round(coverage,5),'captionStart':min((x[0] for x in subs),default=None),'captionEnd':max((x[1] for x in subs),default=None)})
    # Reconstruct captions per scene, so splitting a banned phrase into four-word
    # subtitle pills cannot hide it from the same text gate.
    for i,timing in enumerate(times['scene']):
        a=timing['inizio'];b=a+timing['durata']
        value=' '.join(c['text'] for c in captions if c['start']>=a-.001 and c['start']<b-.001)
        for e in text_issues(value,True,tool):errors.append(f'scene {i+1} subtitles: {e}')
    voice_percent=round(sum(d['voiceSeconds'] for d in details)/times['totale']*100,3)
    if short and voice_percent<75:errors.append(f'Short voice coverage below 75%: {voice_percent}')
    empty=[]
    if check_frames:
        paths=sorted((folder/'fotogrammi').glob('scena-*.jpg'))
        if len(paths)!=len(plan['scene']):errors.append('missing rendered scene frames')
        band=(1660,1860) if short and plan.get('teaching') else ((1220,1420) if short else (900,1080))
        for i,file in enumerate(paths):
            with Image.open(file) as image:
                percent=background_height(image,band)
                if not caption_visible(image,band):errors.append(f'scene {i+1}: no visible encoded subtitle')
            empty.append({'scene':i+1,'emptyHeightPercent':percent})
            if percent>35:errors.append(f'scene {i+1}: empty background height {percent}% exceeds 35%')
    return {'passed':not errors,'errors':errors,'voiceCoveragePercent':voice_percent,'scenes':details,'background':empty,'maxEmptyHeightPercent':max((x['emptyHeightPercent'] for x in empty),default=None),'measurement':'decoded RGB rows; background calibrated from outer gutters; >2% width with ink/content panels; faint grid excluded; caption band excluded'}

if __name__=='__main__':
    import sys
    result=inspect_video(sys.argv[1])
    print(json.dumps(result,indent=1))
    raise SystemExit(0 if result['passed'] else 1)
