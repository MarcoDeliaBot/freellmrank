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
});

test('aperture buone accettate (controllo positivo)', () => {
  assert.deepEqual(gancio('Google just launched an API that answers 1,000 questions in one go. But the price is the real story.'), []);
  assert.deepEqual(gancio('A free model now beats GPT-6 at coding.'), []);
  assert.deepEqual(gancio('Kimi K3 is open, and you can run it at home.'), []);
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
