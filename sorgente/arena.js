// Free Arena nel browser: chiede il duello, mostra le due risposte, manda il voto, rivela i nomi.
import { salvaMio, mostraMia } from './arena-mia.mjs';
const $ = (id) => document.getElementById(id);
const NOMI = JSON.parse($('arena-nomi').textContent);
const form = $('arena-form'), stato = $('arena-stato'), invia = $('arena-invia');
const duello = $('arena-duello'), voti = $('arena-voti'), esitoTesto = $('arena-esito'), ancora = $('arena-ancora');
const verdetto = $('arena-verdetto');
let biglietto = null;

const lingua = (navigator.language || 'en').slice(0, 2).toLowerCase();
const nomeDi = (id) => NOMI[id] || { nome: id.split('/').pop(), href: null };
function mostraNome(l, id, vinto) {
  const el = $(`arena-nome-${l}`), n = nomeDi(id);
  el.innerHTML = '';
  const a = document.createElement(n.href ? 'a' : 'span');
  if (n.href) a.href = n.href;
  a.textContent = n.nome;
  el.append(a);
  el.classList.add('svelato');
  $(`arena-pannello-${l}`).classList.toggle('vinto', vinto);
}
function nascondiNomi() {
  for (const l of ['a', 'b']) {
    const el = $(`arena-nome-${l}`);
    el.textContent = 'Hidden identity';
    el.classList.remove('svelato');
    $(`arena-pannello-${l}`).classList.remove('vinto');
  }
}

// duelli rimasti oggi: il server li dice solo dopo un duello, qui li ricordiamo fino a mezzanotte UTC
const TOTALE = Number(($('arena-quota').textContent.match(/\/\s*(\d+)/) || [])[1]) || 10;
const oggi = () => new Date().toISOString().slice(0, 10);
function quota(rimasti) {
  try {
    if (rimasti != null) localStorage.setItem('arena-quota', JSON.stringify({ giorno: oggi(), rimasti }));
    const q = JSON.parse(localStorage.getItem('arena-quota') || 'null');
    if (q && q.giorno === oggi()) $('arena-quota').textContent = `${q.rimasti} / ${TOTALE} left`;
  } catch { /* browser senza memoria: resta il numero pieno */ }
}
quota();

// idee di domanda: scrivono nel riquadro, non mandano
form.querySelectorAll('button[data-domanda]').forEach((b) => b.addEventListener('click', () => {
  const t = $('arena-domanda');
  t.value = b.dataset.domanda;
  t.focus();
}));

function mostraRisposta(l, testo, tagliata) {
  $(`arena-${l}`).textContent = testo + (tagliata ? '\n\n(cut short: free answers are limited in length)' : '');
  const parole = testo.trim().split(/\s+/).filter(Boolean).length;
  $(`arena-conta-${l}`).textContent = `${parole} words`;
  const fine = $(`arena-fine-${l}`);
  fine.textContent = tagliata ? 'Cut short' : 'Complete';
  fine.className = tagliata ? 'tagliata' : 'completa';
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
    if (typeof d.rimasti === 'number') quota(d.rimasti);
    if (!r.ok) { stato.textContent = d.errore || 'Something went wrong. Try again in a minute.'; invia.disabled = d.rimasti === 0; return; }
    biglietto = d.biglietto;
    mostraRisposta('a', d.a, d.tagliataA);
    mostraRisposta('b', d.b, d.tagliataB);
    nascondiNomi();
    voti.querySelectorAll('button').forEach((b) => { b.disabled = false; b.classList.remove('scelto'); });
    voti.hidden = false; verdetto.hidden = true; esitoTesto.textContent = '';
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
    if (!r.ok) {
      esitoTesto.textContent = d.errore || 'Your vote was not saved. Try a new duel.';
      verdetto.classList.add('errore'); verdetto.hidden = false; voti.hidden = true;
      return;
    }
    biglietto = null;
    mostraNome('a', d.a, b.dataset.esito === 'a');
    mostraNome('b', d.b, b.dataset.esito === 'b');
    const nome = (id) => nomeDi(id).nome.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const chi = `Model A was <b>${nome(d.a)}</b>. Model B was <b>${nome(d.b)}</b>.`;
    esitoTesto.innerHTML = d.contato ? `<b class="ar-titolo">Vote saved</b>${chi} <a href="/arena/leaderboard.html">See the leaderboard</a>` : `<b class="ar-titolo">Vote not counted</b>${chi} ${d.nota || ''}`;
    verdetto.classList.toggle('errore', !d.contato);
    verdetto.hidden = false; voti.hidden = true;
    if (d.contato) salvaMio({ a: d.a, b: d.b, esito: b.dataset.esito }); // la tua classifica, solo in questo browser
    mostraMia(NOMI);
    if (window.gtag) window.gtag('event', 'arena_voto', { esito: b.dataset.esito });
  } catch {
    esitoTesto.textContent = 'No connection: your vote was not saved.';
    verdetto.classList.add('errore'); verdetto.hidden = false;
    voti.querySelectorAll('button').forEach((x) => { x.disabled = false; });
  }
});

mostraMia(NOMI);

ancora.addEventListener('click', () => {
  duello.hidden = true;
  verdetto.hidden = true;
  nascondiNomi();
  invia.disabled = false;
  $('arena-domanda').value = '';
  $('arena-domanda').focus();
});
