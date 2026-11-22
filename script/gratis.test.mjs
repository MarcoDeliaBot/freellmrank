// Prova della regola del «gratis» (22/11/2026). Uso: node --test script/gratis.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { tipoGratis, gratis, etichetta, SPIEGA } from './gratis.mjs';

test('tre tipi di gratis, dal più solido', () => {
  assert.equal(tipoGratis({ nome: 'X', aperto: true, or: { gratis: true } }), 'aperto');
  assert.equal(tipoGratis({ nome: 'X', aperto: false, or: { gratis: true } }), 'api');
  assert.equal(tipoGratis({ nome: 'X', aperto: false, api: { tipo: 'free tier' } }), 'api');
  assert.equal(tipoGratis({ nome: 'X', aperto: false, api: { tipo: 'trial' } }), 'prova');
  assert.equal(tipoGratis({ nome: 'Claude Fable 5.2', aperto: false, or: { gratis: false }, api: null }), null);
});

test('senza il campo api nei dati, si calcola dal nome (Gemini e Qwen veri della lista)', () => {
  assert.equal(tipoGratis({ nome: 'Gemini 3.8 Flash (High)', aperto: false }), 'api');
  assert.equal(tipoGratis({ nome: 'Qwen3.8-Max', aperto: false }), 'prova');
  // controllo negativo: un modello a pagamento resta fuori
  assert.equal(gratis({ nome: 'Claude Fable 5.2 (xHigh)', aperto: false }), false);
  // api: null nei dati vince sul nome (il dato è la fonte)
  assert.equal(tipoGratis({ nome: 'Gemini 3.8 Flash (High)', aperto: false, api: null }), null);
});

test('etichette e spiegazioni: le API e le prove dicono che non sono per sempre', () => {
  assert.equal(etichetta({ nome: 'Qwen3.8-Max', aperto: false }), 'free trial');
  assert.match(SPIEGA.api, /can change or end/);
  assert.match(SPIEGA.prova, /After that you pay/);
  assert.match(SPIEGA.aperto, /Free forever/);
});
