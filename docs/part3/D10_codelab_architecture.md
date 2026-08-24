# D10 — ROBika CodeLab Architecture

> CodeLab is the **real project workshop**: users create projects, edit files, run, see output, preview results, save, revisit history, and choose runtimes. Distinct from Academy lessons (guided) and the in-world Code Terminal (quest-scoped).

---

## 1. Product Surfaces (`/codelab`)

| Surface | Purpose |
|---|---|
| Project browser | list/create/open/delete projects; runtime badge; last-opened sort |
| Editor workspace | file tree · tabbed Monaco editors · Run panel (console output) · Preview pane (HTML/JS projects) · Save/version actions |
| History drawer | project_versions timeline; restore creates new version (never destructive) |
| Playground link | free-play sandbox map using bridge allowlist (D08 §4) |

## 2. Data Model Mapping (D03 CODELAB)

- `projects` — name, runtime adapter id, visibility.
- `project_files` — path→content rows (path unique per project).
- `project_versions` — full snapshot JSON per save point; restore = copy-forward.
- Offline: whole project cached in IndexedDB (`codelab.projects`); edits queue to outbox; conflict rule = field-level last-write-wins per file with revision bump (D19).

## 3. Runtime Selection

- `RuntimeRegistry` from D07 drives a picker: JavaScript (default), TypeScript, Python (Pyodide lazy).
- Per-project runtime stored at creation; changing runtime re-validates entry file conventions.
- Preview pipeline:
  - `html`/`javascript-web` projects render inside **sandboxed iframe** (`sandbox="allow-scripts"`, no same-origin, postMessage console relay).
  - `python`/`node-style` projects show console-only output via runner.

## 4. Run Pipeline

```
Save draft (debounced local)
   → Run: collect open files → SandboxWorker (same limits as D07)
        ├─ console stream → Output panel (ring buffer, truncation notice)
        └─ for web previews: build single-file bundle → iframe srcdoc
   → explicit "Save version" writes project_version row (+ remote when online)
```

Run limits mirror D07 §2 (timeout/memory/network-off/output cap). No npm install in MVP; curated helper libs exposed via import map entries declared in content config.

## 5. UX Rules (world-styled, §67 states)

- Workspace chrome uses art-bible terminal skin — feels like an in-fiction workstation, not VS Code clone.
- Loading / empty (no files) / error (run failure card) / offline banner ("saving locally") / retry everywhere.
- Autosave indicator pixel-LED; unsaved-changes guard on navigation.
- Mobile landscape: editor full-width, panels as bottom sheets.

## 6. Sharing (future-ready, P9 social)

- `visibility='public'/'unlisted'` prepared now; share page renders read-only preview + "Remix" (fork into user's projects) later. No public execution server-side; remix runs entirely client-sandboxed like any project.

## 7. Testing (feeds D22)

Unit: file-tree ops; version diff/restore logic; bundle builder for preview.
Integration: CRUD against Supabase tables with RLS; outbox replay of offline edits.
E2E: create JS project → edit → run sees console line → save version → reload → history restore works.
Security suite: preview iframe cannot touch parent origin/storage; run limits enforced.
