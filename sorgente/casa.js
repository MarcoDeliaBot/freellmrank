// Calcolo "in casa": quali modelli aperti entrano nelle GPU scelte, ordinati per voti Arena.
const $ = (id) => document.getElementById(id);
let dati = null;
let categoria = 'chat';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// pesi × byte per peso, +10%, +1,5 GB di contesto; +0,5 GB per ogni scheda oltre la prima
const serve = (b, bpp, schede) => b * bpp * 1.1 + 1.5 + 0.5 * (schede - 1);

function riga(m, gbServe, dove) {
  const hf = `https://huggingface.co/${m.hf.repo}`;
  const gguf = `https://huggingface.co/models?search=${encodeURIComponent(m.hf.repo.split('/')[1] + ' gguf')}`;
  return `<tr><td class="m"><b>${esc(m.nome)}</b><div class="org">${esc(m.org)} · ${esc(m.licenza)}</div></td>
<td class="n">${m.punti}<div class="org">#${m.pos}</div></td>
<td class="n">${m.hf.b} B</td><td class="n">~${Math.ceil(gbServe)} GB</td>
<td>${dove === 'vram' ? '<span class="tag free">Fits in GPU</span>' : '<span class="tag home">GPU + RAM (slow)</span>'}</td>
<td class="small"><a href="${hf}" rel="noopener">Model page</a> · <a href="${gguf}" rel="noopener">GGUF files</a></td></tr>`;
}

function tabella(titolo, righe) {
  if (!righe.length) return '';
  return `<div class="panel"><h2>${titolo}</h2><div class="tw"><table><thead><tr><th>Model</th><th>Arena score</th><th>Size</th><th>Needs</th><th>Where</th><th>Download</th></tr></thead><tbody>${righe.join('')}</tbody></table></div></div>`;
}

function calcola() {
  if (!dati) return;
  const n = +$('n-gpu').value, g = +$('gb-gpu').value, bpp = +$('quant').value, ram = +$('ram').value;
  const vram = n * g;
  $('totale').textContent = `Total GPU memory: ${vram} GB${ram ? ` + ${ram} GB system RAM` : ''}.`;
  const cat = dati.categorie.find((c) => c.id === categoria);
  const aperti = cat.modelli.filter((m) => m.aperto && m.hf);
  const visti = new Set();
  const inVram = [], ibridi = [];
  for (const m of aperti) {
    if (visti.has(m.hf.repo)) continue; // stesso modello votato in più varianti
    const s = serve(m.hf.b, bpp, n);
    if (s <= vram) { inVram.push(riga(m, s, 'vram')); visti.add(m.hf.repo); }
    else if (ram && s <= vram + ram * 0.85) { ibridi.push(riga(m, s, 'ram')); visti.add(m.hf.repo); }
  }
  const migliore = aperti.find((m) => serve(m.hf.b, bpp, n) <= vram);
  const testa = migliore
    ? `<div class="panel best"><span class="small muted">Best ${esc(cat.nome.toLowerCase())} model for ${n} × ${g} GB</span><h2>${esc(migliore.nome)}</h2><p class="small">Arena score ${migliore.punti} (#${migliore.pos} of ${cat.totale} models, paid ones included). ${migliore.hf.b} B parameters, about ${Math.ceil(serve(migliore.hf.b, bpp, n))} GB.</p></div>`
    : `<div class="panel"><h2>Nothing fits fully in ${vram} GB</h2><p class="small">Try 4-bit, add system RAM, or use a free model online: <a href="index.html#${categoria}">free ranking</a>.</p></div>`;
  $('esito-casa').innerHTML = testa + tabella('Fits in your GPUs', inVram.slice(0, 25)) + tabella('Fits with system RAM (much slower)', ibridi.slice(0, 15));
}

document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
  categoria = b.dataset.cat;
  document.querySelectorAll('.tabs button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  calcola();
}));
['n-gpu', 'gb-gpu', 'quant', 'ram'].forEach((id) => $(id).addEventListener('change', calcola));
fetch('dati.json').then((r) => r.json()).then((d) => { dati = d; calcola(); })
  .catch(() => { $('esito-casa').innerHTML = '<div class="panel"><p>Could not load the model list. Reload the page.</p></div>'; });
