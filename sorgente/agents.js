// Pagina /always-on-agents: filtri del comparatore (6/11/2026). Un filtro mostra solo le schede con «yes» in quel campo
// (per «Free»: gli agenti gratuiti). Nascosti con style.display: l'attributo hidden lo annulla il display del CSS.
const tasti = [...document.querySelectorAll('.agenti-filtri .tabs button')];
const schede = [...document.querySelectorAll('.agente')];
const conta = document.getElementById('agenti-conta');
const passa = (s, f) => !f || (f === 'gratis' ? s.dataset.gratis === 'true' : s.dataset[f] === 'yes');
tasti.forEach((b) => b.addEventListener('click', () => {
  const f = b.dataset.filtro;
  tasti.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  let n = 0;
  schede.forEach((s) => { const ok = passa(s, f); s.style.display = ok ? '' : 'none'; if (ok) n++; });
  if (conta) conta.textContent = `${n} ${n === 1 ? 'agent' : 'agents'} shown`;
}));
