// Pagina /arena (Free Arena): due modelli gratis anonimi rispondono, il visitatore vota, poi vede i nomi.
// La logica sta in sorgente/arena.js e in functions/api/arena/; qui la pagina e i nomi dei modelli.
// Grafica dal disegno Stitch di Marco (20/10/2026), ma solo con dati veri: niente nodi, token o duelli inventati.
import { esc, pagina, NOME_PIENO, URL_SITO } from './comune.mjs';
import { CF_MODELLI, ARENA_MODELLI, DUELLI_PER_VISITATORE, LUNGHEZZA_DOMANDA, perNomeArena } from '../cf-modelli.mjs';
import { SOGLIA } from '../../functions/api/arena/ranking.js';

// chiave pubblica di Cloudflare Turnstile (widget "Free Arena" creato da Marco il 19/10/2026);
// la chiave segreta sta solo nei segreti del progetto Pages (TURNSTILE_SECRET)
export const TURNSTILE_SITEKEY = '0x4AAAAAAFcGDDrezmabhzth';

// icone a linea della pagina (come quelle del menu, disegnate qui)
const ICONE = {
  terminale: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="m8 10 2.5 2L8 14M13 14h3"/>',
  idea: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  frecce: '<path d="m6 7 5 5-5 5M13 7l5 5-5 5"/>',
  voto: '<path d="M4 15h16v5H4zM8 15l-1-3h10l-1 3"/><path d="m9.5 8 2 2 4-4.5"/>',
  ok: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  cieco: '<path d="M3 3l18 18M10.6 6.1A9.5 9.5 0 0 1 12 6c5 0 8.5 4.5 9 6-.3.9-1.2 2.3-2.6 3.6M6.6 6.6C4.6 7.9 3.3 10 3 12c.5 1.5 4 6 9 6 1.5 0 2.9-.4 4.1-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  modelli: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  lucchetto: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2"/>',
  classifica: '<path d="M5 20v-7M12 20V5M19 20v-10"/>',
  grafico: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 16v-3M12 16V8M16 16v-5"/>',
};
const ic = (k, cl = '') => `<svg class="icona${cl ? ' ' + cl : ''}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONE[k]}</svg>`;

// idee di domanda sotto il riquadro: il clic le scrive nel riquadro, non le manda
const IDEE = [
  ['Explain quantum computing', 'Explain quantum computing simply, using a flipped coin as the example.'],
  ['Python async scraper', 'Write a short Python script that uses asyncio to fetch three URLs at the same time.'],
  ['Critique an app idea', 'Critique this product idea: an offline AI app for the desktop that never sends data to the cloud.'],
];

export function paginaArena(dati, modelli, blog) {
  const nomiModelli = nomiArena(modelli);
  paginaClassificaArena(dati, blog, nomiModelli);
  const nomi = nomiModelli;
  const elenco = ARENA_MODELLI.map((id) => nomi[id]);
  const risposta = (l) => `<section class="arena-risp" id="arena-pannello-${l}" aria-label="Answer ${l.toUpperCase()}">
<div class="ar-risp-testa"><span class="arena-lettera ${l}" aria-hidden="true">${l.toUpperCase()}</span><div class="ar-chi"><b>Model ${l.toUpperCase()}</b><span class="arena-nome" id="arena-nome-${l}">Hidden identity</span></div><span class="ar-conta" id="arena-conta-${l}"></span></div>
<div class="arena-testo" id="arena-${l}"></div>
<div class="ar-risp-piede"><span id="arena-fine-${l}"></span></div>
</section>`;

  pagina({
    file: 'arena.html', attiva: '/arena.html', dati, blog, script: 'arena.js',
    titolo: `Free Arena: Vote Between Two Free AI Models · ${NOME_PIENO}`,
    descr: `Ask a question, get two answers from free AI models without names, vote for the better one. ${DUELLI_PER_VISITATORE} free duels a day, no account.`,
    jsonld: { '@type': 'WebApplication', name: 'Free Arena', url: `${URL_SITO}/arena`, applicationCategory: 'AI model comparison', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    corpo: `<section class="ar-testa">
<div class="ar-intro">
<div class="ar-segni"><span class="ar-segno verde">Blind duels</span><span class="ar-segno"><span class="punto-vivo" aria-hidden="true"></span>Questions never stored</span></div>
<h1>Free Arena</h1>
<p class="lead">Ask anything. Two free AI models answer without their names. Vote for the better answer, then see who they were. ${DUELLI_PER_VISITATORE} free duels a day, no account.</p>
</div>
<div class="ar-hud">
<div><span>Daily quota</span><b id="arena-quota">${DUELLI_PER_VISITATORE} / ${DUELLI_PER_VISITATORE} left</b></div>
<i aria-hidden="true"></i>
<div><span>In the arena</span><b>${ARENA_MODELLI.length} free models</b></div>
</div>
</section>
<section class="panel ar-domanda" id="arena">
<form id="arena-form" class="arena-form">
<div class="ar-riga-testa"><label for="arena-domanda" class="ar-etichetta">${ic('terminale', 'verde')}Your question</label><span class="ar-nota">Up to ${LUNGHEZZA_DOMANDA} characters</span></div>
<textarea id="arena-domanda" rows="3" maxlength="${LUNGHEZZA_DOMANDA}" required placeholder="Example: Explain recursion to a 10-year-old in three sentences."></textarea>
<div class="ar-idee"><span>${ic('idea', 'ambra')}Ideas:</span>${IDEE.map(([t, d]) => `<button type="button" data-domanda="${esc(d)}">${esc(t)}</button>`).join('')}</div>
<div class="ar-comandi">
<label class="ar-tipo">Type: <select id="arena-categoria"><option value="chat">General</option><option value="code">Coding</option><option value="writing">Writing</option><option value="other">Other</option></select></label>
${TURNSTILE_SITEKEY ? `<div class="cf-turnstile" data-sitekey="${esc(TURNSTILE_SITEKEY)}" data-size="flexible" data-language="en"></div>` : ''}
<button type="submit" class="btn primary ar-invia" id="arena-invia">Ask both models ${ic('frecce')}</button>
</div>
<p class="small muted" id="arena-stato" aria-live="polite"></p>
</form>
</section>
<section class="ar-duello" id="arena-duello" hidden>
<div class="ar-riga-testa"><h2><span class="punto-vivo" aria-hidden="true"></span>Blind duel</h2><span class="ar-nota">Names hidden until you vote</span></div>
<div class="arena-risposte">
${risposta('a')}
${risposta('b')}
</div>
<div class="ar-voti-barra" id="arena-voti">
<span class="ar-voti-testo">${ic('voto', 'verde')}Cast your blind vote to reveal both models:</span>
<div class="ar-voti">
<button type="button" class="btn" data-esito="a">👈 A is better</button>
<button type="button" class="btn" data-esito="b">👉 B is better</button>
<button type="button" class="btn" data-esito="pari">⚖️ Tie</button>
<button type="button" class="btn male" data-esito="male">✕ Both bad</button>
</div>
</div>
<div class="ar-verdetto" id="arena-verdetto" hidden>
${ic('ok')}
<p class="small" id="arena-esito" aria-live="polite"></p>
<button type="button" class="btn primary" id="arena-ancora">Next duel →</button>
</div>
</section>
<div class="ar-bento">
<section class="panel ar-mia" id="arena-mia">
<div class="ar-riga-testa"><h2>Your ranking</h2><span class="ar-segnetto">This browser only</span></div>
<p class="small muted">Only from your own votes, saved in this browser. Vote in a few duels and your personal ranking appears here.</p>
<div class="ar-vuoto" id="arena-mia-vuota">
<span class="ar-tondo">${ic('grafico')}</span>
<b id="arena-mia-conto">0 votes in this browser</b>
<p class="small muted">Vote in 2 duels to see your own ranking, scored like the main board (Bradley-Terry).</p>
<div class="ar-barra" aria-hidden="true"><i id="arena-mia-barra"></i></div>
<span class="ar-nota">Next milestone: 2 votes</span>
</div>
<div class="tw" id="arena-mia-tabella" hidden></div>
<div class="ar-mia-piede"><span>${ic('lucchetto')}Nothing leaves this browser</span><span><button type="button" class="link-btn" id="arena-mia-esporta" hidden>Export my votes (JSON)</button> <button type="button" class="link-btn" id="arena-mia-cancella" hidden>Delete my votes</button></span></div>
</section>
<section class="panel ar-come">
<div class="ar-riga-testa"><h2>How it works</h2><a class="ar-segnetto verde" href="/arena/leaderboard.html">Leaderboard</a></div>
<div class="ar-punto">${ic('cieco', 'verde')}<div><h3>Blind</h3><p>You see the names only after you vote, so the brand cannot change your mind.</p></div></div>
<div class="ar-punto">${ic('modelli', 'verde')}<div><h3>Only free models</h3><p>They run on Cloudflare Workers AI:</p>
<div class="ar-modelli">${elenco.map((m) => (m.href ? `<a href="${m.href}">${esc(m.nome)}</a>` : `<span>${esc(m.nome)}</span>`)).join('')}</div></div></div>
<div class="ar-punto">${ic('lucchetto', 'verde')}<div><h3>Your privacy</h3><p>We save only your vote (which model was A, which was B, who won), never your question or the answers. <a href="/privacy.html#arena">Details →</a></p></div></div>
<div class="ar-punto">${ic('classifica', 'ambra')}<div><h3>The ranking</h3><p>All votes become the <a href="/arena/leaderboard.html">Free Arena leaderboard</a>, computed like <a href="https://github.com/lmarena/arena-rank" rel="noopener">Arena’s own method</a> (Bradley-Terry). A model enters it after ${SOGLIA} votes; until then the main <a href="/">leaderboard</a> uses Arena’s public votes.</p></div></div>
</section>
</div>
<script type="application/json" id="arena-nomi">${JSON.stringify(nomi).replace(/</g, '\\u003c')}</script>
${TURNSTILE_SITEKEY ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' : ''}`,
  });
}

// per ogni modello dell'arena: nome da mostrare e pagina del modello sul sito
function nomiArena(modelli) {
  const nomi = {};
  for (const id of ARENA_MODELLI) {
    const cf = CF_MODELLI.find((m) => m.id === id);
    const m = modelli.find((x) => [x.nome, ...Object.values(x.nomi || {})].some((n) => perNomeArena(n) === cf));
    nomi[id] = { nome: m ? m.nome : cf.arena[0], href: m ? m.href : null };
  }
  return nomi;
}

// /arena/leaderboard: la classifica dei voti di tutti (chiesta a /api/arena/ranking) e la tua
function paginaClassificaArena(dati, blog, nomi) {
  pagina({
    file: 'arena/leaderboard.html', attiva: '/arena.html', dati, blog, script: 'arena-leaderboard.js',
    titolo: `Free Arena Leaderboard: Free AI Models Ranked by Blind Votes · ${NOME_PIENO}`,
    descr: 'The ranking of free AI models from blind Free Arena votes: two anonymous answers, one vote. Bradley-Terry scores with 95% intervals.',
    corpo: `<div style="display:grid;gap:.4rem">
<p class="briciole small"><a href="/arena.html">Free Arena</a> › Leaderboard</p>
<h1>Free Arena leaderboard</h1>
<p class="lead">Free AI models ranked by blind votes on this site: people ask a question, get two answers without names and pick the better one. <a href="/arena.html">Vote in a duel</a>.</p>
</div>
<div class="tiles" id="al-tessere"><div class="tile"><span class="small muted">Votes so far</span><b id="al-voti">…</b><span class="small muted">blind duels on Free Arena</span></div>
<div class="tile"><span class="small muted">Votes needed to be ranked</span><b>${SOGLIA}</b><span class="small muted">per model, so the score means something</span></div></div>
<div class="panel"><h2>Ranked models</h2><div id="al-classifica"><p class="small muted">Loading…</p></div></div>
<div class="panel"><h2>Collecting votes</h2><p class="small muted">These models are in the duels but have fewer than ${SOGLIA} votes. Their scores move a lot with every vote.</p><div id="al-raccolta"></div></div>
<div class="panel" id="arena-mia"><h2>Your ranking</h2>
<p class="small muted" id="arena-mia-vuota">Only from your own votes, saved in this browser. <a href="/arena.html">Vote in a few duels</a> and your personal ranking appears here.</p>
<div class="tw" id="arena-mia-tabella" hidden></div>
<p class="small"><button type="button" class="link-btn" id="arena-mia-cancella" hidden>Delete my votes from this browser</button></p></div>
<div class="panel"><h2>How the score works</h2>
<p class="small">Each vote is a match: the winner gets a point, a tie or “both bad” gives half a point to each. The <a href="https://github.com/lmarena/arena-rank" rel="noopener">Bradley-Terry model</a>, the same one Arena uses, turns all matches into one score per model; 1000 is the average. The ± is the 95% interval: two models whose intervals overlap may be in either order. We store only the votes, never the questions (<a href="/privacy.html#arena">privacy</a>).</p></div>
<script type="application/json" id="arena-nomi">${JSON.stringify(nomi).replace(/</g, '\\u003c')}</script>`,
  });
}
