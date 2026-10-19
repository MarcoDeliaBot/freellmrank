// Pagina /arena (Free Arena): due modelli gratis anonimi rispondono, il visitatore vota, poi vede i nomi.
// La logica sta in sorgente/arena.js e in functions/api/arena/; qui la pagina e i nomi dei modelli.
import { esc, pagina, NOME_PIENO, URL_SITO } from './comune.mjs';
import { CF_MODELLI, ARENA_MODELLI, DUELLI_PER_VISITATORE, perNomeArena } from '../cf-modelli.mjs';
import { SOGLIA } from '../../functions/api/arena/ranking.js';

// chiave pubblica di Cloudflare Turnstile (widget "Free Arena" creato da Marco il 19/10/2026);
// la chiave segreta sta solo nei segreti del progetto Pages (TURNSTILE_SECRET)
export const TURNSTILE_SITEKEY = '0x4AAAAAAFcGDDrezmabhzth';

export function paginaArena(dati, modelli, blog) {
  const nomiModelli = nomiArena(modelli);
  paginaClassificaArena(dati, blog, nomiModelli);
  const nomi = nomiModelli;
  const elenco = ARENA_MODELLI.map((id) => nomi[id]);

  pagina({
    file: 'arena.html', attiva: '/arena.html', dati, blog, script: 'arena.js',
    titolo: `Free Arena: Vote Between Two Free AI Models · ${NOME_PIENO}`,
    descr: `Ask a question, get two answers from free AI models without names, vote for the better one. ${DUELLI_PER_VISITATORE} free duels a day, no account.`,
    jsonld: { '@type': 'WebApplication', name: 'Free Arena', url: `${URL_SITO}/arena`, applicationCategory: 'AI model comparison', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    corpo: `<div style="display:grid;gap:.4rem">
<h1>Free Arena</h1>
<p class="lead">Ask anything. Two free AI models answer without their names. Vote for the better answer, then see who they were. ${DUELLI_PER_VISITATORE} free duels a day, no account.</p>
</div>
<div class="panel arena" id="arena">
<form id="arena-form" class="arena-form">
<label for="arena-domanda" class="small">Your question</label>
<textarea id="arena-domanda" rows="3" maxlength="1500" required placeholder="Example: Explain recursion to a 10-year-old in three sentences."></textarea>
<div class="row">
<label class="small">Type <select id="arena-categoria"><option value="chat">General</option><option value="code">Coding</option><option value="writing">Writing</option><option value="other">Other</option></select></label>
<button type="submit" class="btn primary" id="arena-invia">Ask both models</button>
<span class="small muted" id="arena-stato" aria-live="polite"></span>
</div>
${TURNSTILE_SITEKEY ? `<div class="cf-turnstile" data-sitekey="${esc(TURNSTILE_SITEKEY)}" data-size="flexible" data-language="en"></div>` : ''}
</form>
<div id="arena-duello" hidden>
<div class="arena-risposte">
<section class="arena-risp" aria-label="Answer A"><h2 class="arena-lettera a">A</h2><div class="arena-testo" id="arena-a"></div><p class="arena-nome small" id="arena-nome-a" hidden></p></section>
<section class="arena-risp" aria-label="Answer B"><h2 class="arena-lettera b">B</h2><div class="arena-testo" id="arena-b"></div><p class="arena-nome small" id="arena-nome-b" hidden></p></section>
</div>
<div class="arena-voti" id="arena-voti">
<button type="button" class="btn" data-esito="a">A is better</button>
<button type="button" class="btn" data-esito="b">B is better</button>
<button type="button" class="btn" data-esito="pari">Tie</button>
<button type="button" class="btn" data-esito="male">Both bad</button>
</div>
<p class="small" id="arena-esito" aria-live="polite"></p>
<button type="button" class="btn primary" id="arena-ancora" hidden>New duel</button>
</div>
</div>
<div class="panel" id="arena-mia"><h2>Your ranking</h2>
<p class="small muted" id="arena-mia-vuota">Only from your own votes, saved in this browser. Vote in a few duels and your personal ranking appears here.</p>
<div class="tw" id="arena-mia-tabella" hidden></div>
<p class="small"><button type="button" class="link-btn" id="arena-mia-cancella" hidden>Delete my votes from this browser</button></p></div>
<div class="panel"><h2>How it works</h2>
<ul class="dove">
<li><b>Blind</b>: you see the names only after you vote, so the brand cannot change your mind.</li>
<li><b>Only free models</b>: ${elenco.map((m) => (m.href ? `<a href="${m.href}">${esc(m.nome)}</a>` : esc(m.nome))).join(', ')}. They run on Cloudflare Workers AI.</li>
<li><b>Your privacy</b>: we save only your vote (which model was A, which was B, who won), never your question or the answers. <a href="/privacy.html#arena">Details</a></li>
<li><b>The ranking</b>: all votes become the <a href="/arena/leaderboard.html">Free Arena leaderboard</a>, computed like <a href="https://github.com/lmarena/arena-rank" rel="noopener">Arena’s own method</a> (Bradley-Terry). A model enters it after ${SOGLIA} votes; until then the main <a href="/">leaderboard</a> uses Arena’s public votes.</li>
</ul>
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
