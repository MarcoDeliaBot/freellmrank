// Pagina /always-on-agents: comparatore degli agenti AI sempre attivi (6/11/2026, Marco: «Comparatore Agenti AI
// Always-On, dobbiamo metterli sul nostro sito», anche i sistemi gratuiti). Dati e fonti in dati/agenti-always-on.json:
// solo fatti letti sulle pagine ufficiali; quello che la fonte non dice resta «not stated». Filtri in sorgente/agents.js.
import fs from 'node:fs';
import path from 'node:path';
import { esc, pagina, NOME_PIENO, RADICE, barraSezioni, nuovo } from './comune.mjs';

const VALORI = { yes: ['Yes', 'free'], no: ['No', 'bad'], partial: ['Partly', 'quota'], unclear: ['Not stated', 'novoti'] };
const valore = (v) => { const [t, c] = VALORI[v] || VALORI.unclear; return `<span class="tag ${c}">${t}</span>`; };
const fmtData = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function paginaAgenti(dati, blog) {
  const file = path.join(RADICE, 'dati', 'agenti-always-on.json');
  if (!fs.existsSync(file)) return;
  const { agenti, verificato } = JSON.parse(fs.readFileSync(file, 'utf8'));
  const quanti = agenti.length, gratis = agenti.filter((a) => a.gratis).length;
  const inItalia = agenti.filter((a) => a.italia === 'yes').map((a) => a.nome);

  const riga = (nome, v, nota) => `<div class="agente-riga"><span class="small muted">${nome}</span>${valore(v)}${nota ? `<span class="small">${esc(nota)}</span>` : ''}</div>`;
  const scheda = (a) => `<article class="agente" id="${esc(a.id)}" data-gratis="${a.gratis}" data-italia="${esc(a.italia)}" data-browser="${esc(a.browserLive)}" data-mcp="${esc(a.mcp)}">
<div class="agente-testa"><h3>${esc(a.nome)}</h3><span class="small muted">${esc(a.azienda)}</span>${a.gratis ? '<span class="tag free">Free</span>' : '<span class="tag web">Paid plan</span>'}</div>
<p class="small">${esc(a.punti)}.</p>
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
    titolo: `Always-On AI Agents Compared: ChatGPT dots, Claude Duet, Grok Bot, Muse and Free Ones · ${NOME_PIENO}`,
    descr: `${quanti} always-on AI agents compared: ChatGPT dots, Claude Duet, Grok Bot, Meta Muse, Google’s Gemini agent and ${gratis} free options. Price, availability in Italy and the EU, live browser, MCP and approvals, with sources.`,
    corpo: `<div style="display:grid;gap:.4rem">
<h1>Always-on AI agents compared${nuovo('2026-11-06')}</h1>
<p class="lead">Always-on agents have their own computer and browser in the cloud, keep working when your PC is off, connect to your apps and ask before risky actions such as paying or sending email. Here are the big ones and the free ones, with only what their makers state.</p>
</div>
<div class="tiles">
<div class="tile"><span class="small muted">Agents compared</span><b>${quanti}</b><span class="small muted">${agenti.filter((a) => !a.azienda.includes('open source')).length} from big labs, ${agenti.filter((a) => a.azienda.includes('open source')).length} open source</span></div>
<div class="tile"><span class="small muted">Usable in Italy today</span><b>${inItalia.length ? esc(inItalia.join(', ')) : 'None confirmed'}</b><span class="small muted">the paid ones are US-first or unclear</span></div>
<div class="tile"><span class="small muted">Checked on</span><b>${fmtData(verificato)}</b><span class="small muted">official pages and repositories</span></div>
</div>
${barraSezioni([['agents', 'Compare'], ['free', 'Free options'], ['how', 'How to choose']])}
<div class="panel" id="agents"><h2>Compare the agents</h2>
<div class="row agenti-filtri"><span class="small muted">Show:</span><span class="tabs" role="group" aria-label="Filter">${filtri.map(([k, n], i) => `<button type="button" aria-pressed="${i === 0}" data-filtro="${k}">${n}</button>`).join('')}</span></div>
<p class="small muted" id="agenti-conta" aria-live="polite">${quanti} agents shown</p>
<div class="agenti">${agenti.map(scheda).join('\n')}</div>
<p class="small muted">“Not stated” means the official page does not say it: it may exist. Prices and availability change often; check the source before you pay.</p>
</div>
<div class="panel" id="free"><h2>Free always-on agents</h2>
<p>OpenClaw and Hermes Agent are open source (MIT) and free. You run them on your own computer or on a server, and they answer you on WhatsApp, Telegram, Slack or Discord. They are always on only while that machine is on, so for 24/7 use put them on a small server. The software is free; the model is the only cost, and it can be free too: pick one from our <a href="/free-llm.html">best free LLMs</a> or run one <a href="/home.html">at home</a>.</p>
<p>Meta’s Muse also has a free tier, but only in the US and Singapore for now.</p></div>
<div class="panel" id="how"><h2>How to choose</h2>
<div class="faq-griglia">
<div class="faq-voce"><h3>You are in Italy or the EU</h3><p>Today the safe choices are the free, self-hosted ones. Claude Duet and Muse are not available here yet; ChatGPT dots and Google’s Gemini agent do not say clearly which countries they cover.</p></div>
<div class="faq-voce"><h3>You want a team of bots</h3><p>Grok Bot runs several bots in parallel that talk to each other in group chats and share one cloud computer, and you can watch and take over its browser.</p></div>
<div class="faq-voce"><h3>You live in ChatGPT, Slack or Teams</h3><p>ChatGPT dots answer in ChatGPT, Slack and Teams and keep the context across them. The first dot is included in Pro and Business Premium.</p></div>
<div class="faq-voce"><h3>You want full control</h3><p>OpenClaw and Hermes Agent keep your data on your own machine and work with any model, including free and local ones.</p></div>
</div></div>`,
  });
}
