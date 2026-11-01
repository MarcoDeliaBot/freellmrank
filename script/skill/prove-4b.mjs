// Real rendering proof, restricted to the dated disposable trial checkout.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadTrialCatalogue} from './catalogo.mjs';
import {trialTutorials,skillTutorial} from './tutorial.mjs';
import {plan,render} from './video.mjs';
import {read,write,ROOT} from './fonti.mjs';
import {digest,validateCard} from './verifica.mjs';
import {lessonFor} from './copione.mjs';

if(process.env.PROVA!=='true'||process.env.PROVA_CATALOGO!=='2026-11-01')throw Error('Q1-Q4 require the pinned trial');
const catalogue=loadTrialCatalogue('2026-11-01'),tools=trialTutorials('2026-11-01');
const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/before-4b-2026-11-01.json',import.meta.url)));
const candidates=[...catalogue.skills,...tools,...catalogue.skills.map(c=>skillTutorial(c,c.date)),JSON.parse(fs.readFileSync(new URL('./fixtures/ollama-2026-11-01.json',import.meta.url)))];
candidates.push(...baseline.extraCards);
const audit=candidates.map(card=>{
  let after={passed:true,reason:null};try{const errors=validateCard(card);assert.deepEqual(errors,[]);plan(card);plan(card,true);}catch(e){after={passed:false,reason:e.message};}
  const before=baseline.rows.find(r=>r.tipo===card.tipo&&r.name===card.name);
  assert.ok(before,`missing baseline ${card.tipo} ${card.name}`);
  return {tipo:card.tipo,name:card.name,repository:card.repository,commit:card.commit,before:{passed:before.passed,reason:before.reason},after};
});
assert.ok(audit.filter(r=>r.tipo==='tutorial'&&r.after.passed&&!['Ollama','agent-browser'].includes(r.name)).length>=3);
write('video/skill-tutorial/prove-4b/audit.json',{date:'2026-11-01',baseline:baseline.commit,rows:audit});
const summary=read('video/skill-tutorial/esito.json');
assert.ok(summary.prova&&summary.finished&&!summary.errors.length);
assert.deepEqual(summary.completed.map(c=>c.tipo).sort(),['skill','tutorial']);
const trialSkill=summary.completed.find(c=>c.tipo==='skill');
assert.equal(lessonFor(read(`contenuti/skills/${trialSkill.slug}.json`)).profile,'general');
const results=[];
for(const [group,cards]of [
  ['Q1',['code-simplification','test-driven-development','slideshow'].map(n=>catalogue.skills.find(c=>c.name===n))],
  ['Q2',tools],
  ['Q3',[skillTutorial(catalogue.skills.find(c=>c.name==='context-engineering'),'2026-11-01')]],
])for(const card of cards){
  const shape=c=>digest(JSON.stringify([plan(c).scene,plan(c,true).scene]));
  let evidence,reusedFrom=null;
  for(const item of summary.completed){const published=read(`contenuti/${item.tipo==='skill'?'skills':'tutorials'}/${item.slug}.json`);if(shape(published)===shape(card)){evidence=item.evidence;reusedFrom=item.slug;break;}}
  if(!evidence)for(const item of read('video/skill-tutorial/prove-p1/esito.json').cases){if(item.sceneHash===shape(card)){evidence=item.evidence;reusedFrom=`P1-${item.mode}`;break;}}
  if(!evidence)evidence=await render(card,path.join(ROOT,'video/skill-tutorial/prove-4b',`${card.tipo}-${card.slug}`));
  assert.ok(evidence.evidence.length===2&&evidence.evidence.every(e=>e.qa.passed));
  results.push({group,name:card.name,tipo:card.tipo,profile:lessonFor(card).profile,cardHash:digest(JSON.stringify(card)),reusedFrom,evidence});
  write('video/skill-tutorial/prove-4b/esito.json',{passed:true,complete:results.length===6,results});
}
assert.equal(results.length,6);
console.log('Q1/Q2/Q3 real videos: all twelve format checks passed.');
