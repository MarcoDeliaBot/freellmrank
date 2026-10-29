// Stampo «mappa» (29/10/2026, dalle scene della prova «mappe» fatta con Remotion: spillo, rotta, più mete): mappa del mondo
// a puntini con 1–5 luoghi (città o paesi) che compaiono quando la voce li nomina: uno spillo d'accento, un'onda che si
// allarga una volta sola e l'etichetta con il luogo (mono) e, se c'è, chi o cosa sta lì (serif). Con «rotte» un arco
// si disegna dal primo luogo verso ognuno degli altri. La mappa si inquadra da sola sui luoghi (mai troppo vicina) e sta
// ferma: niente zoom, niente panoramiche. Se le etichette non trovano posto accanto agli spilli (luoghi sparsi per il
// mondo, soprattutto nel verticale stretto) gli spilli diventano numerati e le etichette vanno in una legenda: a destra
// nell'orizzontale, sotto la mappa nel verticale. Le coordinate vengono da un elenco fisso (LUOGHI): il piano scrive solo
// nomi, mai numeri di latitudine, e un nome che non è nell'elenco fa scartare la scena.
import { C, scena, s3, esc, attacchi, formatoDi } from '../base.mjs';
import { PASSO, NORD, SUD, TERRE } from '../terre.mjs';

const MAX_TITOLO = 32;
const MAX_NOME = 18;
const MAX_LUOGHI = 5;
const MAX_PAROLA = 22;

// [latitudine, longitudine]: città dei laboratori e delle aziende, poi i paesi (al centro del paese)
const LUOGHI = {
  'San Francisco': [37.77, -122.42], 'Palo Alto': [37.44, -122.14], 'Mountain View': [37.39, -122.08], 'Menlo Park': [37.45, -122.18],
  'San Jose': [37.34, -121.89], 'Santa Clara': [37.35, -121.96], 'Silicon Valley': [37.39, -122.06], 'Los Angeles': [34.05, -118.24],
  'Seattle': [47.61, -122.33], 'Redmond': [47.67, -122.12], 'New York': [40.71, -74.01], 'Boston': [42.36, -71.06], 'Austin': [30.27, -97.74],
  'Toronto': [43.65, -79.38], 'Montreal': [45.5, -73.57],
  'London': [51.51, -0.13], 'Paris': [48.86, 2.35], 'Berlin': [52.52, 13.4], 'Munich': [48.14, 11.58], 'Zurich': [47.38, 8.54],
  'Amsterdam': [52.37, 4.9], 'Brussels': [50.85, 4.35], 'Stockholm': [59.33, 18.07], 'Helsinki': [60.17, 24.94], 'Dublin': [53.35, -6.26],
  'Madrid': [40.42, -3.7], 'Rome': [41.9, 12.5], 'Milan': [45.46, 9.19],
  'Tel Aviv': [32.09, 34.78], 'Abu Dhabi': [24.45, 54.38], 'Dubai': [25.2, 55.27], 'Riyadh': [24.71, 46.68],
  'Bangalore': [12.97, 77.59], 'Mumbai': [19.08, 72.88],
  'Beijing': [39.9, 116.4], 'Shanghai': [31.23, 121.47], 'Hangzhou': [30.27, 120.16], 'Shenzhen': [22.54, 114.06], 'Guangzhou': [23.13, 113.26],
  'Hong Kong': [22.32, 114.17], 'Seoul': [37.57, 126.98], 'Tokyo': [35.68, 139.69], 'Taipei': [25.03, 121.57], 'Singapore': [1.35, 103.82],
  'Sydney': [-33.87, 151.21], 'São Paulo': [-23.55, -46.63],
  'United States': [39.8, -98.6], 'California': [36.8, -119.4], 'Texas': [31.0, -99.9], 'Canada': [56.1, -106.3],
  'United Kingdom': [54.0, -2.0], 'France': [46.6, 2.4], 'Germany': [51.2, 10.4], 'Switzerland': [46.8, 8.2], 'Netherlands': [52.1, 5.3],
  'Sweden': [62.0, 15.0], 'Finland': [64.0, 26.0], 'Ireland': [53.4, -8.2], 'Italy': [42.8, 12.6], 'Spain': [40.2, -3.7],
  'Europe': [50.0, 10.0], 'European Union': [50.0, 10.0],
  'Israel': [31.0, 34.9], 'United Arab Emirates': [24.0, 54.0], 'Saudi Arabia': [24.0, 45.0], 'India': [22.0, 79.0],
  'China': [35.0, 104.0], 'Japan': [36.2, 138.3], 'South Korea': [36.5, 127.9], 'Taiwan': [23.7, 121.0], 'Australia': [-25.3, 133.8], 'Brazil': [-10.3, -53.2],
};
// altri modi di scrivere gli stessi luoghi (la notizia li scrive così e il piano deve copiarli com'è)
const ALIAS = {
  'bengaluru': 'Bangalore', 'sao paulo': 'São Paulo', 'zürich': 'Zurich', 'münchen': 'Munich', 'new york city': 'New York',
  'us': 'United States', 'u.s.': 'United States', 'usa': 'United States', 'u.s.a.': 'United States', 'america': 'United States',
  'uk': 'United Kingdom', 'u.k.': 'United Kingdom', 'britain': 'United Kingdom', 'great britain': 'United Kingdom', 'england': 'United Kingdom',
  'eu': 'European Union', 'uae': 'United Arab Emirates', 'korea': 'South Korea', 'the netherlands': 'Netherlands', 'the united states': 'United States',
};
const CHIAVI = new Map([...Object.keys(LUOGHI).map((k) => [k.toLowerCase(), k]), ...Object.entries(ALIAS)]);
const trova = (s) => { const k = CHIAVI.get(String(s ?? '').trim().toLowerCase()); return k ? { chiave: k, lat: LUOGHI[k][0], lon: LUOGHI[k][1] } : null; };

// le terre emerse a mezzo grado, decodificate una volta
const COLONNE = 360 / PASSO;
const RIGHE = (NORD - SUD) / PASSO;
const TERRA = new Uint8Array(COLONNE * RIGHE);
TERRE.split(';').forEach((riga, r) => {
  if (!riga) return;
  for (const pezzo of riga.split(',')) {
    const [a, b = a] = pezzo.split('-').map(Number);
    for (let c = a; c <= b; c++) TERRA[r * COLONNE + c] = 1;
  }
});
const terra = (lon, lat) => {
  if (lat >= NORD || lat <= SUD) return false;
  const l = (((lon + 180) % 360) + 360) % 360;
  return TERRA[Math.floor((NORD - lat) / PASSO) * COLONNE + Math.min(COLONNE - 1, Math.floor(l / PASSO))] === 1;
};

// larghezze in em di Source Serif 4 (le stesse misure dello stampo «punti»): per sapere quanto è larga un'etichetta
const MINUSCOLE = { a: 0.5, b: 0.55, c: 0.45, d: 0.55, e: 0.48, f: 0.32, g: 0.5, h: 0.56, i: 0.27, j: 0.27, k: 0.52, l: 0.27, m: 0.83, n: 0.56, o: 0.53, p: 0.55, q: 0.55, r: 0.38, s: 0.42, t: 0.33, u: 0.56, v: 0.5, w: 0.74, x: 0.5, y: 0.5, z: 0.45 };
const MAIUSCOLE = { I: 0.32, J: 0.36, M: 0.86, W: 0.98, L: 0.58, F: 0.56, E: 0.6, T: 0.62, P: 0.58, S: 0.52, B: 0.62 };
const largo = (ch) => (ch === ' ' ? 0.23 : MINUSCOLE[ch] ?? (/[A-Z]/.test(ch) ? MAIUSCOLE[ch] ?? 0.68 : /[0-9]/.test(ch) ? 0.5 : /[A-Za-zÀ-ÿ]/.test(ch) ? 0.6 : 0.3));
const em = (s) => [...String(s)].reduce((a, c) => a + largo(c), 0);
const mono = (s, f) => String(s).length * 0.6 * f * 1.12; // JetBrains Mono maiuscolo con la spaziatura delle lettere
function righeDi(testo, larghezzaEm) {
  let righe = 1, riga = 0;
  for (const p of String(testo).trim().split(/\s+/)) {
    const w = em(p);
    if (riga === 0) riga = w;
    else if (riga + 0.23 + w <= larghezzaEm) riga += 0.23 + w;
    else { righe++; riga = w; }
    if (w > larghezzaEm) return 99;
  }
  return righe;
}

// fNome/fLuogo: etichette accanto agli spilli; legenda: colonna a destra (orizzontale) o righe sotto la mappa (verticale)
const MISURE = {
  orizzontale: { alto: 150, tMax: 84, tMin: 56, tRighe: 1, fNome: 44, fLuogo: 28, minLon: 70, passo: 16, r: 3.4,
    legenda: { dove: 'destra', largo: 560, fNome: 40, fLuogo: 28, spazio: 12 } },
  verticale: { alto: 170, tMax: 88, tMin: 52, tRighe: 2, fNome: 46, fLuogo: 32, minLon: 46, passo: 15, r: 3.2,
    legenda: { dove: 'sotto', fNome: 40, fLuogo: 32, spazio: 12 } },
};
const R_SPILLO = 13; // raggio dello spillo semplice
const R_NUMERO = 19; // raggio dello spillo numerato (legenda)
const VICINI = 34; // spilli semplici più vicini di così non si leggono
const VICINI_N = 26; // spilli numerati: possono quasi toccarsi

// la mappa inquadrata sui luoghi dentro il riquadro A: proiezione, puntini, spilli, archi
function inquadra(A, P, rotte, M) {
  const lons = P.map((p) => p.u), lats = P.map((p) => p.lat);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons), minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const spanLon = maxLon - minLon, spanLat = maxLat - minLat;
  const padLon = Math.max(14, spanLon * 0.14), padLat = Math.max(9, spanLat * (rotte ? 0.32 : 0.18));
  const visLon = Math.max(spanLon + 2 * padLon, M.minLon);
  const visLat = Math.max(spanLat + 2 * padLat, 12);
  let lat0 = (minLat + maxLat) / 2 + (rotte ? spanLat * 0.06 : 0);
  const lon0 = (minLon + maxLon) / 2;
  const f = visLon < 160 ? Math.max(0.55, Math.cos((lat0 * Math.PI) / 180)) : 1;
  const k = Math.min(A.w / (visLon * f), A.h / visLat);
  // niente cielo vuoto oltre i bordi della mappa (lat 80 e -58)
  const mezza = A.h / k / 2;
  if (2 * mezza >= 138) lat0 = 11;
  else lat0 = Math.min(80 - mezza, Math.max(-58 + mezza, lat0));
  const cx = A.x + A.w / 2, cy = A.y + A.h / 2;
  const xy = (lon, lat) => ({ x: cx + (lon - lon0) * k * f, y: cy - (lat - lat0) * k });
  let punti = '';
  const r = M.r;
  for (let y = A.y + M.passo / 2; y < A.y + A.h; y += M.passo) {
    const lat = lat0 - (y - cy) / k;
    for (let x = A.x + M.passo / 2; x < A.x + A.w; x += M.passo) {
      if (terra(lon0 + (x - cx) / (k * f), lat)) punti += `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
    }
  }
  const spilli = P.map((p) => xy(p.u, p.lat));
  // gli archi: curve dal primo luogo verso gli altri, gonfie verso l'alto (come le rotte degli aerei), mai fuori dal riquadro
  const archi = rotte ? spilli.slice(1).map((b) => {
    const a = spilli[0];
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    let nx = -(b.y - a.y) / d, ny = (b.x - a.x) / d;
    if (ny > 0) { nx = -nx; ny = -ny; }
    let gonfio = Math.min(d * 0.22, 160);
    while (gonfio > 0 && my + (ny * gonfio) / 2 < A.y + 10) gonfio -= 10;
    return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${(mx + nx * gonfio).toFixed(1)} ${(my + ny * gonfio).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }) : [];
  return { punti, spilli, archi };
}

const vicini = (spilli, P, min, formato) => {
  const e = [];
  for (let i = 0; i < spilli.length; i++) for (let j = 0; j < i; j++) {
    if (Math.hypot(spilli[i].x - spilli[j].x, spilli[i].y - spilli[j].y) < min) e.push(`«${P[i].luogo}» e «${P[j].luogo}» troppo vicini sulla mappa (${formato})`);
  }
  return e;
};

// tutto quello che serve per disegnare la scena, deciso qui e non nel browser. problemi vuoto = va bene
function impagina(dati, formato = 'orizzontale') {
  const F = formatoDi(formato);
  const M = MISURE[formato === 'verticale' ? 'verticale' : 'orizzontale'];
  const problemi = [];
  const LARGO = F.W - 2 * F.margine;
  const titolo = String(dati.titolo || '').trim();
  let fTitolo = Math.max(M.tMin, Math.min(M.tMax, Math.floor((LARGO * M.tRighe) / Math.max(1, em(titolo)))));
  while (fTitolo > M.tMin && righeDi(titolo, LARGO / fTitolo) > M.tRighe) fTitolo -= 2;
  const righeTitolo = righeDi(titolo, LARGO / fTitolo);
  if (righeTitolo > M.tRighe) problemi.push(`titolo troppo largo (${formato})`);
  const filo = M.alto + Math.round(fTitolo * 1.05 * Math.min(righeTitolo, M.tRighe)) + 22;
  const base = { problemi, titolo, fTitolo, nowrap: M.tRighe === 1, alto: M.alto, filo, LARGO, MARGINE: F.margine };

  // il riquadro di tutta la mappa e i luoghi, con le longitudini «srotolate»: con le rotte intorno al primo luogo (da lì
  // ogni rotta prende la via più corta: San Francisco → Tokyo passa sul Pacifico); senza rotte la mappa di sempre, con
  // l'Europa in mezzo, a meno che girarla non stringa il gruppo di molto (Seattle e Sydney: si guarda il Pacifico)
  const T = { x: F.margine, y: filo + 40, w: LARGO, h: F.fondo - 16 - (filo + 40) };
  const P = (dati.luoghi || []).map((l) => ({ nome: String(l.nome || '').trim(), luogo: String(l.luogo || '').trim(), ...trova(l.luogo) }));
  const rotte = !!dati.rotte && P.length > 1;
  const srotola = (rif) => P.map((p) => rif + ((((p.lon - rif + 540) % 360) + 360) % 360) - 180);
  const largezza = (us) => Math.max(...us) - Math.min(...us);
  let us = rotte ? srotola(P[0].lon) : srotola(0);
  if (!rotte) for (const p of P) {
    const prova = srotola(p.lon);
    if (largezza(prova) < largezza(us) - 60) us = prova;
  }
  P.forEach((p, i) => { p.u = us[i]; });

  // 1) etichette accanto agli spilli: a destra, se no a sinistra, sopra, sotto; mai fuori né sopra altre etichette
  {
    const A = T;
    const m = inquadra(A, P, rotte, M);
    const fN = M.fNome, fL = M.fLuogo;
    const scatole = [];
    let ok = !vicini(m.spilli, P, VICINI, formato).length;
    const etichette = ok ? P.map((p, i) => {
      const w = Math.ceil(Math.max(p.nome ? em(p.nome) * fN : 0, mono(p.luogo, fL)) + 40);
      const h = Math.ceil((p.nome ? fN * 1.12 + 6 : 0) + fL * 1.25 + 22);
      const { x, y } = m.spilli[i];
      const prove = [[x + 28, y - h / 2], [x - 28 - w, y - h / 2], [x - w / 2, y - 30 - h], [x - w / 2, y + 30]];
      const dentro = ([l, t]) => l >= A.x && t >= A.y && l + w <= A.x + A.w && t + h <= A.y + A.h;
      const libero = ([l, t]) => scatole.every((s) => l + w <= s.l || s.l + s.w <= l || t + h <= s.t || s.t + s.h <= t)
        && m.spilli.every((s, j) => j === i || s.x < l - R_SPILLO || s.x > l + w + R_SPILLO || s.y < t - R_SPILLO || s.y > t + h + R_SPILLO);
      const scelta = prove.find((q) => dentro(q) && libero(q));
      if (!scelta) { ok = false; return null; }
      const box = { l: Math.round(scelta[0]), t: Math.round(scelta[1]), w, h, lato: prove.indexOf(scelta) };
      scatole.push(box);
      return { ...box, nome: p.nome, luogo: p.luogo };
    }) : [];
    if (ok) return { ...base, modo: 'accanto', A, ...m, etichette, fN, fL };
  }

  // 2) spilli numerati e legenda
  const G = M.legenda;
  const fN = G.fNome, fL = G.fLuogo;
  let A, righe;
  if (G.dove === 'destra') {
    // colonna a destra: in ogni riga il luogo (mono) sopra il nome (serif)
    A = { x: T.x, y: T.y, w: T.w - G.largo - 32, h: T.h };
    const lx = A.x + A.w + 32;
    const alti = P.map((p) => Math.ceil((p.nome ? fN * 1.12 + 6 : 0) + fL * 1.25 + 22));
    const tot = alti.reduce((a, b) => a + b, 0) + G.spazio * (P.length - 1);
    if (tot > T.h) problemi.push(`legenda troppo alta (${formato})`);
    let y = T.y + Math.max(0, Math.round((T.h - tot) / 2));
    righe = P.map((p, i) => {
      const w = 44 + 18 + Math.ceil(Math.max(p.nome ? em(p.nome) * fN : 0, mono(p.luogo, fL))) + 36;
      if (w > G.largo) problemi.push(`legenda: «${p.nome || p.luogo}» troppo largo (${formato})`);
      const riga = { l: lx, t: y, w: G.largo, h: alti[i], una: false };
      y += alti[i] + G.spazio;
      return riga;
    });
  } else {
    // righe sotto la mappa: luogo e nome sulla stessa riga
    const h = Math.ceil(Math.max(fN * 1.12, fL * 1.25) + 22);
    const tot = P.length * h + G.spazio * (P.length - 1);
    A = { x: T.x, y: T.y, w: T.w, h: T.h - tot - 28 };
    if (A.h < 240) problemi.push(`legenda troppo alta (${formato})`);
    righe = P.map((p, i) => {
      const w = 44 + 18 + Math.ceil(mono(p.luogo, fL) + (p.nome ? 24 + em(p.nome) * fN : 0)) + 36;
      if (w > T.w) problemi.push(`legenda: «${p.nome || p.luogo}» troppo largo (${formato})`);
      return { l: T.x, t: A.y + A.h + 28 + i * (h + G.spazio), w: T.w, h, una: true };
    });
  }
  const m = inquadra(A, P, rotte, M);
  problemi.push(...vicini(m.spilli, P, VICINI_N, formato));
  const etichette = righe.map((r, i) => ({ ...r, lato: 0, nome: P[i].nome, luogo: P[i].luogo }));
  return { ...base, modo: 'legenda', A, ...m, etichette, fN, fL };
}

export default {
  nome: 'mappa',
  descrizione: 'a world map with 1-5 places (cities or countries) where the story happens: where a lab or company is based, where a model or service launches, a data center. Optional routes drawn from the first place to the others. Use it only when ARTICLE names the places',
  schema: `{ "titolo": "Where it comes from, max 32 chars", "luoghi": [{ "luogo": "one of: ${Object.keys(LUOGHI).join(', ')} (or as ARTICLE writes it: US, UK, EU, Bengaluru)", "nome": "who or what is there, e.g. DeepSeek, max 18 chars, optional" }] (1 to 5 places, in the order the voice says them), "rotte": false (true only when something goes from the first place to the others) }`,
  valida(dati) {
    const e = [];
    if (!dati || typeof dati !== 'object') return ['dati mancanti'];
    const t = typeof dati.titolo === 'string' ? dati.titolo.trim() : '';
    if (!t) e.push('titolo mancante o non testo');
    else if (t.length > MAX_TITOLO) e.push(`titolo troppo lungo (${t.length} > ${MAX_TITOLO})`);
    else if (t.split(/\s+/).some((w) => w.length > MAX_PAROLA)) e.push('titolo: parola troppo lunga');
    if (!Array.isArray(dati.luoghi)) e.push('luoghi deve essere un elenco');
    else {
      if (dati.luoghi.length < 1 || dati.luoghi.length > MAX_LUOGHI) e.push(`luoghi: ne servono da 1 a ${MAX_LUOGHI} (sono ${dati.luoghi.length})`);
      const visti = new Set();
      dati.luoghi.forEach((l, i) => {
        if (!l || typeof l !== 'object') { e.push(`luogo ${i + 1} non è un oggetto`); return; }
        const posto = trova(l.luogo);
        if (typeof l.luogo !== 'string' || !l.luogo.trim()) e.push(`luogo ${i + 1} mancante`);
        else if (!posto) e.push(`luogo ${i + 1} «${l.luogo}» non è nell'elenco dei luoghi della mappa`);
        else if (visti.has(posto.chiave)) e.push(`luogo ${i + 1} «${l.luogo}» ripetuto`);
        else visti.add(posto.chiave);
        if (l.nome != null && typeof l.nome !== 'string') e.push(`luogo ${i + 1}: nome non è testo`);
        else if (l.nome && l.nome.trim().length > MAX_NOME) e.push(`luogo ${i + 1}: nome troppo lungo (${l.nome.trim().length} > ${MAX_NOME})`);
      });
    }
    if (dati.rotte != null && typeof dati.rotte !== 'boolean') e.push('rotte deve essere true o false');
    if (dati.rotte === true && Array.isArray(dati.luoghi) && dati.luoghi.length < 2) e.push('rotte: servono almeno 2 luoghi');
    if (dati.quando != null && (typeof dati.quando !== 'object' || Array.isArray(dati.quando))) e.push('quando deve essere un oggetto { chiave: parola }');
    // deve entrare in tutti e due i formati: il piano non sa in quale verrà montato
    if (!e.length) for (const formato of ['orizzontale', 'verticale']) e.push(...impagina(dati, formato).problemi);
    return e;
  },
  // ogni luogo e ogni nome deve stare nella notizia così com'è scritto (parola intera): il controllo generale dei nomi di
  // piano.mjs salta i testi di una parola sola, e «DeepSeek a Pechino» invece che a Hangzhou sarebbe un errore a schermo
  fatti(dati, notizia) {
    const testo = String(notizia ?? '');
    const c = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sta = (s) => new RegExp(`(^|[^\\p{L}\\p{N}])${c(s)}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(testo);
    return (Array.isArray(dati.luoghi) ? dati.luoghi : []).flatMap((l, i) => [l?.luogo, l?.nome]
      .filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()).filter((s) => !sta(s))
      .map((s) => `luogo ${i + 1}: «${s}» non è nella notizia`));
  },
  parole(dati) {
    const luoghi = Array.isArray(dati.luoghi) ? dati.luoghi : [];
    return attacchi(dati, [['titolo', dati.titolo], ...luoghi.map((l, i) => [`l${i + 1}`, [l?.nome, l?.luogo].filter(Boolean).join(' ')])]);
  },
  html({ id, px, dati, durata, t, etichetta, numero, formato = 'orizzontale' }) {
    const L = impagina(dati, formato);
    const { W, H } = formatoDi(formato);
    const n = L.etichette.length;
    const numerati = L.modo === 'legenda';
    const R = numerati ? R_NUMERO : R_SPILLO;
    const tTitolo = t('titolo', 0.15);
    const resto = Math.max(1, durata - 0.8 - (tTitolo + 0.8));
    const tLuoghi = L.etichette.map((_, i) => t(`l${i + 1}`, tTitolo + 0.8 + (resto * i) / n));
    for (let i = 0; i < n; i++) tLuoghi[i] = Math.max(tLuoghi[i], i ? tLuoghi[i - 1] + 0.35 : tTitolo + 0.3);
    const { A, MARGINE, LARGO } = L;
    const css = `
    #${px}titolo { position: absolute; left: ${MARGINE}px; top: ${L.alto}px; width: ${LARGO}px; font-weight: 500; font-size: ${L.fTitolo}px;
      line-height: 1.05; letter-spacing: -0.02em; font-variation-settings: "opsz" 60; ${L.nowrap ? 'white-space: nowrap;' : 'text-wrap: balance;'} color: ${C.crema}; }
    #${px}filo { position: absolute; left: ${MARGINE}px; top: ${L.filo}px; width: 240px; height: 4px; background: ${C.accento}; transform-origin: left center; }
    #${px}riquadro { position: absolute; left: ${A.x}px; top: ${A.y}px; width: ${A.w}px; height: ${A.h}px; background: ${C.fondo}; border-radius: 12px; }
    #${px}disegno { position: absolute; left: 0; top: 0; overflow: visible; }
    .${px}spillo { position: absolute; width: ${2 * R}px; height: ${2 * R}px; margin: ${-R}px 0 0 ${-R}px; border-radius: 50%; box-sizing: border-box;
      background: ${C.accento}; box-shadow: 0 0 0 4px ${C.fondo}; display: flex; align-items: center; justify-content: center;
      font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 24px; color: ${C.inchiostro}; }
    .${px}onda { position: absolute; width: ${2 * R}px; height: ${2 * R}px; margin: ${-R}px 0 0 ${-R}px; border-radius: 50%;
      border: 3px solid ${C.accento}; box-sizing: border-box; opacity: 0; }
    .${px}etichetta { position: absolute; box-sizing: border-box; padding: 11px 18px; background: ${C.scuro}; border-left: 4px solid ${C.accento}; border-radius: 6px; white-space: nowrap; }
    .${px}riga { display: flex; align-items: center; gap: 18px; }
    .${px}una { display: flex; align-items: baseline; gap: 24px; }
    .${px}cifra { flex: none; width: 44px; height: 44px; border-radius: 50%; background: ${C.accento}; color: ${C.inchiostro}; display: flex; align-items: center; justify-content: center;
      font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 24px; align-self: center; }
    .${px}luogo { font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: ${L.fL}px; line-height: 1.25; letter-spacing: 0.08em; text-transform: uppercase; color: ${C.accento}; }
    .${px}nome { font-weight: 500; font-size: ${L.fN}px; line-height: 1.12; letter-spacing: -0.01em; color: ${C.crema}; }
    .${px}etichetta .${px}nome { margin-top: 6px; }
    .${px}una .${px}nome { margin-top: 0; }`;
    const archi = L.archi.map((d, i) => `<path id="${px}a${i + 2}" d="${d}" pathLength="1" fill="none" stroke="${C.accento}" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 1" stroke-dashoffset="1"/>`).join('');
    const spilli = L.spilli.map((s, i) => `
      <div class="${px}onda" id="${px}o${i + 1}" style="left:${s.x.toFixed(1)}px;top:${s.y.toFixed(1)}px"></div>
      <div class="${px}spillo" id="${px}p${i + 1}" style="left:${s.x.toFixed(1)}px;top:${s.y.toFixed(1)}px">${numerati ? i + 1 : ''}</div>`).join('');
    const testo = (e) => `<div class="${px}luogo">${esc(e.luogo)}</div>${e.nome ? `<div class="${px}nome">${esc(e.nome)}</div>` : ''}`;
    const etichette = L.etichette.map((e, i) => `
      <div class="${px}etichetta" id="${px}e${i + 1}" style="left:${e.l}px;top:${e.t}px;width:${e.w}px${numerati ? `;height:${e.h}px;display:flex;align-items:center` : ''}">${!numerati ? testo(e)
        : `<div class="${px}riga"><div class="${px}cifra">${i + 1}</div><div class="${e.una ? `${px}una` : ''}">${testo(e)}</div></div>`}
      </div>`).join('');
    const corpo = `
      <div id="${px}titolo">${esc(L.titolo)}</div>
      <div id="${px}filo"></div>
      <div id="${px}mappa">
        <div id="${px}riquadro"></div>
        <svg id="${px}disegno" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
          <path d="${L.punti}" fill="${C.crema2}" fill-opacity="0.3"/>${archi}
        </svg>${spilli}
      </div>${etichette}`;
    let anima = `
      tl.fromTo(q("#${px}mappa"), { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "power2.out" }, 0.1);
      tl.fromTo(q("#${px}titolo"), { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, ${s3(tTitolo)});
      tl.fromTo(q("#${px}filo"), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: "expo.out" }, ${s3(tTitolo + 0.25)});`;
    // da dove entra l'etichetta: dal lato dello spillo (la legenda entra da sinistra)
    const da = [{ x: -18, y: 0 }, { x: 18, y: 0 }, { x: 0, y: 18 }, { x: 0, y: -18 }];
    tLuoghi.forEach((tl0, i) => {
      const k = i + 1;
      const arco = i > 0 && L.archi.length;
      if (arco) anima += `
      tl.fromTo(q("#${px}a${k}"), { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.9, ease: "power2.inOut" }, ${s3(Math.max(0, tl0 - 0.1))});`;
      const tp = arco ? tl0 + 0.65 : tl0;
      const d = da[L.etichette[i].lato] || da[0];
      // l'onda si accende e si allarga una volta sola; il secondo pezzo non si disegna prima del suo tempo
      // (immediateRender: false) e tornando indietro nel tempo vince il primo, che la rimette invisibile
      anima += `
      tl.fromTo(q("#${px}p${k}"), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "expo.out" }, ${s3(tp)});
      tl.fromTo(q("#${px}o${k}"), { scale: 1, opacity: 0 }, { scale: 1.3, opacity: 0.9, duration: 0.12, ease: "none" }, ${s3(tp + 0.05)});
      tl.fromTo(q("#${px}o${k}"), { scale: 1.3, opacity: 0.9 }, { scale: 3.4, opacity: 0, duration: 1.2, ease: "power2.out", immediateRender: false }, ${s3(tp + 0.17)});
      tl.fromTo(q("#${px}e${k}"), { opacity: 0, x: ${d.x}, y: ${d.y} }, { opacity: 1, x: 0, y: 0, duration: 0.6, ease: "power3.out" }, ${s3(numerati ? tl0 : tp + 0.12)});`;
    });
    return scena({ id, px, durata, etichetta, numero, css, corpo, anima, formato });
  },
};
