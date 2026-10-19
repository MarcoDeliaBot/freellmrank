// Widget "top 5 modelli gratis" da incollare su altri siti:
//   <div class="freellmarena-top" data-category="chat"></div><script src="https://freellmarena.com/widget.js" async></script>
// Niente cookie, niente tracciamento: legge un piccolo JSON e disegna un riquadro con il link al sito.
(function () {
  var BASE = 'https://freellmarena.com';
  var STILE = 'font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;border:1px solid #dde3e8;border-radius:10px;padding:12px 14px;max-width:340px;background:#fff;color:#111a22';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function disegna(el) {
    if (el.getAttribute('data-pronto')) return;
    el.setAttribute('data-pronto', '1');
    var cat = (el.getAttribute('data-category') || 'chat').replace(/[^a-z_]/g, '');
    var base = location.hostname === 'freellmarena.com' || location.hostname === '127.0.0.1' ? '' : BASE;
    fetch(base + '/widget/top-' + cat + '.json').then(function (r) { return r.json(); }).then(function (d) {
      el.innerHTML = '<div style="' + STILE + '"><div style="font-weight:700;margin-bottom:6px">Best free ' + esc(d.categoria.toLowerCase()) + ' AI models</div><ol style="margin:0;padding-left:20px">' +
        d.modelli.map(function (m) { return '<li><a href="' + esc(m.url) + '" style="color:#1a56c9;text-decoration:none">' + esc(m.nome) + '</a> <span style="color:#56636f">' + m.punti + '</span></li>'; }).join('') +
        '</ol><div style="margin-top:8px;font-size:12px;color:#56636f">Arena votes · <a href="' + BASE + '/" style="color:#0d7a47;font-weight:600;text-decoration:none">FreeLLMArena</a></div></div>';
    }).catch(function () { el.innerHTML = '<a href="' + BASE + '/">Best free AI models on FreeLLMArena</a>'; });
  }
  function tutti() { [].forEach.call(document.querySelectorAll('.freellmarena-top'), disegna); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tutti); else tutti();
})();
