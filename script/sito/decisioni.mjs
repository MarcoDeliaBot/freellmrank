// Pagina dei modelli decisionali (stile Jev): classifica dal Jev Decision Index.
import fs from 'node:fs';
import path from 'node:path';
import { RADICE, esc, fmtData, pagina, NOME_PIENO, spiega, barraSezioni } from './comune.mjs';
import { barre, dispersione } from './grafici.mjs';

const SPACE = 'https://huggingface.co/spaces/multimodalart/jev-decision-index';
const TIPI = {
  'full fine-tune': 'Fine-tuned model', LoRA: 'LoRA adapter', 'LoRA + head': 'LoRA + decision head',
  'head / adapter': 'Decision head', 'inference technique': 'Technique on a stock model', 'hosted API': 'Hosted API',
};

export function paginaDecisioni(dati, blog) {
  const file = path.join(RADICE, 'dati', 'decisioni.json');
  if (!fs.existsSync(file)) return;
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const jev = d.jev;
  const lista = d.modelli;
  const sopra = lista.filter((m) => m.punti > jev.punti);
  const scaricabili = lista.filter((m) => m.repo);
  const migliore = lista[0];
  const hrefHf = (m) => (m.repo ? `https://huggingface.co/${m.repo}` : `${SPACE}?model=${encodeURIComponent(m.id)}`);
  const gb = (m) => (m.b ? m.b * 0.606 + 1.2 : null);

  // colori: i primi cinque hanno lo stesso colore nei due grafici; Jev ha una barra sua, scura, al suo posto in classifica
  const COLORI = ['s1', 's2', 's3', 's4', 's5'];
  const coloreDi = new Map(lista.slice(0, 5).map((m, i) => [m.nome, COLORI[i]]));
  const prime = lista.slice(0, 15).map((m) => ({ nome: m.nome, valore: m.punti, href: hrefHf(m), colore: coloreDi.get(m.nome), nota: `${m.punti > jev.punti ? '+' : ''}${(m.punti - jev.punti).toFixed(1)} vs Jev` }));
  const voceJev = { nome: `${jev.nome} (TypeSafe)`, valore: jev.punti, href: `${SPACE}`, rif: true, nota: 'the reference: TypeSafe’s own decision model, closed' };
  const dove = prime.findIndex((v) => v.valore < jev.punti);
  if (dove < 0) prime.push(voceJev); else prime.splice(dove, 0, voceJev);
  const grafico = barre(prime, { riferimento: { valore: jev.punti, nome: jev.nome }, titoloAsse: 'Decision Index score',
    testoColori: 'The five best models have the same color in both charts.',
    testoRif: `Dark bar and dashed line: ${esc(jev.nome)}, TypeSafe’s own model (${jev.punti}). Bars that reach past the line score better than Jev.` });
  const punti = lista.filter((m) => m.b && m.b >= 0.05).map((m) => ({ x: m.b, y: m.punti, nome: m.nome, href: hrefHf(m), colore: coloreDi.get(m.nome) }));
  const disp = dispersione(punti, { riferimento: { valore: jev.punti, nome: jev.nome }, testoColori: 'Colored dots: the five best models, same colors as the bars. Dots above the dashed line beat Jev.' });

  // licenza: per lavoro servono licenze permissive; le "nc" (non commerciali) no
  const PERMISSIVE = /^(apache-2\.0|mit|bsd|bsd-3-clause|cc-by-4\.0|cc-by-sa-4\.0|openrail|gemma|llama3\.\d|qwen)$/i;
  const usoLavoro = (l) => (!l ? 'unknown' : /nc/i.test(l) ? 'no' : PERMISSIVE.test(l) ? 'yes' : 'check');
  const AREE = d.aree || [];
  const miniAree = (a) => `<span class="mini-aree" role="img" aria-label="${AREE.map((x) => `${x.nome}: ${a[x.id] ?? 'not measured'}`).join(', ')}">${AREE.map((x) => `<i title="${esc(x.nome)}: ${a[x.id] != null ? a[x.id] : 'not measured'}" style="height:${a[x.id] != null ? Math.max(2, a[x.id]) : 0}%"${a[x.id] == null ? ' class="vuota"' : ''}></i>`).join('')}</span>`;
  const forte = (a) => { const e = Object.entries(a); if (!e.length) return ''; const [id, v] = e.sort((p, q) => q[1] - p[1])[0]; return `${esc(AREE.find((x) => x.id === id)?.nome || id)} ${v}`; };

  const righe = lista.map((m, i) => {
    const dif = m.punti - jev.punti;
    const g = gb(m);
    const lavoro = usoLavoro(m.licenza);
    return `<tr data-lavoro="${lavoro}" data-img="${m.vision ? 1 : 0}" data-gb="${g != null ? g.toFixed(1) : ''}"${m.punti > jev.punti ? ' class="consigliato"' : ''}>
<td class="n">${i + 1}</td>
<td class="m"><a class="nome-modello" href="${hrefHf(m)}" rel="noopener">${esc(m.nome)}</a><div class="org">${esc(m.org)}${m.base ? ' · based on ' + esc(m.base.split('/')[1] || m.base) : ''}</div></td>
<td class="n"><b>${m.punti.toFixed(1)}</b><div class="org">${dif >= 0 ? '+' : ''}${dif.toFixed(1)} vs Jev</div></td>
<td>${miniAree(m.aree || {})}<div class="org">best: ${forte(m.aree || {})}</div></td>
<td class="n">${m.ms != null ? `<b>${Math.round(m.ms)} ms</b><div class="org">${(1000 / m.ms).toFixed(m.ms > 100 ? 1 : 0)} per second${m.p95 != null ? ` · slow case ${Math.round(m.p95)} ms` : ''}</div>` : '—'}</td>
<td>${m.vision ? `<span class="tag home">Yes</span><div class="org">vision score ${m.vision.punti}${m.vision.ms != null ? ` · ${Math.round(m.vision.ms)} ms` : ''}</div>` : '<span class="muted small">text only</span>'}</td>
<td class="n">${m.ece != null ? (m.ece * 100).toFixed(1) + '%' : '—'}</td>
<td class="n">${m.b ? m.b + ' B' + (m.stimato ? ' <span class="org">est.</span>' : '') : '—'}<div class="org">${g ? (g >= 10 ? g.toFixed(0) : g.toFixed(1)) + ' GB at 4-bit' : ''}</div></td>
<td>${m.repo ? '<span class="tag home">Yes</span>' : `<span class="muted small">${esc(m.nota || 'No')}</span>`}<div class="org">${esc(m.licenza || '')}</div></td>
<td>${{ yes: '<span class="tag free">Yes</span>', no: '<span class="tag bad">No (non-commercial)</span>', check: '<span class="tag web">Check license</span>', unknown: '<span class="muted small">—</span>' }[lavoro]}</td>
<td class="small">${esc(TIPI[m.tipo] || m.tipo)}</td></tr>`;
  }).join('');

  pagina({
    file: 'decision.html', attiva: '/decision.html', dati, blog,
    script: 'decision.js',
    jsonld: { '@type': 'ItemList', name: 'Best open decision models (Jev-style)', itemListOrder: 'https://schema.org/ItemListOrderDescending', itemListElement: lista.slice(0, 20).map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.nome, url: hrefHf(m) })) },
    titolo: `Best Free Decision Models (Jev-Style), Ranked · ${NOME_PIENO}`,
    descr: `${lista.length} open decision models that pick an option, a score or a yes/no with a probability, like TypeSafe’s Jev. ${sopra.length} score better than Jev on the Decision Index; ${scaricabili.length} can be downloaded.`,
    corpo: `<div style="display:grid;gap:.5rem">
<h1>Decision models, ranked</h1>
<p class="lead">A decision model does not write text. It picks one option, gives a score, or answers yes or no with a probability, in a fraction of a second. TypeSafe AI released the first one, Jev, in September 2026; dozens of open models now copy the idea.</p>
</div>
<div class="tiles">
<div class="tile"><span class="small muted">Models ranked</span><b>${lista.length}</b><span class="small muted">${scaricabili.length} with a Hugging Face page</span></div>
<div class="tile"><span class="small muted">Best open model</span><b>${migliore.punti.toFixed(1)}</b><span class="small muted">${esc(migliore.nome)}</span></div>
<div class="tile"><span class="small muted">${esc(jev.nome)} (TypeSafe)</span><b>${jev.punti.toFixed(1)}</b><span class="small muted">closed model, the reference</span></div>
<div class="tile"><span class="small muted">Better than Jev</span><b>${sopra.length}</b><span class="small muted">open models score higher than Jev, the first decision model</span></div>
${(() => { const b = lista.find((m) => usoLavoro(m.licenza) === 'yes'); return b ? `<div class="tile"><span class="small muted">Best for business use</span><b>${b.punti.toFixed(1)}</b><span class="small muted">${esc(b.nome)} · ${esc(b.licenza)}</span></div>` : ''; })()}
</div>
${barraSezioni([['ranking', 'Full ranking'], ['charts', 'Charts'], ['about', 'About decision models']])}
<div class="panel" id="ranking"><h2>Full ranking</h2>
<div class="row">
<label class="chk"><input type="checkbox" id="f-lavoro"> Commercial use allowed</label>
<label class="chk"><input type="checkbox" id="f-img"> Understands images</label>
<label class="small">Fits my hardware <select id="f-scheda"><option value="">Any hardware</option>${(() => { const gr = {}; for (const s of dati.schede.schede) (gr[s.marca] ||= []).push(s); return Object.entries(gr).map(([mk, l]) => `<optgroup label="${esc(mk)}">${l.map((s) => `<option value="${esc(s.nome)}" data-gb="${s.unificata ? (s.gb * 0.75).toFixed(1) : s.gb}">${esc(s.nome)} · ${s.gb} GB</option>`).join('')}</optgroup>`).join(''); })()}</select></label>
<label class="small">× <select id="f-quante">${[1, 2, 3, 4, 8].map((n) => `<option>${n}</option>`).join('')}</select> cards</label>
<span class="small muted" id="conta-dec"></span>
</div>
<div class="tw"><table><thead><tr><th>Rank</th><th>Model</th><th>Decision Index</th><th>Areas</th><th>Speed</th><th>Images</th><th>Calibration error</th><th>Size</th><th>Download</th><th>Commercial use</th><th>Type</th></tr></thead>
<tbody>${righe}</tbody></table></div>
<p class="small muted">Decision Index: chance-corrected score from 0 (random guessing) to 100 (perfect), mixing public benchmarks (20%), private tests of the same skills (50%) and private tasks from new domains (30%). Areas, left to right: ${AREE.map((x) => esc(x.nome)).join(', ')} (empty bar: not measured yet). Speed: median time per decision and the slow case (95th percentile), measured by the board on one ${esc(d.suite.hardware || 'GPU')}; a decision model returns one answer, so tokens per second do not apply. Images: score on the board’s separate Vision ranking (${esc(d.visionEdizione || '')}). Calibration error (ECE): how far stated probabilities are from how often the model is right; lower is better. Commercial use: from the license on the model’s Hugging Face page; “non-commercial” licenses (NC) forbid business use. 4-bit size and “fits my hardware” are our estimates. Highlighted rows score better than Jev.</p></div>
<div class="grafici">
<div class="panel" id="charts"><h2>Top 15 decision models</h2>${grafico}${spiega('The 15 best open decision models on the Jev Decision Index, with Jev itself (the dark striped bar) as the reference.', 'Longer bar, better model. Bars that reach past the dashed line score better than Jev. The five best have the same colors in both charts.')}</div>
${disp ? `<div class="panel"><h2>Score against size</h2>${disp}${spiega('Every decision model with a known size: Decision Index score against its number of parameters.', 'Up is better, left is smaller. Dots above the dashed Jev line beat Jev; the green corner holds the small and strong ones, cheapest to run.')}</div>` : ''}
</div>
<div class="panel faq" id="about"><h2>About decision models</h2>
<details open><summary>What is it good for?</summary><p>Routing a request to the right model, classifying tickets or emails, yes/no checks, picking the next action of an agent, scoring answers. Anywhere an LLM would write a long reply just to say “B”.</p></details>
<details><summary>Is Jev free?</summary><p>Jev itself is a closed, hosted model from TypeSafe AI. The models in this ranking are open reproductions; most have weights on Hugging Face that you can download and run for free.</p></details>
<details><summary>Where do these scores come from?</summary><p>From the <a href="${SPACE}" rel="noopener">Jev Decision Index</a>, a community leaderboard on Hugging Face (Decision Index ${esc(d.suite.versione || '')}, ${d.suite.test || ''} public benchmarks plus private tests), last updated ${fmtData(d.aggiornato)}. It is unofficial and not affiliated with TypeSafe AI; neither are we. We copy its scores once a night and link every model to its page.</p></details>
</div>`,
  });
}
