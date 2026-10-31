// Adapted from the registry's flowchart and cathrynlavery/diagram-design:
// sparse semantic nodes, one editorial accent, distinct treatments, orthogonal
// connectors, no shadow, technical monospace only, deterministic one-pass reveal.
// Brand palette/type come from the existing FreeLLMArena video system.
import { C, scena, formatoDi, esc, s3, attacchi } from '../base.mjs';
export default {
  nome:'diagramma',
  soloSkillTutorial:true,
  descrizione:'A documented ordered workflow with three source-backed steps; no inferred relationships',
  schema:'{"titolo":"max 60","nodi":["max 64", "max 64", "max 64"]}',
  valida(d) {
    const e=[];
    if (!d || typeof d.titolo!=='string' || !d.titolo || d.titolo.length>60) e.push('diagram title exceeds 60');
    if (!Array.isArray(d?.nodi) || d.nodi.length!==3 || d.nodi.some(n=>typeof n!=='string'||!n||n.length>64)) e.push('diagram needs three labels of at most 64 characters');
    return e;
  },
  parole(d){return attacchi(d,[['titolo',d.titolo],...d.nodi.map((n,i)=>[`n${i}`,n])]);},
  html({id,px,dati:d,durata,t,etichetta,numero,formato='orizzontale'}) {
    const F=formatoDi(formato), v=formato==='verticale', M=F.margine;
    const widths=v?[880,800,840]:[900,840,880];
    const xs=v?widths.map(w=>(F.W-w)/2):widths.map(w=>F.W-M-w);
    const ys=v?[590,940,1290]:[165,400,635], h=v?340:205;
    const nodes=d.nodi.map((n,i)=>`<div id="${px}n${i}" data-layout-box class="${px}node" style="left:${xs[i]}px;top:${ys[i]}px;width:${widths[i]}px;height:${h}px;border-color:${i===1?C.accento:C.crema2};background:${i===1?C.pannello:C.scuro}">${esc(n)}</div>`).join('');
    const arrows=[0,1].map(i=>{const x1=xs[i]+widths[i]/2,y1=ys[i]+h,x2=xs[i+1]+widths[i+1]/2,y2=ys[i+1],mid=(y1+y2)/2;return `<path id="${px}e${i}" d="M${x1} ${y1} L${x1} ${mid} L${x2} ${mid} L${x2} ${y2-2}" stroke="${C.crema2}" stroke-width="3" fill="none" marker-end="url(#${px}arrow)"/>`;}).join('');
    const corpo=`<div data-content-area style="position:absolute;inset:0"><div id="${px}titolo">${esc(d.titolo)}</div>${d.testo?`<div id="${px}testo">${esc(d.testo)}</div>`:''}<svg data-visual class="${px}edges" viewBox="0 0 ${F.W} ${F.H}"><defs><marker id="${px}arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.crema2}"/></marker></defs>${d.ordine?arrows:''}</svg>${nodes}</div>`;
    const css=`.${px}barra{gap:36px;letter-spacing:.08em}.${px}barra span:first-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100% - 160px);flex:1}.${px}barra span:last-child{white-space:nowrap;flex:none}
      #${px}titolo{position:absolute;top:${v?205:190}px;left:${M}px;width:${v?F.W-2*M:660}px;font-size:${d.apertura?(v?104:110):(v?82:80)}px;line-height:1.1;}
      #${px}testo{position:absolute;top:${v?(d.apertura?520:470):510}px;left:${M}px;width:${v?F.W-2*M:660}px;font-size:${v?46:40}px;line-height:1.2;color:${C.crema2};}
      .${px}edges{position:absolute;inset:0;width:100%;height:100%;}
      .${px}node{position:absolute;display:flex;align-items:center;padding:28px;border:2px solid;border-radius:6px;font:600 ${v?52:44}px/1.18 Arial,sans-serif;overflow-wrap:anywhere;}`;
    // Grouped options are explicitly distinguished from an ordered workflow.
    // Use a single brand accent and orthogonal connectors, as diagram-design.
    let anima=`tl.fromTo(q('#${px}titolo'),{opacity:0,y:16},{opacity:1,y:0,duration:.4,ease:'power3.out'},0);`;
    d.nodi.forEach((_,i)=>{const at=.15+i*.12;anima+=`tl.fromTo(q('#${px}n${i}'),{opacity:0,y:20},{opacity:1,y:0,duration:.4,ease:'power3.out'},${s3(at)});`;if(i&&d.ordine)anima+=`tl.fromTo(q('#${px}e${i-1}'),{opacity:0},{opacity:1,duration:.25},${s3(at)});`;});
    return scena({id,px,durata,etichetta,numero,corpo,css,anima,formato});
  },
};
