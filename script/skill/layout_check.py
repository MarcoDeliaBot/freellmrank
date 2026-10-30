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
