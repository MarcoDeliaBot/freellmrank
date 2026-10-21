// Motore delle animazioni dei video (condiviso da genera.mjs e lungo.mjs): ogni fotogramma è funzione pura del tempo, render(t).
// ---------- motore: ogni elemento ha [entra, esce] in secondi; tutto si calcola da t ----------
// SOTTO (da registra.py): [{da, a, parole: [[testo, quando], …]}]; senza, niente sottotitoli
export const MOTORE = `
const ease = (x) => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3);
const fin = (t, a, d) => ease((t - a) / d);
const escH = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function render(t) {
  for (const s of document.querySelectorAll('.scena')) {
    const a = +s.dataset.da, b = +s.dataset.a;
    // la scena entra dopo che la precedente è uscita: si passa dallo sfondo, niente doppia esposizione
    const o = Math.min(fin(t, a, 0.35), 1 - fin(t, b - 0.3, 0.3));
    s.style.opacity = o;
    s.style.visibility = o > 0 ? 'visible' : 'hidden';
    for (const r of s.querySelectorAll('[data-in]')) {
      const k = fin(t, a + +r.dataset.in, 0.5);
      r.style.opacity = k;
      r.style.transform = 'translateY(' + (1 - k) * 60 + 'px)';
    }
    for (const r of s.querySelectorAll('[data-conta]')) {
      const k = fin(t, a + +r.dataset.da, 1.2);
      r.textContent = Math.round(+r.dataset.conta * k);
    }
    // barre del grafico vero: crescono una dopo l'altra fino alla larghezza del sito
    s.querySelectorAll('.vg-riga:not(.rif)').forEach((riga, i) => {
      const barra = riga.querySelector('.vg-barra'), val = riga.querySelector('.vg-val');
      if (!barra.dataset.w) barra.dataset.w = parseFloat(barra.style.width);
      const k = fin(t, a + 0.9 + i * 0.35, 0.9);
      barra.style.width = barra.dataset.w * k + '%';
      val.style.left = barra.dataset.w * k + '%';
      val.style.opacity = k;
      riga.style.opacity = Math.min(1, fin(t, a + 0.7 + i * 0.35, 0.4));
    });
    for (const r of s.querySelectorAll('[data-pista]')) {
      const k = fin(t, a + +r.dataset.da, 0.8);
      r.style.width = +r.dataset.pista * k + '%';
    }
    for (const r of s.querySelectorAll('[data-luce]')) {
      const x = t - (a + +r.dataset.luce);
      r.style.boxShadow = x > 0 && x < 1.6 ? '0 0 0 ' + (6 * Math.sin(Math.PI * x / 1.6)) + 'px color-mix(in srgb, var(--v-verde) 55%, transparent)' : 'none';
      r.style.borderRadius = '8px';
    }
  }
  const pezzo = (window.SOTTO || []).find((p) => t >= p.da && t < p.a);
  const riga = document.querySelector('.sotto p');
  if (riga) riga.innerHTML = pezzo ? pezzo.parole.map(([w, q], i) => { const ora = t >= q && (i === pezzo.parole.length - 1 || t < pezzo.parole[i + 1][1]); return ora ? '<b>' + escH(w) + '</b>' : escH(w); }).join(' ') : '';
  document.querySelector('.avanza i').style.width = (t / DURATA * 100) + '%';
}
`;
