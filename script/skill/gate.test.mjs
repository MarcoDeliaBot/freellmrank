import test from 'node:test';
import assert from 'node:assert/strict';
import { directory, growth, installFrom, licenseFrom, labelFrom } from './fonti.mjs';
import { validateCard, digest, topicExists, GENERIC } from './verifica.mjs';
import { plan, validatePlan } from './video.mjs';
import { skillTutorial } from './tutorial.mjs';
import { onRequestPost } from '../../functions/api/scrivi.js';

function fixture() {
  const raw='Demo teaches agents to review a proposed change.\nnpx skills add owner/demo\nReview the project.\nRead the request carefully.\nCheck the proposed changes.\nReport the review findings.';
  return {tipo:'skill',slug:'owner-demo',key:'agent skill owner/demo',name:'Demo',repository:'owner/demo',date:'2026-10-30',commit:'a'.repeat(40),
    titolo:'Demo: Agent Skill',descr:'Demo teaches agents to review a proposed change.',problem:'review a proposed change',install:'npx skills add owner/demo',example:'Review the project.',
    features:['Read the request carefully.','Check the proposed changes.','Report the review findings.'].map(s=>({label:s,detail:s})),
    claims:['Demo teaches agents to review a proposed change.'],limits:[GENERIC[1]],
    fonti:[{url:'https://github.com/owner/demo/blob/'+ 'a'.repeat(40) + '/README.md',testo:raw,sha256:digest(raw)}],metrics:{date:'2026-10-30',stars:10},security:{passed:true,complete:true,files:2,checked:['all-files'],errors:[],date:'2026-10-30',commit:'a'.repeat(40)}};
}
test('exact source evidence and a complete scan are mandatory',()=>{
  const c=fixture();assert.deepEqual(validateCard(c),[]);
  for(const mutate of [c=>c.install+=' --force',c=>c.security.complete=false,c=>c.descr='It is twice as fast.',c=>c.fonti[0].testo+='tampered',c=>c.features[1].detail='It uploads nothing.',c=>c.problem='Invented capability',c=>c.flow=['Made up workflow'],c=>c.limits=['Works offline forever']]) {
    const bad=structuredClone(c);mutate(bad);assert.ok(validateCard(bad).length);
  }
});
test('a changed page cannot reuse an older video approval',()=>{
  const c=fixture();c.videoVerified={cardHash:digest(JSON.stringify(c))};assert.deepEqual(validateCard(c),[]);
  c.titolo='Changed title';assert.ok(validateCard(c).includes('content changed after video verification'));
});
test('skill and tutorial budgets cannot call Workers AI or borrow the news budget',async()=>{
  let calls=0;
  const env={BOZZE_KEY:'test-only',PROVA:{get:async()=>0},AI:{run:async()=>{calls++;throw Error('must not run');}}};
  for(const scopo of ['skill','tutorial']) {
    const request=new Request('https://example.test/api/scrivi',{method:'POST',headers:{Authorization:'Bearer test-only'},body:JSON.stringify({scopo,messaggi:[{role:'user',content:'Write'}]})});
    assert.equal((await onRequestPost({request,env})).status,429);
  }
  assert.equal(calls,0);
});
test('both video formats preserve recipe and reject factual or command mutations',()=>{
  const c=fixture();const short=plan(c,true),long=plan(c,false);
  assert.equal(short.scene.reduce((a,s)=>a+s.durata,0),45);assert.deepEqual(validatePlan(c,long),[]);
  const bad=structuredClone(short);bad.scene[2].dati.testo='Runs 400 times faster';assert.ok(validatePlan(c,bad).length);
  const speech=structuredClone(short);speech.scene[1].voce='Invented claim';assert.ok(validatePlan(c,speech).length);
  const command=structuredClone(short);command.scene[5].dati.comando='npx skills add attacker/evil';assert.ok(validatePlan(c,command).length);
  const timing=structuredClone(short);timing.scene[0].durata=4;assert.ok(validatePlan(c,timing).length);
});
test('tutorials share gates and avoid duplicate keywords and titles',()=>{
  const c=skillTutorial(fixture(),'2026-10-30');assert.deepEqual(validateCard(c),[]);assert.deepEqual(validatePlan(c,plan(c,false)),[]);
  assert.ok(topicExists(c,[{key:c.key}]));assert.ok(topicExists(c,[{titolo:c.titolo.toUpperCase()}]));
  assert.equal(topicExists(c,[{key:'unrelated topic'}]),false);
  const unsafe=structuredClone(c);delete unsafe.skillSource;assert.ok(validateCard(unsafe).includes('skill installation tutorial requires a reviewed target repository'));
});
test('missing history never becomes a fabricated zero growth',()=>{
  assert.equal(growth([], 'a/b',100,'2026-10-30'),null);
  assert.deepEqual(growth([{date:'2026-10-23',stars:{'a/b':80}}],'a/b',100,'2026-10-30'),{value:20,from:'2026-10-23',to:'2026-10-30'});
});
test('README install commands retain flags, case and version specifiers',()=>{
  const command='npx skills@latest add https://github.com/Owner/Repo --skill "demo"';
  assert.equal(installFrom('```bash\n'+command+'\n```','owner/repo'),command);
  assert.equal(installFrom('npx skills add owner/repo | sh','owner/repo'),null);
  assert.equal(licenseFrom('## License\n\nMIT — declared in the README',null),'MIT — declared in the README');
  assert.equal(licenseFrom('',null),null);
  assert.equal(labelFrom('Does the work (writes code, spec, doc, etc.)'),'Does the work');
  assert.equal(labelFrom('The critic scores the work 1–10 with specific, actionable feedback'),'The critic scores the work 1–10');
});
test('skills.sh payload handles nested weekly observations and schema drift',()=>{
  const stream='x:{"initialSkills":[{"source":"owner/repo","skillId":"demo","installs":12,"weeklyInstalls":[2,3]}]}';
  const html='<script>self.__next_f.push('+JSON.stringify([1,stream])+')</script>';
  assert.equal(directory(html)[0].installs,12);assert.throws(()=>directory('schema changed'));
});
