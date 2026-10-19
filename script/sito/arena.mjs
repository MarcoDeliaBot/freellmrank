// Pagina /arena (Free Arena): due modelli gratis anonimi rispondono, il visitatore vota, poi vede i nomi.
// La logica sta in sorgente/arena.js e in functions/api/arena/; qui la pagina e i nomi dei modelli.
import { esc, pagina, NOME_PIENO, URL_SITO } from './comune.mjs';
import { CF_MODELLI, ARENA_MODELLI, DUELLI_PER_VISITATORE, perNomeArena } from '../cf-modelli.mjs';

// chiave pubblica di Cloudflare Turnstile (widget "Free Arena" creato da Marco il 19/10/2026);
// la chiave segreta sta solo nei segreti del progetto Pages (TURNSTILE_SECRET)
export const TURNSTILE_SITEKEY = '0x4AAAAAAFcGDDrezmabhzth';

export function paginaArena(dati, modelli, blog) {
  // per ogni modello dell'arena: nome da mostrare e pagina del modello sul sito
  const nomi = {};
  for (const id of ARENA_MODELLI) {
    const cf = CF_MODELLI.find((m) => m.id === id);
    const m = modelli.find((x) => [x.nome, ...Object.values(x.nomi || {})].some((n) => perNomeArena(n) === cf));
    nomi[id] = { nome: m ? m.nome : cf.arena[0], href: m ? m.href : null };
  }
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
${TURNSTILE_SITEKEY ? `<div class="cf-turnstile" data-sitekey="${esc(TURNSTILE_SITEKEY)}" data-size="flexible"></div>` : ''}
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
<div class="panel"><h2>How it works</h2>
<ul class="dove">
<li><b>Blind</b>: you see the names only after you vote, so the brand cannot change your mind.</li>
<li><b>Only free models</b>: ${elenco.map((m) => (m.href ? `<a href="${m.href}">${esc(m.nome)}</a>` : esc(m.nome))).join(', ')}. They run on Cloudflare Workers AI.</li>
<li><b>Your privacy</b>: we save only your vote (which model was A, which was B, who won), never your question or the answers. <a href="/privacy.html#arena">Details</a></li>
<li><b>The ranking</b>: when there are enough votes, they become a Free Arena ranking, computed like <a href="https://github.com/lmarena/arena-rank" rel="noopener">Arena’s own method</a>. Until then, the main <a href="/">leaderboard</a> uses Arena’s public votes.</li>
</ul>
</div>
<script type="application/json" id="arena-nomi">${JSON.stringify(nomi).replace(/</g, '\\u003c')}</script>
${TURNSTILE_SITEKEY ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' : ''}`,
  });
}
