import { esc, pagina, URL_SITO } from './comune.mjs';
import { pageURL, categoryURL, monthURL, historySummary, currentPosition } from '../skill/archivio.mjs';

const section=(title,body,id='')=>`<section class="cat-guida"${id?` id="${id}"`:''}><div class="cat-testa"><h2>${esc(title)}</h2></div>${body}</section>`;
const date = d => esc(d||'Not observed');
export function statusLine(c,context) {
  const s=historySummary(c,context.history),position=currentPosition(c,context.catalogue,context.history);
  return `<p class="skill-status">${position!==null?`In this week's ranking: #${position}`:`Not in this week's ranking · last seen ${date(s.lastSeen)} · best position ${s.best!==null?'#'+s.best:'not observed'}`}</p>`;
}
export function categoryLink(c,context) {
  const cat=context.categories.find(x=>x.slug===c.category);
  return cat?`<p><a href="${context.publishedCategories.some(x=>x.slug===cat.slug)?categoryURL(cat.slug):'/skills.html#category-'+cat.slug}">More skills for ${esc(cat.nome)}</a></p>`:'<p><a href="/skills.html#browse-by-category">More skills by category</a></p>';
}
export function rankingHistory(c,context) {
  const s=historySummary(c,context.history);
  const summary=`First seen ${s.firstSeen??'not observed'}; last seen ${s.lastSeen??'not observed'}; best position ${s.best!==null?'#'+s.best:'not observed'}; latest stars ${s.stars??'not observed'}.`;
  if(s.days.length<7)return section('Ranking history',`<table><caption>Daily observations</caption><tbody>${[['First seen',s.firstSeen??'Not observed'],['Last seen',s.lastSeen??'Not observed'],['Best position',s.best!==null?'#'+s.best:'Not observed'],['Latest stars',s.stars??'Not observed']].map(([a,b])=>`<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</tbody></table>`);
  const w=360,h=320,left=72,right=344,n=s.days.length;
  const values=s.days.map(d=>d.stars).filter(v=>v!==null),min=values.length?Math.min(...values):0,max=values.length?Math.max(...values):0,worst=Math.max(1,...s.days.map(d=>d.position||1));
  const firstDate=Date.parse(s.days[0].date),span=Date.parse(s.days.at(-1).date)-firstDate;
  const x=i=>left+(Date.parse(s.days[i].date)-firstDate)*(right-left)/(span||1);
  const starY=v=>128-((v-min)/(max-min||1))*80,rankY=v=>196+(v-1)/(worst-1||1)*65;
  const paths=(field,y)=>{
    let open=false;
    return s.days.map((d,i)=>{if(d[field]===null){open=false;return '';}if(i&&Date.parse(d.date)-Date.parse(s.days[i-1].date)>864e5)open=false;const v=`${open?'L':'M'}${x(i).toFixed(1)},${y(d[field]).toFixed(1)}`;open=true;return v;}).join(' ');
  };
  return section('Ranking history',`<figure class="skill-history"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(summary)}" xmlns="http://www.w3.org/2000/svg"><title>${esc(summary)}</title><desc>Repository stars above; skills.sh trending24h position below. Position one is highest. Gaps mean no observed ranking.</desc><g fill="currentColor" font-size="12"><text x="${left}" y="25">Repository stars</text><text x="8" y="55">${esc(max)}</text><text x="8" y="130">${esc(min)}</text><text x="${left}" y="178">Trending position · #1 at top</text><text x="22" y="201">#1</text><text x="12" y="266">#${worst}</text><text x="${left}" y="307">${s.days[0].date}</text><text x="${right}" y="307" text-anchor="end">${s.days.at(-1).date}</text></g><path d="M${left} 140H${right}M${left} 275H${right}" stroke="currentColor" opacity=".25"/><path d="${paths('stars',starY)}" fill="none" stroke="var(--skill-stars, #648fff)" stroke-width="3"/><path d="${paths('position',rankY)}" fill="none" stroke="var(--skill-rank, #de8f05)" stroke-width="3" stroke-dasharray="7 3"/>${s.days.map((d,i)=>d.position!==null?`<circle cx="${x(i).toFixed(1)}" cy="${rankY(d.position).toFixed(1)}" r="3" fill="var(--skill-rank, #de8f05)"/>`:'').join('')}</svg><figcaption>${esc(summary)} Dates show actual observations; missing ranks are not interpolated.</figcaption></figure>`);
}
const monthName=m=>new Date(m+'-01T12:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
export const monthTitle=m=>`Best Agent Skills – ${monthName(m)}`;
export function archiveIndexSections(context) {
  return section('Monthly archive',context.months.map(m=>`<article class="cat-scheda"><h3><a href="${monthURL(m.month)}">${esc(monthTitle(m.month))}</a></h3></article>`).join('')||'<p>The first monthly archive needs at least 14 observed days in a completed month.</p>','monthly-archive')+
    section('Browse by category',context.categories.map(cat=>`<article class="cat-scheda" id="category-${cat.slug}"><h3>${context.publishedCategories.some(x=>x.slug===cat.slug)?`<a href="${categoryURL(cat.slug)}">${esc(cat.nome)}</a>`:esc(cat.nome)}</h3>${context.publishedCategories.some(x=>x.slug===cat.slug)?'':'<p>A category page opens after three active skill guides are published.</p>'}</article>`).join(''),'browse-by-category');
}
export function archivePages(context,dati,blog) {
  for(const cat of context.publishedCategories) {
    const members=context.cards.filter(c=>c.tipo==='skill'&&!c.retirement&&c.category===cat.slug).sort((a,b)=>(b.archiveMetrics?.stars??b.metrics?.stars??0)-(a.archiveMetrics?.stars??a.metrics?.stars??0)||a.name.localeCompare(b.name));
    const title=`Best Agent Skills for ${cat.nome}`;
    pagina({file:categoryURL(cat.slug).slice(1),titolo:title,descr:cat.introduzione,attiva:'/skills.html',dati,blog,corpo:`<div class="articolo skill-tutorial"><header class="art-testa"><h1>${esc(title)}</h1><p class="lead">${esc(cat.introduzione)}</p></header>${section('Skills',members.map(c=>`<article class="cat-scheda"><h3><a href="${pageURL(c)}">${esc(c.titolo)}</a></h3><p>${esc(c.descr)}</p><p>${c.archiveMetrics?.stars??c.metrics?.stars??'Not observed'} repository stars · observed ${date(c.archiveMetrics?.date||c.metrics?.date)}</p>${currentPosition(c,context.catalogue,context.history)!==null?'<p class="tag">In this week\'s ranking</p>':''}</article>`).join('')||'<p>No active guides currently belong to this category.</p>')}</div>`});
  }
  for(const m of context.months) {
    const title=monthTitle(m.month);
    const body=`<article class="articolo skill-tutorial"><header class="art-testa"><h1>${esc(title)}</h1><p class="lead">${m.observedDays} observed days · frozen on ${m.frozenOn}</p></header>${section('Monthly top 10','<p>Skills are ordered by days in the daily trending ranking, then by lowest average position; repository and skill identity break any remaining tie.</p>'+m.entries.map((e,i)=>`<article class="cat-scheda"><h3><span class="cat-conta">${i+1}</span> <a href="${esc(e.url)}">${esc(e.name)}</a></h3><p>Stars at first observation: ${e.startStars??'not observed'} (${e.startDate??'unavailable'}); stars at last observation: ${e.endStars??'not observed'} (${e.endDate??'unavailable'}).</p><p>${e.days} days in ranking · best position #${e.best} · average position ${e.average.toFixed(2)}</p></article>`).join(''))}${section('Adjacent months',`<nav class="skill-month-nav" data-month="${m.month}" aria-label="Adjacent monthly archives"><p><a data-month-previous href="/skills.html#monthly-archive">Previous month · monthly archive</a></p><p><a data-month-next href="/skills.html#monthly-archive">Next month · monthly archive</a></p><noscript><p>The monthly archive lists every available month in order.</p></noscript></nav>`)}</article>`;
    // Entire document is deterministic from the immutable snapshot. Even footer,
    // cache-buster and today's news cannot change its bytes on later builds.
    const html=`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="The monthly top 10 Agent Skills for ${esc(monthName(m.month))}."><link rel="canonical" href="${URL_SITO}${monthURL(m.month).replace(/\.html$/,'')}"><link rel="stylesheet" href="/style.css"><script src="/skill-month-navigation.js" defer></script></head><body><header class="top"><div class="barra"><a class="logo" href="/">FreeLLM<span>Arena</span></a><a href="/skills.html">Agent Skills</a></div></header><main class="contenuto" style="margin:0 auto;max-width:1080px">${body}</main></body></html>\n`;
    pagina({file:monthURL(m.month).slice(1),titolo:title,descr:title,attiva:'/skills.html',dati,blog,htmlCompleto:html});
  }
}
