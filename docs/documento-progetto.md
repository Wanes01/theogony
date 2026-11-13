# Theogony — Documento di progetto

> **Versione:** 0.8 · **Data:** 14 novembre 2026
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

| Termine                     | Significato                                                                                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Storia**                  | L'insieme di tutti i documenti, entità, relazioni, mappe e calendario inerenti a uno stesso contesto. È l'unità di backup, export e sincronizzazione.                                                                                                                                       |
| **Workspace**               | Un tab selezionabile contenente più pannelli visibili insieme. Cambiando workspace cambiano i pannelli mostrati. Appartiene a una storia.                                                                                                                                                   |
| **Pannello**                | Una vista dentro un workspace (documento, scheda, timeline, grafo, mappa, …). I pannelli si possono dividere, ridimensionare e popolari a piacere.                                                                                                                                          |
| **Pannelli collegati**      | Pannelli dello stesso workspace uniti da un legame contestuale: ciò che si seleziona in uno cambia ciò che mostrano gli altri. Sono riconoscibili da un bordo colorato comune.                                                                                                              |
| **Layout**                  | Struttura ad albero di un workspace: dice come i pannelli sono divisi (in orizzontale o in verticale), in quali proporzioni e che cosa mostra ciascuno. Contiene solo dati, così si salva, entra nel backup e si adatta anche al mobile.                                                    |
| **Documento**               | Un testo della storia (capitolo, scena, nota…), organizzato in un albero. Si scrive con la **sintassi markdown**; internamente è salvato come **JSON** (albero di nodi dell'editor) e può essere **esportato come file `.md`**.                                                             |
| **Summary**                 | Riassunto breve e **opzionale** di un documento, scritto dall'utente. Se un pannello viene ristretto troppo per mostrare il testo, può mostrare il summary al suo posto.                                                                                                                    |
| **Menzione**                | Riferimento a un'entità o a un documento inserito nel testo con `@`. È un nodo con l'`id` dell'elemento (non il suo nome), mostrato come "chip" cliccabile: se l'elemento viene rinominato, la menzione non si rompe.                                                                       |
| **Entità linkabile**        | Qualunque elemento richiamabile con `@` da un documento (entità, documenti e anche elementi specifici come linee temporali, mappe e altre immagini). Con il tasto destro offre un menu di **azioni contestuali**: un set minimo comune a tutte, più azioni dedicate per i tipi particolari. |
| **Indice derivato**         | Struttura interna (es. l'elenco dei link tra documenti, il testo cercabile) ricavata dal contenuto dei documenti per rendere veloci backlink e ricerca. Si aggiorna a ogni salvataggio e si può sempre ricostruire: non è mai l'unica copia di un'informazione.                             |
| **Entità**                  | Qualunque cosa del mondo della storia che abbia una propria scheda: un personaggio, un luogo, un evento, un oggetto, una fazione…                                                                                                                                                           |
| **Tipo di entità**          | Definisce una famiglia di entità (es. _Personaggio_, _Luogo_, _Evento_, _Incantesimo_) e i campi che hanno in comune. Lo crea l'utente. _(In precedenza "categoria".)_                                                                                                                      |
| **Campo**                   | Una caratteristica di un'entità (es. Forza, Età, Colore degli occhi). Può essere definita sul tipo o solo sulla singola entità.                                                                                                                                                             |
| **Relazione**               | Legame tipizzato tra due entità (es. "Aria — sorella di — Bruno").                                                                                                                                                                                                                          |
| **Tipo di relazione**       | Il significato di una relazione (es. "sorella di", "abita a", "possiede"), con eventuale relazione inversa.                                                                                                                                                                                 |
| **Raccolta**                | Insieme di entità associato a un'altra entità (es. l'inventario di un personaggio). _(In precedenza "collezione": rinominata per non confonderla con le collection del database.)_                                                                                                          |
| **Calendario**              | Sistema di date di una storia (uno per storia): reale (gregoriano) o inventato dall'utente.                                                                                                                                                                                                 |
| **Era**                     | Punto di riferimento con nome, ancorato a una data del calendario (un nuovo "anno 0"), rispetto al quale si scrivono e si mostrano le date (es. "Anno 214 dell'Era Nuova"). Permette più punti di riferimento mantenendo un solo calendario.                                                |
| **Linea temporale**         | Vista cronologica della storia; può avere più **rami** per rappresentare diramazioni.                                                                                                                                                                                                       |
| **Criterio di ordinamento** | Regola scelta dall'utente che stabilisce come ordinare gli elementi della linea temporale (es. quale data usare quando un'entità ne ha più d'una, in quale verso).                                                                                                                          |
| **Mappa**                   | Immagine caricata sulla quale si segnano punti, tratti e percorsi. Può contenere **sotto-mappe**.                                                                                                                                                                                           |
| **Segnaposto**              | Punto segnato su una mappa, collegabile a un'entità o a una sotto-mappa.                                                                                                                                                                                                                    |
| **Tratto**                  | Segmento di strada o passaggio disegnato su una mappa, con una forma e un tipo (strada, sotterraneo, passaggio chiuso…).                                                                                                                                                                    |
| **Percorso**                | Il cammino di un personaggio sulla mappa nel tempo, disegnato con frecce.                                                                                                                                                                                                                   |

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

| ID    | Requisito                                                                                                                                                                                                                                                                                                                    | Fase | Prior. |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ |
| RF-01 | Creare, aprire, rinominare, eliminare storie (nome, descrizione, calendario)                                                                                                                                                                                                                                                 | 1    | P0     |
| RF-02 | Workspace come tab: creare, rinominare, riordinare, chiudere; ogni workspace ricorda il proprio layout. I workspace sono **locali al dispositivo** (non sincronizzati) e inclusi nel backup come opzione                                                                                                                     | 2    | P1     |
| RF-03 | Pannelli divisibili (orizzontale/verticale), ridimensionabili e riposizionabili; ogni pannello può mostrare un tipo di vista a scelta                                                                                                                                                                                        | 2    | P1     |
| RF-04 | Tipi di pannello: documento, scheda entità, raccolta/inventario, galleria immagini/concept art, indice documenti, ricerca; (nelle fasi successive) timeline, grafo, mappa, coerenza                                                                                                                                          | 2–4  | P1     |
| RF-05 | **(\*)** Layout adattivo su mobile: un pannello alla volta con cambio rapido, invece dei pannelli affiancati                                                                                                                                                                                                                 | 2    | P1     |
| RF-06 | **Pannelli collegati** (vedi sotto)                                                                                                                                                                                                                                                                                          | 2    | P1     |
| RF-07 | Scorciatoie da tastiera per le azioni principali e _command palette_                                                                                                                                                                                                                                                         | 1    | P0     |
| RF-08 | **Menu contestuale delle entità linkabili** (vedi sotto): ogni entità linkabile (richiamabile con `@` dal documento) ha, con il **tasto destro**, un set di **azioni minime** comune a tutte. Alcune entità linkabili specifiche (es. linea temporale, mappe, altre immagini) hanno un set di azioni **più ampio o diverso** | 2    | P1     |

**RF-03 — Layout dei pannelli.** Il layout di un workspace è un albero di divisioni e pannelli, divisibile in qualsiasi direzione quante volte si vuole (vedi sezione 8, «Layout dei pannelli»). **(\*)** Nella prima versione il riposizionamento può essere «chiudi e dividi di nuovo»; il trascinamento dei pannelli con zone di rilascio sui bordi arriva dopo (D20).

**RF-06 — Pannelli collegati.** Il collegamento è sempre **contestuale** e **facoltativo**:

- Da un'entità, segnaposto, nodo del grafo, evento della timeline o menzione si può aprire un altro pannello con un'azione di menu (es. tasto destro sul luogo di una mappa → "Apri in un altro pannello"). L'utente sceglie se il nuovo pannello nasce **collegato** al pannello di partenza oppure **indipendente**.
- In un pannello collegato, selezionare un'altra entità nel pannello di partenza fa cambiare ciò che mostra il pannello collegato (es. cliccare un altro luogo sulla mappa → il pannello con il documento mostra l'altro luogo).
- Un pannello può essere **scollegato** o **collegato a un altro** in qualsiasi momento, e si può **bloccare** temporaneamente (smette di seguire senza essere scollegato).
- I pannelli collegati sono riconoscibili subito da un **bordo colorato comune** (e da un'icona nell'intestazione). Gruppi diversi hanno colori diversi.
- I collegamenti valgono dentro un workspace e non sono tra workspace diversi.
- **(\*)** Il collegamento ha una direzione: il pannello collegato **segue** il pannello che lo comanda (D19). Nella prima versione un pannello può comandarne più d'uno, ma non si formano catene (A comanda B che comanda C).

**RF-08 — Azioni contestuali delle entità linkabili.**

- **Set minimo, uguale per tutte le entità linkabili.** **(\*)** Proposta di partenza, da confermare: apri, apri in un altro pannello (collegato o indipendente, vedi RF-06), copia il link/la menzione, mostra i backlink. La lista definitiva delle azioni minime è ancora da decidere.
- **Set esteso o diverso per i tipi particolari.** Le entità linkabili specifiche aggiungono o sostituiscono azioni in base a ciò che sono (es. una linea temporale, una mappa o un'immagine hanno azioni proprie, diverse da quelle di una scheda personaggio). Le azioni specifiche per tipo sono da definire insieme ai rispettivi pannelli (fasi 3–4).
- **Registro delle azioni.** Il menu si compone dal registro di azioni già previsto (RNF-08): ogni tipo di entità linkabile registra il proprio set, sopra il set minimo comune, così un nuovo tipo non richiede di toccare il menu.
- Il menu è lo stesso ovunque compaia l'elemento (chip nel testo, albero, grafo, timeline, mappa).

### 4.2 Documenti ed editor

| ID    | Requisito                                                                                                                                                                                                                                                                                                                                              | Fase | Prior. |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ------ |
| RF-10 | Albero dei documenti (cartelle/capitoli, ordine con drag & drop)                                                                                                                                                                                                                                                                                       | 1    | P0     |
| RF-11 | **Editor con rendering immediato (stile Typora)**: l'utente digita con la sintassi markdown e il testo viene formattato subito; salvataggio automatico. Formato di lavoro: **JSON** (albero di nodi), salvato in locale; il markdown è la sintassi di input e il formato di export (vedi dettagli sotto)                                               | 1    | P0     |
| RF-12 | Menzione di entità e documenti con `@` (autocompletamento tramite **Tippy.js**), mostrata come "chip" cliccabile; la menzione è un **nodo con `id`**, quindi sopravvive alla rinomina dell'elemento e intercetta il click per aprire la scheda dell'entità                                                                                             | 1    | P0     |
| RF-13 | Link tra documenti e verso entità; pannello **backlink** ("dove è nominata questa entità"), ricavato da un **indice derivato** dei link (aggiornato a ogni salvataggio e ricostruibile dall'albero JSON), così da non scorrere tutti i documenti a ogni richiesta                                                                                      | 1    | P0     |
| RF-14 | Mini-preview al passaggio sul link (hover/long-press), con rendering di sola lettura del documento                                                                                                                                                                                                                                                     | 2    | P1     |
| RF-15 | **(\*)** Ricerca full-text su documenti, entità e campi, tramite un **indice di ricerca derivato** (il testo viene estratto dall'albero JSON a ogni salvataggio)                                                                                                                                                                                       | 1    | P0     |
| RF-16 | Riferimenti a una _parte_ di documento (sezione/blocco) e grafo dei riferimenti di un documento o di una sua parte. I titoli hanno un `id` stabile; gli altri blocchi lo ricevono solo quando vengono referenziati                                                                                                                                     | 5    | P2     |
| RF-17 | Sintassi dedicata ai dialoghi tra personaggi (scelti tra le entità esistenti); nell'editor è un **nodo custom** con attributi (es. `personaggioId`), nell'export markdown una direttiva (es. `:::dialogo`). **(\*)** Va definita presto, perché è il caso che mette più sotto stress la conversione JSON ↔ markdown                                    | 6    | P2     |
| RF-18 | Pacing opzionale dei dialoghi (durata di parole/frasi) e anteprima con text-to-speech                                                                                                                                                                                                                                                                  | 6    | P2     |
| RF-19 | **Summary opzionale dei documenti**: ogni documento può avere un riassunto breve scritto dall'utente. Se un pannello viene ristretto oltre una soglia minima di leggibilità, mostra il summary al posto del testo completo. Il campo fa parte del modello dati dei documenti (già dalla Fase 1); la visualizzazione nei pannelli arriva con i pannelli | 2    | P1     |

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
| RNF-07 | **Manutenibilità**                                                 | TypeScript ovunque, logica di dominio testata senza database né React (`core`: funzioni pure e servizi che usano i repository tramite interfaccia), moduli indipendenti per funzionalità (`features`), CI su ogni push.                                                                                                                                                                                                                                                                                          |
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
Ordine di lavoro **obbligato**, perché ogni passo poggia sul precedente:

1. **Modello dati** (prima di tutto): le classi, i tipi e le relazioni tra loro (storia, documento con `kind` e summary opzionale, entità, tipo di entità, campo, relazione, calendario, ecc.), in TypeScript puro, **indipendente dal database**. Vive in `core`/`shared`.
2. **Schemi Zod**, derivati dal modello dati (validazione di dati, import di backup, API).
3. **Database**: solo dopo, schemi RxDB e `createDatabase()` costruiti sopra modello e schemi Zod.

Poi: monorepo e CI (in parallelo, non bloccano il modello), astrazione `platform`, infrastruttura i18n e registro delle azioni/scorciatoie, shell dell'app su Windows e Android con DB persistente, formato di backup v1 definito, pacchetto `core` per la logica di dominio (funzioni pure, servizi e interfacce dei repository).
_(Nota: il prototipo (spike) dell'editor con TipTap + Tippy.js è stato completato con successo. Per lo storage si parte con RxDB + Dexie/IndexedDB, senza test dedicato su Android.)_

**Fase 1 — MVP: "non perdere più gli appunti"** (RF-01, 07, 10–13, 15, 20–23, 60)
Storie, albero dei documenti, editor con rendering immediato e sintassi markdown (documenti salvati come JSON) con menzioni `@` via Tippy.js, link e backlink e ricerca (con indici derivati), tipi di entità/campi/entità/relazioni, scorciatoie e command palette, backup e ripristino manuale.

**Fase 2 — Workspace e pannelli** (RF-02–06, 14, 24, 25, 61)
Tab con pannelli divisibili (albero di layout proprio, vedi sezione 8), layout adattivo mobile, pannelli collegati, mini-preview dei link, raccolte/inventari, immagini e galleria, backup automatici.

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

| Ambito               | Tecnologia                                                                                      | Ruolo                                                                                                                                                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linguaggio           | **TypeScript**                                                                                  | Linguaggio unico per app, backend e tooling                                                                                                                                                                                                                                                  |
| UI                   | **React**                                                                                       | UI condivisa tra le piattaforme                                                                                                                                                                                                                                                              |
| Stile                | **Tailwind CSS**                                                                                | Stile, responsive e touch-friendly (i temi utente usano variabili CSS)                                                                                                                                                                                                                       |
| Build                | **Vite**                                                                                        | Dev server e bundler                                                                                                                                                                                                                                                                         |
| Navigazione          | **React Router** (HashRouter per Electron)                                                      | Routing                                                                                                                                                                                                                                                                                      |
| Stato UI             | **Zustand**                                                                                     | Stato globale della UI (non dei dati)                                                                                                                                                                                                                                                        |
| Dati                 | **RxDB** con storage **Dexie/IndexedDB** _(scelte confermate, vedi 9.1)_                        | Database NoSQL locale, reattivo, offline-first; replica per la sync                                                                                                                                                                                                                          |
| File                 | File system tramite `platform`                                                                  | Immagini e mappe, indirizzate per hash del contenuto (fuori dal DB)                                                                                                                                                                                                                          |
| Validazione          | **Zod**                                                                                         | Validazione dati, import di backup, risposte API                                                                                                                                                                                                                                             |
| Markdown             | **react-markdown** + **remark-directive** (+ remark-gfm, remark-frontmatter)                    | Rendering di sola lettura e **conversione per export/import** markdown con sintassi custom (es. direttive per i dialoghi); non è la modalità di scrittura                                                                                                                                    |
| Editor               | **TipTap** (basato su ProseMirror) _(scelta confermata, vedi 9.1)_                              | Editor con rendering immediato: input rules (`# `, `**x**`, `- `…), estensione Mention per i chip `@`, nodi custom per i dialoghi. Open source (licenza MIT)                                                                                                                                 |
| Posizionamento popup | **Tippy.js** (`tippy.js`) _(scelta attuale, funzionante nello spike)_                           | Posizionamento dinamico del menu dei suggerimenti dell'estensione Mention di TipTap, ancorato al cursore su desktop e mobile. Non è un vincolo: **Floating UI** (successore di Popper, su cui Tippy è basato) è l'alternativa se Tippy desse problemi o la versione di TipTap lo richiedesse |
| Conversione markdown | Estensione markdown di TipTap (`@tiptap/markdown` o `tiptap-markdown`)                          | Conversione JSON ↔ markdown per export/import                                                                                                                                                                                                                                                |
| Grafi                | **React Flow** (@xyflow/react) + libreria di layout (ELK o dagre)                               | Grafo delle relazioni                                                                                                                                                                                                                                                                        |
| Pannelli             | **Albero di layout proprio** (in `core`) + **react-resizable-panels** **(\*)** per il rendering | Pannelli divisibili: l'albero è un dato serializzabile e il rendering è ricorsivo. Sostituisce dockview (vedi 9.1)                                                                                                                                                                           |
| Mappe                | **Leaflet** con `CRS.Simple` _(scelta confermata)_ + plugin per disegno e frecce                | Immagini con segnaposto, tratti e percorsi                                                                                                                                                                                                                                                   |
| i18n                 | **i18next** + **react-i18next**                                                                 | Interfaccia multilingua                                                                                                                                                                                                                                                                      |
| Scorciatoie          | Registro di azioni + libreria per i tasti (es. tinykeys)                                        | Scorciatoie e command palette                                                                                                                                                                                                                                                                |
| Android              | **Capacitor**                                                                                   | Impacchetta l'app per Android                                                                                                                                                                                                                                                                |
| Windows              | **Electron** (+ electron-builder)                                                               | Impacchetta l'app per Windows                                                                                                                                                                                                                                                                |
| Backend              | **Express** (+ Zod)                                                                             | API per le funzioni online (sync)                                                                                                                                                                                                                                                            |
| Test                 | **Vitest**, **Playwright**                                                                      | Unit test, test end-to-end                                                                                                                                                                                                                                                                   |
| CI/CD                | **GitHub Actions**                                                                              | Lint, test, build APK/AAB e installer Windows, release su tag                                                                                                                                                                                                                                |
| Monorepo             | **pnpm** + **Turborepo**                                                                        | Workspace e cache di build                                                                                                                                                                                                                                                                   |
| Agente IA            | Interfaccia a provider generica (endpoint compatibile con le API OpenAI)                        | Modello locale (es. Ollama) o servizio gratuito scelto dall'utente                                                                                                                                                                                                                           |
| Sync testo (futuro)  | **Yjs** (open source, integrabile con l'editor)                                                 | CRDT per il co-editing in tempo reale                                                                                                                                                                                                                                                        |
| TTS                  | Web Speech API / plugin Capacitor                                                               | Anteprima vocale dei dialoghi                                                                                                                                                                                                                                                                |

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
│  │     ├─ db/         → schemi RxDB, createDatabase(), migrazioni,
│  │     │                implementazioni dei repository
│  │     ├─ platform/   → astrazione delle API native
│  │     ├─ stores/     → Zustand
│  │     ├─ routes/     → pagine
│  │     ├─ locales/    → traduzioni per lingua
│  │     └─ features/   → un modulo per funzionalità:
│  │                       editor, entities, relations, timeline, graph,
│  │                       maps, workspace, export, themes, dialogue, coherence
│  ├─ core/         → logica di dominio, senza React né DB: funzioni pure, servizi
│  │                   e interfacce dei repository (calendari, criteri di ordinamento,
│  │                   parser dei link, costruzione del grafo, regole di coerenza,
│  │                   formato di backup, conversione JSON ↔ markdown, estrazione
│  │                   di testo e menzioni, layout dei pannelli)
│  ├─ shared/       → tipi e schemi Zod condivisi tra app e api
│  └─ config/       → tsconfig, eslint, prettier
├─ .github/workflows/  → ci, release-android, release-windows
├─ turbo.json
└─ pnpm-workspace.yaml
```

### Organizzazione del codice in `core`

Ogni dominio di `core` è una cartella `core/src/[nome]/` con questi file, ma solo quelli che servono:

- **`types.ts`**: i tipi del dominio e i relativi schemi Zod.
- **`[Nome]Service.ts`**: l'interfaccia del servizio, la sua implementazione e una funzione _factory_ che riceve le dipendenze (per esempio `createLayoutService({ repository })`) e restituisce l'interfaccia. L'implementazione, che può essere una classe, non viene esportata.
- **`[Nome]Repository.ts`**: **solo l'interfaccia** del repository (che cosa si salva e come si legge). L'implementazione sta in `app/src/db`, così `core` non dipende dalla libreria del database.

Regole:

- I domini fatti di sole funzioni pure (calendari, parser dei link, criteri di ordinamento, conversione JSON ↔ markdown…) hanno solo `types.ts` e le funzioni. Il servizio esiste dove c'è orchestrazione o ciclo di vita; il repository dove ci sono dati salvati (workspace, documenti, entità, storie).
- I servizi usano i repository solo tramite interfaccia; nei test si sostituiscono con una versione in memoria.
- Il ciclo di vita dei servizi permette di aggiungere funzioni trasversali, come annulla/ripeti, avvolgendo il servizio in un altro che implementa la stessa interfaccia (_decorator_), senza modificarlo.
- **(\*)** Proposte da confermare: i test stanno accanto al codice (`Foo.ts` e `Foo.test.ts` nella stessa cartella); le funzioni di logica di un dominio possono stare in un file a parte (per esempio `tree.ts` per il layout) quando il servizio crescerebbe troppo; servizi e repository vengono creati e collegati in un solo punto di `app`, da cui store e componenti li ricevono; le implementazioni dei repository convalidano con gli schemi Zod di `core` quando leggono (anche dai backup importati); gli id di pannelli, gruppi e workspace hanno un prefisso tipizzato (`panel-…`, `group-…`, `workspace-…`), controllato da TypeScript e validato da Zod, per non scambiarli tra loro.

### Layout dei pannelli

Il layout di un workspace è un **albero** salvato nel workspace (locale al dispositivo):

- **Nodo pannello**: un id, un peso relativo (`size`) e la **vista** che mostra, descritta come dato: tipo di vista più parametri (per esempio `{ type: 'document', documentId }`). Non contiene componenti React.
- **Nodo gruppo**: un id, un asse (orizzontale o verticale), un peso relativo e almeno due figli (pannelli o altri gruppi). Così si divide in ogni direzione quante volte si vuole.
- Un registro in `app` associa ogni tipo di vista al componente che la mostra. Per questo l'albero resta serializzabile: workspace nel DB e nel backup, stesso modello su mobile.
- Le operazioni (dividere, chiudere, ridimensionare, spostare, collegare) sono funzioni pure in `core` che restituiscono un nuovo albero e lo **normalizzano**: un gruppo con un solo figlio sparisce, un gruppo dentro uno con lo stesso asse si appiattisce, i gruppi vuoti spariscono.
- Lo stato che cambia in continuazione (la selezione dei pannelli collegati, un pannello troppo stretto per il testo) non sta nell'albero ma negli store e nei componenti.
- Su mobile si mostrano le foglie dell'albero in ordine, una alla volta (RF-05); il workspace ricorda il pannello attivo.
- **(\*)** Durante il ridimensionamento si lavora sull'albero in memoria e si salva a fine trascinamento (o con debounce), senza passare dal repository a ogni movimento.

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

| Questione                 | Decisione                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nome App                  | **Theogony.**                                                                                                                                                                                                                                                                                                                                |
| Ordine di lavoro dei dati | **Prima il modello dati** (classi, tipi), **poi gli schemi Zod**, **solo dopo il database.** Il modello dati non dipende da RxDB.                                                                                                                                                                                                            |
| Summary dei documenti     | **Opzionale**, scritto dall'utente; mostrato quando un pannello è troppo stretto per il testo (RF-19).                                                                                                                                                                                                                                       |
| Menu contestuale          | **Tasto destro** sulle entità linkabili: azioni minime comuni + azioni più ampie per i tipi particolari (timeline, mappe, immagini), dal registro di azioni (RF-08).                                                                                                                                                                         |
| Database                  | **Non relazionale: RxDB.** I dati sono molto interconnessi, ma l'app è offline-first con sincronizzazione, schemi definiti dall'utente (campi arbitrari) e viste reattive.                                                                                                                                                                   |
| Editor                    | **TipTap (ProseMirror)**. Scelta confermata dopo lo spike: gestisce il rendering immediato markdown, l'input fluido e l'estensione Mention con chip `@` interattivi (`data-mention-id`).                                                                                                                                                     |
| Popup Suggerimenti        | **Tippy.js** per il posizionamento del menu dei suggerimenti `@` vicino al cursore (desktop e mobile); alternativa: Floating UI.                                                                                                                                                                                                             |
| Layout dei pannelli       | **Albero di layout proprio**: nodi pannello e gruppo con asse e pesi, vista descritta come dato (tipo + parametri), componenti risolti da un registro in `app`. Sostituisce **dockview** (scelto in precedenza): l'albero resta serializzabile e vale anche su mobile; il riposizionamento con trascinamento va realizzato in proprio (D20). |
| Struttura di `core`       | Una cartella per dominio con `types.ts`, `[Nome]Service.ts` (interfaccia + factory che riceve le dipendenze, implementazione nascosta) e `[Nome]Repository.ts` (solo interfaccia). Le implementazioni dei repository stanno fuori da `core` (`app/src/db`): `core` non dipende dal database. Dettagli nella sezione 8.                       |
| Servizi e ciclo di vita   | Il servizio può essere una **classe** nascosta dalla factory (es. il servizio dei layout); le funzioni trasversali, come annulla/ripeti, si aggiungono con un wrapper che implementa la stessa interfaccia.                                                                                                                                  |
| Mappe                     | **Leaflet** (`CRS.Simple`).                                                                                                                                                                                                                                                                                                                  |
| Monorepo                  | Struttura con `features/` e `core/` come da sezione 8.                                                                                                                                                                                                                                                                                       |
| Formato dei documenti     | **JSON** (albero di nodi dell'editor), salvato in locale.                                                                                                                                                                                                                                                                                    |
| Sintassi di scrittura     | **Markdown**: rendering immediato durante la digitazione.                                                                                                                                                                                                                                                                                    |
| Export                    | **Markdown `.md`** generato dall'albero JSON.                                                                                                                                                                                                                                                                                                |
| Storage del database      | **Dexie/IndexedDB** tramite RxDB, su Windows e Android, senza test dedicato su Android. Archiviazione persistente richiesta al sistema e backup automatici come rete di sicurezza.                                                                                                                                                           |
| Un DB o uno per storia    | **Un solo DB**, con `storyId` su ogni documento.                                                                                                                                                                                                                                                                                             |
| Dove stanno i documenti   | **Nel database** (JSON), non nel filesystem: servono interrogazioni reattive, sincronizzazione e gestione dei conflitti. I file `.json`/`.md` esistono solo in export e backup.                                                                                                                                                              |
| Immagini e mappe          | **Fuori dal database**, come file indirizzati per hash del contenuto, tramite `platform`.                                                                                                                                                                                                                                                    |
| Indici derivati           | **Sì**: indice dei link e testo cercabile, aggiornati a ogni salvataggio e ricostruibili (RNF-14).                                                                                                                                                                                                                                           |
| Workspace                 | **Locali al dispositivo**, non sincronizzati; inclusi nel backup come opzione.                                                                                                                                                                                                                                                               |
| Backend di sync           | **Express** con replica RxDB (Fase 7).                                                                                                                                                                                                                                                                                                       |
| Calendario                | **Un solo calendario per storia**; più punti di riferimento con le **ere** (date che fungono da nuovo "anno 0").                                                                                                                                                                                                                             |
| Backup                    | **JSON** come formato di lavoro + copia `.md` generata di sicurezza.                                                                                                                                                                                                                                                                         |
| Identificatori            | **Ogni oggetto ha un `id`**. Nei documenti hanno un id menzioni, nodi dialogo e titoli (gli altri blocchi solo se referenziati). Le menzioni sono nodi con `id`: non si rompono con la rinomina.                                                                                                                                             |
| Struttura dei dati        | **Albero logico, nessuna cartella su disco.** Cartelle e documenti stanno nella stessa collection (`kind`, `parentId`, `order`); le entità, con il loro tipo, in collection separate (i «Personaggi» sono una vista per tipo, non una cartella). Sul filesystem solo i blob, in sottocartelle dall'hash. Dettaglio nella specifica tecnica.  |

### 9.2 Decisioni aperte o rimandate

| #   | Questione                                     | Stato / raccomandazione                                                                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D7  | **Android: versione minima**                  | Rimandata.                                                                                                                                                                                                                                                                                                                                                                           |
| D12 | **Provider dell'agente IA**                   | Rimandata (interfaccia generica, endpoint compatibile OpenAI).                                                                                                                                                                                                                                                                                                                       |
| D15 | **Ere: ancora fissa o legata a un evento**    | Iniziare con la **data fissa**; l'ancora legata a un evento (con controllo dei cicli) si valuta dopo. Gli anni di un'era iniziano con l'anno del calendario in cui cade l'ancora; l'opzione "anno che inizia all'anniversario dell'ancora" è rimandata.                                                                                                                              |
| D16 | **Libreria di ricerca in memoria**            | Da scegliere in Fase 1 (es. MiniSearch o FlexSearch), alimentata dall'indice derivato del testo.                                                                                                                                                                                                                                                                                     |
| D17 | **Id dei titoli nell'editor**                 | Verificare disponibilità e licenza dell'estensione UniqueID di TipTap; altrimenti una piccola estensione propria.                                                                                                                                                                                                                                                                    |
| D18 | **Azioni minime del menu contestuale**        | Da definire: la lista comune a tutte le entità linkabili (proposta in RF-08, marcata con (\*)) e le azioni dei tipi particolari.                                                                                                                                                                                                                                                     |
| D19 | **Direzione del collegamento tra pannelli**   | **(\*)** Proposta: il pannello che segue punta a quello che lo comanda (`followsPanelId`, più `locked` per il blocco): un solo comandante per pannello per costruzione, e le azioni (scollega, blocca) partono dal seguace. Alternativa: la lista dei pannelli comandati sul pannello di partenza. Da decidere anche se ammettere le catene; per la prima versione, un solo livello. |
| D20 | **Rendering dei pannelli e riposizionamento** | **(\*)** Proposta: `react-resizable-panels` per il rendering ricorsivo dell'albero. Il riposizionamento con trascinamento (zone di rilascio sui bordi) è la parte più costosa: nella prima versione «chiudi e dividi di nuovo», il trascinamento dopo.                                                                                                                               |
| D21 | **Annulla/ripeti: ambito**                    | Da decidere: solo per il layout o per tutte le azioni (eliminare documenti, entità…). Nel primo caso basta un wrapper del servizio; nel secondo serve un meccanismo trasversale.                                                                                                                                                                                                     |

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
| 0.7      | 2026-11-07 | **Summary opzionale dei documenti** (glossario, RF-19): mostrato quando un pannello è ristretto troppo. **Entità linkabili e menu contestuale** (glossario, RF-08): azioni minime comuni con il tasto destro, set più ampio/diverso per tipi particolari come linea temporale, mappe e immagini; lista delle azioni minime aperta (D18). **Priorità della Fase 0:** prima il modello dati (classi e tipi), poi gli schemi Zod, solo dopo il database.                                                                                                                                                                     |
| 0.8      | 2026-11-14 | **Layout dei pannelli:** albero proprio al posto di dockview (§7, §9.1, §8 «Layout dei pannelli»), vista descritta come dato con registro dei componenti in `app`; RF-03 e RF-06 precisati; glossario («Layout»). **Organizzazione di `core`:** una cartella per dominio con `types.ts`, `[Nome]Service.ts` (factory con dipendenze) e `[Nome]Repository.ts` (solo interfaccia), repository implementati in `app/src/db` (§8, §9.1); RNF-07 e roadmap aggiornati. Aggiunte D19–D21. La specifica tecnica deve ricevere i tipi del layout.                                                                                 |
