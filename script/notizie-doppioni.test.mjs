// Prova del riconoscimento dei doppioni (4/11/2026: FlashProve uscì due volte, da TechCrunch e da MarkTechPost).
// Uso: node --test script/notizie-doppioni.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { RADICE } from './sito/comune.mjs';
import { doppione, linkNorma, modelloGiaRaccontato } from './notizie.mjs';

const DIR = path.join(RADICE, 'contenuti', 'notizie');
const post = (inizio) => JSON.parse(fs.readFileSync(path.join(DIR, fs.readdirSync(DIR).find((f) => f.startsWith(inizio))), 'utf8'));
const ORA = Date.parse('2026-11-04T12:00:00Z');
// la voce del feed come la vedeva script/notizie.mjs: titolo e link della fonte principale del post
const voce = (n, sommario = '') => ({ fonte: n.fonti[0].nome, titolo: n.fonti[0].titolo, link: n.fonti[0].url, sommario });
const primaria = (n) => { const f = n.fonti.find((x) => x.ufficiale); return { fonte: f.nome, titolo: f.titolo, link: f.url, sommario: '' }; };

const techcrunch = post('2026-11-04-anthropic-releases-open-source-flashprove');
const marktechpost = post('2026-11-04-anthropic-unveils-flashprove');

test('i link si confrontano senza differenze di forma', () => {
  assert.equal(linkNorma('https://github.com/anthropics/FlashProve/'), linkNorma('https://github.com/anthropics/FlashProve'));
  assert.equal(linkNorma('https://www.example.com/a/'), linkNorma('https://example.com/a'));
  assert.notEqual(linkNorma('https://github.com/anthropics/FlashProve'), linkNorma('https://github.com/anthropics/other'));
});

test('FlashProve: MarkTechPost dopo TechCrunch è un doppione (nome del prodotto nel titolo del post)', () => {
  assert.equal(doppione([voce(marktechpost)], [techcrunch], ORA), techcrunch.nome);
});

test('FlashProve: TechCrunch dopo MarkTechPost è un doppione (stessa fonte primaria, link con «/» finale)', () => {
  // titolo tolto apposta: deve bastare il link (github.com/anthropics/FlashProve/ contro …/FlashProve)
  assert.equal(doppione([{ ...primaria(techcrunch), titolo: 'GitHub' }], [marktechpost], ORA), marktechpost.nome);
});

test('FlashProve: il titolo di TechCrunch non nomina il prodotto, il sommario sì (stesso laboratorio)', () => {
  assert.equal(doppione([voce(techcrunch)], [marktechpost], ORA), null, 'col solo titolo la storia sembra un\'altra: è il caso del 4/11');
  assert.equal(doppione([voce(techcrunch, techcrunch.paragrafi[0])], [marktechpost], ORA), marktechpost.nome);
});

test('due notizie diverse dello stesso giorno restano nuove', () => {
  const fal = post('2026-11-04-fal-raises');
  const netflix = post('2026-11-04-netflix-rolls-out');
  assert.equal(doppione([voce(netflix)], [fal], ORA), null);
  assert.equal(doppione([voce(fal)], [netflix, techcrunch], ORA), null);
  assert.equal(doppione([voce(marktechpost, marktechpost.paragrafi[0])], [fal, netflix], ORA), null);
});

test('due notizie diverse dello stesso laboratorio restano nuove (OpenAI: Grid Protectors e Pando)', () => {
  const grid = post('2026-11-02-openai-launches-grid-protectors');
  const pando = post('2026-11-03-openai-launches-pando');
  assert.equal(doppione([voce(pando, pando.paragrafi[0])], [grid], ORA), null);
  assert.equal(doppione([voce(grid, grid.paragrafi[0])], [pando], ORA), null);
});

// e. lo stesso lancio già raccontato, sul titolo scritto (11/11/2026: Gemini 4 Carbon uscì 4 volte fra il 24/10 e il 2/11)
const carbon24 = post('2026-10-24-google-launches-early-access-to-gemini-4-carbon');
const carbon28 = post('2026-10-28-google-launches-gemini-4-carbon');
const carbonDeepmind = post('2026-10-29-google-deepmind-launches-gemini-4-carbon');
const carbonLatent = post('2026-10-29-google-launches-gemini-4-carbon-for-cyber');
const carbonRoundup = post('2026-11-02-google-launches-gemini-4-carbon');
const giorno = (n) => Date.parse(`${n.pubblicato}T23:00:00Z`);

test('e. Gemini 4 Carbon: dopo il 28/10 le altre uscite sono doppioni', () => {
  assert.equal(modelloGiaRaccontato(carbonDeepmind.titolo, [carbon24, carbon28], giorno(carbonDeepmind)), carbon28.nome);
  assert.equal(modelloGiaRaccontato(carbonLatent.titolo, [carbon24, carbon28], giorno(carbonLatent)), carbon28.nome);
  // il 2/11 la fonte (resoconto di ottobre di Google) non nomina il modello: lo vede solo il titolo scritto
  assert.equal(doppione([{ titolo: carbonRoundup.fonti[0].titolo, link: carbonRoundup.fonti[0].url, sommario: '' }], [carbon28], giorno(carbonRoundup)), null);
  assert.equal(modelloGiaRaccontato(carbonRoundup.titolo, [carbon24, carbon28], giorno(carbonRoundup)), carbon28.nome);
});

test('e. l\'uscita vera dopo un\'indiscrezione passa (28/10 dopo il 24/10)', () => {
  assert.equal(modelloGiaRaccontato(carbon28.titolo, [carbon24], giorno(carbon28)), null);
});

test('e. controlli positivi: modelli diversi, nomi più lunghi, notizie che non sono lanci, post vecchi, storia stessa', () => {
  const finto = (titolo, pubblicato = '2026-10-28', nome = 'finto') => ({ nome, titolo, titoloFonte: titolo, pubblicato });
  const ora = Date.parse('2026-10-30T12:00:00Z');
  assert.equal(modelloGiaRaccontato('Google launches Gemini 4 Argon for developers', [carbon28], ora), null);
  assert.equal(modelloGiaRaccontato('OpenAI launches GPT-6 Cyber for security teams', [finto('OpenAI releases GPT-6, its new flagship')], ora), null);
  assert.equal(modelloGiaRaccontato('OpenAI releases GPT-6, its new flagship', [finto('OpenAI launches GPT-6 Cyber for security teams')], ora), null);
  assert.equal(modelloGiaRaccontato('Gemini 4 Carbon now free in AI Studio for students', [carbon28], ora), null, 'non è un lancio');
  assert.equal(modelloGiaRaccontato('Google launches Gemini 4 Carbon in Europe', [finto('Gemini 4 Carbon tops coding benchmark')], ora), null, 'il post vecchio non è un lancio');
  assert.equal(modelloGiaRaccontato('Google launches Gemini 4 Carbon', [finto('Google launches Gemini 4 Carbon', '2026-10-01')], ora), null, 'oltre 14 giorni');
  assert.equal(modelloGiaRaccontato('Google launches Gemini 4 Carbon', [finto('Google launches Gemini 4 Carbon', '2026-10-30', '(questo giro) x')], ora), null);
});

test('e. il modello di paragone non è il modello lanciato (Flora 25/10, Merge 7/11: GPT-6 Astra)', () => {
  const flora = post('2026-10-25-nvidia-open-sources-flora');
  const merge = post('2026-11-07-merge-launches');
  assert.equal(modelloGiaRaccontato(merge.titolo, [flora], giorno(merge)), null);
  assert.equal(modelloGiaRaccontato('OpenAI launches GPT-6 Astra for agents', [flora], giorno(flora)), null);
});

test('e. i pesi aperti dopo l\'API sono una notizia nuova; lo stesso giorno no (Kimi K3.1 Pro, Mistral Large 4)', () => {
  const kimiApi = post('2026-10-23-moonshot-ai-launches-kimi');
  const kimiPesi = post('2026-11-04-moonshot-ai-launches-kimi');
  assert.equal(modelloGiaRaccontato(kimiPesi.titolo, [kimiApi], giorno(kimiPesi)), null);
  const mistral = fs.readdirSync(DIR).filter((f) => f.startsWith('2026-10-29-mistral-releases')).sort().map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
  const [pesi, primo] = [mistral.find((n) => /open weights/i.test(n.titolo)), mistral.find((n) => !/open weights/i.test(n.titolo))];
  assert.equal(modelloGiaRaccontato(pesi.titolo, [primo], giorno(pesi)), primo.nome);
});
