# Theogony — Struttura dei dati e dei file

> Documento collegato a [`documento-progetto.md`](documento-progetto.md) e [`specifica-tecnica.md`](specifica-tecnica.md).
> Le voci marcate con **(\*)** sono dettagli proposti da Claude, non ancora confermati.

### 1. Principio

Tutto vive nel database **RxDB** (Dexie/IndexedDB), un solo DB con `storyId` su ogni oggetto. Sul filesystem stanno **solo i blob** (immagini, mappe, concept art). I file `.json`, `.md` e `.zip` esistono **solo come export e backup**.

Le "cartelle" della storia (`storia1/capitoli/…`) sono una struttura **logica** (campo `parentId`), non cartelle su disco.

Ogni oggetto ha: `id` (ULID/UUIDv7), `storyId`, `createdAt`, `updatedAt`.

### 2. Collection

| Collection               | Contenuto                                                  | Sincronizzata              |
| ------------------------ | ---------------------------------------------------------- | -------------------------- |
| `stories`                | Nome, descrizione, calendario con ere                      | Sì                         |
| `documents`              | Cartelle e documenti (albero)                              | Sì                         |
| `entityTypes`            | Tipi di entità: nome, icona, colore, definizione dei campi | Sì                         |
| `entities`               | Entità (personaggi, luoghi, eventi…)                       | Sì                         |
| `relationTypes`          | Tipi di relazione e relazione inversa                      | Sì                         |
| `relations`              | Relazioni tra entità                                       | Sì                         |
| `docIndex`               | Indice derivato: testo, menzioni, link                     | No (ricostruibile)         |
| `workspaces`, `settings` | Layout dei pannelli, impostazioni                          | No (locali al dispositivo) |

### 3. Albero dei documenti

Cartelle e documenti stanno nella stessa collection `documents`, distinti da `kind`.

```ts
{
  id, storyId,
  parentId: string | null,      // null = radice della storia
  kind: "folder" | "doc",
  title: string,
  order: string,                // (*) chiave frazionaria
  content?: object,             // JSON dell'editor; assente per le cartelle
}
```

- «Capitoli» non è una cartella speciale: è una cartella creata dall'utente (o da un preset).
- Spostare un elemento = cambiare `parentId` e `order`; nessun file si sposta.
- **(\*)** `order` è una stringa che si ordina alfabeticamente (chiavi frazionarie): un drag & drop modifica un solo documento, riducendo i conflitti in sincronizzazione.
- **(\*)** Una cartella non può essere spostata dentro un proprio discendente (controllo dei cicli).
- Nello schema RxDB `content` è dichiarato come `object` generico: l'albero di ProseMirror non viene descritto nello schema.
- **(\*)** Salvataggio con debounce di 1–2 secondi dopo l'ultima digitazione, non a ogni tasto.

### 4. Entità

I tipi di entità non sono cartelle: sono un attributo dell'entità. «Personaggi» nell'interfaccia è una vista filtrata per `typeId`.

```ts
entityTypes: { id, storyId, name, icon, color, fieldDefs: FieldDef[] }
entities:    { id, storyId, typeId, name, fields: {…},
               description: object,        // JSON, stesso editor dei documenti
               imageHashes: string[] }
relations:   { id, storyId, fromId, toId, relationTypeId, note?, period? }
```

Cambiare il tipo di un'entità o filtrare grafo e timeline per tipo non richiede di spostare nulla.

### 5. Indici derivati

```ts
docIndex: { id: docId, storyId, text, mentionIds: string[], linkIds: string[], updatedAt }
```

L'equivalente per le entità (nome, campi testuali, descrizione) segue lo stesso schema.

| Momento                    | Cosa succede                                                                                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dopo ogni salvataggio      | Si ricalcola `docIndex` **solo del documento modificato** (estrazione di testo, menzioni e link dall'albero JSON) e si aggiorna l'indice in memoria per quel documento |
| All'apertura di una storia | Si legge `docIndex` dal DB e si costruisce l'indice di ricerca in memoria (D16: MiniSearch o FlexSearch). **Non** si rielaborano i documenti                           |
| Ricostruzione completa     | Comando dedicato (RNF-14); eseguita anche dopo import e migrazioni, e **(\*)** quando manca un `docIndex` o il suo `updatedAt` non coincide con quello del documento   |

I backlink si ottengono interrogando `docIndex.mentionIds` e `docIndex.linkIds`. Nessuna informazione vive solo negli indici.

### 6. Blob su filesystem

- Accesso tramite il livello `platform`.
- Nome del file = hash del contenuto, ad esempio `blobs/ab/abcdef….png` (**(\*)** sottocartella dai primi due caratteri dell'hash). Nessun duplicato.
- Nel DB resta solo l'hash (`imageHashes`, riferimenti delle mappe).
- **(\*)** Un controllo periodico elimina i blob non più referenziati.

### 7. Formato del backup (`.zip`)

```
cronache-di-vaelor_2026-10-25.zip
├─ manifest.json            versione del formato, data
├─ story.json               calendario, tipi di entità, tipi di relazione, relazioni
├─ documents/index.json     albero: id, parentId, order, title, kind
├─ documents/<id>.json      contenuto di ogni documento
├─ entities/<id>.json
├─ assets/<hash>.<ext>
├─ workspaces.json          opzionale
└─ markdown/                copia leggibile, non usata in importazione
   ├─ Parte I - Il Confine/Cap. 3 - La Soglia.md
   └─ Personaggi/Aria Valen.md
```

L'importazione legge solo i file `.json`; dopo l'import si ricostruiscono gli indici derivati.

### 8. Copia markdown del backup

- L'albero `markdown/` ricalca `parentId` e `order`, con nomi leggibili ricavati dai titoli.
- Poiché non viene reimportata, basta sostituire i caratteri vietati nei nomi di file e aggiungere un suffisso numerico se due titoli coincidono nella stessa cartella.
- **(\*)** Le entità sono esportate come `.md` con i campi nel frontmatter (`remark-frontmatter`) e la descrizione nel corpo, raggruppate in una cartella per tipo.
