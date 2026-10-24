# Stampi dei video — contratto

Decisione di Marco, 24/10/2026: i video delle notizie nello stile della prova DeepInfer
(`video/videos/deepinfer-explained/`, solo in locale) devono essere fatti ogni giorno da n8n sui computer di
GitHub, senza Claude, gratis. Uno **stampo** è una scena HyperFrames disegnata e animata una volta per tutte; il
**piano** del video (scritto da Workers AI e controllato in codice, `piano.mjs`) sceglie gli stampi e riempie i
buchi; `monta.mjs` fa voce, tempi, sottotitoli e MP4.

## Un modulo stampo: `stampi/<nome>.mjs`

```js
import { C, scena, s3, esc, misura, attacchi } from '../base.mjs';
export default {
  nome: 'numero',                     // = nome del file
  descrizione: '...',                 // una riga in inglese per il modello che scrive il piano: quando usarlo
  schema: '{ "valore": "...", ... }', // i campi di «dati», in inglese, con i limiti di lunghezza: va nel prompt
  valida(dati) { return [/* problemi in italiano; vuoto = va bene */]; },
  parole(dati) { return attacchi(dati, [['chiave', testoDelPezzo], ...]); }, // NELL'ORDINE in cui la voce li nomina
  html({ id, px, dati, durata, t, etichetta, numero }) { return scena({ id, px, durata, etichetta, numero, css, corpo, anima }); },
};
```

- `t(chiave, riserva)`: secondi (dall'inizio della scena) in cui la voce nomina il pezzo; se la parola non si trova,
  `riserva`. Ogni pezzo deve avere una riserva sensata (pezzi distribuiti sulla durata, mai tutti all'inizio).
- `px`: prefisso obbligatorio di **ogni** classe e id dello stampo (es. `s3-`); due scene dello stesso stampo stanno
  nello stesso video. In JS si cerca solo con `q('#'+...)` / `qa('.'+...)` dati da `scena()`.
- `valida()` deve rifiutare tutto ciò che romperebbe l'impaginazione (testi troppo lunghi, numero di voci fuori dai
  limiti, valori non numerici dove serve un numero). Il piano scartato torna a una scena di riserva: meglio scartare.
- `dati.quando`: oggetto facoltativo `{ chiave: "parola della voce" }` scritto dal piano; `attacchi()` lo usa.

## Regole di disegno (dalla prova DeepInfer e da faceless-explainer)

- Colori solo da `C` (fondo verde scuro, pannelli `pannello`/`scuro`, testo `crema`/`crema2`, UN accento `accento`).
  Niente rosso, niente gradienti viola/blu, niente ombre.
- Caratteri: «Source Serif 4» per titoli e numeri (`font-variant-numeric: tabular-nums` sulle cifre), «JetBrains Mono»
  per etichette, nomi tecnici, versioni. **Nessun testo sotto 28 px.** Dimensioni dei testi variabili decise con
  `misura()` (nel codice, mai nel browser).
- Tutto il contenuto sopra y = 860 (sotto ci sono i sottotitoli). Barra in alto già messa da `scena()` (y 56–110).
- L'elemento principale occupa il 40–60% dello schermo: niente scene vuote con un gruppetto al centro.
- Movimento: entrate con `tl.fromTo` e curve lunghe (`power3.out`, `expo.out` per arrivi veloci); niente rimbalzi
  (`back`, `bounce`, `elastic`), niente `repeat`/`yoyo`, niente `Math.random`/`Date.now`, niente transizioni CSS,
  niente zoom o panoramiche lente sotto la scena. Ogni pezzo entra **quando la voce lo nomina** (`t(...)`); al tempo 0
  c'è solo ciò che la voce dice all'inizio. Finite le entrate, la scena sta ferma.
- Uscita: nessuna (solo la `chiusura` ha `ultima: true`).

## Gli stampi

| nome | quando | dati |
|---|---|---|
| `titolo` | apertura di ogni notizia | `{ "testo": "headline, max 60 chars", "evidenza": "2-3 words of testo to highlight", "sopra": "e.g. AI news · 24 October 2026, max 40" }` |
| `numero` | un numero che colpisce | `{ "valore": "155", "unita": "T", "etichetta": "tokens / day, max 24", "dettaglio": "on one cluster, max 24", "fonte": "DeepSeek reports, max 28", "timbro": "Open source, max 16" }` (dettaglio, fonte, timbro facoltativi) |
| `nome` | presentare un prodotto o modello | `{ "nome": "DeepInfer, max 18", "evidenza": "Infer (end of nome to color)", "sopra": "by DeepSeek, max 30", "etichette": ["max 34 chars", "... up to 3"] }` |
| `numeri` | 2 o 3 numeri insieme | `{ "titolo": "DeepSeek reports, max 32", "voci": [{ "valore": "96", "unita": "%", "etichetta": "max 26", "grafico": "barra|anello|linea|nessuno" }] }` (2–3 voci; `anello` solo con unita «%») |
| `lista` | cosa contiene / cosa serve | `{ "pannello": "deepinfer /, max 22", "blocchi": [{ "nome": "FlashMLA, max 14", "tipo": "kernel, max 12" }], "titoloLista": "To build, max 22", "righe": ["Linux", "GCC 13", "max 22 each, 1-5"], "alternative": [{ "testo": "CUDA 13", "nota": "NVIDIA" }] }` (blocchi 0–3, alternative 0–2) |
| `confronto` | due colonne: aperto/chiuso, prima/dopo, A/B | `{ "sinistra": { "titolo": "Open, max 16", "voci": ["max 28 each, 1-4"] }, "destra": { "titolo": "Closed", "voci": [...], "chiuso": true }, "conclusione": "max 70, optional", "evidenza": "words of conclusione to color" }` |
| `punti` | 2–4 punti chiave, notizie senza numeri | `{ "titolo": "What changed, max 32", "punti": ["max 60 chars each, 2-4"] }` |
| `chiusura` | sempre l'ultima | nessun dato, voce fissa |

## Formato verticale (Short di YouTube) — dal 24/10/2026 sera

Marco: «li vorrei tutti così», anche gli Short. Ogni stampo deve funzionare in **due formati**:
`html({ ..., formato })` riceve `formato` = `'orizzontale'` (1920×1080, quello di sopra) o `'verticale'` (1080×1920).
`formatoDi(formato)` in `base.mjs` dà `{ W, H, fondo, capTop, capH, margine }`; passare `formato` a `scena()`.

Regole del verticale:
- Contenuto fra y = 150 (sotto la barra) e y = **1180**; sotto ci sono i sottotitoli (1220–1420) e poi i pulsanti di
  YouTube: niente contenuto sotto 1180. Margini laterali 72 px.
- Impaginazione **impilata**, mai affiancata: le colonne diventano righe, le schede una sotto l'altra, griglie 1×N.
- Testi più grandi e righe più corte: un telefono legge male sotto i 40 px; minimo assoluto 32 px.
- L'elemento principale occupa la parte alta-centrale (centro a circa y = 650).
- `valida(dati)` vale per entrambi i formati: se una cosa non entra in verticale (es. troppe voci), `valida` la rifiuta
  oppure lo stampo la impagina in modo che entri. Mai testo tagliato.
- Stessi movimenti, stessi tempi `t(...)`.

## Lo stampo `barre`

Per classifiche, memoria e velocità (video della settimana, dei modelli, delle schede video):
`{ "titolo": "max 40", "sotto": "riga piccola facoltativa, max 50", "voci": [{ "nome": "max 28", "valore": 1491, "testo": "testo mostrato a destra, es. 1491 o 6 GB o 49 tok/s, max 12", "nota": "facoltativa, max 34", "segno": "si|no|" }] (2-10 voci), "riferimento": { "nome": "max 28", "valore": 1532, "testo": "max 12" } (facoltativo: linea tratteggiata, es. il miglior modello a pagamento), "scala": { "da": 1400 } (facoltativo: dove parte l'asse; senza, da 0), "evidenza": 0 }`
Le barre crescono una dopo l'altra (lunghezza proporzionale a `valore` sulla scala), la voce `evidenza` (indice) in
accento, le altre in pannello; `segno` mostra ✓ o ✕ accanto al nome. Parole di attacco: titolo, poi ogni voce nell'ordine.

## Provare uno stampo

```bash
export PATH="/c/Users/Marco/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin:$PATH"
export HYPERFRAMES_PYTHON="C:\Users\Marco\AppData\Local\Programs\Python\Python311\python.exe"
node script/video-hf/monta.mjs <piano.json> <cartella-nuova>
```

Piano di prova: `{ "scene": [{ "stampo": "numero", "etichetta": "The number", "voce": "...", "dati": { ... } }], "copertina": 0 }`.
Per il verticale aggiungere `"formato": "verticale"` al piano.
Poi guardare i fotogrammi (ffmpeg `-ss <t> -frames:v 1`) a metà e alla fine di ogni entrata.
