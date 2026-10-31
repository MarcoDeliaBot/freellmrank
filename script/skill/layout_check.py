# Browser function shared by frame QA and regression tests. Glyphs may extend
# beyond a line box when overflow is visible; check actual text ranges and clips.
CHECK_LAYOUT = r'''({w,limit}) => [...document.querySelectorAll('[id$="palco"] *')].filter(e=>!e.children.length && e.textContent.trim() && !e.closest('svg')).flatMap(e=>{
  const style=getComputedStyle(e);
  if(style.display==='none')return [];
  const range=document.createRange();range.selectNodeContents(e);
  const text=range.getBoundingClientRect(),box=e.getBoundingClientRect();
  let problem=text.left<-.5 || text.right>w+.5 || text.top<-.5 || text.bottom>limit+.5;
  if(e.hasAttribute('data-layout-box') && (text.left<box.left-.5 || text.right>box.right+.5 || text.top<box.top-.5 || text.bottom>box.bottom+.5))problem=true;
  for(let parent=e;parent;parent=parent.parentElement){
    const css=getComputedStyle(parent),b=parent.getBoundingClientRect();
    if(/hidden|clip|auto|scroll/.test(css.overflowX) && (text.left<b.left-.5||text.right>b.right+.5))problem=true;
    if(/hidden|clip|auto|scroll/.test(css.overflowY) && (text.top<b.top-.5||text.bottom>b.bottom+.5))problem=true;
  }
  return problem ? [{text:e.textContent,box:{x:box.x,y:box.y,w:box.width,h:box.height},ink:{x:text.x,y:text.y,w:text.width,h:text.height}}] : [];
})'''

TEXT_REGIONS = r'''() => [...document.querySelectorAll('[id$="palco"] *')].filter(e=>!e.children.length && e.textContent.trim() && !e.closest('svg') && getComputedStyle(e).display!=='none').map(e=>{
 const range=document.createRange();range.selectNodeContents(e);const b=range.getBoundingClientRect();return {text:e.textContent,x:b.x,y:b.y,w:b.width,h:b.height};
})'''


def missing_text(image, regions):
    """Check for the existing templates' cream/green ink in each text region.

    Source/DOM checks validate the words. This separate pixel gate detects empty
    encoded slides, missing fonts or invisible fields; it does not claim OCR.
    """
    import math
    missing=[]
    for region in regions:
        x,y=region['x'],region['y']
        area=image.crop((max(0,math.floor(x)-1),max(0,math.floor(y)-1),min(image.width,math.ceil(x+region['w'])+1),min(image.height,math.ceil(y+region['h'])+1))).convert('RGB')
        ink=0
        pixels=area.get_flattened_data() if hasattr(area,'get_flattened_data') else area.getdata()
        for red,green,blue in pixels:
            if min(red,green,blue)>165 or (green>160 and red>60 and blue>70):
                ink+=1
                if ink>=12: break
        if ink<12: missing.append(region['text'])
    return missing

# Composition quality is evaluated within the content-safe region, excluding
# YouTube overlays and captions. It measures occupied semantic regions, not the
# whole background or decorative full-screen SVG boxes.
CHECK_QUALITY = r'''({w,limit,opening=false}) => {
 const issues=[],root=document.querySelector('[id$="palco"]');if(!root)return ['missing stage'];
 const header=root.querySelector('[id$="barra"]'),spans=header?[...header.children]:[];
 if(spans.length===2){
  const [label,counter]=spans.map(e=>e.getBoundingClientRect());
  const range=document.createRange();range.selectNodeContents(spans[0]);
  const rects=[...range.getClientRects()];
  if(rects.length>1||spans[0].scrollWidth>spans[0].clientWidth+1)issues.push('label wraps or truncates');
  if(label.right+24>counter.left)issues.push('label touches counter');
 }
 const leaves=[...root.querySelectorAll('*')].filter(e=>!e.children.length&&e.textContent.trim()&&!e.closest('svg')&&!e.closest('[id$="barra"]'));
 const norm=t=>t.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const seen=new Set();
 for(const e of leaves){const t=norm(e.textContent);if(t.length>12&&seen.has(t))issues.push('repeated on-screen text');seen.add(t);}
 const rects=leaves.map(e=>({e,b:e.getBoundingClientRect()})).filter(x=>x.b.width>0&&x.b.top>=140&&x.b.bottom<=limit+1);
 const media=document.querySelector('[id$="cornice"] img,[id$="cornice"] video');
 if(media)rects.push({e:media,b:media.getBoundingClientRect()});
 if(w===1080){
  for(const {e} of rects)if(e!==media&&parseFloat(getComputedStyle(e).fontSize)<44)issues.push('Short font below 44px');
  const title=root.querySelector('[id$="titolo"]');if(opening&&title&&parseFloat(getComputedStyle(title).fontSize)<100)issues.push('problem font below 100px');
 }
 if(rects.length){
  const minY=Math.min(...rects.map(x=>x.b.top)),maxY=Math.max(...rects.map(x=>x.b.bottom));
  const minX=Math.min(...rects.map(x=>x.b.left)),maxX=Math.max(...rects.map(x=>x.b.right));
  // Large opening typography and repository cards can use less height. Feature
  // slides must fill a substantial part of the safe teaching region.
  const coverage=(maxX-minX)*(maxY-minY)/(w*(limit-150));
  const center=(minY+maxY)/2;
  if(coverage<(opening?.11:.19))issues.push('too much empty safe area');
  if(w===1080&&(center<430||center>limit-180))issues.push('content not centered in Short safe area');
 }else issues.push('no visible content');
 if(!opening&&!root.querySelector('[data-visual]')&&!media)issues.push('missing visual element');
 return [...new Set(issues)];
}'''
