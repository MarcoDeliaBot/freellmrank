// Modelli che il visitatore prova senza account, su Cloudflare Workers AI (quota gratis del sito).
// arena: i nomi Arena della pagina del modello · pin/pout: dollari per milione di token (listino Cloudflare, 19/10/2026)
// max: token massimi della risposta · extra: opzioni per spegnere il "ragionamento", che consuma token
// Lo usano sia la build (quali pagine hanno il riquadro) sia functions/api/prova.js (il tetto giornaliero).
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

// Quota gratis Cloudflare: 10.000 neurons al giorno (UTC). Ci fermiamo prima, con margine.
export const TETTO_NEURONS = 7000;
export const DOMANDE_PER_VISITATORE = 5;
export const LUNGHEZZA_DOMANDA = 1500; // caratteri
// 1.000 neurons = 0,011 $  →  neurons = dollari × 90.909
export const neuronsDa = (dollari) => dollari * 90909;
// costo massimo possibile di una domanda, prima di farla (per non sforare il tetto)
export const peggioreNeurons = (m, caratteri) => neuronsDa(((caratteri / 3 + 100) * m.pin + m.max * m.pout) / 1e6);

export const perNomeArena = (nome) => CF_MODELLI.find((m) => m.arena.includes(String(nome).toLowerCase()));
