// Pagina /apps: le app per usare l'AI (agenti di programmazione, editor, app per i modelli in casa,
// fine-tuning, costruttori di app), divise fra gratis e a pagamento, con i risultati dei test pubblici
// e i token per compito. Dati scritti a mano e controllati sulle pagine ufficiali: dati/app.json.
import fs from 'node:fs';
import path from 'node:path';
import { esc, pagina, NOME_PIENO, RADICE, fmtData } from './comune.mjs';
import { barre } from './grafici.mjs';

export const PREZZI = {
  free: ['Free', 'The app is free; no plan to buy.'],
  byok: ['Free with your model', 'The app is free; you plug in a model: a free one, a local one, or your own paid key.'],
  tier: ['Free plan with limits', 'There is a free plan, with a monthly or daily limit; more needs a paid plan.'],
  paid: ['Paid', 'No free plan.'],
  unknown: ['Price not verified', 'We could not check the price on an official page.'],
};

export function paginaApp(dati, blog) {
  const file = path.join(RADICE, 'dati', 'app.json');
  if (!fs.existsSync(file)) return;
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const tutte = d.gruppi.flatMap((g) => g.app);
  const conta = (p) => tutte.filter((a) => a.prezzo === p).length;
  const COLORI = ['s1', 's2', 's3', 's4', 's5'];
  // le barre portano alla riga dell'app su questa pagina, non al sito della fonte (citato una volta in fondo)
  const ancora = (nome) => 'app-' + String(nome).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const nomi = new Set(tutte.map((a) => ancora(a.nome)));
  const versoRiga = (app, riserva) => { const k = ancora(app === 'Codex' ? 'Codex CLI' : app); return nomi.has(k) ? `#${k}` : riserva; };

  const tabella = (g) => `<div class="panel" id="${g.id}"><h2>${esc(g.nome)}</h2>
<div class="tw"><table class="tab-app"><thead><tr><th>App</th><th>Price</th><th>What is free</th><th>Open source</th><th>Free or local models</th></tr></thead><tbody>
${g.app.map((a) => `<tr id="${ancora(a.nome)}" data-prezzo="${a.prezzo}"><td><a href="${esc(a.url)}" rel="noopener"><b>${esc(a.nome)}</b></a></td>
<td><span class="prezzo prezzo-${a.prezzo}">${PREZZI[a.prezzo][0]}</span></td>
<td class="small">${esc(a.limiti)}${a.verificato === false ? ' <span class="muted">(partly unverified)</span>' : ''}</td>
<td class="small">${a.oss ? `${a.repo ? `<a href="${esc(a.repo)}" rel="noopener">${esc(a.oss)}</a>` : esc(a.oss)}` : '<span class="muted">closed</span>'}</td>
<td>${a.locale ? 'Yes' : '<span class="muted">No</span>'}</td></tr>`).join('\n')}
</tbody></table></div></div>`;

  const r = d.risultati, t = d.token;
  const graficoRisultati = barre(r.righe.map((x, i) => ({ nome: `${x.app} · ${x.modello}`, valore: x.punti, href: versoRiga(x.app, '#best'), colore: i < 5 ? COLORI[i] : undefined })),
    { titoloAsse: `${r.nome}: tasks solved (%)`, testoColori: 'Higher is better.', formato: (v) => `${v}%`, daZero: true });
  const graficoToken = barre([...t.righe].sort((a, b) => a.token_m - b.token_m).map((x) => ({ nome: `${x.app}${x.modello ? ' · ' + x.modello : ''}`, valore: x.token_m, href: versoRiga(x.app, '#tokens'), nota: `index ${x.indice}, $${x.dollari} per task` })),
    { titoloAsse: 'Million tokens used per coding task', testoColori: 'Shorter is better: fewer tokens for each task.', formato: (v) => `${v}M`, daZero: true });

  pagina({
    file: 'apps.html', attiva: '/apps.html', dati, blog, script: 'apps.js',
    titolo: `Free and Paid AI Apps: Coding Agents, Editors, Local Model Apps · ${NOME_PIENO}`,
    descr: `${tutte.length} AI apps checked: which are free, which are free with your own or a local model, which have a free plan, which are paid. Plus which give the best results and use the fewest tokens.`,
    corpo: `<div style="display:grid;gap:.4rem">
<h1>AI apps: free and paid</h1>
<p class="lead">The apps people use with AI models: coding agents, code editors, apps to run models at home, to fine-tune them, and to build apps. For each one: what you can use free, whether it works with free or local models, and, where tests exist, which gives the best results and uses the fewest tokens.</p>
</div>
<div class="tiles">
<div class="tile"><span class="small muted">${PREZZI.free[0]}</span><b>${conta('free')}</b><span class="small muted">apps</span></div>
<div class="tile"><span class="small muted">${PREZZI.byok[0]}</span><b>${conta('byok')}</b><span class="small muted">apps</span></div>
<div class="tile"><span class="small muted">${PREZZI.tier[0]}</span><b>${conta('tier')}</b><span class="small muted">apps</span></div>
<div class="tile"><span class="small muted">${PREZZI.paid[0]}</span><b>${conta('paid')}</b><span class="small muted">apps</span></div>
</div>
<div class="panel"><div class="row app-filtri"><span class="small muted">Show:</span><span class="tabs" role="group" aria-label="Price">
<button type="button" aria-pressed="true" data-prezzo="">All</button>${Object.entries(PREZZI).filter(([k]) => k !== 'unknown').map(([k, [n]]) => `<button type="button" aria-pressed="false" data-prezzo="${k}">${n}</button>`).join('')}</span></div>
<ul class="small app-legenda">${Object.entries(PREZZI).filter(([k]) => k !== 'unknown').map(([k, [n, s]]) => `<li><span class="prezzo prezzo-${k}">${n}</span> ${esc(s)}</li>`).join('')}</ul>
<p class="small muted">Jump to: ${d.gruppi.map((g) => `<a href="#${g.id}">${esc(g.nome)}</a>`).join(' · ')} · <a href="#best">Best results</a> · <a href="#tokens">Fewest tokens</a></p></div>
${d.gruppi.map(tabella).join('\n')}
<div class="panel" id="best"><h2>Which coding agents give the best results</h2>${graficoRisultati}
<p class="small muted">${esc(r.nota)} ${esc(r.stessoModello)} Source: <a href="${r.url}" rel="noopener">${esc(r.nome)}</a>.</p></div>
<div class="panel" id="tokens"><h2>Which use the fewest tokens</h2>${graficoToken}
<div class="tw"><table><thead><tr><th>App</th><th>Model</th><th>Score</th><th>Tokens per task</th><th>Cost per task</th></tr></thead><tbody>
${t.righe.map((x) => `<tr><td>${esc(x.app)}</td><td>${esc(x.modello || '—')}</td><td class="n"><b>${x.indice}</b></td><td class="n">${x.token_m}M</td><td class="n">$${x.dollari.toFixed(2)}</td></tr>`).join('')}
</tbody></table></div>
<p class="small muted">${esc(t.nota)} Score: the ${esc(t.nome)} (higher is better). Source: <a href="${t.url}" rel="noopener">${esc(t.nome)}</a>. Apart from this index, we found no rigorous public test of token use app by app.</p></div>
<div class="panel"><h2>No longer maintained</h2><ul class="dove">${d.chiusi.map((c) => `<li><b>${esc(c.nome)}</b>: ${esc(c.nota)}.</li>`).join('')}</ul></div>
<p class="small muted">Prices and free limits checked on the official pages on ${fmtData(d.controllato)}. Free plans change often: check the app’s own page before you rely on a limit. We are not paid by any of these apps.</p>`,
  });
}
