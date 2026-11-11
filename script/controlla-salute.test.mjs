import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { controllaSalute } from './controlla-salute.mjs';

const base = 'https://esempio.test';
const radice = (urls) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'salute-'));
  fs.mkdirSync(path.join(root, 'dati'));
  fs.writeFileSync(path.join(root, 'dati/pagine-pubblicate.json'), JSON.stringify(urls.map(url => ({ url }))));
  fs.writeFileSync(path.join(root, 'dati/skill-pagine.json'), '[]');
  return root;
};
const sitemap = `<urlset>${Array.from({ length: 120 }, (_, i) => `<url><loc>${base}/pagina-${i}</loc></url>`).join('')}</urlset>`;
const risposta = (status, testo = '') => new Response(status === 200 ? testo : null, { status });
const errore = (code) => Object.assign(new TypeError('fetch failed'), { cause: { code } });
const sito = (guasti) => {
  const chiamate = {};
  const fetcher = async (url, opts = {}) => {
    if (url.endsWith('/sitemap.xml') && opts.method !== 'HEAD') return risposta(200, sitemap);
    chiamate[url] = (chiamate[url] || 0) + 1;
    const g = guasti[url];
    if (typeof g === 'function') return g(chiamate[url]);
    return risposta(g || 200);
  };
  return { fetcher, chiamate };
};

test('un errore di rete o un 500 che spariscono alla riprova non sono problemi', async () => {
  const a = `${base}/model/a.html`, b = `${base}/pt/audio`;
  const { fetcher, chiamate } = sito({
    [a]: (n) => { if (n === 1) throw errore('ECONNRESET'); return risposta(200); },
    [b]: (n) => risposta(n === 1 ? 500 : 200),
  });
  const r = await controllaSalute({ root: radice(['/model/a.html', '/pt/audio']), base, fetcher, onlyPages: true, pausa: 0 });
  assert.deepEqual(r.problemi, []);
  assert.equal(r.riprovate, 2);
  assert.deepEqual(r.perEsito, { 'TypeError (ECONNRESET)': 1, 500: 1 });
  assert.equal(chiamate[a], 2);
  assert.equal(chiamate[b], 2);
});

test('un errore che resta si segnala con la sua causa dopo tre tentativi', async () => {
  const a = `${base}/model/a.html`;
  const { fetcher, chiamate } = sito({ [a]: () => { throw errore('UND_ERR_SOCKET'); } });
  const r = await controllaSalute({ root: radice(['/model/a.html']), base, fetcher, onlyPages: true, pausa: 0 });
  assert.deepEqual(r.rotte, [`${a} → TypeError (UND_ERR_SOCKET)`]);
  assert.equal(chiamate[a], 3);
});

test('un 404 è una risposta vera: si segnala subito, senza riprove', async () => {
  const a = `${base}/it/blog/x`;
  const { fetcher, chiamate } = sito({ [a]: 404 });
  const r = await controllaSalute({ root: radice(['/it/blog/x']), base, fetcher, onlyPages: true, pausa: 0 });
  assert.deepEqual(r.rotte, [`${a} → 404`]);
  assert.equal(r.riprovate, 0);
  assert.equal(chiamate[a], 1);
});

test('un 404 su una pagina registrata oggi si riprova dopo la messa online', async () => {
  const a = `${base}/blog/news-oggi`, vecchia = `${base}/blog/news-vecchia`, ora = Date.parse('2026-11-11T15:00:00Z');
  const { fetcher } = sito({ [a]: (n) => risposta(n === 1 ? 404 : 200), [vecchia]: 404 });
  const root = radice(['/blog/news-oggi', '/blog/news-vecchia']);
  fs.writeFileSync(path.join(root, 'dati/pagine-pubblicate.json'), JSON.stringify([
    { url: '/blog/news-oggi', primaVista: '2026-11-11' }, { url: '/blog/news-vecchia', primaVista: '2026-10-01' }]));
  const r = await controllaSalute({ root, base, fetcher, onlyPages: true, pausa: 0, pausaNuove: 0, ora });
  assert.equal(r.nuoveAttese, 1);
  assert.ok(!r.problemi.some(p => p.includes('news-oggi')), 'la pagina nuova tornata 200 non è un problema');
  assert.ok(r.problemi.some(p => p.includes('news-vecchia') && p.includes('404')), 'il 404 vecchio resta segnalato');
});

test('un 404 su una pagina nuova che resta 404 si segnala', async () => {
  const a = `${base}/blog/news-oggi`, ora = Date.parse('2026-11-11T15:00:00Z');
  const { fetcher } = sito({ [a]: 404 });
  const root = radice(['/blog/news-oggi']);
  fs.writeFileSync(path.join(root, 'dati/pagine-pubblicate.json'), JSON.stringify([{ url: '/blog/news-oggi', primaVista: '2026-11-11' }]));
  const r = await controllaSalute({ root, base, fetcher, onlyPages: true, pausa: 0, pausaNuove: 0, ora });
  assert.ok(r.problemi.some(p => p.includes('news-oggi') && p.includes('404')));
});
