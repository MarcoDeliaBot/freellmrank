// Prove dei testi «A vs B» (17/11/2026; formato 2 con title = H1 e titoli H2/H3/H4 fissi). Uso: node --test script/confronti-testi.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { controllaTesto, scegliCoppie, componi, normalizza } from './confronti-testi.mjs';
import { testoAncoraVero, leggiTesti, nomeCorto, VERSIONE_TESTI } from './sito/confronti.mjs';

const a = { nome: 'Qwen 3.6 Plus (Max)', cat: { chat: { punti: 1450, data: '2026-11-16' } } };
const b = { nome: 'Gemma 4 31B', cat: { chat: { punti: 1420, data: '2026-11-16' } } };
const A = 'Qwen 3.6 Plus', B = 'Gemma 4 31B';
const testoDati = 'Qwen 3.6 Plus score 1450, rank 20 of 421, 4273 votes. Gemma 4 31B score 1420, 31 B, about 20 GB. people prefer it about 54% of the time. RTX 4090 | 38 tok/s';
const frase = 'Qwen 3.6 Plus leads Gemma 4 31B in blind votes and the gap is clear enough to matter for everyday questions. ';
const buono = () => ({
  descr: 'Qwen 3.6 Plus wins the blind votes, Gemma 4 31B runs at home.',
  risposta: `Qwen 3.6 Plus is ahead: it scores 1450 and Gemma 4 31B scores 1420, so people prefer Qwen about 54% of the time. ${frase.repeat(3)}`,
  categorie: { Chat: frase.repeat(3), Coding: frase.repeat(3) },
  dimensioni: `Gemma 4 31B is a 31 B model, about 20 GB at 4-bit. ${frase.repeat(2)}`,
  velocita: `Gemma 4 31B runs at 38 tok/s on an RTX 4090. ${frase.repeat(2)}`,
  gratisA: frase.repeat(2),
  gratisB: frase.repeat(2),
  sceglieA: 'Pick Qwen 3.6 Plus if you chat online.',
  sceglieB: 'Pick Gemma 4 31B if you want it on your own card.',
});
const opz = { a, b, A, B, testoDati, categorie: ['Chat', 'Coding'] };

test('un testo con i soli fatti passa', () => {
  assert.deepEqual(controllaTesto(buono(), { ...opz, altriNomi: ['DeepSeek V4 Pro'] }), []);
});

test('nome corto: senza la variante di Arena', () => {
  assert.equal(nomeCorto({ nome: 'Gemini 3.8 Flash (High)' }), 'Gemini 3.8 Flash');
  assert.equal(nomeCorto({ nome: 'Qwen3.8-Max' }), 'Qwen3.8-Max');
});

test('numeri inventati, altri modelli, frasi vietate e lineette si fermano', () => {
  const t = buono();
  t.risposta += ' It costs 0.35 dollars and beats DeepSeek V4 Pro, a real game-changer — really.';
  const e = controllaTesto(t, { ...opz, altriNomi: ['DeepSeek V4 Pro'] });
  assert.ok(e.some((x) => x.includes('number not in DATA: 0.35')), e.join(' | '));
  assert.ok(e.includes('other model named: DeepSeek V4 Pro'));
  assert.ok(e.includes('banned phrase: game-changer'));
  assert.ok(e.includes('em dash'));
});

test('chi vince: come la riga «Call» dei fatti', () => {
  const ok = { ...opz, leader: A };
  assert.deepEqual(controllaTesto(buono(), ok), []);
  // 17/11: Qwen 3.6 aveva chiamato «too small to call» un distacco che per il sito è un vantaggio
  const t = buono(); t.categorie.Chat += ' The gap is too small to call.';
  assert.ok(controllaTesto(t, ok).some((x) => x.includes('real lead')));
  const pari = controllaTesto(buono(), { ...ok, leader: 'even' });
  assert.ok(pari.some((x) => x.includes('about even')), pari.join(' | '));
  const t3 = buono(); t3.risposta = `Gemma 4 31B is the one most people meet first. ${frase.repeat(3)}`.replaceAll('Qwen 3.6 Plus leads', 'It trails');
  assert.ok(controllaTesto(t3, ok).includes(`risposta: must say ${A} is ahead`));
});

test('numeri interi contro interi: «62 675» vale 62675, un pezzo di un altro numero non basta', () => {
  const dati = 'votes 62675, coding 1686, size 2780.1 B';
  const t = buono(); t.risposta += ' It has 62 675 votes and 1,686 points in coding, size 2 780.1 B.';
  const testo = (x) => controllaTesto(x, { ...opz, testoDati: `${testoDati} ${dati}` }).filter((e) => e.startsWith('number'));
  assert.deepEqual(testo(t), []);
  const t2 = buono(); t2.risposta += ' It has 627 votes and 268 fans.';
  assert.deepEqual(testo(t2), ['number not in DATA: 627', 'number not in DATA: 268']);
});

test('struttura: campi mancanti, categorie giuste, lunghezza', () => {
  const t = buono(); delete t.sceglieB; t.categorie = { Chat: 'x', Vision: 'y' }; t.descr = 'x'.repeat(120);
  const e = controllaTesto(t, opz);
  assert.ok(e.includes('sceglieB: missing'));
  assert.ok(e.includes('categorie: missing "Coding"'));
  assert.ok(e.includes('categorie: "Vision" is not a category in DATA'));
  assert.ok(e.includes('descr: missing or over 110 characters'));
  const corto = { descr: 'x', risposta: 'Qwen 3.6 Plus is ahead.', categorie: { Chat: 'a', Coding: 'b' }, dimensioni: 'a', velocita: 'a', gratisA: 'a', gratisB: 'a', sceglieA: 'a', sceglieB: 'a' };
  assert.ok(controllaTesto(corto, opz).some((x) => x.startsWith('length:')));
  assert.deepEqual(controllaTesto(null, opz), ['no JSON object']);
});

test('normalizza: paragrafi in elenco e «description» accettati', () => {
  const n = normalizza({ ...buono(), descr: undefined, description: 'd', gratisA: ['uno', 'due'] });
  assert.equal(n.descr, 'd');
  assert.equal(n.gratisA, 'uno\n\ndue');
});

test('il nome di un modello dentro il nome della coppia non conta come «altro modello»', () => {
  // il controllo toglie i nomi interi e corti della coppia prima di cercare gli altri
  assert.deepEqual(controllaTesto(buono(), { ...opz, altriNomi: ['Gemma 4 31B Instruct'] }), []);
});

test('scelta: prima i testi smentiti, poi le coppie nuove con un modello appena arrivato, poi i vecchi', () => {
  const m = (nome, punti, primo) => ({ nome, primo, cat: { chat: { punti } } });
  const c = (x, y, file) => ({ a: x, b: y, file });
  const vecchioM = m('Vecchio', 1300, '2026-05-01'), nuovoM = m('Nuovo', 1300, '2026-11-12'), forte = m('Forte', 1500, '2026-06-01'), altro = m('Altro', 1490, '2026-06-01');
  const coppie = [c(forte, altro, 'compare/forte-altro.html'), c(vecchioM, nuovoM, 'compare/v-n.html'), c(forte, vecchioM, 'compare/smentita.html'), c(altro, vecchioM, 'compare/vecchia.html'), c(forte, nuovoM, 'compare/fresca-forte.html')];
  const fatti = { leader: 'Forte', gratisA: 'x', gratisB: 'y' };
  const testi = {
    'compare/smentita.html': { aggiornato: '2026-11-15', fatti: { ...fatti, leader: 'Vecchio' } },
    'compare/vecchia.html': { versione: VERSIONE_TESTI, aggiornato: '2026-09-01', fatti },
  };
  const ordine = scegliCoppie(coppie, testi, () => fatti, { max: 10, perModello: 99, oggi: '2026-11-17' }).map((x) => x.file);
  assert.deepEqual(ordine, ['compare/smentita.html', 'compare/fresca-forte.html', 'compare/v-n.html', 'compare/forte-altro.html', 'compare/vecchia.html']);
  assert.equal(scegliCoppie(coppie, testi, () => fatti, { max: 2, oggi: '2026-11-17' }).length, 2);
});

test('al massimo 3 coppie al giorno con lo stesso modello', () => {
  const m = (nome, punti) => ({ nome, cat: { chat: { punti } } });
  const g = m('Gemini', 1500), altri = ['B', 'C', 'D', 'E'].map((n, i) => m(n, 1400 - i));
  const coppie = [...altri.map((x) => ({ a: g, b: x, file: `compare/g-${x.nome}.html` })), { a: altri[2], b: altri[3], file: 'compare/d-e.html' }];
  const scelte = scegliCoppie(coppie, {}, () => ({}), { max: 4, oggi: '2026-11-17' }).map((x) => x.file);
  assert.deepEqual(scelte, ['compare/g-B.html', 'compare/g-C.html', 'compare/g-D.html', 'compare/d-e.html']);
  // controllo positivo: senza limite le prime 4 sono tutte con Gemini
  assert.equal(scegliCoppie(coppie, {}, () => ({}), { max: 4, perModello: 99, oggi: '2026-11-17' }).filter((x) => x.a === g).length, 4);
});

test('testo ancora vero solo nel formato nuovo, con stesso vincitore e stesso «gratis»', () => {
  const f = { leader: a.nome, gratisA: 'free API on OpenRouter', gratisB: 'download and run at home' };
  const t = componi(buono(), { a, b, fatti: f, oggi: '2026-11-17' });
  assert.equal(t.versione, VERSIONE_TESTI);
  assert.equal(t.scritto, '2026-11-17');
  assert.equal(t.fatti.dataArena, '2026-11-16');
  assert.ok(testoAncoraVero(t, f));
  assert.ok(!testoAncoraVero(t, { ...f, leader: 'even' }));
  assert.ok(!testoAncoraVero(t, { ...f, gratisA: '—' }));
  assert.ok(!testoAncoraVero({ ...t, versione: undefined }, f), 'i testi del formato 1 non si mostrano');
  assert.ok(!testoAncoraVero(null, f));
});

test('leggiTesti: un file per coppia, chiave = pagina', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'confronti-'));
  fs.writeFileSync(path.join(d, 'a-vs-b.json'), JSON.stringify({ angolo: 'x' }));
  assert.deepEqual(Object.keys(leggiTesti(d)), ['compare/a-vs-b.html']);
  assert.deepEqual(leggiTesti(path.join(d, 'manca')), {});
});

test('title corti senza doppioni: la variante resta solo dove serve a distinguere', async () => {
  const { titoliConfronti } = await import('./sito/confronti.mjs');
  const m = (nome) => ({ nome });
  const k = m('Kimi K2.6'), pieno = m('DeepSeek-V4-Pro'), variante = m('DeepSeek-V4-Pro (High, 20260813)'), g = m('Gemini 3.8 Flash (High)');
  const coppie = [
    { a: pieno, b: k, file: 'compare/deepseek-v4-pro-vs-kimi-k2-6.html' },
    { a: variante, b: k, file: 'compare/deepseek-v4-pro-high-20260813-vs-kimi-k2-6.html' },
    { a: g, b: k, file: 'compare/gemini-3-8-flash-high-vs-kimi-k2-6.html' },
  ];
  const t = titoliConfronti(coppie, new Set(['compare/deepseek-v4-pro-high-20260813-vs-kimi-k2-6.html']));
  assert.equal(t['compare/gemini-3-8-flash-high-vs-kimi-k2-6.html'], 'Gemini 3.8 Flash vs Kimi K2.6');
  assert.equal(t['compare/deepseek-v4-pro-vs-kimi-k2-6.html'], 'DeepSeek-V4-Pro vs Kimi K2.6');
  assert.equal(t['compare/deepseek-v4-pro-high-20260813-vs-kimi-k2-6.html'], 'DeepSeek-V4-Pro (High, 20260813) vs Kimi K2.6');
  assert.equal(new Set(Object.values(t)).size, 3);
});
