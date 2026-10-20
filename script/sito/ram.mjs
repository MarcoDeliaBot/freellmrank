// Pagina /ram: quanta RAM di sistema serve per far girare modelli più grandi della scheda video (richiesta di Marco, 20/10/2026).
// Per ogni kit (dati/ram.json) il simulatore del sito (sorgente/calc.mjs) trova il miglior modello gratis di chat che gira
// con una RTX 3060 12 GB e con una RTX 4090 24 GB, e la sua velocità stimata. Link Amazon con il tag di affiliazione.
import fs from 'node:fs';
import path from 'node:path';
import { esc, pagina, NOME_PIENO, RADICE, linkAmazon, spiega, barraSezioni, nuovo } from './comune.mjs';
import { simula, daScheda } from '../../sorgente/calc.mjs';
import { barre } from './grafici.mjs';

const CTX = 8192;
const SCHEDE = ['rtx3060-12', 'rtx4090'];
const fmtVel = (v) => (v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(0) : v.toFixed(1));

export function paginaRam(dati, modelli, blog) {
  const file = path.join(RADICE, 'dati', 'ram.json');
  if (!fs.existsSync(file)) return;
  const { kit } = JSON.parse(fs.readFileSync(file, 'utf8'));
  const schede = SCHEDE.map((id) => dati.schede.schede.find((s) => s.id === id)).filter(Boolean);
  // modelli aperti con dimensione nota, dal più votato in chat (come la pagina GPU)
  const classificati = modelli.filter((m) => m.hf && m.cat?.chat).sort((a, b) => b.cat.chat.punti - a.cat.chat.punti);
  const banda = (k) => Math.round((k.mts * 8 * k.canali) / 1000);
  // con scheda + RAM: il miglior modello che scrive almeno alla velocità di lettura (10 tok/s) e il migliore a qualsiasi velocità
  const VELOCE = 10;
  const migliore = (s, k) => {
    const h = daScheda(s, { n: 1, ram: k.gb, bandaRam: banda(k), ctx: CTX });
    let qualsiasi = null, veloce = null;
    for (const m of classificati) {
      const r = simula(m.hf, h);
      if (r.dove === 'no' || !r.vel) continue;
      if (!qualsiasi) qualsiasi = { m, r };
      if (r.vel >= VELOCE) { veloce = { m, r }; break; }
    }
    return { veloce, qualsiasi };
  };
  const solo = schede.map((s) => migliore(s, { gb: 0, mts: 0, canali: 0 }));
  const righe = kit.map((k) => ({ k, b: banda(k), per: schede.map((s) => migliore(s, k)) }));

  const riga1 = (x) => `<a class="nome-modello" href="${x.m.href}">${esc(x.m.nome)}</a><div class="org">${x.m.cat.chat.punti} Arena · <b>${fmtVel(x.r.vel)} tok/s</b> · ${x.r.dove === 'gpu' ? 'fully on the GPU' : 'GPU + RAM'}</div>`;
  const cella = ({ veloce, qualsiasi }) => {
    if (!qualsiasi) return '<span class="muted small">Nothing ranked fits</span>';
    const lento = qualsiasi && (!veloce || qualsiasi.m !== veloce.m) ? `<div class="org">Bigger but slow: <a href="${qualsiasi.m.href}">${esc(qualsiasi.m.nome)}</a>, ${qualsiasi.m.cat.chat.punti} Arena, ${fmtVel(qualsiasi.r.vel)} tok/s</div>` : '';
    return (veloce ? riga1(veloce) : '<span class="muted small">Nothing at reading speed</span>') + lento;
  };
  const tabella = `<div class="tw"><table><thead><tr><th>RAM kit</th><th>Type</th><th>Speed</th><th>Bandwidth</th>${schede.map((s) => `<th data-etichetta="With ${esc(s.nome)}">Best free model at reading speed, with ${esc(s.nome)}</th>`).join('')}<th>Buy</th></tr></thead><tbody>
<tr class="ram-base"><td class="m"><b>No extra RAM</b><div class="org">the card alone</div></td><td>—</td><td>—</td><td>—</td>${solo.map((x) => `<td>${cella(x)}</td>`).join('')}<td></td></tr>
${righe.map(({ k, b, per }) => `<tr id="ram-${esc(k.id)}"><td class="m"><b>${k.gb} GB</b><div class="org">${esc(k.moduli)} · ${esc(k.formato)}</div>${k.nota ? `<div class="org">${esc(k.nota)}</div>` : ''}</td>
<td><span class="tag ${k.tipo === 'DDR5' ? 'home' : 'api'}">${esc(k.tipo)}</span></td><td class="n">${k.mts} MT/s</td><td class="n">${b} GB/s</td>
${per.map((x) => `<td>${cella(x)}</td>`).join('')}
<td><a class="tag free amazon" data-q="${esc(k.q)}" href="${esc(linkAmazon(k.q))}" rel="sponsored nofollow noopener" target="_blank">Amazon ↗</a></td></tr>`).join('\n')}
</tbody></table></div>`;

  // grafico: sulla RTX 3060 12 GB, la velocità del miglior modello veloce per ogni kit da desktop (si vede DDR4 contro DDR5)
  const i3060 = schede.findIndex((s) => s.id === 'rtx3060-12');
  const desk = righe.filter(({ k, per }) => k.formato === 'Desktop' && per[i3060]?.veloce);
  const modello3060 = desk[0]?.per[i3060].veloce.m;
  const grafico = i3060 >= 0 && desk.length ? barre(desk.map(({ k, per }) => ({ nome: `${k.gb} GB ${k.tipo}-${k.mts}`, valore: Math.round(per[i3060].veloce.r.vel), href: `#ram-${k.id}`, nota: per[i3060].veloce.m.nome, colore: k.tipo === 'DDR5' ? 's1' : 's2' })),
    { titoloAsse: 'Tokens per second, estimated', daZero: true, testoColori: 'Blue: DDR5. Orange: DDR4. The note on each bar names the model.' }) : '';

  const r3060 = i3060 >= 0 ? righe.find(({ k }) => k.id === 'ddr5-32')?.per[i3060]?.veloce : null;
  pagina({
    file: 'ram.html', attiva: '/ram.html', dati, blog, script: 'amazon.js',
    titolo: `How Much RAM for Local AI? Best Free Models by RAM Kit · ${NOME_PIENO}`,
    descr: `How much system RAM you need to run bigger free AI models at home, with ${kit.length} RAM kits, memory bandwidth and the best model each one runs with an RTX 3060 or 4090.`,
    corpo: `<div style="display:grid;gap:.4rem">
<h1>RAM for local AI${nuovo('2026-10-20')}</h1>
<p class="lead">When a model does not fit in your graphics card, the rest goes into system RAM. With 32 GB, even a 12 GB card runs one of the best free chat models at a good speed. Past 64 GB, chat gets better only with giant models that write slowly. Estimates from our simulator.</p>
</div>
<div class="tiles">
<div class="tile"><span class="small muted">For chat, enough is</span><b>32 to 64 GB DDR5</b><span class="small muted">${r3060 ? `RTX 3060 12 GB + 32 GB: ${esc(r3060.m.nome)}, ~${fmtVel(r3060.r.vel)} tok/s` : '2 modules, 6000 MT/s'}</span></div>
<div class="tile"><span class="small muted">What matters</span><b>Size, then speed</b><span class="small muted">GB decide what fits, GB/s decide how fast</span></div>
<div class="tile"><span class="small muted">Kits compared</span><b>${kit.length}</b><span class="small muted">desktop and laptop, DDR4 and DDR5</span></div>
</div>
${barraSezioni([['chart', 'Chart'], ['table', 'All kits'], ['how', 'How it works']])}
${grafico ? `<div class="panel" id="chart"><h2>RAM speed matters: a 12 GB card plus RAM</h2>${grafico}${spiega(`Estimated speed of the best free chat model that writes at reading speed on an RTX 3060 12 GB plus each desktop RAM kit${modello3060 ? ` (${esc(modello3060.nome)}, a mixture-of-experts model that does not fit in 12 GB alone)` : ''}.`, 'Longer bar, faster. DDR5 bars are longer than DDR4 ones because the part of the model in RAM is read faster. Four-module kits run at lower MT/s, so they are a little slower than two-module kits.')}</div>` : ''}
<div class="panel" id="table"><h2>Every kit: what it lets you run</h2>${tabella}
<p class="small muted">Best free model at reading speed: the highest-voted free chat model on Arena that fits in the card plus 80% of the RAM, at 4-bit with 8K context, and writes at least 10 tokens per second. “Bigger but slow”: a higher-voted model that also fits but writes slower. Speed: estimated tokens per second from our simulator, calibrated on 44 real llama.cpp runs. Bandwidth: MT/s × 8 bytes × 2 channels.</p>
<p class="small muted"><b>Affiliate links:</b> as an Amazon Associate, ${NOME_PIENO} earns from qualifying purchases made through the “Amazon ↗” links. The links do not change the order, the numbers or the estimates on this page, and the price is the same for you.</p></div>
<div class="panel" id="how"><h2>How system RAM helps</h2>
<div class="faq-griglia">
<div class="faq-voce"><h3>Size decides what fits</h3><p>A model at 4-bit needs about 0.6 GB per billion parameters, plus the context. If your card has 24 GB and the model needs 60 GB, the other 36 GB must fit in RAM. We count only 80% of the RAM as usable, because the system and your apps need the rest.</p></div>
<div class="faq-voce"><h3>Speed decides if it is usable</h3><p>Every word the model writes reads all its active weights. The part in RAM is read at RAM speed: dual-channel DDR5-6000 gives about 96 GB/s, against about 1,000 GB/s on an RTX 4090. So the more of the model sits in RAM, the slower it writes.</p></div>
<div class="faq-voce"><h3>Mixture-of-experts models love RAM</h3><p>MoE models (for example Qwen3-30B-A3B) use only a few billion parameters for each word. They can sit mostly in RAM and still write fast, which is why a big RAM kit plus a mid-range card can run surprisingly large models.</p></div>
<div class="faq-voce"><h3>Two modules, not four</h3><p>Home PCs have two memory channels. Two big modules usually run at full speed; four modules often run slower, and some boards limit the total. Check your motherboard's supported memory list before buying.</p></div>
</div>
<p class="small">Want your exact setup? Use the <a href="/home.html">Run at home simulator</a>: pick your card, your RAM and a model. Choosing a card first? See <a href="/gpus.html">GPUs for local AI</a>.</p></div>`,
  });
}
