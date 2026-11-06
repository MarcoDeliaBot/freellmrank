import test from 'node:test';
import assert from 'node:assert/strict';
import { apertiCoerenti } from './aperti-coerenti.mjs';

test('open weights in one leaderboard count in all of them (Kimi K3.1 Pro, 6/11/2026)', () => {
  const categorie = [
    { id: 'code', modelli: [
      { nome: 'Kimi K3.1 Pro (Max)', licenza: 'Proprietary', aperto: false, hf: null },
      { nome: 'Closed Model', licenza: 'Proprietary', aperto: false, hf: null },
    ] },
    { id: 'agent', modelli: [{ nome: 'Kimi K3.1 Pro (Max)', licenza: 'Kimi K3.1 Pro License', aperto: true, hf: { repo: 'moonshotai/Kimi-K3.1-Pro' } }] },
  ];
  const corretti = apertiCoerenti(categorie, (nome) => (nome.startsWith('Kimi') ? { repo: 'moonshotai/Kimi-K3.1-Pro', b: 2780.1 } : null));
  assert.deepEqual(corretti, ['code: Kimi K3.1 Pro (Max)']);
  const kimi = categorie[0].modelli[0];
  assert.equal(kimi.aperto, true);
  assert.equal(kimi.licenza, 'Kimi K3.1 Pro License');
  assert.equal(kimi.hf.repo, 'moonshotai/Kimi-K3.1-Pro');
  assert.equal(categorie[0].modelli[1].aperto, false);
});
