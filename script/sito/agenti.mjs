// Pagina /always-on-agents: comparatore degli agenti AI sempre attivi (6/11/2026, Marco: «Comparatore Agenti AI
// Always-On, dobbiamo metterli sul nostro sito», anche i sistemi gratuiti). Dati e fonti in dati/agenti-always-on.json:
// solo fatti letti sulle pagine ufficiali; quello che la fonte non dice resta «not stated».
// 6/11 sera (Marco: «non vedo un indice di stabilità e affidabilità», «in alto un grafico»): indice di affidabilità
// 0-100 calcolato qui con una formula scritta anche sulla pagina, e in alto cursori di priorità con le barre degli agenti
// ordinate per affinità (sorgente/agents.js ricalcola; senza JS restano le barre coi pesi uguali).
import fs from 'node:fs';
import path from 'node:path';
import { esc, pagina, NOME_PIENO, RADICE, barraSezioni, nuovo } from './comune.mjs';

const VALORI = { yes: ['Yes', 'free'], no: ['No', 'bad'], partial: ['Partly', 'quota'], unclear: ['Not stated', 'novoti'] };
const valore = (v) => { const [t, c] = VALORI[v] || VALORI.unclear; return `<span class="tag ${c}">${t}</span>`; };
const fmtData = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const num = (n) => n.toLocaleString('en-US');

// ---------- indice di affidabilità (0-100) ----------
const STADI = { stable: [40, 'Generally available'], early: [25, 'Early release or rolling out'], preview: [10, 'Preview or waitlist'], announced: [5, 'Announced only'] };
const mesi = (dal, oggi) => (Date.parse(oggi) - Date.parse(dal)) / (30.44 * 864e5);
export function affidabilita(a, oggi) {
  const stadio = STADI[a.stadio]?.[0] ?? 0;
  const m = mesi(a.dal, oggi);
  const storia = m >= 12 ? 30 : m >= 6 ? 20 : m >= 3 ? 10 : 5;
  let cura;
  if (a.tipo === 'open') cura = (a.commit30 >= 50 ? 15 : a.commit30 >= 1 ? 8 : 0) + (a.rilasci90 >= 3 ? 15 : a.rilasci90 >= 1 ? 8 : 0);
  else cura = (mesi(a.aggiornato, oggi) <= 1 ? 15 : 0) + (a.incidenti?.length ? 0 : 15);
  return { stadio, storia, cura, totale: stadio + storia + cura, mesi: m };
}

// valori per l'affinità: Sì 1, In parte 0,5, No o non dichiarato 0
const V = { yes: 1, partial: 0.5 };
const CRITERI = [
  ['italia', 'Available in Italy / EU now', (a) => V[a.italia] || 0],
  ['gratis', 'Free to use', (a) => (a.gratis ? (a.modelloPagato ? 0.5 : 1) : 0)],
  ['browser', 'Watch the browser live', (a) => V[a.browserLive] || 0],
  ['mcp', 'Custom MCP servers', (a) => V[a.mcp] || 0],
  ['approvazioni', 'Asks before risky actions', (a) => V[a.approvazioni] || 0],
  ['affidabilita', 'Reliability', (a) => a.indice.totale / 100],
];
const affinita = (a, pesi) => { const tot = pesi.reduce((s, p) => s + p, 0) || 1; return Math.round((100 * CRITERI.reduce((s, [, , f], i) => s + pesi[i] * f(a), 0)) / tot); };

export function paginaAgenti(dati, blog) {
  const file = path.join(RADICE, 'dati', 'agenti-always-on.json');
  if (!fs.existsSync(file)) return;
  const { agenti, verificato } = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const a of agenti) a.indice = affidabilita(a, verificato);
  const quanti = agenti.length, aperti = agenti.filter((a) => a.tipo === 'open'), lab = agenti.filter((a) => a.tipo !== 'open');
  const inItalia = agenti.filter((a) => a.italia === 'yes').length;
  const piuAffidabile = [...agenti].sort((x, y) => y.indice.totale - x.indice.totale)[0];

  // ---------- grafico in alto: barre ordinate per affinità, pesi uguali finché il lettore non muove i cursori ----------
  const pesi0 = CRITERI.map(() => 5);
  const ordinati = [...agenti].map((a) => ({ a, p: affinita(a, pesi0) })).sort((x, y) => y.p - x.p);
  const datiJs = agenti.map((a) => ({ id: a.id, nome: a.nome, azienda: a.azienda, v: CRITERI.map(([, , f]) => +f(a).toFixed(2)) }));
  const barra = ({ a, p }) => `<a class="aff-riga" href="#${esc(a.id)}" data-id="${esc(a.id)}"><span class="aff-nome">${esc(a.nome)}<span class="small muted"> ${esc(a.tipo === 'open' ? 'free, open source' : a.azienda)}</span></span><span class="aff-barra"><span style="width:${p}%"></span></span><b class="aff-pc">${p}%</b></a>`;
  const grafico = `<div class="panel" id="match"><h2>Which agent fits you</h2>
<p class="small muted">Move the sliders to say what matters to you. Each agent gets an affinity score from the facts in its card below: Yes counts 1, Partly 0.5, No or Not stated 0, and Reliability is its index out of 100.</p>
<div class="aff">
<div class="aff-cursori">${CRITERI.map(([k, n], i) => `<label class="aff-cursore"><span>${n}</span><input type="range" min="0" max="10" step="1" value="${pesi0[i]}" data-criterio="${k}" aria-label="${esc(n)}: importance"><output>${pesi0[i]}</output></label>`).join('')}</div>
<div><div class="aff-top" id="aff-top"><span class="small muted">Best match for your priorities</span><b id="aff-top-nome">${esc(ordinati[0].a.nome)}</b><span class="aff-top-pc" id="aff-top-pc">${ordinati[0].p}%</span></div>
<div class="aff-barre" id="aff-barre">${ordinati.map(barra).join('')}</div></div>
</div>
<script type="application/json" id="agenti-dati">${JSON.stringify({ criteri: CRITERI.map(([k]) => k), agenti: datiJs }).replace(/</g, '\\u003c')}</script>
</div>`;

  // ---------- schede ----------
  const riga = (nome, v, nota) => `<div class="agente-riga"><span class="small muted">${nome}</span>${valore(v)}${nota ? `<span class="small">${esc(nota)}</span>` : ''}</div>`;
  const indice = (a) => {
    const i = a.indice;
    const dett = a.tipo === 'open'
      ? `${num(a.stelle)} GitHub stars · ${a.commit30 >= 100 ? '100+' : a.commit30} commits in the last 30 days · ${a.rilasci90} releases in the last 90 days`
      : `Last official update ${fmtData(a.aggiornato)}${a.incidenti.length ? '' : ' · no security incident found'}`;
    return `<div class="agente-indice"><div class="agente-indice-testa"><span class="small muted">Reliability index</span><b>${i.totale}<span class="small muted">/100</span></b></div>
<span class="aff-barra"><span style="width:${i.totale}%"></span></span>
<span class="small">${esc(STADI[a.stadio][1])}: ${esc(a.stadioNota)}. Public for ${i.mesi < 1 ? 'less than a month' : `${Math.floor(i.mesi)} month${Math.floor(i.mesi) === 1 ? '' : 's'}`}${a.dalNota ? ` (${esc(a.dalNota)})` : ''}.</span>
<span class="small muted">${dett}. Stage ${i.stadio}/40 · Track record ${i.storia}/30 · Upkeep ${i.cura}/30</span>
${(a.incidenti || []).map(([t, u]) => `<span class="small agente-incidente">Incident: <a href="${esc(u)}" rel="noopener" target="_blank">${esc(t)}</a></span>`).join('')}</div>`;
  };
  const scheda = (a) => `<article class="agente" id="${esc(a.id)}" data-gratis="${a.gratis}" data-italia="${esc(a.italia)}" data-browser="${esc(a.browserLive)}" data-mcp="${esc(a.mcp)}" data-tipo="${esc(a.tipo)}">
<div class="agente-testa"><h3>${esc(a.nome)}</h3><span class="small muted">${esc(a.azienda)}</span>${a.gratis ? '<span class="tag free">Free</span>' : '<span class="tag web">Paid plan</span>'}</div>
<p class="small">${esc(a.punti)}.</p>
${indice(a)}
<div class="agente-righe">
${riga('In Italy / EU now', a.italia, a.italiaNota)}
${riga('Own computer, works with your PC off', a.computer, a.computerNota)}
${riga('Watch the browser live', a.browserLive, a.browserNota)}
${riga('Custom MCP servers', a.mcp, a.mcpNota)}
${riga('Asks before risky actions', a.approvazioni, a.approvazioniNota)}
</div>
<dl class="agente-dati small">
<dt>Price</dt><dd>${esc(a.prezzo)}</dd>
<dt>Model</dt><dd>${esc(a.modello)}</dd>
<dt>Where you talk to it</dt><dd>${esc(a.canali)}</dd>
${a.lancio ? `<dt>Launched</dt><dd>${esc(a.lancio)}</dd>` : ''}
</dl>
<p class="small muted">Sources: ${a.fonti.map(([t, u]) => `<a href="${esc(u)}" rel="noopener" target="_blank">${esc(t)}</a>`).join(' · ')}</p>
</article>`;

  const filtri = [['', 'All'], ['italia', 'In Italy / EU now'], ['gratis', 'Free'], ['browser', 'Live browser'], ['mcp', 'Custom MCP']];
  pagina({
    file: 'always-on-agents.html', attiva: '/always-on-agents.html', dati, blog, script: 'agents.js',
    titolo: `Always-On AI Agents Compared: ChatGPT dots, Claude Duet, Grok Bot, Muse and ${aperti.length} Free Ones · ${NOME_PIENO}`,
    descr: `${quanti} always-on AI agents compared with a reliability index: ChatGPT dots, Claude Duet, Grok Bot, Meta Muse, Google’s Gemini agent and ${aperti.length} free open-source agents. Price, availability in Italy and the EU, live browser, MCP and approvals, with sources.`,
    corpo: `<div style="display:grid;gap:.4rem">
<h1>Always-on AI agents compared${nuovo('2026-11-06')}</h1>
<p class="lead">Always-on agents keep working when your PC is off, connect to your apps and ask before risky actions such as paying or sending email. Here are the big ones and ${aperti.length} free ones, with a reliability index and only what their makers state.</p>
</div>
<div class="tiles">
<div class="tile"><span class="small muted">Agents compared</span><b>${quanti}</b><span class="small muted">${lab.length} from big labs, ${aperti.length} free and open source</span></div>
<div class="tile"><span class="small muted">Usable in Italy today</span><b>${inItalia}</b><span class="small muted">all self-hosted; the big labs are US-first or unclear</span></div>
<div class="tile"><span class="small muted">Most reliable</span><b>${esc(piuAffidabile.nome)}</b><span class="small muted">${piuAffidabile.indice.totale}/100 on our index</span></div>
<div class="tile"><span class="small muted">Checked on</span><b>${fmtData(verificato)}</b><span class="small muted">official pages and GitHub</span></div>
</div>
${barraSezioni([['match', 'Best match'], ['agents', 'Compare'], ['reliability', 'Reliability index'], ['free', 'Free options'], ['how', 'How to choose']])}
${grafico}
<div class="panel" id="agents"><h2>Compare the agents</h2>
<div class="row agenti-filtri"><span class="small muted">Show:</span><span class="tabs" role="group" aria-label="Filter">${filtri.map(([k, n], i) => `<button type="button" aria-pressed="${i === 0}" data-filtro="${k}">${n}</button>`).join('')}</span></div>
<p class="small muted" id="agenti-conta" aria-live="polite">${quanti} agents shown</p>
<div class="agenti">${[...agenti].sort((x, y) => y.indice.totale - x.indice.totale).map(scheda).join('\n')}</div>
<p class="small muted">“Not stated” means the official page does not say it: it may exist. Prices and availability change often; check the source before you pay.</p>
</div>
<div class="panel" id="reliability"><h2>How the reliability index works</h2>
<p>It measures how mature and how well looked after each agent is, from facts anyone can check. It is not a test of answer quality. Out of 100:</p>
<ul>
<li><b>Stage, up to 40:</b> generally available 40, early release or rolling out 25, preview or waitlist 10, announced only 5.</li>
<li><b>Track record, up to 30:</b> public for 12 months or more 30, 6 to 12 months 20, 3 to 6 months 10, less than 3 months 5.</li>
<li><b>Upkeep, up to 30.</b> Open source: 15 for 50 or more commits in the last 30 days (8 for at least one), plus 15 for 3 or more releases in the last 90 days (8 for at least one). Big labs: 15 for an official update in the last month, plus 15 if we found no security incident.</li>
</ul>
<p class="small muted">GitHub numbers measured on ${fmtData(verificato)} on each project’s main branch. New products start low on track record by design: being new is a risk, not a flaw.</p></div>
<div class="panel" id="free"><h2>Free always-on agents</h2>
<p>${aperti.map((a) => `<a href="#${esc(a.id)}">${esc(a.nome)}</a>`).join(', ')} are open source and free. You run them on your own computer or on a server, and most answer you on WhatsApp, Telegram, Slack or Discord. They are always on only while that machine is on, so for 24/7 use put them on a small server. The software is free; the model is the main cost, and it can be free too: pick one from our <a href="/free-llm.html">best free LLMs</a> or run one <a href="/home.html">at home</a>. NanoClaw and TrustClaw use Claude, so their model is paid.</p>
<p>Meta’s Muse also has a free tier, but only in the US and Singapore for now.</p></div>
<div class="panel" id="how"><h2>How to choose</h2>
<div class="faq-griglia">
<div class="faq-voce"><h3>You are in Italy or the EU</h3><p>Today the safe choices are the free, self-hosted ones. Claude Duet and Muse are not available here yet; ChatGPT dots and Google’s Gemini agent do not say clearly which countries they cover.</p></div>
<div class="faq-voce"><h3>You want the most mature free one</h3><p>OpenClaw and Hermes Agent have the longest track record and the most active upkeep. ZeroClaw asks for approval before medium-risk actions by default.</p></div>
<div class="faq-voce"><h3>You want a team of bots</h3><p>Grok Bot runs several bots that talk to each other in group chats, and you can watch and take over its browser. Free: NanoClaw and AnyModelBot also run several bots.</p></div>
<div class="faq-voce"><h3>You live in ChatGPT, Slack or Teams</h3><p>ChatGPT dots answer in ChatGPT, Slack and Teams and keep the context across them. The first dot is included in Pro and Business Premium.</p></div>
</div></div>`,
  });
}
