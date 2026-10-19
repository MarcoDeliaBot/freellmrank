// Schede delle categorie e filtri della classifica.
const bottoni = document.querySelectorAll('.tabs button');
const fApi = document.getElementById('f-api');
const fOpen = document.getElementById('f-open');

function mostra(cat) {
  document.querySelectorAll('section.cat').forEach((s) => { s.hidden = s.id !== cat; });
  bottoni.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
  try { history.replaceState(null, '', '#' + cat); } catch {}
}

function filtra() {
  document.querySelectorAll('section.cat tbody tr').forEach((tr) => {
    tr.hidden = (fApi.checked && tr.dataset.api !== '1') || (fOpen.checked && tr.dataset.open !== '1');
  });
}

bottoni.forEach((b) => b.addEventListener('click', () => mostra(b.dataset.cat)));
fApi.addEventListener('change', filtra);
fOpen.addEventListener('change', filtra);
const iniziale = location.hash.slice(1);
if (document.getElementById(iniziale)?.classList.contains('cat')) mostra(iniziale);
