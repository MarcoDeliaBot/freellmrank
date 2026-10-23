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

// aspetto dei video orizzontali 1920x1080 (video lungo della settimana e video del modello), dal 22/10/2026 in comune
export const STILE_ORIZZONTALE = `
:root{--v-verde:#4ccb8b;--serif:"Palatino Linotype","P052","Book Antiqua",Georgia,serif;--sans:"Segoe UI","Noto Sans","DejaVu Sans",sans-serif}
html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:var(--bg);color:var(--ink)}
.tela{position:relative;width:1920px;height:1080px;overflow:hidden;font-family:var(--sans)}
.marchio{position:absolute;left:80px;top:56px;display:flex;align-items:center;gap:16px;font:700 34px/1 var(--sans);z-index:5}
.marchio b span{color:var(--v-verde)}
.segno{display:flex;align-items:flex-end;gap:6px;width:56px;height:56px;padding:0 9px 10px;box-sizing:border-box;border-radius:14px;background:#0d7a47}
.segno i{display:block;width:10px;border-radius:2px;background:#fff}
.data-sett{position:absolute;right:80px;top:66px;font:600 28px/1 var(--sans);color:var(--muted);z-index:5}
.avanza{position:absolute;left:80px;right:80px;bottom:40px;height:6px;border-radius:3px;background:var(--line);z-index:5}
.avanza i{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:var(--v-verde)}
.scena{position:absolute;inset:0;padding:150px 120px 190px;display:flex;flex-direction:column;justify-content:center;gap:26px;opacity:0}
.titolo{font:700 72px/1.08 var(--serif);margin:0;letter-spacing:-.015em}
.grande{font:700 150px/1 var(--serif);margin:0;letter-spacing:-.02em}
.sotto-titolo{font:400 36px/1.35 var(--sans);color:var(--muted);margin:0}
.verde{color:var(--v-verde)}
.riga{will-change:transform,opacity}
.chip{align-self:flex-start;font:700 28px/1 var(--sans);padding:14px 22px;border-radius:999px;background:color-mix(in srgb,var(--v-verde) 18%,transparent);color:var(--v-verde)}
.grafico-v{zoom:2.05;margin:0 -4px}
.grafico-v .vg-riga{pointer-events:none}
.grafico-v .vg-riga,.grafico-v .vg-asse{grid-template-columns:minmax(9rem,12rem) 1fr!important;gap:.5rem!important}
.grafico-v .vg-nome{text-align:right!important}
.griglia{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}
.griglia.due{grid-template-columns:repeat(2,minmax(0,1fr))}
.griglia.quattro{grid-template-columns:repeat(4,minmax(0,1fr))}
.carta{display:grid;gap:8px;padding:24px 28px;border:2px solid var(--line);border-radius:20px;background:var(--surface)}
.carta small{font:600 24px/1.2 var(--sans);color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.carta b{font:700 36px/1.15 var(--sans);overflow-wrap:anywhere}
.carta span{font:500 26px/1.3 var(--sans);color:var(--muted)}
.carta .su{color:var(--v-verde);font-weight:800}
.carta .giu{color:#ef4444;font-weight:800}
.url{font:800 84px/1 var(--sans);color:var(--v-verde);letter-spacing:-.02em}
.sotto{position:absolute;left:160px;right:160px;bottom:74px;min-height:90px;display:flex;align-items:center;justify-content:center;z-index:6}
.sotto p{margin:0;padding:12px 24px;border-radius:16px;background:rgba(2,6,23,.8);color:#fff;font:700 40px/1.2 var(--sans);text-align:center}
.sotto p:empty{display:none}
.sotto b{color:var(--v-verde)}
`;

// aspetto degli Short verticali 1080x1920 (prima in genera.mjs; dal 24/10/2026 anche per gli Short delle notizie)
export const STILE_VERTICALE = `
:root{--v-verde:#4ccb8b;--serif:"Palatino Linotype","P052","Book Antiqua",Georgia,serif;--sans:"Segoe UI","Noto Sans","DejaVu Sans",sans-serif}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:var(--bg);color:var(--ink)}
.tela{position:relative;width:1080px;height:1920px;overflow:hidden;font-family:var(--sans)}
.marchio{position:absolute;left:88px;top:110px;display:flex;align-items:center;gap:22px;font:700 46px/1 var(--sans);z-index:5}
.marchio b span{color:var(--v-verde)}
.segno{display:flex;align-items:flex-end;gap:8px;width:76px;height:76px;padding:0 12px 14px;box-sizing:border-box;border-radius:18px;background:#0d7a47}
.segno i{display:block;width:13px;border-radius:3px;background:#fff}
.avanza{position:absolute;left:88px;right:88px;bottom:120px;height:8px;border-radius:4px;background:var(--line);z-index:5}
.avanza i{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:var(--v-verde)}
/* le scene stanno sopra i sottotitoli: lo spazio in basso è loro */
.scena{position:absolute;inset:0;padding:0 88px 420px;display:flex;flex-direction:column;justify-content:center;gap:34px;opacity:0}
.grande{font:700 140px/1.04 var(--serif);letter-spacing:-.02em;margin:0}
.medio{font:600 84px/1.12 var(--serif);margin:0;letter-spacing:-.01em}
.piccolo{font:400 46px/1.35 var(--sans);color:var(--muted);margin:0}
.verde{color:var(--v-verde)}
.riga{will-change:transform,opacity}
.chip{align-self:flex-start;font:700 40px/1 var(--sans);padding:22px 30px;border-radius:999px;background:color-mix(in srgb,var(--v-verde) 18%,transparent);color:var(--v-verde)}
.grafico-v{zoom:3.1;margin:0 -6px}
.grafico-v .vg-riga{pointer-events:none}
.grafico-v .vg-riga,.grafico-v .vg-asse{grid-template-columns:minmax(6rem,7.6rem) 1fr!important;gap:.5rem!important}
.grafico-v .vg-nome{text-align:right!important}
.grafico-v .vg-asse .vg-nome{display:block!important}
.etichetta-rif{font:600 36px/1.3 var(--sans);color:var(--muted)}
.etichetta-rif b{color:var(--ink)}
.scheda-v{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px 24px;padding:26px 30px;border:2px solid var(--line);border-radius:22px;background:var(--surface)}
.scheda-v b{font:700 46px/1.1 var(--sans)}
.scheda-v small{grid-column:1 / -1;font:500 34px/1.2 var(--sans);color:var(--muted)}
.scheda-v .no{font:800 44px/1 var(--sans);color:#ef4444}
.scheda-v .si{font:800 44px/1 var(--sans);color:var(--v-verde)}
.scheda-v .pista{grid-column:1 / -1;position:relative;height:22px;border-radius:11px;background:var(--line);overflow:hidden}
.scheda-v .pista i{position:absolute;left:0;top:0;bottom:0;background:var(--c-gpu);border-radius:11px}
.scheda-v .pista i.verde-b{background:var(--v-verde)}
.serve{font:700 52px/1.2 var(--sans)}
.serve span{color:var(--v-verde)}
.url{font:800 96px/1 var(--sans);color:var(--v-verde);letter-spacing:-.02em;overflow-wrap:anywhere}
.gancio{display:grid;gap:14px;margin-top:18px}
.gancio>span:not(.pista){font:700 40px/1.2 var(--sans);color:var(--muted)}
.gancio .pista{position:relative;height:56px;border-radius:12px;background:var(--line);overflow:hidden}
.gancio .pista i{position:absolute;left:0;top:0;bottom:0;border-radius:12px;background:var(--v-verde)}
.gancio .pista i.pagato{background:repeating-linear-gradient(135deg,var(--ink) 0 14px,var(--muted) 14px 28px)}
/* sottotitoli parola per parola (B): grandi, in basso, la parola detta adesso in verde */
.sotto{position:absolute;left:70px;right:70px;bottom:190px;min-height:200px;display:flex;align-items:center;justify-content:center;z-index:6}
.sotto p{margin:0;max-width:940px;padding:20px 30px;border-radius:24px;background:rgba(2,6,23,.78);color:#fff;font:800 66px/1.18 var(--sans);text-align:center;letter-spacing:-.01em}
.sotto p:empty{display:none}
.sotto b{color:var(--v-verde)}
/* chiusura fissa (F): uguale in tutti i video */
.fine{align-items:center;text-align:center}
.fine .segno{width:150px;height:150px;padding:0 24px 28px;gap:14px;border-radius:36px}
.fine .segno i{width:26px}
.fine .url{font-size:76px;overflow-wrap:normal;white-space:nowrap}
.fine .bio{font:800 64px/1.1 var(--sans);padding:26px 44px;border-radius:999px;background:var(--v-verde);color:#04130b}
`;
