// Tabelle più larghe dello schermo.
// Sul computer: scritta "scorri" e ombra sul lato dove c'è ancora contenuto.
// Sul telefono: le tabelle grandi diventano schede (una per riga, ogni valore con la sua etichetta),
// e le liste lunghe mostrano le prime 15 con un tasto "Show all".
(function () {
  var TELEFONO = window.matchMedia('(max-width: 40rem)');
  var PRIME = 15;

  function aSchede(tw) {
    var t = tw.querySelector('table');
    if (!t || tw.classList.contains('mx') || t.dataset.schede) return;
    // etichetta: solo la prima riga del titolo di colonna (prima del primo a capo), la spiegazione sotto è troppo lunga
    var titoli = [].map.call(t.querySelectorAll('thead th'), function (th) {
      if (th.hasAttribute('data-etichetta')) return th.getAttribute('data-etichetta');
      var testo = '';
      for (var n = th.firstChild; n && n.nodeName !== 'BR'; n = n.nextSibling) testo += n.textContent;
      return testo.replace(/\s+/g, ' ').trim();
    });
    if (titoli.length < 5) return; // le tabelle piccole stanno già nello schermo
    t.dataset.schede = '1';
    tw.classList.add('carte');
    [].forEach.call(t.querySelectorAll('tbody tr'), function (tr) {
      var celle = tr.children;
      // titolo della scheda: la prima delle prime due celle con un link o un grassetto (il nome)
      var iTitolo = 0;
      for (var i = 0; i < Math.min(2, celle.length); i++) if (celle[i].querySelector('a, b')) { iTitolo = i; break; }
      [].forEach.call(celle, function (td, i) {
        if (i < iTitolo) td.classList.add('carta-pre');
        else if (i === iTitolo) td.classList.add('carta-titolo');
        else if (titoli[i]) td.setAttribute('data-label', titoli[i]);
      });
    });
    // liste lunghe: sul telefono solo le prime righe, poi un tasto
    var righe = t.querySelectorAll('tbody tr');
    if (righe.length > PRIME + 5) {
      t.classList.add('accorcia');
      var tasto = document.createElement('button');
      tasto.type = 'button';
      tasto.className = 'btn mostra-tutte';
      tasto.textContent = ({ it: 'Mostra tutte e ', es: 'Mostrar las ', de: 'Alle anzeigen: ', fr: 'Tout afficher : ', pt: 'Mostrar as ', ja: 'すべて表示：' }[(document.documentElement.lang || 'en').slice(0, 2)] || 'Show all ') + righe.length;
      tasto.addEventListener('click', function () { t.classList.remove('accorcia'); tasto.remove(); });
      tw.parentNode.insertBefore(tasto, tw.nextSibling);
    }
  }

  function prepara(tw) {
    if (tw.dataset.pronta) return;
    tw.dataset.pronta = '1';
    aSchede(tw);
    var box = document.createElement('div');
    box.className = 'tw-box';
    var aiuto = document.createElement('p');
    aiuto.className = 'tw-aiuto small';
    // nella lingua della pagina (25/10/2026: sulle pagine tradotte restava in inglese)
    var SCORRI = { it: 'Scorri di lato per vedere altre colonne', es: 'Desliza de lado para ver más columnas', de: 'Seitlich wischen für weitere Spalten', fr: 'Faites défiler sur le côté pour voir plus de colonnes', pt: 'Deslize para o lado para ver mais colunas', ja: '横にスクロールすると他の列が見られます' };
    aiuto.innerHTML = '<span aria-hidden="true">←</span> ' + (SCORRI[(document.documentElement.lang || 'en').slice(0, 2)] || 'Scroll sideways for more columns') + ' <span aria-hidden="true">→</span>';
    tw.parentNode.insertBefore(box, tw);
    box.appendChild(aiuto);
    box.appendChild(tw);
    var aggiorna = function () {
      var largo = tw.scrollWidth > tw.clientWidth + 4;
      box.classList.toggle('scorre', largo);
      box.classList.toggle('piu-destra', largo && tw.scrollLeft + tw.clientWidth < tw.scrollWidth - 4);
      box.classList.toggle('piu-sinistra', largo && tw.scrollLeft > 4);
    };
    tw.addEventListener('scroll', aggiorna, { passive: true });
    window.addEventListener('resize', aggiorna);
    if (TELEFONO.addEventListener) TELEFONO.addEventListener('change', aggiorna);
    aggiorna();
    tw._aggiorna = aggiorna;
  }
  function tutte() {
    document.querySelectorAll('.tw').forEach(function (tw) { prepara(tw); if (tw._aggiorna) tw._aggiorna(); });
    // un filtro ha nascosto delle righe: la lista accorciata mostrerebbe meno di 15 schede, quindi si mostra tutta
    document.querySelectorAll('table.accorcia').forEach(function (t) {
      if (!t.querySelector('tbody tr[hidden]')) return;
      t.classList.remove('accorcia');
      var box = t.closest('.tw-box');
      var tasto = box && box.nextElementSibling;
      if (tasto && tasto.classList.contains('mostra-tutte')) tasto.remove();
    });
  }
  tutte();
  // tabelle disegnate dopo (simulatore, schede delle categorie)
  new MutationObserver(function () { tutte(); }).observe(document.querySelector('main') || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
})();
