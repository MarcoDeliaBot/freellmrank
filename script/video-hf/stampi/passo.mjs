// Editorial command/teaching slide, shared by skills and tutorials.
import { C, scena, formatoDi, esc, s3, attacchi } from '../base.mjs';
export default {
  nome: 'passo',
  descrizione: 'A source-backed explanation or exact command, readable in both formats',
  schema: '{"titolo":"max 72","testo":"max 360","comando":"optional exact command, max 180"}',
  valida(d) {
    const e=[];
    for (const [k,max,required] of [['titolo',72,true],['testo',360,false],['comando',180,false]]) {
      if ((required && !d?.[k]) || (d?.[k] != null && (typeof d[k] !== 'string' || d[k].length > max))) e.push(`${k}: missing or exceeds ${max}`);
    }
    if (!d?.testo && !d?.comando) e.push('explanation or command required');
    return e;
  },
  parole(d) { return attacchi(d,[['titolo',d.titolo],['testo',d.testo],['comando',d.comando]]); },
  html({id,px,dati:d,durata,t,etichetta,numero,formato='orizzontale'}) {
    const F=formatoDi(formato), v=formato==='verticale';
    const css=`#${px}slide{position:absolute;left:${F.margine}px;right:${F.margine}px;top:${v?190:165}px;max-height:${v?950:675}px;}
      #${px}titolo{font-size:${v?74:84}px;font-weight:500;line-height:1.08;overflow-wrap:anywhere;}
      #${px}testo{font-size:${v?43:48}px;line-height:1.22;margin-top:38px;overflow-wrap:anywhere;white-space:pre-line;color:${C.crema2};}
      #${px}comando{font:500 ${v?39:44}px/1.3 'JetBrains Mono',monospace;white-space:pre-wrap;overflow-wrap:anywhere;margin-top:42px;padding:30px;border:2px solid ${C.accento};border-radius:6px;background:${C.scuro};color:${C.crema};}`;
    const corpo=`<div id="${px}slide"><div id="${px}titolo">${esc(d.titolo)}</div>${d.testo?`<div id="${px}testo">${esc(d.testo)}</div>`:''}${d.comando?`<pre id="${px}comando">${esc(d.comando)}</pre>`:''}</div>`;
    // Commands are visible from the start of their scene for the full reading window.
    const anima=['titolo','testo','comando'].filter(k=>d[k]).map((k,i)=>`tl.fromTo(q('#${px}${k}'),{opacity:0,y:24},{opacity:1,y:0,duration:0.35,ease:'power3.out'},${s3(k==='comando'?0.12:Math.min(t(k,i*.2),.5))});`).join('\n');
    return scena({id,px,durata,etichetta,numero,css,corpo,anima,formato});
  },
};
