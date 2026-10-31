// Pagine "A vs B": i 15 modelli gratis più votati in chat, a coppie (105 pagine).
// Rispondono alla ricerca "qwen vs gemma": chi vince secondo i voti di Arena, in quali categorie, quanto pesa,
// quanto va veloce in casa e dove si usa gratis. Ogni coppia ha un solo indirizzo (nomi in ordine alfabetico).
import { esc, pagina, NOME_PIENO, URL_SITO, conLicenza } from './comune.mjs';
import { simula, daScheda } from '../../sorgente/calc.mjs';
import { fmtVel } from '../../sorgente/gpu-table.mjs';
import { avvisoArchivio } from './pagine-pubblicate.mjs';

const QUANTI = 15;
const HARDWARE = [['rtx3090', 1], ['rtx4090', 1], ['rtx5090', 1], ['rx7900xtx', 1], ['m4max-128', 1], ['strixhalo-128', 1]];
const gb4 = (b) => b * 0.606 + 1.2;
const fmtGB = (g) => (g >= 100 ? Math.round(g) : g >= 10 ? g.toFixed(0) : g.toFixed(1)) + ' GB';
// famiglia: il nome (del repository Hugging Face, se c'è) senza varianti (date, high, preview, max, thinking...)
const famiglia = (m) => String(m.hf ? m.hf.repo.split('/')[1] : m.nome).toLowerCase()
  .replace(/\(.*?\)/g, '').replace(/[-_ ](high|low|max|preview|thinking|instant|exp|\d{6,8})(?=$|[-_ ])/g, '').replace(/[^a-z0-9.]+/g, '-').replace(/-+$/, '');
const vince = (x, y) => 1 / (1 + 10 ** ((y - x) / 400)); // probabilità che x batta y, scala di Arena

// decide le coppie e le aggancia ai modelli (m.confronti), così le pagine dei modelli possono linkarle
export function preparaConfronti(modelli) {
  // una sola versione per famiglia (niente tre DeepSeek V4 Pro con date diverse): tiene la più votata
  const visti = new Set();
  const primi = modelli.filter((m) => m.cat.chat).sort((a, b) => b.cat.chat.punti - a.cat.chat.punti)
    .filter((m) => { const f = famiglia(m); if (visti.has(f)) return false; visti.add(f); return true; }).slice(0, QUANTI);
  const coppie = [];
  for (let i = 0; i < primi.length; i++) for (let j = i + 1; j < primi.length; j++) {
    const [a, b] = [primi[i], primi[j]].sort((x, y) => x.slug.localeCompare(y.slug));
    const file = `compare/${a.slug}-vs-${b.slug}.html`;
    coppie.push({ a, b, file, href: `/${file}` });
  }
  for (const m of primi) m.confronti = coppie.filter((c) => c.a === m || c.b === m).map((c) => ({ href: c.href, altro: c.a === m ? c.b : c.a }));
  return coppie;
}

export function pagineConfronti(dati, coppie, blog) {
  const nomiCat = Object.fromEntries(dati.categorie.map((c) => [c.id, c.nome]));
  const schede = Object.fromEntries(dati.schede.schede.map((s) => [s.id, s]));
  for (const { a, b, file } of coppie) {
    const pa = vince(a.cat.chat.punti, b.cat.chat.punti);
    const [primo, secondo, p] = pa >= 0.5 ? [a, b, pa] : [b, a, 1 - pa];
    const vicino = Math.abs(a.cat.chat.punti - b.cat.chat.punti) < 10;
    const cats = Object.keys(a.cat).filter((c) => b.cat[c] && c !== 'agent'); // gli agenti hanno un'altra scala: fuori dal confronto a punti
    const righeCat = cats.map((c) => {
      const x = a.cat[c].punti, y = b.cat[c].punti;
      return `<tr><td>${esc(nomiCat[c] || c)}</td><td class="n"${x > y ? ' style="font-weight:700"' : ''}>${x}</td><td class="n"${y > x ? ' style="font-weight:700"' : ''}>${y}</td><td>${Math.abs(x - y) < 10 ? 'about even' : esc((x > y ? a : b).nome)}</td></tr>`;
    }).join('');
    const dim = (m) => (m.hf ? `${m.hf.b} B${m.hf.att && m.hf.att < m.hf.b * 0.6 ? ` (${m.hf.att} B active)` : ''}` : 'not public');
    const righeHw = HARDWARE.map(([id, n]) => {
      const s = schede[id]; if (!s) return '';
      const h = daScheda(s, { n, ram: 64, ctx: 8192 });
      const cella = (m) => { if (!m.hf) return '<span class="muted">online only</span>'; const r = simula(m.hf, h); return r.dove === 'no' ? '<span class="muted">does not fit</span>' : `${fmtVel(r.vel)} tok/s${r.dove === 'ram' ? ' <span class="tag chip-ram">+RAM</span>' : ''}`; };
      return `<tr><td><a href="/gpu/${id}.html">${esc(s.nome)}</a></td><td class="n">${cella(a)}</td><td class="n">${cella(b)}</td></tr>`;
    }).join('');
    const gratis = (m) => [m.or?.gratis ? 'free API on OpenRouter' : '', m.aperto && m.hf ? 'download and run at home' : '', m.licenza ? conLicenza(m.licenza) : ''].filter(Boolean).join(' · ') || '—';
    const verdetto = vicino
      ? `${a.nome} and ${b.nome} are about even on Arena (${a.cat.chat.punti} vs ${b.cat.chat.punti}): in a blind vote each wins about half the time.`
      : `${primo.nome} is ahead on Arena (${primo.cat.chat.punti} vs ${secondo.cat.chat.punti}): in a blind vote people prefer it about ${Math.round(p * 100)}% of the time.`;
    const altri = (m) => (m.confronti || []).filter((c) => c.altro !== a && c.altro !== b).slice(0, 6);

    pagina({
      file, attiva: '/models.html', dati, blog,
      titolo: `${a.nome} vs ${b.nome}`,
      descr: `${verdetto} Size, memory, speed on home GPUs and where to use both for free.`,
      jsonld: { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'All free models', item: `${URL_SITO}/models` },
        { '@type': 'ListItem', position: 2, name: `${a.nome} vs ${b.nome}`, item: `${URL_SITO}/${file.replace(/\.html$/, '')}` },
      ] },
      corpo: `<p class="briciole small"><a href="/models.html">All models</a> › Compare</p>
<div style="display:grid;gap:.4rem">
<h1>${esc(a.nome)} vs ${esc(b.nome)}</h1>
${avvisoArchivio(a)}
${avvisoArchivio(b)}
<p class="lead">${esc(verdetto)}</p>
</div>
<div class="tiles">
<div class="tile"><span class="small muted"><a href="${a.href}">${esc(a.nome)}</a></span><b>${a.cat.chat.punti}</b><span class="small muted">Arena chat · #${a.cat.chat.pos} of ${a.cat.chat.totale}</span></div>
<div class="tile"><span class="small muted"><a href="${b.href}">${esc(b.nome)}</a></span><b>${b.cat.chat.punti}</b><span class="small muted">Arena chat · #${b.cat.chat.pos} of ${b.cat.chat.totale}</span></div>
</div>
<div class="panel"><h2>Arena scores by category</h2><div class="tw"><table><thead><tr><th>Category</th><th>${esc(a.nome)}</th><th>${esc(b.nome)}</th><th>Ahead</th></tr></thead><tbody>${righeCat}</tbody></table></div>
<p class="small muted">Scores from blind human votes on Arena. A gap under 10 points is too small to call.</p></div>
<div class="panel"><h2>Size and where to use them free</h2><div class="tw"><table><thead><tr><th></th><th>${esc(a.nome)}</th><th>${esc(b.nome)}</th></tr></thead><tbody>
<tr><td>Made by</td><td>${esc(a.org)}</td><td>${esc(b.org)}</td></tr>
<tr><td>Size</td><td class="n">${dim(a)}</td><td class="n">${dim(b)}</td></tr>
<tr><td>4-bit download</td><td class="n">${a.hf ? fmtGB(gb4(a.hf.b)) : '—'}</td><td class="n">${b.hf ? fmtGB(gb4(b.hf.b)) : '—'}</td></tr>
<tr><td>Use it free</td><td>${esc(gratis(a))}</td><td>${esc(gratis(b))}</td></tr>
</tbody></table></div></div>
<div class="panel"><h2>Speed at home</h2><div class="tw"><table><thead><tr><th>Hardware</th><th>${esc(a.nome)}</th><th>${esc(b.nome)}</th></tr></thead><tbody>${righeHw}</tbody></table></div>
<p class="small muted">Estimates at 4-bit with an 8K context, 64 GB of system RAM for offload, calibrated on 44 real llama.cpp tests.</p></div>
<div class="panel"><h2>Try them yourself</h2><p>Ask both the same question side by side in <a href="/compare.html">Try &amp; compare</a>, or vote blind between free models in <a href="/arena.html">Free Arena</a>.</p></div>
${altri(a).length || altri(b).length ? `<div class="panel"><h2>More comparisons</h2><ul class="vicini">${[...altri(a).map((c) => [a, c]), ...altri(b).map((c) => [b, c])].slice(0, 10).map(([m, c]) => `<li><a href="${c.href}">${esc(m.nome)} vs ${esc(c.altro.nome)}</a></li>`).join('')}</ul></div>` : ''}`,
    });
  }
}
