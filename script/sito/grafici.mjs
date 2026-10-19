// Grafici scritti come HTML/SVG statico: leggibili senza JavaScript e dai motori di ricerca.
// Le etichette sono HTML (dimensione vera anche sul telefono); le linee sono SVG che si stira.
import { esc, fmtData } from './comune.mjs';

const tacche = (min, max, quante = 5) => {
  const grezzo = (max - min) / quante;
  const p = 10 ** Math.floor(Math.log10(grezzo));
  const passo = [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= grezzo);
  const out = [];
  for (let v = Math.ceil(min / passo) * passo; v <= max + 1e-9; v += passo) out.push(Math.round(v * 100) / 100);
  return out;
};

// Barre orizzontali in classifica, con linea di riferimento (es. miglior modello a pagamento).
export function barre(voci, { riferimento, titoloAsse = 'Arena score' } = {}) {
  const valori = voci.map((v) => v.valore).concat(riferimento ? [riferimento.valore] : []);
  // l'asse parte un po' sotto il valore più basso, con un passo adatto alla scala dei numeri
  const max = Math.max(...valori), minv = Math.min(...valori);
  const passo = max - minv > 60 ? 50 : 10;
  const margine = Math.min(Math.max((max - minv) * 0.6, 5), passo * 1.2);
  const min = Math.max(0, Math.floor((minv - margine) / passo) * passo);
  const x = (v) => (100 * (v - min)) / (max - min);
  const ticks = tacche(min, max);
  return `<div class="vel-grafico barre-arena" role="img" aria-label="${esc(titoloAsse)} of the top ${voci.length} free models">
${voci.map((v) => `<a class="vg-riga" href="${v.href}" title="${esc(v.nome)}: ${v.valore}${v.nota ? ' · ' + esc(v.nota) : ''}">
<span class="vg-nome">${esc(v.nome)}</span>
<span class="vg-pista">${riferimento ? `<span class="vg-l" style="left:${x(riferimento.valore)}%"></span>` : ''}<span class="vg-barra p-gpu" style="width:${x(v.valore)}%"></span><span class="vg-val" style="left:${x(v.valore)}%">${v.valore}</span></span></a>`).join('')}
<div class="vg-asse"><span class="vg-nome"></span><span class="vg-pista">${ticks.map((t) => `<span style="left:${x(t)}%">${t}</span>`).join('')}</span></div>
</div>
<p class="small muted">${esc(titoloAsse)}, axis starts at ${min}.${riferimento ? ` Dashed line: best paid model, ${esc(riferimento.nome)} (${riferimento.valore}).` : ''}</p>`;
}

// Punteggio contro dimensione (scala logaritmica), con la frontiera: il punteggio più alto
// raggiungibile a ogni dimensione. In alto a sinistra: piccoli e forti.
export function dispersione(punti, { etichetteMax = 7 } = {}) {
  if (punti.length < 3) return '';
  const lx = (b) => Math.log10(b);
  const xs = punti.map((p) => lx(p.x)), ys = punti.map((p) => p.y);
  const x0 = Math.floor(Math.min(...xs) * 2) / 2, x1 = Math.ceil(Math.max(...xs) * 2) / 2;
  const y0 = Math.floor((Math.min(...ys) - 10) / 25) * 25, y1 = Math.ceil((Math.max(...ys) + 10) / 25) * 25;
  const X = (b) => (100 * (lx(b) - x0)) / (x1 - x0);
  const Y = (v) => 100 - (100 * (v - y0)) / (y1 - y0);
  // frontiera: scorrendo per dimensione, tiene chi supera tutti i più piccoli
  const ord = [...punti].sort((a, b) => a.x - b.x);
  let meglio = -Infinity;
  const fronte = ord.filter((p) => (p.y > meglio ? ((meglio = p.y), true) : false));
  const setFronte = new Set(fronte);
  // etichette solo sulla frontiera, saltando quelle che toccherebbero un'etichetta già messa
  const etichette = new Set();
  for (const p of [...fronte].sort((a, b) => b.y - a.y)) {
    if (etichette.size >= etichetteMax) break;
    const vicina = [...etichette].some((q) => Math.abs(X(q.x) - X(p.x)) < 22 && Math.abs(Y(q.y) - Y(p.y)) < 7);
    if (!vicina) etichette.add(p);
  }
  const xt = []; for (let e = Math.ceil(x0); e <= x1; e += 1) xt.push(e);
  const etichettaB = (e) => (10 ** e >= 1000 ? 10 ** e / 1000 + 'T' : 10 ** e + 'B');
  return `<div class="disp" role="img" aria-label="Arena score against model size for ${punti.length} open models">
<div class="disp-area">
<span class="disp-quadrante" style="left:0;top:0;width:${X(10 ** ((x0 + x1) / 2))}%;height:50%"><em>Small and strong</em></span>
${xt.map((e) => `<span class="disp-gx" style="left:${X(10 ** e)}%"></span>`).join('')}
<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${fronte.map((p) => `${X(p.x).toFixed(2)},${Y(p.y).toFixed(2)}`).join(' ')}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>
${punti.map((p) => `<a class="disp-punto${setFronte.has(p) ? ' fronte' : ''}" href="${p.href}" style="left:${X(p.x)}%;top:${Y(p.y)}%" title="${esc(p.nome)}: score ${p.y}, ${p.x} B parameters"></a>`).join('')}
${[...etichette].map((p) => `<span class="disp-et${X(p.x) > 70 ? ' sx' : ''}" style="left:${X(p.x)}%;top:${Y(p.y)}%">${esc(p.nome)}</span>`).join('')}
</div>
<div class="disp-assey">${tacche(y0, y1, 4).map((t) => `<span style="top:${Y(t)}%">${t}</span>`).join('')}</div>
<div class="disp-assex">${xt.map((e) => `<span style="left:${X(10 ** e)}%">${etichettaB(e)}</span>`).join('')}</div>
</div>
<p class="small muted">Each dot is an open model; up is better, left is smaller. The line joins the models that beat every smaller one. Parameters on a log scale.</p>`;
}

// Chi batte chi: probabilità attesa che il modello della riga vinca contro quello della colonna,
// dai punteggi Arena (scala Elo/Bradley-Terry, base 10 e 400). Blu = vince, rosso = perde.
export function matrice(voci) {
  if (voci.length < 3) return '';
  const p = (a, b) => 1 / (1 + 10 ** ((b.valore - a.valore) / 400));
  // intensità relativa allo scarto più grande della tabella, così le differenze si vedono
  const tutti = voci.flatMap((a) => voci.filter((b) => b !== a).map((b) => p(a, b)));
  const scarto = Math.max(0.05, ...tutti.map((v) => Math.abs(v - 0.5)));
  const lo = Math.min(...tutti), hi = Math.max(...tutti);
  const cella = (a, b) => {
    if (a === b) return '<td class="mx-diag"></td>';
    const v = p(a, b);
    const forza = Math.min(1, Math.abs(v - 0.5) / scarto); // 0.5 → neutro, lo scarto massimo → pieno
    const cls = v >= 0.5 ? 'mx-vince' : 'mx-perde';
    return `<td class="${cls}${forza > 0.55 ? ' forte' : ''}" style="--f:${Math.round(forza * 80)}%" title="${esc(a.nome)} vs ${esc(b.nome)}: expected to win ${Math.round(v * 100)}% of battles">${v.toFixed(2)}</td>`;
  };
  return `<div class="tw mx"><table aria-label="Expected win rate of each model against each other model">
<thead><tr><th class="mx-angolo"><span class="small muted">Model A ↓ · Model B →</span></th>${voci.map((v) => `<th class="mx-col"><span>${esc(v.nome)}${v.pagato ? ' (paid)' : ''}</span></th>`).join('')}</tr></thead>
<tbody>${voci.map((a) => `<tr><th class="mx-riga">${a.href ? `<a href="${a.href}">${esc(a.nome)}</a>` : esc(a.nome)}${a.pagato ? ' <span class="tag novoti">paid</span>' : ''}</th>${voci.map((b) => cella(a, b)).join('')}</tr>`).join('')}</tbody>
</table></div>
<div class="legenda small"><span><i class="mx-chiave mx-perde forte" style="--f:80%"></i>A usually loses (down to ${lo.toFixed(2)})</span><span><i class="mx-chiave mx-neutro"></i>Even (0.50)</span><span><i class="mx-chiave mx-vince forte" style="--f:80%"></i>A usually wins (up to ${hi.toFixed(2)})</span></div>
<p class="small muted">Each cell: how often the model on the row is expected to beat the model in the column, from their Arena scores (1 / (1 + 10^((B − A) / 400)), the Elo formula behind Arena's ratings). Arena does not publish every single battle, so these are expected rates, not counted ones.</p>`;
}

// Andamento nel tempo: fino a 5 modelli + miglior modello a pagamento (tratteggiato).
const COLORI = ['s1', 's2', 's3', 's4', 's5'];
export function linee(date, serie, pagato) {
  const tutti = serie.flatMap((s) => s.valori).concat(pagato).filter((v) => v != null);
  if (!tutti.length || date.length < 2) return '';
  const y0 = Math.floor((Math.min(...tutti) - 10) / 25) * 25, y1 = Math.ceil((Math.max(...tutti) + 10) / 25) * 25;
  const t0 = Date.parse(date[0]), t1 = Date.parse(date.at(-1));
  const X = (d) => (100 * (Date.parse(d) - t0)) / (t1 - t0 || 1);
  const Y = (v) => 100 - (100 * (v - y0)) / (y1 - y0);
  const tratto = (valori) => {
    const pezzi = []; let cur = [];
    valori.forEach((v, i) => { if (v == null) { if (cur.length) pezzi.push(cur); cur = []; } else cur.push(`${X(date[i]).toFixed(2)},${Y(v).toFixed(2)}`); });
    if (cur.length) pezzi.push(cur);
    return pezzi;
  };
  const mesi = []; const d0 = new Date(t0);
  for (let d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1)); d.getTime() <= t1; d.setUTCMonth(d.getUTCMonth() + 1)) mesi.push(d.toISOString().slice(0, 10));
  return `<div class="linee" role="img" aria-label="Arena score over time">
<div class="disp-area">
${mesi.map((m) => `<span class="disp-gx" style="left:${X(m)}%"></span>`).join('')}
<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
${tratto(pagato).map((p) => `<polyline class="l-pagato" points="${p.join(' ')}" fill="none" stroke-width="1.5" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>`).join('')}
${serie.map((s, i) => tratto(s.valori).map((p) => `<polyline class="l-${COLORI[i]}" points="${p.join(' ')}" fill="none" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>`).join('')).join('')}
</svg>
${serie.map((s, i) => {
    const k = s.valori.findLastIndex((v) => v != null);
    if (k < 0) return '';
    return `<span class="l-punto sw-${COLORI[i]}" style="left:${X(date[k])}%;top:${Y(s.valori[k])}%" title="${esc(s.nome)}: ${s.valori[k]} on ${fmtData(date[k])}"></span>`;
  }).join('')}
</div>
<div class="disp-assey">${tacche(y0, y1, 4).map((t) => `<span style="top:${Y(t)}%">${t}</span>`).join('')}</div>
<div class="disp-assex">${mesi.map((m) => `<span style="left:${X(m)}%">${new Date(m).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })}</span>`).join('')}</div>
</div>
<div class="legenda small">${serie.map((s, i) => `<span><i class="sw-${COLORI[i]}"></i>${s.href ? `<a href="${s.href}">${esc(s.nome)}</a>` : esc(s.nome)} <b>${s.valori.filter((v) => v != null).at(-1) ?? ''}</b></span>`).join('')}<span><i class="sw-pagato"></i>Best paid model</span></div>
<p class="small muted">Arena score from ${fmtData(date[0])} to ${fmtData(date.at(-1))}.</p>`;
}
