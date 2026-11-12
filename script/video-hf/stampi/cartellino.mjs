// Stampo «cartellino» (carta, 12/11/2026): un cartellino del prezzo scende appeso a un filo e dondola fino a fermarsi;
// quando la voce lo nomina, un timbro rosso cala sopra («FREE») e il cartellino trema. Per prezzi, costi, «gratis».
// Dalla prova dei movimenti del video EarnixLab iO2sNuzaCxU (Marco: «Sì, fai gli stampi»).
import { scena, s3, esc, misura, attacchi, CARTA } from '../base.mjs';

export default {
  nome: 'cartellino',
  descrizione: 'paper price tag swinging on a string, then a red rubber stamp slams on it; use for a price, a cost or something free (e.g. $0.10 per 1M input tokens, stamp FREE)',
  schema: '{ "prezzo": "the price, max 7, e.g. $0.10 or $0 or 20 €", "sotto": "what the price is for, max 22, e.g. per 1M input tokens", "timbro": "a verdict stamp, max 8, e.g. FREE, CHEAP, HALF OFF; never the word PRICE", "timbroSopra": "optional small word above the stamp, max 10, e.g. OUTPUT" }',
  valida(d) {
    const e = [];
    const tx = (k) => (d?.[k] == null ? '' : String(d[k]).trim());
    for (const [k, max, obbl] of [['prezzo', 7, true], ['sotto', 22, true], ['timbro', 8, true], ['timbroSopra', 10, false]]) {
      if (d?.[k] != null && typeof d[k] !== 'string') e.push(`${k} deve essere un testo`);
      else if (obbl && !tx(k)) e.push(`${k} mancante`);
      else if (tx(k).length > max) e.push(`${k} oltre ${max} caratteri`);
    }
    if (tx('prezzo') && !/\d/.test(tx('prezzo'))) e.push('prezzo senza cifre');
    return e;
  },
  parole(d) {
    return attacchi(d, [['timbro', d.timbro]]);
  },
  html({ id, px, dati, durata, t, etichetta, numero, formato = 'orizzontale' }) {
    const V = formato === 'verticale';
    const tx = (k) => (dati[k] == null ? '' : String(dati[k]).trim());
    const prezzo = tx('prezzo'), sotto = tx('sotto').toUpperCase(), timbro = tx('timbro').toUpperCase(), timbroSopra = tx('timbroSopra').toUpperCase();
    const W = V ? 800 : 660, H = V ? 400 : 340;
    const X = (V ? 540 : 960) - W / 2, Y = V ? 380 : 300;
    const fsP = misura(prezzo, { larghezza: W - 120, max: V ? 200 : 170, min: 80, fattore: 0.6 });
    const fsSotto = misura(sotto, { larghezza: W - 100, max: V ? 40 : 34, min: 28, fattore: 0.62 });
    const fsT = V ? 104 : 92;
    const xT = V ? null : X + W - 120, yT = V ? Y + H + 130 : Y + H - 10;

    const fine = Math.max(0, durata - 0.6);
    const tempo = (x) => s3(Math.min(x, fine));
    const tT = Math.max(2.4, t('timbro', durata * 0.65));

    const css = `
    #${px}appeso { position: absolute; inset: 0; }
    #${px}filo { position: absolute; left: ${X + W / 2 - 2}px; top: 0; width: 4px; height: ${Y + 46}px; background: ${CARTA.filo}; }
    #${px}tag { position: absolute; left: ${X}px; top: ${Y}px; width: ${W}px; height: ${H}px; transform-origin: ${W / 2}px 46px; filter: ${CARTA.ombra}; }
    #${px}corpo { position: absolute; inset: 0; background: ${CARTA.giallo}; clip-path: polygon(16% 0,84% 0,100% 22%,100% 100%,0 100%,0 22%);
      display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 40px; color: ${CARTA.inchiostro}; }
    #${px}buco { position: absolute; left: ${W / 2 - 18}px; top: 28px; width: 36px; height: 36px; border-radius: 50%; background: #c9b48c; border: 5px solid ${CARTA.bordo}; }
    #${px}prezzo { font-family: "Inter", sans-serif; font-weight: 700; font-size: ${fsP}px; line-height: 1; white-space: nowrap; }
    #${px}sotto { margin-top: 10px; font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: ${fsSotto}px; letter-spacing: 0.04em; white-space: nowrap; }
    #${px}timbro { position: absolute; ${V ? 'left: 0; width: 1080px; display: flex; justify-content: center;' : `left: ${xT}px;`} top: ${yT}px; }
    #${px}timbro div { padding: 16px 40px; border: 10px solid ${CARTA.rosso}; color: ${CARTA.rosso}; border-radius: 14px; font-family: "Inter", sans-serif; font-weight: 700;
      font-size: ${fsT}px; line-height: 1; letter-spacing: 0.04em; text-align: center; white-space: nowrap; transform: rotate(-12deg); }
    #${px}timbro small { display: block; font-family: "JetBrains Mono", monospace; font-size: ${V ? 38 : 34}px; letter-spacing: 0.2em; margin-bottom: 6px; }`;
    const corpo = `
      <div id="${px}appeso"><div id="${px}filo"></div>
        <div id="${px}tag"><div id="${px}corpo"><div id="${px}prezzo">${esc(prezzo)}</div><div id="${px}sotto">${esc(sotto)}</div></div><div id="${px}buco"></div></div>
      </div>
      <div id="${px}timbro"><div id="${px}tdiv">${timbroSopra ? `<small>${esc(timbroSopra)}</small>` : ''}${esc(timbro)}</div></div>`;
    const anima = `
      tl.fromTo(q("#${px}appeso"), { y: -${Y + H + 100} }, { y: 0, duration: 0.7, ease: "power2.out" }, 0.1);
      tl.fromTo(q("#${px}tag"), { rotation: 26 }, { rotation: -14, duration: 0.5, ease: "sine.inOut" }, 0.6);
      tl.to(q("#${px}tag"), { rotation: 8, duration: 0.5, ease: "sine.inOut" }, 1.1);
      tl.to(q("#${px}tag"), { rotation: -4, duration: 0.45, ease: "sine.inOut" }, 1.6);
      tl.to(q("#${px}tag"), { rotation: 0, duration: 0.45, ease: "sine.inOut" }, 2.05);
      tl.fromTo(q("#${px}tdiv"), { scale: 2.6, opacity: 0, rotation: 4 }, { scale: 1, opacity: 1, rotation: -12, duration: 0.22, ease: "power4.in" }, ${tempo(tT)});
      [8, -6, 4, 0].forEach((x, i) => tl.to(q("#${px}tag"), { x, duration: 0.05, ease: "none" }, ${tempo(tT + 0.22)} + i * 0.05));`;
    return scena({ id, px, durata, etichetta, numero, css, corpo, anima, formato: V ? 'verticale' : 'orizzontale', carta: true });
  },
};
