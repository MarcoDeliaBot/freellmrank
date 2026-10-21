// Onda in movimento nel piè di pagina (richiesta di Marco, 22/10/2026, sull'esempio di seomator.com): il disegno in caratteri
// di script/sito/arte.mjs diventa un mare che scorre. La superficie è una somma di onde che viaggiano, sotto l'acqua è più
// fitta, sulla cresta c'è schiuma, sopra qualche spruzzo. ~20 fotogrammi al secondo, solo quando si vede; ferma per chi
// ha chiesto meno movimento al sistema (prefers-reduced-motion): lì resta il disegno fisso fatto dalla build.
(function () {
  var pre = document.querySelector('pre.arte');
  if (!pre || !window.requestAnimationFrame) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var RAMPA = ' .:-~=+*#%@';
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
  function disegna(t) {
    var out = [];
    for (var y = 0; y < righe; y++) {
      var r = '';
      for (var x = 0; x < colonne; x++) {
        // superficie: tre onde che viaggiano a velocità diverse, più alta ai lati come le colline del disegno fisso
        var u = x / colonne;
        var sup = righe * (0.5 + 0.11 * Math.sin(x * 0.075 - t * 1.3) + 0.07 * Math.sin(x * 0.16 + t * 0.9) + 0.05 * Math.sin(x * 0.031 - t * 0.45) - 0.1 * Math.exp(-((u - 0.12) * (u - 0.12)) / 0.02) - 0.12 * Math.exp(-((u - 0.82) * (u - 0.82)) / 0.03));
        var d;
        if (y >= sup) {
          d = 0.26 + 0.55 * Math.min(1, (y - sup) / 7) + (rumore(x * 0.35 - t * 2.2, y * 0.6 + t * 0.3) - 0.5) * 0.5;
        } else if (y > sup - 1.2) {
          d = 0.12 + rumore(x * 0.6 - t * 3, y) * 0.22; // schiuma sulla cresta
        } else {
          var n = rumore(x * 0.16 - t * 0.7, y * 0.35);
          d = n > 0.7 && y > 1 ? (n - 0.7) * 2.2 : 0; // spruzzi e nuvole rade
        }
        var k = Math.round(d * (RAMPA.length - 1));
        r += RAMPA.charAt(k < 0 ? 0 : k > RAMPA.length - 1 ? RAMPA.length - 1 : k);
      }
      out.push(r);
    }
    pre.textContent = out.join('\n');
  }
  var visibile = false, ultimo = 0, partenza = performance.now();
  function giro(ora) {
    if (!visibile) return;
    if (ora - ultimo >= 50) { ultimo = ora; disegna((ora - partenza) / 1000); }
    requestAnimationFrame(giro);
  }
  misura();
  var ferma = function () { visibile = false; };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (voci) {
      var era = visibile;
      visibile = voci[0].isIntersecting && !document.hidden;
      if (visibile && !era) requestAnimationFrame(giro);
    }).observe(pre);
  } else { visibile = true; requestAnimationFrame(giro); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) ferma(); });
  var attesa;
  window.addEventListener('resize', function () { clearTimeout(attesa); attesa = setTimeout(misura, 150); });
})();
