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
    if(!d?.apertura&&!d?.comando&&!d?.elementi?.length)e.push('visual code or fact panel required');
    return e;
  },
  parole(d){return attacchi(d,[['titolo',d.titolo],['testo',d.testo],['comando',d.comando],...(d.elementi||[]).map((s,i)=>[`e${i}`,s])]);},
  html({id,px,dati:d,durata,t,etichetta,numero,formato='orizzontale'}) {
    const F=formatoDi(formato),v=formato==='verticale',opening=d.apertura;
    const codeLines=(d.comando||'').split('\n').length;
    const codeSize=v?(codeLines>7?36:42):(codeLines>7?32:38);
    const css=`#${px}slide{position:absolute;left:${F.margine}px;right:${F.margine}px;top:${v?185:158}px;height:${v?960:660}px;display:flex;flex-direction:column;justify-content:center;gap:${v?40:30}px;}
      #${px}titolo{font-size:${opening?(v?120:126):(v?78:78)}px;font-weight:600;line-height:1.06;overflow-wrap:anywhere;}
      #${px}testo{font:400 ${v?44:40}px/1.22 'Source Serif 4',Georgia,serif;color:${C.crema2};}
      #${px}visual{position:relative;display:flex;flex-direction:${v?'column':'row'};gap:32px;}
      #${px}visual::before{content:'';position:absolute;${v?'top:0;bottom:0;left:24px;width:2px':'left:0;right:0;top:24px;height:2px'};background:${C.accento};}
      .${px}fact{position:relative;flex:1;min-width:0;margin-${v?'left':'top'}:24px;padding:${v?32:28}px;border:2px solid ${C.accento};background:${C.scuro};font:500 ${v?46:38}px/1.18 'Source Serif 4',Georgia,serif;overflow-wrap:anywhere;}
      #${px}comando{font:500 ${codeSize}px/1.28 'JetBrains Mono',monospace;white-space:break-spaces;overflow-wrap:anywhere;word-break:break-word;tab-size:2;padding:32px;border:2px solid ${C.accento};border-radius:6px;background:${C.scuro};color:${C.crema};}`;
    const corpo=`<div id="${px}slide" data-content-area><div id="${px}titolo">${esc(d.titolo)}</div>${d.testo?`<div id="${px}testo">${esc(d.testo)}</div>`:''}${d.comando?`<pre id="${px}comando" data-visual>${esc(d.comando)}</pre>`:''}${d.elementi?.length?`<div id="${px}visual" data-visual>${d.elementi.map((s,i)=>`<div class="${px}fact" id="${px}e${i}">${esc(s)}</div>`).join('')}</div>`:''}</div>`;
    const keys=['titolo','testo','comando',...(d.elementi||[]).map((_,i)=>`e${i}`)].filter(k=>d[k]||k.startsWith('e'));
    const anima=keys.map((k,i)=>`tl.fromTo(q('#${px}${k}'),{opacity:0,y:24},{opacity:1,y:0,duration:.32,ease:'power3.out'},${s3(Math.min(i*.12,.45))});`).join('\n');
    // Only these specialized slides override the shared header, leaving news unchanged.
    const header=`.${px}barra{gap:36px;letter-spacing:.08em;font-size:${v?26:28}px}.`+`${px}barra span:first-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100% - 160px);flex:1}.`+`${px}barra span:last-child{white-space:nowrap;flex:none}`;
    return scena({id,px,durata,etichetta,numero,css:header+css,corpo,anima,formato});
  },
};
