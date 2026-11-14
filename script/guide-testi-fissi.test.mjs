// Prova dei testi fissi delle guide (14/11/2026): titolo, apertura e frasi di trasparenza vengono dal file della guida, non dal modello.
// Il caso vero è la corsa 43579848323 della guida freeduet: titolo «…locally for free», apertura «…for free. But the installation
// steps are the real story.», «made by the same author as FreeLLMArena» mai pronunciata, nello Short manca l'abbonamento Claude
// a pagamento, «eleven specialists» al posto di undici assistenti in tutto. Il modello è finto: niente rete.
// Uso: node --test script/guide-testi-fissi.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { RADICE } from './sito/comune.mjs';
import { metaYoutube } from './brag/titoli-yt.mjs';
import { pianoPer, controllaPiano } from './video-hf/piano.mjs';
import { pianoBreve } from './video-hf/breve.mjs';

const lettura = (...p) => JSON.parse(fs.readFileSync(path.join(RADICE, ...p), 'utf8'));
const freeduet = lettura('contenuti', 'video-guide', 'freeduet.json');
const FISSI = freeduet.fissi;
const fissiMod = () => import('./video-hf/fissi.mjs');

// il piano che il modello ha scritto davvero (ricostruito dal .srt della release video-guida-freeduet-…): titolo e apertura con
// «for free», una scena con «eleven specialists», e nessuna frase di trasparenza
const SCENE_BRUTTE = [
  { stampo: 'titolo', etichetta: 'Guide', voce: 'FreeDuet runs eleven AI assistants on your own computer for free. But the installation steps are the real story.',
    dati: { testo: 'FreeDuet runs eleven AI assistants locally for free', evidenza: 'eleven AI', sopra: 'Guide · 14 November 2026' } },
  { stampo: 'punti', etichetta: 'What you need', voce: 'To try FreeDuet you need Docker, Bash, Bun, and a paid Claude subscription. The app signs in through the official Claude Code app and never stores your login. FreeDuet does not require an API key.',
    dati: { titolo: 'What you need', punti: ['Docker, Bash and Bun', 'A paid Claude subscription', 'No API key'] } },
  { stampo: 'punti', etichetta: 'How to start', voce: 'Clone the repository, copy the example settings file, run the start script, sign in once, then open the page on port 3010. The project is released under the MIT license.',
    dati: { titolo: 'How to start', punti: ['Clone the repository', 'Run the start script', 'Open port 3010'] } },
  { stampo: 'punti', etichetta: 'The team', voce: 'The team includes eleven specialists: mail, contracts, invoices, errands, writing, marketing, repairs and cooking.',
    dati: { titolo: 'The team', punti: ['Mail and contracts', 'Invoices and errands', 'Writing and marketing'] } },
  { stampo: 'punti', etichetta: 'Tests and approval', voce: 'Version 0.1 passed all 43 test cases and all 45 safety checks. Five actions always wait for your approval: send, pay, sign, book and delete.',
    dati: { titolo: 'Your approval', punti: ['Send', 'Pay', 'Sign', 'Book and delete'] } },
  { stampo: 'punti', etichetta: 'The assistants', voce: 'You talk to Iris, the coordinator, and she hands each piece of work to the right specialist. An assistant can open a browser on your computer to look up prices, fill in forms and prepare drafts.',
    dati: { titolo: 'Iris coordinates', punti: ['Talk to Iris', 'She picks a specialist', 'A browser for forms'] } },
];
const modelloFinto = (scene = SCENE_BRUTTE) => {
  const f = async (domanda) => { f.domande.push(domanda); return { scene: JSON.parse(JSON.stringify(scene)) }; };
  f.domande = [];
  return f;
};
const parlato = (piano) => piano.scene.filter((s) => s.stampo !== 'chiusura').map((s) => s.voce).join(' ');

test('a. il piano: la guida con «fissi» comincia con la sua apertura e non ha le frasi del modello', async () => {
  const { contiene } = await fissiMod();
  const chiedi = modelloFinto();
  const piano = await pianoPer(freeduet, { chiedi });
  // l'apertura è la prima frase della prima scena, parola per parola; quella del modello è sparita
  assert.ok(piano.scene[0].voce.startsWith(`${FISSI.apertura} `), piano.scene[0].voce);
  assert.ok(!/for free/i.test(parlato(piano)), 'il «for free» del modello non c\'è più');
  // le frasi di trasparenza, che il modello non aveva scritto, le ha messe il codice
  for (const m of FISSI.obbligatorie) assert.ok(contiene(parlato(piano), m), `manca «${m}»`);
  // la scena con «eleven specialists» è stata tolta (e il modello l'ha saputo: il suo prompt porta i testi fissi)
  assert.ok(!/eleven specialists/i.test(parlato(piano)));
  assert.ok(chiedi.domande[0][0].content.includes('FIXED TEXTS'), 'il prompt porta i testi fissi');
  assert.ok(chiedi.domande[0][0].content.includes(FISSI.apertura));
  // il piano porta i testi fissi per lo Short; la chiusura resta l'ultima scena
  assert.deepEqual(piano.fissi, FISSI);
  assert.equal(piano.scene.at(-1).stampo, 'chiusura');
  // il registro dice cosa ha fatto il codice
  assert.ok(piano.problemi.some((p) => p.startsWith('testi fissi: apertura') && p.includes(FISSI.obbligatorie[0])), piano.problemi.join(' | '));
  assert.ok(piano.problemi.some((p) => /frase vietata «for free»/.test(p)) && piano.problemi.some((p) => /frase vietata «eleven specialists»/.test(p)));
});

// un piano del modello senza frasi vietate: solo il gancio è «debole» per le regole di prima (22 parole, niente numero)
const SCENE_PULITE = SCENE_BRUTTE.map((sc, i) => (i === 0
  ? { ...sc, voce: 'FreeDuet runs eleven AI assistants on your own computer. But the installation steps are the real story.', dati: { testo: 'FreeDuet runs eleven AI assistants on your computer', evidenza: 'eleven AI', sopra: 'Guide · 14 November 2026' } }
  : i === 3 ? { ...sc, voce: 'Iris coordinates the specialists for mail, contracts, invoices, errands, writing, marketing, repairs and cooking.' } : sc));

test('a. piano pulito del modello: un solo tentativo, apertura fissa in testa, frasi mancanti aggiunte dopo, resto del modello al suo posto', async () => {
  const { contiene } = await fissiMod();
  const chiedi = modelloFinto(SCENE_PULITE);
  const piano = await pianoPer(freeduet, { chiedi });
  assert.equal(piano.riserva, false);
  assert.equal(chiedi.domande.length, 1, 'il gancio fisso non si controlla: il modello non viene richiamato per un gancio «debole»');
  const [prima, seconda] = piano.scene;
  assert.equal(prima.voce, `${FISSI.apertura} ${FISSI.obbligatorie.join(' ')} But the installation steps are the real story.`);
  assert.equal(seconda.voce, SCENE_PULITE[1].voce, 'le altre scene del modello non si toccano');
  assert.equal(prima.dati.testo, 'FreeDuet runs eleven AI assistants on your computer');
  assert.ok(FISSI.obbligatorie.every((m) => contiene(parlato(piano), m)));
  // una frase obbligatoria che il modello ha già scritto non si ripete
  const conFrase = SCENE_PULITE.map((sc, i) => (i === 2 ? { ...sc, voce: `${sc.voce} ${FISSI.obbligatorie[0]}` } : sc));
  const p2 = await pianoPer(freeduet, { chiedi: modelloFinto(conFrase) });
  assert.equal(parlato(p2).split(FISSI.obbligatorie[0]).length - 1, 1, 'detta una volta sola');
});

test('a. senza apertura fissa il gancio del modello resta e le frasi obbligatorie si aggiungono dopo', async () => {
  const { conFissi } = await fissiMod();
  const scene = [{ stampo: 'titolo', voce: 'One. Two. Three.' }, { stampo: 'punti', voce: 'Four.' }];
  assert.equal(conFissi(scene, { obbligatorie: ['Five six.'] }).scene[0].voce, 'One. Five six. Two. Three.');
  assert.deepEqual(conFissi(scene, {}).scene, scene, 'niente da fare: stesse scene');
  assert.equal(conFissi(scene, { apertura: 'Zero.', obbligatorie: ['Four.'] }).scene[0].voce, 'Zero. Two. Three.', 'una frase già detta in un\'altra scena non si ripete');
  const piano = await pianoPer({ ...freeduet, fissi: { obbligatorie: FISSI.obbligatorie } }, { chiedi: modelloFinto(SCENE_PULITE) });
  assert.ok(piano.scene[0].voce.startsWith('FreeDuet runs eleven AI assistants on your own computer. '), 'il gancio del modello non si tocca');
  assert.ok(piano.scene[0].voce.includes(FISSI.obbligatorie[0]));
});

test('a. il piano di riserva (nessun modello) ha comunque l\'apertura fissa', async () => {
  const chiedi = async () => { throw new Error('workers: /api/scrivi 429: Daily writing budget used. Try tomorrow.'); };
  const piano = await pianoPer(freeduet, { chiedi });
  assert.equal(piano.riserva, true);
  assert.ok(piano.scene[0].voce.startsWith(`${FISSI.apertura} `));
});

test('a. lo Short comincia con la stessa apertura e dice le frasi obbligatorie dello Short', async () => {
  const { contiene } = await fissiMod();
  const lungo = await pianoPer(freeduet, { chiedi: modelloFinto() });
  const breve = pianoBreve(lungo);
  assert.ok(breve.scene[0].voce.startsWith(`${FISSI.apertura} `), breve.scene[0].voce);
  for (const m of FISSI.obbligatorieBreve) assert.ok(contiene(parlato(breve), m), `manca nello Short «${m}»`);
  assert.ok(!/for free/i.test(parlato(breve)));
  assert.equal(breve.scene.at(-1).stampo, 'chiusura');
  // lo Short ha la sua lista: una frase solo del video lungo non ci finisce
  const solo = { ...lungo, fissi: { ...FISSI, obbligatorie: [...FISSI.obbligatorie, 'Version 0.1 is an early release.'], obbligatorieBreve: [FISSI.obbligatorie[0]] } };
  const l2 = { ...solo, scene: solo.scene.map((s, i) => (i === 0 ? { ...s, voce: s.voce.replace(' ', ' Version 0.1 is an early release. ') } : s)) };
  assert.ok(!pianoBreve(l2).scene[0].voce.includes('early release'), 'la frase del solo video lungo si toglie dalla prima scena');
});

test('a. il titolo fisso vince su quello del modello, la riga di trasparenza sta sotto la prima frase', () => {
  const regge = () => true;
  const base = { n: { titolo: freeduet.titolo, descr: freeduet.descr }, regge, nomi: ['FreeDuet'], url: 'https://freeduet.com', righeFonti: 'FreeDuet on GitHub: https://github.com/x', guida: true };
  const yt = { titolo: 'FreeDuet runs eleven AI assistants locally for free', apertura: 'FreeDuet is a free app.', domanda: 'Would you try it?' };
  const con = metaYoutube({ ...base, yt, fissi: FISSI });
  assert.equal(con.titolo, FISSI.titolo);
  const righe = con.descrizione.split('\n');
  assert.equal(righe[1], FISSI.rigaDescrizione, 'seconda riga');
  // senza «fissi» il titolo del modello vince, come prima
  assert.equal(metaYoutube({ ...base, yt }).titolo, yt.titolo);
  assert.ok(!metaYoutube({ ...base, yt }).descrizione.includes('Disclosure'));
  // con una frase vietata il titolo, la domanda e l'apertura del modello si scartano
  const vietata = metaYoutube({ ...base, yt: { ...yt, apertura: 'FreeDuet runs for free.', domanda: 'Is FreeDuet for free?' }, fissi: { ...FISSI, rigaDescrizione: '' } });
  assert.ok(!/for free/i.test(vietata.descrizione));
  assert.ok(vietata.tolti.some((t) => t.includes('for free')));
});

test('b. frase obbligatoria mancante: il controllo dà errore in italiano', async () => {
  const { controllaFissi } = await fissiMod();
  const info = { titolo: FISSI.titolo, descrizione: `Prima frase.\n${FISSI.rigaDescrizione}\n\nAltro.` };
  const bene = `${FISSI.apertura} ${FISSI.obbligatorie.join(' ')} Il resto.`;
  assert.deepEqual(controllaFissi({ fissi: FISSI, tipo: 'lungo', ...info, parlato: bene }), []);
  const senza = controllaFissi({ fissi: FISSI, tipo: 'lungo', ...info, parlato: `${FISSI.apertura} ${FISSI.obbligatorie[1]}` });
  assert.deepEqual(senza, [`Frase obbligatoria non pronunciata (video lungo): «${FISSI.obbligatorie[0]}»`]);
  // lo Short ha la sua lista
  assert.equal(controllaFissi({ fissi: FISSI, tipo: 'breve', titolo: `${FISSI.titolo} #Shorts`, descrizione: info.descrizione, parlato: `${FISSI.apertura} ${FISSI.obbligatorie[0]}` })[0],
    `Frase obbligatoria non pronunciata (Short): «${FISSI.obbligatorie[1]}»`);
  // riga della descrizione mancante, titolo diverso, apertura diversa: ognuno dà il suo errore
  const p = controllaFissi({ fissi: FISSI, tipo: 'lungo', titolo: 'Un altro titolo', descrizione: 'Niente.', parlato: `Altra apertura. ${FISSI.obbligatorie.join(' ')}` });
  assert.equal(p.length, 3);
  assert.match(p[0], /^Titolo \(video lungo\) diverso da quello fisso/);
  assert.match(p[1], /^Descrizione \(video lungo\) senza la riga fissa/);
  assert.match(p[2], /^Parlato \(video lungo\) che non comincia con la frase d'apertura fissa/);
  // le frasi si confrontano per parole: maiuscole, punteggiatura e trattini non contano; parole a metà no
  assert.deepEqual(controllaFissi({ fissi: FISSI, tipo: 'lungo', ...info, parlato: `${FISSI.apertura.toUpperCase()} ${FISSI.obbligatorie.join(' ').replace(/\./g, ',')}` }), []);
});

test('b. il controllo sui file veri della corsa 43579848323: tutti e cinque i difetti si vedono', async () => {
  const { controllaFissi } = await fissiMod();
  const lungo = { titolo: 'FreeDuet runs eleven AI assistants locally for free', descrizione: 'FreeDuet is an open‑source app.\n\nChapters:\n0:00 Intro\n\n💬 Which tool should we try next?' };
  const srt = 'FreeDuet runs eleven AI assistants on your own computer for free. But the installation steps are the real story. The team includes eleven specialists: mail, contracts.';
  const p = controllaFissi({ fissi: FISSI, tipo: 'lungo', ...lungo, parlato: srt });
  assert.equal(p.length, 8, p.join('\n'));
  assert.ok(p.some((x) => /Titolo/.test(x)) && p.some((x) => /Descrizione/.test(x)) && p.some((x) => /non comincia/.test(x)));
  assert.equal(p.filter((x) => /obbligatoria/.test(x)).length, 2);
  assert.ok(p.some((x) => /«eleven specialists»/.test(x)));
});

test('c. frase vietata nel titolo, nella descrizione o nel parlato: errore, senza badare a maiuscole', async () => {
  const { controllaFissi, parlatoDaSrt } = await fissiMod();
  const ok = { titolo: FISSI.titolo, descrizione: `Prima.\n${FISSI.rigaDescrizione}`, parlato: `${FISSI.apertura} ${FISSI.obbligatorie.join(' ')}` };
  assert.deepEqual(controllaFissi({ fissi: FISSI, ...ok }), []);
  assert.deepEqual(controllaFissi({ fissi: FISSI, ...ok, parlato: `${ok.parlato} The app runs FOR FREE on any laptop.` }), ['Frase vietata «for free» trovata nel parlato (video lungo)']);
  assert.deepEqual(controllaFissi({ fissi: FISSI, ...ok, descrizione: `${ok.descrizione}\nTry these free AI assistants today.` }), ['Frase vietata «free AI assistants» trovata nella descrizione (video lungo)']);
  assert.deepEqual(controllaFissi({ fissi: { ...FISSI, titolo: 'x', vietate: ['x y'] }, ...ok, titolo: 'Try X Y now' }).filter((x) => /vietata/.test(x)), ['Frase vietata «x y» trovata nel titolo (video lungo)']);
  // il .srt va letto senza numeri e tempi, con le righe spezzate unite («for» / «free» su due sottotitoli)
  assert.equal(parlatoDaSrt('1\n00:00:00,000 --> 00:00:01,000\nIt is yours for\n\n2\n00:00:01,000 --> 00:00:02,000\nfree today.\n'), 'It is yours for free today.');
  assert.deepEqual(controllaFissi({ fissi: FISSI, ...ok, parlato: `${ok.parlato} ${parlatoDaSrt('1\n00:00:00,000 --> 00:00:01,000\nIt is yours for\n\n2\n00:00:01,000 --> 00:00:02,000\nfree today.')}` }), ['Frase vietata «for free» trovata nel parlato (video lungo)']);
  // parole intere: «forever freedom» non è «for free»
  assert.deepEqual(controllaFissi({ fissi: FISSI, ...ok, parlato: `${ok.parlato} Forever freedom.` }), []);
  // la chiusura fissa del canale («Follow FreeLLMArena for free AI news every day») non conta, quando le chiusure sono date
  const chiusura = 'Follow FreeLLMArena for free AI news every day. Link in bio.';
  assert.equal(controllaFissi({ fissi: FISSI, ...ok, parlato: `${ok.parlato} ${chiusura}` }).length, 1);
  assert.deepEqual(controllaFissi({ fissi: FISSI, ...ok, parlato: `${ok.parlato} ${chiusura}`, chiusure: [chiusura] }), []);
});

test('c. nel piano, la scena con una frase vietata si toglie; se il modello insiste il piano finale è pulito', async () => {
  const c = controllaPiano({ scene: SCENE_BRUTTE }, freeduet);
  assert.equal(c.tolte, 2, c.problemi.join(' | '));
  assert.ok(c.problemi.some((p) => p.startsWith('scena 1 (titolo)') && p.includes('frase vietata «for free»')));
  assert.ok(c.problemi.some((p) => p.startsWith('scena 4 (punti)') && p.includes('frase vietata «eleven specialists»')));
  // lo stesso piano per una guida senza «fissi»: niente da togliere
  const { fissi, ...senza } = freeduet;
  assert.equal(controllaPiano({ scene: SCENE_BRUTTE }, senza).tolte, 0);
  // il piano finale dopo i 5 tentativi: nessuna frase vietata nella voce, e il file passa il controllo
  const { controllaFissi } = await fissiMod();
  return pianoPer(freeduet, { chiedi: modelloFinto() }).then((piano) => {
    const voce = parlato(piano);
    assert.deepEqual(controllaFissi({ fissi: FISSI, tipo: 'lungo', titolo: FISSI.titolo, descrizione: `a\n${FISSI.rigaDescrizione}`, parlato: voce }), []);
  });
});

test('«fissi» sbagliato: la guida non parte, con un messaggio in italiano', async () => {
  const { leggiFissi } = await fissiMod();
  assert.throws(() => leggiFissi({ fissi: { titolo: 'x'.repeat(93) } }), /«titolo» di 93 caratteri \(al massimo 92\)/);
  assert.throws(() => leggiFissi({ fissi: { obligatorie: ['A.'] } }), /campo sconosciuto «obligatorie»/);
  assert.throws(() => leggiFissi({ fissi: { apertura: 'Prima frase. Seconda frase.' } }), /«apertura» deve essere una frase sola/);
  assert.throws(() => leggiFissi({ fissi: { apertura: 'Is it free for free?', vietate: ['for free'] } }), /«apertura» contiene la frase vietata «for free»/);
  assert.throws(() => leggiFissi({ fissi: { vietate: 'for free' } }), /«vietate» deve essere un elenco/);
  // senza il campo: nessun cambiamento
  assert.equal(leggiFissi({ titolo: 'x' }), null);
  // «obbligatorieBreve» assente = quelle del video lungo
  assert.deepEqual(leggiFissi({ fissi: { obbligatorie: ['A b c.'] } }).obbligatorieBreve, ['A b c.']);
});

test('d. senza «fissi» niente cambia: notizie, tutte le altre guide e il piano senza il campo', async () => {
  // le altre guide non hanno il campo; la guida freeduet sì
  const dir = path.join(RADICE, 'contenuti', 'video-guide');
  const { leggiFissi } = await fissiMod();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const g = lettura('contenuti', 'video-guide', f);
    assert.deepEqual(leggiFissi(g), f === 'freeduet.json' ? leggiFissi(freeduet) : null, f);
    if (f !== 'freeduet.json') assert.ok(!('fissi' in g), f);
  }
  // una notizia: il prompt non porta il blocco dei testi fissi, le voci del modello restano com'erano, il piano non ha «fissi»
  const notizieDir = path.join(RADICE, 'contenuti', 'notizie');
  const notizia = lettura('contenuti', 'notizie', fs.readdirSync(notizieDir).filter((x) => x.endsWith('.json')).sort().at(-1));
  assert.notEqual(notizia.tipo, 'guida');
  const scene = [
    { stampo: 'titolo', etichetta: 'AI news', voce: 'Google just made one thousand answers cost one cent. But the price is the real story.', dati: { testo: 'Cheaper answers', sopra: 'AI news · 14 November 2026' } },
  ];
  const chiedi = modelloFinto(scene);
  const piano = await pianoPer({ ...notizia, tipo: undefined }, { chiedi });
  assert.ok(!chiedi.domande[0][0].content.includes('FIXED TEXTS'));
  assert.ok(!('fissi' in piano));
  assert.ok(!piano.problemi.some((p) => p.startsWith('testi fissi')));
  // una voce con «for free» passa il controllo come prima (nessuna frase vietata senza «fissi»)
  const c = controllaPiano({ scene: [{ ...scene[0], voce: 'It runs for free on your laptop and nobody pays. But the catch is the license.' }] }, { ...notizia, tipo: undefined });
  assert.ok(!c.problemi.some((p) => /frase vietata/.test(p)));
  // lo Short di un piano senza «fissi» è quello di prima: apertura, scena forte, chiusura
  const lungo = { notizia: 'x', scene: [{ stampo: 'titolo', voce: 'A. B.', dati: {} }, { stampo: 'punti', voce: 'C.', dati: {} }, { stampo: 'chiusura' }] };
  assert.deepEqual(pianoBreve(lungo).scene.map((s) => s.stampo), ['titolo', 'punti', 'chiusura']);
  assert.equal(pianoBreve(lungo).scene[0].voce, 'A. B.');
  // i metadati YouTube senza «fissi»: identici (niente riga, titolo del modello)
  const m = metaYoutube({ n: { titolo: 'Meta launches Muse Ember', descr: 'Meta launched Muse Ember.' }, yt: { titolo: 'Muse Ember is cheaper' }, regge: () => true, nomi: ['Meta'], url: 'u', righeFonti: 'r' });
  assert.equal(m.titolo, 'Muse Ember is cheaper');
  assert.equal(m.descrizione.split('\n')[1], '');
});

test('il file della guida freeduet: i testi fissi sono validi e dicono quello che serve', async () => {
  const { leggiFissi, contiene, comincia } = await fissiMod();
  const f = leggiFissi(freeduet);
  assert.equal(f.titolo, freeduet.titolo, 'il titolo fisso è quello della guida');
  assert.ok(comincia(f.apertura, 'FreeDuet is a team of eleven AI assistants'));
  assert.ok(f.obbligatorie.some((x) => contiene(x, 'FreeDuet is made by the same author as FreeLLMArena')));
  assert.ok(f.obbligatorie.some((x) => contiene(x, 'paid Claude subscription')));
  assert.equal(f.rigaDescrizione, 'Disclosure: FreeDuet is made by the same author as FreeLLMArena.');
  assert.deepEqual(f.vietate, ['for free', 'free AI assistants', 'eleven specialists', 'never share data']);
  assert.ok(f.titolo.length + ' #Shorts'.length <= 100);
});
