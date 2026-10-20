-- Database dei voti di Free Arena (Cloudflare D1 "freellmarena-arena").
-- Per scelta di Marco (19/10/2026) non si salva il testo delle domande né delle risposte: solo il voto.

-- un voto per duello: chi era A, chi era B, chi ha vinto
CREATE TABLE IF NOT EXISTS voti (
  duello    TEXT PRIMARY KEY,           -- numero casuale del duello: un solo voto per duello
  giorno    TEXT NOT NULL,              -- AAAA-MM-GG (UTC)
  a         TEXT NOT NULL,              -- modello a sinistra (id Cloudflare)
  b         TEXT NOT NULL,              -- modello a destra
  esito     TEXT NOT NULL CHECK (esito IN ('a', 'b', 'pari', 'male')),
  categoria TEXT NOT NULL,              -- chat, code, writing, other
  lingua    TEXT NOT NULL,              -- due lettere dal browser (en, it, ...)
  secondi   REAL NOT NULL,              -- tempo fra le risposte e il voto
  creato    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS voti_giorno ON voti (giorno);

-- contatori giornalieri: spesa in neurons e duelli per visitatore (impronta dell'IP che cambia ogni giorno)
CREATE TABLE IF NOT EXISTS contatori (
  chiave TEXT PRIMARY KEY,
  valore REAL NOT NULL,
  scade  TEXT NOT NULL                  -- AAAA-MM-GG: dopo questo giorno la riga si cancella
);

-- «Report a mistake» (20/10/2026): segnalazioni di dati sbagliati. Solo pagina e testo, niente email né IP.
CREATE TABLE IF NOT EXISTS segnalazioni (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  creato  TEXT NOT NULL,                -- data e ora UTC
  pagina  TEXT NOT NULL,                -- percorso della pagina del sito, es. /model/qwen3-30b-a3b
  testo   TEXT NOT NULL,                -- cosa è sbagliato, al massimo 1000 caratteri
  letta   INTEGER NOT NULL DEFAULT 0    -- 1 quando il riassunto di n8n l'ha già mandata
);
CREATE INDEX IF NOT EXISTS segnalazioni_letta ON segnalazioni (letta);
