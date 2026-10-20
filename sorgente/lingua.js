// Lingua: se il browser parla una lingua in cui la pagina esiste, in cima compare «Questa pagina è anche in italiano».
// Nessun cambio automatico (Google lo sconsiglia). La scelta fatta dalla riga «Language» in fondo resta ricordata.
(function () {
  var TESTI = {
    it: ['Questa pagina è anche in italiano', 'Leggi in italiano', 'No, grazie'],
    es: ['Esta página también está en español', 'Leer en español', 'No, gracias'],
    de: ['Diese Seite gibt es auch auf Deutsch', 'Auf Deutsch lesen', 'Nein, danke'],
    fr: ['Cette page existe aussi en français', 'Lire en français', 'Non, merci'],
    pt: ['Esta página também está em português', 'Ler em português', 'Não, obrigado'],
  };
  var leggi = function () { try { return localStorage.getItem('lingua'); } catch (e) { return null; } };
  var scrivi = function (v) { try { localStorage.setItem('lingua', v); } catch (e) {} };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-lingua]');
    if (a) scrivi(a.getAttribute('data-lingua'));
  });
  var qui = document.documentElement.lang || 'en';
  if (qui !== 'en' || leggi() || document.querySelector('.avviso-lingua')) return;
  var alt = {};
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(function (l) { alt[l.hreflang] = l.href; });
  var lingue = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
  var scelta = null;
  for (var i = 0; i < lingue.length && !scelta; i++) {
    var l = String(lingue[i]).slice(0, 2).toLowerCase();
    if (l === 'en') return;
    if (TESTI[l] && alt[l]) scelta = l;
  }
  if (!scelta) return;
  var t = TESTI[scelta];
  var box = document.createElement('p');
  box.className = 'avviso-lingua';
  box.lang = scelta;
  box.innerHTML = '<span></span> <a></a> <button type="button" class="link-btn"></button>';
  box.querySelector('span').textContent = t[0] + '.';
  var a = box.querySelector('a');
  a.textContent = t[1] + ' →';
  a.href = alt[scelta] + location.hash;
  a.setAttribute('data-lingua', scelta);
  var no = box.querySelector('button');
  no.textContent = t[2];
  no.addEventListener('click', function () { scrivi('en'); box.remove(); });
  var dove = document.querySelector('main.contenuto');
  if (dove) dove.insertBefore(box, dove.firstChild);
})();
