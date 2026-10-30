// Daily discovery and conservative repository review. No skill is installed or run.
import fs from 'node:fs';
import path from 'node:path';
import { api, directory, scanRepository, growth, installFrom, plain, read, write, text, slug, ROOT } from './fonti.mjs';
import { digest, validateCard, GENERIC, DISCLAIMER } from './verifica.mjs';

export function cardFrom(repo, entry, result, date, history) {
  const { scan, meta, commit } = result;
  if (!scan.passed || !scan.complete) throw Error('security gate');
  const readmePath = Object.keys(scan.texts).find(p => /^readme\.md$/i.test(p));
  const readme = scan.texts[readmePath];
  if (!readme) throw Error('README missing');
  const install = installFrom(readme, repo);
  if (!install) throw Error('no unambiguous exact installation command in README');
  const skillPaths = Object.keys(scan.texts).filter(p => /(^|\/)SKILL\.md$/.test(p));
  const skillPath = skillPaths.find(p => p.toLowerCase().includes(`/${entry.skillId.toLowerCase()}/`) || new RegExp(`^name:\\s*["']?${entry.skillId}["']?\\s*$`, 'mi').test(scan.texts[p]));
  if (!skillPath) throw Error('directory identity does not match a SKILL.md');
  const skillText = scan.texts[skillPath];
  const identity = /^name:\s*["']?([^\r\n"']+)/m.exec(skillText)?.[1]?.trim() || entry.skillId;
  const name = skillPaths.length === 1 ? /\*\*([^*]+)\*\* is an Agent Skill/i.exec(readme)?.[1] || identity : identity;
  // Prefer the README section for this skill; keep excerpts visibly attributed.
  const lines = readme.replace(/\r/g, '').split('\n');
  const relevant = lines.filter(l => !/<|!\[|skills\.sh/.test(l) && plain(l).toLowerCase().includes(name.toLowerCase()));
  let descr = relevant.map(plain).map(s => s.replace(/^[-#\s]+/, '')).find(s => s.length >= 35 && s.length <= 260 && !/^(git |cp |npx)|https?:|git@/.test(s));
  const prose = lines.filter(l => !/^\s*<|!\[|\[!\[/.test(l)).map(l => plain(l).replace(/^[-#\d.\s]+/, '')).filter(s => s.length >= 35 && s.length <= 250 && !/^(https?:|\||npx|git |cp |\[)|skills.sh|img.shields/.test(s));
  descr = prose.find(s => / is an? (?:Agent Skill|reusable|collection)|^A reusable AI agent skill/i.test(s)) || descr || prose.find(s => !/^\[/.test(s));
  if (!descr) throw Error('no usable README description');
  const usable = [...relevant.map(plain), ...prose].map(s => s.replace(/^[-#\d.\s]+/, '')).filter(s => s.length >= 25 && s.length <= 240 && !s.includes('npx') && !s.includes('http'));
  const ordered = lines.filter(l=>/^\d+\.\s/.test(l)).map(l=>plain(l.replace(/^\d+\.\s*/,''))).filter(s=>s.length>=20&&s.length<=240);
  // A collection's other skills are not features of this skill. If its README
  // gives only one catalogue sentence, defer publication rather than padding
  // three scenes with unrelated capabilities from the rest of the repository.
  const headingIndex=lines.findIndex(l=>/^#{2,4}\s/.test(l)&&plain(l).toLowerCase().includes(identity.toLowerCase()));
  let scoped=[];
  if(headingIndex>=0) {
    let end=headingIndex+1;while(end<lines.length&&!/^#{1,4}\s/.test(lines[end]))end++;
    scoped=lines.slice(headingIndex+1,end).map(l=>plain(l.replace(/^[-*\d.]+\s*/,''))).filter(s=>s.length>=25&&s.length<=240&&!s.includes('http')&&!s.includes('npx'));
  }
  const featurePool = skillPaths.length===1 && ordered.length>=3 ? ordered.slice(-3) : scoped.length>=3 ? scoped : relevant.map(l=>plain(l.replace(/^[-*]+\s*/,'')));
  const features = [...new Set(featurePool)].filter(s => s !== descr).slice(0, 3).map(s => ({ label: s.split(/\s+/).slice(0, 7).join(' '), detail: s }));
  if (features.length !== 3) throw Error('not enough README facts');
  // Usage must be in README, not an invented prompt. Prefer an actual Usage block.
  const usage = /##\s+(?:Usage|Quickstart|Quick start|How to use)[^\n]*\n([\s\S]*?)(?=\n## |$)/i.exec(readme)?.[1];
  const example = (usage && /```[^\n]*\n([^`]+)```/.exec(usage)?.[1]?.trim()) || ordered[0] || relevant.map(plain).find(s => s.length > 25 && s.length < 220);
  if (!example) throw Error('no usage example in README');
  const hosts = ['Claude Code', 'Codex', 'Gemini CLI', 'Cursor', 'Windsurf', 'OpenCode'].filter(h => readme.includes(h));
  const screenshotMatches = [...readme.matchAll(/!\[[^\]]*\]\(([^) ]+)\)|<img\b[^>]*\bsrc="([^"]+)"/g)].map(m => m[1] || m[2]);
  const screenshots = screenshotMatches.filter(p => /\.(png|jpe?g|webp)$/i.test(p) && !/^https?:/.test(p) && scan.images[p.replace(/^\.\//, '')] && !/sponsor|badge|logo|wordmark|icon|readme-tastecode/i.test(p)).slice(0, 3).map(p => ({ url: `https://raw.githubusercontent.com/${repo}/${commit.sha}/${p.replace(/^\.\//, '')}`, source: `https://github.com/${repo}/blob/${commit.sha}/${readmePath}` }));
  const fonti = [{ url: `https://github.com/${repo}/blob/${commit.sha}/${readmePath}`, testo: readme, sha256: digest(readme), tipo: 'README' }, { url: `https://github.com/${repo}/blob/${commit.sha}/${skillPath}`, testo: skillText, sha256: digest(skillText), tipo: 'SKILL.md' }];
  const hook = /that makes coding agents (.+?)(?: instead|[.!?])/.exec(descr)?.[1] || /to (produce .+?) through/.exec(descr)?.[1] || descr;
  const card = { tipo: 'skill', slug: slug(`${repo}-${identity}`), key: `agent skill ${repo} ${identity}`, name, repository: repo, commit: commit.sha, skillPath,
    titolo: `${name}: Agent Skill`, date, descr, problem: hook.split(/\s+/).slice(0, 6).join(' '), audience: hosts,
    install, example, features, limits: [...prose.filter(s=>/\b(?:requires?|needs?|supports?|limits?|only|must)\b/i.test(s)&&s.length<=180).slice(0,2), GENERIC[1], DISCLAIMER], screenshots, fonti,
    claims: [descr, install, example, ...features.flatMap(f => [f.label, f.detail])],
    ...(ordered.length>=3?{flow:ordered.slice(0,3)}:{}),
    metrics: { date, stars: meta.stargazers_count, growth7d: growth(history, repo, meta.stargazers_count, date), installs: entry.totalInstalls ?? null, installs24h: entry.trendingInstalls ?? null, license: meta.license?.spdx_id || null, lastCommit: commit.commit.committer.date },
    security: { passed: true, complete: true, date, commit: commit.sha, files: scan.files, checked: scan.checked, errors: [], version: scan.version, policySha256: scan.policySha256, archiveSha256: scan.archiveSha256 },
  };
  const errors = validateCard(card);
  if (errors.length) throw Error(errors.join('; '));
  return card;
}

export async function collect({ maxRepos = 24, date = new Date().toISOString().slice(0, 10) } = {}) {
  const warnings = [], rejected = [];
  let all = [], trending = [];
  try { all = directory(await text('https://skills.sh/')); trending = directory(await text('https://skills.sh/trending')); }
  catch (e) { warnings.push(e.message); }
  const historyDir = path.join(ROOT, 'dati/skill-storico');
  const history = fs.existsSync(historyDir) ? fs.readdirSync(historyDir).filter(f => f.endsWith('.json')).map(f => read(`dati/skill-storico/${f}`)) : [];
  let github = [];
  for (const topic of ['agent-skills', 'claude-skills']) {
    try { github.push(...(await api(`search/repositories?q=${encodeURIComponent(`topic:${topic} archived:false`)}&sort=stars&per_page=15`)).items.map(r => ({ source: r.full_name, skillId: r.name }))); }
    catch (e) { warnings.push(e.message); }
  }
  const old = read('dati/skill.json', { skills: [] }).skills;
  const repos = [...new Set([...old.map(c => c.repository), ...trending.map(x => x.source), ...github.map(x => x.source), ...all.map(x => x.source)])];
  // Bound downloads and review time, with a rotating discovery window so lower-ranked
  // repositories are not permanently starved by repeatedly rejected leaders.
  const day = Math.floor(Date.parse(date) / 864e5);
  const rotate = repos.slice(12); const offset = rotate.length ? (day * 7) % rotate.length : 0;
  const queue = [...new Set([...old.map(c => c.repository), ...repos.slice(0, 12), ...rotate.slice(offset), ...rotate.slice(0, offset)])].slice(0, maxRepos);
  const cards = [], stars = {};
  for (const repo of queue) {
    try {
      const result = await scanRepository(repo);
      stars[repo] = result.meta.stargazers_count;
      if (!result.scan.passed || !result.scan.complete) { rejected.push({ repository: repo, date, commit: result.commit.sha, reasons: result.scan.errors }); continue; }
      const choices = [...new Map([...all, ...trending].filter(x => x.source.toLowerCase() === repo.toLowerCase()).map(x => [x.skillId, x])).values()];
      // Github-only discoveries get their identity from the actual SKILL.md.
      if (!choices.length) for (const [p,t] of Object.entries(result.scan.texts).filter(([p]) => /(^|\/)SKILL\.md$/.test(p))) choices.push({ source: repo, skillId: /^name:\s*(.+)/m.exec(t)?.[1]?.replace(/["']/g, '').trim() || path.posix.basename(path.posix.dirname(p)) });
      for (const c of choices.slice(0, 20)) {
        const a = all.find(x => x.source.toLowerCase() === repo.toLowerCase() && x.skillId === c.skillId);
        const t = trending.find(x => x.source.toLowerCase() === repo.toLowerCase() && x.skillId === c.skillId);
        try { cards.push(cardFrom(repo, { ...c, totalInstalls: a?.installs, trendingInstalls: t?.installs }, result, date, history)); }
        catch (e) { rejected.push({ repository: repo, skill: c.skillId, date, reasons: [{ reason: e.message }] }); }
      }
    } catch (e) { rejected.push({ repository: repo, date, reasons: [{ reason: `incomplete review: ${e.message}` }] }); }
  }
  cards.sort(rank);
  const previous = read('dati/skill-scartate.json', { scartate: [] }).scartate;
  write('dati/skill-scartate.json', { aggiornato: date, scartate: [...previous.filter(x => !queue.includes(x.repository)), ...rejected] });
  write(`dati/skill-storico/${date}.json`, { date, stars: { ...(history.find(x => x.date === date)?.stars || {}), ...stars }, directory: { allTime: all, trending24h: trending } });
  const data = { aggiornato: date, metodologia: 'Repository star growth over seven days when observed; otherwise measured skills.sh installs in 24 hours, then total installs and stars. Missing values are not zero.', warnings, skills: cards, weekly: { date, complete: new Date(`${date}T12:00:00Z`).getUTCDay() === 0, slugs: cards.slice(0,10).map(c => c.slug) } };
  write('dati/skill.json', data);
  for (const w of warnings) console.log(`::warning::${w}`);
  console.log(`Skill: ${cards.length} eligible; ${rejected.length} rejected; ${queue.length} repositories reviewed`);
  return data;
}

export function rank(a,b) {
  const ga = a.metrics.growth7d?.value, gb = b.metrics.growth7d?.value;
  if (ga != null || gb != null) return (gb ?? -Infinity) - (ga ?? -Infinity) || (b.metrics.stars - a.metrics.stars);
  return (b.metrics.installs24h ?? -1) - (a.metrics.installs24h ?? -1) || (b.metrics.installs ?? -1) - (a.metrics.installs ?? -1) || b.metrics.stars - a.metrics.stars;
}
