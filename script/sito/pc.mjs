// Pagina /ai-pcs: i computer nati per l'AI (richiesta di Marco, 22/10/2026): Mac Studio e MacBook Pro con chip Max o Ultra,
// NVIDIA DGX Spark e le altre macchine GB10, mini PC con AMD Ryzen AI Max+ 395, Mac mini M4 Pro; a confronto un PC con RTX 5090.
// Le macchine stanno in dati/pc.json; memoria e banda vengono da dati/schede.json e le velocità dal simulatore del sito
// (sorgente/calc.mjs), come nelle pagine GPU e RAM. Link Amazon con il tag di affiliazione.
import fs from 'node:fs';
import path from 'node:path';
import { esc, pagina, NOME_PIENO, RADICE, linkAmazon, spiega, barraSezioni, nuovo } from './comune.mjs';
import { simula, daScheda } from '../../sorgente/calc.mjs';
import { barre } from './grafici.mjs';

const CTX = 8192, VELOCE = 10;
const fmtVel = (v) => (v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(0) : (Math.floor(v * 10) / 10).toFixed(1));
const amazon = (q, testo = 'Amazon ↗') => `<a class="tag free amazon" data-q="${esc(q)}" href="${esc(linkAmazon(q))}" rel="sponsored nofollow noopener" target="_blank">${testo}</a>`;

export function paginaPc(dati, modelli, blog) {
  const file = path.join(RADICE, 'dati', 'pc.json');
  if (!fs.existsSync(file)) return;
  const { piattaforme, confronto } = JSON.parse(fs.readFileSync(file, 'utf8'));
  const schede = new Map(dati.schede.schede.map((s) => [s.id, s]));
  // modelli aperti con dimensione nota, dal più votato in chat (come le pagine GPU e RAM)
  const classificati = modelli.filter((m) => m.hf && m.cat?.chat).sort((a, b) => b.cat.chat.punti - a.cat.chat.punti);
  const rif = modelli.find((m) => m.hf?.repo === 'Qwen/Qwen3.8-27B') || classificati.find((m) => m.hf.att === m.hf.b);
  // per una macchina: il miglior modello che scrive almeno a 10 token/s, il più votato a qualsiasi velocità, la velocità sul modello di riferimento
  const misura = (s, ram = 0) => {
    const h = daScheda(s, { n: 1, ram, bandaRam: 96, ctx: CTX });
    let veloce = null, qualsiasi = null;
    for (const m of classificati) {
      const r = simula(m.hf, h);
      if (r.dove === 'no' || !r.vel) continue;
      if (!qualsiasi) qualsiasi = { m, r };
      if (r.vel >= VELOCE) { veloce = { m, r }; break; }
    }
    const sr = rif ? simula(rif.hf, h) : null;
    return { veloce, qualsiasi, rif: sr && sr.dove !== 'no' ? sr : null };
  };
  const righe = piattaforme.map((p) => ({ p, s: schede.get(p.scheda) })).filter((x) => x.s).map((x) => ({ ...x, mis: misura(x.s) }));
  const conf = confronto && schede.get(confronto.scheda) ? { ...confronto, s: schede.get(confronto.scheda), mis: misura(schede.get(confronto.scheda), confronto.ram) } : null;

  const modello = (x) => (x ? `<a class="nome-modello" href="${x.m.href}">${esc(x.m.nome)}</a><div class="org">${x.m.cat.chat.punti} Arena · <b>${fmtVel(x.r.vel)} tok/s</b></div>` : '<span class="muted small">Nothing ranked fits</span>');
  const lento = ({ veloce, qualsiasi }) => (qualsiasi && (!veloce || qualsiasi.m !== veloce.m) ? `<div class="org">Bigger but slow: <a href="${qualsiasi.m.href}">${esc(qualsiasi.m.nome)}</a>, ${qualsiasi.m.cat.chat.punti} Arena, ${fmtVel(qualsiasi.r.vel)} tok/s</div>` : '');

  // grafico: velocità sul modello di riferimento (denso, 27 B), dalla più veloce
  const perGrafico = [...righe, ...(conf ? [{ p: { titolo: conf.titolo }, s: conf.s, mis: conf.mis, confronto: true }] : [])].filter((x) => x.mis.rif).sort((a, b) => b.mis.rif.vel - a.mis.rif.vel);
  const grafico = rif && perGrafico.length ? barre(perGrafico.map((x) => ({ nome: x.confronto ? `${x.s.nome} (PC)` : x.s.nome, valore: Math.round(x.mis.rif.vel), href: x.confronto ? `/gpu/${x.s.id}.html` : `#pc-${x.s.id}`, nota: `${x.s.gb} GB · ${x.s.banda} GB/s`, colore: x.confronto ? 's2' : 's1' })),
    { titoloAsse: 'Tokens per second, estimated', daZero: true, testoColori: 'Blue: AI PCs with unified memory. Orange: a desktop PC with a graphics card, for comparison.' }) : '';

  const pannelli = righe.map(({ p, s, mis }) => `<div class="panel" id="pc-${esc(s.id)}"><h2>${esc(p.titolo)}</h2>
<div class="tiles">
<div class="tile"><span class="small muted">Memory</span><b>${s.gb} GB</b><span class="small muted">${esc(p.memoria)}</span></div>
<div class="tile"><span class="small muted">Memory bandwidth</span><b>${s.banda} GB/s</b><span class="small muted">${esc(p.chip)}</span></div>
<div class="tile"><span class="small muted">Best free model at reading speed</span>${modello(mis.veloce)}${lento(mis)}</div>
</div>
<p class="small">${esc(p.software)}${mis.rif ? ` On ${esc(rif.nome)} (a dense 27 B model) it writes about <b>${fmtVel(mis.rif.vel)} tokens per second</b>.` : ''} <a href="/gpu/${esc(s.id)}.html">Every model it runs →</a></p>
<ul class="pc-prodotti">${p.prodotti.map((x) => `<li><b>${esc(x.nome)}</b><span class="small muted">${esc(x.forma)}</span>${amazon(x.q)}</li>`).join('')}</ul></div>`).join('\n');

  const piuGrande = [...righe].sort((a, b) => b.s.gb - a.s.gb)[0];
  const piuVeloce = [...righe].filter((x) => x.mis.rif).sort((a, b) => b.mis.rif.vel - a.mis.rif.vel)[0];
  pagina({
    file: 'ai-pcs.html', attiva: '/ai-pcs.html', dati, blog, script: 'amazon.js',
    titolo: `Best AI PCs for Local AI: Mac Studio, DGX Spark, Ryzen AI Max · ${NOME_PIENO}`,
    descr: `Computers built for running AI at home, compared: Mac Studio and MacBook Pro, NVIDIA DGX Spark, Ryzen AI Max+ 395 mini PCs. Memory, speed and the best free model each one runs.`,
    corpo: `<div style="display:grid;gap:.4rem">
<h1>AI PCs${nuovo('2026-10-22')}</h1>
<p class="lead">Computers built for AI share one big pool of fast memory between the processor and the graphics chip, so they can hold models far larger than a graphics card. They are quiet and small, but slower than a big graphics card on models that fit in it. Estimates from our simulator.</p>
</div>
<div class="tiles">
${piuGrande ? `<div class="tile"><span class="small muted">Most memory</span><b>${esc(piuGrande.s.nome)}</b><span class="small muted">${piuGrande.s.gb} GB, runs ${piuGrande.mis.qualsiasi ? esc(piuGrande.mis.qualsiasi.m.nome) : 'the biggest models'}</span></div>` : ''}
${piuVeloce ? `<div class="tile"><span class="small muted">Fastest AI PC</span><b>${esc(piuVeloce.s.nome)}</b><span class="small muted">${piuVeloce.s.banda} GB/s, ~${fmtVel(piuVeloce.mis.rif.vel)} tok/s on ${esc(rif.nome)}</span></div>` : ''}
<div class="tile"><span class="small muted">Machines compared</span><b>${righe.reduce((n, x) => n + x.p.prodotti.length, 0)}</b><span class="small muted">${righe.length} platforms: Apple, NVIDIA, AMD</span></div>
</div>
${barraSezioni([['chart', 'Speed'], ...righe.map(({ p, s }) => [`pc-${s.id}`, p.titolo.split(':')[0].replace(/ and .*| with .*/, '')]), ['how', 'How to choose']])}
${grafico ? `<div class="panel" id="chart"><h2>How fast they write</h2>${grafico}${spiega(`Estimated speed on ${esc(rif.nome)}, a dense model with 27 B parameters, at 4-bit with 8K context. The desktop PC has an RTX 5090 and 64 GB of RAM.`, 'Longer bar, faster. Memory bandwidth decides the speed: every word reads the whole model from memory. AI PCs win on size, graphics cards win on speed when the model fits.')}</div>` : ''}
${pannelli}
${conf ? `<div class="panel" id="pc-confronto"><h2>${esc(conf.titolo)}</h2><p>${conf.s.gb} GB on the graphics card, ${conf.s.banda} GB/s, plus ${conf.ram} GB of system RAM. Best free model at reading speed: ${modello(conf.mis.veloce)}</p>${lento(conf.mis)}<p class="small"><a href="/gpu/${esc(conf.s.id)}.html">Every model the ${esc(conf.s.nome)} runs →</a> · <a href="/gpus.html">All graphics cards</a> · <a href="/ram.html">How much RAM</a></p></div>` : ''}
<div class="panel" id="how"><h2>How to choose</h2>
<div class="faq-griglia">
<div class="faq-voce"><h3>Memory decides what fits</h3><p>A model at 4-bit needs about 0.6 GB per billion parameters, plus the context. With unified memory, about three quarters of it can go to the model: 128 GB holds models of about 150 billion parameters, 512 GB even bigger ones.</p></div>
<div class="faq-voce"><h3>Bandwidth decides the speed</h3><p>Every word the model writes reads all its active weights. More GB/s, faster answers. Mixture-of-experts models read only a part of their weights, so they run fast even on big AI PCs.</p></div>
<div class="faq-voce"><h3>Apple, NVIDIA or AMD</h3><p>Macs are silent and simple to set up. GB10 machines like the DGX Spark run the NVIDIA software most AI tools are built for. Ryzen AI Max+ 395 mini PCs are the cheapest way to 128 GB and run Windows or Linux.</p></div>
<div class="faq-voce"><h3>Or a graphics card?</h3><p>If the models you want fit in 24 to 32 GB, a desktop with a big graphics card is faster. Choose an AI PC when you want models that need 64 GB or more. Compare in the <a href="/home.html">Run at home simulator</a>.</p></div>
</div>
<p class="small muted"><b>Affiliate links:</b> as an Amazon Associate, ${NOME_PIENO} earns from qualifying purchases made through the “Amazon ↗” links. The links do not change the order, the numbers or the estimates on this page, and the price is the same for you. Speeds are estimates from our simulator, calibrated on real llama.cpp runs.</p></div>`,
  });
}
