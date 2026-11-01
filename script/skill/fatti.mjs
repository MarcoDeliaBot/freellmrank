import { plain, labelFrom } from './fonti.mjs';

// Read prose as paragraphs, not individual lines. Code fences, YAML and tables
// are examples/metadata, never prose facts. Every result retains its raw quote.
export function extractFacts(card, safe=()=>true) {
  const sources=[...(card.fonti||[])].sort((a,b)=>Number(/README/i.test(a.tipo||''))-Number(/README/i.test(b.tipo||'')));
  const facts=[],seen=new Set();
  for(const source of sources) {
    let fenced=false,heading='Documented workflow',paragraph=[];
    const flush=()=>{
      if(!paragraph.length)return;
      const quote=paragraph.join('\n');paragraph=[];
      const text=plain(quote.replace(/^\s*(?:[-*+] |\d+[.)] |\[[ xX]\]\s*)/gm,''));
      for(const detail of text.split(/(?<=[.!?])\s+(?=[A-Z])/)) {
        const words=detail.split(/\s+/);
        if(words.length<4||words.length>36||detail.length>230||/:$/.test(detail)||/[│─┌└→]|https?:|\$\{|^description:|^name:/i.test(detail))continue;
        // A list item can omit punctuation, but still needs an action/predicate.
        if(!/[.!?]$/.test(detail)&&!/^(?:use|read|write|check|keep|choose|review|create|run|build|test|start|follow|make|avoid|prefer|define|inspect|report|ask|record|measure|verify|add|remove|update|always|never|do|don.t)\b|\b(?:is|are|will|can|should|must|has|have|provides|supports|uses|includes)\b/i.test(detail))continue;
        const voice=/[.!?]$/.test(detail)?detail:detail+'.';
        const key=voice.toLowerCase().replace(/[^a-z0-9]+/g,' ');
        if(seen.has(key)||!safe(voice))continue;
        seen.add(key);
        const label=labelFrom(heading==='Documented workflow'?detail:heading,48);
        facts.push({label,detail,voice,quote,url:source.url});
      }
    };
    const content=source.testo.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/,'');
    for(const line of content.replace(/\r/g,'').split('\n')) {
      if(/^\s*(?:```|~~~)/.test(line)){flush();fenced=!fenced;continue;}
      if(fenced)continue;
      const h=/^#{1,6}\s+(.+)/.exec(line);
      if(h){flush();heading=plain(h[1]);continue;}
      if(!line.trim()||/^\s*(?:\||>|!\[|<|---)/.test(line)){flush();continue;}
      if(/^\s*(?:[-*+] |\d+[.)] )/.test(line))flush();
      paragraph.push(line);
    }
    flush();
  }
  return facts;
}

export function teachingCard(card, safe) {
  if(card.tipo!=='skill')return card;
  const facts=extractFacts(card,safe).filter(f=>plain(card.descr)!==f.detail);
  if(facts.length<3)return card; // Existing gates give the concrete rejection.
  const chosen=facts.slice(0,3);
  const old=new Set((card.features||[]).flatMap(f=>[f.label,f.detail]));
  return {...card,features:chosen.map(({label,detail,quote,url})=>({label,detail,evidence:{quote,url}})),
    claims:[...(card.claims||[]).filter(s=>!old.has(s)),...chosen.flatMap(f=>[f.label,f.detail])]};
}
