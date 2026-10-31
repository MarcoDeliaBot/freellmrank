import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { RADICE, pagina, esc, fmtData } from './comune.mjs';
import { videoDelPost } from './blog.mjs';
import { validateCard, DISCLAIMER, SECURITY_TEXT } from '../skill/verifica.mjs';
import { read } from '../skill/fonti.mjs';
import { rank } from '../skill/raccogli.mjs';
import { lessonFor, textIssues } from '../skill/copione.mjs';

function cards(dir) {
  const p = path.join(RADICE, 'contenuti', dir);
  return fs.existsSync(p) ? fs.readdirSync(p).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(p,f),'utf8'))).filter(c=>!c.revoked) : [];
}
const href = c => `/${c.tipo === 'skill' ? 'skills' : 'tutorials'}/${c.slug}.html`;
const p = t => `<p>${esc(t)}</p>`;
const code = t => `<pre translate="no"><code>${esc(t)}</code></pre>`;
const section = (title, body) => `<section class="cat-guida"><div class="cat-testa"><h2>${esc(title)}</h2></div>${body}</section>`;
const list = (items, numbers=false) => items.map((c,i)=>`<article class="cat-scheda"><h3>${numbers?`<span class="cat-conta">${i+1}</span> `:''}<a href="${href(c)}">${esc(c.titolo)}</a></h3>${p(c.descr)}${numbers?metrics(c):`<p class="small muted">${fmtData(c.date)}</p>`}</article>`).join('');

function metrics(c) {
  const m = c.metrics;
  if (!m) return '';
  const g = m.growth7d;
  const values = [['GitHub stars',m.stars], ['Star growth over seven days',g ? `${g.value >= 0 ? '+' : ''}${g.value} (${g.from} to ${g.to})` : 'Not available: seven-day history is still being collected'],
    ['skills.sh total installs',m.installs ?? 'Not exposed for this skill'],['skills.sh installs in 24 hours',m.installs24h ?? 'Not exposed for this skill'],['License',m.license || 'Not identified by GitHub'],['Last commit',m.lastCommit]];
  return `<p>Observed on <time datetime="${esc(m.date)}">${fmtData(m.date)}</time>. GitHub counts apply to the repository; skills.sh counts apply to this skill.</p><dl>${values.map(([a,b])=>`<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>`;
}
function security(c) {
  if (!c.security) return p('Commands were checked against official documentation. This guide does not include a repository security certification.')+(c.officialInstaller?p('Warning: the official installer downloads and executes a script. Review it before running.'): '');
  const warnings=c.security.warnings||[];
  return `<aside class="cat-scheda">${p(`Checked on ${c.security.date}, at commit ${c.commit}. ${c.security.files} files inspected in installation scope: ${c.security.scope||c.skillPath}.`)}${p(SECURITY_TEXT)}${warnings.length?`<h3>Warnings</h3><ul>${warnings.map(w=>`<li>${esc(w.reason)} — <a href="https://github.com/${esc(c.repository)}/blob/${c.commit}/${esc(w.file)}#L${w.line}">${esc(w.file)}:${w.line}</a></li>`).join('')}</ul>`:p('No blocking pattern or documentation warning was found in this installation scope.')}<p><strong>${esc(DISCLAIMER)}</strong></p></aside>`;
}
export function pagineSkillTutorial(dati, blog) {
  const catalogue = read('dati/skill.json', {skills:[]});
  const skills = cards('skills'), tutorials = cards('tutorials');
  for (const c of [...skills,...tutorials]) {
    const errors = validateCard(c);
    if (errors.length) throw Error(`${c.slug}: ${errors.join('; ')}`);
    if (!c.videoVerified) throw Error(`${c.slug}: video gate not completed`);
    const skill = c.tipo === 'skill';
    const lesson=lessonFor(c),tool=!skill&&!c.skillSource;
    const teaching=lesson.long.filter(s=>s.role==='step');
    const seenCode=new Set();
    const once=t=>{if(!t||seenCode.has(t))return '';seenCode.add(t);return code(t);};
    const verification=lesson.long.find(s=>s.role==='verify');
    const publicText=[lesson.description,lesson.prerequisites,lesson.check,lesson.next,lesson.limits,...teaching.flatMap(s=>[s.title,s.text])];
    const wording=publicText.flatMap(t=>textIssues(t,{tool}));
    if(wording.length)throw Error(`${c.slug}: page wording gate: ${wording.join('; ')}`);
    const body = [videoDelPost(`${c.tipo}-${c.slug}`,c.titolo,{breveRelease:true}),
      section(skill?'What it does':'What you will build',p(lesson.description)),
      section('What you need',p(lesson.prerequisites)),
      ...(c.audience?.length?[section('Who it is for',p(`The README names these assistants: ${c.audience.join(', ')}.`))]:[]),
      section(skill?'Setup and use':'Step by step',`<ol>${teaching.map((s,i)=>`<li><h3>Step ${i+1}. ${esc(s.title)}</h3>${p(s.text)}${once(s.code)}</li>`).join('')}</ol>`),
      section('Check that it works',p(lesson.check)+once(verification?.code)),
      ...(skill?[section('Features explained',lesson.short.slice(2,5).map(f=>`<article><h3>${esc(f.title)}</h3>${p(f.text)}</article>`).join(''))]:[]),
      section('Next steps',p(lesson.next)),
      section('Limits',p(lesson.limits)),
      ...(c.hardware ? [section('Hardware requirements',p(c.hardware.note)+p(c.hardware.parameters ? `The site records ${c.hardware.parameters} parameters on ${c.hardware.date}. This is not a measured RAM requirement.` : 'No measured RAM requirement is available.')+`<p><a href="/home.html">Check your machine in the Run at home simulator</a></p>`)] : []),
      section('Security check',security(c)),
      ...(c.metrics ? [section('Numbers and date',metrics(c))] : []),
      section('Sources',`<ul>${c.fonti.map(f=>`<li><h3><a href="${esc(f.url)}" rel="noopener">${esc(f.tipo)}</a></h3></li>`).join('')}</ul>`),
    ].join('\n');
    pagina({file:href(c).slice(1),titolo:c.titolo,descr:c.descr.slice(0,158),attiva:skill?'/skills.html':'/tutorials.html',dati,blog,
      corpo:`<article class="articolo skill-tutorial"><header class="art-testa"><p class="art-meta">${skill?'Agent Skills':'Tutorials'} · ${fmtData(c.date)}</p><h1>${esc(c.titolo)}</h1></header>${marked.parse(body)}</article>`});
  }
  const current = new Map((catalogue.skills || []).map(c=>[c.slug,c.metrics]));
  const ranked = skills.map(c=>({...c,metrics:current.get(c.slug)||c.metrics})).sort(rank).slice(0,10);
  const unlinked = (catalogue.skills || []).filter(c=>!skills.some(s=>s.slug===c.slug)).sort(rank);
  pagina({file:'skills.html',titolo:'Best Agent Skills this week',descr:'Agent Skills with dated GitHub and skills.sh measurements, installation instructions, static checks and videos.',attiva:'/skills.html',dati,blog,
    corpo:`<div class="articolo skill-tutorial"><header class="art-testa"><p class="art-meta">Agent Skills</p><h1>Best Agent Skills this week</h1><p class="lead">Practical guides to Agent Skills, with dated popularity and installation instructions.</p></header>
    ${section('Weekly ranking',p(catalogue.metodologia || 'Measured popularity from GitHub and skills.sh.')+p(`As of ${catalogue.aggiornato || dati.aggiornato}. ${ranked.length} published skills available; the list grows to ten only when ten entries pass all gates.`)+list(ranked,true))}
    ${section('New Agent Skills',list([...skills].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10)) || p('The first videos and walkthroughs are being prepared.'))}
    ${section('All Agent Skills',list(skills) || p('No skill walkthrough has passed all publication gates yet.'))}
    ${section('Measured candidates',p('These candidates passed static review but await a complete page and both videos. Numbers are observations, not a recommendation.')+unlinked.slice(0,20).map(c=>`<article class="cat-scheda"><h3><a href="${esc(c.fonti[0].url)}">${esc(c.name)}</a></h3>${p(c.descr)}${p(`${c.metrics.stars} repository stars · ${c.metrics.installs24h ?? 'Unavailable'} installs in 24h · observed ${c.metrics.date}`)}</article>`).join(''))}</div>`});
  const guides = ['strata','minimax-h3'].map(n=>read(`contenuti/video-guide/${n}.json`)).filter(Boolean);
  pagina({file:'tutorials.html',titolo:'AI tutorials',descr:'Step-by-step tutorials for local AI, free models and Agent Skills, with official commands and linked videos.',attiva:'/tutorials.html',dati,blog,
    corpo:`<div class="articolo skill-tutorial"><header class="art-testa"><p class="art-meta">Learn by doing</p><h1>AI tutorials</h1><p class="lead">Official commands, practical steps and videos. New topics are selected from measured model and skill popularity.</p></header>${section('Latest tutorials',list([...tutorials].sort((a,b)=>b.date.localeCompare(a.date))) || p('The first automatic walkthrough is being prepared.'))}${section('Existing guides',guides.map(g=>`<article class="cat-scheda"><h3><a href="${esc(new URL(g.url).pathname)}.html">${esc(g.titolo)}</a></h3>${p(g.descr)}</article>`).join(''))}</div>`});
}
