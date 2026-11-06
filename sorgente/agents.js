// Pagina /always-on-agents (6/11/2026).
// 1) Cursori di priorità: l'affinità di ogni agente è la media dei suoi valori (Sì 1, In parte 0,5, altrimenti 0;
//    affidabilità = indice/100) pesata coi cursori; le barre si riordinano.
// 2) Filtri delle schede: mostrano solo le schede con «yes» in quel campo (per «Free»: gli agenti gratuiti).
// Nascosti con style.display: l'attributo hidden lo annulla il display del CSS.
const datiEl = document.getElementById('agenti-dati');
const barre = document.getElementById('aff-barre');
if (datiEl && barre) {
  const { criteri, agenti } = JSON.parse(datiEl.textContent);
  const cursori = criteri.map((k) => document.querySelector(`.aff-cursore input[data-criterio="${k}"]`));
  const righe = new Map([...barre.querySelectorAll('.aff-riga')].map((r) => [r.dataset.id, r]));
  const aggiorna = () => {
    const pesi = cursori.map((c) => Number(c?.value || 0));
    const tot = pesi.reduce((s, p) => s + p, 0);
    const pc = (a) => (tot ? Math.round((100 * a.v.reduce((s, v, i) => s + v * pesi[i], 0)) / tot) : 0);
    const ordine = agenti.map((a) => ({ a, p: pc(a) })).sort((x, y) => y.p - x.p);
    for (const { a, p } of ordine) {
      const r = righe.get(a.id);
      if (!r) continue;
      r.querySelector('.aff-barra span').style.width = p + '%';
      r.querySelector('.aff-pc').textContent = p + '%';
      barre.appendChild(r);
    }
    document.getElementById('aff-top-nome').textContent = ordine[0].a.nome;
    document.getElementById('aff-top-pc').textContent = ordine[0].p + '%';
    cursori.forEach((c) => { if (c) c.nextElementSibling.textContent = c.value; });
  };
  cursori.forEach((c) => c?.addEventListener('input', aggiorna));
}

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
