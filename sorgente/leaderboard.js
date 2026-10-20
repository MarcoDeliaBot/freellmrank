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

// 6. filtro per laboratorio: spegne barre, punti, etichette e righe della tabella dei laboratori tolti
document.querySelectorAll('section.cat').forEach((sez) => {
  const tasti = [...sez.querySelectorAll('.filtro-lab button')];
  const conta = sez.querySelector('.filtro-lab .conta');
  const aggiorna = () => {
    const accesi = new Set(tasti.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.lab));
    sez.querySelectorAll('[data-lab]:not(button)').forEach((el) => el.classList.toggle('spento', !accesi.has(el.dataset.lab)));
    const righe = [...sez.querySelectorAll('.pannello-tabella tbody tr')];
    if (conta) conta.textContent = `${righe.filter((r) => !r.classList.contains('spento')).length} of ${righe.length} models`;
  };
  tasti.forEach((b) => b.addEventListener('click', () => {
    const tutti = tasti.every((x) => x.getAttribute('aria-pressed') === 'true');
    // primo clic con tutti accesi: resta solo quello; poi si accende e spegne uno alla volta
    if (tutti) tasti.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    else b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    if (tasti.every((x) => x.getAttribute('aria-pressed') === 'false')) tasti.forEach((x) => x.setAttribute('aria-pressed', 'true'));
    aggiorna();
  }));
  aggiorna();
  // 7. tabella, grafici o tutti e due
  const vista = [...sez.querySelectorAll('.vista button')];
  vista.forEach((b) => b.addEventListener('click', () => {
    vista.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    sez.classList.remove('solo-tabella', 'solo-grafici');
    if (b.dataset.vista) sez.classList.add(b.dataset.vista);
  }));
});
