# Theogony — Specifica tecnica

> **Versione:** 0.4 (bozza) · **Data:** 25 ottobre 2026
> Documento collegato a [`documento-progetto.md`](documento-progetto.md) (visione, glossario, requisiti, priorità, decisioni). Gli ID `RF-xx`, `RNF-xx` e `Dx` rimandano a quel documento.
> Il codice è in inglese; i termini del glossario in italiano hanno questa corrispondenza: entità → `Entity`, tipo di entità → `EntityType`, raccolta → `ItemSet`, segnaposto → `Marker`, tratto → `MapRoute`, percorso → `MapPath`, era → `Era`, menzione → nodo `mention`.
> Gli snippet TypeScript sono **bozze** per fissare il modello, non codice definitivo.

---

## Indice

1. Principi, database e storage
2. Collection RxDB
3. Tipi principali
4. Calendario, ere, tempo e criteri di ordinamento
5. Documenti, editor, indici e conversione markdown
6. Dialoghi e pacing
7. Grafo
8. Linea temporale
9. Mappe
10. Workspace, pannelli e pannelli collegati
11. Export, import e backup
12. Temi
13. Sincronizzazione della storia
14. Moduli e plugin
15. Astrazione della piattaforma
16. Internazionalizzazione e scorciatoie da tastiera
17. Controllo di coerenza (regole e agente IA)
18. Sicurezza
19. Test e CI

---

## 1. Principi, database e storage

### 1.1 Principi del modello dati

1. **ID stabili e opachi** (ULID o UUIDv7) per **ogni oggetto del database**. Tutti i riferimenti usano l'ID, mai il nome: rinominare non rompe nulla. Dentro i documenti hanno un id i nodi che vengono referenziati: menzioni (che puntano a un elemento), nodi dialogo e titoli; gli altri blocchi ricevono un id solo quando qualcosa li referenzia (§5.4).
2. **`storyId` su ogni documento** (un solo DB, D3): la storia è il confine di backup, export, sync e (in futuro) permessi.
3. **Granularità fine**: un documento RxDB per oggetto (entità, relazione, documento di testo, segnaposto…), niente liste che crescono dentro un unico documento. Rende sincronizzazione e conflitti gestibili.
4. **Cancellazioni logiche** (`_deleted` di RxDB) e `updatedAt` su tutto, per la replica.
5. **Dati derivati = indici ricostruibili.** L'indice dei link e il testo cercabile (§5.3) sono salvati per velocità ma si possono sempre ricostruire dal contenuto dei documenti; nessuna informazione vive solo negli indici (RNF-14). Il resto (grafo, timeline) si calcola in memoria e si memoizza.
6. **Versione di schema** su ogni collection RxDB **e** sullo schema dei nodi dell'editor (§5.1), con migrazioni.

### 1.2 Perché un database non relazionale (RxDB)

I dati della storia sono molto interconnessi, e un database relazionale sarebbe naturale per le query (join, query ricorsive per il grafo). La scelta ricade comunque su RxDB per questi motivi:

- **Offline-first con replica**: RxDB include reattività e protocollo di replica; con un database relazionale locale (es. SQLite) bisognerebbe aggiungere un sistema di sincronizzazione a parte.
- **Campi arbitrari**: tipi di entità e campi li definisce l'utente; i documenti JSON li rappresentano senza tabelle dinamiche.
- **Dimensioni contenute**: anche storie grandi (migliaia di entità) stanno in memoria; grafo e timeline si calcolano in `core` senza join nel database.
- **Relazioni di prima classe**: ogni relazione è un documento con `fromId` e `toId` indicizzati; i link dai documenti hanno `targetId` indicizzato (§5.3). Le query tipiche (backlink, relazioni di un'entità) sono quindi veloci.

**Compromessi e mitigazioni:**

| Limite                                                            | Mitigazione                                                                                                                                                                |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nessun join né integrità referenziale                             | Un livello di _repository_ in `app/db` implementa le operazioni composte (es. eliminare un'entità elimina anche relazioni, link, voci di raccolta e segnaposto collegati). |
| Nessuna transazione tra più collection                            | Le operazioni composte sono idempotenti; esiste una funzione di **verifica integrità** (riferimenti orfani, indici da ricostruire) eseguita dopo import e su richiesta.    |
| Query limitate (Mango)                                            | Le viste complesse (grafo, timeline, coerenza) si calcolano in memoria con funzioni pure di `core`; backlink e ricerca usano gli indici derivati.                          |
| Alcune funzionalità RxDB sono a pagamento (es. lo storage SQLite) | Si usano solo funzioni gratuite (storage Dexie/IndexedDB), vedi §1.3.                                                                                                      |

### 1.3 Storage: Dexie/IndexedDB (D2, deciso)

- RxDB con **storage Dexie (IndexedDB)** su Windows (renderer di Electron) e su Android (WebView): entrambi supportano IndexedDB e lo storage è gratuito.
- **Nessun test dedicato su Android** è pianificato. Per ridurre il rischio di perdita dei dati (il sistema può liberare lo spazio dei siti/app in condizioni estreme) si richiede al sistema l'**archiviazione persistente** (`navigator.storage.persist()`) e ci si affida ai **backup automatici** (RF-61) e alla verifica integrità.
- Se in futuro emergessero problemi di prestazioni o di persistenza, il ripiego è cambiare storage (es. SQLite, plugin premium) migrando i dati tramite backup: il formato di backup (§11) è indipendente dallo storage.
- Il campo `content` dei documenti è un oggetto JSON non indicizzato; si indicizzano solo i metadati.

### 1.4 Dove vive cosa

| Cosa                                                                   | Dove                                                                                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Documenti (JSON), entità, relazioni, calendario, metadati delle mappe… | RxDB (un solo DB, `storyId` su ogni documento)                                                         |
| Albero della storia (cartelle, capitoli, scene)                        | RxDB, collection `documents` con `parentId` e `order`: struttura **logica**, nessuna cartella su disco |
| Immagini, mappe, concept art                                           | **File** nel filesystem tramite `platform`, indirizzati per hash del contenuto (D10)                   |
| Indici derivati (link, testo cercabile)                                | RxDB (`links`, `docText`) e indice di ricerca in memoria                                               |
| Workspace, impostazioni, segnalazioni di coerenza                      | RxDB, **solo locali** (non sincronizzati, D4)                                                          |
| File `.json`, `.md`, `.zip`                                            | Solo export e backup                                                                                   |

---

## 2. Collection RxDB (bozza)

| Collection          | Contenuto                                                              | Indici principali                    |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------ |
| `stories`           | Storie                                                                 | `updatedAt`                          |
| `entityTypes`       | Tipi di entità e definizioni dei campi                                 | `storyId`                            |
| `relationTypes`     | Tipi di relazione                                                      | `storyId`                            |
| `entities`          | Entità con i valori dei campi                                          | `storyId`, `[storyId, entityTypeId]` |
| `documents`         | Cartelle e documenti (albero): metadati + contenuto JSON dei documenti | `storyId`, `[storyId, parentId]`     |
| `relations`         | Relazioni tra entità (e voci di raccolta)                              | `storyId`, `fromId`, `toId`          |
| `links`             | **Derivata.** Link estratti dai documenti                              | `storyId`, `targetId`, `sourceDocId` |
| `docText`           | **Derivata.** Testo e titoli estratti dai documenti                    | `storyId`                            |
| `calendars`         | Calendario della storia (uno) ed ere                                   | `storyId`                            |
| `timelines`         | Linee temporali e rami                                                 | `storyId`                            |
| `orderingCriteria`  | Criteri di ordinamento                                                 | `storyId`                            |
| `timelineRanks`     | Posizioni manuali nella timeline                                       | `timelineId`                         |
| `maps`              | Mappe (metadati; l'immagine è un file)                                 | `storyId`, `parentMapId`             |
| `markers`           | Segnaposto                                                             | `mapId`, `entityId`                  |
| `routes`            | Tratti (strade, passaggi)                                              | `mapId`                              |
| `paths`             | Percorsi dei personaggi                                                | `mapId`, `entityId`                  |
| `workspaces`        | Workspace, layout, pannelli, gruppi di collegamento (locale)           | `storyId`                            |
| `coherenceFindings` | Segnalazioni di coerenza e loro stato (locale)                         | `storyId`                            |
| `themes`            | Temi personalizzati                                                    | —                                    |
| `settings`          | Impostazioni (lingua, scorciatoie, provider IA) (locale)               | —                                    |

Gli schemi RxDB sono JSON Schema (sottoinsieme di funzionalità). **Zod resta la fonte di verità** per la validazione applicativa; gli schemi RxDB si scrivono minimi (campi indicizzati e tipi di base) e ogni scrittura passa da Zod.

---

## 3. Tipi principali (bozza in TypeScript)

```ts
type Id = string; // ULID / UUIDv7

interface Story {
  id: Id;
  name: string;
  description?: string;
  calendarId: Id; // un solo calendario per storia (D11)
  contentLanguage?: string; // lingua dei contenuti, indipendente da quella dell'interfaccia
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
}

interface FieldDef {
  key: string;
  label: string; // testo scelto dall'utente (non tradotto)
  type:
    | "text"
    | "longtext"
    | "number"
    | "boolean"
    | "select"
    | "multiselect"
    | "date"
    | "entityRef"
    | "image";
  options?: string[]; // per select/multiselect
  min?: number;
  max?: number; // per number
  refEntityTypeIds?: Id[]; // per entityRef
  semantic?: "birth" | "death" | "start" | "end"; // (*) facoltativo, usato dai controlli di coerenza (§17)
  default?: unknown;
}

interface ItemSetDef {
  // "raccolta", es. "Inventario"
  key: string;
  label: string;
  allowedEntityTypeIds?: Id[];
  itemFields?: FieldDef[]; // es. quantità
}

interface EntityType {
  id: Id;
  storyId: Id;
  name: string;
  icon?: string;
  color?: string;
  fields: FieldDef[];
  itemSets: ItemSetDef[];
  presetId?: Id; // se creato da un preset (§3.1)
}

interface Entity {
  id: Id;
  storyId: Id;
  entityTypeId: Id;
  name: string;
  aliases: string[]; // per menzioni e ricerca
  summary?: string;
  fields: Record<string, unknown>; // valori dei campi
  extraFields?: FieldDef[]; // campi arbitrari solo per questa entità
  tags: string[];
  time: TimeBinding[]; // date multiple (§4)
  bodyDocId?: Id; // documento md descrittivo
  createdAt: number;
  updatedAt: number;
}

interface RelationType {
  id: Id;
  storyId: Id;
  label: string; // "sorella di"
  inverseLabel?: string; // "fratello/sorella di"
  directed: boolean;
  color?: string;
}

interface Relation {
  id: Id;
  storyId: Id;
  typeId: Id;
  fromId: Id;
  toId: Id; // qualsiasi entità
  itemSetKey?: string; // se la relazione è una voce di raccolta
  attrs?: Record<string, unknown>; // es. quantità
  time?: TimeBinding[]; // relazione valida in un periodo
  note?: string;
  createdAt: number;
  updatedAt: number;
}

interface Doc {
  // "Document" è un tipo del DOM, quindi Doc
  id: Id;
  storyId: Id;
  kind: "folder" | "doc"; // cartella o documento di testo
  parentId: Id | null; // albero (null = radice della storia)
  order: string; // ordinamento tra fratelli (fractional index)
  title: string;
  content?: JSONContent; // albero ProseMirror/TipTap (fonte di verità), vedi §5; assente per le cartelle
  contentVersion?: number; // versione dello schema dei nodi (§5.1); assente per le cartelle
  entityId?: Id; // se è la scheda descrittiva di un'entità
  createdAt: number;
  updatedAt: number;
}
```

- **Raccolte (inventari).** Una voce di raccolta è una `Relation` con `itemSetKey` e `attrs`: compare anche nel grafo e nei backlink, senza una struttura dati separata.
- **Scheda entità = campi + documento.** Il corpo descrittivo di un'entità è un `Doc` collegato (`bodyDocId` ↔ `entityId`): link, backlink, ricerca ed export funzionano allo stesso modo per entità e documenti.
- **Eliminazioni.** Vedi §1.2: le operazioni composte passano dal livello di repository.
- **Albero logico, nessuna cartella su disco.** Cartelle e documenti sono la stessa collection, distinti da `kind`. «Capitoli» non è una cartella speciale: è una cartella creata dall'utente (o da un preset). Spostare un elemento significa cambiare `parentId` e `order`; nessun file si sposta. Le cartelle non hanno `content` e gli indici derivati (§5.3) le ignorano.
- **Schede delle entità fuori dall'albero.** I `Doc` con `entityId` sono i corpi descrittivi delle entità: non compaiono nell'albero dei documenti (la vista filtra per `entityId` assente) e si raggiungono dalla scheda.
- **Tipi di entità = attributo, non cartelle.** «Personaggi», «Luoghi», «Eventi» sono viste filtrate per `entityTypeId` (indice `[storyId, entityTypeId]`): cambiare tipo a un'entità o filtrare grafo e timeline per tipo non sposta nulla.
- **(\*) Regole dell'albero.** Una cartella non può essere spostata dentro un proprio discendente (controllo dei cicli, nel repository). Eliminare una cartella chiede conferma ed elimina a cascata i documenti contenuti, con le righe derivate di `links` e `docText`.

### 3.1 Preset per sistemi di gioco (RF-26)

Un preset è un file dati (JSON) che, applicato a una storia, crea tipi di entità, campi, tipi di relazione e raccolte:

```ts
interface Preset {
  id: string; // es. "dnd5e"
  version: number;
  nameKey: string; // chiave i18n (§16)
  entityTypes: EntityTypeTemplate[]; // es. Personaggio con Forza, Destrezza, Costituzione…
  relationTypes?: RelationTypeTemplate[];
}
```

- Contengono **solo struttura** (nomi dei campi, tipi, intervalli); nessun testo di regolamento.
- Le etichette sono chiavi i18n risolte alla creazione: dopo l'applicazione appartengono alla storia e l'utente può modificarle.
- Applicare un preset a una storia già popolata aggiunge tipi nuovi senza toccare quelli esistenti.

---

## 4. Calendario, ere, tempo e criteri di ordinamento

Le date sono il punto più delicato del progetto: vanno progettate bene fin dall'inizio.

### 4.1 Calendario ed ere (D11)

**Un solo calendario per storia.** Tutte le date vivono su un unico **asse assoluto**. I "punti di riferimento multipli" si ottengono con le **ere**: date dell'asse che fungono da nuovo "anno 0". Così si mantiene un solo calendario, ma sembra di averne più d'uno.

```ts
interface Calendar {
  id: Id;
  storyId: Id;
  name: string;
  kind: "gregorian" | "custom";
  months: { name: string; days: number; leapDays?: number }[];
  weekdays: string[];
  hoursPerDay: number; // default 24
  minutesPerHour: number; // default 60
  leap?: { everyYears: number; monthIndex: number };
  baseEraName?: string; // nome dell'asse assoluto (es. "Era Comune")
  eras: Era[]; // punti di riferimento
  defaultEraId?: Id; // era usata per inserire/mostrare le date (se assente, l'asse assoluto)
}

interface Era {
  id: Id;
  name: string; // es. "Era Nuova"
  abbreviation?: string;
  anchor: TimePoint; // data dell'asse assoluto che vale "anno 0" dell'era (D15: fissa)
  beforeLabel?: string; // etichetta per le date precedenti all'ancora (es. "prima della Caduta"); se assente, anni negativi
}

// Un punto nel tempo sull'asse assoluto. Ogni componente dopo "year" è opzionale (precisione).
interface TimePoint {
  year: number; // anno assoluto (può essere negativo)
  month?: number; // 1-based
  day?: number;
  hour?: number;
  minute?: number;
}

type TimeSpec =
  | { kind: "point"; at: TimePoint; label?: string }
  | { kind: "range"; from: TimePoint; to?: TimePoint; label?: string }; // `to` assente = aperto

interface TimeBinding {
  timelineId: Id; // ramo; di default il ramo principale
  spec: TimeSpec;
  label?: string; // es. "nascita", "incoronazione": usata dai criteri di ordinamento
}
```

- **Le date si salvano una sola volta**, come `TimePoint` assoluto. Le ere servono solo a **inserire** e **mostrare** le date: `eraYear = year − anchor.year` (anno 0 = anno in cui cade l'ancora). Le date precedenti all'ancora hanno anni negativi, mostrati come "N + `beforeLabel`" se definito.
- **Funzioni in `core`:** `toOrdinal(point, calendar)` e `fromOrdinal(n, calendar)` (giorni, con parte frazionaria, dall'inizio dell'asse); `toEraYear(point, era)`, `fromEraYear(eraYear, era)`; `formatDate(point, calendar, eraId?)` e `parseDate(input, calendar, eraId?)`. Timeline e ordinamenti lavorano **sempre su ordinali**, mai su `Date` di JavaScript.
- **Inserimento:** l'utente sceglie l'era (di default `defaultEraId`) e scrive l'anno in quell'era; l'app converte nell'anno assoluto. Si possono mostrare le stesse date in un'altra era senza modificare i dati.
- **Cambiare l'ancora di un'era non sposta le date salvate**: cambia solo come sono etichettate. Se l'ancora deve seguire un evento che si sposta, serve l'ancora legata a un evento, rimandata (D15).
- **Anni di un'era:** iniziano con l'anno del calendario in cui cade l'ancora (offset sul numero dell'anno). L'opzione "l'anno dell'era inizia all'anniversario dell'ancora" è rimandata.
- **Precisione.** Una data con solo l'anno ordina all'inizio dell'anno ma si visualizza (e si estende nella timeline) come "anno intero".
- **Date multiple.** `Entity.time` e `Relation.time` sono array di `TimeBinding`: un'entità può avere più date o intervalli, anche su rami diversi.
- **Limite noto:** non si modellano culture con mesi o settimane strutturati in modo diverso nella stessa storia.
- **Test obbligatori:** conversioni avanti/indietro, anni bisestili, ere con date negative, più ere sulla stessa data, calendari con mesi di lunghezza diversa.

### 4.2 Criterio di ordinamento (RF-35)

Quando un'entità ha più date, o alcune entità non hanno date, "l'ordine" non è univoco: lo stabilisce un **criterio scelto dall'utente**, associato a ogni linea temporale. L'ordine è sempre sull'asse assoluto, indipendente dall'era mostrata.

```ts
interface OrderingCriterion {
  id: Id;
  storyId: Id;
  name: string;
  source:
    | {
        kind: "date";
        pick: "earliestStart" | "latestEnd" | "byLabel";
        label?: string; // per pick = 'byLabel' (es. "nascita")
        timelineId?: Id;
      } // limita a un ramo
    | { kind: "field"; fieldKey: string } // campo numerico (es. "numero di capitolo")
    | { kind: "manual" }; // solo ordine manuale
  direction: "asc" | "desc";
  tieBreak: "manual" | "name";
}

interface TimelineRank {
  // posizione manuale (fractional index)
  id: Id;
  storyId: Id;
  timelineId: Id;
  entityId: Id;
  rank: string;
}
```

- Ogni `Timeline` ha un `orderingCriterionId`; ne esiste uno predefinito ("per data di inizio, crescente").
- Il criterio produce una **chiave di ordinamento** per ogni entità (`number | null`) calcolata da `core.sortKey(entity, criterion, calendar)`.
- **Entità senza chiave** (nessuna data utile al criterio): finiscono in una corsia "non ordinati", da cui l'utente può trascinarle in una posizione, che si salva in `timelineRanks`. Le posizioni manuali servono anche da spareggio (`tieBreak: 'manual'`).
- Cambiare criterio non modifica i dati: cambia solo la vista.

### 4.3 Rami (RF-34)

Un `Timeline` ha `id`, `name`, `parentId?`, `forkAt?: TimePoint`, `color`, `orderingCriterionId`. Un'entità appartiene al ramo indicato nel `TimeBinding`; un ramo "eredita" visivamente gli eventi del genitore fino al punto di biforcazione.

---

## 5. Documenti, editor, indici e conversione markdown

### 5.1 Formato dei documenti

- **Fonte di verità:** albero **ProseMirror/TipTap in JSON** (`JSONContent`) nel campo `Doc.content`. Il markdown è la **sintassi di input** (mentre si scrive) e il formato di **export/import**, non il formato di lavoro.
- **`Doc.contentVersion`:** versione dello schema dei nodi (insieme di estensioni e attributi). `core/content` espone `migrateContent(json, from, to)`; nessun nodo o attributo viene rinominato senza una migrazione. Fixture di test per ogni versione (RNF-13).
- **Schema RxDB:** `content` è `type: 'object'`, non indicizzato; Zod valida la forma generale (`doc` con `content[]`) e i nodi ammessi.
- **Dimensione dei documenti:** si consiglia un documento per capitolo/scena (l'albero lo favorisce; le cartelle non contengono testo). Salvataggio automatico con _debounce_ (indicativamente 0,5–1 s) e al cambio/chiusura del documento.

### 5.2 Editor (TipTap, scelta confermata)

- **Estensioni:** StarterKit (titoli 1–6, liste, citazioni, codice, grassetto/corsivo), `Mention`, nodi custom (dialogo, §6), estensione per gli id dei titoli (D17), nodo `image`.
- **Sintassi markdown con rendering immediato (RF-11):** input rules di TipTap. Le trasformazioni scattano a sequenza completa (`## ` con lo spazio → titolo; `- `/`* ` → lista; `1. ` → lista numerata; `> ` → citazione; ` ``` ` → blocco di codice; `**x**`/`*x*` alla chiusura). Subito dopo la trasformazione, Backspace o Ctrl+Z tornano al testo digitato. Il cambio di livello di un titolo esistente avviene con un comando/scorciatoia.
- **Menzioni:** nodo inline atomico.

```ts
{ type: 'mention', attrs: { id: Id, kind: 'entity' | 'document', text?: string } }
```

- Il chip mostra il **nome corrente** dell'elemento, risolto dal DB (quindi segue le rinomine). `text` è un override facoltativo scelto dall'autore (es. "il Re" per l'entità "Aldric"). Se l'elemento non esiste più, il chip mostra "non trovato" ma resta nel testo.
- Renderizzato come `<span data-mention-id=… data-mention-kind=…>`; il click apre la scheda (nel pannello corrente o in un altro, secondo RF-06).
- **Suggerimenti `@`:** estensione `Mention` + utility `suggestion` di TipTap; il popup è posizionato con **Tippy.js** ancorato al `clientRect` del cursore (scelta attuale, funzionante nello spike). L'alternativa è Floating UI. Sorgente: entità e documenti della storia, filtrati per nome e alias, ordinati per recenza.
- **Link esterni:** mark `link` standard. I link verso documenti ed entità sono sempre menzioni.
- **Immagini nei documenti:** nodo `image` con `attrs: { assetHash, alt }`; il file si risolve tramite `platform.assets` (§15).
- **Viste di sola lettura** (mini-preview, nodi del grafo, export): rendering dell'albero con le stesse estensioni (`generateHTML` o editor non modificabile).

### 5.3 Indici derivati (link e testo cercabile)

```ts
interface LinkRef {
  id: Id;
  storyId: Id;
  sourceDocId: Id;
  targetId: Id; // entità o documento
  targetKind: "entity" | "document";
  anchor?: string; // id del titolo/blocco referenziato
  context: string; // testo del blocco circostante, per la mini-preview
  position: number; // ordine di comparsa nel documento
}

interface DocText {
  id: Id; // = id del documento
  storyId: Id;
  title: string;
  text: string; // testo semplice estratto
  headings: { id: string; text: string; level: number }[];
  updatedAt: number;
}
```

- **Aggiornamento:** nella stessa operazione di repository che salva il documento, `core.extractRefs(json)` e `core.extractText(json)` (funzioni pure, una sola visita dell'albero) producono le nuove righe; quelle del documento si sostituiscono (elimina per `sourceDocId`, inserisce le nuove). L'operazione è idempotente: se si interrompe, la verifica integrità la ripara.
- **Backlink e "dove è nominato X":** query per `targetId` su `links`. Il grafo dei riferimenti (RF-16, RF-42) usa la stessa collection.
- **Ricerca (RF-15):** indice in memoria costruito da `docText` e dai campi delle entità, caricato **all'apertura della storia leggendo gli indici già salvati** (senza rielaborare i documenti) e aggiornato in modo incrementale dagli observable di RxDB. Libreria leggera da scegliere in Fase 1 (D16, es. MiniSearch o FlexSearch).
- **Ricostruzione:** comando "Ricostruisci indici", eseguito automaticamente dopo import, migrazione del contenuto o variazione di `contentVersion`. **(\*)** La verifica integrità lo esegue anche quando manca la riga `DocText` di un documento o il suo `updatedAt` non coincide con quello del documento.

| Momento                   | Cosa succede                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dopo ogni salvataggio     | Si ricalcolano `links` e `docText` **solo del documento modificato**, nella stessa operazione di repository; l'indice in memoria si aggiorna per quel documento |
| All'apertura della storia | Si leggono `docText` e i campi delle entità dal DB e si costruisce l'indice di ricerca in memoria                                                               |
| Ricostruzione completa    | Solo comando esplicito, dopo import, migrazioni o incoerenze rilevate (vedi sopra)                                                                              |

- **Sync:** gli indici non si sincronizzano; ogni client li aggiorna dopo la replica (§13).

### 5.4 Id dei nodi nei documenti

| Nodo                              | Id                                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Menzione                          | `attrs.id` = id dell'elemento puntato                                                                          |
| Dialogo / battuta                 | `attrs.id` sul nodo scena; la battuta riferisce un personaggio con `who`                                       |
| Titolo                            | `attrs.id` stabile, assegnato alla creazione (D17); rigenerato in caso di duplicati (copia/incolla, divisione) |
| Altri blocchi (paragrafi, liste…) | Nessun id, finché qualcosa li referenzia: all'atto del riferimento (RF-16) si assegna `attrs.id`               |

Nell'export markdown gli id compaiono **solo se referenziati** (es. `## Titolo {#blk_x}` per i titoli, `^blk_x` a fine paragrafo per gli altri blocchi), per tenere pulito il file; un'eventuale re-importazione (Fase 9) li ripristina.

### 5.5 Conversione JSON ↔ markdown (`core`)

- **Strumento:** l'estensione markdown di TipTap (`@tiptap/markdown` o `tiptap-markdown`) oppure una pipeline propria su mdast (`remark` + `remark-directive`). Si sceglie in Fase 1 con un test di round-trip sui nodi custom.
- **Mappatura (documentata, versionata):**

| Nodo JSON                                               | Markdown                                  |
| ------------------------------------------------------- | ----------------------------------------- |
| titolo 1–6                                              | `#`…`######` (+ ` {#id}` se referenziato) |
| paragrafo, grassetto, corsivo, liste, citazione, codice | markdown standard                         |
| menzione                                                | `:ref[testo]{id="…" kind="entity"}`       |
| dialogo, battuta, durate                                | direttive (§6)                            |
| immagine                                                | `![alt](assets/<hash>.<ext>)`             |

- **Garanzie:** round-trip senza perdita per i nodi standard e custom; ciò che non è rappresentabile degrada in modo documentato. Il convertitore non è sul percorso di lavoro quotidiano, quindi può essere meno rifinito dell'editor, ma ha test dedicati.
- **Sicurezza:** niente HTML grezzo né in import né nei rendering degli export (§18).
- **Uso:** export documenti (RF-62), copie `.md` nel backup (RF-60), futura importazione di cartelle markdown (RF-64).

### 5.6 Co-editing futuro (Fase 8)

- **Fase 7:** sincronizzazione con _last-write-wins_ per documento (il contenuto è un unico JSON).
- **Fase 8:** il testo passa a un documento **Yjs** (`y-prosemirror` / estensione di collaborazione di TipTap; Yjs è open source). Persistenza come aggiornamento binario (campo dedicato in `documents` o collection `docUpdates`); migrazione dei documenti esistenti con `prosemirrorJSONToYDoc`.
- Il **JSON resta come snapshot derivato** (per indici, export e backup): RF-60 e RNF-03 restano validi e i backup JSON continuano a essere importabili.

---

## 6. Dialoghi e pacing

Modulo opzionale (candidato a plugin). **Va definito presto**: è il caso che mette più sotto stress la conversione JSON ↔ markdown (RF-17).

**Nodi dell'editor (bozza):**

```ts
dialogue: { group: 'block', content: 'say+', attrs: { id: Id; sceneId?: Id } }   // sceneId: luogo/evento
say:      { content: 'inline*', attrs: { who: Id; d?: number } }                  // who: id del personaggio; d: secondi
t:        mark   { attrs: { d: number } }                                         // durata di una parola/frase
pause:    inline atom { attrs: { d: number } }
```

**Export markdown (direttive):**

```markdown
:::dialogue{scene="ent_01N..."}
::say[Non ci arriverò mai.]{who="ent_01K..." d="3s"}
::say[Allora :t[andiamo]{d="1.5s"} più :t[piano]{d="2s"}.]{who="ent_01P..."}
:::
```

- `:::dialogue` — contenitore di una scena parlata; `::say[testo]{who=… d=…}` — battuta; `:t[…]{d=…}` — durata di una parola/frase; `:pause{d=…}` — pausa.
- **Da validare con un prototipo** (prima di congelare i nodi): annidamento di direttive testuali dentro l'etichetta di una direttiva "leaf" in `remark-directive`, e round-trip completo JSON → markdown → JSON.
- **Creazione nell'editor:** comando (es. `/dialogo`) che inserisce il nodo, con scelta del personaggio tramite `@`.

**Anteprima vocale.** Web Speech API (`speechSynthesis`) in Electron; su Android la disponibilità e la qualità delle voci nella WebView variano, quindi potrebbe servire un plugin Capacitor per il TTS (da verificare). Le durate si ottengono regolando la velocità (`rate`) per frase e inserendo pause; non sono esatte al millisecondo: l'obiettivo è un'anteprima del ritmo, non una sintesi di precisione.

**Export dei dialoghi.** Nell'export (§11) i dialoghi possono diventare prosa, formato sceneggiatura o testo semplice, a scelta.

---

## 7. Grafo

`core.buildGraph(story, config)` produce `{ nodes, edges }`:

- **nodi:** entità (e, opzionalmente, documenti);
- **archi:** `relations` (con l'etichetta del tipo di relazione) + archi "menziona" derivati da `links`, visivamente distinti.

### 7.1 Filtri (RF-41)

```ts
interface GraphFilters {
  entityTypeIds?: Id[]; // per tipo di entità
  entityIds?: Id[]; // per singole entità
  focusId?: Id;
  depth?: number; // grafo centrato su un'entità (default profondità 2)
  relationTypeIds?: Id[]; // per tipo di relazione
  tags?: string[];
  fieldFilters?: { fieldKey: string; op: "eq" | "ne" | "gt" | "lt" | "in"; value: unknown }[];
  timeWindow?: { from?: TimePoint; to?: TimePoint };
  includeDocuments?: boolean;
  includeLinks?: boolean; // archi "menziona"
}
```

### 7.2 Livelli di dettaglio (RF-44)

```ts
type NodeDetail = "dot" | "label" | "card" | "preview";
// dot     → solo un pallino colorato (colore del tipo di entità)
// label   → pallino + nome
// card    → nome, tipo, riassunto, campi chiave
// preview → mini-anteprima del documento rappresentato (rendering di sola lettura dell'albero JSON, troncato)

interface GraphDetailConfig {
  default: NodeDetail;
  byEntityType?: Record<Id, NodeDetail>;
  byNode?: Record<Id, NodeDetail>; // la scelta sul singolo nodo ha la precedenza
  autoByZoom?: boolean; // zoom out → dot, zoom in → label/card/preview
}
```

- **Risoluzione:** `byNode` > `byEntityType` > `default`; con `autoByZoom` il livello è limitato dallo zoom corrente (non si renderizza mai una preview a bassa scala).
- **Prestazioni:** le preview si renderizzano **solo per i nodi visibili** (`onlyRenderVisibleElements` di React Flow) e il testo troncato si calcola una volta e si memoizza per `Doc.updatedAt`.

### 7.3 Rendering e layout

- React Flow con nodi personalizzati (uno per livello di dettaglio); layout automatico con ELK o dagre; posizioni modificate a mano salvabili per pannello (`positions`).
- Grafo dei riferimenti di un documento/sezione: stesso meccanismo con `links` come sorgente (RF-16).
- Obiettivo di scalabilità: usabile fino a migliaia di nodi grazie a filtri, profondità limitata e dettaglio automatico, non a "tutto insieme".

---

## 8. Linea temporale

- Componente proprio (non `vis-timeline`, che lavora con `Date` reali e non supporta calendari custom): scala lineare sugli **ordinali** (d3-scale), con unità di zoom derivate dal calendario (anni → mesi → giorni…).
- **Ordinamento:** secondo il criterio della timeline (§4.2); corsia "non ordinati" per le entità senza chiave.
- **Corsie** configurabili: per tipo di entità, per entità o per ramo.
- **Filtri:** per tipo di entità; timeline di una singola entità (include anche gli eventi collegati tramite relazioni).
- **Ere:** la timeline può mostrare uno o più righelli di ere (es. "Era Antica" e "Era Nuova") accanto all'asse assoluto; le etichette delle date usano l'era di visualizzazione scelta.
- **Rami:** corsie con connettori di biforcazione.
- Rendering virtualizzato (solo la finestra visibile).

---

## 9. Mappe

### 9.1 Motore

- **Leaflet** con `CRS.Simple` (coordinate in pixel dell'immagine, non geografiche), tramite `react-leaflet` o un piccolo wrapper proprio.
- **Plugin da valutare nel prototipo (Fase 4):** `leaflet-geoman` per disegnare e modificare tratti e percorsi (spezzate e curve); `leaflet-polylinedecorator` per le frecce. Va verificata la compatibilità con `CRS.Simple` e lo stato di manutenzione; in alternativa le frecce si disegnano con marcatori SVG ruotati calcolati da noi.
- **Immagini grandi:** oltre una certa dimensione l'immagine viene suddivisa in _tile_ all'importazione (via canvas) e salvata come asset; da prototipare.
- **Ripiego:** tutta l'interazione con la mappa passa da una piccola interfaccia (`MapEngine`: aggiungi/sposta segnaposto, disegna tratti, mostra percorsi, zoom/pan, eventi di click). Se Leaflet mostra limiti su tratti o frecce, si sostituisce con un componente custom (SVG/canvas + d3-zoom) senza toccare dati e UI.
- **Coordinate normalizzate** (0–1) in tutti i dati: sostituire l'immagine con una a risoluzione più alta non sposta nulla.

### 9.2 Modello dati

```ts
interface MapDoc {
  id: Id;
  storyId: Id;
  name: string;
  assetId: string; // immagine (§11)
  width: number;
  height: number; // dimensioni originali in pixel
  parentMapId?: Id; // mappe annidate (RF-54)
  createdAt: number;
  updatedAt: number;
}

interface Marker {
  id: Id;
  mapId: Id;
  x: number;
  y: number; // 0–1
  label?: string;
  entityId?: Id; // entità rappresentata (es. un luogo)
  targetMapId?: Id; // se presente, il segnaposto apre una sotto-mappa
  region?: { x: number; y: number }[]; // area coperta dalla sotto-mappa, opzionale (contorno sulla mappa genitore)
}
```

### 9.3 Mappe annidate (RF-54)

- Un segnaposto con `targetMapId` apre la sotto-mappa: **nello stesso pannello** (con breadcrumb "Continente › Regno › Città" e tasto indietro) oppure **in un altro pannello**, secondo la scelta dell'utente e le regole dei pannelli collegati (§10).
- La gerarchia è un albero (`parentMapId`); si evitano cicli in fase di validazione.
- "Cosa è successo qui" (RF-52) può includere, a scelta, gli eventi dei segnaposto delle **sotto-mappe discendenti** (aggregazione).

### 9.4 Tratti con forma e tipo (RF-55)

```ts
// I tipi di tratto sono definiti per storia, con alcuni predefiniti.
interface PassageKindDef {
  id: Id;
  storyId: Id;
  nameKey?: string;
  name?: string; // predefiniti tradotti, personalizzati con nome libero
  style: {
    color: string;
    weight: number; // spessore
    dashArray?: string; // es. tratteggio per i sotterranei
    opacity?: number;
    midMarker?: "none" | "blocked" | "door" | "stairs"; // simbolo a metà tratto (es. X per "chiuso")
  };
}
// predefiniti: strada, sentiero, sotterraneo, ponte, via mare, passaggio segreto, chiuso

interface MapRoute {
  id: Id;
  mapId: Id;
  name?: string;
  entityId?: Id; // il tratto può essere a sua volta un'entità (es. "Via Regia")
  points: { x: number; y: number }[]; // spezzata (0–1)
  smooth?: boolean; // se true, curva interpolata
  kindId: Id; // → PassageKindDef
  stateHistory?: { when: TimeBinding; kindId: Id }[]; // cambia nel tempo: es. "chiuso" dopo un evento
}
```

- Il **tipo** determina l'aspetto (tratteggio, colore, simbolo); lo stato che cambia nel tempo si esprime con `stateHistory` (es. un passaggio aperto fino a una data e poi chiuso). La mappa mostra lo stato valido al "momento" selezionato, se l'utente attiva il filtro temporale.
- Le forme si disegnano e modificano punto per punto (spezzate) con opzione curva.

### 9.5 Percorsi dei personaggi (RF-53)

```ts
interface MapPath {
  id: Id;
  mapId: Id;
  entityId: Id; // di chi è il percorso
  timelineId: Id;
  waypoints: { markerId?: Id; x?: number; y?: number; time?: TimeBinding }[];
  viaRouteIds?: Id[]; // opzionale: il percorso segue tratti esistenti
  style?: { color?: string; arrow?: boolean };
}
```

- I waypoint, ordinati per tempo (o per ordine manuale), disegnano la polilinea con frecce.
- **"Cosa è successo qui":** le entità collegate a un segnaposto (tramite relazioni) elencate in ordine cronologico secondo il criterio della timeline.

---

## 10. Workspace, pannelli e pannelli collegati

### 10.1 Modello

```ts
interface Workspace {
  id: Id;
  storyId: Id;
  name: string;
  order: number;
  layout: unknown; // serializzazione del layout (dockview toJSON)
  panels: Record<Id, PanelState>;
  linkGroups: Record<Id, LinkGroup>;
}

interface PanelState {
  id: Id;
  config: PanelConfig;
  linkGroupId?: Id; // pannelli con lo stesso gruppo sono collegati
  role?: "driver" | "follower" | "both"; // chi emette il focus e chi lo segue
  pinned?: boolean; // bloccato: non segue più, ma resta nel gruppo
}

interface LinkGroup {
  id: Id;
  color: string;
}

type PanelConfig =
  | { kind: "document"; docId?: Id }
  | { kind: "entity"; entityId?: Id }
  | { kind: "timeline"; filter?: TimelineFilter; timelineId?: Id }
  | { kind: "graph"; focusId?: Id; filters?: GraphFilters; detail?: GraphDetailConfig }
  | { kind: "map"; mapId?: Id; entityFilter?: Id[] }
  | { kind: "collection"; entityId?: Id; itemSetKey?: string }
  | { kind: "gallery"; entityId?: Id }
  | { kind: "tree" }
  | { kind: "search" }
  | { kind: "coherence"; scope?: CoherenceScope };
```

- **Libreria (dockview).** La sua serializzazione dei gruppi/split è salvata come `layout` opaco; la configurazione dei pannelli (`PanelState`) è nostra e tipizzata con Zod (unione discriminata su `kind`). Il livello "workspace" (tab) è esterno alla libreria: un'istanza di layout per tab; cambiando tab si ricostruisce il layout salvato.
- **Persistenza:** i workspace sono _per dispositivo_ di default (non replicati), inclusi nel backup come opzione (D4, deciso).
- **Pannello di un'entità eliminata:** stato vuoto "elemento non trovato".

### 10.2 Pannelli collegati (RF-06)

**Evento di focus.** Ogni pannello che permette di scegliere qualcosa emette un evento:

```ts
type FocusTarget =
  | { kind: "entity"; id: Id }
  | { kind: "document"; id: Id; anchor?: string }
  | { kind: "marker"; id: Id }
  | { kind: "timelineEvent"; entityId: Id; bindingIndex?: number };
```

Lo stato del focus per gruppo vive in Zustand: `focusByGroup: Record<Id, FocusTarget>`. I pannelli _follower_ del gruppo reagiscono.

**Chi emette e chi reagisce** (valori predefiniti):

| Tipo di pannello    | Emette il focus quando…            | Reagisce a un focus mostrando…                                    |
| ------------------- | ---------------------------------- | ----------------------------------------------------------------- |
| mappa               | si clicca un segnaposto            | centra e evidenzia il segnaposto dell'entità                      |
| grafo               | si clicca un nodo                  | centra il nodo (o ricentra il grafo, se è in modalità "centrato") |
| timeline            | si clicca un evento                | evidenzia l'evento (o filtra sull'entità)                         |
| documento           | si clicca una menzione `:ref`      | mostra il documento dell'entità/documento                         |
| scheda entità       | si clicca una relazione o menzione | mostra la scheda dell'entità                                      |
| indice / ricerca    | si seleziona un risultato          | — (di solito è solo _driver_)                                     |
| galleria / raccolta | si seleziona una voce              | mostra immagini/raccolta dell'entità                              |

Se il follower non ha qualcosa da mostrare per quel target (es. il luogo non ha documento), mostra uno stato vuoto con l'azione "crea documento".

**Creazione del collegamento.** Dal menu contestuale di un'entità, segnaposto, nodo, evento o menzione: **"Apri in un altro pannello"** con due varianti:

- **Collegato** (predefinito): il nuovo pannello nasce nello stesso `linkGroupId` del pannello di partenza (se non ne ha uno, ne viene creato uno); il pannello di partenza è `driver`, il nuovo è `follower`.
- **Indipendente**: il nuovo pannello non ha `linkGroupId`.
  Una modifica (es. tenere premuto un tasto modificatore) permette di scegliere l'altra variante senza passare dal menu.

**Gestione.** Dal menu dell'intestazione del pannello: **Scollega**, **Collega a…** (sceglie un altro pannello o gruppo), **Blocca/Sblocca** (`pinned`), **Cambia ruolo** (solo guida, solo segue, entrambi).

**Aspetto.** I pannelli dello stesso gruppo hanno lo **stesso colore di bordo** (`LinkGroup.color`, assegnato da una palette) e un'**icona di collegamento** nell'intestazione, più un indicatore se sono bloccati. Il bordo è disegnato dal contenitore del pannello (un wrapper nostro), l'icona da un'intestazione personalizzata di dockview.

**Mobile.** Nel layout a pila (RF-05) i collegamenti continuano a funzionare: selezionare qualcosa nel pannello _driver_ aggiorna il _follower_, che mostra un indicatore di novità sul suo tab di cambio rapido.

---

## 11. Export, import e backup

**Formato di backup di una storia** (`.zip`, estensione proposta `.storyzip`):

```
manifest.json          → { formatVersion, contentVersion, appVersion, storyId, name, exportedAt }
story.json             → metadati della storia
calendar.json          → calendario ed ere
entity-types.json
relation-types.json
entities.json
relations.json
timelines.json         → rami, criteri di ordinamento, posizioni manuali
maps.json              → mappe, segnaposto, tratti, percorsi, tipi di tratto
workspaces.json        → opzionale
documents.json         → indice dei documenti e delle cartelle: id, kind, parentId, order, title, entityId, contentVersion
documents/<id>.json    → albero JSON del contenuto, solo per kind 'doc' (fonte di verità per l'import)
documents-md/<percorso>/<titolo>.md   → copie leggibili generate (NON usate in importazione)
entities-md/<tipo>/<nome>.md          → (*) schede delle entità: campi nel frontmatter, descrizione nel corpo (NON usate in importazione)
assets/<hash>.<ext>    → immagini, mappe, concept art
```

- **Doppio formato per evitare il lock-in (D13):** il JSON è ciò che si reimporta; le copie `.md` servono a poter leggere la storia ovunque.
- **Copie `.md` (\*):** l'albero `documents-md/` ricalca `parentId` e `order`, con nomi ricavati dai titoli. Poiché non vengono reimportate, basta sostituire i caratteri vietati nei nomi di file e aggiungere un suffisso numerico se due titoli coincidono nella stessa cartella. I corpi delle entità (`Doc` con `entityId`) non compaiono in `documents-md/`: stanno nella scheda in `entities-md/`, con i campi nel frontmatter (`remark-frontmatter`).
- **Non vengono mai inclusi** nel backup le impostazioni sensibili: chiavi e endpoint del provider IA.
- **Import:** validazione con Zod, migrazione dal `formatVersion`/`contentVersion` più vecchio, limiti di dimensione e numero di file, protezione dal _zip-slip_ (percorsi con `..`), **ricostruzione degli indici derivati** e verifica integrità (§1.2).
- **Conflitto di ID:** all'import di una storia già presente, scelta tra "sostituisci", "importa come copia" (nuovi ID, con rimappatura dei riferimenti, comprese le menzioni nei documenti) o annulla.
- **Backup automatici (RF-61):** copie periodiche in una cartella dell'app (Electron: cartella utente; Android: spazio dell'app, con possibilità di condividere), con rotazione degli ultimi N.
- **Asset (D10, deciso):** file fuori dal DB, indirizzati per hash del contenuto, tramite `platform`; in `web` (sviluppo/test) l'implementazione usa IndexedDB.

**Export dei documenti (RF-62):**

- Selezione: singolo documento, insieme selezionato, o intera storia.
- Ordine: quello dell'albero (capitoli/scene), con possibilità di escludere nodi.
- Generazione dal JSON con il convertitore di §5.5. Opzioni: menzioni → testo semplice / note a piè di pagina; dialoghi → prosa / sceneggiatura.
- Output iniziale: un unico `.md`; poi HTML, PDF, EPUB, DOCX (RF-63, Fase 8).

---

## 12. Temi

- Un tema è `{ id, name, tokens, customCss? }`.
- **Token** = variabili CSS (colori, font, raggi, spazi, ombre) applicate su `:root[data-theme="<id>"]`; i colori di Tailwind sono mappati su queste variabili, così tutta l'UI segue il tema.
- **CSS personalizzato:** caricato dall'utente e iniettato con scope sotto `[data-theme="<id>"]`.
- **Classi Tailwind scritte a runtime non funzionano**: Tailwind genera solo le classi presenti al momento della build. Per questo la personalizzazione passa da variabili e CSS caricato, non da classi Tailwind digitate.
- **Sicurezza:** poiché i temi si possono condividere, niente `@import` remoti e `url()` verso risorse esterne di default (CSP restrittiva).

---

## 13. Sincronizzazione della storia

**Stato:** pianificata in Fase 7; la progettazione attuale deve solo non chiuderle la porta.

- **Unità di sync:** la storia (tutti i documenti con lo stesso `storyId`).
- **Meccanismo:** protocollo di replica di RxDB (pull/push con checkpoint su `updatedAt` + `id`), filtrato per `storyId`.
- **Backend (D6, deciso):** Express con endpoint di replica RxDB; il database lato server si sceglie in Fase 7.
- **Account e permessi:** utenti, inviti per storia, ruoli (proprietario / editor / lettore).
- **Conflitti:** _last-write-wins_ a livello di documento (il contenuto è un JSON unico); con il co-editing (Fase 8) il testo passa a un documento Yjs (§5.6).
- **Compatibilità di versione:** i client dichiarano la versione di schema; il server rifiuta o forza l'aggiornamento se incompatibile.
- **Non sincronizzati:** `workspaces`, `settings`, `coherenceFindings` (D4, deciso) e gli **indici derivati** (ogni client li ricostruisce dopo la replica); gli asset si sincronizzano separatamente (per hash, con un semplice endpoint di upload/download).
- **Prerequisiti già adesso:** ID globali unici, `updatedAt` e cancellazioni logiche ovunque, granularità fine dei documenti, nessun vincolo di unicità oltre all'ID.

---

## 14. Moduli e plugin

- **Fase iniziale:** architettura a moduli _interni_. Ogni funzionalità in `features/` registra: tipi di pannello, tipi di campo, estensioni dell'editor (direttive + componenti), azioni e scorciatoie, voci di menu, namespace di traduzione, opzioni di export, regole di coerenza.
- **Plugin esterni (Fase 9):** richiedono un'API stabile, permessi e isolamento: si valutano solo quando le interfacce interne sono mature. Il modulo dialoghi/TTS è il primo candidato.

---

## 15. Astrazione della piattaforma

```ts
interface Platform {
  kind: "electron" | "capacitor" | "web";
  files: {
    saveFile(name: string, data: Blob): Promise<void>;
    openFile(accept: string[]): Promise<File | null>;
  };
  assets: {
    // file indirizzati per hash
    put(data: Blob): Promise<string>; // restituisce l'hash
    get(hash: string): Promise<Blob | null>;
  };
  secrets: {
    // chiavi del provider IA
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
  };
  share?(file: Blob, name: string): Promise<void>; // Android
  tts?: {
    speak(text: string, opts: { rate?: number; voice?: string }): Promise<void>;
    stop(): void;
  };
  autoBackupDir?(): Promise<string>;
  openExternal(url: string): Promise<void>;
  appInfo(): { version: string; platform: string };
}
```

- Implementazioni: `electron` (tramite `contextBridge` nel preload; per i segreti, l'archivio cifrato del sistema), `capacitor` (plugin Filesystem/Share e archivio sicuro di Android), `web` (fallback per sviluppo e test Playwright).
- `createDatabase()` sceglie lo storage di RxDB in base alla piattaforma: **Dexie/IndexedDB** su entrambe (D2, deciso); SQLite (plugin premium) solo come ripiego (§1.3).
- `assets`: Electron → cartella dati dell'utente (`<userData>/assets/<hash>`); Capacitor → cartella privata dell'app (`Directory.Data`); `web` → IndexedDB. **(\*)** Nel filesystem i file stanno in sottocartelle dai primi due caratteri dell'hash (es. `assets/ab/<hash>`); un controllo periodico (e dopo l'import) elimina i file non più referenziati da immagini di entità, nodi `image` dei documenti o mappe.

---

## 16. Internazionalizzazione e scorciatoie da tastiera

### 16.1 Internazionalizzazione (RNF-11)

- **Libreria:** i18next + react-i18next (namespace per funzionalità: `common`, `editor`, `entities`, `timeline`, `graph`, `maps`, `workspace`, `export`, `coherence`…). Ogni modulo di `features/` registra il proprio namespace.
- **File di traduzione:** `packages/app/src/locales/<lingua>/<namespace>.json`. Lingua predefinita `it`, più `en` come punto di partenza; lingua iniziale dal sistema operativo, modificabile dall'utente.
- **Nessuna stringa fissa nel codice:** regola di lint (es. `eslint-plugin-i18next`) e controllo in CI sulle chiavi mancanti tra le lingue.
- **Plurali e formati:** regole di plurale ICU/i18next; numeri e date **dell'interfaccia** con `Intl`. Le **date della storia** non usano `Intl`: seguono il calendario della storia (§4).
- **Contenuti ≠ interfaccia:** la lingua dei contenuti (`Story.contentLanguage`) è indipendente da quella dell'interfaccia. I modelli di partenza (tipi di entità, tipi di relazione, preset, tipi di tratto) sono chiavi tradotte alla creazione; dopo la creazione sono testo dell'utente e non cambiano con la lingua dell'interfaccia.
- **Layout:** si usano proprietà logiche (`ms-*`, `me-*` in Tailwind) per non precludere lingue con scrittura da destra a sinistra; non è un obiettivo ora.

### 16.2 Scorciatoie da tastiera e command palette (RF-07)

- **Registro delle azioni:** ogni azione ha `{ id, labelKey, defaultKeys, scope, run }`, con `scope` ∈ `global` | `editor` | `panel:<kind>`. I moduli registrano le proprie azioni.
- **Command palette** (es. Ctrl+K): elenca tutte le azioni registrate, con ricerca; mostra la scorciatoia accanto a ogni voce.
- **Libreria tasti:** una libreria leggera (es. tinykeys) per le scorciatoie globali e di pannello; nell'editor si usano le scorciatoie di TipTap (`addKeyboardShortcuts`), con regole di precedenza chiare rispetto alle globali (quando l'editor ha il focus vince l'editor, tranne per un insieme di azioni globali riservate, es. la command palette).
- **Azioni minime di partenza:** nuovo documento, apri entità/documento (ricerca rapida), ricerca globale, dividi pannello, chiudi pannello, passa al workspace successivo/precedente, inserisci riferimento (`@`), alterna anteprima, mostra backlink.
- **Rimappatura:** salvata in `settings`, con rilevamento dei conflitti; inizialmente solo scorciatoie predefinite, rimappatura in Fase 5.
- Su Android le scorciatoie valgono con tastiera fisica; l'accesso alle azioni da tocco passa dai menu e dalla command palette.

---

## 17. Controllo di coerenza (regole e agente IA)

Funzione opzionale (RF-90, RF-91, Fase 8). Due livelli indipendenti.

### 17.1 Regole deterministiche (RF-91)

Funzioni pure in `core/coherence`, senza IA. Lavorano sui dati strutturati, quindi dipendono dalla qualità dei dati inseriti:

- un'entità in due luoghi nello stesso momento (percorsi + segnaposto + tempo);
- un'entità che compare o agisce dopo la data di morte o di fine (campi con `semantic: 'death' | 'end'`, relazioni con periodo);
- una relazione usata fuori dal suo periodo di validità;
- riferimenti rotti, alias duplicati o in conflitto tra entità;
- un percorso che attraversa un tratto _chiuso_ nel periodo considerato.

Ogni regola restituisce `Finding[]` con severità e riferimenti.

### 17.2 Agente IA (RF-90)

**Flusso:**

1. L'utente sceglie l'**ambito** (`CoherenceScope`: storia intera, un documento, un'entità, un intervallo di tempo).
2. `core` costruisce un **pacchetto di contesto**: (a) fatti strutturati (entità con campi, relazioni con periodi, eventi ordinati dal criterio della timeline); (b) estratti dei documenti pertinenti (quelli collegati alle entità o al periodo in esame). Se il contesto supera la finestra del modello, si procede a blocchi (_map-reduce_: controllo per blocco, poi unificazione dei risultati).
3. L'utente vede un'**anteprima di ciò che verrà inviato** (dimensione e contenuto) e conferma.
4. Il modello risponde con un JSON validato con Zod; l'app mostra le segnalazioni in un pannello dedicato.

```ts
interface Finding {
  id: Id;
  storyId: Id;
  source: "rule" | "ai";
  severity: "info" | "warning" | "error";
  description: string;
  evidence: { docId?: Id; entityId?: Id; anchor?: string; quote?: string }[]; // riferimenti cliccabili
  suggestion?: string;
  status: "open" | "dismissed" | "resolved";
  createdAt: number;
}
```

**Provider.** Interfaccia generica:

```ts
interface LLMProvider {
  complete(req: {
    messages: ChatMessage[];
    jsonSchema?: object;
    signal?: AbortSignal;
  }): Promise<string>;
}
```

- Implementazione di partenza: **endpoint compatibile con le API OpenAI** (URL, modello e chiave inseriti dall'utente). Copre un modello locale (es. Ollama su Windows, o su un PC della rete locale raggiungibile da Android) e molti servizi con piano gratuito.
- "Gratuito" significa che l'app **non impone un servizio a pagamento** e non include chiavi proprie: l'utente sceglie. I piani gratuiti hanno limiti d'uso e condizioni sull'uso dei dati inviati: la schermata di configurazione deve dirlo chiaramente.
- Su Android non si prevedono modelli locali sul dispositivo (D12).
- **Chiavi e endpoint** si salvano in `platform.secrets`, non sono sincronizzati né inclusi nei backup.

**Garanzie e limiti:**

- **Sola lettura:** l'agente non ha strumenti né accesso in scrittura; non modifica documenti ed entità. Le sue segnalazioni si possono archiviare (`dismissed`) o trasformare in note.
- **Il testo della storia è input non fidato** per il modello: poiché l'agente non ha strumenti né azioni, il rischio di istruzioni nascoste nel testo si limita a risposte fuorvianti, ma nel prompt il testo della storia va comunque delimitato e dichiarato come dati.
- **Falsi positivi e falsi negativi** sono attesi: l'interfaccia presenta le segnalazioni come _possibili_ incoerenze, sempre con i riferimenti per verificarle.
- **Opt-in per storia**, con modalità "solo locale" (nessun invio verso servizi esterni).

---

## 18. Sicurezza

- **Markdown e documenti:** nessun HTML grezzo, anche in importazione di file `.md` e nei rendering degli export (non abilitare `rehype-raw` senza sanitizzazione). Il JSON dell'editor accetta solo i nodi dello schema: ciò che non è previsto viene scartato in fase di validazione.
- **Electron:** `contextIsolation: true`, `nodeIntegration: false`, API esposte dal preload ridotte al minimo, CSP restrittiva, nessuna navigazione verso URL esterni nella finestra principale.
- **Import:** validazione Zod, limiti di dimensione e numero di file, protezione zip-slip.
- **CSS utente:** vedi §12.
- **Agente IA:** vedi §17 (chiavi in archivio sicuro, anteprima dei dati inviati, opt-in).
- **API (sync):** autenticazione, autorizzazione per storia, validazione Zod di ogni payload, rate limiting.

---

## 19. Test e CI

- **Vitest** (priorità alta): `core` (calendario ed ere, criteri di ordinamento, estrazione di link e testo dall'albero JSON, conversione JSON ↔ markdown con test di round-trip, grafo, regole di coerenza, formato di backup), migrazioni di schema con fixture di backup vecchi, round-trip export→import senza perdita di dati, operazioni composte del repository (eliminazioni a cascata) e verifica integrità.
- **Playwright:** flussi principali end-to-end sulla build web (creare storia, scrivere, menzionare, aprire un pannello collegato, fare backup e ripristino); eventualmente su Electron.
- **CI (GitHub Actions):**
  - a ogni push: lint (incluso controllo i18n), typecheck, test, build;
  - su tag: release Android (APK/AAB firmato con secret) e release Windows (installer, runner Windows).
- **Turborepo** per cache di build e test tra pacchetti.

---

## Changelog del documento

| Versione | Data       | Modifiche                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1      | 2026-10-24 | Specifica scritta come sezione 9 del documento di progetto.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 0.2      | 2026-10-24 | Spostata in documento separato. Rinominati `Category` → `EntityType`, `collections` → `itemSets`. Aggiunti: scelta del database e compromessi (§1), preset (§3.1), criteri di ordinamento (§4.2), livelli di dettaglio e filtri del grafo (§7), mappe annidate, tratti con forma e tipo (§9), pannelli collegati (§10), i18n e scorciatoie (§16), controllo di coerenza (§17). Rimossi i vincoli "precede/segue" per eventi senza data (sostituiti dal criterio di ordinamento).                                                         |
| 0.3      | 2026-10-24 | Allineata al documento di progetto v0.5: documenti come JSON ProseMirror/TipTap (§5), menzioni come nodi con `id`, indici derivati per link e ricerca (§5.3), id dei nodi (§5.4), conversione JSON ↔ markdown (§5.5), migrazione a Yjs prevista (§5.6), dialoghi come nodi custom con export a direttive (§6), storage Dexie/IndexedDB (§1.3), "dove vive cosa" (§1.4), calendario unico con ere (§4.1), backup con JSON + copie `.md` (§11), workspace locali. Rimosso CodeMirror.                                                      |
| 0.4      | 2026-10-25 | Struttura dei dati confermata e allineata al documento di progetto v0.6: cartelle e documenti nella stessa collection con `kind` (§3), albero logico senza cartelle su disco, schede delle entità fuori dall'albero, tipi di entità come viste (§3); ciclo di vita degli indici derivati (aggiornamento per singolo documento, caricamento all'apertura, ricostruzione solo su comando o incoerenza, §5.3); backup con `kind` e copie `.md` delle entità (§11); asset in sottocartelle dall'hash con pulizia dei file orfani (§11, §15). |
