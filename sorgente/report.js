// Pagina /report: compila la pagina di provenienza (?from=/...) e manda la segnalazione a /api/report.
import { t, tServer } from './testi.mjs';
const form = document.getElementById('report-form');
if (form) {
  const pagina = document.getElementById('report-page');
  const testo = document.getElementById('report-text');
  const tasto = form.querySelector('button[type=submit]');
  const stato = form.querySelector('.prova-stato');
  const da = new URLSearchParams(location.search).get('from');
  if (da && da.startsWith('/')) pagina.value = da.slice(0, 200);
  else if (document.referrer.startsWith(location.origin)) pagina.value = new URL(document.referrer).pathname;
  (pagina.value ? testo : pagina).focus({ preventScroll: true });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    tasto.disabled = true;
    stato.textContent = t('invio');
    const turnstile = form.querySelector('[name="cf-turnstile-response"]')?.value || '';
    try {
      const r = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pagina: pagina.value.trim(), testo: testo.value.trim(), turnstile }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        stato.textContent = tServer(d.errore) || t('erroreGenerico');
        tasto.disabled = false;
        if (window.turnstile) window.turnstile.reset();
        return;
      }
      testo.value = '';
      stato.textContent = t('grazieSegnalazione');
      if (window.gtag) window.gtag('event', 'segnalazione');
      setTimeout(() => { tasto.disabled = false; if (window.turnstile) window.turnstile.reset(); }, 3000);
    } catch {
      stato.textContent = t('nessunaConnessione');
      tasto.disabled = false;
    }
  });
}
