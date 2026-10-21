// Menu laterale (solo schermo largo): il pulsante «‹‹» lo stringe alle sole icone e la scelta resta ricordata.
// La classe si mette già nell'intestazione della pagina (comune.mjs), qui si gestisce solo il clic.
// Le etichette (anche tradotte) stanno nel pulsante: aria-label per «chiudi», data-apri per «apri».
// In più: la tendina delle bandierine si chiude cliccando fuori.
(function () {
  var html = document.documentElement;
  document.querySelectorAll('.lato-chiudi').forEach(function (b) {
    var chiudi = b.getAttribute('aria-label'), apri = b.getAttribute('data-apri') || chiudi;
    var aggiorna = function () {
      var chiuso = html.classList.contains('menu-chiuso');
      var et = chiuso ? apri : chiudi;
      b.setAttribute('aria-label', et); b.title = et; b.setAttribute('aria-expanded', chiuso ? 'false' : 'true');
    };
    aggiorna();
    b.addEventListener('click', function () {
      var chiuso = html.classList.toggle('menu-chiuso');
      try { localStorage.setItem('menu', chiuso ? 'chiuso' : 'aperto'); } catch (e) {}
      aggiorna();
    });
  });
  // nome nella testata del menu: se il carattere del sistema è più largo di Inter e il nome non entra accanto alle icone,
  // si rimpicciolisce un po' alla volta finché entra intero (mai sotto i 12 px)
  var logo = document.querySelector('.lato-testa .logo-lato');
  var adatta = function () {
    if (!logo || html.classList.contains('menu-chiuso') || !logo.clientWidth) return;
    logo.style.fontSize = '';
    var px = parseFloat(getComputedStyle(logo).fontSize);
    while (logo.scrollWidth > logo.clientWidth + 1 && px > 12) { px -= 0.5; logo.style.fontSize = px + 'px'; }
  };
  adatta();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(adatta);
  window.addEventListener('resize', adatta);
  document.querySelectorAll('.lato-chiudi').forEach(function (b) { b.addEventListener('click', function () { setTimeout(adatta, 250); }); });
  document.addEventListener('click', function (e) {
    document.querySelectorAll('details.bandiere[open]').forEach(function (d) { if (!d.contains(e.target)) d.removeAttribute('open'); });
  });
})();
