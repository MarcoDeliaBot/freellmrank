// Riquadro "Try it now" nelle pagine dei modelli: manda la domanda a /api/try e mostra la risposta.
const box = document.getElementById('try');
if (box) {
  const form = box.querySelector('form');
  const campo = box.querySelector('textarea');
  const tasto = box.querySelector('button');
  const stato = box.querySelector('.prova-stato');
  const uscita = box.querySelector('.prova-risposta');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const domanda = campo.value.trim();
    if (!domanda) return;
    tasto.disabled = true;
    stato.textContent = 'Thinking…';
    uscita.hidden = true;
    try {
      const r = await fetch('/api/try', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modello: box.dataset.modello, domanda }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        stato.textContent = d.errore || 'Something went wrong. Try again in a minute.';
        if (d.rimaste === 0) tasto.disabled = true;
        else tasto.disabled = false;
        return;
      }
      uscita.textContent = d.risposta + (d.tagliata ? '\n\n(Answer cut short: free answers are limited in length.)' : '');
      uscita.hidden = false;
      stato.textContent = d.rimaste > 0 ? `${d.rimaste} free question${d.rimaste === 1 ? '' : 's'} left today.` : 'That was your last free question today.';
      tasto.disabled = d.rimaste <= 0;
      if (window.gtag) window.gtag('event', 'prova_modello', { modello: box.dataset.modello });
    } catch {
      stato.textContent = 'No connection. Try again.';
      tasto.disabled = false;
    }
  });
}
