// Ricerca nel sito (richiesta di Marco, 22/10/2026): la lente in alto apre la finestra, anche con «/» o Ctrl+K.
// L'indice (/cerca.json: titolo, descrizione, tipo e indirizzo di ogni pagina) lo scrive la build e si scarica alla
// prima ricerca. Ogni parola cercata deve comparire; prima i titoli che iniziano con la parola. Nelle pagine tradotte
// i risultati portano alla stessa lingua (/it/…).
(function () {
  var dlg = document.getElementById('cerca');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  var campo = document.getElementById('cerca-campo'), lista = document.getElementById('cerca-risultati'), vuoto = document.getElementById('cerca-vuoto');
  var indice = null, scelta = -1;
  var lingua = (document.documentElement.lang || 'en').slice(0, 2);
  var prefisso = lingua !== 'en' && location.pathname.indexOf('/' + lingua + '/') === 0 ? '/' + lingua : '';
  // «Qwen3.8-27B» e «qwen38 27b» devono incontrarsi: minuscole, senza punti, trattini e accenti
  var piatto = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.\-_/:()]+/g, ''); };
  var parole = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[\s]+/).map(function (w) { return w.replace(/[.\-_/:()]+/g, ''); }).filter(Boolean); };
  function carica() {
    if (indice) return Promise.resolve(indice);
    return fetch('/cerca.json').then(function (r) { return r.json(); }).then(function (d) {
      indice = d.map(function (x) { x.ft = piatto(x.t); x.fd = piatto(x.d); x.pt = parole(x.t); return x; });
      return indice;
    });
  }
  function punteggio(x, q) {
    var tot = 0;
    for (var i = 0; i < q.length; i++) {
      var w = q[i];
      if (x.ft.indexOf(w) >= 0) {
        tot += 10;
        if (x.ft.indexOf(w) === 0) tot += 8;
        for (var j = 0; j < x.pt.length; j++) if (x.pt[j].indexOf(w) === 0) { tot += 4; break; }
      } else if (x.fd.indexOf(w) >= 0) tot += 3;
      else return 0;
    }
    if (x.k === 'Model' || x.k === 'GPU') tot += 2; // a parità, prima le schede di modelli e GPU
    if (x.k === 'Comparison') tot -= 3;
    return tot - x.t.length / 200;
  }
  // tipo del risultato nella lingua della pagina
  var TIPI = { it: { Model: 'Modello', GPU: 'GPU', Comparison: 'Confronto', Blog: 'Blog', Video: 'Video', Page: 'Pagina' }, es: { Model: 'Modelo', GPU: 'GPU', Comparison: 'Comparación', Blog: 'Blog', Video: 'Vídeo', Page: 'Página' }, de: { Model: 'Modell', GPU: 'GPU', Comparison: 'Vergleich', Blog: 'Blog', Video: 'Video', Page: 'Seite' }, fr: { Model: 'Modèle', GPU: 'GPU', Comparison: 'Comparaison', Blog: 'Blog', Video: 'Vidéo', Page: 'Page' }, pt: { Model: 'Modelo', GPU: 'GPU', Comparison: 'Comparação', Blog: 'Blog', Video: 'Vídeo', Page: 'Página' } };
  var tipo = function (k) { return (TIPI[lingua] && TIPI[lingua][k]) || k; };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mostra() {
    var q = parole(campo.value);
    scelta = -1;
    if (!q.length) { lista.innerHTML = ''; vuoto.hidden = true; return; }
    carica().then(function (d) {
      var trovati = [];
      for (var i = 0; i < d.length; i++) { var p = punteggio(d[i], q); if (p > 0) trovati.push([p, d[i]]); }
      trovati.sort(function (a, b) { return b[0] - a[0]; });
      trovati = trovati.slice(0, 12);
      vuoto.hidden = trovati.length > 0;
      lista.innerHTML = trovati.map(function (r, i) {
        var x = r[1];
        return '<li role="option" id="cerca-r' + i + '"><a href="' + prefisso + (x.u === '/' ? '/' : x.u) + '"><span class="cerca-tipo">' + esc(tipo(x.k)) + '</span><b>' + esc(x.t) + '</b><span class="small muted">' + esc(x.d) + '</span></a></li>';
      }).join('');
    }).catch(function () { vuoto.hidden = false; });
  }
  function apri() {
    if (dlg.open) return;
    document.querySelectorAll('details.menu-mobile[open]').forEach(function (d) { d.removeAttribute('open'); });
    dlg.showModal();
    campo.focus(); campo.select();
    carica().catch(function () {});
  }
  document.querySelectorAll('.cerca-apri').forEach(function (b) { b.addEventListener('click', apri); });
  campo.addEventListener('input', mostra);
  // frecce su e giù per scegliere, Invio per aprire
  campo.addEventListener('keydown', function (e) {
    var voci = lista.querySelectorAll('a');
    if (!voci.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      scelta = (scelta + (e.key === 'ArrowDown' ? 1 : -1) + voci.length) % voci.length;
      voci.forEach(function (a, i) { a.classList.toggle('scelto', i === scelta); });
      voci[scelta].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      location.href = voci[scelta >= 0 ? scelta : 0].href;
    }
  });
  // clic fuori dalla finestra la chiude
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  document.addEventListener('keydown', function (e) {
    var t = e.target, scrive = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if ((e.key === '/' && !scrive) || ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K'))) { e.preventDefault(); apri(); }
  });
})();
