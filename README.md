# Theogony

**L'app offline-first per scrivere e organizzare storie di qualsiasi genere** — libri, serie TV, anime, videogiochi, campagne di gioco di ruolo — senza perdere appunti, eventi e collegamenti.

Theogony riunisce in un unico posto documenti, personaggi, luoghi, eventi, oggetti e relazioni. La stessa storia si può esplorare come testo, schede, linea temporale, grafo delle relazioni e mappe.

---

## Caratteristiche principali

- **Editor con rendering immediato** in stile Typora: scrivi in Markdown e vedi subito il risultato formattato.
- **Menzioni `@`** con chip cliccabili: rinomina un personaggio senza rompere nulla.
- **Tipi di entità e campi definiti dall'utente**, adatti a qualsiasi genere.
- **Relazioni tipizzate**, backlink e ricerca full-text.
- **Linea temporale** con calendario personalizzabile ed ere.
- **Grafo delle relazioni** con filtri e livelli di dettaglio.
- **Mappe** con segnaposto, percorsi e sotto-mappe.
- **Offline su Windows e Android**; la sincronizzazione è l'unica funzione online.
- **Nessun lock-in**: export in JSON e Markdown.
- **Controllo di coerenza** opzionale, anche con un agente IA gratuito scelto dall'utente.

---

## Stack in breve

TypeScript · React · Tailwind CSS · Vite · RxDB (Dexie/IndexedDB) · TipTap · dockview · Leaflet · Express · Capacitor (Android) · Electron (Windows) · pnpm + Turborepo · Vitest + Playwright.

---

## Stato del progetto

Progetto in **sviluppo iniziale** (Fase 0 — fondamenta). Il primo obiettivo è l'MVP: scrivere, organizzare, ritrovare e fare il backup di una storia senza perdere nulla.

---

## Documentazione

| Documento                                                              | Contenuto                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------- |
| [`AGENTS.md`](AGENTS.md)                                               | Contesto sempre disponibile per gli assistenti AI |
| [`docs/documento-progetto.md`](docs/documento-progetto.md)             | Visione, requisiti, roadmap, decisioni            |
| [`docs/specifica-tecnica.md`](docs/specifica-tecnica.md)               | Modello dati, editor, sync, sicurezza             |
| [`docs/specifica-struttura-dati.md`](docs/specifica-struttura-dati.md) | Collection, albero documenti, backup              |

---

## Avvio rapido

Requisiti: **Node.js >= 22** e **pnpm 12**.

```bash
pnpm install
pnpm dev        # avvia le app in modalità sviluppo
pnpm test       # test unitari ed end-to-end
pnpm build      # build di pacchetti e app
```

Vedi [`docs/FILES_TODO.txt`](docs/FILES_TODO.txt) per i documenti di supporto previsti (getting started, convenzioni, ADR…).
