# Agent spec — time-tracking

**Issue:** [#1](https://github.com/AlexKovalko/time-tracking-demo/issues/1)  
**Slug:** `time-tracking`  
**Project:** falconai  
**Product:** `docs/specs/time-tracking/product.md`  
**Sources:** `docs/TZ.md`, `docs/STACK.md`  
**Depth:** M  
**Status:** cast complete — final tech-writer docs sync after devops (ports **8081**, volume `falconai_sqlite_data`, pnpm-only); closes parent #1

## Goal

Greenfield web app for employee time tracking (TZ / portfolio demo): full CRUD for employees and time entries, start/stop timer with live elapsed (hide/restore/stop-while-collapsed + one-time first-hide confirm), period report with CSV export, light/dark theme, ru/en UI, persist via SQLite across restarts (Docker Compose volume). No auth/roles; fictional data (faker seed OK). Portfolio bar slightly above baseline — no needless complexity (no queues, no in-app AI).

### Evaluation goals (same weight as a working app)

Alongside a working product, the deliverable must demonstrate **skillful AI tool use** and **careful architecture/code** aligned with `docs/STACK.md` + `docs/TZ.md` — not a generate-and-forget dump.

1. **Meaningful AI use (AC-12)** — root README covers launch, models/tools, example prompts, what AI did well vs poorly, and concrete manual fixes. **AI is not an in-app product feature.**
2. **Craft (AC-14)** — readable layers/modules; NestJS + SQLite + React + TanStack Query + Tailwind + shadcn/ui + Compose/nginx as specified; no dead or TZ-contradicting clutter.
3. **Demonstrable workflow** — solution can be explained and extended; AI is a helper in the loop, not a substitute for review and fixes.

Functional **AC-1…AC-11**, **AC-13**, and **AC-15…AC-20** are not weakened by craft/AI criteria.

## Git / repo note (first commit later)

`main` may still have no / few commits at planning time. First implementation commit is expected after user OK; PM/eng do **not** commit from this planning step.

## Role cast

### Ordered cast (full history)

1. **business-analyst** — done (`product.md`, grill locked, AC-1…AC-20)
2. **pm** — this doc + issue handoff; **STOP for user OK**
3. *(after user «ок / делай» only)* **ui-ux** — done (`ux.md`); flows, hide-timer UX contract, a11y, theme, i18n contract
4. **qa** `phase: write` — failing tests + Playwright E2E stubs mapped to AC-N
5. **backend-dev** ∥ **frontend-dev** — non-overlapping trees; shared HTTP contract below; make QA tests green without weakening them
6. **qa** `phase: verify` — re-run tests, AC matrix `AC-N → pass|fail|gap`
7. **devops** — Compose/nginx/volume polish, env launch docs alignment with README (does **not** close #1)
8. **tech-writer** — README sync / CODEMAP / eng docs / runbooks vs delivered code; **closes #1** after handoff (or orchestrator after tech-writer)

**Cast line (after user override — tech-writer IN):**  
`ui-ux → qa write → backend-dev ∥ frontend-dev → qa verify → devops → tech-writer`

### Diff vs previous cast

| Change | Detail |
| --- | --- |
| **ui-ux IN** | Hide-timer confirm / restore / stop-collapsed, a11y, theme + i18n UX contract before eng |
| **marketer OUT** | Copy lives in locale JSON owned by **frontend-dev** per ui-ux contract (no marketer docs pass) |
| **packages/** owner | **frontend-dev** (was backend-dev default) — dashboard-facing i18n / shared UI types |
| **tech-writer IN** | User override: docs sync (CODEMAP / runbooks / README polish) after devops; **closes #1** as last cast role |
| Minimum eng path | After ui-ux: `qa write → backend-dev ∥ frontend-dev → qa verify → devops → tech-writer` |

### Out (skipped)

| Role | Why |
| --- | --- |
| architect | Nest CRUD + React SPA + SQLite; API/UI contract in this agent.md + ui-ux docs is enough for BE∥FE |
| marketer | Not a sellability/landing task; UI strings → FE locale JSON |
| security | Explicitly no auth; no payments/webhooks/real PII; fictional names only |

### Eng / packages / README owners

| Zone | Owner |
| --- | --- |
| `apps/api` (NestJS, SQLite, schema, API, seed) | **backend-dev** |
| `apps/web` (React, TanStack Query, Tailwind, shadcn/ui) | **frontend-dev** |
| Root `docker-compose.yml`, API image, SQLite volume (initial working Compose for AC-11) | **backend-dev**; **devops** polishes after verify |
| nginx service / static UI + API proxy | **frontend-dev** (Dockerfile/config); Compose service wiring with backend-dev — **serialize** if same file |
| Root `README.md` (**AC-12** AI workflow + launch) | **backend-dev** drafts; **tech-writer** syncs/polishes after devops vs delivered code; FE/devops contribute launch notes |
| `packages/**` | **frontend-dev** (user mandate; shared UI types / i18n helpers). Create shared packages only if needed; **never** parallel FE+BE edits under `packages/**` |
| Locale JSON (**ru + en**) | **frontend-dev only** |

**Monorepo layout (greenfield):** `apps/api` + `apps/web` at repo root (STACK: API + UI/nginx — not `dashboard`). Keep ownership split API vs web.

## Implementation contract

### Product defaults (locked)

1. **Faker seed OK** — preferred for demo; empty DB also acceptable (**AC-3**)
2. **Live timer tick** shown; **hide** with one-time first-hide confirm (end session vs hide); **restore**; **Stop while collapsed** (**AC-17**)
3. **Max one running timer per employee** — reject second Start with message, no auto-stop (**AC-6**)
4. **Full CRUD** employees + time entries (**AC-15**, **AC-16**)
5. **CSV report export** (**AC-18**)
6. **Dark theme** + **ru/en i18n** (**AC-19**, **AC-20**)
7. **Docker Compose** — yes (**AC-11**, **AC-14**)
8. Separate apps **api + web** per STACK — yes (**AC-14**)
9. **Playwright E2E** in QA — yes (**AC-13**)
10. **AI only in README / dev process** — not a product feature (**AC-12**)
11. **Queues — explicitly OOS**
12. Portfolio bar slightly above baseline — no needless complexity

- One main page, three blocks: **employees · timer · period report**
- Duration display default: **hh:mm:ss**
- Soft preference persistence: theme + locale in **localStorage** OK (session-only also OK if documented)

### Hide-timer UX (implementation constraint — ui-ux expands in contract docs)

Locked product rule for FE + ui-ux:

1. While a timer is running, UI shows **live elapsed** (client tick from known `start`).
2. User may **hide** the timer indicator.
3. On the **first** hide attempt (until the user answers the confirm): show a **one-time** dialog — **End session (Stop)** **or** **Hide timer** (session keeps running).
4. After choosing **Hide**: timer stays running server-side; UI collapsed; user can **Restore** live display; user can **Stop** without expanding.
5. Subsequent hide actions after that first answer: **no** confirm again (same browser session minimum; persisting “prefer collapsed” in localStorage is OK).
6. Choosing **End session** on confirm = Stop path (**AC-5** / **AC-17**).

ui-ux owns the detailed UX contract (copy keys, a11y for dialog, focus, dark theme surfaces). FE implements; marketer is out.

### Stack (locked — `docs/STACK.md`)

- Node.js ≥ 24, TypeScript
- API: NestJS + SQLite
- UI: React + TanStack Query + Tailwind + shadcn/ui
- Docker Compose: API + nginx (static UI, proxy to API) + SQLite volume

### Suggested HTTP API (parallel BE∥FE contract)

Base path prefix: `/api` (nginx proxies to Nest). JSON. No auth headers.

#### Employees (full CRUD)

| Method | Path | Purpose | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/employees` | List employees | `{ id, name }[]` |
| `POST` | `/api/employees` | Create | Body: `{ name: string }` non-empty; 201 + entity |
| `PATCH` | `/api/employees/:id` | Update name | Body: `{ name: string }`; 404 if missing |
| `DELETE` | `/api/employees/:id` | Delete | Cascade or nullify related entries — BE chooses; UI must not show broken refs (**AC-15**). Prefer cascade delete of time entries for simplicity. |

#### Timers / running

| Method | Path | Purpose | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/timers/active` | List running timers | Optional convenience; may embed running on employee. Item includes `employeeId`, `description`, `start` |
| `POST` | `/api/timers/start` | Start timer | Body: `{ employeeId, description }` — description required; **409** (or 400 + stable code) if employee already has a running timer (**AC-6**) |
| `POST` | `/api/timers/stop` | Stop timer | Body: `{ employeeId }` or `{ timerId }` — closes running entry; returns closed entry with duration |

#### Time entries (full CRUD + report source)

| Method | Path | Purpose | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/time-entries?from=&to=` | List entries in period | Inclusive `YYYY-MM-DD`; item: employee id/name, description, start, stop, durationSeconds. Omit `from`/`to` only if FE needs “all” for admin list — report UI always sends range |
| `POST` | `/api/time-entries` | Manual create (optional path) | Body: `{ employeeId, description, start, stop? }` — must not create a second running for same employee (**AC-6**, **AC-16**) |
| `PATCH` | `/api/time-entries/:id` | Update | Description / interval; reject edits that would yield two running timers for one employee |
| `DELETE` | `/api/time-entries/:id` | Delete | Report/totals refresh on FE |

#### Report summary + CSV

| Method | Path | Purpose | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/reports/summary?from=&to=` | Per-employee totals | `{ employees: [{ employeeId, name, totalDurationSeconds }], grandTotalSeconds }` — empty/zeros when no data (**AC-9**, **AC-10**) |
| `GET` | `/api/reports/export?from=&to=` | **CSV export** | **Chosen approach:** API returns `text/csv` (or `application/octet-stream` with `Content-Disposition: attachment`) for the **same period** as the report. Columns minimum: employee name, description, start, stop, duration (human or seconds — document in README). FE triggers download via link/`fetch`+blob. *Do not* dual-implement FE-only CSV unless API export is blocked — single source of truth = API. |

**Error shape (minimum):** Nest-default `{ statusCode, message, error? }` is fine. FE surfaces Start-reject, validation, and CRUD errors using i18n keys.

**Duration:** store/compute in seconds (integer); FE formats as `hh:mm:ss`.

**Theme / locale:** **FE-only**. Persist preference in `localStorage` OK. No API for theme/locale.

**Seed:** backend may seed employees (and optional closed entries) via **faker** on first boot / explicit seed script — document in README.

**Parallel rule:** FE may stub against this contract (e.g. MSW) or wait for BE; do not invent divergent paths. If a path/shape must change, update this section and leave an issue comment **before** the other side builds against the old contract.

### UI boundaries (`apps/web`)

- Single page (sections/anchors OK): **Employees** | **Timer** | **Report**
- Employees: full CRUD UI (create, edit name, delete) — list refreshes after success (TanStack Query invalidate)
- Timer: employee select, description, Start / Stop, **live elapsed**, **hide / restore / stop-collapsed** per hide-timer UX (**AC-17**)
- Report: from/to, entry list, per-employee totals, empty state, **CSV export** control (**AC-18**)
- Time entries: edit/delete (and optional manual create) reachable from report/list (**AC-16**)
- Theme toggle light/dark (**AC-19**); locale switcher ru/en (**AC-20**)
- No login screen; open UI → all features available (**AC-2**)
- Locale JSON under FE ownership only

### Persistence

- SQLite file on a Docker volume so Compose restart keeps employees and time entries (including running) — **AC-11**
- Local non-Docker dev may use a file under `apps/api` (document in README)

### Tests (**AC-13**)

Owned primarily by **qa** (`phase: write` then `phase: verify`). Eng makes them green without deleting or weakening assertions.

Must cover at least (Playwright E2E for key journeys):

- Happy path: add employee + start/stop (**AC-1**, **AC-4**, **AC-5**)
- Reject second Start while running (**AC-6**)
- Empty report period (**AC-10**)
- Prefer also: hide/restore or CRUD smoke; CSV / theme / locale as capacity allows — map explicitly in verify matrix

API/unit tests for timer rules, CRUD integrity, and empty report are encouraged alongside E2E.

### README ownership (**AC-12**)

Root `README.md` (prefer Russian for TZ; bilingual OK) must include, with substance:

1. How to launch (including Docker Compose as primary path)
2. AI tools and models used (names, versions/modes if known)
3. Several example prompts showing how tasks were given to AI
4. What AI did well vs where it failed or was weak
5. Concrete code mistakes found and fixed manually
6. Explicit note: AI is **dev process only**, not an in-app feature

Backend-dev writes/maintains README; frontend-dev and devops contribute launch notes as needed.

## Acceptance criteria (done)

Mirror of `product.md` — **do not renumber** product ACs. Eng notes in italics do not change product meaning.

### Employees and data

- **AC-1.** User can **create** an employee with a name; the new employee appears in the list without a full manual system reload (UI updates after successful save). *Update/delete → AC-15.*
- **AC-2.** App works **without** authorization and **without** roles: all features available immediately after opening the UI.
- **AC-3.** Only **fictional** data (no real PII). *Faker (or equivalent) seed is allowed and preferred for demo; empty start without seed is also OK.*

### Timer

- **AC-4.** User can **start** a timer for a selected employee with a **non-empty** task description (empty description must be rejected).
- **AC-5.** User can **stop** a running timer (including when the indicator is **collapsed** — see **AC-17**); entry is closed with start/stop and computed duration.
- **AC-6.** While a **given employee** has a running timer, a second **Start** for that employee is **rejected** (clear UI error); no second parallel running timer for the same employee. *Rule: max one running **per employee** (not necessarily one globally).*
- **AC-7.** After Stop, the same employee can Start again (new tracking cycle).

### Report

- **AC-8.** User sets a period and sees a **list of entries** (at least: employee, description, interval or duration) in that period.
- **AC-9.** For the selected period, show **total time per employee** who has entries in the period (sum of durations).
- **AC-10.** **Empty report:** when no entries in the period, UI shows empty state (or equivalent); totals empty/zero; not treated as an app failure.

### Persistence

- **AC-11.** Data (employees and time entries, including running state if any) **persist in SQLite** and remain after app / Docker Compose restart (volume).

### Documentation, AI workflow, tests, craft

- **AC-12.** Root **README** covers launch (incl. Docker Compose), AI tools/models, example prompts, what AI did well vs poorly, and manual fixes. Demonstrates AI **development** workflow. *AI is not an in-app product feature.*
- **AC-13.** Automated checks for main scenarios, **including Playwright E2E** for key journeys: (a) second Start while running (**AC-6**); (b) empty report (**AC-10**); (c) happy-path employee + start/stop (**AC-1**, **AC-4**, **AC-5**); plus hide/restore or CRUD smoke as capacity allows.
- **AC-14.** Craft: layers aligned with `docs/STACK.md` — separate **API (NestJS)** and **UI (React + TanStack Query + Tailwind + shadcn/ui)**, nginx in Compose, SQLite + volume; readable modules; no dead/TZ-contradicting code. *Monorepo dirs: `apps/api` + `apps/web`.*

### Extensions (grill)

- **AC-15.** **Full employee CRUD:** in addition to create (**AC-1**), user can **update** name and **delete** employee; UI reflects changes without full system reload. *BE: prefer cascade delete of related time entries.*
- **AC-16.** **Full time-entry CRUD:** create (via timer and/or explicit create), read, **edit**, **delete**; report/list/totals update after changes. *Edits must not bypass AC-6.*
- **AC-17.** **Live elapsed** shown for running timer. User can **hide**; on **first** hide, one-time confirm: **end session** or **hide**. After hide: **restore** display; **Stop available while collapsed**. Later hides after choosing “hide” — no repeat confirm.
- **AC-18.** **CSV export** of the current report period — user can download a file aligned with report fields (min: employee, description, interval/duration). *Implemented via `GET /api/reports/export`.*
- **AC-19.** **Theme** light/dark switch applies to primary app surfaces. *FE-only; localStorage OK.*
- **AC-20.** **UI localization** ru + en; user switches locale; key labels, buttons, errors/empty states follow locale. *Locale JSON owned by frontend-dev.*

*No eng-only AC appended* — Compose health covered by **AC-11** / **AC-14** + devops polish.

## Constraints

- **Package manager: pnpm only** (user override) — root `packageManager`, `pnpm-workspace.yaml` (`onlyBuiltDependencies` + `allowBuilds` for `@swc/core`, `esbuild`, sqlite natives, etc.), `pnpm-lock.yaml`; scripts/README/Docker/CI use `pnpm` / `pnpm exec` (e.g. `pnpm exec playwright install chromium`). Do **not** use npm/npx or commit `package-lock.json`. Note: pnpm 11 ignores `package.json#pnpm` — put build allowlists in `pnpm-workspace.yaml`
- Never require auth, roles, or real personal data
- Do not expand into projects/tags/billing/timesheet grid
- **Queues intentionally out of scope** — do not add
- QA write before eng implement; eng must not delete/weaken QA tests to go green
- `packages/**` under **frontend-dev** only; serialize if BE needs a shared type (prefer OpenAPI/contract in this doc instead)
- Locale JSON: **frontend-dev only**
- Serialize edits if both eng roles (or eng + devops) must touch the same Compose/README file
- Project name in docs/comments for this repo: **falconai**

## Out of scope

Auth/RBAC/SSO; projects/clients/tags/billing; multi-tenant; mobile/offline; **message/job queues**; in-app AI chat/features; timesheet grid as primary mode (manual interval edit via CRUD is in scope via **AC-16**).

## Next

Cast finished (AC-1…AC-20). Docs aligned with delivered Compose (**8081** / **3000** / `falconai_sqlite_data`) and **pnpm only**. Parent [#1](https://github.com/AlexKovalko/time-tracking-demo/issues/1) closed by **tech-writer**. Orchestrator: closeout retro.
