# Servidio OS — modello base approvato, 11 ottobre 2026

Matteo approva la struttura attuale come base da conservare e aggiornare gradualmente.
Continuare sull'app esistente, allo stesso indirizzo e con gli stessi dati cloud.
Non richiedere una reinstallazione per gli aggiornamenti.

## Struttura da mantenere

- Navigazione: Oggi, Cantieri, Inserisci, Finanze, Programma.
- Aziende separate tramite il selettore in alto.
- Programma: Lavori da iniziare, Lavori in corso, calendario lunedì–domenica con frecce per le settimane.
- Sotto il calendario: Promemoria e materiali. Non duplicare tutti i lavori in un altro elenco di impegni.
- Schede lavoro: orario, cantiere, lavorazioni, squadra, ore e costi previsti, totale, acconto e saldo.
- Modifica, completamento e riapertura dei programmi mantengono i dettagli salvati.
- Le richieste inserite con Da comprare sono visibili in Programma → Promemoria e materiali, in Finanze e nella scheda del cantiere scelto.
- Acconti e saldi previsti restano in Finanze e nei dettagli del lavoro; non diventano appuntamenti automatici.

## Regole per gli aggiornamenti

- Intervenire soltanto su quanto richiesto da Matteo. Evitare altre modifiche di struttura.
- Preservare storico, ore effettive, tariffe, pagamenti, fatture e ricevute.
- I totali delle ore comprendono registrazioni rapide e registri operai preesistenti.
- Ore, costi e incassi previsti non diventano automaticamente movimenti effettivi.
- Salvare il totale del nuovo lavoro anche come valore del nuovo cantiere. Il salvataggio atomico attuale lo gestisce già.
- Non modificare importi già registrati di altri cantieri per correggere una singola scheda.
- Verificare la modifica e pubblicare tramite il repository e il progetto Vercel già collegati.

## Versioni di riferimento

- `modello-base-2026-10-10-prima-promemoria`: fotografia della struttura approvata prima degli ultimi ritocchi, commit `24fa366fad0152be7a7493ba22b813f4e7906803`.
- `modello-base-2026-10-10`: fotografia del modello completo dopo valore cantiere e sezione promemoria/materiali. Mantenere questo ramo come riferimento, senza usarlo per gli aggiornamenti ordinari.
- Sviluppo ordinario: branch `main`, pagina `nuova-semplice-accesso.html`.

Le versioni di riferimento conservano il codice. I dati operativi restano nel database esistente e non vengono riportati indietro quando si consulta una versione precedente.

## Modello funzionante approvato — 11 ottobre 2026

Matteo conferma che l'app funziona alla grande e richiede di conservare questa versione come base per tutti i prossimi aggiornamenti.

- Riferimento da conservare: branch `modello-base-2026-10-11`, commit `96eaec2fac04d96d3cb91d156bfcc525bbec3cee`.
- Pubblicazione verificata: produzione Vercel `dpl_7mjJiknu4Aw66VUz9u25kBttv2W7`, pagina `nuova-semplice-accesso.html`.
- Cantieri separati in Da iniziare, In corso e Completati.
- Materiali e promemoria con modifica, completamento ed eliminazione.
- Incassi: Acconto, Saldo e Altro; fattura associata facoltativa, con visualizzazione Non fatturato.
- Ore operai: costo totale a prezzo fisso facoltativo, conservando le ore lavorate. Un prezzo fisso sostituisce il calcolo orario e non va duplicato tra le spese.
- Stati Da pagare e Già pagato coerenti con costi del cantiere e riepiloghi.
- Calendario per lavorazioni giornaliere di cantieri esistenti, squadra e dettagli. Ore previste totali della squadra separate dalle ore effettive. La fine dell'orario viene attualmente indicata nei dettagli.
- Copia separata dei dati operativi delle due aziende acquisita l'11 ottobre 2026. Allegati esterni conservati come riferimenti; questa copia non contiene i file binari né credenziali.
- Non aggiornare il branch di riferimento. Tutte le modifiche successive vanno sul branch main; conservare anche le basi del 10 ottobre.
- Una eventuale consultazione o ripristino del codice non deve riportare indietro o sovrascrivere i dati operativi correnti.
