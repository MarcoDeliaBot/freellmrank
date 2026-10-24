// Stampo «chiusura»: le due promesse del sito, il marchio FreeLLMArena che si compone, l'indirizzo e «link in the description».
// Testo e voce fissi: è l'ultima scena di ogni video (dalla prova DeepInfer del 24/10/2026, quadro 6).
// Negli Short (verticale) dice «link in bio»; con dati.invito = 'canale' (Short delle notizie) rimanda prima al video lungo.
import { C, scena, s3 } from '../base.mjs';

const VOCE_ORIZZONTALE = 'For AI news every day, and to compare every free AI model, visit FreeLLMArena. The link is in the description.';
const VOCE_BIO = 'Find it all on FreeLLMArena. Link in bio.';
const VOCE_CANALE = 'Watch the full story on our channel. Find it all on FreeLLMArena. Link in bio.';

export default {
  nome: 'chiusura',
  descrizione: 'closing card, always the last scene; no data',
  voceFissa: (dati = {}, formato = 'orizzontale') => (formato !== 'verticale' ? VOCE_ORIZZONTALE : dati.invito === 'canale' ? VOCE_CANALE : VOCE_BIO),
  valida: (dati = {}) => (dati.invito && !['canale', 'bio'].includes(dati.invito) ? ['invito: «canale» o «bio»'] : []),
  parole: (dati = {}, formato = 'orizzontale') => (formato !== 'verticale'
    ? [{ chiave: 'riga1', parola: 'news' }, { chiave: 'riga2', parola: 'compare' }, { chiave: 'marchio', parola: 'visit' }, { chiave: 'link', parola: 'link' }]
    : [...(dati.invito === 'canale' ? [{ chiave: 'canale', parola: 'channel' }] : []), { chiave: 'marchio', parola: 'FreeLLMArena' }, { chiave: 'bio', parola: 'bio' }]),
  html(arg) {
    if (arg.formato === 'verticale') return verticale(arg);
    const { id, px, durata, t, etichetta, numero } = arg;
    const r1 = t('riga1', 0.15), r2 = t('riga2', durata * 0.25), m = t('marchio', durata * 0.5);
    // l'ultima riga deve restare a schermo almeno 2 secondi
    const l = Math.min(t('link', durata * 0.72), durata - 2.3);
    const css = `
    #${px}alone { position: absolute; left: 50%; top: 42%; width: 1500px; height: 845px; margin-left: -750px; margin-top: -422px; border-radius: 50%;
      background: radial-gradient(closest-side, rgba(47,158,104,0.85), rgba(47,158,104,0) 100%); opacity: 0; }
    #${px}promesse { position: absolute; left: 0; right: 0; top: 27%; text-align: center; transform-origin: 50% 0%; }
    .${px}linea { display: block; font-weight: 500; font-size: 96px; line-height: 1.12; letter-spacing: -0.02em; font-variation-settings: "opsz" 60; white-space: nowrap; }
    .${px}linea1 { color: ${C.crema}; } .${px}linea2 { color: ${C.crema2}; }
    .${px}parola { display: inline-block; margin: 0 0.12em; }
    #${px}marchio { position: absolute; left: 0; right: 0; top: 42%; height: 0; display: flex; justify-content: center; align-items: center;
      font-weight: 500; font-size: 221px; line-height: 0.92; letter-spacing: -0.02em; font-variation-settings: "opsz" 60; white-space: nowrap; }
    #${px}m1 { display: inline-block; color: ${C.crema}; } #${px}m2 { display: inline-block; color: ${C.accento}; }
    #${px}riga { position: absolute; left: 50%; top: 54.5%; width: 576px; margin-left: -288px; height: 2px; background: ${C.accento}; }
    #${px}indirizzo-box { position: absolute; left: 0; right: 0; top: 59%; display: flex; justify-content: center; }
    #${px}indirizzo { border: 2px solid ${C.accento}; border-radius: 8px; padding: 13px 42px 16px; font-weight: 500; font-size: 61px; line-height: 1; color: ${C.crema}; }
    #${px}link { position: absolute; left: 0; right: 0; top: 71%; display: flex; justify-content: center; align-items: center; gap: 17px;
      font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 30px; letter-spacing: 0.16em; text-transform: uppercase; color: ${C.crema2}; }`;
    const parole = (testo, n) => testo.split(' ').map((w) => `<span class="${px}parola ${px}w${n}">${w}</span>`).join('');
    const corpo = `
      <div id="${px}alone"></div>
      <div id="${px}promesse"><span class="${px}linea ${px}linea1">${parole('AI news every day', 1)}</span><span class="${px}linea ${px}linea2">${parole('Compare every free AI model', 2)}</span></div>
      <div id="${px}marchio"><span id="${px}m1">FreeLLM</span><span id="${px}m2">Arena</span></div>
      <div id="${px}riga"></div>
      <div id="${px}indirizzo-box"><div id="${px}indirizzo">freellmarena.com</div></div>
      <div id="${px}link"><span>link in the description</span><svg width="26" height="34" viewBox="0 0 26 34" fill="none"><path d="M13 2 V30" stroke="${C.accento}" stroke-width="2.5" stroke-linecap="round"/><path d="M3 21 L13 31 L23 21" stroke="${C.accento}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
    const anima = `
      tl.fromTo(qa(".${px}w1"), { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.14 }, ${s3(r1)});
      tl.fromTo(qa(".${px}w2"), { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.12 }, ${s3(r2)});
      tl.fromTo(q("#${px}promesse"), { y: 0, scale: 1 }, { y: -95, scale: 0.45, duration: 0.95, ease: "power3.inOut" }, ${s3(m - 0.15)});
      tl.fromTo(q("#${px}m1"), { x: -560, opacity: 0, filter: "blur(10px)" }, { x: 0, opacity: 1, filter: "blur(0px)", duration: 1.1, ease: "power3.out" }, ${s3(m)});
      tl.fromTo(q("#${px}m2"), { x: 560, opacity: 0, filter: "blur(10px)" }, { x: 0, opacity: 1, filter: "blur(0px)", duration: 1.1, ease: "power3.out" }, ${s3(m)});
      tl.fromTo(q("#${px}alone"), { opacity: 0, scale: 0.85 }, { opacity: 0.26, scale: 1, duration: 1.05, ease: "power2.out" }, ${s3(m + 0.05)});
      tl.fromTo(q("#${px}riga"), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power3.out" }, ${s3(l - 0.4)});
      tl.fromTo(q("#${px}indirizzo"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, ${s3(l - 0.3)});
      tl.fromTo(q("#${px}link"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, ${s3(l)});`;
    return scena({ id, px, durata, etichetta, numero, css, corpo, anima, ultima: true });
  },
};

// Short: in alto «Full story / on our channel» (solo con invito «canale»), poi il marchio, l'indirizzo e «Link in bio ↑»
function verticale({ id, px, durata, t, etichetta, numero, dati = {} }) {
  const canale = dati.invito === 'canale';
  const m = t('marchio', canale ? durata * 0.45 : 0.2);
  const b = Math.min(t('bio', durata * 0.7), durata - 1.6);
  const c = t('canale', 0.3);
  const y = canale ? 80 : 0;
  const css = `
    #${px}alone { position: absolute; left: 50%; top: 38%; width: 1000px; height: 1000px; margin-left: -500px; margin-top: -500px; border-radius: 50%;
      background: radial-gradient(closest-side, rgba(47,158,104,0.85), rgba(47,158,104,0) 100%); opacity: 0; }
    #${px}canale { position: absolute; left: 0; right: 0; top: 260px; text-align: center; }
    .${px}linea { display: block; font-weight: 500; font-size: 88px; line-height: 1.1; letter-spacing: -0.02em; font-variation-settings: "opsz" 60; }
    .${px}linea2 { color: ${C.accento}; }
    #${px}marchio { position: absolute; left: 0; right: 0; top: ${560 + y}px; display: flex; justify-content: center;
      font-weight: 500; font-size: 150px; line-height: 0.92; letter-spacing: -0.02em; font-variation-settings: "opsz" 60; white-space: nowrap; }
    #${px}m1 { display: inline-block; color: ${C.crema}; } #${px}m2 { display: inline-block; color: ${C.accento}; }
    #${px}riga { position: absolute; left: 50%; top: ${740 + y}px; width: 480px; margin-left: -240px; height: 2px; background: ${C.accento}; }
    #${px}indirizzo-box { position: absolute; left: 0; right: 0; top: ${790 + y}px; display: flex; justify-content: center; }
    #${px}indirizzo { border: 2px solid ${C.accento}; border-radius: 8px; padding: 14px 40px 17px; font-weight: 500; font-size: 64px; line-height: 1; color: ${C.crema}; }
    #${px}bio { position: absolute; left: 0; right: 0; top: ${950 + y}px; display: flex; justify-content: center; align-items: center; gap: 18px;
      font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 44px; letter-spacing: 0.14em; text-transform: uppercase; color: ${C.crema2}; }`;
  const corpo = `
      <div id="${px}alone"></div>
      ${canale ? `<div id="${px}canale"><span class="${px}linea" id="${px}c1">Full story</span><span class="${px}linea ${px}linea2" id="${px}c2">on our channel</span></div>` : ''}
      <div id="${px}marchio"><span id="${px}m1">FreeLLM</span><span id="${px}m2">Arena</span></div>
      <div id="${px}riga"></div>
      <div id="${px}indirizzo-box"><div id="${px}indirizzo">freellmarena.com</div></div>
      <div id="${px}bio"><span>Link in bio</span><svg width="30" height="40" viewBox="0 0 26 34" fill="none"><path d="M13 32 V4" stroke="${C.accento}" stroke-width="2.5" stroke-linecap="round"/><path d="M3 13 L13 3 L23 13" stroke="${C.accento}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
  const anima = `
      ${canale ? `tl.fromTo(q("#${px}c1"), { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, ${s3(Math.min(c, 0.4))});
      tl.fromTo(q("#${px}c2"), { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, ${s3(Math.max(c, 0.6))});` : ''}
      tl.fromTo(q("#${px}m1"), { x: -420, opacity: 0, filter: "blur(10px)" }, { x: 0, opacity: 1, filter: "blur(0px)", duration: 1.0, ease: "power3.out" }, ${s3(m)});
      tl.fromTo(q("#${px}m2"), { x: 420, opacity: 0, filter: "blur(10px)" }, { x: 0, opacity: 1, filter: "blur(0px)", duration: 1.0, ease: "power3.out" }, ${s3(m)});
      tl.fromTo(q("#${px}alone"), { opacity: 0, scale: 0.85 }, { opacity: 0.26, scale: 1, duration: 1.0, ease: "power2.out" }, ${s3(m + 0.05)});
      tl.fromTo(q("#${px}riga"), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power3.out" }, ${s3(m + 0.6)});
      tl.fromTo(q("#${px}indirizzo"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, ${s3(m + 0.7)});
      tl.fromTo(q("#${px}bio"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, ${s3(b)});`;
  return scena({ id, px, durata, etichetta, numero, css, corpo, anima, ultima: true, formato: 'verticale' });
}
