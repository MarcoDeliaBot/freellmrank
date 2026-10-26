// Capitoli di YouTube nella descrizione dei video lunghi orizzontali (modello, notizia, guida, settimana), dai tempi veri
// delle scene (Marco, 26/10/2026: regole yt-chapters di github.com/Jakeschincariol/youtube-agent-skill; prima nessun
// video pubblicato o in coda aveva capitoli). Si lancia dopo la registrazione, sul .json della release:
// tempi.json lo scrivono script/video-hf/monta.mjs (stampi) e script/brag/registra.py (riserva).
// Titolo di ogni capitolo: «capitolo» della scena, se no «Intro» per la prima e il titolo o l'etichetta della scena.
// Il blocco va dopo il primo paragrafo, solo se valgono le regole di YouTube (primo a 0:00, almeno 3, ognuno di almeno
// 10 s; i capitoli più corti si uniscono al precedente) e la descrizione resta entro 5000 caratteri.
// Esce sempre con 0: senza capitoli il video si pubblica lo stesso.
// Uso: node script/brag/capitoli-yt.mjs <json della release> <tempi.json>
import fs from 'node:fs';
import { capitoliYT, conCapitoli, controllaYT } from './controllo-yt.mjs';

const [fileInfo, fileTempi] = process.argv.slice(2);
let durata;
try {
  const info = JSON.parse(fs.readFileSync(fileInfo, 'utf8'));
  if (!(info.formato?.w > info.formato?.h)) console.log(`Capitoli: ${info.nome} non è un video orizzontale, niente capitoli`);
  else if (!fileTempi || !fs.existsSync(fileTempi)) console.log(`Capitoli: ${fileTempi || 'tempi.json'} manca, niente capitoli per ${info.nome}`);
  else {
    const tempi = JSON.parse(fs.readFileSync(fileTempi, 'utf8'));
    const scene = Array.isArray(tempi.scene) ? tempi.scene : [];
    durata = Number(tempi.totale) || scene.reduce((s, x) => Math.max(s, Number(x.inizio) + Number(x.durata)), 0);
    const capitoli = scene.map((s, i) => ({ inizio: s.inizio, titolo: s.capitolo || (i === 0 ? 'Intro' : s.titolo || s.etichetta || '') }));
    const blocco = capitoliYT(capitoli, durata);
    if (!blocco) console.log(`Capitoli: per ${info.nome} le regole di YouTube non reggono (almeno 3, il primo a 0:00, ognuno di almeno 10 s): niente capitoli`);
    else {
      const descrizione = conCapitoli(info.descrizione, blocco);
      if (descrizione === info.descrizione) console.log(`Capitoli: descrizione di ${info.nome} lasciata com'era (capitoli già presenti o oltre 5000 caratteri)`);
      else {
        info.descrizione = descrizione;
        fs.writeFileSync(fileInfo, JSON.stringify(info, null, 1));
        console.log(`Capitoli aggiunti a ${info.nome}:\n${blocco}`);
      }
    }
  }
  const problemi = controllaYT({ ...info, durata });
  if (problemi.length) console.log(`Controllo YouTube di ${info.nome}: ${problemi.join(' · ')}`);
} catch (e) {
  console.log(`Capitoli non aggiunti (${fileInfo}): ${e.message}`);
}
process.exitCode = 0;
