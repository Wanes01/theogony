# Theogony — Documento di progetto

> **Versione:** 0.6 · **Data:** 25 ottobre 2026
> Documento vivo: va aggiornato a ogni decisione presa (vedi changelog in fondo).
> La **specifica tecnica** (modello dati, sintassi, algoritmi, formato di backup…) è nel documento separato [`specifica-tecnica.md`](specifica-tecnica.md).
> Convenzioni: le voci marcate con **(\*)** sono proposte aggiunte da Claude e non ancora confermate; le questioni ancora aperte sono nella sezione 9.2.

---

## 1. Visione e obiettivi

**Theogony** è un'applicazione per **scrivere e organizzare storie di qualsiasi genere** (libri, serie TV, anime, videogiochi, campagne di gioco di ruolo…), pensata per chi lavora spesso in gruppo e rischia di perdere appunti, mischiare eventi e non riuscire a metterli in ordine.

**Problema da risolvere:** appunti sparsi, eventi mescolati, nessuna visione d'insieme di personaggi, luoghi, tempo e relazioni.

**Obiettivi:**

1. Avere un unico posto dove ogni parte della storia (documenti, personaggi, luoghi, eventi, oggetti, …) è ordinata, collegata e ritrovabile.
2. Visualizzare la stessa storia da più punti di vista: testo, schede, linea temporale, grafo delle relazioni, mappe.
3. Essere abbastanza generale da adattarsi a qualsiasi genere (tipi di entità e campi definiti dall'utente, calendario personalizzabile con ere).
4. Funzionare **offline** su Windows e Android; la sincronizzazione è l'unica funzionalità online di rilievo.
5. Non creare lock-in: la storia deve sempre poter essere esportata in formati aperti e leggibili (JSON per i dati, **markdown** per i testi).
6. Aiutare a individuare **incoerenze con la trama**, anche tramite un agente IA gratuito scelto dall'utente (opzionale).
7. Scrivere con **rendering immediato**, come in Typora: si digita con la sintassi markdown e il testo prende subito forma (titoli, grassetti, liste…), senza dover passare da un'anteprima separata.

**Criterio di successo dell'MVP:** tu e i tuoi amici riuscite a scrivere, organizzare, ritrovare e fare il backup di una storia senza più perdere nulla.

---

## 2. Glossario

| Termine                     | Significato                                                                                                                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Storia**                  | L'insieme di tutti i documenti, entità, relazioni, mappe e calendario inerenti a uno stesso contesto. È l'unità di backup, export e sincronizzazione.                                                                                                           |
| **Workspace**               | Un tab selezionabile contenente più pannelli visibili insieme. Cambiando workspace cambiano i pannelli mostrati. Appartiene a una storia.                                                                                                                       |
| **Pannello**                | Una vista dentro un workspace (documento, scheda, timeline, grafo, mappa, …). I pannelli si possono dividere, ridimensionare e popolari a piacere.                                                                                                              |
| **Pannelli collegati**      | Pannelli dello stesso workspace uniti da un legame contestuale: ciò che si seleziona in uno cambia ciò che mostrano gli altri. Sono riconoscibili da un bordo colorato comune.                                                                                  |
| **Documento**               | Un testo della storia (capitolo, scena, nota…), organizzato in un albero. Si scrive con la **sintassi markdown**; internamente è salvato come **JSON** (albero di nodi dell'editor) e può essere **esportato come file `.md`**.                                 |
| **Menzione**                | Riferimento a un'entità o a un documento inserito nel testo con `@`. È un nodo con l'`id` dell'elemento (non il suo nome), mostrato come "chip" cliccabile: se l'elemento viene rinominato, la menzione non si rompe.                                           |
| **Indice derivato**         | Struttura interna (es. l'elenco dei link tra documenti, il testo cercabile) ricavata dal contenuto dei documenti per rendere veloci backlink e ricerca. Si aggiorna a ogni salvataggio e si può sempre ricostruire: non è mai l'unica copia di un'informazione. |
| **Entità**                  | Qualunque cosa del mondo della storia che abbia una propria scheda: un personaggio, un luogo, un evento, un oggetto, una fazione…                                                                                                                               |
| **Tipo di entità**          | Definisce una famiglia di entità (es. _Personaggio_, _Luogo_, _Evento_, _Incantesimo_) e i campi che hanno in comune. Lo crea l'utente. _(In precedenza "categoria".)_                                                                                          |
| **Campo**                   | Una caratteristica di un'entità (es. Forza, Età, Colore degli occhi). Può essere definita sul tipo o solo sulla singola entità.                                                                                                                                 |
| **Relazione**               | Legame tipizzato tra due entità (es. "Aria — sorella di — Bruno").                                                                                                                                                                                              |
| **Tipo di relazione**       | Il significato di una relazione (es. "sorella di", "abita a", "possiede"), con eventuale relazione inversa.                                                                                                                                                     |
| **Raccolta**                | Insieme di entità associato a un'altra entità (es. l'inventario di un personaggio). _(In precedenza "collezione": rinominata per non confonderla con le collection del database.)_                                                                              |
| **Calendario**              | Sistema di date di una storia (uno per storia): reale (gregoriano) o inventato dall'utente.                                                                                                                                                                     |
| **Era**                     | Punto di riferimento con nome, ancorato a una data del calendario (un nuovo "anno 0"), rispetto al quale si scrivono e si mostrano le date (es. "Anno 214 dell'Era Nuova"). Permette più punti di riferimento mantenendo un solo calendario.                    |
| **Linea temporale**         | Vista cronologica della storia; può avere più **rami** per rappresentare diramazioni.                                                                                                                                                                           |
| **Criterio di ordinamento** | Regola scelta dall'utente che stabilisce come ordinare gli elementi della linea temporale (es. quale data usare quando un'entità ne ha più d'una, in quale verso).                                                                                              |
| **Mappa**                   | Immagine caricata sulla quale si segnano punti, tratti e percorsi. Può contenere **sotto-mappe**.                                                                                                                                                               |
| **Segnaposto**              | Punto segnato su una mappa, collegabile a un'entità o a una sotto-mappa.                                                                                                                                                                                        |
| **Tratto**                  | Segmento di strada o passaggio disegnato su una mappa, con una forma e un tipo (strada, sotterraneo, passaggio chiuso…).                                                                                                                                        |
| **Percorso**                | Il cammino di un personaggio sulla mappa nel tempo, disegnato con frecce.                                                                                                                                                                                       |

---

## 3. Utenti e scenari d'uso

- **Autore singolo** che costruisce un mondo e scrive una storia (romanzo, sceneggiatura).
- **Gruppo di amici** che inventa insieme una storia e la sviluppa in più formati.
- **Game master / giocatori** che gestiscono una campagna (personaggi con statistiche, inventari, mappe, cronologia delle sessioni).

Scenari tipici:

- "Voglio vedere tutti gli eventi in cui è coinvolto questo personaggio, in ordine cronologico."
- "Dove è passato questo personaggio nel corso della storia?"
- "In quali documenti viene nominato questo luogo?"
- "Voglio un file unico con tutta la storia in ordine, da leggere o stampare."
- "Ho cambiato nome a un personaggio: non deve rompersi nulla."
- "Quello che ho appena scritto è coerente con quanto stabilito prima?"
- "Scrivo in markdown e vedo subito il risultato formattato, come in Typora."

---

## 4. Requisiti funzionali

**Priorità e fasi:** P0 = Fasi 0–1 (MVP) · P1 = Fasi 2–3 · P2 = Fasi 4–6 · P3 = Fasi 7–8 · P4 = Fase 9 (futuro lontano). Le fasi sono descritte nella sezione 6.

### 4.1 Storie, workspace e interfaccia

| ID    | Requisito                                                                                                                                                                                                | Fase | Prior. |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ |
| RF-01 | Creare, aprire, rinominare, eliminare storie (nome, descrizione, calendario)                                                                                                                             | 1    | P0     |
| RF-02 | Workspace come tab: creare, rinominare, riordinare, chiudere; ogni workspace ricorda il proprio layout. I workspace sono **locali al dispositivo** (non sincronizzati) e inclusi nel backup come opzione | 2    | P1     |
| RF-03 | Pannelli divisibili (orizzontale/verticale), ridimensionabili e riposizionabili; ogni pannello può mostrare un tipo di vista a scelta                                                                    | 2    | P1     |
| RF-04 | Tipi di pannello: documento, scheda entità, raccolta/inventario, galleria immagini/concept art, indice documenti, ricerca; (nelle fasi successive) timeline, grafo, mappa, coerenza                      | 2–4  | P1     |
| RF-05 | **(\*)** Layout adattivo su mobile: un pannello alla volta con cambio rapido, invece dei pannelli affiancati                                                                                             | 2    | P1     |
| RF-06 | **Pannelli collegati** (vedi sotto)                                                                                                                                                                      | 2    | P1     |
| RF-07 | Scorciatoie da tastiera per le azioni principali e _command palette_                                                                                                                                     | 1    | P0     |

**RF-06 — Pannelli collegati.** Il collegamento è sempre **contestuale** e **facoltativo**:

- Da un'entità, segnaposto, nodo del grafo, evento della timeline o menzione si può aprire un altro pannello con un'azione di menu (es. tasto destro sul luogo di una mappa → "Apri in un altro pannello"). L'utente sceglie se il nuovo pannello nasce **collegato** al pannello di partenza oppure **indipendente**.
- In un pannello collegato, selezionare un'altra entità nel pannello di partenza fa cambiare ciò che mostra il pannello collegato (es. cliccare un altro luogo sulla mappa → il pannello con il documento mostra l'altro luogo).
- Un pannello può essere **scollegato** o **collegato a un altro** in qualsiasi momento, e si può **bloccare** temporaneamente (smette di seguire senza essere scollegato).
- I pannelli collegati sono riconoscibili subito da un **bordo colorato comune** (e da un'icona nell'intestazione). Gruppi diversi hanno colori diversi.
- I collegamenti valgono dentro un workspace e non sono tra workspace diversi.

### 4.2 Documenti ed editor

| ID    | Requisito                                                                                                                                                                                                                                                                                                           | Fase | Prior. |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ |
| RF-10 | Albero dei documenti (cartelle/capitoli, ordine con drag & drop)                                                                                                                                                                                                                                                    | 1    | P0     |
| RF-11 | **Editor con rendering immediato (stile Typora)**: l'utente digita con la sintassi markdown e il testo viene formattato subito; salvataggio automatico. Formato di lavoro: **JSON** (albero di nodi), salvato in locale; il markdown è la sintassi di input e il formato di export (vedi dettagli sotto)            | 1    | P0     |
| RF-12 | Menzione di entità e documenti con `@` (autocompletamento tramite **Tippy.js**), mostrata come "chip" cliccabile; la menzione è un **nodo con `id`**, quindi sopravvive alla rinomina dell'elemento e intercetta il click per aprire la scheda dell'entità                                                          | 1    | P0     |
| RF-13 | Link tra documenti e verso entità; pannello **backlink** ("dove è nominata questa entità"), ricavato da un **indice derivato** dei link (aggiornato a ogni salvataggio e ricostruibile dall'albero JSON), così da non scorrere tutti i documenti a ogni richiesta                                                   | 1    | P0     |
| RF-14 | Mini-preview al passaggio sul link (hover/long-press), con rendering di sola lettura del documento                                                                                                                                                                                                                  | 2    | P1     |
| RF-15 | **(\*)** Ricerca full-text su documenti, entità e campi, tramite un **indice di ricerca derivato** (il testo viene estratto dall'albero JSON a ogni salvataggio)                                                                                                                                                    | 1    | P0     |
| RF-16 | Riferimenti a una _parte_ di documento (sezione/blocco) e grafo dei riferimenti di un documento o di una sua parte. I titoli hanno un `id` stabile; gli altri blocchi lo ricevono solo quando vengono referenziati                                                                                                  | 5    | P2     |
| RF-17 | Sintassi dedicata ai dialoghi tra personaggi (scelti tra le entità esistenti); nell'editor è un **nodo custom** con attributi (es. `personaggioId`), nell'export markdown una direttiva (es. `:::dialogo`). **(\*)** Va definita presto, perché è il caso che mette più sotto stress la conversione JSON ↔ markdown | 6    | P2     |
| RF-18 | Pacing opzionale dei dialoghi (durata di parole/frasi) e anteprima con text-to-speech                                                                                                                                                                                                                               | 6    | P2     |

**RF-11 — Comportamento dell'editor.** Flusso: l'utente digita la sintassi markdown → TipTap intercetta e trasforma in nodi (titolo, paragrafo, lista, citazione, grassetto…) → l'albero è la fonte di verità e viene salvato come JSON → l'editor lo mostra come HTML, stilato con CSS/Tailwind (classi sugli elementi o regole su `.ProseMirror`).

- **Le trasformazioni scattano a sequenza completa**, non al primo carattere: `#`, `##` restano testo normale; `## ` (con lo spazio) diventa un titolo di livello 2 (livelli 1–6). `- ` o `* ` apre una lista, `1. ` una lista numerata, `> ` una citazione, ` ``` ` un blocco di codice (alla terza backtick); `**testo**` e `*testo*` scattano quando si chiude il simbolo finale.
- **Annullare una trasformazione:** subito dopo che è scattata, Backspace (o Ctrl+Z) torna al testo digitato (es. `## `), così ci si può correggere. Per scrivere un simbolo senza trasformarlo si può annullare con Backspace o, dove supportato, usare `\#`.
- **Cambio di livello di un titolo già creato:** non si aggiunge un `#` a un titolo esistente; si usa un comando/scorciatoia (es. `toggleHeading({ level: 2 })`) oppure si annulla e si riscrive. **(\*)** Opzionale: Backspace a inizio titolo di livello N lo porta a livello N-1.
- **Differenza rispetto a Typora:** in Typora i simboli (`#`, `**`) restano visibili e modificabili nel blocco attivo e si "chiudono" quando si esce; in TipTap spariscono appena la regola scatta.
- **Cursore, undo e tastiera mobile** (composizione IME su Android) sono gestiti da TipTap/ProseMirror.
- **Il rendering dell'anteprima separata** (`react-markdown`) resta utile solo per le viste di sola lettura (mini-preview, nodi del grafo, export), non come modalità di scrittura.
- **Export/import markdown:** un convertitore JSON → markdown (e viceversa) genera/legge file `.md`. Non è il formato di lavoro, quindi può essere imperfetto, ma deve essere documentato e verificato con test di round-trip.

### 4.3 Entità, relazioni e raccolte

| ID    | Requisito                                                                                                                                                                                                      | Fase | Prior. |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ |
| RF-20 | Tipi di entità definiti dall'utente (nome, icona, colore), con alcuni modelli di partenza (Personaggio, Luogo, Evento, Oggetto, Fazione)                                                                       | 1    | P0     |
| RF-21 | Campi arbitrari per tipo di entità e per singola entità (testo, testo lungo, numero, sì/no, scelta singola/multipla, data, riferimento a entità, immagine)                                                     | 1    | P0     |
| RF-22 | Scheda per ogni entità: campi, descrizione (stesso editor dei documenti, sintassi markdown), relazioni, backlink                                                                                               | 1    | P0     |
| RF-23 | Relazioni tipizzate tra qualsiasi coppia di entità (con etichetta, verso, nome dell'inversa, note, eventuale periodo)                                                                                          | 1    | P0     |
| RF-24 | Raccolte associabili a qualsiasi entità (es. inventario, con attributi per voce come la quantità)                                                                                                              | 2    | P1     |
| RF-25 | Immagini associate alle entità e galleria (concept art); le immagini sono **file fuori dal database**                                                                                                          | 2    | P1     |
| RF-26 | **Preset di campi per sistemi di gioco** (es. le statistiche di D&D): insiemi pronti di tipi di entità, campi e raccolte, installabili in una storia; solo la struttura dei campi, nessun testo di regolamento | 5    | P2     |

### 4.4 Tempo e linea temporale

| ID    | Requisito                                                                                                                                                                                                                                                                                                                                                                                  | Fase | Prior. |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ------ |
| RF-30 | **Un calendario personalizzabile per storia** (mesi, giorni, settimane, anni bisestili…); il calendario reale è un preset. Le **ere** danno più punti di riferimento senza più calendari: una data può diventare un nuovo "anno 0", e le date si inseriscono e si mostrano in qualsiasi era (anche con anni precedenti all'anno 0)                                                         | 3    | P1     |
| RF-31 | Associare a un'entità una data, un intervallo o più date                                                                                                                                                                                                                                                                                                                                   | 3    | P1     |
| RF-32 | Linea temporale visuale con zoom e filtri per tipo di entità                                                                                                                                                                                                                                                                                                                               | 3    | P1     |
| RF-33 | Linea temporale filtrata sulla singola entità (es. cronologia di un personaggio)                                                                                                                                                                                                                                                                                                           | 3    | P1     |
| RF-34 | Diramazioni (rami) visualizzabili nella linea temporale                                                                                                                                                                                                                                                                                                                                    | 4    | P2     |
| RF-35 | **Criterio di ordinamento definito dall'utente**: per ogni linea temporale l'utente specifica come le date vengono ordinate (quale data usare quando un'entità ne ha più d'una, verso crescente/decrescente, eventuale uso di un campo numerico al posto della data). Le entità prive del dato richiesto dal criterio finiscono in una zona "non ordinati" e si possono posizionare a mano | 3    | P1     |

### 4.5 Grafo delle relazioni

| ID    | Requisito                                                                                                                                                                                                                                                                                                            | Fase | Prior. |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ |
| RF-40 | Grafo con qualsiasi tipo di entità come nodo e relazioni come archi                                                                                                                                                                                                                                                  | 3    | P1     |
| RF-41 | Filtri del grafo: per **tipo di entità**, per **singola entità** (con profondità regolabile attorno a un'entità), per **tipo di relazione**, e per altri criteri (etichette, valori dei campi, intervallo di tempo)                                                                                                  | 3    | P1     |
| RF-42 | I link dai documenti compaiono come archi (distinguibili dalle relazioni esplicite)                                                                                                                                                                                                                                  | 3    | P1     |
| RF-43 | Layout automatico dei nodi, con possibilità di spostarli a mano e salvare la posizione                                                                                                                                                                                                                               | 3    | P1     |
| RF-44 | **Livelli di dettaglio dei nodi**, selezionabili globalmente, per tipo di entità o per singolo nodo: solo un pallino colorato · pallino con etichetta · scheda compatta (nome, tipo, riassunto, campi chiave) · mini-preview del documento rappresentato. Opzionale: il dettaglio cambia automaticamente con lo zoom | 3    | P1     |

### 4.6 Mappe

| ID    | Requisito                                                                                                                                                                                                                                                                                 | Fase | Prior. |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ |
| RF-50 | Caricare una o più mappe come immagini                                                                                                                                                                                                                                                    | 4    | P2     |
| RF-51 | Segnare punti sulla mappa, collegabili a entità                                                                                                                                                                                                                                           | 4    | P2     |
| RF-52 | Vista "cosa è successo in questo punto"                                                                                                                                                                                                                                                   | 4    | P2     |
| RF-53 | Percorsi dei personaggi disegnati con frecce, ordinati nel tempo                                                                                                                                                                                                                          | 4    | P2     |
| RF-54 | **Mappe annidate**: un segnaposto può aprire una sotto-mappa (es. dalla mappa del continente alla mappa di una città), con navigazione avanti/indietro                                                                                                                                    | 4    | P2     |
| RF-55 | **Tratti con forma e tipo**: strade e passaggi disegnati con la loro forma reale (curve, spezzate) e un tipo con aspetto diverso (strada, sentiero, sotterraneo, passaggio chiuso, via mare, passaggio segreto, tipi personalizzati); lo stato (es. aperto/chiuso) può cambiare nel tempo | 4    | P2     |

### 4.7 Export, import e backup

| ID    | Requisito                                                                                                                                                                                                                                                                                                                 | Fase | Prior. |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ |
| RF-60 | Export e import dell'intera storia in un solo file (backup/ripristino); i documenti sono salvati come **JSON**. **(\*)** Il backup include anche una copia `.md` leggibile di ogni documento (generata, non usata in importazione), per evitare il lock-in. Le immagini sono incluse come file e i workspace come opzione | 1    | P0     |
| RF-61 | Backup automatici periodici locali con rotazione                                                                                                                                                                                                                                                                          | 2    | P1     |
| RF-62 | Export di singoli documenti, documenti selezionati o dell'intera storia come unico documento ordinato (**markdown**, generato dall'albero JSON; menzioni e nodi custom diventano sintassi markdown documentata)                                                                                                           | 5    | P2     |
| RF-63 | Export in altri formati (HTML, PDF, EPUB, DOCX)                                                                                                                                                                                                                                                                           | 8    | P3     |
| RF-64 | Import di cartelle markdown esistenti (es. da altri strumenti di appunti), convertite in alberi JSON con lo stesso convertitore dell'export                                                                                                                                                                               | 9    | P4     |

### 4.8 Personalizzazione

| ID    | Requisito                                                              | Fase | Prior. |
| ----- | ---------------------------------------------------------------------- | ---- | ------ |
| RF-70 | Tema chiaro/scuro e alcuni preset                                      | 5    | P2     |
| RF-71 | Temi personalizzabili (variabili di design + CSS caricato dall'utente) | 5    | P2     |
| RF-72 | Import/export dei temi                                                 | 5    | P2     |

### 4.9 Sincronizzazione e collaborazione

| ID    | Requisito                                                                                                                              | Fase | Prior. |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ |
| RF-80 | Sincronizzare una storia tra più dispositivi e più utenti (account, inviti, ruoli); i workspace restano locali al dispositivo          | 7    | P3     |
| RF-81 | Gestione dei conflitti di modifica                                                                                                     | 7    | P3     |
| RF-82 | Co-editing in tempo reale dello stesso documento (il testo passa da JSON a documento Yjs: migrazione prevista, vedi specifica tecnica) | 8    | P3     |

### 4.10 Controllo di coerenza

| ID    | Requisito                                                                                                                                                                                                                                                                                                      | Fase | Prior. |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ |
| RF-90 | **Controllo di coerenza con un agente IA gratuito**: l'utente sceglie l'ambito (storia intera, un documento, un'entità, un periodo) e l'agente segnala possibili incoerenze con la trama, ognuna con riferimenti cliccabili ai punti coinvolti. L'agente è di sola lettura (non modifica nulla) ed è opzionale | 8    | P3     |
| RF-91 | **(\*)** Controlli automatici senza IA su dati strutturati (es. un personaggio in due luoghi nello stesso momento, azioni dopo la data di morte, relazioni usate fuori dal loro periodo di validità, riferimenti rotti)                                                                                        | 8    | P3     |

---

## 5. Requisiti non funzionali

| ID     | Categoria                                                          | Requisito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | **Offline-first**                                                  | Tutte le funzionalità, tranne la sincronizzazione e l'agente IA remoto, devono funzionare senza connessione.                                                                                                                                                                                                                                                                                                                                                                                                     |
| RNF-02 | **Integrità dei dati**                                             | Nessuna perdita di dati: salvataggio automatico, backup manuale e automatico, migrazioni di schema testate.                                                                                                                                                                                                                                                                                                                                                                                                      |
| RNF-03 | **Portabilità dei dati**                                           | Il formato di lavoro dei documenti è **JSON** (albero dell'editor), aperto, documentato e versionato; il backup è sempre importabile da versioni successive. Per evitare il lock-in, ogni documento (e l'intera storia) è **esportabile come markdown** leggibile; il backup può includere anche le copie `.md` generate. Lo schema dei nodi custom (menzioni, dialoghi…) è documentato.                                                                                                                         |
| RNF-04 | **Prestazioni** _(obiettivi indicativi da validare con prototipi)_ | Storia di ~5.000 entità e ~2.000 documenti fluida; apertura di un documento senza ritardo percepibile; digitazione nell'editor senza latenza (anche su Android); grafo e timeline usabili grazie a filtri e rendering virtualizzato. Backlink, grafo e "tutti gli eventi di questo personaggio in ordine" sono query relazionali su un DB a documenti: si risolvono con **indici derivati** (link, testo cercabile) e con calcolo in memoria, da misurare con dati sintetici a questa scala durante lo sviluppo. |
| RNF-05 | **Usabilità**                                                      | Interfaccia touch-friendly su Android e ottimizzata per mouse/tastiera su Windows; **scorciatoie da tastiera** per le azioni principali e command palette.                                                                                                                                                                                                                                                                                                                                                       |
| RNF-06 | **Compatibilità**                                                  | Windows 10/11 e Android (versione minima di Android rimandata, vedi 9.2). Stessa base di codice per le due piattaforme.                                                                                                                                                                                                                                                                                                                                                                                          |
| RNF-07 | **Manutenibilità**                                                 | TypeScript ovunque, logica di dominio pura e testata (`core`), moduli indipendenti per funzionalità (`features`), CI su ogni push.                                                                                                                                                                                                                                                                                                                                                                               |
| RNF-08 | **Estendibilità**                                                  | Tipi di entità, viste ed estensioni dell'editor registrati tramite un registro di moduli, così da poter spostare funzioni in plugin in futuro.                                                                                                                                                                                                                                                                                                                                                                   |
| RNF-09 | **Sicurezza**                                                      | Markdown senza HTML grezzo (vale anche in **importazione** di file `.md` e nel rendering degli export), Electron con isolamento del contesto, import dei backup validati e protetti. Le chiavi dell'agente IA restano sul dispositivo.                                                                                                                                                                                                                                                                           |
| RNF-10 | **Privacy**                                                        | I dati restano sul dispositivo finché l'utente non attiva la sincronizzazione o l'agente IA remoto; in quel caso l'utente vede e approva cosa viene inviato.                                                                                                                                                                                                                                                                                                                                                     |
| RNF-11 | **Multilingua**                                                    | Supporto a più lingue dell'interfaccia fin dall'inizio (italiano e inglese come punto di partenza): nessuna stringa fissa nel codice. La lingua dei contenuti della storia è indipendente da quella dell'interfaccia.                                                                                                                                                                                                                                                                                            |
| RNF-12 | **Accessibilità**                                                  | Non è un obiettivo prioritario per ora; restano valide le scorciatoie da tastiera e una struttura dell'interfaccia che non precluda miglioramenti futuri.                                                                                                                                                                                                                                                                                                                                                        |
| RNF-13 | **Evoluzione dello schema**                                        | Ogni modifica agli schemi dati ha una migrazione; i backup vecchi continuano a essere importabili (fixture di test per ogni versione).                                                                                                                                                                                                                                                                                                                                                                           |
| RNF-14 | **Indici ricostruibili**                                           | I dati derivati (indice dei link, testo cercabile) si aggiornano a ogni salvataggio e si possono ricostruire dal contenuto dei documenti; nessuna informazione vive solo negli indici. Esiste un comando di ricostruzione, eseguito anche dopo import e migrazioni.                                                                                                                                                                                                                                              |

---

## 6. Roadmap per fasi

Ogni fase deve produrre qualcosa di **utilizzabile**; non si inizia la successiva senza aver stabilizzato il modello dati della precedente.

**Fase 0 — Fondamenta**
Monorepo, CI, schemi Zod + RxDB, `createDatabase()`, astrazione `platform`, infrastruttura i18n e registro delle azioni/scorciatoie, shell dell'app su Windows e Android con DB persistente, formato di backup v1 definito, pacchetto `core` per la logica pura.
_(Nota: il prototipo (spike) dell'editor con TipTap + Tippy.js è stato completato con successo. Per lo storage si parte con RxDB + Dexie/IndexedDB, senza test dedicato su Android.)_

**Fase 1 — MVP: "non perdere più gli appunti"** (RF-01, 07, 10–13, 15, 20–23, 60)
Storie, albero dei documenti, editor con rendering immediato e sintassi markdown (documenti salvati come JSON) con menzioni `@` via Tippy.js, link e backlink e ricerca (con indici derivati), tipi di entità/campi/entità/relazioni, scorciatoie e command palette, backup e ripristino manuale.

**Fase 2 — Workspace e pannelli** (RF-02–06, 14, 24, 25, 61)
Tab con pannelli divisibili, layout adattivo mobile, pannelli collegati, mini-preview dei link, raccolte/inventari, immagini e galleria, backup automatici.

**Fase 3 — Tempo e grafo** (RF-30–35, 40–44)
Calendario custom con ere, date sulle entità, timeline con criterio di ordinamento (anche per singola entità), grafo con filtri e livelli di dettaglio.

**Fase 4 — Rami e mappe** (RF-34, 50–55)
Diramazioni della timeline, mappe con segnaposto, percorsi, sotto-mappe e tratti con forma e tipo.

**Fase 5 — Export, personalizzazione e preset** (RF-16, 26, 62, 70–72)
Export dei documenti, riferimenti a sezioni, temi e CSS personalizzato, preset per sistemi di gioco.

**Fase 6 — Dialoghi e pacing** (RF-17, 18)
Sintassi dei dialoghi, pacing e anteprima TTS (candidato a modulo/plugin).

**Fase 7 — Sincronizzazione della storia** (RF-80, 81)
Account, inviti, replica, conflitti.

**Fase 8 — Coerenza, collaborazione avanzata ed export** (RF-63, 82, 90, 91)
Controlli di coerenza (regole + agente IA), co-editing in tempo reale (con migrazione del testo a Yjs), export in altri formati.

**Fase 9 — Futuro lontano** (RF-64 e idee)
Import di cartelle markdown, plugin di terze parti.

---

## 7. Tecnologie

| Ambito               | Tecnologia                                                                       | Ruolo                                                                                                                                                                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linguaggio           | **TypeScript**                                                                   | Linguaggio unico per app, backend e tooling                                                                                                                                                                                                                                                  |
| UI                   | **React**                                                                        | UI condivisa tra le piattaforme                                                                                                                                                                                                                                                              |
| Stile                | **Tailwind CSS**                                                                 | Stile, responsive e touch-friendly (i temi utente usano variabili CSS)                                                                                                                                                                                                                       |
| Build                | **Vite**                                                                         | Dev server e bundler                                                                                                                                                                                                                                                                         |
| Navigazione          | **React Router** (HashRouter per Electron)                                       | Routing                                                                                                                                                                                                                                                                                      |
| Stato UI             | **Zustand**                                                                      | Stato globale della UI (non dei dati)                                                                                                                                                                                                                                                        |
| Dati                 | **RxDB** con storage **Dexie/IndexedDB** _(scelte confermate, vedi 9.1)_         | Database NoSQL locale, reattivo, offline-first; replica per la sync                                                                                                                                                                                                                          |
| File                 | File system tramite `platform`                                                   | Immagini e mappe, indirizzate per hash del contenuto (fuori dal DB)                                                                                                                                                                                                                          |
| Validazione          | **Zod**                                                                          | Validazione dati, import di backup, risposte API                                                                                                                                                                                                                                             |
| Markdown             | **react-markdown** + **remark-directive** (+ remark-gfm, remark-frontmatter)     | Rendering di sola lettura e **conversione per export/import** markdown con sintassi custom (es. direttive per i dialoghi); non è la modalità di scrittura                                                                                                                                    |
| Editor               | **TipTap** (basato su ProseMirror) _(scelta confermata, vedi 9.1)_               | Editor con rendering immediato: input rules (`# `, `**x**`, `- `…), estensione Mention per i chip `@`, nodi custom per i dialoghi. Open source (licenza MIT)                                                                                                                                 |
| Posizionamento popup | **Tippy.js** (`tippy.js`) _(scelta attuale, funzionante nello spike)_            | Posizionamento dinamico del menu dei suggerimenti dell'estensione Mention di TipTap, ancorato al cursore su desktop e mobile. Non è un vincolo: **Floating UI** (successore di Popper, su cui Tippy è basato) è l'alternativa se Tippy desse problemi o la versione di TipTap lo richiedesse |
| Conversione markdown | Estensione markdown di TipTap (`@tiptap/markdown` o `tiptap-markdown`)           | Conversione JSON ↔ markdown per export/import                                                                                                                                                                                                                                                |
| Grafi                | **React Flow** (@xyflow/react) + libreria di layout (ELK o dagre)                | Grafo delle relazioni                                                                                                                                                                                                                                                                        |
| Pannelli             | **dockview** _(scelta confermata)_                                               | Layout a pannelli divisibili con serializzazione                                                                                                                                                                                                                                             |
| Mappe                | **Leaflet** con `CRS.Simple` _(scelta confermata)_ + plugin per disegno e frecce | Immagini con segnaposto, tratti e percorsi                                                                                                                                                                                                                                                   |
| i18n                 | **i18next** + **react-i18next**                                                  | Interfaccia multilingua                                                                                                                                                                                                                                                                      |
| Scorciatoie          | Registro di azioni + libreria per i tasti (es. tinykeys)                         | Scorciatoie e command palette                                                                                                                                                                                                                                                                |
| Android              | **Capacitor**                                                                    | Impacchetta l'app per Android                                                                                                                                                                                                                                                                |
| Windows              | **Electron** (+ electron-builder)                                                | Impacchetta l'app per Windows                                                                                                                                                                                                                                                                |
| Backend              | **Express** (+ Zod)                                                              | API per le funzioni online (sync)                                                                                                                                                                                                                                                            |
| Test                 | **Vitest**, **Playwright**                                                       | Unit test, test end-to-end                                                                                                                                                                                                                                                                   |
| CI/CD                | **GitHub Actions**                                                               | Lint, test, build APK/AAB e installer Windows, release su tag                                                                                                                                                                                                                                |
| Monorepo             | **pnpm** + **Turborepo**                                                         | Workspace e cache di build                                                                                                                                                                                                                                                                   |
| Agente IA            | Interfaccia a provider generica (endpoint compatibile con le API OpenAI)         | Modello locale (es. Ollama) o servizio gratuito scelto dall'utente                                                                                                                                                                                                                           |
| Sync testo (futuro)  | **Yjs** (open source, integrabile con l'editor)                                  | CRDT per il co-editing in tempo reale                                                                                                                                                                                                                                                        |
| TTS                  | Web Speech API / plugin Capacitor                                                | Anteprima vocale dei dialoghi                                                                                                                                                                                                                                                                |

---

## 8. Architettura

Struttura del monorepo confermata:

```
theogony/
├─ apps/
│  ├─ android/      → Capacitor (shell Android)
│  ├─ windows/      → Electron (shell Windows)
│  └─ api/          → Express + Zod (sync e funzioni online)
├─ packages/
│  ├─ app/          → React + Tailwind + RxDB (~90% del codice)
│  │  └─ src/
│  │     ├─ db/         → schemi RxDB, createDatabase(), migrazioni
│  │     ├─ platform/   → astrazione delle API native
│  │     ├─ stores/     → Zustand
│  │     ├─ routes/     → pagine
│  │     ├─ locales/    → traduzioni per lingua
│  │     └─ features/   → un modulo per funzionalità:
│  │                       editor, entities, relations, timeline, graph,
│  │                       maps, workspace, export, themes, dialogue, coherence
│  ├─ core/         → logica di dominio pura, senza React né DB
│  │                   (calendari, criteri di ordinamento, parser dei link,
│  │                   costruzione del grafo, regole di coerenza, formato di backup,
│  │                   conversione JSON ↔ markdown, estrazione di testo e menzioni)
│  ├─ shared/       → tipi e schemi Zod condivisi tra app e api
│  └─ config/       → tsconfig, eslint, prettier
├─ .github/workflows/  → ci, release-android, release-windows
├─ turbo.json
└─ pnpm-workspace.yaml
```

### Dove vive cosa

| Cosa                                                                        | Dove                                                                  | Perché                                                                 |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Documenti (JSON), entità, relazioni, calendario, metadati delle mappe, ecc. | **RxDB** (Dexie/IndexedDB), un solo DB con `storyId`                  | Interrogabili, reattivi, sincronizzabili                               |
| Immagini, mappe, concept art                                                | **File** nel filesystem tramite `platform`, nome = hash del contenuto | Blob grandi: non vanno nel DB; nessun duplicato                        |
| Indici derivati (link, testo cercabile)                                     | RxDB e memoria                                                        | Velocità; sempre ricostruibili dal contenuto                           |
| Workspace e impostazioni                                                    | RxDB, **locali al dispositivo**                                       | Ognuno organizza lo spazio come vuole; su telefono il layout è diverso |
| File `.json`, `.md`, `.zip`                                                 | Solo **export e backup**                                              | Portabilità, nessun lock-in                                            |

**Identificatori.** Ogni oggetto del database ha un `id` (ULID/UUIDv7). Dentro i documenti hanno un id le menzioni (che puntano a un elemento), i nodi dialogo e i titoli; gli altri blocchi lo ricevono solo quando qualcosa li referenzia.

Il dettaglio è nella specifica tecnica.

---

## 9. Decisioni e rischi

### 9.1 Decisioni prese

| Questione               | Decisione                                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nome App                | **Theogony.**                                                                                                                                                                                                                                                                                                                               |
| Database                | **Non relazionale: RxDB.** I dati sono molto interconnessi, ma l'app è offline-first con sincronizzazione, schemi definiti dall'utente (campi arbitrari) e viste reattive.                                                                                                                                                                  |
| Editor                  | **TipTap (ProseMirror)**. Scelta confermata dopo lo spike: gestisce il rendering immediato markdown, l'input fluido e l'estensione Mention con chip `@` interattivi (`data-mention-id`).                                                                                                                                                    |
| Popup Suggerimenti      | **Tippy.js** per il posizionamento del menu dei suggerimenti `@` vicino al cursore (desktop e mobile); alternativa: Floating UI.                                                                                                                                                                                                            |
| Libreria dei pannelli   | **dockview**, con configurazione dei pannelli tenuta da noi per poter usare lo stesso modello su mobile.                                                                                                                                                                                                                                    |
| Mappe                   | **Leaflet** (`CRS.Simple`).                                                                                                                                                                                                                                                                                                                 |
| Monorepo                | Struttura con `features/` e `core/` come da sezione 8.                                                                                                                                                                                                                                                                                      |
| Formato dei documenti   | **JSON** (albero di nodi dell'editor), salvato in locale.                                                                                                                                                                                                                                                                                   |
| Sintassi di scrittura   | **Markdown**: rendering immediato durante la digitazione.                                                                                                                                                                                                                                                                                   |
| Export                  | **Markdown `.md`** generato dall'albero JSON.                                                                                                                                                                                                                                                                                               |
| Storage del database    | **Dexie/IndexedDB** tramite RxDB, su Windows e Android, senza test dedicato su Android. Archiviazione persistente richiesta al sistema e backup automatici come rete di sicurezza.                                                                                                                                                          |
| Un DB o uno per storia  | **Un solo DB**, con `storyId` su ogni documento.                                                                                                                                                                                                                                                                                            |
| Dove stanno i documenti | **Nel database** (JSON), non nel filesystem: servono interrogazioni reattive, sincronizzazione e gestione dei conflitti. I file `.json`/`.md` esistono solo in export e backup.                                                                                                                                                             |
| Immagini e mappe        | **Fuori dal database**, come file indirizzati per hash del contenuto, tramite `platform`.                                                                                                                                                                                                                                                   |
| Indici derivati         | **Sì**: indice dei link e testo cercabile, aggiornati a ogni salvataggio e ricostruibili (RNF-14).                                                                                                                                                                                                                                          |
| Workspace               | **Locali al dispositivo**, non sincronizzati; inclusi nel backup come opzione.                                                                                                                                                                                                                                                              |
| Backend di sync         | **Express** con replica RxDB (Fase 7).                                                                                                                                                                                                                                                                                                      |
| Calendario              | **Un solo calendario per storia**; più punti di riferimento con le **ere** (date che fungono da nuovo "anno 0").                                                                                                                                                                                                                            |
| Backup                  | **JSON** come formato di lavoro + copia `.md` generata di sicurezza.                                                                                                                                                                                                                                                                        |
| Identificatori          | **Ogni oggetto ha un `id`**. Nei documenti hanno un id menzioni, nodi dialogo e titoli (gli altri blocchi solo se referenziati). Le menzioni sono nodi con `id`: non si rompono con la rinomina.                                                                                                                                            |
| Struttura dei dati      | **Albero logico, nessuna cartella su disco.** Cartelle e documenti stanno nella stessa collection (`kind`, `parentId`, `order`); le entità, con il loro tipo, in collection separate (i «Personaggi» sono una vista per tipo, non una cartella). Sul filesystem solo i blob, in sottocartelle dall'hash. Dettaglio nella specifica tecnica. |

### 9.2 Decisioni aperte o rimandate

| #   | Questione                                  | Stato / raccomandazione                                                                                                                                                                                                                                 |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D7  | **Android: versione minima**               | Rimandata.                                                                                                                                                                                                                                              |
| D12 | **Provider dell'agente IA**                | Rimandata (interfaccia generica, endpoint compatibile OpenAI).                                                                                                                                                                                          |
| D15 | **Ere: ancora fissa o legata a un evento** | Iniziare con la **data fissa**; l'ancora legata a un evento (con controllo dei cicli) si valuta dopo. Gli anni di un'era iniziano con l'anno del calendario in cui cade l'ancora; l'opzione "anno che inizia all'anniversario dell'ancora" è rimandata. |
| D16 | **Libreria di ricerca in memoria**         | Da scegliere in Fase 1 (es. MiniSearch o FlexSearch), alimentata dall'indice derivato del testo.                                                                                                                                                        |
| D17 | **Id dei titoli nell'editor**              | Verificare disponibilità e licenza dell'estensione UniqueID di TipTap; altrimenti una piccola estensione propria.                                                                                                                                       |

---

## 10. Fuori scope (per ora)

- Plugin di terze parti (Fase 9).
- App per iOS, macOS e Linux.

---

## 11. Changelog del documento

| Versione | Data       | Modifiche                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1      | 2026-10-24 | Prima bozza: visione, glossario, requisiti, stack, architettura.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 0.2      | 2026-10-24 | Specifica tecnica separata. Nuovi requisiti: pannelli collegati, scorciatoie, preset D&D, mappe annidate. Decisioni: RxDB, dockview, Leaflet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 0.3      | 2026-10-24 | Editor: proposta TipTap (D1). Documenti in JSON con export markdown. Menzioni con `id`. Stime di tempo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 0.4      | 2026-10-24 | **Nome app confermato: Theogony.** **Conferma scelta editor TipTap (D1):** spike completato con successo (testati rendering, chip di menzione interattivi e comportamento su mobile). **Adozione di Tippy.js:** specificato l'uso obbligatorio di `tippy.js` per il posizionamento dinamico del popup dei suggerimenti `@` vicino al cursore.                                                                                                                                                                                                                                                                             |
| 0.5      | 2026-10-24 | **Decisioni chiuse:** storage Dexie/IndexedDB (D2), un solo DB con `storyId` (D3), workspace locali (D4), Express per la sync (D6), immagini fuori dal DB e documenti JSON nel DB (D10), un solo calendario con **ere** come punti di riferimento (D11), backup JSON + copia `.md` (D13), id su ogni oggetto (D14); D7 e D12 rimandate. **Nuovo:** indici derivati per link e ricerca (RNF-14), sezione "Dove vive cosa", ere (RF-30), Tippy.js non più "obbligatorio" (alternativa Floating UI), migrazione a Yjs prevista in Fase 8. Rimosso il test su Android dalla Fase 0 e "Spike" dal glossario. Aggiunte D15–D17. |
| 0.6      | 2026-10-25 | **Struttura dei dati confermata:** cartelle e documenti nella stessa collection con `kind` (§3), albero logico senza cartelle su disco, schede delle entità fuori dall'albero, tipi di entità come viste (§3); ciclo di vita degli indici derivati (aggiornamento per singolo documento, caricamento all'apertura, ricostruzione solo su comando o incoerenza, §5.3); backup con `kind` e copie `.md` delle entità (§11); asset in sottocartelle dall'hash con pulizia dei file orfani (§11, §15). La specifica tecnica passa alla v0.4.                                                                                  |
