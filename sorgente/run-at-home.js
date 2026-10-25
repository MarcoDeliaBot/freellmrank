// Simulatore "in casa": quali modelli aperti entrano nell'hardware scelto,
// come si divide la memoria e quanto vanno veloci. Tutto nel browser.
import { simula as simulaHf, QUANTI, perditaQualita, giudizio as giudizioEn } from './calc.mjs';
import { t, num, numB, giudizioT, radice, LINGUA } from './run-at-home-testi.mjs';
const giudizio = (p) => giudizioT(giudizioEn(p));
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CONTESTI = [2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144];
const LETTURA = 8; // token al secondo: una persona legge comoda più o meno a questa velocità
const SOLO_PESI = new Set(['image', 'video', 'edit', 'i2v', 'vedit']); // modelli di immagini e video: niente contesto testuale

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
  const fmtTempo = (s) => (s < 60 ? t('secondi', { n: Math.round(s) }) : t('minuti', { m: Math.round(s / 60), s: Math.round(s % 60) }));
  const hw = h.n > 1 ? `${h.n} × ${h.nome}` : h.nome;

  let testo;
  if (!consigliato) {
    const minimo = righe[0];
    testo = `<p>${t('nonEntra', { nome: esc(m.nome), hw: esc(hw), ram: h.ram ? t('nonEntraRam', { ram: h.ram }) : '', q: minimo.q.id, gb: fmtGB(minimo.r.serve) })}</p>`;
  } else {
    const { q, r, perdita } = consigliato;
    const i = righe.indexOf(consigliato);
    const su = righe.slice(i + 1).find((x) => x.r.dove !== 'no') || righe[i + 1];
    const giu = righe[i - 1];
    const dove = r.dove === 'gpu' ? t('doveGpu') : t('doveRam', { gb: fmtGB(r.inRam) });
    const parti = [`<p>${t('scelta', { hw: esc(hw), nome: esc(m.nome), q: q.id, gb: fmtGB(r.serve), dove })}</p>`];
    if (!soloPesi) parti.push(`<p>${t('scrive', { vel: fmtVel(r.vel), parole: PAROLE, tempo: fmtTempo(secondi(r.vel)), confronto: r.vel >= LETTURA ? t('piuVeloce', { x: num(r.vel / LETTURA, 1) }) : t('piuLento'), giudizio: giudizio(perdita), perdita: perdita < 0.1 ? t('sotto01') : '+' + num(perdita, 1) + '%' })}</p>`);
    else parti.push(`<p>${q.id === 'F16' ? t('f16') : t('bit8')} ${t('nessunNumero')}</p>`);
    if (su) {
      const cosa = su.r.dove === 'no' ? t('suNo', { gb: fmtGB(su.r.serve) })
        : su.r.dove === 'ram' && r.dove === 'gpu' ? t('suRam', { gb: fmtGB(su.r.inRam) }) + (soloPesi ? '' : t('suRamVel', { vel: fmtVel(su.r.vel) }))
        : t('suServe', { gb: fmtGB(su.r.serve) }) + (soloPesi ? '' : t('suVel', { vel: fmtVel(su.r.vel) }));
      parti.push(`<p>${t('su', { q: su.q.id, cosa, qualita: soloPesi ? '' : t('suQualita', { p: num(perdita - su.perdita, 1) }) })}</p>`);
    }
    if (giu && giu.r.dove !== 'no') {
      const resto = soloPesi ? '' : t('giuVel', { vel: fmtVel(giu.r.vel) }) + t(giudizio(giu.perdita) === giudizio(perdita) ? 'giuUguale' : 'giuPeggio', { g: giudizio(giu.perdita), p: num(giu.perdita, 1) });
      parti.push(`<p>${t('giu', { q: giu.q.id, gb: fmtGB(r.serve - giu.r.serve), resto })}</p>`);
    }
    testo = parti.join('');
  }

  return `<div class="panel spiega" id="spiega-pannello">
<h2>${t('titoloSpiega', { nome: esc(m.nome) })}</h2>
<div class="spiega-testo">${testo}</div>
<div class="tw"><table><thead><tr><th>${t('thLivello')}</th><th>${t('thMemoria')}</th><th>${t('thDove')}</th>${soloPesi ? '' : `<th>${t('thVelocita')}</th><th>${t('thRisposta', { n: PAROLE })}</th>`}<th>${t('thQualita')}</th></tr></thead><tbody>
${righe.map((x) => `<tr class="${x === consigliato ? 'consigliato' : ''}${x.r.dove === 'no' ? ' spento' : ''}"><td class="n"><b>${x.q.id}</b>${x === consigliato ? ` <span class="tag chip-gpu">${t('perTe')}</span>` : ''}</td>
<td class="n">${fmtGB(x.r.serve)}</td><td>${chip(x.r)}</td>
${soloPesi ? '' : `<td class="n">${x.r.vel != null ? fmtVel(x.r.vel) + ' tok/s' : '—'}</td><td class="n">${x.r.vel != null ? fmtTempo(secondi(x.r.vel)) : '—'}</td>`}
<td>${soloPesi ? `<span class="small muted">${t('nonMisurato')}</span>` : `<span class="n">${x.perdita < 0.1 ? '≈ 0%' : '+' + num(x.perdita, 1) + '%'}</span> <span class="small muted">${giudizio(x.perdita)}</span>`}</td></tr>`).join('')}
</tbody></table></div>
<p class="small muted">${t('notaQualita', { link: '<a href="https://github.com/ggml-org/llama.cpp/blob/master/tools/perplexity/README.md" rel="noopener">llama.cpp</a>', parole: PAROLE, token: Math.round(PAROLE * TOKEN_PER_PAROLA) })}</p>
</div>`;
}

const fmtGB = (g) => (g >= 10 ? num(g) : num(g, 1)) + ' GB';
const fmtCtx = (n) => t('token', { n: n >= 1024 ? Math.round(n / 1024) + 'K' : n });
const fmtDownload = (n) => (n >= 1e6 ? num(n / 1e6, 1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n));
const fmtVel = (v) => (v >= 10 ? num(v) : num(v, 1));

function hardware() {
  const id = $('scheda').value;
  const custom = id === 'custom';
  const s = custom ? { nome: t('schedaCustom'), gb: +$('gb-custom').value || 24, banda: +$('banda-custom').value || 1000 } : dati.schede.schede.find((x) => x.id === id);
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
// nome della categoria come sulla scheda della pagina (già tradotta); minuscolo tranne in tedesco e giapponese
function nomeCategoria(cat) {
  const nome = document.querySelector(`.tabs button[data-cat="${categoria}"]`)?.textContent.trim() || cat.nome;
  return LINGUA === 'de' || LINGUA === 'ja' ? nome : nome.toLowerCase();
}

// ---------- disegno ----------
function barraMemoria(r, h, grande) {
  // una barra lunga quanto la memoria disponibile (GPU + RAM usabile); i pezzi in scala
  const totale = Math.max(h.vram + (h.ram ? h.ram * 0.8 : 0), r.serve);
  const pct = (g) => (100 * g) / totale;
  const pezzi = [
    { cls: 'p-gpu', g: Math.max(0, r.dove === 'ram' ? r.pesi - r.inRam : r.pesi), nome: t('pesiGpu') },
    { cls: 'p-kv', g: r.kv, nome: t('cache') },
    { cls: 'p-extra', g: r.extra, nome: SOLO_PESI.has(categoria) ? t('runtimeEnc') : t('runtime') },
    { cls: 'p-ram', g: r.dove === 'ram' ? r.inRam : 0, nome: t('pesiRam') },
  ].filter((p) => p.g > 0.01);
  const linea = pct(h.vram);
  return `<div class="mem${grande ? ' grande' : ''}" role="img" aria-label="${esc(t('ariaMem', { gb: fmtGB(r.serve), vram: fmtGB(h.vram), piu: h.ram ? t('piuRam') : '' }))}">
<div class="mem-barra">${pezzi.map((p) => `<span class="${p.cls}" style="width:${pct(p.g)}%" data-tip="${esc(p.nome)}: ${fmtGB(p.g)}"></span>`).join('')}</div>
<div class="mem-limite" style="left:${Math.min(100, linea)}%"><span>GPU ${fmtGB(h.vram)}</span></div>
</div>`;
}

function chip(r) {
  if (r.dove === 'gpu') return `<span class="tag chip-gpu">${t('chipGpu')}</span>`;
  if (r.dove === 'ram') return `<span class="tag chip-ram">${t('chipRam')}</span>`;
  return `<span class="tag bad">${t('chipNo')}</span>`;
}

function tessere(h) {
  const righe = [
    [t('tMemoria'), fmtGB(h.vram), h.unificata ? t('tQuota', { nome: h.nome }) : `${h.n} × ${h.nome}`],
    [t('tBanda'), `${h.banda} GB/s`, h.n > 1 ? t('tPerScheda') : t('tLettura')],
    [t('tRam'), h.ram ? fmtGB(h.ram) : t('tNonUsata'), h.ram ? `${h.bandaRam} GB/s` : h.unificata ? t('tCondivisa') : t('tSpenta')],
    [t('tContesto'), SOLO_PESI.has(categoria) ? '—' : fmtCtx(h.ctx), SOLO_PESI.has(categoria) ? t('tNoContesto') : t('tStoria')],
  ];
  $('tiles').innerHTML = righe.map(([a, b, c]) => `<div class="tile"><span class="small muted">${a}</span><b>${b}</b><span class="small muted">${esc(c)}</span></div>`).join('');
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
    const vel = r.vel != null ? `<div class="vel"><b>${fmtVel(r.vel)}</b><span>${t('tokSec')}</span><span class="small ${r.vel >= LETTURA ? 'ok' : 'lento'}">${r.vel >= LETTURA ? t('piuVeloceLettura') : t('piuLentoLettura')}</span></div>` : '';
    const schede = h.n > 1 && r.dove !== 'no' ? `<div class="schede" aria-label="${esc(t('divise'))}">${Array.from({ length: h.n }, (_, i) => {
      const quota = Math.min(1, (Math.min(r.serve, h.vram)) / h.vram);
      return `<span title="${esc(t('scheda', { n: i + 1 }))}"><i style="height:${Math.round(quota * 100)}%"></i></span>`;
    }).join('')}<span class="small muted">${t('schedePiene', { n: h.n, p: Math.round((100 * Math.min(r.serve, h.vram)) / h.vram) })}</span></div>` : '';
    $('migliore').innerHTML = `<div class="panel best">
<div class="best-testa"><div><span class="small muted">${t('migliore', { cat: esc(nomeCategoria(cat)) })}</span>
<h2>${esc(m.nome)}</h2>
<p class="small">${esc(m.org)} · ${m.senzaVoti ? t('senzaVotiBest', { n: fmtDownload(m.download) }) : t('punteggio', { punti: m.punti, pos: m.pos, tot: cat.totale })} · ${t('parametri', { b: numB(m.hf.b) })}${m.hf.att && m.hf.att < m.hf.b ? t('attivi', { a: numB(m.hf.att) }) : ''}</p>
${chip(r)}${m.senzaVoti ? ` <span class="tag novoti">${t('novoti')}</span>` : ''}</div>${vel}</div>
${barraMemoria(r, h, true)}
<div class="legenda small">${[['p-gpu', t('pesiGpu')], ['p-kv', t('cache')], ['p-extra', t('runtime')], ['p-ram', t('pesiRam')]].map(([c, nome]) => `<span><i class="${c}"></i>${nome}</span>`).join('')}</div>
<p class="small">${t('serve', { gb: fmtGB(r.serve), pesi: fmtGB(r.pesi) })}${r.kv ? t('serveCtx', { kv: fmtGB(r.kv) }) : ''}${t('serveRun', { extra: fmtGB(r.extra) })}${r.dove === 'ram' ? t('serveRam', { gb: fmtGB(r.inRam) }) : ''}</p>
${schede}
<p class="small"><a href="https://huggingface.co/${esc(m.hf.repo)}" rel="noopener">${t('paginaModello')}</a> · <a href="https://huggingface.co/models?search=${encodeURIComponent(m.hf.repo.split('/')[1] + ' gguf')}" rel="noopener">${t('gguf')}</a></p>
</div>`;
  } else {
    $('migliore').innerHTML = `<div class="panel"><h2>${t('niente', { gb: fmtGB(h.vram), piu: h.ram ? t('nientePiu') : '' })}</h2><p class="small">${t('nienteProva', { link: `${radice}#${categoria}` })}</p></div>`;
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
    $('grafico').innerHTML = `<div class="panel"><h2>${t('graficoTitolo')}</h2>
<p class="small muted">${t('graficoNota')}</p>
<div class="legenda small"><span><i class="p-gpu"></i>${t('chipGpu')}</span><span><i class="p-ram"></i>${t('legGpuRam')}</span></div>
<div class="vel-grafico">
${conVel.map(({ m, r }) => `<div class="vg-riga" tabindex="0" data-tip="${esc(t('tipVel', { nome: m.nome, vel: fmtVel(r.vel), gb: fmtGB(r.serve), voti: m.senzaVoti ? t('tipNoVoti') : t('tipArena', { p: m.punti }) }))}">
<span class="vg-nome">${esc(m.nome)}${m.nuovo ? ` <small class="muted">${t('nuovoNoVoti')}</small>` : m.senzaVoti ? ` <small class="muted">${t('noVoti')}</small>` : ''}</span>
<span class="vg-pista"><span class="vg-l" style="left:${x(LETTURA)}%"></span><span class="vg-barra ${r.dove === 'gpu' ? 'p-gpu' : 'p-ram'}" style="width:${x(r.vel)}%"></span><span class="vg-val" style="left:${x(r.vel)}%">${fmtVel(r.vel)}</span></span></div>`).join('')}
<div class="vg-asse"><span class="vg-nome"></span><span class="vg-pista">${tacche.map((v) => `<span style="left:${x(v)}%">${v}</span>`).join('')}</span></div>
<p class="small muted">${t('tratteggio', { n: LETTURA })}</p>
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
    ? `<span class="tag nuovo">${t('nuovoAttesa')}</span>${m.creato ? `<div class="org">${t('uscito', { d: m.creato })}</div>` : ''}`
    : m.senzaVoti
    ? `<span class="tag novoti">${t('novoti')}</span><div class="org">${t('scaricati', { n: fmtDownload(m.download) })}</div>`
    : `${m.punti}<span class="punti"><i style="width:${Math.round((100 * (m.punti - minPunti + 20)) / (maxPunti - minPunti + 20))}%"></i></span>`);
  $('tabella').innerHTML = `<div class="panel"><h2>${t('tabTitolo')}</h2>
<p class="small muted">${t('tabNota')}</p>
<div class="tw"><table><thead><tr><th>${t('thModello')}</th><th>${t('thPunti')}</th><th>${t('thTaglia')}</th><th>${t('thServe')}</th><th>${t('thVelocita')}</th><th>${t('thDove')}</th><th></th></tr></thead><tbody>
${righe.map(({ m, r }) => `<tr${r.dove === 'no' ? ' class="spento"' : ''}><td class="m"><b>${esc(m.nome)}</b><div class="org">${esc(m.org)} · <a href="https://huggingface.co/${esc(m.hf.repo)}" rel="noopener">${t('modello')}</a>${m.gated ? t('licenza') : ''}</div></td>
<td class="n">${cellaPunti(m)}</td>
<td class="n">${numB(m.hf.b)} B${m.hf.att && m.hf.att < m.hf.b ? `<div class="org">${t('attiviRiga', { a: numB(m.hf.att) })}</div>` : ''}</td>
<td class="cella-mem"><span class="n">${fmtGB(r.serve)}</span>${barraMemoria(r, h, false)}</td>
<td class="n">${r.vel != null ? fmtVel(r.vel) + ' tok/s' : '—'}</td>
<td>${chip(r)}</td><td><button type="button" class="btn piccolo" data-spiega="${esc(m.hf.repo)}">${t('spiega')}</button></td></tr>`).join('')}
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
// 24/10/2026, PC di Marco: Chrome rispondeva «Microsoft Basic Render Driver» (accelerazione hardware spenta o driver
// non usato dal browser). È un disegnatore software, non la scheda: proviamo WebGPU e, se niente, lo diciamo chiaro
const SOFTWARE = /basic render driver|swiftshader|llvmpipe|software rasterizer|microsoft basic/i;
async function nomeWebGpu() {
  try {
    const a = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
    const i = a?.info || (await a?.requestAdapterInfo?.());
    return i ? [i.vendor, i.architecture, i.device, i.description].filter(Boolean).join(' ') : null;
  } catch { return null; }
}
$('rileva').addEventListener('click', async () => {
  const esito = $('rileva-esito');
  let nome = nomeGpu();
  if (!nome || SOFTWARE.test(nome)) nome = (await nomeWebGpu()) || nome;
  if (!nome) { esito.textContent = t('rNome'); return; }
  if (SOFTWARE.test(nome)) {
    esito.innerHTML = t('rSoftware');
    return;
  }
  const s = dati && trovaScheda(nome);
  if (s) {
    $('scheda').value = s.id;
    aggiornaCampi(); calcola(); comandoWhichllm();
    esito.innerHTML = t('rTrovata', { nome: esc(s.nome), gb: s.gb });
  } else {
    esito.innerHTML = t('rNonInLista', { nome: esc(nome), integrata: /integrated|radeon\(tm\) graphics|uhd|iris|apple gpu/i.test(nome) ? t('rIntegrata') : '' });
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
// comando unico con whichllm (github.com/Andyyyy64/whichllm, MIT), aggiunto il 24/10/2026: la stessa scheda scelta qui.
// Le macchine a memoria unificata e la scheda personalizzata passano la memoria (--vram) invece del nome
function comandoWhichllm() {
  const el = $('cmd-whichllm');
  if (!el || !dati) return;
  const id = $('scheda').value;
  const s = dati.schede.schede.find((x) => x.id === id);
  let arg;
  if (id === 'custom' || !s) arg = `--vram ${+$('gb-custom').value || 24}`;
  else if (s.unificata) arg = `--vram ${Math.round(s.gb * 0.75)}`;
  else {
    const nome = s.nome.replace(/\s*\/.*$/, '').replace(/\s+(\d+)\s*GB$/i, ' $1').replace(/\s+SXM$/, '');
    const n = +$('n-gpu').value;
    arg = `--gpu "${n > 1 ? `${n}x ` : ''}${nome}"`;
  }
  el.textContent = `uvx whichllm@latest ${arg}`;
}
$('copia-cmd')?.addEventListener('click', (e) => {
  const cmd = $('cmd-whichllm').textContent;
  const fatto = () => { e.target.textContent = t('copiato'); setTimeout(() => { e.target.textContent = t('copia'); }, 1500); };
  if (navigator.clipboard) navigator.clipboard.writeText(cmd).then(fatto, () => prompt(t('copiaQuesto'), cmd)); else prompt(t('copiaQuesto'), cmd);
});
if ($('copia-cmd')) $('copia-cmd').textContent = t('copia');
['scheda', 'n-gpu', 'gb-custom', 'banda-custom', 'ram', 'ram-tipo', 'quant', 'kvq', 'ctx'].forEach((id) => $(id).addEventListener('input', () => { aggiornaCampi(); calcola(); comandoWhichllm(); }));
// indirizzo assoluto: dalle pagine tradotte (/it/home) «data.json» diventava /it/data.json, che non esiste (25/10/2026)
fetch('/data.json').then((r) => r.json()).then((d) => {
  dati = d;
  // arrivo dalla pagina /gpus: ?gpu=<id> sceglie la scheda
  const scelta = new URLSearchParams(location.search).get('gpu');
  if (scelta && d.schede.schede.some((s) => s.id === scelta)) $('scheda').value = scelta;
  aggiornaCampi(); calcola(); comandoWhichllm();
})
  .catch(() => { $('migliore').innerHTML = `<div class="panel"><p>${t('errore')}</p></div>`; });
