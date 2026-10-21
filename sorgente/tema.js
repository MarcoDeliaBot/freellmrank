// Tasto sole/luna in fondo al menu (richiesta di Marco, 21/10/2026): automatico (come il dispositivo) → chiaro → scuro.
// La scelta resta nel browser (localStorage 'tema'); lo script in <head> la applica prima di disegnare, senza lampi.
// In CSS il tema scuro vale con il sistema scuro se non si è scelto "chiaro", oppure sempre con data-tema="scuro"
// (la build riscrive i blocchi @media (prefers-color-scheme:dark) di style.css: script/costruisci-sito.mjs).
(function () {
  var radice = document.documentElement;
  var ORDINE = ['auto', 'chiaro', 'scuro'];
  var TESTI = {
    auto: 'Theme: automatic, like your device. Click for light.',
    chiaro: 'Theme: light. Click for dark.',
    scuro: 'Theme: dark. Click for automatic.',
  };
  function attuale() { return radice.getAttribute('data-tema') || 'auto'; }
  function scuroOra() {
    var t = attuale();
    return t === 'scuro' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function aggiorna() {
    var t = attuale();
    document.querySelectorAll('.tema-btn').forEach(function (b) {
      b.setAttribute('aria-label', TESTI[t]);
      b.setAttribute('title', TESTI[t]);
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', scuroOra() ? '#070b12' : '#f5f7f9');
  }
  function scegli(t) {
    if (t === 'auto') radice.removeAttribute('data-tema');
    else radice.setAttribute('data-tema', t);
    try { if (t === 'auto') localStorage.removeItem('tema'); else localStorage.setItem('tema', t); } catch (e) {}
    aggiorna();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.tema-btn');
    if (!b) return;
    scegli(ORDINE[(ORDINE.indexOf(attuale()) + 1) % ORDINE.length]);
  });
  if (window.matchMedia) {
    var m = matchMedia('(prefers-color-scheme: dark)');
    if (m.addEventListener) m.addEventListener('change', aggiorna);
  }
  aggiorna();
})();
