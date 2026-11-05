// Prove delle immagini della fonte nei video (5/11/2026): scelta della fonte (mai i giornali), immagini del README
// senza badge, scene inserite prima della chiusura, Short con la foto stretta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { repoDi, scegliFonte, immaginiReadme, conMedia } from '../video-hf/media-fonte.mjs';
import { pianoBreve } from '../video-hf/breve.mjs';
import { STAMPI } from '../video-hf/stampi/index.mjs';

test('repoDi riconosce i repo e scarta le pagine di GitHub che non sono repo', () => {
  assert.deepEqual(repoDi('https://github.com/N1nEmAn/sapper-v2'), { owner: 'N1nEmAn', repo: 'sapper-v2' });
  assert.deepEqual(repoDi('https://github.com/a/b.git'), { owner: 'a', repo: 'b' });
  assert.equal(repoDi('https://github.com/trending/python'), null);
  assert.equal(repoDi('https://techcrunch.com/x'), null);
});

test('la fonte: ufficiale prima, poi GitHub, mai un giornale', () => {
  const giornale = { url: 'https://techcrunch.com/a', ufficiale: false };
  assert.equal(scegliFonte({ fonti: [giornale] }), null);
  assert.equal(scegliFonte({ fonti: [giornale, { url: 'https://github.com/a/b', ufficiale: false }] }).url, 'https://github.com/a/b');
  assert.equal(scegliFonte({ fonti: [{ url: 'https://github.com/a/b' }, { url: 'https://openai.com/x', ufficiale: true }] }).url, 'https://openai.com/x');
});

test('immagini del README: percorsi relativi sul file grezzo, badge e svg scartati, niente doppioni', () => {
  const md = `![build](https://img.shields.io/badge/x.svg) ![demo](docs/demo.png) <img src="./a.jpg" alt="Arch">
![d](docs/demo.png) ![x](https://github.com/o/r/blob/main/b.webp) ![l](logo.svg)`;
  const im = immaginiReadme(md, { owner: 'o', repo: 'r' });
  assert.deepEqual(im.map((x) => x.url), [
    'https://raw.githubusercontent.com/o/r/HEAD/docs/demo.png',
    'https://raw.githubusercontent.com/o/r/main/b.webp',
    'https://raw.githubusercontent.com/o/r/HEAD/a.jpg',
  ]);
});

const piano = { scene: [{ stampo: 'titolo', voce: 'a' }, { stampo: 'punti', voce: 'b' }, { stampo: 'numero', voce: 'c' }, { stampo: 'chiusura', voce: '' }] };
const pagina = { media: 'p-larga.png', mediaVerticale: 'p-stretta.png', rapporto: 1.6, rapportoVerticale: 0.875, didascalia: 'github.com/o/r', credito: 'Screenshot of the source page' };

test('le scene con le immagini stanno fra apertura e chiusura e sono valide', () => {
  const m = { pagina, gh: true, credito: 'o/r · README', immagini: [{ media: 'i1.png', alt: 'Demo run' }, { media: 'i2.png', alt: '' }] };
  const p = conMedia(piano, m);
  assert.deepEqual(p.scene.map((s) => s.stampo), ['titolo', 'immagine', 'punti', 'griglia', 'numero', 'chiusura']);
  for (const s of p.scene.filter((x) => x.media)) assert.deepEqual(STAMPI[s.stampo].valida(s.dati), [], s.stampo);
  assert.deepEqual(p.scene[3].dati.immagini.map((x) => x.etichetta), ['Demo run', 'Preview 2']);
  // rilanciato sul piano già fatto non raddoppia
  assert.deepEqual(conMedia(p, m).scene.map((s) => s.stampo), p.scene.map((s) => s.stampo));
  // le voci nuove non portano numeri
  for (const s of p.scene.filter((x) => x.media)) assert.doesNotMatch(s.voce, /\d/);
});

test('solo la pagina, o solo un\'immagine: una scena sola, mai dopo la chiusura', () => {
  assert.deepEqual(conMedia(piano, { pagina, immagini: [] }).scene.map((s) => s.stampo), ['titolo', 'immagine', 'punti', 'numero', 'chiusura']);
  const una = conMedia(piano, { pagina: null, gh: false, credito: 'Image: x.com', immagini: [{ media: 'i.webp', rapporto: 1.5, alt: '' }] });
  assert.equal(una.scene.at(-1).stampo, 'chiusura');
  assert.equal(una.scene.filter((s) => s.media).length, 1);
});

test('lo Short prende la pagina nella foto stretta e le immagini', () => {
  const p = conMedia(piano, { pagina, gh: true, credito: 'o/r · README', immagini: ['i1', 'i2', 'i3', 'i4'].map((x) => ({ media: x + '.png', alt: '' })) });
  const b = pianoBreve(p);
  assert.deepEqual(b.scene.map((s) => s.stampo), ['titolo', 'immagine', 'numero', 'griglia', 'chiusura']);
  assert.equal(b.scene[1].dati.media, 'p-stretta.png');
  assert.equal(b.scene[1].dati.rapporto, 0.875);
  assert.equal(b.scene[3].dati.immagini.length, 2);
  // senza immagini lo Short resta come prima
  assert.deepEqual(pianoBreve(piano).scene.map((s) => s.stampo), ['titolo', 'numero', 'chiusura']);
});
