# D09 — ROBika Academy Content Model

> Academy teaches **genuine programming** (product rule) through courses → chapters → lessons → examples/exercises/challenges, feeding the MASTERY domain and "Practice in Game". Content is data-driven (`content/academy/**`), rendered by React, never hard-coded. Platform is not hard-coded around a small fixed language list.

---

## 1. Hierarchy

```
Course (courseSlug)
└── Chapter (chapterSlug)
    └── Lesson (lessonSlug)
        ├── Blocks: text · code_example · callout · quiz · exercise · challenge_link
        └── Outcomes: mastery skills + xp
```

Routes (D02): `/academy/[courseSlug]/[chapterSlug]/[lessonSlug]` — catalog pages stay world-styled (map/terminal metaphors), NOT dashboard tables.

## 2. Lesson Block Types

| Block | Fields | Renderer behavior |
|---|---|---|
| `text` | md-ish body (limited subset), i18n keys | typewriter-free readable panel; inline code styled |
| `code_example` | language, source, caption | read-only Monaco with pixel frame; copy button |
| `callout` | kind: tip/warn/story | NPC-voiced sidebar ("BOT-1 says…") |
| `quiz` | question, options[], correctIndex, explain_key | instant feedback; wrong answer loops hint |
| `exercise` | starter, tests (same harness as D07), hints[] | embedded mini-runner; completion required to pass lesson |
| `challenge_link` | challenge_ref | deep-links into world Practice-in-Game or CodeLab |

## 3. Course Definition Schema

```jsonc
{
  "id": "js_basics",
  "title_key": "courses.js_basics.title",
  "language": "javascript",
  "description_key": "...",
  "chapters": [
    {
      "id": "variables",
      "lessons": [
        {
          "id": "what-is-a-variable",
          "blocks": [ /* above */ ],
          "outcomes": { "skills": ["js.variables"], "xp": 15 },
          "practice_in_game": { "quest_ref": "q_boot_01_power_loss", "challenge_ref": "ch_js_var_battery" }
        }
      ]
    }
  ],
  "certificate": { "mastery_threshold": 70 }   // issues certificate via RPC when met
}
```

## 4. Skills & Mastery

- Skill ids are namespaced strings (`lang.topic`, e.g., `js.variables`, `py.loops`) — open-ended set, no enum hard-coding.
- Sources of mastery evidence: lesson exercises, coding challenges, Practice-in-Game completions.
- `mastery.score` (0–100) computed server-side on each evidence event (weighted recency + difficulty); drives:
  - lesson gating recommendations,
  - certificate eligibility,
  - Mentor context (D11),
  - quest prerequisite checks (D06).

## 5. Practice-in-Game Bridge

Every core concept maps to a world moment: lesson teaches loop → dungeon gate needs a loop (bridge verb). Mapping lives in lesson `practice_in_game`; QuestEngine accepts mastery or direct completion as objective evidence. This keeps "real game first" — Academy is reachable from the world (NPC tutors, terminals), not a separate SaaS portal.

## 6. Offline Behavior (§66/P11)

- Opened lessons cached (content JSON + assets refs) in IndexedDB.
- Exercises run locally via same sandbox (works offline for JS; Python requires prior Pyodide cache).
- Progress writes go to outbox queue → synced later (D19). Mastery recompute happens server-side on sync apply.

## 7. Progress Surfaces

- Lesson page: block-by-block progress bar (pixel style), resume point stored per user+lesson.
- Chapter/Course view: node map styled as Aetheria travel route — no generic progress tables.
- Profile: certificates gallery + skill constellation (visual, not spreadsheet).

## 8. Authoring Rules

- All strings keyed for localization (id/en at MVP).
- Every exercise must be solvable from taught blocks alone; hints progressive; solutions never auto-shown (AI guard mirrors this).
- Each lesson ≤ ~8 blocks target attention span; heavy practice delegated to linked challenges.
- Content lint test validates schema, key existence, test solvability (golden solutions run in CI sandbox).

## 9. Testing (feeds D22)

Unit: block renderers snapshot; outcome/xp mapping.
Integration: mastery update RPC after exercise completion; certificate issuance at threshold.
E2E: complete first lesson → earn XP → linked quest objective auto-satisfies (Practice-in-Game proof).
