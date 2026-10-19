// Filtri della classifica dei modelli decisionali (le righe sono già nella pagina).
const $ = (id) => document.getElementById(id);
const righe = [...document.querySelectorAll('tbody tr[data-lavoro]')];

function applica() {
  const lavoro = $('f-lavoro').checked, img = $('f-img').checked, casa = $('f-casa').checked;
  let n = 0;
  for (const r of righe) {
    const ok = (!lavoro || r.dataset.lavoro === 'yes') && (!img || r.dataset.img === '1') && (!casa || r.dataset.casa === '1');
    r.hidden = !ok;
    if (ok) n++;
  }
  $('conta-dec').textContent = `${n} of ${righe.length} models`;
}
['f-lavoro', 'f-img', 'f-casa'].forEach((id) => $(id).addEventListener('change', applica));
applica();
