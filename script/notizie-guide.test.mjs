// Prova dei controlli sulla storia (8/11/2026: uscì «Meta releases Llama 4 Scout and Maverick», ma Llama 4 è di aprile
// 2025; l'unica fonte era la guida di MarkTechPost «MoE Routing Strategies Explained», con Llama 4 solo come esempio).
// Uso: node --test script/notizie-guide.test.mjs   (niente rete: Hugging Face è finto)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { RADICE } from './sito/comune.mjs';
import { guidaDiventataLancio, stessaStoria, uscitaVecchia, soggetti } from './notizie.mjs';

const DIR = path.join(RADICE, 'contenuti', 'notizie');
const post = (inizio) => JSON.parse(fs.readFileSync(path.join(DIR, fs.readdirSync(DIR).find((f) => f.startsWith(inizio))), 'utf8'));
const llama = post('2026-11-08-meta-releases-llama-4-scout');
const gds = post('2026-11-01-nvidia-releases-open-source-gds-diag');
const flashprove = post('2026-11-04-anthropic-releases-open-source-flashprove');
const ORA = Date.parse('2026-11-08T12:00:00Z');
// l'inizio della guida come lo leggeva lo script: parla di instradamento, nomina Llama 4 solo più avanti come esempio
const GUIDA_TESTO = 'Mixture of Experts models route each token to a few experts. This guide compares Top-K routing, Expert-Choice routing, sigmoid gating and dynamic routing, with the trade-offs of each strategy for load balancing and throughput.';

// Hugging Face finto: risponde come l'API vera (ricerca ordinata per data di creazione) e conta le chiamate
const hfFinto = (modelli) => {
  const f = async (url) => { f.chiamate.push(url); return JSON.stringify(modelli); };
  f.chiamate = [];
  return f;
};
const LLAMA_HF = [
  { id: 'meta-llama/Llama-4-Scout-17B-16E-Instruct', createdAt: '2025-04-02T13:34:17.000Z' },
  { id: 'meta-llama/Llama-4-Scout-17B-16E', createdAt: '2025-04-02T17:03:27.000Z' },
  { id: 'unsloth/Llama-4-Scout-17B-16E-Instruct', createdAt: '2025-04-05T20:45:06.000Z' },
];

test('a. una guida non diventa un lancio: Llama 4 (8/11) e gds-diag (1/11)', () => {
  assert.ok(llama.titoloFonte.includes('Explained'), 'il post salvato è quello del caso');
  assert.equal(guidaDiventataLancio(llama.titolo, llama.titoloFonte), true);
  assert.equal(guidaDiventataLancio(gds.titolo, gds.titoloFonte), true, '«How to Check and Configure…» diventato «NVIDIA releases…»');
  // una guida può uscire come guida
  assert.equal(guidaDiventataLancio('How MoE routing strategies differ: Top-K, Expert-Choice and sigmoid gating', llama.titoloFonte), false);
  // controllo positivo: un vero lancio da una fonte che non è una guida passa
  assert.equal(guidaDiventataLancio(flashprove.titolo, flashprove.titoloFonte), false);
});

test('b. il titolo scritto deve parlare della storia della fonte', () => {
  assert.deepEqual(soggetti(llama.titolo).slice(0, 1), ['llama4scout'], 'il soggetto si legge anche col trattino U+2011 del modello');
  assert.equal(stessaStoria(llama.titolo, { titolo: llama.titoloFonte, testo: '' }), false);
  assert.equal(stessaStoria(llama.titolo, { titolo: llama.titoloFonte, testo: GUIDA_TESTO }), false, '«MoE» in comune non basta');
  // controllo positivo: il titolo della fonte non nomina FlashProve, il testo sì (caso del 4/11, uscito giustamente)
  const fonte = flashprove.fonti[0];
  assert.equal(stessaStoria(flashprove.titolo, { titolo: fonte.titolo, testo: '' }), false);
  assert.equal(stessaStoria(flashprove.titolo, { titolo: fonte.titolo, testo: `Anthropic is building FlashProve, an open-source way to verify which model produced an output. ${flashprove.paragrafi[0]}` }), true);
  // titoli dei blog ufficiali senza nomi di prodotto: decidono gli altri controlli
  assert.equal(stessaStoria("OpenAI's autonomous pipeline patches 948 Linux kernel bugs", { titolo: 'A thousand fewer paths to root', testo: '' }), true);
});

test('c. un modello uscito da più di 30 giorni non è una notizia: Llama 4 Scout è su Hugging Face dal 2/4/2025', async () => {
  const hf = hfFinto(LLAMA_HF);
  const motivo = await uscitaVecchia(llama.titolo, { nuovi: [], piccoli: [] }, hf, ORA);
  assert.match(motivo || '', /Llama-4-Scout-17B-16E-Instruct.*2025-04-02/);
  assert.match(hf.chiamate[0], /search=Llama-4-Scout&sort=createdAt&direction=1/);
});

test('c. controlli positivi: modello nuovo, dati del sito, titolo che non è un lancio', async () => {
  // Arete-27B, pubblicato il 6/11/2026: due giorni dopo è ancora una notizia
  const arete = hfFinto([{ id: 'NousResearch/Arete-27B', createdAt: '2026-11-06T19:31:28.000Z' }, { id: 'bartowski/NousResearch_Arete-27B-GGUF', createdAt: '2026-11-06T21:39:20.000Z' }]);
  assert.equal(await uscitaVecchia('Nous Research releases Arete-27B, an open reasoning model', { nuovi: [], piccoli: [] }, arete, ORA), null);
  // il modello di base nominato dopo (Qwen3.8-27B, di agosto) non conta: esce Arete-27B
  const base = hfFinto([{ id: 'Qwen/Qwen3.8-27B', createdAt: '2026-08-05T10:00:00.000Z' }]);
  assert.equal(await uscitaVecchia('Nous Research releases Arete-27B, a Qwen3.8-27B fine-tune', { nuovi: [], piccoli: [] }, async (u) => (u.includes('Qwen3.8') ? base(u) : arete(u)), ORA), null);
  // misura del 10/11 sui post usciti: un repo di uno sconosciuto con lo stesso nome, un nome che solo comincia uguale e
  // un'anteprima di agosto non tolgono la notizia (Genie 4 il 27/10, Hy4 il 4/11)
  const altri = hfFinto([{ id: 'joshuaclymer/genie-4', createdAt: '2024-02-27T10:00:00.000Z' }, { id: 'tencent/Hy4Q43Y7', createdAt: '2026-01-11T10:00:00.000Z' },
    { id: 'tencent/Hy4-preview', createdAt: '2026-08-27T10:00:00.000Z' }, { id: 'tencent/Hy4', createdAt: '2026-11-03T10:00:00.000Z' }]);
  assert.equal(await uscitaVecchia('Google DeepMind unveils Genie 4, a real-time world model', { nuovi: [], piccoli: [] }, altri, ORA), null);
  assert.equal(await uscitaVecchia('Tencent launches Hy4, a 770-billion-parameter LLM', { nuovi: [], piccoli: [] }, altri, ORA), null);
  // un titolo che non annuncia niente non si controlla («Open-weight GLM-5.3 builds exploit chains», 30/10)
  assert.equal(await uscitaVecchia('Open-weight GLM-5.3 builds full Firefox exploit chains', { nuovi: [], piccoli: [] }, altri, ORA), null);
  // i dati del sito bastano, senza chiedere a Hugging Face
  const nessuno = hfFinto([]);
  const dati = { nuovi: [], piccoli: [{ nome: 'Qwen3-0.6B', creato: '2025-04-27' }] };
  assert.match(await uscitaVecchia('Qwen releases Qwen3-0.6B for phones', dati, nessuno, ORA) || '', /dati del sito dal 2025-04-27/);
  assert.equal(nessuno.chiamate.length, 0);
  // non è un lancio: nessun controllo di data
  assert.equal(await uscitaVecchia('How Llama 4 Scout routes tokens across experts', dati, nessuno, ORA), null);
  assert.equal(nessuno.chiamate.length, 0);
});
