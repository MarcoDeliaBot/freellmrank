// Titolo, descrizione e tag di YouTube per i video delle notizie e delle guide (Marco, 24/10/2026: «adotta solo i nuovi
// titoli, descrizioni e tag nel generatore automatico», dopo la prova con la skill youtube-seo sul video di DeepInfer).
// Regole youtube-seo: titolo sotto i 60 caratteri con il nome principale davanti (prima: il titolo del post, 83 caratteri,
// tagliato sul telefono); prima frase della descrizione sotto i 160 caratteri con i nomi cercati; tag con i nomi della notizia
// (prima: «AI news», «free AI» e i nomi delle fonti, senza il laboratorio né il prodotto).
// Workers AI propone; passa solo ciò che regge al controllo dei fatti (ogni numero e ogni nome stanno nel post).
// Senza proposta valida si torna a testi costruiti in codice dal post.

const MAX_TITOLO = 60;
const MAX_APERTURA = 160;
const MAX_TAG = 450; // YouTube accetta 500 caratteri di tag in tutto

const pulito = (t) => String(t || '').replace(/\s+/g, ' ').trim();

// il titolo del post accorciato: prima della prima virgola se basta, se no a parola intera
export function titoloCorto(titolo) {
  const t = pulito(titolo);
  if (t.length <= MAX_TITOLO) return t;
  const virgola = t.split(/,\s/)[0];
  if (virgola.length >= 20 && virgola.length <= MAX_TITOLO) return virgola;
  const w = t.split(' ');
  let s = '';
  for (const x of w) { if ((s + ' ' + x).trim().length > MAX_TITOLO) break; s = (s + ' ' + x).trim(); }
  return s.replace(/[,:;\-–]+$/, '');
}

// n: la notizia; ai.yt: { titolo, apertura, tag } proposti da Workers AI; regge(t): il controllo dei fatti del generatore;
// punti: i punti sullo schermo già controllati; nomi: i nomi propri del titolo del post
export function metaYoutube({ n, yt = {}, regge, punti = [], nomi = [], url, righeFonti, guida = false }) {
  const tolti = [];
  const prova = (t, max) => {
    const s = pulito(t);
    if (!s) return '';
    if (s.length > max || !regge(s)) { tolti.push(s); return ''; }
    return s;
  };
  const titolo = prova(yt.titolo, MAX_TITOLO) || titoloCorto(n.titolo);
  const apertura = prova(yt.apertura, MAX_APERTURA) || pulito(n.descr);
  const elenco = [...new Set(punti.map(pulito).filter((p) => p && p !== apertura))].slice(0, 6);
  const descrizione = [
    apertura,
    elenco.length ? `${guida ? 'In this guide' : 'Key facts'}:\n${elenco.map((p) => `- ${p}`).join('\n')}` : '',
    `Full story: ${url}`,
    `Sources:\n${righeFonti}`,
    'AI news every day and every free AI model, compared: https://freellmarena.com',
  ].filter(Boolean).join('\n\n');
  // tag: i nomi della notizia, poi quelli proposti che reggono, poi i generici; senza doppioni, entro 450 caratteri
  const proposti = (Array.isArray(yt.tag) ? yt.tag : []).map(pulito).filter((x) => x && x.length <= 40 && !/[#<>]/.test(x) && regge(x));
  const generici = guida ? ['local LLM', 'run AI locally', 'free AI', 'open source AI'] : ['AI news', 'free AI', 'open source AI', 'LLM'];
  const tag = [];
  let lung = 0;
  for (const x of [...nomi, ...proposti, ...generici]) {
    if (tag.some((y) => y.toLowerCase() === x.toLowerCase())) continue;
    if (lung + x.length + 1 > MAX_TAG) break;
    tag.push(x); lung += x.length + 1;
  }
  return { titolo, descrizione, tag: tag.slice(0, 15), apertura, tolti };
}

// la parte da chiedere a Workers AI, dentro il JSON che il generatore già chiede
export const RICHIESTA_YT = `"yt": {"titolo": "YouTube title, max 60 characters, starting with the main name (lab, product or model) people would search for; plain words, no clickbait, no emojis, no ALL CAPS", "apertura": "first sentence of the YouTube description, max 155 characters, with the main names", "tag": ["8 to 12 YouTube search tags: the names in ARTICLE and short topic phrases"]}`;
