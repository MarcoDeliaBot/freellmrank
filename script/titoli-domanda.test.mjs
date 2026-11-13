// Prova della domanda per i commenti (13/11/2026, missione di Marco «diventare virali e seguiti»).
// Uso: node --test script/titoli-domanda.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { metaYoutube, domandaValida, domandaDiRiserva, RICHIESTA_YT } from './brag/titoli-yt.mjs';

const base = { n: { titolo: 'Meta launches Muse Ember', descr: 'Meta launched Muse Ember.' }, regge: () => true, nomi: ['Meta', 'Muse Ember'], url: 'https://freellmarena.com/blog/x', righeFonti: 'Meta: https://ai.meta.com' };

test('domanda buona: in descrizione, subito dopo la prima frase', () => {
  const r = metaYoutube({ ...base, yt: { domanda: 'Would you switch to Muse Ember for agent tasks?' } });
  assert.equal(r.domanda, 'Would you switch to Muse Ember for agent tasks?');
  const righe = r.descrizione.split('\n').filter(Boolean);
  assert.equal(righe[1], '💬 Would you switch to Muse Ember for agent tasks? Tell us in the comments.');
});

test('domande scartate: con numeri, senza «?», troppo lunghe, con nomi fuori dalla notizia', () => {
  assert.equal(domandaValida('Is it 10 times faster?'), '');
  assert.equal(domandaValida('Tell us what you think.'), '');
  assert.equal(domandaValida(`Would you ${'really '.repeat(20)}try it?`), '');
  assert.equal(domandaValida('Would you pick GPT-Z?', (t) => !t.includes('GPT-Z')), '');
});

test('senza domanda valida: domanda di riserva col primo nome della notizia', () => {
  const r = metaYoutube({ ...base, yt: { domanda: 'Is it 10 times faster?' } });
  assert.equal(r.domanda, 'Would you use Muse Ember? Why or why not?');
  assert.ok(r.tolti.some((x) => x.startsWith('domanda: Is it 10')), 'la domanda scartata va nel registro');
  assert.ok(metaYoutube({ ...base, yt: {} }).tolti.some((x) => x.includes('non l')), 'anche se manca');
  assert.equal(domandaDiRiserva([], false), 'Would you use this? Why or why not?');
  assert.equal(domandaDiRiserva(['X'], true), 'Which tool should we try next?');
});

test('al modello si chiedono titolo con un fatto concreto e la domanda', () => {
  assert.match(RICHIESTA_YT, /"domanda"/);
  assert.match(RICHIESTA_YT, /most surprising concrete fact/);
});

test('il commento di n8n usa la domanda del video', () => {
  const w = JSON.parse(fs.readFileSync(new URL('../n8n/commento-youtube.json', import.meta.url), 'utf8'));
  const c = w.nodes.find((x) => x.name === 'Prepara il testo').parameters.jsCode;
  const testoCommento = new Function(c.slice(0, c.indexOf('// 26/10/2026')) + '; return testoCommento;')();
  const fatto = testoCommento('Muse Ember', 'Meta launched Muse Ember.\n\n💬 Would you switch to Muse Ember? Tell us in the comments.\n\nFull story: https://freellmarena.com/blog/x');
  assert.match(fatto, /\nWould you switch to Muse Ember\?$/);
  assert.doesNotMatch(fatto, /Quick summary: 💬/);
  // controllo positivo: senza la riga resta la domanda generica di prima
  assert.match(testoCommento('Old', 'Meta launched it.\n\nFull story: https://freellmarena.com/blog/x'), /\nWhich AI story should we cover next\?$/);
});
