// Prova del gancio dei video (12/11/2026, Marco: «Aggiungi ganci nei video in modo che la gente ci segua»).
// Uso: node --test script/piano-gancio.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { gancio, APERTURE } from './video-hf/piano.mjs';
import { STAMPI } from './video-hf/stampi/index.mjs';

test('aperture deboli rifiutate', () => {
  assert.ok(gancio('Today we look at a new API from Google.').length, 'preambolo «Today»');
  assert.ok(gancio('In this video I show you something new.').length, 'preambolo «In this video»');
  assert.ok(gancio('It is a nice update for everyone.').length, 'niente di concreto');
  assert.ok(gancio('Meta FAIR releases e-means, an MIT-licensed k-means that converges up to 45 times faster on GPU and is good.').length, 'troppo lunga');
  assert.ok(gancio('').length, 'voce vuota');
  assert.ok(gancio('Meta launches Muse Ember, a low-cost model for AI agent tasks.').length, 'titolo letto (prova vera del 12/11)');
  assert.ok(gancio('A free model now beats GPT-6 at coding.').length, 'senza anello aperto');
});

test('aperture buone accettate (controllo positivo)', () => {
  assert.deepEqual(gancio('Google just launched an API that answers 1,000 questions in one go. But the price is the real story.'), []);
  assert.deepEqual(gancio('A free model now beats GPT-6 at coding. But one detail changes everything.'), []);
  assert.deepEqual(gancio('Meta now sells a model at a third of the price. And it reads video too.'), []);
});

test('il cartello può aprire', () => {
  assert.ok(APERTURE.includes('titolo') && APERTURE.includes('cartello'));
});

test('la chiusura chiede di seguire il canale, e le parole di attacco stanno nella voce', () => {
  const ch = STAMPI.chiusura;
  for (const [formato, dati] of [['orizzontale', {}], ['verticale', { invito: 'canale' }], ['verticale', { invito: 'bio' }]]) {
    const voce = ch.voceFissa(dati, formato);
    assert.match(voce, /\bFollow FreeLLMArena\b/, `${formato} ${dati.invito || ''}`);
    for (const { parola } of ch.parole(dati, formato)) assert.ok(voce.toLowerCase().includes(parola.toLowerCase()), `«${parola}» manca in «${voce}»`);
  }
});

test('i tentativi continuano se Groq risponde con JSON rotto mentre Workers è senza quota (12/11)', async () => {
  const { fermaTentativi } = await import('./video-hf/piano.mjs');
  assert.equal(fermaTentativi('workers: /api/scrivi 429: Daily writing budget used. Try tomorrow. | groq: risposta senza JSON: '), false);
  assert.equal(fermaTentativi('workers: /api/scrivi 429: Daily writing budget used. Try tomorrow.'), true);
  assert.equal(fermaTentativi('workers: /api/scrivi 401: bad key'), true);
});

test("cartello di una frase: l'anello può aprirsi all'inizio della scena 2; i numeri in lettere contano (prove del 12/11 con Qwen 3.6)", () => {
  assert.deepEqual(gancio('Google launched Gemini 4 Hydrogen for coding and agentic workflows.', 'But the speed improvements reveal why developers care.'), []);
  assert.ok(gancio('Google launched Gemini 4 Hydrogen for coding and agentic workflows.', 'Google DeepMind introduced this model on 12 November 2026.').length);
  assert.deepEqual(gancio('AWS has released a local emulator for over two hundred AWS services. It is completely free.'), []);
});
