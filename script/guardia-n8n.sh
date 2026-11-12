#!/usr/bin/env bash
# Guardia di n8n (12/11/2026). n8n gira sul Linux di casa e carica i video su YouTube, fa partire le notizie e manda
# le mail degli avvisi. Il 12/11 il Linux è crollato all'01:00 e per 10 ore nessuno se n'è accorto: niente video, niente
# notizie, e nemmeno la mail della salute, perché la manda n8n stesso.
# Uso: script/guardia-n8n.sh [indirizzo]  → stampa «su <codice>» ed esce 0, oppure «giù <codice>» ed esce 1.
# «Giù» = nessuna risposta (000) o un 5xx dopo 3 tentativi a 60 s l'uno dall'altro. Cloudflare dà 530 (errore 1033)
# quando il tunnel non è collegato, cioè quando il Linux o cloudflared sono spenti. Un 4xx vuol dire che n8n risponde.
set -u
URL="${1:-https://n8n.primisugoogle.com/healthz}"
PAUSA="${PAUSA:-60}"
codice=000
for tentativo in 1 2 3; do
  codice=$(curl -s -o /dev/null -w '%{http_code}' -m 20 -A 'freellmarena-guardia' "$URL" || true)
  [ -z "$codice" ] && codice=000
  if [ "$codice" != 000 ] && [ "$codice" -lt 500 ]; then
    echo "su $codice"
    exit 0
  fi
  [ "$tentativo" -lt 3 ] && sleep "$PAUSA"
done
echo "giù $codice"
exit 1
