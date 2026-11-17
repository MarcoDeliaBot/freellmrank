// Prove dei testi «A vs B» (17/11/2026). Uso: node --test script/confronti-testi.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { controllaTesto, scegliCoppie, componi } from './confronti-testi.mjs';
import { testoAncoraVero, leggiTesti } from './sito/confronti.mjs';

const a = { nome: 'Qwen 3.6 Plus', cat: { chat: { punti: 1450, data: '2026-11-16' } } };
const b = { nome: 'Gemma 4 31B', cat: { chat: { punti: 1420, data: '2026-11-16' } } };
const testoDati = 'Qwen 3.6 Plus score 1450, rank 20 of 421, 4273 votes. Gemma 4 31B score 1420, 31 B, about 20 GB. people prefer it about 54% of the time. RTX 4090 | 38 tok/s';
const frase = 'Qwen 3.6 Plus leads Gemma 4 31B in blind votes and the gap is clear enough to matter for everyday chat questions. ';
const buono = () => ({
  angolo: 'The Bigger Score Against the One You Can Download',
  descr: 'Qwen 3.6 Plus vs Gemma 4 31B on Arena blind votes, home speed and free use.',
  intro: 'Qwen 3.6 Plus scores 1450 and Gemma 4 31B scores 1420, so people prefer Qwen about 54% of the time.',
  sezioni: [
    { titolo: 'Blind votes', testo: frase.repeat(8) },
    { titolo: 'At home', testo: `Gemma 4 31B is a 31 B model, about 20 GB at 4-bit, and runs at 38 tok/s on an RTX 4090. ${frase.repeat(6)}` },
    { titolo: 'Free use', testo: frase.repeat(8) },
  ],
  verdetto: 'Pick Qwen 3.6 Plus if you chat online. Pick Gemma 4 31B if you want it on your own card.',
});

test('un testo con i soli fatti passa', () => {
  assert.deepEqual(controllaTesto(buono(), { a, b, testoDati, altriNomi: ['DeepSeek V4 Pro'] }), []);
});

test('numeri inventati, altri modelli, frasi vietate e lineette si fermano', () => {
  const t = buono();
  t.intro += ' It costs 0.35 dollars and beats DeepSeek V4 Pro, a real game-changer — really.';
  const e = controllaTesto(t, { a, b, testoDati, altriNomi: ['DeepSeek V4 Pro'] });
  assert.ok(e.some((x) => x.includes('number not in DATA: 0.35')), e.join(' | '));
  assert.ok(e.includes('other model named: DeepSeek V4 Pro'));
  assert.ok(e.includes('banned phrase: game-changer'));
  assert.ok(e.includes('em dash'));
});

test('chi vince: come la riga «Call» dei fatti', () => {
  const ok = { a, b, testoDati, leader: 'Qwen 3.6 Plus' };
  assert.deepEqual(controllaTesto(buono(), ok), []);
  // 17/11: Qwen 3.6 aveva chiamato «too small to call» un distacco che per il sito è un vantaggio
  const t = buono(); t.sezioni[0].testo += ' The gap is too small to call.';
  assert.ok(controllaTesto(t, ok).some((x) => x.includes('real lead')));
  const pari = controllaTesto(buono(), { ...ok, leader: 'even' });
  assert.ok(pari.some((x) => x.includes('about even')), pari.join(' | '));
  const t2 = buono(); t2.intro = 'Qwen 3.6 Plus and Gemma 4 31B are about even, so people pick each about half the time. ' + 'Filler words here. '.repeat(3);
  assert.ok(!controllaTesto(t2, { ...ok, leader: 'even' }).some((x) => x.startsWith('intro')));
  const t3 = buono(); t3.intro = 'Gemma 4 31B is the one most people meet first.';
  assert.ok(controllaTesto(t3, ok).includes('intro: must say Qwen 3.6 Plus is ahead'));
});

test('numeri interi contro interi: «62 675» vale 62675, un pezzo di un altro numero non basta', () => {
  const dati = 'votes 62675, coding 1686, size 2780.1 B';
  const t = buono(); t.intro += ' It has 62 675 votes and 1,686 points in coding, size 2 780.1 B.';
  const testo = (x) => controllaTesto(x, { a, b, testoDati: `${testoDati} ${dati}` }).filter((e) => e.startsWith('number'));
  assert.deepEqual(testo(t), []);
  const t2 = buono(); t2.intro += ' It has 627 votes and 268 fans.';
  assert.deepEqual(testo(t2), ['number not in DATA: 627', 'number not in DATA: 268']);
});

test('struttura: titolo con i due punti, sezioni e lunghezza', () => {
  const t = buono(); t.angolo = 'Winner: Qwen'; t.sezioni = t.sezioni.slice(0, 1);
  const e = controllaTesto(t, { a, b, testoDati });
  assert.ok(e.includes('angolo: no colon or pipe'));
  assert.ok(e.some((x) => x.startsWith('sezioni: 1')));
  assert.ok(e.some((x) => x.startsWith('length:')));
  assert.deepEqual(controllaTesto(null, { a, b, testoDati }), ['no JSON object']);
});

test('il nome di un modello dentro il nome della coppia non conta come «altro modello»', () => {
  // «Qwen 3.6» è dentro «Qwen 3.6 Plus»: il generatore lo toglie dagli altri nomi, e il controllo toglie i due nomi prima di cercare
  assert.deepEqual(controllaTesto(buono(), { a, b, testoDati, altriNomi: ['Gemma 4 31B Instruct'] }), []);
});

test('scelta: prima i testi smentiti, poi le coppie nuove con un modello appena arrivato, poi i vecchi', () => {
  const m = (nome, punti, primo) => ({ nome, primo, cat: { chat: { punti } } });
  const c = (x, y, file) => ({ a: x, b: y, file });
  const vecchioM = m('Vecchio', 1300, '2026-05-01'), nuovoM = m('Nuovo', 1300, '2026-11-12'), forte = m('Forte', 1500, '2026-06-01'), altro = m('Altro', 1490, '2026-06-01');
  const coppie = [c(forte, altro, 'compare/forte-altro.html'), c(vecchioM, nuovoM, 'compare/v-n.html'), c(forte, vecchioM, 'compare/smentita.html'), c(altro, vecchioM, 'compare/vecchia.html'), c(forte, nuovoM, 'compare/fresca-forte.html')];
  const fatti = { leader: 'Forte', gratisA: 'x', gratisB: 'y' };
  const testi = {
    'compare/smentita.html': { aggiornato: '2026-11-15', fatti: { ...fatti, leader: 'Vecchio' } },
    'compare/vecchia.html': { aggiornato: '2026-09-01', fatti },
  };
  const ordine = scegliCoppie(coppie, testi, () => fatti, { max: 10, oggi: '2026-11-17' }).map((x) => x.file);
  assert.deepEqual(ordine, ['compare/smentita.html', 'compare/fresca-forte.html', 'compare/v-n.html', 'compare/forte-altro.html', 'compare/vecchia.html']);
  assert.equal(scegliCoppie(coppie, testi, () => fatti, { max: 2, oggi: '2026-11-17' }).length, 2);
});

test('testo ancora vero solo con stesso vincitore e stesso «gratis»', () => {
  const f = { leader: 'Qwen 3.6 Plus', gratisA: 'free API on OpenRouter', gratisB: 'download and run at home' };
  const t = componi(buono(), { a, b, fatti: f, oggi: '2026-11-17' });
  assert.equal(t.scritto, '2026-11-17');
  assert.equal(t.fatti.dataArena, '2026-11-16');
  assert.ok(testoAncoraVero(t, f));
  assert.ok(!testoAncoraVero(t, { ...f, leader: 'even' }));
  assert.ok(!testoAncoraVero(t, { ...f, gratisA: '—' }));
  assert.ok(!testoAncoraVero(null, f));
});

test('leggiTesti: un file per coppia, chiave = pagina', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'confronti-'));
  fs.writeFileSync(path.join(d, 'a-vs-b.json'), JSON.stringify({ angolo: 'x' }));
  assert.deepEqual(Object.keys(leggiTesti(d)), ['compare/a-vs-b.html']);
  assert.deepEqual(leggiTesti(path.join(d, 'manca')), {});
});
