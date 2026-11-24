// Chiedere l'iscrizione al canale (Marco, 24/11/2026: iscritti ogni 1.000 visualizzazioni scesi da 3,2 a 2,1, obiettivo
// sopra 5). Vale solo per i video nuovi montati a stampi (script/video-hf/monta.mjs): quelli già pubblicati non si toccano.
//   - video lunghi (orizzontali): subito dopo il risultato della prova, mai all'inizio, una scena di circa 4 secondi con la
//     frase detta dalla voce e scritta sullo schermo;
//   - Short (verticali): negli ultimi 2 secondi la scritta «Full test on the channel. Subscribe», sopra il video finito.
// Il link per iscriversi in prima riga delle descrizioni lo mette n8n al caricamento (n8n/video-youtube.json).
export const FRASE = "We test a new free AI model every day. Subscribe so you don't miss the next one.";
export const SCRITTA_SHORT = ['Full test on the channel.', 'Subscribe'];
export const ETICHETTA = 'Subscribe';

export const scenaIscrizione = () => ({
  stampo: 'titolo', etichetta: ETICHETTA, voce: FRASE,
  dati: { testo: "Subscribe so you don't miss the next one", evidenza: 'Subscribe', sopra: 'We test a new free AI model every day' },
});

// il «risultato della prova»: l'ultima scena con hardware, risultato, verdetto, punteggio o test nel nome
const RISULTATO = /hardware|result|verdict|score|test|benchmark|speed|how fast/i;

// dove va la scena: dopo il risultato; se non c'è, prima della chiusura (e del suo invito finale); mai prima della scena 2
export function posizione(scene) {
  const nome = (s) => `${s.etichetta || ''} ${s.capitolo || ''} ${s.dati?.titolo || ''}`;
  let i = scene.findLastIndex((s, k) => k > 0 && s.stampo !== 'chiusura' && RISULTATO.test(nome(s)));
  if (i >= 0) return i + 1;
  const fine = scene.findIndex((s) => s.stampo === 'chiusura');
  return Math.max(1, fine >= 0 ? fine : scene.length);
}

// il piano con la scena dell'iscrizione: solo video orizzontali, una volta sola, se il piano non dice «senzaIscrizione»
export function conIscrizione(piano) {
  if (!piano || piano.formato === 'verticale' || piano.senzaIscrizione) return piano;
  const scene = piano.scene || [];
  if (scene.length < 2 || scene.some((s) => s.etichetta === ETICHETTA)) return piano;
  const i = posizione(scene);
  return { ...piano, scene: [...scene.slice(0, i), scenaIscrizione(), ...scene.slice(i)] };
}

// filtro ffmpeg per gli Short: fascia scura in basso (sotto i sottotitoli, che stanno intorno al 70% dell'altezza) e due righe di testo negli ultimi 2 secondi (font nella cartella di lavoro)
export function filtroShort(durata, font = 'iscrizione.ttf') {
  const da = Math.max(0, durata - 2).toFixed(2);
  const quando = `enable='gte(t,${da})'`;
  return [
    `drawbox=x=0:y=ih*0.80:w=iw:h=ih*0.15:color=0x141413@0.86:t=fill:${quando}`,
    `drawtext=fontfile=${font}:text='${SCRITTA_SHORT[0]}':fontcolor=0xfaf9f5:fontsize=58:x=(w-text_w)/2:y=h*0.818:${quando}`,
    `drawtext=fontfile=${font}:text='${SCRITTA_SHORT[1]}':fontcolor=0xd97757:fontsize=96:x=(w-text_w)/2:y=h*0.862:${quando}`,
  ].join(',');
}
