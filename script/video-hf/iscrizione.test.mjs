// Prove della richiesta di iscrizione nei video nuovi (24/11/2026). Uso: node --test script/video-hf/iscrizione.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { conIscrizione, posizione, scenaIscrizione, filtroShort, FRASE, ETICHETTA } from './iscrizione.mjs';
import { STAMPI } from './stampi/index.mjs';

const s = (etichetta, stampo = 'punti', extra = {}) => ({ stampo, etichetta, voce: 'x', dati: {}, ...extra });
// la forma del piano di un video «Hardware Needed» (script/brag/modello.mjs)
const modello = { formato: 'orizzontale', scene: [s('New open model', 'nome'), s('What it is'), s('Benchmarks'), s('Hardware', 'barre'), s('Use it free'), s('FreeLLMArena', 'chiusura')] };

test('nel video lungo la frase va subito dopo il risultato (Hardware), non all inizio', () => {
  const p = conIscrizione(modello);
  assert.deepEqual(p.scene.map((x) => x.etichetta), ['New open model', 'What it is', 'Benchmarks', 'Hardware', ETICHETTA, 'Use it free', 'FreeLLMArena']);
  assert.equal(p.scene[4].voce, FRASE);
  assert.equal(FRASE, "We test a new free AI model every day. Subscribe so you don't miss the next one.");
  // il piano di partenza non cambia
  assert.equal(modello.scene.length, 6);
});

test('senza una scena di risultato: prima della chiusura, mai come prima scena', () => {
  assert.equal(posizione([s('Intro', 'titolo'), s('Story'), s('Sources'), s('End', 'chiusura')]), 3);
  assert.equal(posizione([s('Intro', 'titolo'), s('End', 'chiusura')]), 1);
  // «Hardware» nella prima scena non conta: la frase non va mai all'inizio
  assert.equal(posizione([s('Hardware test intro', 'titolo'), s('Story'), s('End', 'chiusura')]), 2);
});

test('una volta sola, mai negli Short, e si può spegnere per un piano', () => {
  const una = conIscrizione(conIscrizione(modello));
  assert.equal(una.scene.filter((x) => x.etichetta === ETICHETTA).length, 1);
  const corto = { formato: 'verticale', scene: modello.scene };
  assert.equal(conIscrizione(corto), corto);
  const spento = { ...modello, senzaIscrizione: true };
  assert.equal(conIscrizione(spento), spento);
});

test('la scena passa il controllo dello stampo «titolo» e resta la frase di Marco', () => {
  const sc = scenaIscrizione();
  assert.deepEqual(STAMPI[sc.stampo].valida(sc.dati), []);
  // la frase di Marco, parola per parola: 17 parole (la durata vera la misura l anteprima)
  assert.equal(FRASE.split(/\s+/).length, 17);
});

test('Short: scritta solo negli ultimi 2 secondi', () => {
  const f = filtroShort(31.5);
  assert.match(f, /enable='gte\(t,29\.50\)'/);
  assert.equal(f.match(/enable=/g).length, 3);
  assert.match(f, /text='Full test on the channel\.'/);
  assert.match(f, /text='Subscribe'/);
  // un video più corto di 2 secondi: dall'inizio
  assert.match(filtroShort(1.5), /gte\(t,0\.00\)/);
});
