// Disegno in caratteri per il piè di pagina (richiesta di Marco, 21/10/2026): colline e nuvole fatte di . : - = + * # % @.
// Sempre uguale da una build all'altra (generatore con seme fisso), solo decorazione: aria-hidden, nessun testo da tradurre.
const RAMPA = ' .:-~=+*#%@';

function generatore(seme) {
  let s = seme >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// rumore a valori su una griglia, interpolato: forme morbide, non puntini a caso
function rumore(caso, larg, alt, passo) {
  const gx = Math.ceil(larg / passo) + 2, gy = Math.ceil(alt / passo) + 2;
  const g = Array.from({ length: gy }, () => Array.from({ length: gx }, caso));
  const liscio = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / passo, fy = y / passo, x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = liscio(fx - x0), ty = liscio(fy - y0);
    const a = g[y0][x0] + (g[y0][x0 + 1] - g[y0][x0]) * tx;
    const b = g[y0 + 1][x0] + (g[y0 + 1][x0 + 1] - g[y0 + 1][x0]) * tx;
    return a + (b - a) * ty;
  };
}

export function arteAscii(larg = 160, alt = 22, seme = 2026) {
  const caso = generatore(seme);
  const grande = rumore(caso, larg, alt, 9), fine = rumore(caso, larg, alt, 3), nuvole = rumore(caso, larg, alt, 6);
  // profilo delle colline: due creste che salgono verso i lati, una valle al centro-destra
  const cresta = (x) => {
    const t = x / larg;
    return alt * (0.55 - 0.32 * Math.exp(-((t - 0.08) ** 2) / 0.012) - 0.38 * Math.exp(-((t - 0.72) ** 2) / 0.02) + 0.12 * Math.sin(t * 17)) + (grande(x, 0) - 0.5) * 5;
  };
  const righe = [];
  for (let y = 0; y < alt; y++) {
    let r = '';
    for (let x = 0; x < larg; x++) {
      const h = cresta(x);
      let d;
      if (y >= h) d = 0.28 + 0.5 * Math.min(1, (y - h) / 6) + (fine(x, y) - 0.5) * 0.55; // dentro le colline: più fitto in basso
      else {
        const n = nuvole(x, y) * 0.7 + fine(x, y) * 0.3; // sopra: nuvole rade che si sfrangiano
        d = n > 0.66 && y > 1 ? (n - 0.66) * 2.4 : y > h - 1.5 ? 0.18 : 0;
      }
      r += RAMPA[Math.max(0, Math.min(RAMPA.length - 1, Math.round(d * (RAMPA.length - 1))))];
    }
    righe.push(r.replace(/\s+$/, ''));
  }
  return `<pre class="arte" aria-hidden="true">${righe.join('\n')}</pre>`;
}
