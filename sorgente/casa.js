// Simulatore "in casa": quali modelli aperti entrano nell'hardware scelto,
// come si divide la memoria e quanto vanno veloci. Tutto nel browser.
import { simula as simulaHf } from './calcolo.mjs';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CONTESTI = [2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144];
const LETTURA = 8; // token al secondo: una persona legge comoda più o meno a questa velocità
const SOLO_PESI = new Set(['image', 'video', 'edit']); // modelli di immagini e video: niente contesto testuale

let dati = null;
let categoria = 'chat';

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
    nome: s.nome, n, unificata, perScheda, banda: s.banda,
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
<span class="vg-nome">${esc(m.nome)}${m.senzaVoti ? ' <small class="muted">(no votes)</small>' : ''}</span>
<span class="vg-pista"><span class="vg-l" style="left:${x(LETTURA)}%"></span><span class="vg-barra ${r.dove === 'gpu' ? 'p-gpu' : 'p-ram'}" style="width:${x(r.vel)}%"></span><span class="vg-val" style="left:${x(r.vel)}%">${fmtVel(r.vel)}</span></span></div>`).join('')}
<div class="vg-asse"><span class="vg-nome"></span><span class="vg-pista">${tacche.map((v) => `<span style="left:${x(v)}%">${v}</span>`).join('')}</span></div>
<p class="small muted">Dashed line: reading speed, about ${LETTURA} tokens per second.</p>
</div></div>`;
  } else $('grafico').innerHTML = '';

  // tabella completa
  const votati = lista.filter((x) => !x.m.senzaVoti), senza = lista.filter((x) => x.m.senzaVoti);
  const righe = votati.filter((x) => x.r.dove !== 'no').slice(0, 30)
    .concat(senza.filter((x) => x.r.dove !== 'no').slice(0, 20))
    .concat(votati.filter((x) => x.r.dove === 'no').slice(0, 5));
  const maxPunti = Math.max(...votati.map((x) => x.m.punti)), minPunti = Math.min(...votati.map((x) => x.m.punti));
  const cellaPunti = (m) => (m.senzaVoti
    ? `<span class="tag novoti">No Arena votes</span><div class="org">${fmtDownload(m.download)} downloads/month</div>`
    : `${m.punti}<span class="punti"><i style="width:${Math.round((100 * (m.punti - minPunti + 20)) / (maxPunti - minPunti + 20))}%"></i></span>`);
  $('tabella').innerHTML = `<div class="panel"><h2>Open models for your setup</h2>
<p class="small muted">Arena-voted models first, by score. Then small models from the labs' official Hugging Face pages, which Arena has not voted on: they are ordered by size, biggest first, among the 25 most downloaded.</p>
<div class="tw"><table><thead><tr><th>Model</th><th>Arena score</th><th>Size</th><th>Memory needed</th><th>Speed</th><th>Where</th></tr></thead><tbody>
${righe.map(({ m, r }) => `<tr${r.dove === 'no' ? ' class="spento"' : ''}><td class="m"><b>${esc(m.nome)}</b><div class="org">${esc(m.org)} · <a href="https://huggingface.co/${esc(m.hf.repo)}" rel="noopener">model</a>${m.gated ? ' · license to accept' : ''}</div></td>
<td class="n">${cellaPunti(m)}</td>
<td class="n">${m.hf.b} B${m.hf.att && m.hf.att < m.hf.b ? `<div class="org">${m.hf.att} B active</div>` : ''}</td>
<td class="cella-mem"><span class="n">${fmtGB(r.serve)}</span>${barraMemoria(r, h, false)}</td>
<td class="n">${r.vel != null ? fmtVel(r.vel) + ' tok/s' : '—'}</td>
<td>${chip(r)}</td></tr>`).join('')}
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

// ---------- comandi ----------
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
fetch('dati.json').then((r) => r.json()).then((d) => { dati = d; aggiornaCampi(); calcola(); })
  .catch(() => { $('migliore').innerHTML = '<div class="panel"><p>Could not load the model list. Reload the page.</p></div>'; });
