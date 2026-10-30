import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const read = (f, fallback = null) => fs.existsSync(path.join(ROOT, f)) ? JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')) : fallback;
export function write(f, data) { const p = path.join(ROOT, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(data, null, 1) + '\n'); }
export const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const plain = s => String(s).replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
export function labelFrom(text, max=64) {
  let s=String(text).split(/\s*\(/)[0].trim();
  const qualifier=s.indexOf(' with ');
  if(qualifier>=18)s=s.slice(0,qualifier);
  if(s.length>max)s=s.slice(0,max+1).replace(/\s+\S*$/,'');
  let previous;
  do { previous=s; s=s.replace(/[,:;.!?\s]+$/,'').replace(/\s+(?:and|or|the|of|a|an|to|with|for|in|on|at|by|from|based|specific)$/i,''); } while(previous!==s);
  return s;
}
export function licenseFrom(readme, github) {
  if(github && github!=='NOASSERTION')return github;
  const declaration=/^##\s+License\s*\r?\n+([^\r\n]+)/mi.exec(readme)?.[1];
  return declaration ? plain(declaration).slice(0,180) : null;
}
export async function text(url) { const r = await fetch(url, { signal: AbortSignal.timeout(45000) }); if (!r.ok) throw Error(`${r.status} ${url}`); return r.text(); }
export async function api(route) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    const r = spawnSync('gh', ['api', route], { encoding: 'utf8', maxBuffer: 8e6, timeout: 60000 });
    if (r.status !== 0) throw Error(`GitHub API: ${route}: ${r.stderr?.slice(-300)}`);
    return JSON.parse(r.stdout);
  }
  const r = await fetch(`https://api.github.com/${route}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(45000) });
  if (!r.ok) throw Error(`GitHub ${r.status}: ${route}`);
  return r.json();
}

// Read the actual public Next payload; never interpret a rounded display number as exact.
export function directory(html) {
  const chunks = [...html.matchAll(/self\.__next_f\.push\((\[[^<]+)\)<\/script>/g)].flatMap(m => { try { const a = JSON.parse(m[1]); return a[0] === 1 ? [a[1]] : []; } catch { return []; } });
  let stream = chunks.join('');
  // Some versions double-encode the streamed JSON string.
  if (stream.includes('\\"initialSkills\\"')) stream = stream.replace(/\\"/g, '"');
  const m = /"initialSkills":\[/.exec(stream);
  if (!m) throw Error('skills.sh schema changed: no exact initialSkills data');
  const start = m.index + m[0].length - 1;
  let depth = 0, quoted = false, escaped = false, end = start;
  for (; end < stream.length; end++) {
    const c = stream[end];
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue; }
    if (c === '"') quoted = true;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) break;
  }
  const rows = JSON.parse(stream.slice(start, end + 1));
  return rows.filter(x => /^[\w.-]+\/[\w.-]+$/.test(x.source) && /^[\w.-]+$/.test(x.skillId) && Number.isSafeInteger(x.installs));
}

export async function scanRepository(repo) {
  const meta = await api(`repos/${repo}`);
  const commit = await api(`repos/${repo}/commits/${meta.default_branch}`);
  const policy=createHash('sha256').update(fs.readFileSync(path.join(ROOT,'script/skill/sicurezza.py'))).digest('hex');
  const file = path.join(ROOT, '.ai', 'skill-cache', `${slug(repo)}-${commit.sha}-${policy.slice(0,12)}.json`);
  if (!fs.existsSync(file)) {
    const r = spawnSync(process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'), [path.join(ROOT, 'script/skill/sicurezza.py'), repo, commit.sha, file], { encoding: 'utf8', timeout: 180000, maxBuffer: 2e6 });
    if (r.status !== 0) throw Error(`Scan failed: ${r.stderr?.slice(-500)}`);
  }
  const scan = JSON.parse(fs.readFileSync(file, 'utf8'));
  scan.policySha256=policy;
  return { meta, commit, scan };
}

export function growth(history, repo, stars, date) {
  const before = new Date(Date.parse(date) - 7 * 864e5).toISOString().slice(0, 10);
  const observation = history.find(x => x.date === before && Number.isInteger(x.stars?.[repo]));
  return observation ? { value: stars - observation.stars[repo], from: observation.date, to: date } : null;
}

export function installFrom(readme, repo) {
  const commands = [...readme.matchAll(/(?:^|\n)\s*(?:\$\s*)?((?:npx(?:\s+-y|\s+--yes)?\s+skills(?:@[\w.-]+)?\s+add|claude\s+plugin\s+install)\s+[^\n`]+)/g)].map(m => m[1].trim());
  // Preserve the exact command. Placeholders, chained commands and remote execution are never eligible.
  return commands.find(c => c.toLowerCase().includes(repo.toLowerCase()) && !/[<>…]|\.\.\.|[;&|]|\$\(/.test(c) && c.length <= 180) || null;
}
