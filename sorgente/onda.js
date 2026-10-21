// Onda in movimento nel piè di pagina (richiesta di Marco, 22/10/2026, sull'esempio di seomator.com): il disegno in caratteri
// di script/sito/arte.mjs diventa un mare che scorre. La superficie è una somma di onde che viaggiano, sotto l'acqua è più
// fitta, sulla cresta c'è schiuma, sopra qualche spruzzo. ~20 fotogrammi al secondo, solo quando si vede; ferma per chi
// ha chiesto meno movimento al sistema (prefers-reduced-motion): lì resta il disegno fisso fatto dalla build.
(function () {
  var pre = document.querySelector('pre.arte');
  if (!pre || !window.requestAnimationFrame) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var colonne = 0, righe = 0;
  // quante colonne entrano: si misura un carattere con lo stesso stile del disegno
  function misura() {
    var s = document.createElement('span');
    s.textContent = '@@@@@@@@@@';
    s.style.visibility = 'hidden';
    pre.appendChild(s);
    var w = s.getBoundingClientRect().width / 10 || 9;
    pre.removeChild(s);
    colonne = Math.max(30, Math.min(260, Math.ceil(pre.clientWidth / w) + 2));
    righe = 22; // come il disegno fisso: la pagina non salta quando parte l'animazione
  }
  // rumore a valori, liscio, per l'acqua e gli spruzzi (griglia fissa, si scorre col tempo)
  var G = 64, griglia = [];
  var s0 = 2026;
  for (var i = 0; i < G * G; i++) { s0 = (s0 * 1664525 + 1013904223) >>> 0; griglia.push(s0 / 4294967296); }
  function rumore(x, y) {
    var x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
    tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    var a = griglia[((y0 & 63) * G) + (x0 & 63)], b = griglia[((y0 & 63) * G) + ((x0 + 1) & 63)];
    var c = griglia[(((y0 + 1) & 63) * G) + (x0 & 63)], d = griglia[(((y0 + 1) & 63) * G) + ((x0 + 1) & 63)];
    var p = a + (b - a) * tx, q = c + (d - c) * tx;
    return p + (q - p) * ty;
  }
  // Come seomator.com (studiato il 21/10/2026): onde alte e veloci che corrono di lato, caratteri pesanti sulla
  // cresta e leggeri sotto, scelti di nuovo a ogni fotogramma (l'acqua "brilla"), spruzzi sopra le creste.
  var CRESTA = '@#%*&', MEZZO = '*+=~%#', FONDO = ':.-~:.=';
  function scegli(set) { return set.charAt((Math.random() * set.length) | 0); }
  function disegna(t) {
    var out = [];
    var sup = [];
    for (var x = 0; x < colonne; x++) {
      // somma di tre onde che viaggiano in versi e a velocità diverse + un'ondulazione lenta: la cresta sale
      // e scende di metà altezza in meno di un secondo, come nel riferimento
      sup.push(righe * (0.56 + 0.2 * Math.sin(x * 0.105 - t * 2.4) + 0.11 * Math.sin(x * 0.047 + t * 1.6)
        + 0.07 * Math.sin(x * 0.23 - t * 3.9) + 0.06 * (rumore(x * 0.05 - t * 0.6, 3) - 0.5)));
    }
    for (var y = 0; y < righe; y++) {
      var r = '';
      for (var x2 = 0; x2 < colonne; x2++) {
        var d = y - sup[x2];
        var c = ' ';
        if (d >= 0) {
          if (d < 1.6) c = Math.random() < 0.92 ? scegli(CRESTA) : ' ';
          else if (d < 4) c = Math.random() < 0.85 ? scegli(MEZZO) : ' ';
          else c = Math.random() < 0.9 - 0.02 * (d - 4) ? scegli(FONDO) : ' ';
        } else if (d > -3 && Math.random() < 0.09 * (3 + d)) c = scegli(MEZZO); // spruzzi sopra la cresta
        r += c;
      }
      out.push(r);
    }
    pre.textContent = out.join('\n');
  }
  // gira solo se il disegno è sullo schermo E la scheda è in primo piano. Le due cose si seguono separate:
  // prima, tornando sulla scheda (o sbloccando il telefono) l'onda restava ferma finché non si scorreva la pagina
  var inVista = !('IntersectionObserver' in window), inCorsa = false, ultimo = 0, partenza = performance.now();
  function giro(ora) {
    if (!inVista || document.hidden) { inCorsa = false; return; }
    if (ora - ultimo >= 60) {
      ultimo = ora;
      try { disegna((ora - partenza) / 1000); } catch (e) {} // un fotogramma sbagliato non ferma l'onda
    }
    requestAnimationFrame(giro);
  }
  function parti() { if (!inCorsa && inVista && !document.hidden) { inCorsa = true; requestAnimationFrame(giro); } }
  misura();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (voci) { inVista = voci[voci.length - 1].isIntersecting; parti(); }).observe(pre);
  }
  document.addEventListener('visibilitychange', parti);
  window.addEventListener('pageshow', parti); // ritorno con il tasto Indietro (pagina tenuta in memoria dal browser)
  parti();
  var attesa;
  window.addEventListener('resize', function () { clearTimeout(attesa); attesa = setTimeout(misura, 150); });
})();
