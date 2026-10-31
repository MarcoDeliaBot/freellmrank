import test from 'node:test';
import assert from 'node:assert/strict';
import { directory, growth, installFrom, licenseFrom, labelFrom, plain } from './fonti.mjs';
import { validateCard, digest, topicExists, GENERIC } from './verifica.mjs';
import { plan, validatePlan } from './video.mjs';
import { skillTutorial, conflictsRecent } from './tutorial.mjs';
import { onRequestPost } from '../../functions/api/scrivi.js';
import { explain } from './spiega.mjs';
import { groundedExplanation } from './verifica.mjs';
import { TETTI_SCRIVI, TETTO_NEURONS, TETTO_ARENA, TETTO_AUDIO } from '../cf-modelli.mjs';
import { STAMPI, STAMPI_NOTIZIE } from '../video-hf/stampi/index.mjs';

function fixture() {
  const raw='Demo teaches agents to review a proposed change.\nnpx skills add owner/demo\nReview the project.\nRead the request carefully.\nCheck the proposed changes.\nReport the review findings.';
  return {tipo:'skill',slug:'owner-demo',key:'agent skill owner/demo',name:'Demo',repository:'owner/demo',skillPath:'skills/demo/SKILL.md',date:'2026-10-30',commit:'a'.repeat(40),
    titolo:'Demo: Agent Skill',descr:'Demo teaches agents to review a proposed change.',problem:'review a proposed change',install:'npx skills add owner/demo',example:'Review the project.',
    features:['Read the request carefully.','Check the proposed changes.','Report the review findings.'].map(s=>({label:s,detail:s})),
    claims:['Demo teaches agents to review a proposed change.'],limits:[GENERIC[1]],
    fonti:[{url:'https://github.com/owner/demo/blob/'+ 'a'.repeat(40) + '/README.md',testo:raw,sha256:digest(raw)}],metrics:{date:'2026-10-30',stars:10},security:{passed:true,complete:true,scope:'skills/demo',files:2,checked:['all-files','installation-scope'],errors:[],date:'2026-10-30',commit:'a'.repeat(40)}};
}
test('the news planner retains its previous template catalogue',()=>{
  assert.ok(STAMPI.passo && STAMPI.diagramma);
  assert.equal(STAMPI_NOTIZIE.passo,undefined);assert.equal(STAMPI_NOTIZIE.diagramma,undefined);
  for(const name of ['titolo','punti','numero','chiusura'])assert.ok(STAMPI_NOTIZIE[name]);
});
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
test('skill/tutorial budgets are separate, bounded and preserve the free total and news',async()=>{
  const store=new Map(),called=[];
  const env={BOZZE_KEY:'test-only',PROVA:{get:async k=>store.get(k)||0,put:async(k,v)=>store.set(k,v)},AI:{run:async()=>({response:'ok',usage:{neurons:5}})}};
  for(const scopo of ['skill','tutorial']) {
    const request=()=>new Request('https://example.test/api/scrivi',{method:'POST',headers:{Authorization:'Bearer test-only'},body:JSON.stringify({scopo,max:100,messaggi:[{role:'user',content:'Write'}]})});
    assert.equal((await onRequestPost({request:request(),env})).status,200);
    const key=[...store.keys()].find(k=>k.startsWith(`scrivi-spesa-${scopo}:`));assert.ok(key);
    store.set(key,200);assert.equal((await onRequestPost({request:request(),env})).status,429);
  }
  assert.equal(TETTI_SCRIVI.notizie,1500);
  assert.equal(Object.values(TETTI_SCRIVI).reduce((a,b)=>a+b,0)+TETTO_NEURONS+TETTO_ARENA+TETTO_AUDIO,10000);
  assert.equal([...store.keys()].some(k=>k.startsWith('scrivi-spesa-notizie')),false);
});
test('budget exhaustion falls back without another writer or another scope',async()=>{
  let calls=0;const card=await explain(fixture(),async(_m,_max,scope)=>{calls++;assert.equal(scope,'skill');throw Object.assign(Error('quota'),{status:429});});
  assert.equal(calls,1);assert.equal(card.writing.neurons,0);assert.equal(card.writing.status,429);assert.equal(card.writing.accepted,0);
});
test('generated explanations need exact evidence and reject invented features/numbers',()=>{
  const c=fixture();
  assert.ok(groundedExplanation(c,{text:'Read the request. Check the proposed changes.',evidence:['Read the request carefully.','Check the proposed changes.']}));
  assert.equal(groundedExplanation(c,{text:'It uploads passwords anonymously.',evidence:[c.descr]}),false);
  assert.equal(groundedExplanation(c,{text:'It runs 400 times faster.',evidence:[c.descr]}),false);
});
test('tutorials exclude recent skill topics including staged cards for seven days',()=>{
  const s=fixture(),t=skillTutorial(s,s.date);
  assert.ok(conflictsRecent(t,[s],'2026-10-31'));
  assert.ok(conflictsRecent(t,[s],'2026-11-06'));
  assert.equal(conflictsRecent(t,[s],'2026-11-07'),false);
  assert.equal(conflictsRecent({...t,repository:'ollama/ollama',name:'Ollama',skillSource:null},[s],'2026-10-31'),false);
});
test('both video formats preserve recipe and reject factual or command mutations',()=>{
  const c=fixture();const short=plan(c,true),long=plan(c,false);
  assert.equal(short.scene.reduce((a,s)=>a+s.durata,0),45);assert.deepEqual(validatePlan(c,long),[]);
  const bad=structuredClone(short);bad.scene[2].dati.testo='Runs 400 times faster';assert.ok(validatePlan(c,bad).length);
  const speech=structuredClone(short);speech.scene[1].voce='Invented claim';assert.ok(validatePlan(c,speech).length);
  const command=structuredClone(short);command.scene[5].dati.comando='npx skills add attacker/evil';assert.ok(validatePlan(c,command).length);
  const timing=structuredClone(short);timing.scene[0].durata=4;assert.ok(validatePlan(c,timing).length);
  const flexible=structuredClone(short);flexible.tempiFissi=false;assert.ok(validatePlan(c,flexible).length);
  const repeated=structuredClone(short);repeated.scene[1].parlato.push(repeated.scene[1].parlato[0]);repeated.scene[1].voce=repeated.scene[1].parlato.join(' ');assert.ok(validatePlan(c,repeated).some(s=>s.includes('repeated narration')));
});
test('tutorials share gates and avoid duplicate keywords and titles',()=>{
  const c=skillTutorial(fixture(),'2026-10-30');assert.deepEqual(validateCard(c),[]);assert.deepEqual(validatePlan(c,plan(c,false)),[]);
  assert.ok(topicExists(c,[{key:c.key}]));assert.ok(topicExists(c,[{titolo:c.titolo.toUpperCase()}]));
  assert.equal(topicExists(c,[{key:'unrelated topic'}]),false);
  const unsafe=structuredClone(c);delete unsafe.skillSource;assert.ok(validateCard(unsafe).includes('skill installation tutorial requires a reviewed target repository'));
});
test('missing history never becomes a fabricated zero growth',()=>{
  assert.equal(growth([], 'a/b',100,'2026-10-30'),null);
  assert.equal(growth([{date:'2026-10-22',stars:{'a/b':80}}],'a/b',100,'2026-10-30'),null);
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
  assert.equal(installFrom('npx skills add owner/repo -s other','owner/repo','demo'),null);
  assert.equal(installFrom('npx skills add owner/repo --all','owner/repo','demo'),null);
  assert.equal(installFrom('npx skills add owner/repo -y','owner/repo','demo'),null);
  assert.equal(installFrom('npx skills add owner/repo -s demo other','owner/repo','demo'),null);
  assert.equal(installFrom('npx skills add owner/repo -s demo','owner/repo','demo'),'npx skills add owner/repo -s demo');
});
test('Markdown cleanup preserves literal inline HTML, code paths and placeholders',()=>{
  assert.equal(plain('Copy `<style>` and `compositions/<name>.html`.'),'Copy <style> and compositions/<name>.html.');
  assert.equal(plain('<div>Visible **text**</div>'),'Visible text');
});
test('skills.sh payload handles nested weekly observations and schema drift',()=>{
  const stream='x:{"initialSkills":[{"source":"owner/repo","skillId":"demo","installs":12,"weeklyInstalls":[2,3]}]}';
  const html='<script>self.__next_f.push('+JSON.stringify([1,stream])+')</script>';
  assert.equal(directory(html)[0].installs,12);assert.throws(()=>directory('schema changed'));
});
