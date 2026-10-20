// Pagina /gpus: tutte le schede del catalogo a confronto per gli LLM in casa.
// Memoria, banda, velocità stimata su quattro modelli veri della classifica, il miglior modello gratis che ci sta.
// La tabella è scritta nel file (leggibile da Google); sorgente/gpus.js la ricalcola per 2 o 4 schede.
import { esc, pagina, NOME_PIENO, URL_SITO, linkAmazon, spiega, barraSezioni } from './comune.mjs';
import { barre } from './grafici.mjs';
import { simula, daScheda } from '../../sorgente/calc.mjs';
import { valuta, ordina, celle, massimiDi, COLONNA_PREDEFINITA } from '../../sorgente/gpu-table.mjs';
import { pagineGpu } from './gpu-pagine.mjs';

const CTX = 8192; // contesto delle stime: una chat normale
const RAM = 64; // RAM di sistema per l'offload
// modelli di riferimento, dal più piccolo al più grande (repository Hugging Face)
const RIFERIMENTI = [
  ['google/gemma-4-26B-A4B-it', 'MoE, 4 B active'],
  ['Qwen/Qwen3.8-27B', 'dense'],
  ['google/gemma-4-31B-it', 'dense'],
  ['zai-org/GLM-4.6V', 'MoE, 14 B active'],
];

// cosa cercare su Amazon per ogni scheda (nomi del catalogo troppo vaghi o doppi)
const CERCA = {
  rtx4070: 'RTX 4070 Super graphics card', rx9070xt: 'RX 9070 XT graphics card',
  'm4pro-64': 'Mac mini M4 Pro 64GB', 'm4max-128': 'Mac Studio M4 Max 128GB', 'm3ultra-512': 'Mac Studio M3 Ultra',
  'strixhalo-128': 'Ryzen AI Max+ 395 128GB mini PC', dgxspark: 'NVIDIA DGX Spark',
};
const cercaAmazon = (s) => (s.marca === 'Data center' ? null : CERCA[s.id] || `${s.nome} ${s.marca === 'Workstation' ? 'workstation GPU' : 'graphics card'}`);


export function paginaGpu(dati, modelli, blog) {
  const schede = dati.schede.schede;
  pagineGpu(dati, modelli, blog, { cercaAmazon });
  // modelli aperti con dimensione nota, dal più votato in chat
  const classificati = modelli.filter((m) => m.hf && m.cat.chat).sort((a, b) => b.cat.chat.punti - a.cat.chat.punti);
  const rif = RIFERIMENTI.map(([repo, tipo]) => ({ m: modelli.find((x) => x.hf?.repo === repo), tipo })).filter((r) => r.m);

  // righe in ordine di velocità sul modello denso da 27 B, con la posizione; le schede da centro dati
  // (A100, H100, H200) sono nascoste finché non si sceglie "Data center": nessuno le ha in casa
  const opzioni = { n: 1, ram: RAM, ctx: CTX, rif: rif.map((r) => r.m.hf), classificati };
  const valutate = ordina(schede.map((s) => valuta(s, opzioni)), COLONNA_PREDEFINITA);
  const mostrate = valutate.filter((v) => v.s.marca !== 'Data center');
  const massimi = massimiDi(mostrate, rif.length);
  let pos = 0;
  const righe = valutate.map((v) => {
    const { s } = v;
    const nascosta = s.marca === 'Data center';
    const c = celle(v, massimi);
    return `<tr id="gpu-${esc(s.id)}" data-id="${esc(s.id)}" data-marca="${esc(s.marca)}"${nascosta ? ' hidden' : ''}>
<td class="n c-pos">${nascosta ? '' : ++pos}</td>
<td class="c-nome"><a class="nome-gpu" href="/gpu/${esc(s.id)}.html"><b>${esc(s.nome)}</b></a><br><span class="small muted">${esc(s.marca)}${s.unificata ? ' · shared memory' : ''}</span><br><span class="small c-link"><a href="/home.html?gpu=${encodeURIComponent(s.id)}">Simulate</a>${cercaAmazon(s) ? ` · <a class="tag free amazon" data-q="${esc(cercaAmazon(s))}" href="${esc(linkAmazon(cercaAmazon(s)))}" rel="sponsored nofollow noopener" target="_blank">Amazon ↗</a>` : ''}</span></td>
<td class="n c-gb">${c.gb}</td>
${c.vel.map((x) => `<td class="c-vel">${x}</td>`).join('')}
<td class="n c-max">${c.max}</td>
<td class="c-best">${c.best}</td></tr>`;
  }).join('\n');

  // grafico: velocità sul modello denso di riferimento, solo le schede dove sta tutto in GPU
  const denso = rif.find((r) => r.m.hf.repo === 'Qwen/Qwen3.8-27B') || rif[0];
  const voci = schede.map((s) => ({ s, r: simula(denso.m.hf, daScheda(s, { n: 1, ram: 0, ctx: CTX })) }))
    .filter((x) => x.r.dove === 'gpu').sort((a, b) => b.r.vel - a.r.vel)
    .map((x) => ({ nome: x.s.nome, valore: Math.round(x.r.vel), href: `#gpu-${x.s.id}` }));
  const grafico = voci.length > 2 ? barre(voci, { titoloAsse: `Estimated tokens per second, ${denso.m.nome} at 4-bit` }) : '';

  // nelle tessere: solo schede che si mettono in un PC di casa (niente A100/H100/H200 da centro dati)
  const centroDati = new Set(schede.filter((s) => s.marca === 'Data center').map((s) => s.nome));
  const daCentroDati = (nome) => centroDati.has(nome);
  const piuVeloce = voci.find((v) => !daCentroDati(v.nome));
  const piuMemoria = [...schede].filter((s) => !s.unificata && !daCentroDati(s.nome)).sort((a, b) => b.gb - a.gb)[0];
  const economica = [...schede].filter((s) => !s.unificata && simula(denso.m.hf, daScheda(s, { n: 1, ctx: CTX })).dove === 'gpu').sort((a, b) => a.gb - b.gb || a.banda - b.banda)[0];

  // dati per ricalcolare nel browser (2 o 4 schede, con o senza RAM)
  const perJs = {
    ctx: CTX, ram: RAM, schede,
    rif: rif.map((r) => ({ hf: r.m.hf })),
    classificati: classificati.slice(0, 80).map((m) => ({ nome: m.nome, href: m.href, punti: m.cat.chat.punti, hf: m.hf })),
  };

  const domande = [
    ['How much GPU memory do I need for a local LLM?', `At 4-bit, a model needs about 0.6 GB per billion parameters, plus the context cache and about 1 GB for the runtime. A 8 B model fits in 8 GB, a 27–32 B model needs about 20–24 GB, a 70 B model needs about 45 GB (two 24 GB cards). The “Largest model” column does this sum for each card at ${CTX / 1024}K context.`],
    ['Why does memory bandwidth matter more than raw compute?', 'When a model writes, every new word reads all the active weights from memory once. So speed is roughly bandwidth divided by the size of the active weights. That is why an RTX 3090 (936 GB/s) still writes faster than many newer mid-range cards.'],
    ['Is a used RTX 3090 still worth it for AI?', 'For local LLMs it is often the best value: 24 GB and high bandwidth. It uses a lot of power (350 W) and has no warranty when bought used. Check the price against a new 16 GB card: 16 GB is not enough for 27–32 B models at 4-bit with a useful context.'],
    ['NVIDIA, AMD or Apple?', 'NVIDIA has the widest software support (CUDA). AMD cards work well with llama.cpp, Ollama and LM Studio (ROCm or Vulkan) and often give more memory for the money. Apple Silicon and AMD Ryzen AI Max machines share memory between CPU and GPU, so they can load very large models, but they write more slowly than a big desktop GPU.'],
    ['Two cards or one bigger card?', 'Two cards add up their memory, so a 70 B model fits on two 24 GB cards. Speed does not double: the cards take turns, so you get about the speed of one card, a little less. Choose “2 cards” above to see the numbers.'],
    ['How accurate are these speeds?', 'They are estimates: memory bandwidth × 78% ÷ data read per word, plus a fixed cost per word (about 1 ms, 2.8 ms for mixture-of-experts models, more on Apple), at 4-bit (Q4_K_M) with an 8K context. We checked the formula against 44 real llama.cpp tests: the median error is 9%, and 42 of 44 are within ±30%. Real numbers also depend on the software version, drivers (on AMD, Vulkan is often faster than ROCm) and settings. Use them to compare cards, not as exact figures.'],
  ];

  pagina({
    file: 'gpus.html', attiva: '/gpus.html', dati, blog, script: 'gpus.js',
    titolo: `Best GPU for Local LLMs: ${schede.length} Cards Compared (Memory, Speed) · ${NOME_PIENO}`,
    descr: `${schede.length} graphics cards and AI computers compared for running AI models at home: memory, bandwidth, estimated speed on real models, and the best free model each one can run.`,
    jsonld: [
      { '@type': 'ItemList', name: 'GPUs for local AI models', numberOfItems: schede.length, itemListElement: schede.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.nome, url: `${URL_SITO}/gpus#gpu-${s.id}` })) },
      { '@type': 'FAQPage', mainEntity: domande.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
    corpo: `<div style="display:grid;gap:.4rem">
<h1>GPUs for local AI, compared</h1>
<p class="lead">How much memory each card has, how fast it writes with real open models, and the best free model it can run. ${schede.length} graphics cards and AI computers.</p>
</div>
<div class="tiles">
${piuVeloce ? `<div class="tile"><span class="small muted">Fastest card for a home PC</span><b>${esc(piuVeloce.nome)}</b><span class="small muted">~${piuVeloce.valore} tokens/s on ${esc(denso.m.nome)}</span></div>` : ''}
${economica ? `<div class="tile"><span class="small muted">Smallest card for 27 B models</span><b>${esc(economica.nome)}</b><span class="small muted">${economica.gb} GB runs ${esc(denso.m.nome)} fully on the GPU</span></div>` : ''}
${piuMemoria ? `<div class="tile"><span class="small muted">Most memory on one card</span><b>${esc(piuMemoria.nome)}</b><span class="small muted">${piuMemoria.gb} GB</span></div>` : ''}
<div class="tile"><span class="small muted">Cards compared</span><b>${schede.length}</b><span class="small muted">NVIDIA, AMD, Intel, Apple and AI mini PCs</span></div>
</div>
${barraSezioni([['cards', 'All cards'], ['speed', 'Speed chart'], ['faq', 'Questions']])}
<div class="panel" id="cards">
<h2>All cards</h2>
<div class="row gpu-filtri">
<label class="small">How many cards <select id="g-quante">${[1, 2, 4].map((n) => `<option value="${n}">${n}</option>`).join('')}</select></label>
<label class="small"><input type="checkbox" id="g-ram" checked> Use ${RAM} GB of system RAM when the GPU is full</label>
<span class="tabs" role="group" aria-label="Brand">${['All', ...new Set(schede.map((s) => s.marca))].map((m, i) => `<button type="button" aria-pressed="${i ? 'false' : 'true'}" data-marca="${esc(m)}">${m === 'All' ? 'All for home and office' : esc(m)}</button>`).join('')}</span>
</div>
<p class="small muted gpu-aiuto">Ranked by speed on ${esc(denso.m.nome)}. The four model columns are <b>tokens per second</b>: higher is faster, and about 10 is reading speed. Click a column title to sort by it. No graphics card? See <a href="/phone.html">AI models on your phone</a>.</p>
<div class="tw"><table class="gpu-tabella">
<thead><tr><th>#</th><th>GPU</th><th data-ordina="gb" data-etichetta="Memory">Memory<br><span class="th-sub">and bandwidth</span></th>${rif.map((r, i) => `<th data-ordina="v${i}" data-etichetta="${esc(r.m.nome)}"${`v${i}` === COLONNA_PREDEFINITA ? ' aria-sort="descending"' : ''}><a href="${r.m.href}">${esc(r.m.nome)}</a><br><span class="th-sub">${esc(r.tipo)}</span></th>`).join('')}<th data-ordina="max" data-etichetta="Largest model">Largest model<br><span class="th-sub">dense, 4-bit</span></th><th>Best free model that fits</th></tr></thead>
<tbody>
${righe}
</tbody></table></div>
<p class="small muted">Estimates at 4-bit (Q4_K_M), ${CTX / 1024}K context. Speed ≈ memory bandwidth × 78% ÷ data read per token, plus a fixed cost per token, calibrated on 44 real llama.cpp tests (<a href="https://github.com/MarcoDeliaBot/freellmrank/blob/main/dati/misure-velocita.json" rel="noopener">list with sources</a>); typical error about ±10%. “+RAM”: part of the model sits in system memory, which is much slower. Unified memory (Apple, Ryzen AI Max, DGX Spark): about 75% can be used by the GPU. “Best free model that fits”: the highest Arena chat score among open models that fit entirely in GPU memory.</p>
<p class="small muted"><b>Affiliate links:</b> as an Amazon Associate, ${NOME_PIENO} earns from qualifying purchases made through the “Amazon ↗” links. The links do not change the order, the numbers or the estimates on this page, and the price is the same for you.</p>
</div>
${grafico ? `<div class="panel" id="speed"><h2>Speed on ${esc(denso.m.nome)}</h2>${grafico}${spiega(`Estimated words per second for ${esc(denso.m.nome)}, a 28 B model, at 4-bit, on every card where it fits fully in GPU memory.`, 'Longer bar, faster card. About 10 tokens per second is reading speed. Cards missing from the chart cannot hold this model alone: see the table above for how they do with system RAM.')}</div>` : ''}
<div class="panel" id="faq"><h2>Questions</h2>
${domande.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}
</div>
<script type="application/json" id="gpu-data">${JSON.stringify(perJs).replace(/</g, '\\u003c')}</script>`,
  });
}
