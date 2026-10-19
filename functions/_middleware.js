// Rimando permanente all'indirizzo ufficiale: dal vecchio freellmrank.pages.dev e da www.
// Le anteprime di Cloudflare (<hash>.freellmrank.pages.dev) restano raggiungibili.
const UFFICIALE = 'freellmarena.com';
const DA_RIMANDARE = new Set(['freellmrank.pages.dev', 'www.freellmarena.com']);

export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  if (DA_RIMANDARE.has(url.hostname)) {
    return Response.redirect(`https://${UFFICIALE}${url.pathname}${url.search}`, 301);
  }
  return ctx.next();
}
