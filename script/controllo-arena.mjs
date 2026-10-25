// Controllo della classifica di Arena ogni 2 ore (Marco, 25/10/2026: «la classifica deve seguire Arena», «fai tutto tu»).
// I Termini d'uso di arena.ai vietano di leggere il sito con programmi: si guarda la fonte ufficiale che Arena pubblica
// apposta, il dataset lmarena-ai/leaderboard-dataset su Hugging Face (CC BY 4.0), e la si confronta con sito/data.json.
//   - se Arena ha una versione più nuova di una nostra classifica: esce «aggiorna=si» (il workflow fa partire Aggiorna dati);
//   - se la classifica chat di Arena è ferma da 3 giorni o più: esce «avvisa=si» con il testo per la segnalazione
//     (issue con etichetta «salute», che il flusso n8n «bozze e problemi da GitHub» manda per mail a info@).
// Uso: node script/controllo-arena.mjs   (scrive le uscite in $GITHUB_OUTPUT se c'è)
import fs from 'node:fs';
import path from 'node:path';

const QUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const CATEGORIE = { chat: 'text_style_control', code: 'webdev', vision: 'vision_style_control', image: 'text_to_image', video: 'text_to_video', edit: 'image_edit', document: 'document_style_control', search: 'search_style_control', i2v: 'image_to_video', vedit: 'video_edit', agent: 'agent' };

export function confronta(commit, nostre, oggi) {
  const ultima = {};
  for (const c of commit) {
    const m = /^Update (\S+) for (\d{4}-\d{2}-\d{2})/.exec(c.title || '');
    if (m && (!ultima[m[1]] || m[2] > ultima[m[1]])) ultima[m[1]] = m[2];
  }
  const nuove = Object.entries(CATEGORIE).filter(([id, cfg]) => ultima[cfg] && nostre[id] && ultima[cfg] > nostre[id]).map(([id, cfg]) => ({ id, arena: ultima[cfg], noi: nostre[id] }));
  const ultimaChat = ultima.text_style_control || ultima.text || nostre.chat;
  const giorniFermi = ultimaChat ? Math.floor((Date.parse(oggi) - Date.parse(ultimaChat)) / 864e5) : null;
  return { nuove, ultimaChat, giorniFermi, avvisa: giorniFermi !== null && giorniFermi >= 3 };
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const r = await fetch('https://huggingface.co/api/datasets/lmarena-ai/leaderboard-dataset/commits/main?limit=100');
  if (!r.ok) { console.log(`Hugging Face non risponde (${r.status}): riprovo alla prossima corsa`); process.exit(0); }
  const dati = JSON.parse(fs.readFileSync(path.join(QUI, '..', 'sito', 'data.json'), 'utf8'));
  const nostre = Object.fromEntries(dati.categorie.map((c) => [c.id, c.data]));
  const oggi = new Date().toISOString().slice(0, 10);
  const esito = confronta(await r.json(), nostre, oggi);
  console.log(esito.nuove.length ? `Arena ha versioni nuove: ${esito.nuove.map((x) => `${x.id} ${x.noi} → ${x.arena}`).join(', ')}` : 'Il sito ha già le ultime versioni di Arena');
  console.log(`Classifica chat di Arena: ${esito.ultimaChat} (${esito.giorniFermi} giorni fa)`);
  const righe = [
    `aggiorna=${esito.nuove.length ? 'si' : 'no'}`,
    `avvisa=${esito.avvisa ? 'si' : 'no'}`,
    `titolo=Classifica Arena ferma da ${esito.giorniFermi} giorni (chat al ${esito.ultimaChat})`,
  ];
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, righe.join('\n') + '\n');
  else console.log(righe.join('\n'));
}
