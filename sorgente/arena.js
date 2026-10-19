// Free Arena nel browser: chiede il duello, mostra le due risposte, manda il voto, rivela i nomi.
const $ = (id) => document.getElementById(id);
const NOMI = JSON.parse($('arena-nomi').textContent);
const form = $('arena-form'), stato = $('arena-stato'), invia = $('arena-invia');
const duello = $('arena-duello'), voti = $('arena-voti'), esitoTesto = $('arena-esito'), ancora = $('arena-ancora');
let biglietto = null;

const lingua = (navigator.language || 'en').slice(0, 2).toLowerCase();
const nomeDi = (id) => NOMI[id] || { nome: id.split('/').pop(), href: null };
function mostraNome(el, id, vinto) {
  const n = nomeDi(id);
  el.innerHTML = '';
  const a = document.createElement(n.href ? 'a' : 'span');
  if (n.href) a.href = n.href;
  a.textContent = n.nome;
  el.append(vinto ? 'Winner: ' : 'This was ', a);
  el.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const domanda = $('arena-domanda').value.trim();
  if (!domanda) return;
  invia.disabled = true;
  stato.textContent = 'Two models are writing…';
  duello.hidden = true;
  const turnstile = form.querySelector('[name="cf-turnstile-response"]')?.value || '';
  try {
    const r = await fetch('/api/arena/duel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domanda, categoria: $('arena-categoria').value, lingua, turnstile }) });
    const d = await r.json().catch(() => ({}));
    if (window.turnstile) window.turnstile.reset();
    if (!r.ok) { stato.textContent = d.errore || 'Something went wrong. Try again in a minute.'; invia.disabled = d.rimasti === 0; return; }
    biglietto = d.biglietto;
    $('arena-a').textContent = d.a + (d.tagliataA ? '\n\n(cut short: free answers are limited in length)' : '');
    $('arena-b').textContent = d.b + (d.tagliataB ? '\n\n(cut short: free answers are limited in length)' : '');
    ['arena-nome-a', 'arena-nome-b'].forEach((id) => { $(id).hidden = true; });
    voti.querySelectorAll('button').forEach((b) => { b.disabled = false; b.classList.remove('scelto'); });
    voti.hidden = false; esitoTesto.textContent = ''; ancora.hidden = true;
    duello.hidden = false;
    stato.textContent = d.rimasti > 0 ? `${d.rimasti} free duel${d.rimasti === 1 ? '' : 's'} left today.` : 'That was your last free duel today.';
    duello.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.gtag) window.gtag('event', 'arena_duello');
  } catch {
    stato.textContent = 'No connection. Try again.';
    invia.disabled = false;
  }
});

voti.addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-esito]');
  if (!b || !biglietto) return;
  voti.querySelectorAll('button').forEach((x) => { x.disabled = true; });
  b.classList.add('scelto');
  try {
    const r = await fetch('/api/arena/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ biglietto, esito: b.dataset.esito }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { esitoTesto.textContent = d.errore || 'Your vote was not saved. Try a new duel.'; ancora.hidden = false; return; }
    biglietto = null;
    mostraNome($('arena-nome-a'), d.a, b.dataset.esito === 'a');
    mostraNome($('arena-nome-b'), d.b, b.dataset.esito === 'b');
    esitoTesto.textContent = d.contato ? 'Thanks, your vote is saved.' : d.nota;
    ancora.hidden = false;
    if (window.gtag) window.gtag('event', 'arena_voto', { esito: b.dataset.esito });
  } catch {
    esitoTesto.textContent = 'No connection: your vote was not saved.';
    voti.querySelectorAll('button').forEach((x) => { x.disabled = false; });
  }
});

ancora.addEventListener('click', () => {
  duello.hidden = true;
  invia.disabled = false;
  $('arena-domanda').value = '';
  $('arena-domanda').focus();
});
