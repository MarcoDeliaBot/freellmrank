// Prove del filtro «quali notizie diventano video» (24/11/2026). Uso: node --test script/brag/notizia-filtro.test.mjs
// Titoli veri presi da contenuti/notizie (novembre 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { diventaVideo, aziendale } from './notizia-filtro.mjs';

const n = (titolo, tema = 'Software', extra = {}) => ({ titolo, tema, descr: '', paragrafi: [], fonti: [], ...extra });

test('notizie sulle aziende senza niente da usare gratis: niente video', () => {
  for (const x of [
    n('Anthropic announces closing of initial public offering, including full exercise of underwriters option', 'Business'),
    n('Boltz raises $110M Series A to accelerate AI-driven small-molecule research', 'Business'),
    n("Trump backs Jensen Huang's reinstatement as Nvidia CEO, cites no security risk", 'Policy'),
    n('OpenAI partners with NATO to boost allied cyber defenses using AI', 'Policy'),
    // «GitHub» solo in un paragrafo non basta
    n('Linear hits $100M ARR with AI-driven agent platform and no SDRs', 'Business', { paragrafi: ['Teams link GitHub issues.'] }),
    // tema diverso ma titolo di soldi o dirigenti
    n('Apple hires engineers to build its own multi-app AI agent for macOS', 'Research'),
  ]) assert.equal(diventaVideo(x), false, x.titolo);
});

test('modelli, strumenti e cose gratis: il video si fa', () => {
  for (const x of [
    n('Z.ai launches GLM-5.4, a 750-billion-parameter Loop Transformer model', 'LLMs'),
    n('tiny-voca: 4.5M-parameter English TTS model runs on CPU and browsers'),
    n('DeepMind uses Gemini 4 agents to cut quantum algorithm costs up to 290x', 'Research'),
    // aziendale ma con qualcosa da usare gratis
    n('Google rebrands Spark as free Tasks agent with usage limits', 'Business'),
    n('OpenAI and Cisco launch Shirudo, an open-source eBPF runtime for live Linux protection', 'Business'),
    n('Baseten launches Bison-1 decision model', 'Business', { fonti: [{ url: 'https://huggingface.co/baseten/bison-1' }] }),
  ]) assert.equal(diventaVideo(x), true, x.titolo);
});

test('controllo positivo: il filtro riconosce le aziende anche senza tema', () => {
  assert.equal(aziendale(n('Humyn Labs raises $47M to train robots', '')), true);
  assert.equal(aziendale(n('sensenova launches SenseNova-Loop-9B on Hugging Face', 'LLMs')), false);
});
