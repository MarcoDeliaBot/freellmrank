// Simulatore "in casa": quali modelli aperti entrano nell'hardware scelto,
// come si divide la memoria e quanto vanno veloci. Tutto nel browser.
import { simula as simulaHf, QUANTI, perditaQualita, giudizio } from './calc.mjs';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CONTESTI = [2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144];
const LETTURA = 8; // token al secondo: una persona legge comoda più o meno a questa velocità
const SOLO_PESI = new Set(['image', 'video', 'edit']); // modelli di immagini e video: niente contesto testuale

let dati = null;
let categoria = 'chat';
let fuoco = null; // repository del modello da spiegare (clic su "Explain")
const PAROLE = 500, TOKEN_PER_PAROLA = 1.3; // una risposta lunga: circa 650 token

// Spiegazione a parole + tabella di tutti i livelli di quantizzazione per un modello
function spiega(m, h, cat) {
  const soloPesi = SOLO_PESI.has(categoria);
  const righe = QUANTI.map((q) => {
    const r = simulaHf(m.hf, { ...h, bpp: q.bpp }, soloPesi);
    const perdita = perditaQualita(q, m.hf.b);
    return { q, r, perdita };
  });
  // consigliato: il più fedele che entra tutto nella GPU e scrive più veloce della lettura;
  // altrimenti il più fedele che va almeno a velocità di lettura; altrimenti il più veloce che entra
  // se deve usare la RAM, conviene il più veloce fra quelli con perdita piccola (di solito Q4_K_M)
  const ok = righe.filter((x) => x.r.dove !== 'no');
  const consigliato = [...ok].reverse().find((x) => x.r.dove === 'gpu' && (soloPesi || x.r.vel >= LETTURA))
    || ok.find((x) => x.perdita < 3.5 && (soloPesi || x.r.vel >= LETTURA))
    || [...ok].sort((a, b) => (b.r.vel || 0) - (a.r.vel || 0))[0];
  const secondi = (v) => (PAROLE * TOKEN_PER_PAROLA) / v;
  const fmtTempo = (s) => (s < 60 ? `${Math.round(s)} seconds` : `${Math.round(s / 60)} min ${Math.round(s % 60)} s`);
  const hw = h.n > 1 ? `${h.n} × ${h.nome}` : h.nome;

  let testo;
  if (!consigliato) {
    const minimo = righe[0];
    testo = `<p><b>${esc(m.nome)}</b> does not fit on ${esc(hw)}${h.ram ? ` even with ${h.ram} GB of system RAM` : ''}. At the smallest level (${minimo.q.id}) it still needs about ${fmtGB(minimo.r.serve)}. Use it free online instead, or pick a smaller model.</p>`;
  } else {
    const { q, r, perdita } = consigliato;
    const i = righe.indexOf(consigliato);
    const su = righe.slice(i + 1).find((x) => x.r.dove !== 'no') || righe[i + 1];
    const giu = righe[i - 1];
    const dove = r.dove === 'gpu' ? 'fits entirely in GPU memory' : `fits only with ${fmtGB(r.inRam)} in system RAM, which is much slower`;
    const parti = [`<p>On <b>${esc(hw)}</b>, the best choice for <b>${esc(m.nome)}</b> is <b>${q.id}</b>. It needs ${fmtGB(r.serve)} and ${dove}.</p>`];
    if (!soloPesi) parti.push(`<p>It writes about <b>${fmtVel(r.vel)} tokens per second</b>: a ${PAROLE}-word answer takes about <b>${fmtTempo(secondi(r.vel))}</b>, ${r.vel >= LETTURA ? `${(r.vel / LETTURA).toFixed(1)}× faster than you read` : 'slower than you read'}. Quality: ${giudizio(perdita)} compared with the full model (${perdita < 0.1 ? 'under 0.1' : '+' + perdita.toFixed(1)}% perplexity).</p>`);
    else parti.push(`<p>${q.id === 'F16' ? 'The full 16-bit model fits, so you get its best quality.' : 'For image and video models, 8-bit is the usual choice when memory is tight; lower levels lose fine detail.'} We have no measured quality numbers for these models, so we do not show a score.</p>`);
    if (su) parti.push(`<p>One level up, ${su.q.id} would ${su.r.dove === 'no' ? `need ${fmtGB(su.r.serve)}: it does not fit` : su.r.dove === 'ram' && r.dove === 'gpu' ? `spill ${fmtGB(su.r.inRam)} into system RAM${soloPesi ? '' : ` and drop to about ${fmtVel(su.r.vel)} tokens per second`}` : `need ${fmtGB(su.r.serve)}${soloPesi ? '' : ` and run at about ${fmtVel(su.r.vel)} tokens per second`}`}${soloPesi ? '' : `, and quality would improve by only ${(perdita - su.perdita).toFixed(1)} percentage points`}.</p>`);
    if (giu && giu.r.dove !== 'no') parti.push(`<p>One level down, ${giu.q.id} saves ${fmtGB(r.serve - giu.r.serve)}${soloPesi ? '' : ` and runs at about ${fmtVel(giu.r.vel)} tokens per second`}${soloPesi ? '' : `; quality ${giudizio(giu.perdita) === giudizio(perdita) ? 'stays at' : 'goes down to'} ${giudizio(giu.perdita)} (+${giu.perdita.toFixed(1)}%)`}.</p>`);
    testo = parti.join('');
  }

  return `<div class="panel spiega" id="spiega-pannello">
<h2>What you get with ${esc(m.nome)}</h2>
<div class="spiega-testo">${testo}</div>
<div class="tw"><table><thead><tr><th>Level</th><th>Memory</th><th>Where</th>${soloPesi ? '' : `<th>Speed</th><th>${PAROLE}-word answer</th>`}<th>Quality vs full</th></tr></thead><tbody>
${righe.map((x) => `<tr class="${x === consigliato ? 'consigliato' : ''}${x.r.dove === 'no' ? ' spento' : ''}"><td class="n"><b>${x.q.id}</b>${x === consigliato ? ' <span class="tag chip-gpu">Best for you</span>' : ''}</td>
<td class="n">${fmtGB(x.r.serve)}</td><td>${chip(x.r)}</td>
${soloPesi ? '' : `<td class="n">${x.r.vel != null ? fmtVel(x.r.vel) + ' tok/s' : '—'}</td><td class="n">${x.r.vel != null ? fmtTempo(secondi(x.r.vel)) : '—'}</td>`}
<td>${soloPesi ? '<span class="small muted">not measured</span>' : `<span class="n">${x.perdita < 0.1 ? '≈ 0%' : '+' + x.perdita.toFixed(1) + '%'}</span> <span class="small muted">${giudizio(x.perdita)}</span>`}</td></tr>`).join('')}
</tbody></table></div>
<p class="small muted">Quality loss is the increase in perplexity against the full 16-bit model, measured by <a href="https://github.com/ggml-org/llama.cpp/blob/master/tools/perplexity/README.md" rel="noopener">llama.cpp</a> on Llama 3 8B and Llama 2 70B; bigger models lose less, so we scale it by size. It is a guide, not a test of this exact model. ${PAROLE} words ≈ ${Math.round(PAROLE * TOKEN_PER_PAROLA)} tokens. Reading a long document before answering takes extra time that we do not estimate.</p>
</div>`;
}

const fmtGB = (g) => (g >= 100 ? Math.round(g) : g >= 10 ? g.toFixed(0) : g.toFixed(1)) + ' GB';
const fmtCtx = (t) => (t >= 1024 ? Math.round(t / 1024) + 'K' : t) + ' tokens';
const fmtDownload = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n));
const fmtVel = (v) => (v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(0) : v.toFixed(1));

function hardware() {
  const id = $('scheda').value;
  const custom = id === 'custom';
  const s = custom ? { nome: 'Custom card', gb: +$('gb-custom').value || 24, banda: +$('banda-custom').value || 1000 } : dati.schede.schede.find((x) => x.id === id);
  const unificata = !!s.unificata;
  const n = unificata ? 1 : +$('n-gpu').value;
  const perScheda = unificata ? s.gb * 0.75 : s.gb;
  return {
    nome: s.nome, n, unificata, apple: s.marca === 'Apple', perScheda, banda: s.banda,
    vram: n * perScheda,
    ram: unificata ? 0 : +$('ram').value,
    bandaRam: +$('ram-tipo').value,
    bpp: +$('quant').value, kvq: +$('kvq').value,
    ctx: CONTESTI[+$('ctx').value],
  };
}

const simula = (m, h) => simulaHf(m.hf, h, SOLO_PESI.has(categoria));

// ---------- disegno ----------
function barraMemoria(r, h, grande) {
  // una barra lunga quanto la memoria disponibile (GPU + RAM usabile); i pezzi in scala
  const totale = Math.max(h.vram + (h.ram ? h.ram * 0.8 : 0), r.serve);
  const pct = (g) => (100 * g) / totale;
  const pezzi = [
    { cls: 'p-gpu', g: Math.max(0, r.dove === 'ram' ? r.pesi - r.inRam : r.pesi), nome: 'Weights on GPU' },
    { cls: 'p-kv', g: r.kv, nome: 'Context cache' },
    { cls: 'p-extra', g: r.extra, nome: SOLO_PESI.has(categoria) ? 'Runtime + encoders' : 'Runtime' },
    { cls: 'p-ram', g: r.dove === 'ram' ? r.inRam : 0, nome: 'Weights in system RAM' },
  ].filter((p) => p.g > 0.01);
  const linea = pct(h.vram);
  return `<div class="mem${grande ? ' grande' : ''}" role="img" aria-label="Needs ${fmtGB(r.serve)}; ${fmtGB(h.vram)} of GPU memory${h.ram ? ' plus system RAM' : ''}">
<div class="mem-barra">${pezzi.map((p) => `<span class="${p.cls}" style="width:${pct(p.g)}%" data-tip="${esc(p.nome)}: ${fmtGB(p.g)}"></span>`).join('')}</div>
<div class="mem-limite" style="left:${Math.min(100, linea)}%"><span>GPU ${fmtGB(h.vram)}</span></div>
</div>`;
}

function chip(r) {
  if (r.dove === 'gpu') return '<span class="tag chip-gpu">Fits in GPU</span>';
  if (r.dove === 'ram') return '<span class="tag chip-ram">GPU + RAM</span>';
  return '<span class="tag bad">Does not fit</span>';
}

function tessere(h) {
  const t = [
    ['GPU memory', fmtGB(h.vram), h.unificata ? `75% of ${h.nome}` : `${h.n} × ${h.nome}`],
    ['Bandwidth', `${h.banda} GB/s`, h.n > 1 ? 'per card (layers run one card at a time)' : 'read speed of GPU memory'],
    ['System RAM', h.ram ? fmtGB(h.ram) : 'not used', h.ram ? `${h.bandaRam} GB/s` : h.unificata ? 'shared with the GPU' : 'offload off'],
    ['Context', SOLO_PESI.has(categoria) ? '—' : fmtCtx(h.ctx), SOLO_PESI.has(categoria) ? 'not used by image/video models' : 'memory the chat history needs'],
  ];
  $('tiles').innerHTML = t.map(([a, b, c]) => `<div class="tile"><span class="small muted">${a}</span><b>${b}</b><span class="small muted">${esc(c)}</span></div>`).join('');
}

function calcola() {
  if (!dati) return;
  const h = hardware();
  $('ctx-val').textContent = fmtCtx(h.ctx);
  $('riga-contesto').hidden = SOLO_PESI.has(categoria);
  tessere(h);
  const cat = dati.categorie.find((c) => c.id === categoria);
  const visti = new Set();
  const lista = [];
  for (const m of cat.modelli) {
    if (!m.aperto || !m.hf || visti.has(m.hf.repo)) continue;
    visti.add(m.hf.repo);
    lista.push({ m, r: simula(m, h) });
  }
  // modelli piccoli senza voti Arena: dopo quelli votati, in ordine di download su Hugging Face
  // senza voti non sappiamo chi è meglio: fra i 25 più scaricati, prima i più grandi
  // (nella stessa famiglia, più parametri di solito vuol dire più qualità)
  const ammessi = (p) => p.cat.includes(categoria) || (categoria === 'code' && p.cat.includes('chat'));
  const popolari = (dati.piccoli || []).filter((p) => ammessi(p) && !visti.has(p.hf.repo)).slice(0, 25)
    .sort((a, b) => b.hf.b - a.hf.b);
  for (const p of popolari) {
    visti.add(p.hf.repo);
    const m = { ...p, senzaVoti: true, licenza: '' };
    lista.push({ m, r: simula(m, h) });
  }
  // modelli nuovi, non ancora votati da Arena (solo quelli scaricabili)
  for (const p of dati.nuovi || []) {
    if (!p.hf || !ammessi(p) || visti.has(p.hf.repo)) continue;
    visti.add(p.hf.repo);
    const m = { ...p, senzaVoti: true, nuovo: true, licenza: '' };
    lista.push({ m, r: simula(m, h) });
  }
  const entrano = lista.filter((x) => x.r.dove !== 'no');
  const best = entrano.find((x) => x.r.dove === 'gpu' && !x.m.senzaVoti)
    || entrano.find((x) => x.r.dove === 'gpu') || entrano[0];

  // il migliore
  if (best) {
    const { m, r } = best;
    const vel = r.vel != null ? `<div class="vel"><b>${fmtVel(r.vel)}</b><span>tokens per second</span><span class="small ${r.vel >= LETTURA ? 'ok' : 'lento'}">${r.vel >= LETTURA ? 'Faster than you read' : 'Slower than reading speed'}</span></div>` : '';
    const schede = h.n > 1 && r.dove !== 'no' ? `<div class="schede" aria-label="How the model splits across your cards">${Array.from({ length: h.n }, (_, i) => {
      const quota = Math.min(1, (Math.min(r.serve, h.vram)) / h.vram);
      return `<span title="Card ${i + 1}"><i style="height:${Math.round(quota * 100)}%"></i></span>`;
    }).join('')}<span class="small muted">${h.n} cards, ${Math.round((100 * Math.min(r.serve, h.vram)) / h.vram)}% full each</span></div>` : '';
    $('migliore').innerHTML = `<div class="panel best">
<div class="best-testa"><div><span class="small muted">Best ${esc(cat.nome.toLowerCase())} model for your setup</span>
<h2>${esc(m.nome)}</h2>
<p class="small">${esc(m.org)} · ${m.senzaVoti ? `<b>No Arena votes yet</b>: no voted model fits, so we show the biggest of the 25 most downloaded small models that does (${fmtDownload(m.download)} downloads a month on Hugging Face)` : `Arena score <b>${m.punti}</b> (#${m.pos} of ${cat.totale}, paid models included)`} · ${m.hf.b} B parameters${m.hf.att && m.hf.att < m.hf.b ? `, ${m.hf.att} B active` : ''}</p>
${chip(r)}${m.senzaVoti ? ' <span class="tag novoti">No Arena votes</span>' : ''}</div>${vel}</div>
${barraMemoria(r, h, true)}
<div class="legenda small">${[['p-gpu', 'Weights on GPU'], ['p-kv', 'Context cache'], ['p-extra', 'Runtime'], ['p-ram', 'Weights in system RAM']].map(([c, t]) => `<span><i class="${c}"></i>${t}</span>`).join('')}</div>
<p class="small">Needs <b>${fmtGB(r.serve)}</b>: weights ${fmtGB(r.pesi)}${r.kv ? `, context ${fmtGB(r.kv)}` : ''}, runtime ${fmtGB(r.extra)}.${r.dove === 'ram' ? ` ${fmtGB(r.inRam)} goes to system RAM, which slows it down.` : ''}</p>
${schede}
<p class="small"><a href="https://huggingface.co/${esc(m.hf.repo)}" rel="noopener">Model page</a> · <a href="https://huggingface.co/models?search=${encodeURIComponent(m.hf.repo.split('/')[1] + ' gguf')}" rel="noopener">GGUF files for Ollama and LM Studio</a></p>
</div>`;
  } else {
    $('migliore').innerHTML = `<div class="panel"><h2>Nothing fits in ${fmtGB(h.vram)}${h.ram ? ' plus RAM' : ''}</h2><p class="small">Try 4-bit, a shorter context, more system RAM, or a free model online: <a href="/#${categoria}">free ranking</a>.</p></div>`;
  }

  // spiegazione automatica: il modello scelto (clic nella tabella) o il migliore
  const scelto = (fuoco && lista.find((x) => x.m.hf.repo === fuoco)) || best;
  $('spiega').innerHTML = scelto ? spiega(scelto.m, h, cat) : '';

  // grafico della velocità (solo testo)
  // prima i votati; se sono pochi, si completa con i piccoli senza voti (segnati nel nome)
  const votatiVel = entrano.filter((x) => x.r.vel != null && !x.m.senzaVoti).slice(0, 10);
  const conVel = votatiVel.length >= 6 ? votatiVel
    : votatiVel.concat(entrano.filter((x) => x.r.vel != null && x.m.senzaVoti).slice(0, 10 - votatiVel.length));
  if (conVel.length) {
    const max = Math.max(LETTURA * 1.5, ...conVel.map((x) => x.r.vel));
    const passo = max > 200 ? 50 : max > 80 ? 20 : max > 40 ? 10 : 5;
    const fine = Math.ceil(max / passo) * passo;
    const tacche = []; for (let v = 0; v <= fine; v += passo) tacche.push(v);
    const x = (v) => (100 * v) / fine;
    $('grafico').innerHTML = `<div class="panel"><h2>Writing speed of the models that fit</h2>
<p class="small muted">Arena-voted models first, by score; then popular small models, biggest first, marked “no votes”. Tokens per second on your setup, estimated.</p>
<div class="legenda small"><span><i class="p-gpu"></i>Fits in GPU</span><span><i class="p-ram"></i>GPU + system RAM</span></div>
<div class="vel-grafico">
${conVel.map(({ m, r }) => `<div class="vg-riga" tabindex="0" data-tip="${esc(m.nome)}: ${fmtVel(r.vel)} tok/s · needs ${fmtGB(r.serve)} · ${m.senzaVoti ? 'no Arena votes' : 'Arena ' + m.punti}">
<span class="vg-nome">${esc(m.nome)}${m.nuovo ? ' <small class="muted">(new, no votes yet)</small>' : m.senzaVoti ? ' <small class="muted">(no votes)</small>' : ''}</span>
<span class="vg-pista"><span class="vg-l" style="left:${x(LETTURA)}%"></span><span class="vg-barra ${r.dove === 'gpu' ? 'p-gpu' : 'p-ram'}" style="width:${x(r.vel)}%"></span><span class="vg-val" style="left:${x(r.vel)}%">${fmtVel(r.vel)}</span></span></div>`).join('')}
<div class="vg-asse"><span class="vg-nome"></span><span class="vg-pista">${tacche.map((v) => `<span style="left:${x(v)}%">${v}</span>`).join('')}</span></div>
<p class="small muted">Dashed line: reading speed, about ${LETTURA} tokens per second.</p>
</div></div>`;
  } else $('grafico').innerHTML = '';

  // tabella completa
  const votati = lista.filter((x) => !x.m.senzaVoti), senza = lista.filter((x) => x.m.senzaVoti && !x.m.nuovo);
  const nuoviOk = lista.filter((x) => x.m.nuovo && x.r.dove !== 'no');
  const righe = votati.filter((x) => x.r.dove !== 'no').slice(0, 30)
    .concat(nuoviOk.slice(0, 12))
    .concat(senza.filter((x) => x.r.dove !== 'no').slice(0, 15))
    .concat(votati.filter((x) => x.r.dove === 'no').slice(0, 5));
  const maxPunti = Math.max(...votati.map((x) => x.m.punti)), minPunti = Math.min(...votati.map((x) => x.m.punti));
  const cellaPunti = (m) => (m.nuovo
    ? `<span class="tag nuovo">New · waiting for votes</span>${m.creato ? `<div class="org">released ${m.creato}</div>` : ''}`
    : m.senzaVoti
    ? `<span class="tag novoti">No Arena votes</span><div class="org">${fmtDownload(m.download)} downloads/month</div>`
    : `${m.punti}<span class="punti"><i style="width:${Math.round((100 * (m.punti - minPunti + 20)) / (maxPunti - minPunti + 20))}%"></i></span>`);
  $('tabella').innerHTML = `<div class="panel"><h2>Open models for your setup</h2>
<p class="small muted">Arena-voted models first, by score. Then small models from the labs' official Hugging Face pages, which Arena has not voted on: they are ordered by size, biggest first, among the 25 most downloaded.</p>
<div class="tw"><table><thead><tr><th>Model</th><th>Arena score</th><th>Size</th><th>Memory needed</th><th>Speed</th><th>Where</th><th></th></tr></thead><tbody>
${righe.map(({ m, r }) => `<tr${r.dove === 'no' ? ' class="spento"' : ''}><td class="m"><b>${esc(m.nome)}</b><div class="org">${esc(m.org)} · <a href="https://huggingface.co/${esc(m.hf.repo)}" rel="noopener">model</a>${m.gated ? ' · license to accept' : ''}</div></td>
<td class="n">${cellaPunti(m)}</td>
<td class="n">${m.hf.b} B${m.hf.att && m.hf.att < m.hf.b ? `<div class="org">${m.hf.att} B active</div>` : ''}</td>
<td class="cella-mem"><span class="n">${fmtGB(r.serve)}</span>${barraMemoria(r, h, false)}</td>
<td class="n">${r.vel != null ? fmtVel(r.vel) + ' tok/s' : '—'}</td>
<td>${chip(r)}</td><td><button type="button" class="btn piccolo" data-spiega="${esc(m.hf.repo)}">Explain</button></td></tr>`).join('')}
</tbody></table></div></div>`;
}

// ---------- suggerimenti al passaggio ----------
const tip = document.createElement('div');
tip.className = 'tip';
tip.hidden = true;
document.body.appendChild(tip);
function mostraTip(e) {
  const el = e.target.closest('[data-tip]');
  if (!el) { tip.hidden = true; return; }
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  const x = Math.min(window.innerWidth - tip.offsetWidth - 8, Math.max(8, (e.clientX || r.left + r.width / 2) - tip.offsetWidth / 2));
  tip.style.left = x + 'px';
  tip.style.top = (r.top + window.scrollY - tip.offsetHeight - 8) + 'px';
}
document.addEventListener('pointerover', mostraTip);
document.addEventListener('focusin', mostraTip);
document.addEventListener('pointerout', (e) => { if (!e.relatedTarget?.closest?.('[data-tip]')) tip.hidden = true; });

// ---------- riconoscimento della scheda video ----------
// Il browser dichiara il nome della GPU attraverso WebGL (es. "ANGLE (AMD, AMD Radeon RX 7900 XTX ...)").
// Chiediamo la GPU potente: sui PC con grafica integrata altrimenti risponde quella.
function nomeGpu() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl', { powerPreference: 'high-performance' }) || c.getContext('experimental-webgl');
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  } catch { return null; }
}
const norma = (s) => s.toLowerCase().replace(/geforce|radeon|nvidia|amd|intel|\(tm\)|graphics/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
function trovaScheda(nome) {
  const n = ' ' + norma(nome) + ' ';
  const codici = [
    /\b(rtx\s?(?:pro\s)?\d{4}(?:\s?ti)?(?:\s?super)?(?:\sada)?)\b/, /\b(rtx\s?a\d{4})\b/, /\b(rx\s?\d{4}(?:\s?(?:xtx|xt|gre))?)\b/,
    /\b(arc\s?[ab]\d{3})\b/, /\b(m\d\s?(?:pro|max|ultra)?)\b/, /\b([ah]\d{3})\b/,
  ];
  for (const re of codici) {
    const k = re.exec(n);
    if (!k) continue;
    // la scheda del catalogo il cui nome contiene il codice; se non c'è, si accorcia il codice
    // ("rtx 4070 super" → "rtx 4070", che nel catalogo è "RTX 4070 / 4070 Super", stessi dati)
    const parole = k[1].split(/\s+/);
    for (let fine = parole.length; fine >= Math.min(2, parole.length); fine--) {
      const codice = parole.slice(0, fine).join(' ');
      const cand = dati.schede.schede.filter((s) => (' ' + norma(s.nome) + ' ').includes(' ' + codice + ' ') || norma(s.nome).replace(/ /g, '').includes(codice.replace(/ /g, '')));
      // vince chi aggiunge meno varianti (ti, super, xt…) che il browser non ha dichiarato
      const extra = (s) => (norma(s.nome).match(/\b(ti|super|xtx|xt|gre|ada|pro|max|ultra)\b/g) || []).filter((w) => !parole.includes(w)).length;
      if (cand.length) return cand.sort((a, b) => extra(a) - extra(b) || a.nome.length - b.nome.length)[0];
    }
  }
  return null;
}
$('rileva').addEventListener('click', () => {
  const nome = nomeGpu();
  const esito = $('rileva-esito');
  if (!nome) { esito.textContent = 'Your browser does not share the graphics card name. Pick it from the list.'; return; }
  const s = dati && trovaScheda(nome);
  if (s) {
    $('scheda').value = s.id;
    aggiornaCampi(); calcola();
    esito.innerHTML = `Found <b>${esc(s.nome)}</b> (${s.gb} GB). If you have more than one, set “How many”. Now set your system RAM.`;
  } else {
    esito.innerHTML = `Your browser reports <b>${esc(nome)}</b>, which is not in our list${/integrated|radeon\(tm\) graphics|uhd|iris|apple gpu/i.test(nome) ? ' (it looks like built-in graphics, not a separate card)' : ''}. Pick your card from the list, or choose “Custom card”.`;
  }
});

// ---------- comandi ----------
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-spiega]');
  if (!b) return;
  fuoco = b.dataset.spiega;
  calcola();
  $('spiega').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
});
function aggiornaCampi() {
  const custom = $('scheda').value === 'custom';
  $('campo-gb').hidden = !custom;
  $('campo-banda').hidden = !custom;
  const s = dati?.schede.schede.find((x) => x.id === $('scheda').value);
  const unificata = !!s?.unificata;
  $('n-gpu').disabled = unificata;
  $('ram').disabled = unificata;
}
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
  categoria = b.dataset.cat;
  document.querySelectorAll('.tabs button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  calcola();
}));
['scheda', 'n-gpu', 'gb-custom', 'banda-custom', 'ram', 'ram-tipo', 'quant', 'kvq', 'ctx'].forEach((id) => $(id).addEventListener('input', () => { aggiornaCampi(); calcola(); }));
fetch('data.json').then((r) => r.json()).then((d) => {
  dati = d;
  // arrivo dalla pagina /gpus: ?gpu=<id> sceglie la scheda
  const scelta = new URLSearchParams(location.search).get('gpu');
  if (scelta && d.schede.schede.some((s) => s.id === scelta)) $('scheda').value = scelta;
  aggiornaCampi(); calcola();
})
  .catch(() => { $('migliore').innerHTML = '<div class="panel"><p>Could not load the model list. Reload the page.</p></div>'; });
