// Filtri della classifica dei modelli decisionali (le righe sono già nella pagina).
const $ = (id) => document.getElementById(id);
const righe = [...document.querySelectorAll('tbody tr[data-lavoro]')];
const MARGINE = 1.5; // GB per il programma che fa girare il modello; una decisione usa poco contesto

function applica() {
  const lavoro = $('f-lavoro').checked, img = $('f-img').checked;
  const perScheda = parseFloat($('f-scheda').selectedOptions[0]?.dataset.gb);
  const vram = perScheda ? perScheda * Number($('f-quante').value) : null;
  $('f-quante').disabled = !perScheda;
  let n = 0;
  for (const r of righe) {
    const serve = parseFloat(r.dataset.gb);
    const entra = vram == null || (serve && serve + MARGINE <= vram);
    const ok = (!lavoro || r.dataset.lavoro === 'yes') && (!img || r.dataset.img === '1') && entra;
    r.hidden = !ok;
    if (ok) n++;
  }
  $('conta-dec').textContent = `${n} of ${righe.length} models${vram ? ` fit in ${vram % 1 ? vram.toFixed(1) : vram} GB` : ''}`;
}
['f-lavoro', 'f-img', 'f-scheda', 'f-quante'].forEach((id) => $(id).addEventListener('change', applica));
applica();
