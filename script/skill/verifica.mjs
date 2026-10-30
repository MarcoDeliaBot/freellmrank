import { createHash } from 'node:crypto';
import { plain } from './fonti.mjs';
export const digest = s => createHash('sha256').update(s).digest('hex');
export const normalized = s => String(s).replace(/\s+/g, ' ').trim();
export const DISCLAIMER = 'Static checks cannot prove that a skill is safe. Review the pinned source and its dependencies before installing. Updates require a new check.';
export const SECURITY_TEXT = 'The full repository was inspected without running its code: download-and-execute patterns, obfuscation, remote evaluation, sensitive file reads, external data sends, install hooks, executable binaries and incomplete scans.';
export const GENERIC = [
  'Choose an assistant supported by the installer. Read the source before granting file or network access.',
  'The README does not state a hardware requirement for this skill. Assistant costs and permissions depend on your setup.',
  'Install the documented tool for your operating system before running these commands.',
  'Check the result in your own project. The repository describes intended behavior, not an independent benchmark.',
  'Open the pinned README and check the command. Run it from the project where you want to use the skill.',
  'Use the example below after installation. Keep the original wording when checking it against the source.',
  'The guide covers the commands documented by the project. Model downloads, memory use and performance depend on the model and your machine.',
  'Inspect the proposed changes before accepting them. Keep a copy of your work so you can compare the result.',
  'For the complete instructions and any prerequisites, open the official source linked on this page.',
  'This is a source-based walkthrough. Commands are displayed for you to review; this pipeline does not execute the skill.',
];

export function validateCard(card) {
  const errors = [];
  if (card?.videoVerified) {
    const {videoVerified, ...content}=card;
    if(videoVerified.cardHash!==digest(JSON.stringify(content))) errors.push('content changed after video verification');
  }
  if (!['skill', 'tutorial'].includes(card?.tipo) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(card?.slug || '')) return ['invalid card identity'];
  if (!card.titolo || card.titolo.length > 95 || !card.key || !/^\d{4}-\d{2}-\d{2}$/.test(card.date || '')) errors.push('invalid title, keyword or date');
  if (!card.fonti?.length || card.fonti.some(f => !/^https:\/\//.test(f.url) || digest(f.testo) !== f.sha256)) errors.push('missing or altered source snapshot');
  const corpus = normalized((card.fonti || []).flatMap(f => [f.testo, plain(f.testo)]).join('\n'));
  const backed = s => !!s && corpus.includes(normalized(s));
  if (!backed(card.name) || !backed(card.problem)) errors.push('name or opening problem has no source evidence');
  if ((card.flow || []).some(s=>!backed(s))) errors.push('workflow contains an unsupported step');
  if ((card.audience || []).some(s=>!backed(s))) errors.push('assistant compatibility has no source evidence');
  if ((card.limits || []).some(s=>!GENERIC.includes(s)&&s!==DISCLAIMER&&!backed(s))) errors.push('unsupported limitation');
  const expectedTitles=[`${card.name}: Agent Skill`,`How to install and use ${card.name}`,`How to use ${card.name} locally`,`How to run ${card.name} locally for free`,`How to use ${card.name} for free online`];
  if (!expectedTitles.includes(card.titolo)) errors.push('title is outside the source-backed topic contract');
  for (const c of card.claims || []) if (!backed(c)) errors.push(`unsupported claim: ${c}`);
  if (!card.claims?.length || !backed(card.descr)) errors.push('description has no exact source evidence');
  if (!card.install || !backed(card.install) || /[;&|]|\$\(|[<>…]/.test(card.install)) errors.push('installation command is absent, altered or unsafe');
  const stepTitles=['Read the source','Install the skill','Try the documented example','Review the result','Prepare your machine','Run the documented command','Review the output','Install the official tool','Use the documented command','Check the result'];
  for (const step of card.steps || []) {
    if (step.command && !backed(step.command)) errors.push(`unsupported step command: ${step.command}`);
    if (step.text && !GENERIC.includes(step.text) && !backed(step.text)) errors.push('unsupported step explanation');
    if (!stepTitles.includes(step.title) && !backed(step.title)) errors.push('unsupported step heading');
  }
  if (card.tipo === 'skill' || card.skillSource) {
    const s = card.security;
    if (!s?.passed || !s.complete || !s.files || !/^[a-f0-9]{40}$/.test(s.commit || '') || !s.checked?.includes('all-files') || s.errors?.length) errors.push('security gate failed or incomplete');
    if (s.commit !== card.commit || s.date !== card.metrics?.date) errors.push('security/metrics/source revision mismatch');
  }
  if (!card.features || card.features.length !== 3 || card.features.some(f => !backed(f.detail) || !backed(f.label))) errors.push('three source-backed features required');
  if (!card.example || !backed(card.example)) errors.push('usage example absent from official source');
  if ((card.screenshots || []).some(s => !/^https:\/\/(?:raw\.githubusercontent\.com|github\.com)\//.test(s.url))) errors.push('untrusted screenshot URL');
  return errors;
}

// Exact supported phrases plus editorial boilerplate. Unlike a name-only check,
// this also rejects invented claims containing no proper nouns or numbers.
export function approvedText(card, value) {
  const clean = normalized(value);
  const pool = [card.titolo, card.descr, card.name, card.repository, card.install, card.example,
    `github.com/${card.repository}`, card.problem, ...(card.claims || []), ...GENERIC, DISCLAIMER, SECURITY_TEXT,
    ...(card.features || []).flatMap(f => [f.label, f.detail]), ...(card.steps || []).flatMap(s => [s.title, s.text, s.command].filter(Boolean)),
    ...(card.limits || []), ...((card.fonti || []).flatMap(f => [f.testo, plain(f.testo)]))];
  return !!clean && pool.some(s => normalized(s).includes(clean));
}

export function topicExists(card, existing) {
  const norm = s => normalized(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return existing.some(x => (x.key && norm(x.key) === norm(card.key)) || (x.slug && x.slug === card.slug) || (x.titolo && norm(x.titolo) === norm(card.titolo)));
}
