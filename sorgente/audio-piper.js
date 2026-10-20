// Voci Piper in italiano, tedesco, portoghese (decise da Marco il 20/10/2026).
// 1° modo: il nostro Space gratuito su Hugging Face (space-voci/), così il visitatore non scarica niente.
// 2° modo, di riserva: la voce gira nel browser (libreria @mintplex-labs/piper-tts-web 1.0.5, MIT; voci rhasspy/piper-voices, MIT),
// se lo Space dorme troppo a lungo o è occupato. Il testo non passa dal nostro server.
const box = document.getElementById('piper');
const LIBRERIA = 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/+esm';
// la libreria si aspetta onnxruntime 1.18 su cdnjs, ma jsDelivr le dà la 1.27: i file wasm devono essere della stessa versione
const ONNX = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';
const SPACE = 'https://marcodelia-freellmarena-voices.hf.space';

if (box) {
  const form = box.querySelector('form');
  const voce = box.querySelector('select');
  const campo = box.querySelector('textarea');
  const tasto = box.querySelector('button');
  const stato = box.querySelector('.prova-stato');
  const lettore = box.querySelector('audio');
  let tts = null, voceCaricata = null, sessione = null;

  // esempio nella lingua scelta, finché il visitatore non scrive il suo testo
  const ESEMPI = { it: 'Ciao! Questa voce è aperta e gratuita: scrivi una frase e ascoltala.', de: 'Hallo! Diese Stimme ist offen und kostenlos: schreib einen Satz und hör ihn dir an.', pt: 'Olá! Esta voz é aberta e gratuita: escreve uma frase e ouve-a.' };
  let scritto = false;
  campo.addEventListener('input', () => { scritto = true; });
  const esempio = () => { if (!scritto) campo.value = ESEMPI[voce.selectedOptions[0].dataset.lingua] || ''; };
  voce.addEventListener('change', esempio);
  esempio();

  const riserva = box.querySelector('.piper-riserva');
  let nelBrowser = false;
  const suona = (wav) => {
    if (lettore.src) URL.revokeObjectURL(lettore.src);
    lettore.src = URL.createObjectURL(wav);
    lettore.hidden = false;
    lettore.play().catch(() => {});
  };
  // nel cloud: lo Space gratuito può dormire; il primo avvio può chiedere mezzo minuto
  async function nelCloud(testo) {
    const lento = setTimeout(() => { stato.textContent = 'Waking up the free voice server, the first time can take 30 seconds…'; }, 3000);
    try {
      // API di Gradio dello Space (ZeroGPU gratuito, voci sulla CPU): si chiede, poi si legge l'esito e si scarica il WAV
      const segnale = AbortSignal.timeout(90000);
      const r = await fetch(`${SPACE}/gradio_api/call/parla`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: [testo.slice(0, 600), voce.value] }), signal: segnale });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const { event_id: id } = await r.json();
      const flusso = await (await fetch(`${SPACE}/gradio_api/call/parla/${id}`, { signal: segnale })).text();
      if (/^event: error/m.test(flusso)) throw new Error('Space error');
      const riga = flusso.split('\n').filter((l) => l.startsWith('data:')).pop();
      const url = JSON.parse(riga.slice(5))?.[0]?.url;
      if (!url) throw new Error('No audio');
      return await (await fetch(url, { signal: segnale })).blob();
    } finally { clearTimeout(lento); }
  }
  riserva.addEventListener('click', () => { nelBrowser = true; riserva.hidden = true; form.requestSubmit(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const testo = campo.value.trim();
    if (!testo) return;
    tasto.disabled = true;
    lettore.hidden = true;
    if (!nelBrowser) {
      try {
        stato.textContent = 'Speaking…';
        suona(await nelCloud(testo));
        stato.textContent = 'Done. It ran on our free voice server: nothing was downloaded.';
        if (window.gtag) window.gtag('event', 'prova_audio', { tipo: 'piper-cloud', voce: voce.value });
      } catch (err) {
        console.warn(err);
        stato.textContent = 'The free voice server is busy or asleep. Try again in a minute, or run the voice in your browser.';
        riserva.hidden = false;
        riserva.textContent = `Run it in my browser (downloads ${voce.selectedOptions[0].dataset.mb} MB once)`;
      }
      tasto.disabled = false;
      return;
    }
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
      suona(await sessione.predict(testo.slice(0, 1000)));
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
