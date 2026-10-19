// Tabelle più larghe dello schermo: scritta "scorri" e ombra sul lato dove c'è ancora contenuto.
(function () {
  function prepara(tw) {
    if (tw.dataset.pronta) return;
    tw.dataset.pronta = '1';
    var box = document.createElement('div');
    box.className = 'tw-box';
    var aiuto = document.createElement('p');
    aiuto.className = 'tw-aiuto small';
    aiuto.innerHTML = '<span aria-hidden="true">←</span> Scroll sideways for more columns <span aria-hidden="true">→</span>';
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
    aggiorna();
    tw._aggiorna = aggiorna;
  }
  function tutte() {
    document.querySelectorAll('.tw').forEach(function (tw) { prepara(tw); if (tw._aggiorna) tw._aggiorna(); });
  }
  tutte();
  // tabelle disegnate dopo (simulatore, schede delle categorie)
  new MutationObserver(function () { tutte(); }).observe(document.querySelector('main') || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
})();
