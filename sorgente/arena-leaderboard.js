// /arena/leaderboard: chiede la classifica di tutti i voti e mostra anche quella personale.
import { tabella, mostraMia } from './arena-mia.mjs';

const NOMI = JSON.parse(document.getElementById('arena-nomi').textContent);
const $ = (id) => document.getElementById(id);
mostraMia(NOMI);

fetch('/api/arena/ranking').then((r) => r.json()).then((d) => {
  $('al-voti').textContent = d.voti;
  const sopra = d.modelli.filter((m) => m.voti >= d.soglia);
  const sotto = d.modelli.filter((m) => m.voti < d.soglia);
  // anche i modelli dell'arena che non hanno ancora nessun voto
  for (const id of Object.keys(NOMI)) if (!d.modelli.some((m) => m.id === id)) sotto.push({ id, punteggio: 1000, ic: null, voti: 0, vinte: 0, perse: 0, pari: 0 });
  $('al-classifica').innerHTML = sopra.length
    ? `<div class="tw">${tabella(sopra, NOMI)}</div>`
    : `<p class="small muted">No model has ${d.soglia} votes yet: Free Arena opened on 20 October 2026. <a href="/arena.html">Your vote helps</a>.</p>`;
  $('al-raccolta').innerHTML = `<div class="tw">${tabella(sotto.sort((a, b) => b.voti - a.voti), NOMI)}</div>`;
}).catch(() => { $('al-classifica').innerHTML = '<p class="small muted">Could not load the votes. Reload the page.</p>'; });
