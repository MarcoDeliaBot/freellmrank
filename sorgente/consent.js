// Banner del consenso: Google Analytics parte solo con "Accept". La scelta resta nel browser
// del visitatore e si cambia dal link "Cookie settings" nel piè di pagina.
(function () {
  var banner = document.getElementById('consenso');
  if (!banner) return;
  var leggi = function () { try { return localStorage.getItem('consenso'); } catch (e) { return null; } };
  var scrivi = function (v) { try { localStorage.setItem('consenso', v); } catch (e) {} };
  // toglie i cookie di Analytics già salvati (per chi prima aveva accettato)
  var cancellaCookieGa = function () {
    document.cookie.split(';').forEach(function (c) {
      var nome = c.split('=')[0].trim();
      if (/^_ga/.test(nome)) {
        var dom = location.hostname.replace(/^www\./, '');
        ['', '; domain=' + dom, '; domain=.' + dom].forEach(function (d) {
          document.cookie = nome + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d;
        });
      }
    });
  };
  var scegli = function (si) {
    scrivi(si ? 'si' : 'no');
    if (si && typeof window.caricaGa === 'function') window.caricaGa();
    if (!si) {
      if (typeof gtag === 'function') gtag('consent', 'update', { analytics_storage: 'denied' });
      cancellaCookieGa();
    }
    banner.hidden = true;
  };
  document.getElementById('consenso-si').addEventListener('click', function () { scegli(true); });
  document.getElementById('consenso-no').addEventListener('click', function () { scegli(false); });
  var cambia = document.getElementById('consenso-cambia');
  if (cambia) cambia.addEventListener('click', function () { banner.hidden = false; });
  if (!leggi()) banner.hidden = false;
})();

// tasto "Copy link" della riga di condivisione
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-copia]');
  if (!b) return;
  // nella lingua della pagina (25/10/2026); il testo di partenza del tasto è quello già tradotto nella pagina
  var T = { it: ['Copiato', 'Copia questo link:'], es: ['Copiado', 'Copia este enlace:'], de: ['Kopiert', 'Kopiere diesen Link:'], fr: ['Copié', 'Copiez ce lien :'], pt: ['Copiado', 'Copie este link:'], ja: ['コピーしました', 'このリンクをコピーしてください：'] }[(document.documentElement.lang || 'en').slice(0, 2)] || ['Copied', 'Copy this link:'];
  var prima = b.dataset.etichetta || (b.dataset.etichetta = b.textContent);
  var fatto = function () { b.textContent = T[0]; setTimeout(function () { b.textContent = prima; }, 1500); };
  if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copia).then(fatto, function () { prompt(T[1], b.dataset.copia); });
  else prompt(T[1], b.dataset.copia);
});

// menu del telefono: si chiude toccando fuori o scegliendo una voce
document.addEventListener('click', function (e) {
  var m = document.querySelector('.menu-mobile[open]');
  if (m && (!m.contains(e.target) || e.target.closest('a'))) m.removeAttribute('open');
});
