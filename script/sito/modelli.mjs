// Catalogo dei modelli gratuiti e una pagina per ciascuno.
import { esc, fmtNum, fmtData, pagina, CHAT_WEB, NOME_PIENO } from './comune.mjs';
import { linee } from './grafici.mjs';
import { simula, daScheda, kvGB, QUANTI, perditaQualita, giudizio, slug } from '../../sorgente/calcolo.mjs';

const SOLO_PESI = new Set(['image', 'video', 'edit']);
const usabileGratis = (m) => m.aperto || m.or?.gratis;
// nome più leggibile fra quelli usati nelle varie classifiche
const piuBello = (a, b) => ((/[A-Z ]/.test(b) && !/[A-Z ]/.test(a)) ? b : a);

// Un modello per chiave (repository Hugging Face, poi id OpenRouter, poi nome)
export function unisci(dati, storia) {
  const mappa = new Map();
  for (const c of dati.categorie) {
    for (const m of c.modelli) {
      if (!usabileGratis(m)) continue;
      const chiave = m.hf?.repo || m.or?.id || slug(m.nome);
      let u = mappa.get(chiave);
      if (!u) { u = { chiave, nome: m.nome, org: m.org, licenza: m.licenza, aperto: m.aperto, or: m.or, hf: m.hf, cat: {}, nomi: {} }; mappa.set(chiave, u); }
      u.nome = piuBello(u.nome, m.nome);
      u.or ||= m.or; u.hf ||= m.hf;
      const prima = u.cat[c.id];
      if (!prima || m.punti > prima.punti) {
        u.cat[c.id] = { punti: m.punti, pos: m.pos, totale: c.totale, voti: m.voti, nomeArena: m.nome };
        u.nomi[c.id] = m.nome;
      }
      const primo = storia?.categorie[c.id]?.primo[m.nome];
      if (primo && (!u.primo || primo < u.primo)) u.primo = primo;
    }
  }
  for (const p of dati.piccoli || []) {
    if (mappa.has(p.hf.repo)) continue;
    mappa.set(p.hf.repo, { chiave: p.hf.repo, nome: p.nome, org: p.org, licenza: p.gated ? 'license to accept' : 'open', aperto: true, hf: p.hf, cat: {}, nomi: {}, senzaVoti: true, download: p.download, catPiccoli: p.cat, primo: p.creato });
  }
  const usati = new Set();
  const lista = [...mappa.values()];
  for (const u of lista) {
    let s = slug(u.nome);
    while (usati.has(s)) s += '-' + slug(u.org || 'x');
    usati.add(s);
    u.slug = s;
    u.href = `/model/${s}.html`;
    const migliori = Object.entries(u.cat).sort((a, b) => a[1].pos / a[1].totale - b[1].pos / b[1].totale);
    u.categoriaMigliore = migliori[0]?.[0] || null;
  }
  return lista;
}

const fmtGB = (g) => (g >= 100 ? Math.round(g) : g >= 10 ? g.toFixed(0) : g.toFixed(1)) + ' GB';
const fmtVel = (v) => (v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(0) : v.toFixed(1));
const fasciaDim = (b) => (b < 4 ? 'xs' : b <= 16 ? 's' : b <= 80 ? 'm' : b <= 400 ? 'l' : 'xl');
const NOMI_FASCE = { xs: 'Under 4 B', s: '4–16 B', m: '16–80 B', l: '80–400 B', xl: 'Over 400 B' };

// dentro una scheda che è già un link (piccolo = true) le etichette non possono essere link:
// un <a> dentro un <a> fa spezzare la scheda al browser
function etichetteGratis(m, piccolo = false) {
  const t = [];
  const et = (cls, testo, href) => (piccolo || !href ? `<span class="tag ${cls}">${testo}</span>` : `<a class="tag ${cls}" href="${href}"${href.startsWith('http') ? ' rel="noopener"' : ''}>${testo}</a>`);
  if (m.or?.gratis) t.push(et('free', 'Free API', `/compare.html#${encodeURIComponent(m.or.id)}`));
  if (m.aperto && CHAT_WEB[m.org]) t.push(et('web', 'Lab chat', CHAT_WEB[m.org]));
  if (m.aperto) t.push(et('home', 'Download'));
  if (m.senzaVoti) t.push(et('novoti', 'No Arena votes'));
  return t.join(piccolo ? '' : ' ');
}

// ---------- catalogo ----------
export function paginaCatalogo(dati, modelli, blog) {
  const nomiCat = Object.fromEntries(dati.categorie.map((c) => [c.id, c.nome]));
  const ordine = [...modelli].sort((a, b) => {
    const pa = a.categoriaMigliore ? a.cat[a.categoriaMigliore].punti : 0, pb = b.categoriaMigliore ? b.cat[b.categoriaMigliore].punti : 0;
    return pb - pa || (b.download || 0) - (a.download || 0);
  });
  const orgs = [...new Set(modelli.map((m) => m.org).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const schede = ordine.map((m) => {
    const cats = Object.keys(m.cat).concat(m.senzaVoti ? m.catPiccoli : []);
    const c = m.categoriaMigliore && m.cat[m.categoriaMigliore];
    const q4 = m.hf ? m.hf.b * 0.606 + 1.2 : null;
    return `<a class="scheda-modello" href="${m.href}" data-cat="${[...new Set(cats)].join(' ')}" data-org="${esc(m.org)}" data-dim="${m.hf ? fasciaDim(m.hf.b) : ''}" data-api="${m.or?.gratis ? 1 : 0}" data-punti="${c ? c.punti : 0}" data-data="${m.primo || ''}" data-b="${m.hf?.b || 0}" data-testo="${esc((m.nome + ' ' + m.org).toLowerCase())}">
<span class="sm-testa"><b>${esc(m.nome)}</b><span class="org">${esc(m.org)}${m.licenza ? ' · ' + esc(m.licenza) : ''}</span></span>
<span class="sm-dati">
<span><span class="muted">Arena</span><b>${c ? c.punti : '—'}</b></span>
<span><span class="muted">Best rank</span><b>${c ? `#${c.pos}` : '—'}</b><span class="org">${c ? esc(nomiCat[m.categoriaMigliore]) : 'no votes'}</span></span>
<span><span class="muted">Size</span><b>${m.hf ? m.hf.b + ' B' : '—'}</b>${m.hf?.att && m.hf.att < m.hf.b ? `<span class="org">${m.hf.att} B active</span>` : ''}</span>
<span><span class="muted">4-bit needs</span><b>${q4 ? fmtGB(q4) : '—'}</b></span>
</span>
<span class="sm-tag">${etichetteGratis(m, true)}</span>
</a>`;
  }).join('\n');
  pagina({
    file: 'models.html', attiva: '/models.html', dati, blog,
    titolo: `All Free AI Models: Sizes, Scores, Where to Use Them · ${NOME_PIENO}`,
    descr: `${modelli.length} free and open-weight AI models with their Arena score, size, GPU memory needed and where to use them free.`,
    corpo: `<div style="display:grid;gap:.5rem">
<h1>All free models</h1>
<p class="lead">${modelli.length} models you can use without paying: open weights you can download, and models with a free API. Pick one to see its scores, memory needs and speed.</p>
</div>
<div class="panel filtri">
<label class="cerca"><span class="muted small">Search</span><input type="search" id="q" placeholder="Model or lab, for example qwen" autocomplete="off"></label>
<div class="campi">
<label>Category<select id="f-cat"><option value="">All</option>${dati.categorie.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select></label>
<label>Lab<select id="f-org"><option value="">All</option>${orgs.map((o) => `<option>${esc(o)}</option>`).join('')}</select></label>
<label>Size<select id="f-dim"><option value="">Any</option>${Object.entries(NOMI_FASCE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
<label>Sort by<select id="f-ord"><option value="punti">Arena score</option><option value="data">Newest</option><option value="b">Smallest first</option></select></label>
</div>
<label class="chk"><input type="checkbox" id="f-api"> Free API right now</label>
<p class="small muted" id="conta"></p>
</div>
<div class="griglia-modelli" id="griglia">
${schede}
</div>`,
    script: 'catalogo.js',
  });
}

// ---------- pagina del singolo modello ----------
const HARDWARE = [
  ['rtx3060-12', 1], ['rtx4060ti-16', 1], ['rtx3090', 1], ['rtx4090', 1], ['rtx5090', 1], ['rx7900xtx', 1],
  ['rtx3090', 2], ['rtx3090', 4], ['m4max-128', 1], ['strixhalo-128', 1], ['h100', 8],
];

export function pagineModelli(dati, storia, modelli, blog) {
  const nomiCat = Object.fromEntries(dati.categorie.map((c) => [c.id, c.nome]));
  const schede = Object.fromEntries(dati.schede.schede.map((s) => [s.id, s]));
  for (const m of modelli) {
    const cats = Object.keys(m.cat);
    const soloPesi = cats.length > 0 && cats.every((c) => SOLO_PESI.has(c));
    const testo = !soloPesi;
    const c0 = m.categoriaMigliore && m.cat[m.categoriaMigliore];

    const tessere = [
      ['Arena score', c0 ? c0.punti : '—', c0 ? `#${c0.pos} of ${c0.totale} in ${nomiCat[m.categoriaMigliore]}, paid models included` : 'Not voted on Arena yet'],
      ['Size', m.hf ? `${m.hf.b} B` : '—', m.hf?.att && m.hf.att < m.hf.b ? `${m.hf.att} B active per token (mixture of experts)` : m.hf ? 'parameters' : 'unknown'],
      ['4-bit download', m.hf ? fmtGB(m.hf.b * 0.606) : '—', m.hf ? 'weights only, Q4_K_M' : ''],
      ['Max context', m.hf?.ctx ? `${Math.round(m.hf.ctx / 1024)}K` : '—', m.hf?.ctx ? 'tokens, from the model config' : ''],
    ];

    const punteggi = cats.length ? `<div class="panel"><h2>Arena scores</h2><div class="tw"><table><thead><tr><th>Arena</th><th>Score</th><th>Rank</th><th>Votes</th></tr></thead><tbody>
${cats.map((c) => `<tr><td><a href="/#${c}">${esc(nomiCat[c])}</a></td><td class="n">${m.cat[c].punti}</td><td class="n">#${m.cat[c].pos} of ${m.cat[c].totale}</td><td class="n">${fmtNum(m.cat[c].voti)}</td></tr>`).join('')}
</tbody></table></div><p class="small muted">Rank among all models, paid ones included. Source: Arena leaderboard dataset.</p></div>` : `<div class="panel"><h2>No Arena votes yet</h2><p class="small">Arena has not voted on this model. It is listed because it is a popular small model on its lab's official Hugging Face page (${fmtNum(m.download || 0)} downloads a month).</p></div>`;

    const gratis = [];
    if (m.or?.gratis) gratis.push(`<li><b>Free API on OpenRouter</b>: model id <code>${esc(m.or.id)}</code>. <a href="/compare.html#${encodeURIComponent(m.or.id)}">Try it side by side</a> · <a href="https://openrouter.ai/${esc(m.or.id.replace(/:free$/, ''))}" rel="noopener">OpenRouter page</a></li>`);
    if (m.aperto && CHAT_WEB[m.org]) gratis.push(`<li><b>The lab's own chat</b>: <a href="${CHAT_WEB[m.org]}" rel="noopener">${esc(CHAT_WEB[m.org].replace('https://', ''))}</a> (free with daily limits)</li>`);
    if (m.aperto && m.hf) gratis.push(`<li><b>Download and run it at home</b>: <a href="https://huggingface.co/${esc(m.hf.repo)}" rel="noopener">official weights</a> · <a href="https://huggingface.co/models?search=${encodeURIComponent(m.hf.repo.split('/')[1] + ' gguf')}" rel="noopener">GGUF files for Ollama and LM Studio</a>${m.licenza === 'license to accept' ? ' (you accept the license on Hugging Face first)' : ''}</li>`);

    let memoria = '', velocita = '';
    if (m.hf) {
      const ctxs = testo ? [8192, 32768, 131072].filter((c) => !m.hf.ctx || c <= m.hf.ctx) : [0];
      memoria = `<div class="panel"><h2>GPU memory needed</h2><div class="tw"><table><thead><tr><th>Level</th>${ctxs.map((c) => `<th>${c ? Math.round(c / 1024) + 'K context' : 'Total'}</th>`).join('')}${testo ? '<th>Quality vs full</th>' : ''}</tr></thead><tbody>
${QUANTI.filter((p) => p.id !== 'Q2_K').map((p) => { const pq = perditaQualita(p, m.hf.b); return `<tr><td class="n">${p.id}</td>${ctxs.map((c) => `<td class="n">${fmtGB(m.hf.b * p.bpp + (c ? kvGB(m.hf, c) : 3) + 0.6)}</td>`).join('')}${testo ? `<td><span class="n">${pq < 0.1 ? '≈ 0%' : '+' + pq.toFixed(1) + '%'}</span> <span class="small muted">${giudizio(pq)}</span></td>` : ''}</tr>`; }).join('')}
</tbody></table></div><p class="small muted">Weights + ${testo ? 'context cache (from the model\'s architecture)' : 'text encoders and decoder (about 3 GB)'} + runtime.${testo ? ' Quality: increase in perplexity against the full model, from <a href="https://github.com/ggml-org/llama.cpp/blob/master/tools/perplexity/README.md" rel="noopener">llama.cpp tests</a>, scaled by model size.' : ''} <a href="/home.html">Simulate your own setup</a>.</p></div>`;
      const righe = HARDWARE.map(([id, n]) => {
        const s = schede[id]; if (!s) return '';
        const h = daScheda(s, { n, ram: 64, bandaRam: 96, ctx: 32768 });
        const r = simula(m.hf, h, soloPesi);
        const dove = r.dove === 'gpu' ? '<span class="tag chip-gpu">Fits in GPU</span>' : r.dove === 'ram' ? '<span class="tag chip-ram">GPU + 64 GB RAM</span>' : '<span class="tag bad">Does not fit</span>';
        return `<tr${r.dove === 'no' ? ' class="spento"' : ''}><td>${n > 1 ? n + ' × ' : ''}${esc(s.nome)}</td><td class="n">${fmtGB(h.vram)}</td><td>${dove}</td>${testo ? `<td class="n">${r.vel != null ? fmtVel(r.vel) + ' tok/s' : '—'}</td>` : ''}</tr>`;
      }).join('');
      velocita = `<div class="panel"><h2>${testo ? 'Speed on popular hardware' : 'Does it fit on popular hardware?'}</h2><div class="tw"><table><thead><tr><th>Hardware</th><th>GPU memory</th><th>Fits?</th>${testo ? '<th>Speed</th>' : ''}</tr></thead><tbody>${righe}</tbody></table></div>
<p class="small muted">Estimate at 4-bit${testo ? ' with 32K context' : ''}, 64 GB of DDR5 for offload. Speed ≈ memory bandwidth × 70% ÷ data read per token; real numbers vary by about ±30%.</p></div>`;
    }

    const andamenti = cats.map((c) => {
      const st = storia?.categorie[c];
      const valori = st?.serie[m.cat[c].nomeArena];
      if (!valori || valori.filter((v) => v != null).length < 2) return '';
      return `<div class="panel"><h2>${esc(nomiCat[c])} score over time</h2>${linee(st.date, [{ nome: m.nome, valori }], st.pagato)}</div>`;
    }).join('');

    // vicini in classifica, per navigare
    let vicini = '';
    if (m.categoriaMigliore) {
      const cat = m.categoriaMigliore;
      const altri = modelli.filter((x) => x !== m && x.cat[cat]).sort((a, b) => Math.abs(a.cat[cat].punti - c0.punti) - Math.abs(b.cat[cat].punti - c0.punti)).slice(0, 6);
      if (altri.length) vicini = `<div class="panel"><h2>Similar free models in ${esc(nomiCat[cat])}</h2><ul class="vicini">${altri.map((x) => `<li><a href="${x.href}">${esc(x.nome)}</a> <span class="muted small">${x.cat[cat].punti}${x.hf ? ' · ' + x.hf.b + ' B' : ''}</span></li>`).join('')}</ul></div>`;
    }

    const titoloPagina = `${m.nome}: Free? GPU Memory, Speed and Arena Score · ${NOME_PIENO}`;
    const descr = `${m.nome} by ${m.org}${c0 ? `, Arena score ${c0.punti} (#${c0.pos} in ${nomiCat[m.categoriaMigliore]})` : ''}${m.hf ? `, ${m.hf.b} B parameters, about ${fmtGB(m.hf.b * 0.606 + 1.2)} at 4-bit` : ''}. Where to use it free and how fast it runs on your GPU.`;
    pagina({
      file: `model/${m.slug}.html`, attiva: '/models.html', dati, blog,
      titolo: titoloPagina, descr,
      corpo: `<p class="briciole small"><a href="/models.html">All models</a> › ${esc(m.org)}</p>
<div style="display:grid;gap:.4rem">
<h1>${esc(m.nome)}</h1>
<p class="lead">${esc(m.org)}${m.licenza ? ' · ' + esc(m.licenza) + ' license' : ''}${m.primo ? ` · on Arena since ${fmtData(m.primo)}` : ''}</p>
<div>${etichetteGratis(m)}</div>
</div>
<div class="tiles">${tessere.map(([a, b, c]) => `<div class="tile"><span class="small muted">${a}</span><b>${b}</b><span class="small muted">${esc(c)}</span></div>`).join('')}</div>
${gratis.length ? `<div class="panel"><h2>Where to use it for free</h2><ul class="dove">${gratis.join('')}</ul></div>` : ''}
${punteggi}
${velocita}
${memoria}
${andamenti}
${vicini}`,
    });
  }
}
