// Elenco del blog: filtri «All articles / Guides / Weekly reports / Hardware and GPUs».
const tasti = [...document.querySelectorAll('.blog-filtri button')];
const voci = [...document.querySelectorAll('.lista-blog [data-filtro]')];
tasti.forEach((b) => b.addEventListener('click', () => {
  tasti.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  const f = b.dataset.filtro;
  for (const v of voci) v.hidden = Boolean(f) && !v.dataset.filtro.split(' ').includes(f);
}));
