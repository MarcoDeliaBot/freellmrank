import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { ROOT } from './fonti.mjs';
import { prepareArchive, assertRegistry, save, load, pageURL, monthURL, readCards, refreshPublished, reviewDecision, metricsDue, assignCategory, dailyHistory, licenseDisallows } from './archivio.mjs';
import { createFixture } from './archivio-fixture.mjs';
import { validateCard } from './verifica.mjs';
import { checkDirectory, checkPage } from './heading.mjs';

const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'skill-archive-test-'));
const run=(args,env)=>{
  const result=spawnSync(process.execPath,args,{cwd:ROOT,env:{...process.env,...env},encoding:'utf8',timeout:120000,maxBuffer:4e6});
  assert.equal(result.status,0,result.stderr||result.stdout||result.error?.message);
  return result.stdout;
};
function build(root,{full=false,date='2026-12-01'}={}) {
  const output=path.join(root,'site'),env={SKILL_ARCHIVE_ROOT:root,SKILL_ARCHIVE_DATE:date,SITO_OUTPUT:output};
  fs.mkdirSync(output,{recursive:true});
  // All fixture pages are rebuilt from scratch, so stale files cannot hide 404s.
  for(const dir of ['skills','tutorials'])fs.rmSync(path.join(output,dir),{recursive:true,force:true});
  if(full) {
    for(const f of ['data.json','history.json'])fs.copyFileSync(path.join(ROOT,'sito',f),path.join(output,f));
    run(['script/costruisci-sito.mjs'],env);
  } else run(['--input-type=module','-e',"import {pagineSkillTutorial} from './script/sito/skill-tutorial.mjs'; pagineSkillTutorial({aggiornato:'2026-12-01',categorie:[]},[]);"],env);
  return {output,env};
}
const html=(output,url)=>fs.readFileSync(path.join(output,url.replace(/^\//,'')),'utf8');
const main=h=>/<main\b[^>]*>([\s\S]*?)<\/main>/.exec(h)?.[1]||'';
const writeCard=(root,c)=>save(root,`contenuti/${c.tipo==='skill'?'skills':'tutorials'}/${c.slug}.json`,c);
const results={};

test('permanent archive acceptance T1–T8',async t=>{
  const root=temp(),fixture=createFixture(root);
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const initial=prepareArchive({root,date:'2026-12-01'});
  let output;
  await t.test('T1 every registered URL survives an entirely replaced catalogue',()=>{
    save(root,'dati/skill.json',{...fixture.catalogue,skills:[],aggiornato:'2026-11-21'});
    for(const c of readCards(root))writeCard(root,{...c,revoked:true,revokedOn:'2026-11-21'});
    ({output}=build(root));
    const current=prepareArchive({root,date:'2026-12-01'});
    assertRegistry(current,output);
    assert.equal(current.registry.length,initial.registry.length);
    assert.equal(readCards(root).filter(c=>c.revoked||c.retirement).length,0);
    assert.equal(main(html(output,'/skills.html')).includes('cat-conta'),false);
    results.T1={urls:current.registry.length,revoked:0};
    save(root,'dati/skill.json',fixture.catalogue);
  });
  await t.test('T2 a complete failed scan withdraws only the same skill and preserves its URL',async()=>{
    // The tested card starts active, including install code and a video player.
    ({output}=build(root));
    const c=readCards(root).find(c=>c.name==='code-simplification');
    assert.match(html(output,pageURL(c)),/<video/);assert.match(html(output,pageURL(c)),/<pre/);
    const sibling=readCards(root).find(c=>c.name==='api-and-interface-design');
    const bad={complete:true,units:[{skillPath:c.skillPath,complete:true,passed:false,errors:[{reason:'remote-eval'}]}]};
    const observed=new Map([[c.repository,{meta:{stargazers_count:1000,license:{spdx_id:'MIT'}},scan:bad}]]);
    await refreshPublished({root,date:'2026-11-15',catalogue:structuredClone(fixture.catalogue),observed,getAPI:async()=>({encoding:'base64',content:Buffer.from('MIT License').toString('base64'),license:{spdx_id:'MIT'}}),scanner:async()=>{throw Error('unexpected scan');}});
    ({output}=build(root));
    const page=html(output,pageURL(c));
    assert.match(page,/Withdrawn on 2026-11-15/);assert.match(page,/<meta name="robots" content="noindex">/);
    assert.doesNotMatch(main(page),/<(?:pre|code|video|iframe)\b|npx skills add/);
    assert.doesNotMatch(page,/<(?:video|iframe)\b|npx skills add/);
    assert.match(page,/More skills for Coding/);
    for(const url of ['/skills.html','/skills/for-coding.html'])assert.equal(main(html(output,url)).includes(pageURL(c)),false);
    assert.equal(readCards(root).find(c=>c.slug===sibling.slug).retirement,undefined);
    assert.equal(load(root,'dati/skill.json').skills.some(s=>s.slug===c.slug),false);
    results.T2={withdrawn:1,retainedSibling:1,commands:0,videos:0};
  });
  await t.test('T3 frozen month JSON and full HTML remain byte-identical after history changes',()=>{
    const file=path.join(root,'dati/skill-mesi/2026-11.json'),before=fs.readFileSync(file),page=Buffer.from(html(output,monthURL('2026-11')));
    const observation=load(root,'dati/skill-storico/2026-11-01.json');observation.stars={};observation.directory.trending24h=[];
    save(root,'dati/skill-storico/2026-11-01.json',observation);
    for(let i=1;i<=14;i++){const d=structuredClone(fixture.history[i-1]);d.date=`2026-12-${String(i).padStart(2,'0')}`;save(root,`dati/skill-storico/${d.date}.json`,d);}
    ({output}=build(root,{date:'2027-02-01'}));
    assert.deepEqual(fs.readFileSync(file),before);assert.deepEqual(Buffer.from(html(output,monthURL('2026-11'))),page);
    assert.equal(load(root,'dati/skill-mesi/2026-12.json').observedDays,14);
    results.T3={jsonBytes:before.length,htmlBytes:page.length,identical:true,adjacentMonthAdded:true};
  });
  await t.test('T4 13 observed days do not publish; 14 days publish only after month end',()=>{
    const thirteen=temp();t.after(()=>fs.rmSync(thirteen,{recursive:true,force:true}));createFixture(thirteen,{days:13});
    assert.equal(prepareArchive({root:thirteen,date:'2026-12-01'}).months.length,0);
    save(thirteen,'dati/skill-storico/2026-11-14.json',fixture.history.at(-1));
    assert.equal(prepareArchive({root:thirteen,date:'2026-11-30'}).months.length,0);
    const context=prepareArchive({root:thirteen,date:'2026-12-01'});
    assert.equal(context.months.length,1);assert.equal(context.months[0].month,'2026-11');
    assert.equal(context.months[0].observedDays,14);
    const expected=context.months[0].entries;
    assert.ok(expected.every((c,i)=>i===0||expected[i-1].days>c.days||expected[i-1].days===c.days&&expected[i-1].average<=c.average));
    results.T4={days13:0,days14BeforeClose:0,days14AfterClose:1,october:0};
  });
  await t.test('T5 category appears at three active pages and survives a fall back to two',()=>{
    const category=temp();t.after(()=>fs.rmSync(category,{recursive:true,force:true}));createFixture(category);
    const third=readCards(category).find(c=>c.name==='performance-optimization'),file=path.join(category,`contenuti/skills/${third.slug}.json`);
    fs.unlinkSync(file);
    assert.equal(prepareArchive({root:category,date:'2026-11-30'}).publishedCategories.some(c=>c.slug==='coding'),false);
    writeCard(category,third);
    assert.equal(prepareArchive({root:category,date:'2026-11-30'}).publishedCategories.some(c=>c.slug==='coding'),true);
    writeCard(category,{...third,retirement:{reason:'security',date:'2026-11-30'}});
    const context=prepareArchive({root:category,date:'2026-11-30'});
    assert.equal(context.publishedCategories.some(c=>c.slug==='coding'),true);
    assert.equal(context.cards.filter(c=>c.category==='coding'&&!c.retirement).length,2);
    const built=build(category);assert.ok(fs.existsSync(path.join(built.output,'skills/for-coding.html')));
    results.T5={at2:0,at3:1,backTo2:1};
  });
  await t.test('T6 all skill/tutorial/month/category headings and titles pass, broken examples fail',()=>{
    const checked=checkDirectory(output);assert.deepEqual(checked.errors,[]);
    for(const bad of [
      '<title>A</title><main><h1>A</h1><h1>A</h1></main>',
      '<title>B</title><main><h1>A</h1></main>',
      '<title>A</title><main><h1>A</h1><h3>Skip</h3></main>',
      '<title>A</title><main><h1>A</h1><h2>Skills</h2><section><article class="cat-scheda"><p><a href="/skills/example.html">Bad link</a></p></article></section></main>'
    ])assert.ok(checkPage(bad).length);
    results.T6={pages:checked.checked,errors:0,negativeFixtures:4};
  });
  await t.test('T7 full build sitemap contains every registered URL with lastmod',()=>{
    const built=build(root,{full:true});output=built.output;
    const sitemap=fs.readFileSync(path.join(output,'sitemap.xml'),'utf8'),registry=load(root,'dati/skill-pagine.json');
    for(const p of registry)assert.ok(sitemap.includes(`<loc>https://freellmarena.com${p.url}</loc><lastmod>`),p.url);
    results.T7={registered:registry.length,listed:registry.length};
  });
  await t.test('T8 all internal links resolve after the complete fixture build',()=>{
    assert.ok(output,'The full fixture build must have succeeded');
    const log=run(['script/controlla-link.mjs'],{SITO_OUTPUT:output});
    assert.match(log,/rotti 0/);const numbers=log.match(/pagine (\d+), link controllati (\d+), rotti (\d+)/);
    const context=prepareArchive({root,date:'2026-12-01'});assertRegistry(context,output);
    results.T8={pages:Number(numbers[1]),links:Number(numbers[2]),broken:0};
    // Keep an opt-in copy for the requested responsive screenshots, never dati/.
    if(process.env.SKILL_ARCHIVE_EVIDENCE) {
      const dest=path.resolve(process.env.SKILL_ARCHIVE_EVIDENCE);
      fs.mkdirSync(dest,{recursive:true});fs.cpSync(root,path.join(dest,'fixture'),{recursive:true});
      fs.writeFileSync(path.join(dest,'T1-T8.json'),JSON.stringify(results,null,2)+'\n');
    }
  });
});

test('withdrawal evidence and weekly quota guards',async t=>{
  const root=temp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const {cards,catalogue}=createFixture(root,{days:0});
  const c=cards[0],categories=load(root,'dati/skill-categorie.json');
  assert.equal(assignCategory({...c,category:'coding',name:'browser testing'},categories),'coding');
  assert.equal(assignCategory({name:'zzzz',descr:''},categories),'other');
  assert.equal(licenseDisallows({license:{spdx_id:'BSD-3-Clause'}},'All rights reserved. Redistribution and use in source and binary forms are permitted.'),false);
  assert.equal(licenseDisallows({license:{spdx_id:'NOASSERTION'}},''),false);
  assert.equal(metricsDue(c,'2026-11-02'),true);assert.equal(metricsDue(c,'2026-11-03'),false);
  const catalogueAbsent={...catalogue,skills:[]};let calls=0;
  await refreshPublished({root,date:'2026-11-03',catalogue:catalogueAbsent,scanner:async()=>{calls++;throw Error('unreachable');},getAPI:async()=>{calls++;throw Error('unreachable');}});
  assert.equal(calls,0,'outside ranking: no GitHub requests on Tuesday');
  await refreshPublished({root,date:'2026-11-03',catalogue:structuredClone(catalogue),scanner:async()=>{calls++;throw Error('unreachable');},getAPI:async()=>{calls++;throw Error('unreachable');}});
  assert.equal(calls,0,'catalogue membership alone is not ranking membership');
  save(root,'dati/skill-storico/2026-11-02.json',{date:'2026-11-02',stars:{},directory:{trending24h:[],allTime:[]}});
  const monday={root,date:'2026-11-02',catalogue:structuredClone(catalogueAbsent),scanner:async()=>{calls++;return {meta:{stargazers_count:42,license:{spdx_id:'MIT'}},scan:{complete:true,units:[]}};},getAPI:async()=>{calls++;return {encoding:'base64',content:Buffer.from('MIT License').toString('base64')};}};
  await refreshPublished(monday);
  assert.ok(readCards(root).every(c=>c.archiveMetrics.date==='2026-11-02'));
  assert.equal(load(root,'dati/skill-storico/2026-11-02.json').stars[c.repository],42);
  const mondayCalls=calls;assert.equal(mondayCalls,6,'one scan and one license call per distinct repository');
  await refreshPublished(monday);assert.equal(calls,mondayCalls,'same Monday never measures twice');
  const meta={archived:false},unit={skillPath:c.skillPath,complete:true,passed:false,errors:[{reason:'unsafe'}]};
  assert.equal(reviewDecision(c,{date:'2026-11-02',meta,scan:{complete:false,units:[unit]}}).retirement,undefined);
  assert.equal(reviewDecision(c,{date:'2026-11-02',meta,scan:{complete:true,units:[{...unit,skillPath:'other/SKILL.md'}]}}).retirement,undefined);
  assert.equal(reviewDecision(c,{date:'2026-11-02',meta:{archived:true}}).retirement.reason,'repository');
  for(const card of cards)writeCard(root,card);
  for(const [label,status] of [['missing','404'],['temporary','503']]) {
    await refreshPublished({root,date:'2026-11-02',catalogue:structuredClone(catalogueAbsent),scanner:async()=>{throw Error('scan unavailable');},getAPI:async()=>{throw Error(`GitHub ${status}`);}});
    const refreshed=readCards(root).find(x=>x.slug===c.slug);
    assert.equal(!!refreshed.retirement,label==='missing');
    // Restore the active source-backed card for the next independent scenario.
    for(const card of cards)writeCard(root,card);
  }
  const observed=new Map(cards.map(c=>[c.repository,{meta:{stargazers_count:42,license:{spdx_id:'NOASSERTION'}},scan:{complete:true,units:[]}}]));
  const licenseCatalogue=structuredClone(catalogue);
  licenseCatalogue.skills.push({...c,slug:'future-browser',skillPath:'skills/future/SKILL.md'});
  await refreshPublished({root,date:'2026-11-02',catalogue:licenseCatalogue,observed,getAPI:async()=>({encoding:'base64',content:Buffer.from('All rights reserved. Redistribution prohibited.').toString('base64')})});
  assert.ok(readCards(root).every(c=>c.retirement.reason==='license'));
  assert.equal(licenseCatalogue.skills.some(s=>s.slug==='future-browser'),false);
  const edited={...c,category:'coding',archiveMetrics:{date:'2026-11-02',stars:42}};
  assert.deepEqual(validateCard(edited),[]);edited.descr='invented';assert.ok(validateCard(edited).includes('content changed after video verification'));
  assert.ok(dailyHistory(c,[]).length===0);
  assert.throws(()=>assertRegistry({registry:[{url:'/skills/lost.html'}]},path.join(root,'site')),/not generated/);
});
