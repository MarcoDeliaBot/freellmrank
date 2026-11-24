// Prove del flusso n8n «video su YouTube» (n8n/video-youtube.json): ordine della coda e link di iscrizione (24/11/2026).
// Il codice dei nodi gira qui con finti $() e memoria, come in n8n. Uso: node --test script/n8n-video-youtube.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const flusso = JSON.parse(fs.readFileSync(new URL('../n8n/video-youtube.json', import.meta.url), 'utf8'));
const codice = (nome) => flusso.nodes.find((n) => n.name === nome).parameters.jsCode;
const esegui = (nome, { nodi = {}, json = {}, memoria = {} }) => {
  const $ = (n) => ({ first: () => ({ json: nodi[n] }), all: () => nodi[n].map((j) => ({ json: j })) });
  return new Function('$', '$json', '$getWorkflowStaticData', codice(nome))($, json, () => memoria);
};
const ora = Date.now();
const fa = (giorni) => new Date(ora - giorni * 864e5).toISOString();
const rel = (tag, giorni) => ({ tag_name: tag, created_at: fa(giorni), assets: [{ name: 'v.mp4', browser_download_url: 'm' }, { name: 'v.json', browser_download_url: 'j' }] });
// sceglie un video alla volta, segnandolo come fatto, finché la coda è vuota
function ordine(release) {
  const memoria = {}, fuori = [];
  for (let i = 0; i < release.length; i++) {
    const r = esegui('Scegli il video da caricare', { nodi: { 'Leggi i video pronti su GitHub': release, 'Leggi i video già sul canale': {} }, memoria });
    if (!r.length) break;
    fuori.push(r[0].json.tag);
    memoria.fatti.push(r[0].json.tag);
    memoria.oggi = 0;
  }
  return fuori;
}

test('prima i modelli aperti recenti col loro Short, poi le prove, poi il resto', () => {
  const release = [
    rel('video-notizia-anthropic-ipo', 5),
    rel('video-breve-anthropic-ipo', 5),
    rel('video-notizia-deeptutor-local-tutor-modelli-gratis-2026-11-24', 4),
    rel('video-breve-deeptutor-local-tutor-modelli-gratis-2026-11-24', 4),
    rel('video-skill-teardown', 6),
    rel('video-modello-wemm-ecom-35b-a3b', 1),
    rel('video-nuovo-wemm-ecom-35b-a3b', 1),
    rel('video-modello-ernie-5.5-flash', 2),
    rel('video-nuovo-ernie-5.5-flash', 2),
    // un modello fatto più di 30 giorni fa non passa davanti (orologio spostato avanti di 10 giorni: «vecchio» ha 31 giorni)
    rel('video-modello-vecchio', 21),
  ];
  const vero = Date.now;
  Date.now = () => ora + 10 * 864e5;
  let fuori;
  try { fuori = ordine(release); } finally { Date.now = vero; }
  assert.deepEqual(fuori, [
    'video-modello-ernie-5.5-flash', 'video-nuovo-ernie-5.5-flash',
    'video-modello-wemm-ecom-35b-a3b', 'video-nuovo-wemm-ecom-35b-a3b',
    'video-skill-teardown',
    'video-notizia-deeptutor-local-tutor-modelli-gratis-2026-11-24', 'video-breve-deeptutor-local-tutor-modelli-gratis-2026-11-24',
    'video-modello-vecchio',
    'video-notizia-anthropic-ipo', 'video-breve-anthropic-ipo',
  ]);
});

test('il tetto del giorno resta 15', () => {
  assert.match(codice('Scegli il video da caricare'), /const TETTO = 15;/);
  const memoria = { giorno: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }), oggi: 15 };
  assert.deepEqual(esegui('Scegli il video da caricare', { nodi: { 'Leggi i video pronti su GitHub': [rel('video-modello-x', 1)], 'Leggi i video già sul canale': {} }, memoria }), []);
});

const LINK = 'https://www.youtube.com/channel/UCaDO6FcvstiPM83lh5eH7_w?sub_confirmation=1';
const prepara = (info, memoria = {}) => esegui('Prepara la descrizione', { nodi: { 'Solo sul canale FreeLLMArena': { tag: 'video-x' }, 'Leggi i video già sul canale': {} }, json: info, memoria })[0].json;

test('link di iscrizione in prima riga, una volta sola', () => {
  const d = prepara({ titolo: 'T', descrizione: 'Prima riga\nSeconda' }).descrizione;
  assert.equal(d.split('\n')[0], LINK);
  assert.equal(d, `${LINK}\nPrima riga\nSeconda`);
  // già presente (anche non in cima): resta uno solo, in cima
  const due = prepara({ titolo: 'T', descrizione: `Prima riga\n${LINK}` }).descrizione;
  assert.equal(due, `${LINK}\nPrima riga`);
  // lo Short tiene anche il rimando al video lungo
  const s = prepara({ titolo: 'S', descrizione: 'Testo\nFull story: https://freellmarena.com/x', lungo: 'video-modello-x' }, { ids: { 'video-modello-x': 'ABC' } }).descrizione;
  assert.equal(s.split('\n')[0], LINK);
  assert.match(s, /^Full video: https:\/\/youtu\.be\/ABC$/m);
});
