// Stampo «cartello» (carta, 12/11/2026): apertura che ferma lo scorrimento. Un cartello ottagonale («WAIT») entra come un
// adesivo, poi una parola o un numero cade a tessere colorate come in una lettera ritagliata, con i coriandoli; sotto una
// striscia scura dice cos'è. Dalla prova dei movimenti del video EarnixLab iO2sNuzaCxU (Marco: «Sì, fai gli stampi»).
import { scena, s3, esc, attacchi, CARTA, coriandoli } from '../base.mjs';

const TESSERE = [[CARTA.inchiostro, '#f4efe4'], [CARTA.giallo, CARTA.inchiostro], ['#f4efe4', CARTA.inchiostro], [CARTA.verde, '#f4efe4'], [CARTA.rosa, '#f4efe4'], [CARTA.blu, '#f4efe4']];
const STORTO = [-6, 4, -2, 7, -4, 3];

export default {
  nome: 'cartello',
  descrizione: 'paper-cutout opener: a stop sign sticker, then one short word or number dropping in as colored ransom-note tiles with confetti, and a dark strip saying what it is; use to open a news video with one striking number or word',
  schema: '{ "segnale": "word on the stop sign, max 8, e.g. WAIT", "parola": "the big word or number, 2-6 characters, no spaces, e.g. 1,000 or FREE", "striscia": "what it is, max 26, e.g. questions in one go" }',
  valida(d) {
    const e = [];
    const tx = (k) => (d?.[k] == null ? '' : String(d[k]).trim());
    if (!tx('segnale')) e.push('segnale mancante');
    else if (tx('segnale').length > 8) e.push(`segnale oltre 8 caratteri: «${tx('segnale')}»`);
    const p = tx('parola');
    if (p.length < 2 || p.length > 6) e.push(`parola fra 2 e 6 caratteri: «${p}»`);
    else if (/\s/.test(p)) e.push('parola senza spazi');
    if (!tx('striscia')) e.push('striscia mancante');
    else if (tx('striscia').length > 26) e.push(`striscia oltre 26 caratteri (${tx('striscia').length})`);
    for (const k of ['segnale', 'parola', 'striscia']) if (d?.[k] != null && typeof d[k] !== 'string') e.push(`${k} deve essere un testo`);
    return e;
  },
  parole(d) {
    return attacchi(d, [['parola', d.parola], ['striscia', d.striscia]]);
  },
  html({ id, px, dati, durata, t, etichetta, numero, formato = 'orizzontale' }) {
    const V = formato === 'verticale';
    const segnale = String(dati.segnale).trim().toUpperCase(), parola = String(dati.parola).trim(), striscia = String(dati.striscia).trim();
    const n = parola.length;
    // geometria: in orizzontale cartello a sinistra e tessere a destra; in verticale tutto impilato al centro
    const lato = V ? 300 : 300;
    const sx = V ? 540 - lato / 2 : 230, sy = V ? 190 : 250;
    const spazio = V ? 14 : 18;
    const larghezzaTessere = V ? 1080 - 2 * 72 : 1920 - 680 - 120;
    const wT = Math.min(V ? 200 : 190, Math.floor((larghezzaTessere - (n - 1) * spazio) / n));
    const hT = Math.round(wT * 1.24);
    const totT = n * wT + (n - 1) * spazio;
    const tx0 = V ? Math.round(540 - totT / 2) : 680 + Math.round((larghezzaTessere - totT) / 2);
    const ty0 = V ? 600 : 270;
    const fsS = Math.min(68, Math.floor((lato - 70) / (segnale.length * 0.62)));
    const fsStr = V ? 44 : 44;
    const strY = ty0 + hT + (V ? 90 : 70);
    const cx = tx0 + totT / 2, cy = ty0 + hT / 2;
    const cf = coriandoli(px, 24, 0x2f6e2b1 ^ n, { raggio: V ? 380 : 320 });

    const tP = Math.max(0.9, t('parola', durata * 0.3));
    const tS = Math.max(tP + 0.8, t('striscia', durata * 0.6));
    const fine = Math.max(0, durata - 0.6);
    const tempo = (x) => s3(Math.min(x, fine));

    const ott = 'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)';
    const css = `
    .${px}ombra { filter: ${CARTA.ombra}; }
    #${px}stop { position: absolute; left: ${sx}px; top: ${sy}px; width: ${lato}px; height: ${lato}px; }
    #${px}stop .${px}o1 { position: absolute; inset: 0; background: ${CARTA.bordo}; clip-path: ${ott}; }
    #${px}stop .${px}o2 { position: absolute; inset: 12px; background: ${CARTA.rosso}; clip-path: ${ott}; display: flex; align-items: center; justify-content: center;
      color: ${CARTA.bordo}; font-family: "Inter", sans-serif; font-weight: 700; font-size: ${fsS}px; letter-spacing: 0.02em; }
    .${px}tes { position: absolute; top: ${ty0}px; width: ${wT}px; height: ${hT}px; display: flex; align-items: center; justify-content: center;
      font-family: "Inter", sans-serif; font-weight: 700; font-size: ${Math.round(wT * 0.82)}px; border: 6px solid ${CARTA.bordo}; }
    #${px}str { position: absolute; left: 0; width: ${V ? 1080 : 1920}px; top: ${strY}px; display: flex; justify-content: center; }
    #${px}str span { background: ${CARTA.inchiostro}; color: #f4efe4; font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: ${fsStr}px;
      padding: 18px 34px; letter-spacing: 0.08em; text-transform: uppercase; transform: rotate(-2deg); white-space: nowrap; }
    #${px}botta { position: absolute; left: ${Math.round(cx)}px; top: ${Math.round(cy)}px; }
    ${cf.css}`;
    const tessere = [...parola].map((ch, i) => {
      const [bg, fg] = TESSERE[i % TESSERE.length];
      return `<div class="${px}tes ${px}ombra" id="${px}t${i}" style="left:${tx0 + i * (wT + spazio)}px;background:${bg};color:${fg};transform:rotate(${STORTO[i % 6]}deg)">${esc(ch)}</div>`;
    }).join('');
    const corpo = `
      <div id="${px}stop" class="${px}ombra"><div class="${px}o1"></div><div class="${px}o2">${esc(segnale)}</div></div>
      ${tessere}
      <div id="${px}botta">${cf.html}</div>
      <div id="${px}str"><span class="${px}ombra">${esc(striscia)}</span></div>`;
    const anima = `
      tl.fromTo(q("#${px}stop"), { scale: 0, rotation: -40 }, { scale: 1, rotation: -8, duration: 0.55, ease: "back.out(2.2)" }, 0.15);
      ${[...parola].map((_, i) => `tl.fromTo(q("#${px}t${i}"), { y: -320, opacity: 0, scale: 1.3 }, { y: 0, opacity: 1, scale: 1, rotation: ${STORTO[i % 6]}, duration: 0.42, ease: "back.out(1.8)" }, ${tempo(tP + i * 0.12)});`).join('\n      ')}
      ${cf.anima(tempo(tP + n * 0.12 + 0.2))}
      tl.fromTo(q("#${px}str span"), { x: ${V ? -700 : -1100}, rotation: -12, opacity: 0 }, { x: 0, rotation: -2, opacity: 1, duration: 0.6, ease: "power3.out" }, ${tempo(tS)});`;
    return scena({ id, px, durata, etichetta, numero, css, corpo, anima, formato: V ? 'verticale' : 'orizzontale', carta: true });
  },
};
