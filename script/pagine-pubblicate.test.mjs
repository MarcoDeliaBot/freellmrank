import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { RADICE } from './sito/comune.mjs';
import { unisci } from './sito/modelli.mjs';
import { osserva, emptyArchive, salva, leggi, preparaPubblicate, filePerURL, verificaPubblicate, linguePagine, unisciRegistri } from './sito/pagine-pubblicate.mjs';
import { controllaPubblicate } from './controlla-pagine.mjs';

const evidence = path.join(RADICE, '.ai/modelli-permanenti-evidence');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const html = (output, url) => fs.readFileSync(path.join(output, filePerURL(url)), 'utf8');
const run = (args, env, log) => {
  const r = spawnSync(process.execPath, args, { cwd: RADICE, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 240000, maxBuffer: 8e6 });
  fs.writeFileSync(path.join(evidence, log), (r.stdout || '') + (r.stderr || ''));
  assert.equal(r.status, 0, r.stderr || r.stdout || r.error?.message);
  return r.stdout;
};
const modelExamples = ['kimi-k2-5-thinking-moonshot','hunyuan-hy3-preview','llama2-70b-steerlm-chat','ibm-granite-h-small','c4ai-aya-expanse-8b','dolly-v2-12b','flux-2-dev-bfl','deepseek-v3-2-exp','deepseek-v4-flash-high-preview','codellama-70b-instruct','gemma-3-27b-it-google'];
const pairExamples = ['deepseek-v4-1-flash-max-vs-kimi-k2-5-thinking','deepseek-v4-1-flash-max-vs-glm-5','deepseek-v4-pro-high-20260813-vs-mimo-v2-5-pro','deepseek-v4-1-flash-max-vs-nvidia-nemotron-3-ultra-550b-a55b-nvfp4'];

test('permanent publications T1–T7', { timeout: 480000 }, async t => {
  fs.mkdirSync(evidence, { recursive: true });
  const results = {}, registry = json(path.join(RADICE, 'dati/pagine-pubblicate.json'));
  const root = fs.mkdtempSync(path.join(evidence, 'half-')), output = path.join(root, 'site');
  const data = json(path.join(RADICE, 'sito/data.json')), history = json(path.join(RADICE, 'sito/history.json'));
  let fixture, env, server, base, maxActive = 0, active = 0;
  t.after(() => { server?.close(); salva(evidence, 'T1-T7.json', results); });

  await t.test('T1 every supplied example and counts by type and language', () => {
    const examples = [...modelExamples.map(s => `/model/${s}.html`), ...pairExamples.map(s => `/compare/${s}.html`), '/blog/week-2026-08-30.html'];
    for (const url of examples) for (const language of linguePagine)
      assert(registry.some(p => p.url === (language === 'en' ? '' : '/' + language) + url), `${language}${url}`);
    assert.equal(new Set(registry.map(p => p.url)).size, registry.length);
    results.T1 = { passed: true, examples: examples.length, urls: registry.length, perLingua: Object.fromEntries(linguePagine.map(l => [l, Object.fromEntries(['modello','confronto','articolo'].map(tipo => [tipo, registry.filter(p => p.lingua === l && p.tipo === tipo).length]))])) };
  });
  await t.test('workflow rebase recovery preserves both registries and the newest snapshots', () => {
    const left = { registry: [registry[0]], archive: { ...emptyArchive(), modelli: { left: { data: '2026-10-31' }, shared: { data: '2026-10-31' } } } };
    const right = { registry: [registry[1], { ...registry[0], primaVista: '2026-10-01', ultimaVista: '2026-10-30' }], archive: { ...emptyArchive(), modelli: { right: { data: '2026-10-31' }, shared: { data: '2026-10-30' } } } };
    const merged = unisciRegistri(left, right);
    assert.equal(merged.registry.length, 2);
    assert.equal(merged.registry.find(p => p.url === registry[0].url).primaVista, '2026-10-01');
    assert.deepEqual(Object.keys(merged.archive.modelli).sort(), ['left','right','shared']);
    assert.equal(merged.archive.modelli.shared.data, '2026-10-31');
    assert.throws(() => unisciRegistri(left, { ...right, registry: [{ ...registry[0], tipo: 'invalid' }] }), /type changed/);
    results.workflowRecovery = { passed: true, union: true, newestSnapshot: true, typeMismatchRejected: true };
  });

  await t.test('T2 complete build with half of today’s models removed, all registered routes HTTP200', async () => {
    const models = unisci(data, history), removed = models.filter((_, i) => i % 2 === 0);
    const keys = new Set(removed.flatMap(m => [m.nome, ...Object.values(m.nomi), m.hf?.repo, m.or?.id].filter(Boolean)));
    fixture = structuredClone(data);
    const keep = m => ![m.nome, m.hf?.repo, m.or?.id].some(k => k && keys.has(k));
    for (const c of fixture.categorie) c.modelli = c.modelli.filter(keep);
    fixture.piccoli = fixture.piccoli.filter(keep); fixture.nuovi = fixture.nuovi.filter(keep);
    const remaining = unisci(fixture, history).length;
    assert(remaining <= Math.ceil(models.length / 2) && remaining > models.length * 0.4);
    fs.mkdirSync(output, { recursive: true });
    for (const file of ['pagine-pubblicate.json','pagine-archivio.json','skill-pagine.json']) salva(root, `dati/${file}`, json(path.join(RADICE, 'dati', file)));
    fs.cpSync(path.join(RADICE, 'traduzioni'), path.join(root, 'traduzioni'), { recursive: true, filter: p => !p.includes('mancanti') && !p.includes('da-tradurre') && !p.includes('parti') });
    salva(output, 'data.json', fixture); salva(output, 'history.json', history);
    env = { PAGINE_ROOT: root, SITO_OUTPUT: output, TRADUZIONI_ROOT: path.join(root, 'traduzioni') };
    for (const [i, script] of ['costruisci-sito','traduci','controlla-pagine','controlla-link'].entries()) run([`script/${script}.mjs`], env, `T2-${i}-${script}.log`);
    const fixtureRegistry = leggi(root, 'dati/pagine-pubblicate.json');
    verificaPubblicate(fixtureRegistry, output);
    server = http.createServer((req, res) => {
      active++; maxActive = Math.max(active, maxActive);
      let url = decodeURIComponent(new URL(req.url, 'http://local').pathname);
      const raw = path.join(output, url.replace(/^\//, ''));
      const file = [raw, raw + '.html', path.join(raw, 'index.html')].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
      setTimeout(() => { active--; if (file) { res.writeHead(200); res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(file)); } else { res.writeHead(404); res.end('Missing'); } }, 1);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    let checked = 0;
    for (let i = 0; i < fixtureRegistry.length; i += 8) await Promise.all(fixtureRegistry.slice(i, i + 8).map(async p => {
      const r = await fetch(base + p.url, { method: 'HEAD' }); assert.equal(r.status, 200, p.url); await r.body?.cancel(); checked++;
    }));
    results.T2 = { passed: true, before: models.length, after: remaining, removed: models.length - remaining, registeredBefore: registry.length, registeredAfter: fixtureRegistry.length, http200: checked, missing: 0, fixtureRoot: root, maxConcurrency: maxActive };
  });

  await t.test('T3 old page contains its last scores/date, warning, alternatives and self canonical', () => {
    const url = '/model/deepseek-v4-1-flash-max.html', h = html(output, url);
    const saved = leggi(root, 'dati/pagine-archivio.json').modelli[url];
    assert(h.includes('No longer in the Arena ranking since'));
    assert(h.includes('Last known data:') && h.includes(saved.data));
    for (const c of Object.values(saved.modello.cat)) assert(h.includes(String(c.punti)) && h.includes(`#${c.pos}`));
    assert(h.includes(saved.modello.hf.repo) && h.includes(String(saved.modello.hf.b)));
    assert(!h.includes('content="noindex"')); assert(h.includes(`href="https://freellmarena.com${url.replace(/\.html$/, '')}"`));
    assert(h.includes('Current alternatives'));
    const comparison = '/compare/deepseek-v4-1-flash-max-vs-kimi-k2-5-thinking.html';
    assert(html(output, comparison).includes('No longer in the Arena ranking since'));
    results.T3 = { passed: true, url, comparison, lastData: saved.data, scores: Object.keys(saved.modello.cat).length };
  });

  await t.test('T4 same HF identity renames; similar names with different repositories do not', () => {
    const renameRoot = path.join(evidence, 'rename'), seed = unisci(data, history).find(m => m.cat.chat && m.hf);
    const make = (name, slug, repo) => ({ ...structuredClone(seed), nome: name, slug, href: `/model/${slug}.html`, chiave: repo, hf: { ...seed.hf, repo }, or: null, nomi: { chat: name } });
    const old = make('Fixture Old Name', 'fixture-old-name', 'fixture/same-repository');
    const hy3 = make('Fixture Hy3 preview', 'fixture-hy3-preview', 'fixture/hy3');
    const renamed = make('Fixture New Name', 'fixture-new-name', 'fixture/same-repository');
    const hy4 = make('Fixture Hy4 preview', 'fixture-hy4-preview', 'fixture/hy4');
    const archive = emptyArchive(), records = [];
    osserva({ registry: records, archive, modelli: [old, hy3], coppie: [], blog: [], date: '2026-10-30' });
    salva(renameRoot, 'dati/pagine-pubblicate.json', records); salva(renameRoot, 'dati/pagine-archivio.json', archive);
    const prepared = preparaPubblicate({ root: renameRoot, modelli: [renamed, hy4], coppie: [], blog: [], date: '2026-10-31' });
    assert.equal(prepared.modelli.find(m => m.href === old.href).pubblicazione.stato, 'rinominata');
    assert.equal(prepared.modelli.find(m => m.href === hy3.href).pubblicazione.stato, 'fuori-classifica');
    salva(renameRoot, 'models.json', prepared.modelli);
    const renameOutput = path.join(renameRoot, 'site');
    run(['--input-type=module','-e', `import fs from 'node:fs';import {pagineModelli} from './script/sito/modelli.mjs';pagineModelli(JSON.parse(fs.readFileSync('sito/data.json')),null,JSON.parse(fs.readFileSync(process.env.PAGINE_ROOT+'/models.json')),[]);`], { PAGINE_ROOT: renameRoot, SITO_OUTPUT: renameOutput }, 'T4-render.log');
    const h = html(renameOutput, old.href);
    assert(h.includes('This model changed name: it is now <a href="/model/fixture-new-name.html">Fixture New Name</a>'));
    assert(!html(renameOutput, hy3.href).includes('This model changed name'));
    fs.cpSync(path.join(RADICE, 'traduzioni'), path.join(renameRoot, 'traduzioni'), { recursive: true, filter: p => !p.includes('mancanti') && !p.includes('da-tradurre') && !p.includes('parti') });
    salva(renameOutput, 'data.json', data);
    fs.writeFileSync(path.join(renameOutput, 'sitemap.xml'), '<?xml version="1.0"?><urlset></urlset>');
    run(['script/traduci.mjs'], { PAGINE_ROOT: renameRoot, SITO_OUTPUT: renameOutput, TRADUZIONI_ROOT: path.join(renameRoot, 'traduzioni') }, 'T4-translate.log');
    for (const l of linguePagine.filter(l => l !== 'en')) {
      const localized = html(renameOutput, `/${l}${old.href}`);
      assert(localized.includes('data-stato="rinominata"') && !localized.includes('This model changed name'));
      assert(localized.includes(`href="/${l}/model/fixture-new-name.html"`));
    }
    // Regression: chat can disappear while the same model remains in vision.
    const categoryRoot = path.join(evidence, 'category-regression'), categoryArchive = emptyArchive(), categoryRegistry = [];
    old.cat.vision = structuredClone(old.cat.chat);
    const pair = { href: '/compare/fixture-old-name-vs-fixture-hy3-preview.html', a: old, b: hy3 };
    osserva({ registry: categoryRegistry, archive: categoryArchive, modelli: [old, hy3], coppie: [pair], blog: [], date: '2026-10-30' });
    salva(categoryRoot, 'dati/pagine-pubblicate.json', categoryRegistry); salva(categoryRoot, 'dati/pagine-archivio.json', categoryArchive);
    const partial = structuredClone(old); delete partial.cat.chat;
    const retained = preparaPubblicate({ root: categoryRoot, modelli: [partial, hy3], coppie: [], blog: [], date: '2026-10-31' });
    assert(retained.coppie[0].a.cat.chat);
    assert.equal(retained.coppie[0].a.pubblicazione.stato, 'fuori-classifica');
    assert.equal(retained.modelli.find(m => m.href === old.href).pubblicazione.stato, 'attiva');
    results.T4 = { passed: true, positive: old.href, destination: renamed.href, negative: hy3.href, fixtureRoot: renameRoot, translatedRenames: 6, partialCategoryRegression: true };
  });

  await t.test('T5 automatic SEO/sitemap gate, missing page and title mismatch rejected', () => {
    const check = controllaPubblicate(root, output); assert.deepEqual(check.errors, []);
    const file = path.join(output, 'model/c4ai-aya-expanse-8b.html'), saved = fs.readFileSync(file);
    fs.unlinkSync(file); assert.throws(() => verificaPubblicate(registry, output), /Published pages missing/);
    fs.writeFileSync(file, saved.toString().replace(/<title>[^<]+<\/title>/, '<title>Wrong title</title>'));
    assert(controllaPubblicate(root, output).errors.some(e => e.includes('title must equal H1')));
    fs.writeFileSync(file, saved);
    for (const l of linguePagine.filter(l => l !== 'en')) {
      const h = html(output, `/${l}/model/c4ai-aya-expanse-8b.html`);
      assert(h.includes('data-stato="fuori-classifica"')); assert(!h.includes('No longer in the Arena ranking since'));
      assert(!h.includes('Last known data:'));
      assert(fs.existsSync(path.join(output, l, 'sitemap.xml')));
    }
    results.T5 = { passed: true, ...check, missingPageRejected: true, badTitleRejected: true, translatedWarnings: 6 };
  });

  await t.test('T7 real --prova CLI includes URLs absent from sitemap and reports a synthetic404', async () => {
    const records = leggi(root, 'dati/pagine-pubblicate.json');
    records.push({ url: '/model/fixture-does-not-exist.html' });
    salva(root, 'dati/pagine-pubblicate.json', records);
    const skills = leggi(root, 'dati/skill-pagine.json'); skills.push({ url: '/skills/fixture-does-not-exist.html' });
    salva(root, 'dati/skill-pagine.json', skills);
    const report = path.join(evidence, 'T7-health.json');
    let result;
    try { result = await promisify(execFile)(process.execPath, ['script/controlla-salute.mjs','--prova','--solo-pagine',`--sito=${base}`,`--radice=${root}`,`--json=${report}`], { cwd: RADICE, timeout: 120000, maxBuffer: 4e6 }); }
    catch (e) { assert.equal(e.code, 1); result = e; }
    fs.writeFileSync(path.join(evidence, 'T7-cli.log'), result.stdout + result.stderr);
    const health = json(report);
    assert(health.rotte.some(p => p.includes('/model/fixture-does-not-exist.html → 404')));
    assert(health.rotte.some(p => p.includes('/skills/fixture-does-not-exist.html → 404')));
    assert.equal(health.rotte.length, 2); assert(health.onlyRegistry >= 2); assert(maxActive <= 8);
    records.pop(); skills.pop(); salva(root, 'dati/pagine-pubblicate.json', records); salva(root, 'dati/skill-pagine.json', skills);
    results.T7 = { passed: true, ...health, maxConcurrency: maxActive, dryRun: true, issuesCreated: 0 };
  });
});
