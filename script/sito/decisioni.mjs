// Pagina dei modelli decisionali (stile Jev): classifica dal Jev Decision Index.
import fs from 'node:fs';
import path from 'node:path';
import { RADICE, esc, fmtData, pagina, NOME_PIENO } from './comune.mjs';
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

  const prime = lista.slice(0, 15).map((m) => ({ nome: m.nome, valore: m.punti, href: hrefHf(m), nota: `${m.punti > jev.punti ? '+' : ''}${(m.punti - jev.punti).toFixed(1)} vs Jev` }));
  const grafico = barre(prime, { riferimento: { valore: jev.punti, nome: jev.nome }, titoloAsse: 'Decision Index score' })
    .replace('Dashed line: best paid model', 'Dashed line: TypeSafe’s own model');
  const punti = lista.filter((m) => m.b && m.b >= 0.05).map((m) => ({ x: m.b, y: m.punti, nome: m.nome, href: hrefHf(m) }));
  const disp = dispersione(punti);

  const righe = lista.map((m, i) => {
    const dif = m.punti - jev.punti;
    const g = gb(m);
    return `<tr${m.punti > jev.punti ? ' class="consigliato"' : ''}>
<td class="n">${i + 1}</td>
<td class="m"><a class="nome-modello" href="${hrefHf(m)}" rel="noopener">${esc(m.nome)}</a><div class="org">${esc(m.org)}${m.base ? ' · based on ' + esc(m.base.split('/')[1] || m.base) : ''}</div></td>
<td class="n"><b>${m.punti.toFixed(1)}</b></td>
<td class="n">${dif >= 0 ? '+' : ''}${dif.toFixed(1)}</td>
<td class="small">${esc(TIPI[m.tipo] || m.tipo)}</td>
<td class="n">${m.b ? m.b + ' B' + (m.stimato ? ' <span class="org">est.</span>' : '') : '—'}</td>
<td>${m.repo ? '<span class="tag home">Yes</span>' : `<span class="muted small">${esc(m.nota || 'No')}</span>`}</td>
<td class="n">${g ? (g >= 10 ? g.toFixed(0) : g.toFixed(1)) + ' GB' : '—'}</td>
<td class="n">${m.ms != null ? Math.round(m.ms) + ' ms' : '—'}</td>
<td class="n">${m.ece != null ? (m.ece * 100).toFixed(1) + '%' : '—'}</td></tr>`;
  }).join('');

  pagina({
    file: 'decision.html', attiva: '/decision.html', dati, blog,
    titolo: `Best Free Decision Models (Jev-Style), Ranked · ${NOME_PIENO}`,
    descr: `${lista.length} open decision models that pick an option, a score or a yes/no with a probability, like TypeSafe’s Jev. ${sopra.length} beat Jev on the Decision Index; ${scaricabili.length} can be downloaded.`,
    corpo: `<div style="display:grid;gap:.5rem">
<h1>Decision models, ranked</h1>
<p class="lead">A decision model does not write text. It picks one option, gives a score, or answers yes or no with a probability, in a fraction of a second. TypeSafe AI released the first one, Jev, in September 2026; dozens of open models now copy the idea.</p>
</div>
<div class="tiles">
<div class="tile"><span class="small muted">Models ranked</span><b>${lista.length}</b><span class="small muted">${scaricabili.length} with a Hugging Face page</span></div>
<div class="tile"><span class="small muted">Best open model</span><b>${migliore.punti.toFixed(1)}</b><span class="small muted">${esc(migliore.nome)}</span></div>
<div class="tile"><span class="small muted">${esc(jev.nome)} (TypeSafe)</span><b>${jev.punti.toFixed(1)}</b><span class="small muted">closed model, the reference</span></div>
<div class="tile"><span class="small muted">Beat Jev</span><b>${sopra.length}</b><span class="small muted">open models score higher</span></div>
</div>
<div class="panel"><h2>Full ranking</h2>
<div class="tw"><table><thead><tr><th>Rank</th><th>Model</th><th>Decision Index</th><th>vs Jev</th><th>Type</th><th>Size</th><th>Download</th><th>4-bit needs</th><th>Time per decision</th><th>Calibration error</th></tr></thead>
<tbody>${righe}</tbody></table></div>
<p class="small muted">Decision Index: chance-corrected score from 0 (random guessing) to 100 (perfect), mixing public benchmarks (20%), private tests of the same skills (50%) and private tasks from new domains (30%). Time per decision: median, measured by the board on one ${esc(d.suite.hardware || 'GPU')}. Calibration error (ECE): how far the model’s stated probabilities are from how often it is right; lower is better. 4-bit needs: our estimate for the weights at Q4_K_M plus runtime. Highlighted rows beat Jev.</p></div>
<div class="grafici">
<div class="panel"><h2>Top 15 decision models</h2>${grafico}</div>
${disp ? `<div class="panel"><h2>Score against size</h2>${disp}</div>` : ''}
</div>
<div class="panel faq"><h2>About decision models</h2>
<details open><summary>What is it good for?</summary><p>Routing a request to the right model, classifying tickets or emails, yes/no checks, picking the next action of an agent, scoring answers. Anywhere an LLM would write a long reply just to say “B”.</p></details>
<details><summary>Is Jev free?</summary><p>Jev itself is a closed, hosted model from TypeSafe AI. The models in this ranking are open reproductions; most have weights on Hugging Face that you can download and run for free.</p></details>
<details><summary>Where do these scores come from?</summary><p>From the <a href="${SPACE}" rel="noopener">Jev Decision Index</a>, a community leaderboard on Hugging Face (Decision Index ${esc(d.suite.versione || '')}, ${d.suite.test || ''} public benchmarks plus private tests), last updated ${fmtData(d.aggiornato)}. It is unofficial and not affiliated with TypeSafe AI; neither are we. We copy its scores once a night and link every model to its page.</p></details>
</div>`,
  });
}
