// Voci Piper nel browser (italiano, tedesco, portoghese), decise da Marco il 20/10/2026.
// Tutto gira qui, nel browser del visitatore: la libreria arriva da jsDelivr, la voce da Hugging Face
// (una volta sola, poi resta salvata nel browser). Il testo non passa dal nostro server e non c'è un tetto.
// Libreria: @mintplex-labs/piper-tts-web 1.0.5 (MIT); voci rhasspy/piper-voices (MIT).
const box = document.getElementById('piper');
const LIBRERIA = 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/+esm';
// la libreria si aspetta onnxruntime 1.18 su cdnjs, ma jsDelivr le dà la 1.27: i file wasm devono essere della stessa versione
const ONNX = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';

if (box) {
  const form = box.querySelector('form');
  const voce = box.querySelector('select');
  const campo = box.querySelector('textarea');
  const tasto = box.querySelector('button');
  const stato = box.querySelector('.prova-stato');
  const lettore = box.querySelector('audio');
  let tts = null, voceCaricata = null, sessione = null;

  // esempio nella lingua scelta, finché il visitatore non scrive il suo testo
  const ESEMPI = { it: 'Ciao! Questa voce è gratuita e gira tutta nel tuo browser.', de: 'Hallo! Diese Stimme ist kostenlos und läuft komplett in deinem Browser.', pt: 'Olá! Esta voz é gratuita e funciona toda no teu navegador.' };
  let scritto = false;
  campo.addEventListener('input', () => { scritto = true; });
  const esempio = () => { if (!scritto) campo.value = ESEMPI[voce.selectedOptions[0].dataset.lingua] || ''; };
  voce.addEventListener('change', esempio);
  esempio();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const testo = campo.value.trim();
    if (!testo) return;
    tasto.disabled = true;
    lettore.hidden = true;
    try {
      stato.textContent = 'Loading the speech engine…';
      tts = tts || await import(LIBRERIA);
      if (voceCaricata !== voce.value) {
        // una sessione carica una sola voce: per cambiarla se ne apre una nuova
        tts.TtsSession._instance = null;
        const mb = voce.selectedOptions[0].dataset.mb;
        stato.textContent = `Downloading the voice (${mb} MB, only the first time)…`;
        sessione = await tts.TtsSession.create({
          voiceId: voce.value,
          progress: (p) => { if (p.total) stato.textContent = `Downloading the voice: ${Math.round((p.loaded * 100) / p.total)}% of ${mb} MB (only the first time)`; },
          wasmPaths: { onnxWasm: ONNX, piperData: `${tts.WASM_BASE}.data`, piperWasm: `${tts.WASM_BASE}.wasm` },
        });
        voceCaricata = voce.value;
      }
      stato.textContent = 'Speaking…';
      const wav = await sessione.predict(testo.slice(0, 1000));
      if (lettore.src) URL.revokeObjectURL(lettore.src);
      lettore.src = URL.createObjectURL(wav);
      lettore.hidden = false;
      lettore.play().catch(() => {});
      stato.textContent = 'Done. It ran on your device: try another sentence, it is instant now.';
      if (window.gtag) window.gtag('event', 'prova_audio', { tipo: 'piper', voce: voce.value });
    } catch (err) {
      console.error(err);
      voceCaricata = null;
      stato.textContent = 'This browser could not run the voice. Try an up-to-date Chrome, Edge or Firefox on a computer.';
    }
    tasto.disabled = false;
  });
}
