# Collega uno Short al suo video lungo (deciso da Marco il 23/10/2026: «ogni short deve rimandare al video lungo»,
# come fanno i creator: lo Short fa scoprire il canale, il video lungo tiene chi guarda ed è quello con la pubblicità).
# Scrive nel .json della release dello Short il campo «lungo» (release del video lungo, per chi carica su YouTube e
# imposta «Video correlato») e aggiunge in fondo alla descrizione il link al post del blog del video lungo.
# Il .json usato dal controllo dei fatti (video/brag/info-*.json) non si tocca: il link ha numeri che non sono dati.
# Uso: python script/brag/collega.py <json dello Short> <nome del video lungo, es. modello-ling-3.1-flash>
import json, re, sys

file, lungo = sys.argv[1], sys.argv[2]
info = json.load(open(file, encoding='utf-8'))
# stesso indirizzo che costruisce script/sito/blog.mjs
url = 'https://freellmarena.com/blog/video-' + re.sub(r'[^a-z0-9-]+', '-', lungo, flags=re.I).lower()
info['lungo'] = 'video-' + lungo
riga = f'Full video: {url}'
if riga not in info['descrizione']:
    info['descrizione'] = info['descrizione'].rstrip() + '\n' + riga
json.dump(info, open(file, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'Collegato {info["nome"]} -> video-{lungo}')
