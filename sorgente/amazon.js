// Link Amazon: negozio italiano per chi ha il browser in italiano, amazon.com per gli altri (come in gpus.js).
const negozi = { it: { host: 'www.amazon.it', tag: 'comecosa-21' } };
const lingua = (navigator.language || 'en').slice(0, 2).toLowerCase();
const negozio = negozi[lingua];
document.querySelectorAll('a.amazon').forEach((a) => {
  a.href = `https://${negozio ? negozio.host : 'www.amazon.com'}/s?k=${encodeURIComponent(a.dataset.q)}${negozio ? `&tag=${negozio.tag}` : ''}`;
  a.addEventListener('click', () => { if (window.gtag) window.gtag('event', 'amazon_click', { gpu: a.dataset.q, store: negozio ? lingua : 'com' }); });
});
