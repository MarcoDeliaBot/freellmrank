// Pagina /report: «Report a mistake». Il visitatore scrive cosa è sbagliato e su quale pagina;
// si salva nel database D1 (solo pagina e testo) e n8n manda a Marco un riassunto ogni mattina.
import { pagina, NOME_PIENO, esc } from './comune.mjs';
import { TURNSTILE_SITEKEY } from './arena.mjs';

export const SEGNALAZIONE_MAX = 1000; // caratteri

export function paginaSegnala(dati, blog) {
  pagina({
    file: 'report.html', attiva: '', dati, blog, script: 'report.js',
    titolo: `Report a mistake · ${NOME_PIENO}`,
    descr: 'Found a wrong number, an outdated price or a broken link on FreeLLMArena? Tell us in two lines. No account and no email needed.',
    corpo: `<div style="display:grid;gap:.4rem">
<h1>Report a mistake</h1>
<p class="lead">Found a wrong number, an outdated free plan or a broken link? Tell us in two lines. We read every report and fix the data, usually within a few days.</p>
</div>
<div class="panel segnala" id="report">
<form class="prova-form" id="report-form">
<label for="report-page" class="small">Which page?</label>
<input id="report-page" name="pagina" type="text" maxlength="200" required placeholder="/model/qwen3-30b-a3b" autocomplete="off">
<label for="report-text" class="small">What is wrong, and what is right?</label>
<textarea id="report-text" name="testo" rows="5" minlength="5" maxlength="${SEGNALAZIONE_MAX}" required placeholder="Example: the RTX 5060 Ti has 16 GB, not 8 GB. Source: nvidia.com"></textarea>
${TURNSTILE_SITEKEY ? `<div class="cf-turnstile" data-sitekey="${esc(TURNSTILE_SITEKEY)}" data-size="flexible" data-language="en"></div>` : ''}
<div class="row"><button type="submit" class="btn primary">Send report</button><span class="small muted prova-stato" aria-live="polite"></span></div>
</form>
<p class="small muted">We store only the page and your text: no name, no email, no IP address. Do not write personal data. Want a reply? Write to <span class="copiabile">info@freellmarena.com</span>. See <a href="/privacy.html">privacy</a>.</p>
</div>
${TURNSTILE_SITEKEY ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' : ''}`,
  });
}
