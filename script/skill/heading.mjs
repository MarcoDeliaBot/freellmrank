// Check the generated main content; the common footer/navigation is independent.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './fonti.mjs';
const errors=[];let checked=0;
for(const f of ['skills.html','tutorials.html',...['skills','tutorials'].flatMap(d=>{const p=path.join(ROOT,'sito',d);return fs.existsSync(p)?fs.readdirSync(p).filter(f=>f.endsWith('.html')).map(f=>`${d}/${f}`):[];})]) {
  const html=fs.readFileSync(path.join(ROOT,'sito',f),'utf8');
  const main=/<main\b[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] || '';
  const h=[...main.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)];
  if(h.filter(m=>m[1]==='1').length!==1)errors.push(`${f}: requires one H1`);
  const title=/<title>(.*?)<\/title>/.exec(html)?.[1];
  if(title!==h.find(m=>m[1]==='1')?.[2])errors.push(`${f}: title must equal H1`);
  for(let i=1;i<h.length;i++)if(Number(h[i][1])>Number(h[i-1][1])+1)errors.push(`${f}: heading level skipped`);
  for(const s of main.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g))if(!/<h3\b/.test(s[1]))errors.push(`${f}: list item needs an H3`);
  checked++;
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Heading hierarchy and title/H1: ${checked} pages passed`);
