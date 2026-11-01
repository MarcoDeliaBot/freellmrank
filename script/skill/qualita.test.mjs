import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTrialCatalogue} from './catalogo.mjs';
import {plan,validatePlan} from './video.mjs';
import {lessonFor,textIssues} from './copione.mjs';
import {sectionTitle,screenSentence,factNodes} from './fatti.mjs';
import {trialTutorials,skillTutorial} from './tutorial.mjs';
import {extractProcedure} from './procedura.mjs';
import {validateCard,digest} from './verifica.mjs';
import {plain} from './fonti.mjs';
import {fitWindow} from '../video-hf/tempo.mjs';

const catalogue=loadTrialCatalogue('2026-11-01');
test('Q1 all 26 pinned skills keep complete screen sentences and source section titles',()=>{
  for(const card of catalogue.skills){
    const lesson=lessonFor(card);if(lesson.profile!=='general')continue;
    for(const short of [false,true])assert.deepEqual(validatePlan(card,plan(card,short)),[]);
    const features=lesson.short.slice(2,5);
    assert.ok([...lesson.short,...lesson.long].every(s=>!s.nodes||s.nodes.every(n=>s.quotes.some(q=>plain(q).includes(n)))));
    for(const scene of features){
      assert.ok(scene.title.length<=40&&!/Documented action|^\d+[.)]|^Step \d/i.test(scene.title));
      assert.ok(scene.quotes.every(q=>card.fonti.some(s=>s.testo.includes(q))));
      for(const text of scene.elements||[])assert.ok(screenSentence(text),text);
      if(scene.nodes)assert.deepEqual(scene.nodes,factNodes({voice:scene.voice}));
    }
    const identity=lesson.short[1];assert.ok(identity.voice.startsWith(lesson.description+' '));
    assert.ok(!features.some(s=>identity.voice.endsWith(s.voice)));
  }
});
test('Q1 long or quoted facts are replaced, never clipped; sections lose numbering and symbols',()=>{
  assert.equal(sectionTitle('Step 1: RED — Write a Failing Test'),'RED Write a Failing Test');
  assert.equal(sectionTitle('1. Preserve Behavior Exactly'),'Preserve Behavior Exactly');
  assert.equal(screenSentence('Every simplification must pass a simple test: "Would a new team member'),false);
  assert.equal(screenSentence('A complete sentence — with a dash.'),false);
  assert.equal(screenSentence('A complete but "quoted" sentence.'),false);
  assert.equal(factNodes({voice:'Read the project carefully.'}),undefined);
  assert.deepEqual(factNodes({voice:'The checks include input validation, error handling, and output formatting.'}),['input validation','error handling','output formatting']);
});
test('Q1 identity retains five seconds without slowing speech; the 1.9s regression is rejected',()=>{
  const p=plan(catalogue.skills.find(c=>c.name==='code-simplification'),true),s=p.scene[1];
  assert.throws(()=>fitWindow(p,s,1.9),/without slowing/);
  const fit=fitWindow(p,s,5.3);assert.ok(fit.fixed>=5&&fit.speed>=.999);
});
test('Q2 documented generic tutorials cite pinned steps, preserve commands and never speak them',()=>{
  const cards=[...trialTutorials('2026-11-01'),...['context-engineering','spec-driven-development'].map(n=>skillTutorial(catalogue.skills.find(c=>c.name===n),'2026-11-01'))];
  assert.ok(cards.length>=3);
  for(const card of cards){
    assert.ok(extractProcedure(card).length>=3);
    for(const short of [false,true]){
      const p=plan(card,short);assert.deepEqual(validatePlan(card,p),[]);
      if(!card.skillSource)assert.ok(!/assistant|instructions are available/i.test(p.scene.find(s=>s.dati.comando===card.install).dati.risultato));
      for(const scene of p.scene.filter(s=>s.role==='feature'||s.role==='verify'||s.role==='next')){
        assert.ok(scene.evidence.length);assert.ok(scene.evidence.every(q=>card.fonti.some(s=>s.url.includes(card.commit)&&s.testo.includes(q))));
        assert.deepEqual(textIssues(scene.voce,{voice:true,tool:!card.skillSource}),[]);
        if(scene.dati.comando)assert.ok(card.fonti.some(s=>s.testo.includes(scene.dati.comando)));
      }
    }
  }
});
test('Q2 fewer than three real steps, mutable sources and fabricated explanations fail closed',()=>{
  const card=trialTutorials('2026-11-01')[0];
  const mutable=structuredClone(card);for(const s of mutable.fonti)s.url=s.url.replace(card.commit,'main');
  assert.throws(()=>lessonFor(mutable),/at least 3/);
  const invented=structuredClone(card);invented.steps[0].text='This uploads your passwords.';assert.ok(validateCard(invented).length);
  const thin=structuredClone(card);thin.fonti=[{url:card.fonti[0].url,testo:'## Usage\n```sh\nlms status\n```',sha256:digest('## Usage\n```sh\nlms status\n```')}];
  assert.throws(()=>lessonFor(thin),/at least 3/);
});
