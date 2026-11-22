// Che cosa conta come «gratis» su FreeLLMArena: UNA regola per sito, blog, video e Top 10.
// Marco, 22/11/2026: «Contale come gratis [le API gratuite e le prove] ma spiegalo che sono api e non sono per sempre e
// spiega la differenza». Prima la regola era copiata in 13 posti e valeva solo pesi aperti + API gratis di OpenRouter:
// Qwen3.8-Max (prova di Alibaba) e Gemini 3.8 Flash (API gratis di Google) restavano fuori dalla classifica ma dentro le
// pagine dei modelli e dei confronti.
//
// Tre tipi di gratis, dal più solido al più fragile:
//   aperto: pesi aperti, si scarica e gira sul proprio computer; gratis per sempre, limiti solo dell'hardware;
//   api:    API gratis online (OpenRouter «:free», Free Tier di Google): limiti giornalieri, il fornitore può cambiarla
//           o chiuderla quando vuole, le domande passano dai suoi server;
//   prova:  credito di prova per i nuovi account (Alibaba Model Studio: circa 1 milione di token per 90 giorni), poi si paga.
// m.api viene da sito/data.json (script/costruisci-dati.mjs); finché i dati non lo hanno si calcola dal nome.
import { apiGratisPer } from './cf-modelli.mjs';

const apiDi = (m) => (m.api !== undefined ? m.api : apiGratisPer(m.nome));

export function tipoGratis(m) {
  if (!m) return null;
  if (m.aperto) return 'aperto';
  if (m.or?.gratis) return 'api';
  const api = apiDi(m);
  if (api?.tipo === 'free tier') return 'api';
  if (api?.tipo === 'trial') return 'prova';
  return null;
}
export const gratis = (m) => tipoGratis(m) !== null;

// etichette corte (classifiche, video) e spiegazioni (sito, descrizioni dei video), in inglese come il sito
export const ETICHETTA = { aperto: 'open weights', api: 'free API', prova: 'free trial' };
export const SPIEGA = {
  aperto: 'Open weights: you download the model and run it on your own computer. Free forever, the only limit is your hardware, and your data never leaves your machine.',
  api: 'Free API: you use the model online through a free tier (OpenRouter or the lab itself, like Google). There are daily limits, the provider can change or end the free tier at any time, and your prompts go to their servers.',
  prova: 'Free trial: new accounts get free credit, for example about 1 million tokens for 90 days on Alibaba Cloud. After that you pay.',
};
// una riga sola, per le descrizioni dei video e le note sotto le classifiche
export const SPIEGA_BREVE = 'Three kinds of free: open weights run on your own computer, free forever. Free APIs work online with daily limits and can end at any time. Free trials give new accounts credit for a few months, then you pay.';
// che cosa dice di un modello, con le parole di ETICHETTA (per la voce e le schede dei video)
export const etichetta = (m) => ETICHETTA[tipoGratis(m)] || '';
