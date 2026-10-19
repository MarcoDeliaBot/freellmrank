// Classifica dai duelli col modello di Bradley-Terry, lo stesso metodo di Arena (lmarena/arena-rank).
// Usata dal server (functions/api/arena/ranking.js, tutti i voti) e dal browser ("Your ranking", i tuoi voti).
// Ingresso: righe {a, b, esito, n} con esito 'a' | 'b' | 'pari' | 'male' (pari e "entrambe male" contano mezzo punto a testa).
// Uscita: per modello punteggio su scala Elo (media 1000), ±intervallo al 95%, voti, vinte, perse, pari.

export function classifica(righe, { iterazioni = 200 } = {}) {
  const ids = [...new Set(righe.flatMap((r) => [r.a, r.b]))];
  const k = ids.length;
  if (k < 2) return ids.map((id) => ({ id, punteggio: 1000, ic: null, voti: 0, vinte: 0, perse: 0, pari: 0 }));
  const idx = new Map(ids.map((id, i) => [id, i]));
  const n = Array.from({ length: k }, () => new Float64Array(k)); // duelli fra i e j
  const w = new Float64Array(k); // punti vinti (pari = 0,5)
  const conta = ids.map(() => ({ voti: 0, vinte: 0, perse: 0, pari: 0 }));
  for (const r of righe) {
    const i = idx.get(r.a), j = idx.get(r.b), q = Number(r.n) || 1;
    n[i][j] += q; n[j][i] += q;
    conta[i].voti += q; conta[j].voti += q;
    if (r.esito === 'a') { w[i] += q; conta[i].vinte += q; conta[j].perse += q; }
    else if (r.esito === 'b') { w[j] += q; conta[j].vinte += q; conta[i].perse += q; }
    else { w[i] += q / 2; w[j] += q / 2; conta[i].pari += q; conta[j].pari += q; }
  }
  // un piccolo aiuto (un pareggio virtuale con ogni altro modello) evita punteggi infiniti a chi non perde mai
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) if (i !== j) { n[i][j] += 0.5; w[i] += 0.25; }
  // algoritmo MM (Hunter 2004): forza p, poi scala Elo 400 · log10(p)
  let p = new Float64Array(k).fill(1);
  for (let t = 0; t < iterazioni; t++) {
    const nuovo = new Float64Array(k);
    for (let i = 0; i < k; i++) {
      let den = 0;
      for (let j = 0; j < k; j++) if (i !== j && n[i][j]) den += n[i][j] / (p[i] + p[j]);
      nuovo[i] = w[i] / den;
    }
    const media = Math.exp(nuovo.reduce((s, x) => s + Math.log(x), 0) / k);
    p = nuovo.map((x) => x / media);
  }
  const s = [...p].map((x) => 400 * Math.log10(x));
  // incertezza: informazione di Fisher di ogni modello (approssimazione senza le covarianze)
  const C = 400 / Math.LN10;
  return ids.map((id, i) => {
    let info = 0;
    for (let j = 0; j < k; j++) if (i !== j) { const pij = p[i] / (p[i] + p[j]); info += (n[i][j] - 0.5) * pij * (1 - pij); }
    return { id, punteggio: Math.round(1000 + s[i]), ic: info > 0 ? Math.round((1.96 * C) / Math.sqrt(info)) : null, ...conta[i] };
  }).sort((x, y) => y.punteggio - x.punteggio);
}
