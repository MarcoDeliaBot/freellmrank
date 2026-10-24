// Modelli che il visitatore prova senza account, su Cloudflare Workers AI (quota gratis del sito).
// arena: i nomi Arena della pagina del modello · pin/pout: dollari per milione di token (listino Cloudflare, 19/10/2026)
// max: token massimi della risposta · extra: opzioni per spegnere il "ragionamento", che consuma token
// Lo usano sia la build (quali pagine hanno il riquadro) sia functions/api/try.js (il tetto giornaliero).
export const CF_MODELLI = [
  { arena: ['glm-5.3-flash'], id: '@cf/zai-org/glm-5.3-flash', pin: 0.15, pout: 0.5, max: 700, extra: { thinking: { type: 'disabled' } } },
  { arena: ['glm-4.7-flash'], id: '@cf/zai-org/glm-4.7-flash', pin: 0.0605, pout: 0.4, max: 700, extra: { thinking: { type: 'disabled' } } },
  { arena: ['kimi-k2.6'], id: '@cf/moonshotai/kimi-k2.6', pin: 0.95, pout: 4, max: 450, extra: { chat_template_kwargs: { thinking: false } } },
  { arena: ['deepseek-v4-flash'], id: '@cf/deepseek-ai/deepseek-v4-flash-0731', pin: 0.44, pout: 1.32, max: 600, extra: { chat_template_kwargs: { thinking: false } } },
  { arena: ['deepseek-v4-pro'], id: '@cf/deepseek-ai/deepseek-v4-pro-0813', pin: 1.32, pout: 3.96, max: 450, extra: { chat_template_kwargs: { thinking: false } } },
  { arena: ['gpt-oss-120b'], id: '@cf/openai/gpt-oss-120b', pin: 0.35, pout: 0.75, max: 700, extra: { reasoning_effort: 'low' } },
  { arena: ['gpt-oss-20b'], id: '@cf/openai/gpt-oss-20b', pin: 0.2, pout: 0.3, max: 700, extra: { reasoning_effort: 'low' } },
  { arena: ['gemma-4-26b-a4b'], id: '@cf/google/gemma-4-26b-a4b-it', pin: 0.1, pout: 0.3, max: 600, extra: { chat_template_kwargs: { enable_thinking: false } } },
  { arena: ['qwen3.8-27b'], id: '@cf/qwen/qwen3.8-27b', pin: 0.45, pout: 3.2, max: 450, extra: { chat_template_kwargs: { enable_thinking: false } } },
  // qwen3-30b: col ragionamento spento la risposta finisce nel campo sbagliato; acceso costa poco
  { arena: ['qwen3-30b-a3b'], id: '@cf/qwen/qwen3-30b-a3b-fp8', pin: 0.0509, pout: 0.335, max: 1400 },
  { arena: ['llama-4-scout-17b-16e-instruct'], id: '@cf/meta/llama-4-scout-17b-16e-instruct', pin: 0.27, pout: 0.85, max: 600 },
  { arena: ['mistral-small-3.1-24b-instruct-2503'], id: '@cf/mistralai/mistral-small-3.1-24b-instruct', pin: 0.351, pout: 0.555, max: 600 },
  { arena: ['llama-3.3-70b-instruct'], id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', pin: 0.293, pout: 2.253, max: 500 },
  { arena: ['llama-3.1-8b-instruct'], id: '@cf/meta/llama-3.1-8b-instruct-fp8', pin: 0.152, pout: 0.287, max: 600 },
];

// Quota gratis Cloudflare: 10.000 neurons al giorno (UTC). Ci fermiamo prima, con margine,
// e la dividiamo (decisione del 19/10/2026, rivista il 22/10/2026 quando sono arrivati i video lunghi: misurato il consumo
// vero, «Try it now» ~45 al giorno, audio ~3, Arena 0). Totale dei tetti: 1.500 + 1.000 (Arena) + 1.000 (audio) + 1.000 + 2.500 + 1.500 + 1.500 (notizie) = 10.000
// (22/10 sera: più spazio alle traduzioni, che non stavano dietro ai post quotidiani dei video).
export const TETTO_NEURONS = 1500;
export const TETTO_ARENA = 1000; // 22/10/2026: 1.000 passano alle notizie del blog (Arena usata ~0)
export const DUELLI_PER_VISITATORE = 10;
export const SECONDI_MINIMI = 4; // un voto dato prima di leggere le due risposte non conta
// Free Arena: solo modelli veloci (rispondono in pochi secondi), così il visitatore non aspetta
export const ARENA_MODELLI = [
  '@cf/openai/gpt-oss-20b', '@cf/openai/gpt-oss-120b', '@cf/google/gemma-4-26b-a4b-it', '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/meta/llama-3.1-8b-instruct-fp8', '@cf/meta/llama-4-scout-17b-16e-instruct', '@cf/qwen/qwen3-30b-a3b-fp8', '@cf/deepseek-ai/deepseek-v4-flash-0731',
];
export const ARENA_CATEGORIE = ['chat', 'code', 'writing', 'other'];
export const DOMANDE_PER_VISITATORE = 5;
export const LUNGHEZZA_DOMANDA = 1500; // caratteri
// 1.000 neurons = 0,011 $  →  neurons = dollari × 90.909
export const neuronsDa = (dollari) => dollari * 90909;
// costo massimo possibile di una domanda, prima di farla (per non sforare il tetto)
export const peggioreNeurons = (m, caratteri) => neuronsDa(((caratteri / 3 + 100) * m.pin + m.max * m.pout) / 1e6);

export const perNomeArena = (nome) => CF_MODELLI.find((m) => m.arena.includes(String(nome).toLowerCase()));

// «Try it now» anche con la quota gratis della Gemini API (deciso da Marco il 24/10/2026). In SEE/UK/CH la quota gratis
// vale (ai.google.dev/gemini-api/terms: valgono le regole sui dati dei servizi a pagamento, niente addestramento).
// Solo i modelli che il listino (ai.google.dev/gemini-api/docs/pricing, 24/10/2026) dà «Free of charge» nel Free Tier.
// La chiave (segreto GEMINI_KEY) va creata in un progetto SENZA fatturazione: oltre il limite Google risponde 429, non addebita.
// Google non pubblica i limiti giornalieri del Free Tier: ci fermiamo prima con un tetto nostro di richieste al giorno.
export const GEMINI_MODELLI = [
  { arena: ['gemini 3.8 flash (high)'], id: 'gemini/gemini-3.8-flash', max: 2048 },
  { arena: ['gemini 3.6 flash (high)', 'gemini-3.6-flash-high'], id: 'gemini/gemini-3.6-flash', max: 2048 },
  { arena: ['gemini 3.5 flash-lite'], id: 'gemini/gemini-3.5-flash-lite', max: 2048 },
  { arena: ['gemini 3.1 flash-lite preview'], id: 'gemini/gemini-3.1-flash-lite', max: 2048 },
  { arena: ['gemini 3 flash', 'gemini 3 flash (minimal)', 'gemini-3-flash'], id: 'gemini/gemini-3-flash-preview', max: 2048 },
  { arena: ['gemini 2.5 pro', 'gemini-2.5-pro'], id: 'gemini/gemini-2.5-pro', max: 2048 },
  { arena: ['gemini 2.5 flash'], id: 'gemini/gemini-2.5-flash', max: 2048 },
];
export const TETTO_GEMINI = 200; // richieste al giorno (UTC) per tutto il sito, sommando i modelli Gemini
// per le pagine dei modelli: prima Cloudflare, poi Gemini
// i riquadri Gemini compaiono solo quando la chiave c'è (GEMINI_KEY nel progetto Pages): fino ad allora resta false
export const GEMINI_ATTIVO = false;

// «Try it now» per Qwen con Alibaba Cloud Model Studio (24/10/2026: promesso da Marco a Louis del team Qwen il 22/10).
// Regione Singapore, endpoint compatibile OpenAI. Quota gratis: circa 1M token per modello, 90 giorni dall'attivazione
// (alibabacloud.com/help/en/model-studio/new-free-quota). Va acceso «Free Quota Only» nella console: a quota finita
// Model Studio risponde 403 AllocationQuota.FreeTierOnly invece di addebitare. Segreto QWEN_KEY.
// ID verificati sulla pagina text-generation-model di Model Studio (24/10/2026).
export const QWEN_MODELLI = [
  { arena: ['qwen3.8-max', 'qwen3.8-max (0902)'], id: 'qwen/qwen3.8-max', max: 700 },
  { arena: ['qwen3.7-plus'], id: 'qwen/qwen3.7-plus', max: 700 },
  { arena: ['qwen3.8-flash'], id: 'qwen/qwen3.8-flash', max: 700 },
];
export const TETTO_QWEN_TOKEN = 30000; // token al giorno per modello: 90 giorni × 30.000 < 1M di quota per modello
export const QWEN_ATTIVO = false;
const cerca = (lista, nome) => lista.find((m) => m.arena.includes(String(nome).toLowerCase()));
// Modelli chiusi che si usano gratis con l'API del laboratorio (24/10/2026, Marco: pagine anche per loro, con la quota
// spiegata). Gemini: Free Tier permanente con limiti giornalieri. Qwen: quota di prova di Model Studio (≈1M token per
// modello, 90 giorni). Vale anche senza le nostre chiavi: dice al visitatore come usarli gratis con la sua chiave
export function apiGratisPer(nome) {
  const g = cerca(GEMINI_MODELLI, nome);
  if (g) return { fornitore: 'gemini', modello: g.id.slice(7), tipo: 'free tier' };
  const q = cerca(QWEN_MODELLI, nome);
  if (q) return { fornitore: 'qwen', modello: q.id.slice(5), tipo: 'trial' };
  return null;
}
export const perNomeProva = (nome) => perNomeArena(nome) || (QWEN_ATTIVO ? cerca(QWEN_MODELLI, nome) : undefined) || (GEMINI_ATTIVO ? cerca(GEMINI_MODELLI, nome) : undefined);

// Prova audio sulla pagina /audio (decisione del 20/10/2026): voce → testo e testo → voce, modelli aperti.
// Listino Cloudflare 20/10/2026: whisper-large-v3-turbo 46,63 neurons al minuto di audio, melotts 18,63.
// Il browser converte la registrazione in WAV 16 kHz mono, così il server conosce la durata esatta.
export const AUDIO_STT = { id: '@cf/openai/whisper-large-v3-turbo', neuronsMinuto: 46.63, secondiMax: 30 };
export const AUDIO_TTS = { id: '@cf/myshell-ai/melotts', neuronsMinuto: 18.63, caratteriMax: 300, lingue: ['en', 'es', 'fr', 'zh', 'ja', 'ko'] };
export const TETTO_AUDIO = 1000;
export const AUDIO_PER_VISITATORE = 6;
// Scrittura automatica (functions/api/scrivi.js): un tetto per uso, ognuno col suo contatore.
// bozze: articolo del blog e post social (20/10/2026); traduzioni: frasi nuove del sito (21/10); video: copioni dei video lunghi (22/10).
// notizie: articoli del blog dai siti ufficiali e di notizie (22/10, ~230 neurons ad articolo)
// 24/10/2026: notizie 1.000 -> 1.500 tolti ai video (misurato in KV: video 967 il 22/10 e 412 il 23/10, notizie 858 per 5 articoli
// e il 23 sera DeepInfer è rimasto fuori per il tetto); con le fonti tagliate a 6.000 caratteri un articolo costa ~120-170
export const TETTI_SCRIVI = { bozze: 1000, traduzioni: 2500, video: 1500, notizie: 1500 };
export const TETTO_SCRIVI = TETTI_SCRIVI.bozze;
