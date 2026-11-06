// 6/11/2026: Arena updates the license of a model in one leaderboard and not in the others
// (Kimi K3.1 Pro: "Kimi K3.1 Pro License" in Agents, still "Proprietary" in Coding).
// A model with open weights in any leaderboard is open weight in all of them.
export function apertiCoerenti(categorie, infoHf) {
  const licenze = new Map();
  for (const c of categorie) for (const m of c.modelli) if (m.aperto && !licenze.has(m.nome)) licenze.set(m.nome, m.licenza);
  const corretti = [];
  for (const c of categorie) for (const m of c.modelli) {
    if (m.aperto || !licenze.has(m.nome)) continue;
    m.aperto = true;
    m.licenza = licenze.get(m.nome);
    m.hf = infoHf(m.nome);
    corretti.push(`${c.id}: ${m.nome}`);
  }
  return corretti;
}
