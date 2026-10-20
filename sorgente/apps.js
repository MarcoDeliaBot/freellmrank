// Pagina /apps: filtro per prezzo (tutte, gratis, gratis con il tuo modello, piano gratis con limiti, a pagamento).
const tasti = [...document.querySelectorAll('.app-filtri .tabs button')];
tasti.forEach((b) => b.addEventListener('click', () => {
  const p = b.dataset.prezzo;
  tasti.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  document.querySelectorAll('.tab-app tbody tr').forEach((tr) => { tr.hidden = !!p && tr.dataset.prezzo !== p; });
  // un gruppo senza app di quel prezzo sparisce del tutto
  document.querySelectorAll('.tab-app').forEach((t) => { t.closest('.panel').hidden = ![...t.querySelectorAll('tbody tr')].some((tr) => !tr.hidden); });
}));
