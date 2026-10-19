// Pagina /gpus: tutte le schede del catalogo a confronto per gli LLM in casa.
// Memoria, banda, velocità stimata su quattro modelli veri della classifica, il miglior modello gratis che ci sta.
// La tabella è scritta nel file (leggibile da Google); sorgente/gpus.js la ricalcola per 2 o 4 schede.
import { esc, pagina, NOME_PIENO, URL_SITO } from './comune.mjs';
import { barre } from './grafici.mjs';
import { simula, daScheda } from '../../sorgente/calc.mjs';

const CTX = 8192; // contesto delle stime: una chat normale
const RAM = 64; // RAM di sistema per l'offload
// modelli di riferimento, dal più piccolo al più grande (repository Hugging Face)
const RIFERIMENTI = [
  ['google/gemma-4-26B-A4B-it', 'small MoE: 26 B, 4 B active'],
  ['Qwen/Qwen3.8-27B', 'dense: 28 B'],
  ['google/gemma-4-31B-it', 'dense: 31 B'],
  ['zai-org/GLM-4.6V', 'large MoE: 108 B, 14 B active'],
];

const fmtVel = (v) => (v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(0) : v.toFixed(1));

export function paginaGpu(dati, modelli, blog) {
  const schede = dati.schede.schede;
  // modelli aperti con dimensione nota, dal più votato in chat
  const classificati = modelli.filter((m) => m.hf && m.cat.chat).sort((a, b) => b.cat.chat.punti - a.cat.chat.punti);
  const rif = RIFERIMENTI.map(([repo, tipo]) => ({ m: modelli.find((x) => x.hf?.repo === repo), tipo })).filter((r) => r.m);

  const calcola = (s, n) => {
    const h = daScheda(s, { n, ram: RAM, ctx: CTX });
    const vel = rif.map((r) => simula(r.m.hf, h));
    // il più votato che sta tutto in GPU; se nessuno ci sta, il più votato che gira con l'aiuto della RAM
    const tutto = classificati.find((m) => simula(m.hf, h).dove === 'gpu');
    const migliore = tutto || classificati.find((m) => simula(m.hf, h).dove === 'ram');
    const conRam = !tutto;
    // il modello denso più grande che sta tutto in GPU a 4-bit (pesi + cache + runtime)
    const maxB = Math.max(0, (h.vram - 0.6 * h.n - 1) / (h.bpp + 0.000004 * CTX));
    return { h, vel, migliore, conRam, maxB };
  };
  const cella = (r) => (r.dove === 'gpu' ? `<span class="n">${fmtVel(r.vel)}</span>` : r.dove === 'ram' ? `<span class="n">${fmtVel(r.vel)}</span> <span class="tag chip-ram" title="Part of the model sits in system RAM">+RAM</span>` : '<span class="muted">does not fit</span>');

  const righe = [...schede].sort((a, b) => b.gb - a.gb || b.banda - a.banda).map((s) => {
    const c = calcola(s, 1);
    return `<tr id="gpu-${esc(s.id)}" data-id="${esc(s.id)}" data-marca="${esc(s.marca)}">
<td><b>${esc(s.nome)}</b><br><span class="small muted">${esc(s.marca)}${s.unificata ? ' · unified memory' : ''}</span></td>
<td class="n c-gb">${s.unificata ? `${s.gb} GB<br><span class="small muted">~${Math.round(s.gb * 0.75)} GB for AI</span>` : `${s.gb} GB`}</td>
<td class="n">${s.banda} GB/s</td>
${c.vel.map((r) => `<td class="c-vel">${cella(r)}</td>`).join('')}
<td class="n c-max">~${Math.round(c.maxB)} B</td>
<td class="c-best">${c.migliore ? `<a href="${c.migliore.href}">${esc(c.migliore.nome)}</a><br><span class="small muted">Arena ${c.migliore.cat.chat.punti}</span>${c.conRam ? ' <span class="tag chip-ram">+RAM</span>' : ''}` : '—'}</td>
<td><a class="small" href="/home.html?gpu=${encodeURIComponent(s.id)}">Simulate</a></td></tr>`;
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
    ['How accurate are these speeds?', 'They are estimates: memory bandwidth × 70% ÷ data read per word, at 4-bit (Q4_K_M) with an 8K context. Real numbers depend on the software, drivers and settings, and are usually within about ±30%. Use them to compare cards, not as exact figures.'],
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
<div class="panel">
<h2>All cards</h2>
<div class="row gpu-filtri">
<label class="small">How many cards <select id="g-quante">${[1, 2, 4].map((n) => `<option value="${n}">${n}</option>`).join('')}</select></label>
<label class="small"><input type="checkbox" id="g-ram" checked> Use ${RAM} GB of system RAM when the GPU is full</label>
<span class="tabs" role="group" aria-label="Brand">${['All', ...new Set(schede.map((s) => s.marca))].map((m, i) => `<button type="button" aria-pressed="${i ? 'false' : 'true'}" data-marca="${esc(m)}">${esc(m)}</button>`).join('')}</span>
</div>
<div class="tw"><table class="gpu-tabella">
<thead><tr><th>GPU</th><th>Memory</th><th>Bandwidth</th>${rif.map((r) => `<th><a href="${r.m.href}">${esc(r.m.nome)}</a><br><span class="small muted">${esc(r.tipo)} · tokens/s</span></th>`).join('')}<th>Largest model<br><span class="small muted">dense, 4-bit</span></th><th>Best free model that fits</th><th></th></tr></thead>
<tbody>
${righe}
</tbody></table></div>
<p class="small muted">Estimates at 4-bit (Q4_K_M), ${CTX / 1024}K context. Speed ≈ memory bandwidth × 70% ÷ data read per token; real numbers vary by about ±30%. “+RAM”: part of the model sits in system memory, which is much slower. Unified memory (Apple, Ryzen AI Max, DGX Spark): about 75% can be used by the GPU. “Best free model that fits”: the highest Arena chat score among open models that fit entirely in GPU memory.</p>
</div>
${grafico ? `<div class="panel"><h2>Speed on ${esc(denso.m.nome)}</h2>${grafico}</div>` : ''}
<div class="panel" id="faq"><h2>Questions</h2>
${domande.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}
</div>
<script type="application/json" id="gpu-data">${JSON.stringify(perJs).replace(/</g, '\\u003c')}</script>`,
  });
}
