# Theogony — AGENTS.md

Context file for AI coding assistants working on the Theogony repository.
This file is read automatically by OpenCode at the start of every session.

---

## 1. What is Theogony

**Theogony** is an offline-first app for writing and organizing stories of any genre (books, TV series, anime, videogames, RPG campaigns), built for people who work in groups and risk losing notes, mixing up events, and losing the big picture.

- Single source of truth for documents, characters, places, events, objects, relations.
- Multiple views: text, cards, timeline, relationship graph, maps.
- Generic: user-defined entity types and fields, custom calendar with eras.
- **Offline on Windows and Android**; sync is the only major online feature.
- No lock-in: export to JSON (data) and Markdown (text).
- Optional consistency checks via a free user-chosen AI agent.
- Typora-style immediate Markdown rendering while typing.

**MVP success criterion:** you and your friends can write, organize, find, and back up a story without losing anything.

---

## 2. Tech stack (decided)

| Area                          | Technology                                                          | Role                                                                     |
| ----------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Language                      | TypeScript                                                          | Single language for app and tooling                                      |
| UI                            | React                                                               | Shared UI across platforms                                               |
| Styling                       | Tailwind CSS                                                        | Responsive, touch-friendly styling                                       |
| Build                         | Vite                                                                | Dev server and bundler                                                   |
| Routing                       | React Router (HashRouter for Electron)                              | App routing                                                              |
| UI state                      | Zustand                                                             | Global UI state (not domain data)                                        |
| Database                      | RxDB + Dexie/IndexedDB                                              | Local NoSQL, reactive, offline-first                                     |
| Files                         | `platform` abstraction                                              | Images and maps, content-hash addressed, outside DB                      |
| Validation                    | Zod                                                                 | Data validation, backup import, API responses                            |
| Markdown (read-only / export) | react-markdown + remark-directive + remark-gfm + remark-frontmatter | Read-only rendering and export/import conversion                         |
| Editor                        | TipTap (ProseMirror)                                                | Immediate Markdown rendering, Mention chips (`@`), custom dialogue nodes |
| Mention popup                 | Tippy.js                                                            | Dynamic positioning of the `@` suggestion menu near the cursor           |
| Graph                         | React Flow + ELK/dagre                                              | Relationship graph                                                       |
| Panels                        | dockview                                                            | Divisible panel layout with serialization                                |
| Maps                          | Leaflet (`CRS.Simple`)                                              | Images with markers, routes, paths                                       |
| i18n                          | i18next + react-i18next                                             | Multilingual UI (it + en starting point)                                 |
| Shortcuts                     | Custom action registry + tinykeys                                   | Keyboard shortcuts and command palette                                   |
| Android                       | Capacitor                                                           | Android shell                                                            |
| Windows                       | Electron + electron-builder                                         | Windows shell                                                            |
| Backend                       | Express + Zod                                                       | API for online functions (sync)                                          |
| Tests                         | Vitest + Playwright                                                 | Unit tests and E2E                                                       |
| CI/CD                         | GitHub Actions                                                      | Lint, test, build APK/AAB + Windows installer, release on tag            |
| Monorepo                      | pnpm + Turborepo                                                    | Workspaces and build cache                                               |
| AI agent                      | Generic OpenAI-compatible endpoint                                  | Local model (Ollama) or free service chosen by the user                  |
| Sync text (future)            | Yjs                                                                 | CRDT for real-time co-editing (Phase 8)                                  |
| TTS                           | Web Speech API / Capacitor plugin                                   | Dialogue preview voice                                                   |

---

## 3. Monorepo structure

```
theogony/
├─ AGENTS.md              → this file (always available to the model)
├─ docs/                  → detailed specifications (attachable on demand)
│  ├─ documento-progetto.md        → project vision, requirements, roadmap (Italian)
│  ├─ specifica-tecnica.md          → technical specification (Italian)
│  └─ specifica-struttura-dati.md   → data and file structure (Italian)
├─ apps/
│  ├─ android/      → Capacitor shell (Android)
│  ├─ windows/      → Electron shell (Windows)
│  └─ api/          → Express + Zod (sync and online functions)
├─ packages/
│  ├─ app/          → React + Tailwind + RxDB (~90% of the code)
│  │  └─ src/
│  │     ├─ db/         → RxDB schemas, createDatabase(), migrations
│  │     ├─ platform/   → native API abstraction
│  │     ├─ stores/     → Zustand stores
│  │     ├─ routes/     → pages
│  │     ├─ locales/    → i18n translations
│  │     └─ features/   → one module per feature:
│  │                       editor, entities, relations, timeline, graph,
│  │                       maps, workspace, export, themes, dialogue, coherence
│  ├─ core/         → pure domain logic, no React, no DB
│  │                   (calendars, ordering criteria, link parser,
│  │                   graph construction, consistency rules, backup format,
│  │                   JSON ↔ Markdown conversion, text and mention extraction)
│  ├─ shared/       → types and Zod schemas shared between app and API
│  └─ config/       → tsconfig, eslint, prettier
├─ .github/workflows/  → ci, release-android, release-windows
├─ .github/            → issue templates, etc.
├─ turbo.json
├─ pnpm-workspace.yaml
├─ package.json
├─ pnpm-lock.yaml
├─ eslint.config.js
├─ commitlint.config.js
├─ README.md
└─ .gitignore
```

**Where things live:**

| What                                                           | Where                                             | Why                                    |
| -------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| Documents (JSON), entities, relations, calendar, map metadata… | RxDB (single DB, `storyId` on every document)     | Queryable, reactive, syncable          |
| Story tree (folders, chapters, scenes)                         | RxDB `documents` collection (`parentId`, `order`) | Logical tree, no folders on disk       |
| Images, maps, concept art                                      | Filesystem via `platform`, content-hash addressed | Large blobs stay out of the DB         |
| Derived indexes (links, searchable text)                       | RxDB (`links`, `docText`) + in-memory index       | Speed; always rebuildable from content |
| Workspace, settings                                            | RxDB, **device-local only** (not synced)          | Everyone organizes their own space     |
| `.json`, `.md`, `.zip` files                                   | Only export and backup                            | Portability, no lock-in                |

**Identifiers:** every DB object has an `id` (ULID / UUIDv7). All references use the `id`, never the name. Renaming never breaks anything.

---

## 4. Core commands

Run from the repository root (`theogony/`):

| Command                               | What it does                            |
| ------------------------------------- | --------------------------------------- |
| `pnpm install`                        | Install dependencies (workspace)        |
| `pnpm dev`                            | Start all apps in dev mode (Turbo)      |
| `pnpm build`                          | Build all packages and apps             |
| `pnpm lint`                           | Run ESLint on everything                |
| `pnpm typecheck`                      | Run TypeScript typecheck on everything  |
| `pnpm test`                           | Run Vitest + Playwright tests           |
| `pnpm format`                         | Run Prettier on everything              |
| `turbo run <task> --filter=<package>` | Run a task on a specific package/filter |

**Engines:** Node >= 22, package manager pnpm 12.

---

## 5. Coding conventions (must follow)

- **TypeScript everywhere.** No untyped JavaScript in app code.
- **Domain logic pure and tested in `packages/core`** — no React, no DB imports there.
- **Feature modules in `packages/app/src/features/`** — one module per feature (editor, entities, relations, timeline, graph, maps, workspace, export, themes, dialogue, coherence).
- **Zod is the source of truth for validation.** RxDB schemas are minimal (indexed fields and basic types only); every write passes through Zod.
- **No hardcoded UI strings.** All user-facing text goes through i18next (`packages/app/src/locales/<lang>/<namespace>.json`). Italian and English are the starting languages.
- **Markdown: no raw HTML** — neither on import of `.md` files nor in export rendering.
- **Electron security:** `contextIsolation: true`, `nodeIntegration: false`, minimal preload API, restrictive CSP.
- **Conventional commits** (enforced by commitlint + husky).
- **Prettier formatting** (config in `packages/config/prettier.config.js`).
- **Every schema change needs a migration** with test fixtures for each version (RNF-13).
- **Derived indexes are rebuildable.** No information lives only in an index (RNF-14).

---

## 6. Roadmap phases (summary)

| Phase | Focus                                                                                                                                                                                        | Priority |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 0     | Foundations: monorepo, CI, Zod + RxDB, `createDatabase()`, `platform` abstraction, i18n, action/shortcut registry, app shell for Windows + Android, backup format v1, `core` package         | P0       |
| 1     | MVP: stories, document tree, TipTap editor with immediate Markdown, `@` mentions, links, backlinks, search, entity types/fields/relations, shortcuts, command palette, manual backup/restore | P0       |
| 2     | Workspaces and panels: tabbed split panels, adaptive mobile layout, linked panels, link previews, collections/inventories, images and gallery, automatic backups                             | P1       |
| 3     | Time and graph: custom calendar with eras, dates on entities, timeline with ordering criterion, graph with filters and detail levels                                                         | P1       |
| 4     | Branches and maps: timeline branches, maps with markers, paths, submaps, shaped routes with types                                                                                            | P2       |
| 5     | Export, customization, presets: document export, section references, themes + custom CSS, game system presets                                                                                | P2       |
| 6     | Dialogues and pacing: dialogue syntax, pacing, TTS preview                                                                                                                                   | P2       |
| 7     | Story sync: accounts, invites, replication, conflict handling                                                                                                                                | P3       |
| 8     | Consistency, advanced co-editing, other export formats: consistency rules + AI agent, Yjs co-editing, HTML/PDF/EPUB/DOCX                                                                     | P3       |
| 9     | Far future: Markdown folder import, third-party plugins                                                                                                                                      | P4       |

Full details in `docs/documento-progetto.md` (sections 4–6).

---

## 7. How to give the model more context

This file (`AGENTS.md`) is always available. The detailed specifications are in `docs/` and should be **attached** (referenced) when a task touches that area:

- `docs/documento-progetto.md` — vision, glossary, requirements (RF/RNF), decisions, architecture overview.
- `docs/specifica-tecnica.md` — data model, RxDB collections, calendar/eras, editor, derived indexes, graph, timeline, maps, workspaces/linked panels, export/import/backup, themes, sync, consistency (rules + AI agent), security, testing/CI.
- `docs/specifica-struttura-dati.md` — data and file structure principle, collections, document tree, entities, derived indexes, blobs on filesystem, backup format, Markdown copy.

If the model needs information not covered here, ask to attach the relevant document from `docs/`, or point to the specific package/file under `packages/` or `apps/`.

---

## 8. Rules for the assistant

1. **Read `AGENTS.md` first** — it is the single source of project context.
2. **Do not contradict decided technologies** (RxDB, TipTap, dockview, Leaflet, React, Tailwind, pnpm/Turbo, etc.) unless the user explicitly asks to revisit a decision.
3. **Prefer `packages/core` for pure logic.** Keep UI and DB concerns out of `core`.
4. **Validate with Zod** before any write to RxDB or the API.
5. **Keep all UI strings translatable** via i18next; never hardcode user-facing text.
6. **Every schema change needs a migration + test fixture.**
7. **Offline-first:** assume no network except sync and the optional AI agent.
8. **No lock-in:** prefer JSON + Markdown export paths over proprietary formats.
9. **Ask before changing architectural decisions** listed in section 2 or the monorepo structure in section 3.
