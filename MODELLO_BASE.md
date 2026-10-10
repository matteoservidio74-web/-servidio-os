# Servidio OS — modello base approvato, 10 ottobre 2026

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
