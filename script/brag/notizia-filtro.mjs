// Quali notizie diventano video (Marco, 24/11/2026). Dati del canale: le notizie sulle aziende (soldi raccolti, borsa,
// dirigenti, accordi) fanno 1-4 visualizzazioni, i video sui modelli aperti 90-919. Una notizia sulle aziende senza un
// modello o uno strumento da usare gratis resta sul sito come articolo, ma non diventa più un video.
// Il resto (modelli, strumenti, ricerca, hardware) resta come prima.

// notizia «sulle aziende»: tema Business o Policy, oppure parole di soldi, borsa, dirigenti, accordi nel titolo
const AZIENDA = /\b(rais(es|ed|ing)|funding|fundrais\w*|valuation|valued at|series [a-f]|seed round|ipo|initial public offering|stock|shares|share price|nasdaq|nyse|investors?|investment|invests?|acquir\w*|acquisition|merger|merges?|buys?|deal|partnership|partners with|teams up|agreement|contract|ceo|cfo|cto|chief \w+ officer|executive|appoint\w*|hires?|steps down|resign\w*|reinstat\w*|lawsuit|sues|antitrust|revenue|arr|earnings|profit|layoffs?|showcases?)\b/i;
// qualcosa da usare gratis: «free», pesi o codice aperti, Hugging Face, GitHub
const USABILE = /\b(free|open[- ]source[sd]?|open[- ]weights?|hugging ?face|github|apache[- ]2|mit licen[sc]e|downloadable|run (it )?locally)\b/i;
const FONTE_USABILE = /(huggingface\.co|github\.com)\//i;

export const aziendale = (n) => /^(business|policy)$/i.test(String(n.tema || '')) || AZIENDA.test(String(n.titolo || ''));
// solo titolo e descrizione: nei paragrafi «GitHub» o «free» compaiono anche per caso («Linear hits $100M ARR»)
export const usabile = (n) => USABILE.test(`${n.titolo || ''} ${n.descr || ''}`) || (n.fonti || []).some((f) => FONTE_USABILE.test(String(f.url || '')));
export const diventaVideo = (n) => !aziendale(n) || usabile(n);
