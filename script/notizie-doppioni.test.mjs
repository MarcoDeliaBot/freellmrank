// Prova del riconoscimento dei doppioni (4/11/2026: FlashProve uscì due volte, da TechCrunch e da MarkTechPost).
// Uso: node --test script/notizie-doppioni.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { RADICE } from './sito/comune.mjs';
import { doppione, linkNorma } from './notizie.mjs';

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
