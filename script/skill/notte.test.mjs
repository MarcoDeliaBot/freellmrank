import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { explain } from './spiega.mjs';
import { digest, validateCard } from './verifica.mjs';
import { plan, validatePlan } from './video.mjs';
import { fitWindow } from '../video-hf/tempo.mjs';
import { runCandidates, finishNight } from './notte.mjs';
import { extractFacts } from './fatti.mjs';
import { auditCatalogue, loadTrialCatalogue } from './catalogo.mjs';
import { lessonFor } from './copione.mjs';

function fixture() {
  const descr='Demo reviews code. It explains proposed corrections.';
  const facts=['Read the request carefully.','Check the proposed changes.','Report the review findings.'];
  const raw=[descr,'npx skills add owner/demo','Review the project.',...facts].join('\n');
  return {tipo:'skill',slug:'owner-demo',key:'agent skill owner/demo',name:'Demo',repository:'owner/demo',skillPath:'skills/demo/SKILL.md',date:'2026-11-01',commit:'a'.repeat(40),
    titolo:'Demo: Agent Skill',descr,problem:'reviews code',install:'npx skills add owner/demo',example:'Review the project.',features:facts.map(detail=>({label:detail,detail})),claims:[descr],limits:[],
    fonti:[{url:'https://github.com/owner/demo/blob/'+ 'a'.repeat(40)+'/README.md',testo:raw,sha256:digest(raw)}],metrics:{date:'2026-11-01',stars:10},security:{passed:true,complete:true,scope:'skills/demo',files:2,checked:['all-files','installation-scope'],errors:[],date:'2026-11-01',commit:'a'.repeat(40)}};
}
const truncated={testo:'{',tagliato:true,usage:{prompt_tokens:40,completion_tokens:3200}};
function valid(messages){
  const facts=JSON.parse(messages[1].content).FACTS;
  return {testo:JSON.stringify({slides:[{index:0,sentences:fixture().descr.split(/(?<=[.!?])\s+/).map(text=>({text,facts:[facts.indexOf(fixture().descr)]}))}]}),usage:{prompt_tokens:40,completion_tokens:80}};
}
test('P1 truncation: retry Workers, then Groq, then deterministic; both formats keep every content gate',async()=>{
  const prior=process.env.SCRIVI_URL;process.env.SCRIVI_URL='https://trial.freellmrank.pages.dev';
  try {
    for(const mode of ['workers','groq','deterministic']) {
      const calls=[];
      const card=await explain(fixture(),async(messages,max)=>{calls.push(['workers',max]);return mode==='workers'&&calls.length===2?valid(messages):truncated;},
        {trial:true,groqWriter:async messages=>{calls.push(['groq',4000]);return mode==='groq'?valid(messages):truncated;}});
      assert.equal(card.writing.writer,mode);
      assert.deepEqual(calls,mode==='workers'?[['workers',3200],['workers',4000]]:[['workers',3200],['workers',4000],['groq',4000]]);
      assert.equal(card.writing.tokens,mode==='workers'?3360:mode==='groq'?6600:9720);
      for(const short of [false,true])assert.deepEqual(validatePlan(card,plan(card,short)),[]);
    }
  } finally {if(prior===undefined)delete process.env.SCRIVI_URL;else process.env.SCRIVI_URL=prior;}
});
test('P1 Groq uses identical prompt and cannot accept invented or technical narration',async()=>{
  const old=process.env.SCRIVI_URL;process.env.SCRIVI_URL='https://trial.freellmrank.pages.dev';
  try{
    let prompt;
    const card=await explain(fixture(),async messages=>{prompt=messages;return truncated;},{trial:true,groqWriter:async messages=>{
      assert.deepEqual(messages,prompt);return {testo:JSON.stringify({slides:[{index:0,sentences:[{text:'Runs 400 times faster.',facts:[0]},{text:'Run npx tools now.',facts:[0]}]}]})};
    }});
    assert.equal(card.writing.writer,'deterministic');assert.equal(card.writing.accepted,0);
  }finally{if(old===undefined)delete process.env.SCRIVI_URL;else process.env.SCRIVI_URL=old;}
});
test('a Workers retry refused by its cap after truncation reaches the free Groq reserve',async()=>{
  let calls=0;
  const card=await explain(fixture(),async()=>{if(++calls===1)return truncated;throw Object.assign(Error('daily cap'),{status:429});},{groqWriter:async messages=>valid(messages)});
  assert.equal(calls,2);assert.equal(card.writing.writer,'groq');assert.equal(card.writing.attempts[1].status,429);
});
test('P2 short reserve adapts the scene before enforcing the 0.5x floor; news is unchanged',()=>{
  const p=plan(fixture(),true),scene=p.scene[1];
  const fit=fitWindow(p,scene,1.9);
  assert.equal(fit.adapted,true);assert.ok(fit.fixed>=2&&fit.fixed<7);assert.ok(fit.speed>=.5);
  assert.throws(()=>fitWindow(p,scene,.1),/too short/);
  const news=fitWindow({tempiFissi:true,formato:'verticale'},{durata:7},1.9);
  assert.equal(news.fixed,7);assert.equal(news.adapted,false);
});
test('P3 failed first skill and tutorial advance independently and successful content is staged',async()=>{
  const summary={completed:[],rejected:[],errors:[]},published=[];
  for(const tipo of ['skill','tutorial'])await runCandidates({candidates:[{tipo,name:'bad'},{tipo,name:'good'}],limit:1,summary,
    processCard:async c=>{if(c.name==='bad')throw Error('gate rejected');return c;},onSuccess:async c=>published.push(c)});
  assert.equal(published.length,2);assert.equal(summary.rejected.length,2);
  await finishNight(summary,{notify:()=>assert.fail('no issue on partial success')});assert.ok(summary.finished);
});
test('P4 no valid candidate fails and opens exactly one salute issue, never during trial',async()=>{
  const summary={completed:[],rejected:[],errors:[]};let issues=0;
  await runCandidates({candidates:[{name:'bad',tipo:'skill'},{name:'bad',tipo:'tutorial'}],limit:2,summary,processCard:async()=>{throw Error('gate rejected');}});
  const notify=async(_title,_body,labels)=>{issues++;assert.deepEqual(labels,['salute']);return {html_url:'https://github.com/example/issue/1'};};
  for(let i=0;i<2;i++)await assert.rejects(finishNight(summary,{notify}),/No skill or tutorial/);
  assert.equal(issues,1);assert.equal(summary.errors.length,1);
  await assert.rejects(finishNight({...summary,healthAttempted:false},{trial:true,notify}),/No skill/);assert.equal(issues,1);
});
test('P5 the same real pinned catalogue improves from 1 to at least 10 of 26; facts have intact citations',()=>{
  const audit=auditCatalogue();assert.equal(audit.total,26);assert.equal(audit.before,1);assert.ok(audit.after>=10);
  for(const row of audit.rows.filter(r=>r.after.passed))assert.ok(row.facts.every(f=>f.evidence?.quote&&f.evidence?.url.includes(row.commit)));
});
test('paragraph extraction excludes YAML, code and tables, joins wraps and retains raw Markdown evidence',()=>{
  const text='---\nname: hidden\ndescription: Metadata is not a lesson.\n---\n## Review\nRead **every changed file**\nbefore reporting a finding.\n\n```sh\nNever teach this code as prose.\n```\n| Never teach a table row. |';
  const facts=extractFacts({fonti:[{url:'https://example.test/source',testo:text}]});
  assert.equal(facts.length,1);assert.equal(facts[0].detail,'Read every changed file before reporting a finding.');assert.ok(text.includes(facts[0].quote));
});
test('the current pinned evergreen tutorial passes both source and teaching gates',()=>{
  const card=JSON.parse(fs.readFileSync(new URL('./fixtures/ollama-2026-11-01.json',import.meta.url)));
  assert.deepEqual(validateCard(card),[]);plan(card);plan(card,true);
  const bad=structuredClone(card);bad.fonti[0].testo+='tampered';assert.ok(validateCard(bad).length);
});
test('the measured top20 registry has three cited actions and a compact spoken identity',()=>{
  const data=loadTrialCatalogue('2026-11-01'),card=data.skills.find(c=>c.name==='hyperframes-registry');
  assert.ok(data.audit.entries.some(e=>e.skill===card.name&&e.rank<=20&&e.publishable));
  const short=plan(card,true);plan(card);
  assert.ok(short.scene[1].voce.split(/\s+/).length<=22);
  assert.ok(short.scene.slice(2,5).every(s=>s.evidence.length));
  const bad=structuredClone(card);for(const f of bad.fonti){f.testo=f.testo.replace('Search is local and sends nothing.','Changed search policy.');f.sha256=digest(f.testo);}
  assert.throws(()=>lessonFor(bad),/Teaching evidence missing/);
});
