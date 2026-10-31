// Validate the main content; navigation/footer groups are independent.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './fonti.mjs';
export function checkPage(html,file='page') {
  const errors=[],main=/<main\b[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1]||'';
  const h=[...main.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)];
  if(h.filter(m=>m[1]==='1').length!==1)errors.push(`${file}: requires one H1`);
  if(/<title>(.*?)<\/title>/.exec(html)?.[1]!==h.find(m=>m[1]==='1')?.[2])errors.push(`${file}: title must equal H1`);
  for(let i=1;i<h.length;i++)if(Number(h[i][1])>Number(h[i-1][1])+1)errors.push(`${file}: heading level skipped`);
  for(const s of main.matchAll(/<article\b[^>]*class="cat-scheda"[^>]*>([\s\S]*?)<\/article>/g))
    if(!/<h3\b[^>]*>[\s\S]*?<\/h3>/.test(s[1]))errors.push(`${file}: list item needs an H3`);
  for(const group of main.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/g)) {
    for(const item of group[1].matchAll(/<(?:li|article)\b[^>]*>([\s\S]*?)<\/(?:li|article)>/g)) {
      const links=[...item[1].matchAll(/<a\b[^>]*href="(\/(?:skills|tutorials)\/[^"#?]+)"/g)];
      for(const link of links)if(![...item[1].matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)].some(h=>h[1].includes(link[0])))errors.push(`${file}: entry link must be in H3: ${link[1]}`);
    }
  }
  return errors;
}
export function checkDirectory(output) {
  const files=['skills.html','tutorials.html',...['skills','tutorials'].flatMap(d=>{
    const p=path.join(output,d);return fs.existsSync(p)?fs.readdirSync(p).filter(f=>f.endsWith('.html')).map(f=>`${d}/${f}`):[];
  })];
  return {checked:files.length,errors:files.flatMap(f=>checkPage(fs.readFileSync(path.join(output,f),'utf8'),f))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const result=checkDirectory(path.resolve(process.env.SITO_OUTPUT||path.join(ROOT,'sito')));
  if(result.errors.length){console.error(result.errors.join('\n'));process.exitCode=1;}
  else console.log(`Heading hierarchy and title/H1: ${result.checked} pages passed`);
}
