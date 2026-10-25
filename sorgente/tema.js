// Tasto sole/luna in fondo al menu (richiesta di Marco, 21/10/2026): automatico (come il dispositivo) → chiaro → scuro.
// La scelta resta nel browser (localStorage 'tema'); lo script in <head> la applica prima di disegnare, senza lampi.
// In CSS il tema scuro vale con il sistema scuro se non si è scelto "chiaro", oppure sempre con data-tema="scuro"
// (la build riscrive i blocchi @media (prefers-color-scheme:dark) di style.css: script/costruisci-sito.mjs).
(function () {
  var radice = document.documentElement;
  var ORDINE = ['auto', 'chiaro', 'scuro'];
  // nella lingua della pagina (25/10/2026)
  var LINGUE = {
    en: { auto: 'Theme: automatic, like your device. Click for light.', chiaro: 'Theme: light. Click for dark.', scuro: 'Theme: dark. Click for automatic.' },
    it: { auto: 'Tema: automatico, come il dispositivo. Clic per il chiaro.', chiaro: 'Tema: chiaro. Clic per lo scuro.', scuro: 'Tema: scuro. Clic per l\'automatico.' },
    es: { auto: 'Tema: automático, como tu dispositivo. Pulsa para el claro.', chiaro: 'Tema: claro. Pulsa para el oscuro.', scuro: 'Tema: oscuro. Pulsa para el automático.' },
    de: { auto: 'Design: automatisch, wie dein Gerät. Klicken für hell.', chiaro: 'Design: hell. Klicken für dunkel.', scuro: 'Design: dunkel. Klicken für automatisch.' },
    fr: { auto: 'Thème : automatique, comme votre appareil. Cliquez pour le clair.', chiaro: 'Thème : clair. Cliquez pour le sombre.', scuro: 'Thème : sombre. Cliquez pour l’automatique.' },
    pt: { auto: 'Tema: automático, como o seu dispositivo. Clique para o claro.', chiaro: 'Tema: claro. Clique para o escuro.', scuro: 'Tema: escuro. Clique para o automático.' },
    ja: { auto: 'テーマ：自動（端末に合わせる）。クリックでライト。', chiaro: 'テーマ：ライト。クリックでダーク。', scuro: 'テーマ：ダーク。クリックで自動。' },
  };
  var TESTI = LINGUE[(radice.lang || 'en').slice(0, 2)] || LINGUE.en;
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
