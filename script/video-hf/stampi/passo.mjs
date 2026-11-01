// Source-backed teaching slide: centered content and a visible code/fact panel.
import { C, scena, formatoDi, esc, s3, attacchi } from '../base.mjs';
export default {
  nome:'passo',soloSkillTutorial:true,
  descrizione:'Centered teaching card, exact code example or large opening question',
  schema:'{"titolo":"max 72","testo":"max 220","comando":"optional max 620","elementi":["up to 3 exact facts"],"apertura":false}',
  valida(d) {
    const e=[];
    for(const [k,max,required] of [['titolo',72,true],['testo',220,false],['comando',620,false]])
      if((required&&!d?.[k])||(d?.[k]!=null&&(typeof d[k]!=='string'||d[k].length>max)))e.push(`${k}: missing or exceeds ${max}`);
    if(d?.elementi&&(!Array.isArray(d.elementi)||d.elementi.length>3||d.elementi.some(s=>typeof s!=='string'||s.length>180)))e.push('invalid visual facts');
    if(!d?.apertura&&!d?.comando&&!d?.elementi?.length&&!d?.link)e.push('visual code or fact panel required');
    return e;
  },
  parole(d){return attacchi(d,[['titolo',d.titolo],['testo',d.testo],['comando',d.comando],...(d.elementi||[]).map((s,i)=>[`e${i}`,s])]);},
  html({id,px,dati:d,durata,t,etichetta,numero,formato='orizzontale'}) {
    const F=formatoDi(formato),v=formato==='verticale',opening=d.apertura;
    const size=v?54:34;
    const css=`#${px}slide{position:absolute;left:${F.margine}px;right:${F.margine}px;top:${v?205:155}px;height:${v?1410:685}px;display:${v||d.link?'flex':'grid'};${v||d.link?'flex-direction:column;justify-content:center;':'grid-template-columns:42% 1fr;align-items:stretch;'}gap:${v?34:40}px;}
      #${px}intro{display:flex;flex-direction:column;justify-content:center;gap:${v?34:32}px;}
      #${px}titolo{font-size:${opening?(v?116:108):(v?82:76)}px;font-weight:600;line-height:1.06;overflow-wrap:anywhere;}
      #${px}testo{font:400 ${v?46:40}px/1.22 'Source Serif 4',Georgia,serif;color:${C.crema2};}
      #${px}risultato{padding:${v?42:32}px;border:2px solid ${C.crema2};background:${C.pannello};font:500 ${v?50:42}px/1.24 'Source Serif 4',Georgia,serif;min-height:${v?390:290}px;display:flex;align-items:center;}
      #${px}comando{font:500 ${size}px/1.3 'JetBrains Mono',monospace;white-space:break-spaces;overflow-wrap:anywhere;word-break:break-word;tab-size:2;padding:${v?42:28}px;border:2px solid ${C.accento};border-radius:6px;background:${C.scuro};color:${C.crema};min-height:${v?680:0}px;display:flex;align-items:center;}
      #${px}link{font:500 ${v?54:74}px/1.35 'JetBrains Mono',monospace;overflow-wrap:anywhere;padding:${v?52:60}px;border:2px solid ${C.accento};background:${C.scuro};min-height:${v?1150:570}px;display:flex;align-items:center;}`;
    const result=d.risultato?`<div id="${px}risultato" data-visual>${esc(d.risultato)}</div>`:'';
    const intro=`<div id="${px}intro"><div id="${px}titolo">${esc(d.titolo)}</div>${d.testo&&!d.link?`<div id="${px}testo">${esc(d.testo)}</div>`:''}${!v?result:''}</div>`;
    const facts=(d.elementi||[]).map((value,i)=>`<blockquote id="${px}e${i}" data-visual style="padding:${v?48:42}px;border:2px solid ${C.accento};background:${C.scuro};min-height:${v?1100:600}px;display:flex;align-items:center;font:400 ${v?58:48}px/1.3 'Source Serif 4',Georgia,serif">${esc(value)}</blockquote>`).join('');
    const corpo=`<div id="${px}slide" data-content-area>${intro}${d.link?`<div id="${px}link" data-visual>${esc(d.testo)}</div>`:''}${d.comando?`<pre id="${px}comando" data-visual>${esc(d.comando)}</pre>`:''}${facts}${v?result:''}</div>`;
    const keys=['titolo',...(!d.link&&d.testo?['testo']:[]),...(d.comando?['comando']:[]),...(d.risultato?['risultato']:[]),...(d.link?['link']:[]),...(d.elementi||[]).map((_,i)=>`e${i}`)];
    const anima=keys.map((k,i)=>`tl.fromTo(q('#${px}${k}'),{opacity:0,y:20},{opacity:1,y:0,duration:.3,ease:'power3.out'},${s3(Math.min(i*.1,.3))});`).join('\n');
    const header=`.${px}barra{gap:36px;letter-spacing:.08em;font-size:${v?26:28}px}.${px}barra span:first-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100% - 160px);flex:1}.${px}barra span:last-child{white-space:nowrap;flex:none}`;
    return scena({id,px,durata,etichetta,numero,css:header+css,corpo,anima,formato});
  },
};
