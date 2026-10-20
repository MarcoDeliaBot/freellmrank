// Pagina /music: generatori ufficiali caricati solo su richiesta, e il test alla cieca sulle coppie di Music Arena.
// I voti vanno a /api/music/vote (solo coppia ed esito); il conto «d'accordo con il votante originale» resta nel browser.

// generatori: l'iframe dello Space di Hugging Face si crea solo quando il visitatore lo chiede
for (const b of document.querySelectorAll('[data-space]')) {
  b.addEventListener('click', () => {
    const cornice = b.parentElement.querySelector('.mus-cornice');
    if (!cornice.firstChild) {
      const f = document.createElement('iframe');
      f.src = b.dataset.space;
      f.title = b.textContent.replace('Open the ', '').replace(' demo here', '') + ' demo on Hugging Face';
      f.loading = 'lazy';
      f.allow = 'autoplay; clipboard-write';
      const attesa = document.createElement('p');
      attesa.className = 'small muted';
      attesa.textContent = 'Loading the demo from Hugging Face, it can take 10 to 20 seconds…';
      f.addEventListener('load', () => attesa.remove());
      cornice.append(attesa, f);
    }
    cornice.hidden = !cornice.hidden;
    b.textContent = cornice.hidden ? b.textContent.replace('Close', 'Open') : b.textContent.replace('Open', 'Close');
  });
}

const arena = document.getElementById('mus-arena');
const dati = JSON.parse(document.getElementById('mus-coppie')?.textContent || '{"coppie":[]}');
if (arena && dati.coppie.length) {
  const prompt = arena.querySelector('.mus-prompt');
  const lettori = arena.querySelectorAll('audio');
  const chi = arena.querySelectorAll('.mus-chi');
  const voti = arena.querySelectorAll('[data-voto]');
  const esito = arena.querySelector('.mus-esito');
  const avanti = arena.querySelector('.mus-avanti');
  const leggi = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const scrivi = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const visti = new Set(leggi('mus-visti', []));
  const conto = leggi('mus-conto', { fatti: 0, accordo: 0 });
  // ordine casuale, prima le coppie mai viste
  const ordine = [...dati.coppie].sort(() => Math.random() - 0.5).sort((x, y) => visti.has(x.id) - visti.has(y.id));
  let i = 0, ora = null;
  const nome = (s) => dati.nomi[s]?.n || s;

  function mostra() {
    ora = ordine[i % ordine.length];
    prompt.textContent = `Prompt: “${ora.p}”`;
    lettori[0].src = ora.a; lettori[1].src = ora.b;
    chi.forEach((c) => { c.textContent = ''; c.className = 'mus-chi'; });
    voti.forEach((b) => { b.disabled = false; });
    esito.textContent = '';
    avanti.hidden = true;
  }
  voti.forEach((b) => b.addEventListener('click', () => {
    const voto = b.dataset.voto;
    voti.forEach((x) => { x.disabled = true; });
    lettori.forEach((l) => l.pause());
    [ora.sa, ora.sb].forEach((s, k) => { chi[k].textContent = `${nome(s)} · ${dati.nomi[s]?.o ? 'open weights' : 'closed'}`; chi[k].classList.add(dati.nomi[s]?.o ? 'aperto' : 'chiuso'); });
    const loro = ora.v === 'a' ? 'A' : 'B';
    conto.fatti++;
    if (voto === ora.v) conto.accordo++;
    visti.add(ora.id);
    scrivi('mus-visti', [...visti].slice(-200)); scrivi('mus-conto', conto);
    esito.textContent = `${voto === 'pari' ? 'You called it a tie' : `You picked ${voto.toUpperCase()}`}. The original Music Arena voter picked ${loro}. You agreed ${conto.accordo} times out of ${conto.fatti}.`;
    avanti.hidden = false;
    fetch('/api/music/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coppia: ora.id, esito: voto }) }).catch(() => {});
    if (window.gtag) window.gtag('event', 'voto_musica');
  }));
  avanti.addEventListener('click', () => { i++; mostra(); });
  mostra();
}
