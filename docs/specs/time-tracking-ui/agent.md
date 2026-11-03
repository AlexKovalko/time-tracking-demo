# Agent spec — time-tracking-ui

**Issue:** [#6](https://github.com/AlexKovalko/time-tracking-demo/issues/6)  
**Slug (work item):** `time-tracking-ui`  
**Product slug:** `time-tracking-demo`  
**Project:** Time Tracking Demo (`time-tracking-demo`)  
**Remote:** AlexKovalko/time-tracking-demo  
**Product:** `docs/specs/time-tracking-ui/product.md`  
**Baseline (non-regression):** `docs/specs/time-tracking/{product,agent,ux}.md` — parent [#1](https://github.com/AlexKovalko/time-tracking-demo/issues/1) CLOSED  
**Stack:** `docs/STACK.md`  
**UI port:** Compose / preview **:8081** (never :8080)  
**Depth:** M  
**Status:** planning — **STOP for user OK** before ui-ux / qa / eng

## Goal

Evolve the working time-tracking UI from a single-page three-block CRUD layout into a portfolio-grade app shell:

1. **Client routes + nav** — Employees · Time entries · Report
2. **Employee create/edit** via **modal (Dialog)** (no inline create strip)
3. **Sticky floating timer** — bottom-right on all sections; preserve hide/restore/stop-collapsed + one-running-per-employee rules from baseline
4. **Time entries dual view** — Calendar (**week** day cards, no hour-axis/drag) ∥ List/table with CRUD
5. **Report** stays its own route — period, totals, CSV (non-regression)
6. Visual polish on existing React + Tailwind + shadcn/ui — no new brand system

Functional guarantees of v1 (`time-tracking` AC-1…AC-20) are **non-regression constraints**, not renumbered. This slug’s acceptance is **AC-1…AC-16** in `product.md` / below.

**FE-only expected:** reuse existing Nest API (`employees`, `timers`, `time-entries?from=&to=`, `reports/*`). No new endpoints unless a real gap is found (then blocker on #6 — do not invent API “just in case”).

## Role cast

### Ordered cast (full history)

1. **business-analyst** — done (`product.md`, AC-1…AC-16, FE-vs-BE locked) — stage [#7](https://github.com/AlexKovalko/time-tracking-demo/issues/7) CLOSED
2. **pm** — this doc + stage issues + issue handoff; **STOP for user «можно начинать?»** — stage [#8](https://github.com/AlexKovalko/time-tracking-demo/issues/8)
3. *(after user OK only)* **ui-ux** — UX contract: nav IA, routes, sticky timer chrome/a11y (incl. mobile compact), calendar week layout, employee/entry dialogs; assimilate baseline hide-timer rules from `docs/specs/time-tracking/ux.md`
4. **qa** `phase: write` — failing tests / Playwright stubs mapped to **AC-1…AC-16** + smoke non-regression for baseline timer/CRUD/report
5. **frontend-dev** — implement in `apps/web` (+ `packages/**` if needed); make QA tests green without weakening them
6. **qa** `phase: verify` — re-run tests; AC matrix `AC-N → pass|fail|gap`; close parent **#6** when PASS (no later cast roles)

**Cast line (after user OK):**  
`ui-ux → qa write → frontend-dev → qa verify`

### In / out

| Role | In/out | Why |
| --- | --- | --- |
| business-analyst | done | Product locked |
| pm | this stage | Cast + agent.md + stage issues |
| **ui-ux** | **IN** | Nav IA, sticky a11y, week calendar layout, modal flows — intentional UX contract change vs v1 single-page |
| **qa write** | **IN** | Red tests before eng |
| **frontend-dev** | **IN** | Sole eng owner — routes, modals, sticky timer, calendar∥list, polish |
| **qa verify** | **IN** | AC matrix + non-regression smoke |
| backend-dev | **OUT** | Existing `GET /api/time-entries?from=&to=` + CRUD/timer/report APIs suffice (product AC-16). If gap found → blocker on #6, cast update — do not pre-staff |
| architect | **OUT** | No new cross-layer boundaries; FE reuses baseline HTTP contract |
| marketer | **OUT** | Not a sellability/landing task; copy keys via ui-ux → locale JSON by FE |
| security | **OUT** | No auth/payments/webhooks/new public surface beyond existing local UI |
| devops | **OUT** | No Compose/port/volume change; keep **:8081** |
| tech-writer | **OUT** | No CODEMAP/ops rewrite required for this FE polish; FE may touch README route notes if needed. File follow-up if docs drift after verify |

**Parallel marks:** none — single FE tree; stages are sequential.

### Stage issue map

| Stage | Issue | Status |
| --- | --- | --- |
| business-analyst | [#7](https://github.com/AlexKovalko/time-tracking-demo/issues/7) | CLOSED |
| pm | [#8](https://github.com/AlexKovalko/time-tracking-demo/issues/8) | close after this handoff |
| ui-ux | [#9](https://github.com/AlexKovalko/time-tracking-demo/issues/9) | open until ui-ux handoff |
| qa write | [#10](https://github.com/AlexKovalko/time-tracking-demo/issues/10) | open until write handoff |
| frontend-dev | [#11](https://github.com/AlexKovalko/time-tracking-demo/issues/11) | open until FE handoff |
| qa verify | [#12](https://github.com/AlexKovalko/time-tracking-demo/issues/12) | open until verify; then close #6 |

### Eng / packages / i18n owners

| Zone | Owner |
| --- | --- |
| `apps/web` (React, TanStack Query, Tailwind, shadcn/ui, client routes) | **frontend-dev** |
| `apps/api` | **Do not change** unless blocker proves API gap (then cast update + backend-dev) |
| `packages/**` | **frontend-dev** (dashboard-facing / shared UI — create only if needed; never parallel with BE) |
| Locale JSON (`ru` / `en`) | **frontend-dev only** (ui-ux proposes keys/copy in `docs/specs/time-tracking-ui/`; marketer out) |
| Root README route notes (optional) | **frontend-dev** as needed; no tech-writer stage |

**Monorepo:** `apps/api` + `apps/web` (not `dashboard`).

## Implementation contract

### Product defaults (locked — from product.md soft defaults)

1. **Routes:** `/employees`, `/entries` (or `/time-entries` — ui-ux picks one path and documents it), `/report` + persistent nav; active section visually distinct
2. **Default Time entries view:** **List**; Calendar one click away
3. **Create / edit employee:** **Dialog** only (no inline create strip)
4. **Manual create time entry:** Dialog from Time entries **list** (as v1); **calendar click-to-create = OOS** (not AC)
5. **Calendar:** week = 7 day columns/cards; chips show employee / description / duration (readable minimum); prev/next week + “this week”
6. **List ↔ Calendar period:** keep week / date filter reasonably synced (shared period control or explicit mapping — ui-ux specifies)
7. **Sticky timer:** floating panel **bottom-right**; mobile: prefer **compact chip** when running (expandable); must not permanently block primary actions
8. **Hide-timer rules:** reuse baseline contract from `docs/specs/time-tracking/ux.md` § hide/restore/stop-collapsed + one-time confirm (this slug AC-7 / AC-8)
9. **API:** reuse baseline HTTP from `docs/specs/time-tracking/agent.md` — no new endpoints required (AC-16)
10. **Port:** UI **:8081** only

### UI boundaries (`apps/web`) — intentional change vs v1

| Area | v1 baseline | This slug |
| --- | --- | --- |
| IA | One page, three stacked blocks | Client routes + nav menu |
| Timer | In-page block | Sticky floating bottom-right on all routes |
| Employees create | Inline form strip | Modal Dialog |
| Entries | Mostly via Report list | Dedicated Time entries: Calendar week ∥ List/table |
| Report | Same page block | Own route; same API behavior |

### API reuse (no BE stage)

Base `/api` (nginx → Nest). Contract already delivered under `time-tracking`:

| Use | Endpoints |
| --- | --- |
| Employees CRUD | `GET/POST/PATCH/DELETE /api/employees` |
| Timer | `GET /api/timers/active`, `POST /api/timers/start`, `POST /api/timers/stop` |
| Entries list / calendar range | `GET /api/time-entries?from=&to=` (+ POST/PATCH/DELETE as needed) |
| Report | `GET /api/reports/summary`, `GET /api/reports/export` |

Calendar week aggregation by day is **client-side** over the fetched range.

If `from`/`to` or shapes block AC-9…AC-13 → post `## blocker` on #6; do **not** silently add endpoints.

### Non-regression (baseline reference)

QA verify must smoke:

- Timer start/stop, live `hh:mm:ss`, max one running per employee, hide / first-hide confirm / restore / Stop-collapsed
- Employee + entry CRUD consistency
- Report period + empty + CSV
- Theme light/dark; locale ru/en
- Persistence via existing SQLite / Compose

### Tests

Owned by **qa** (`write` then `verify`). Eng makes green without deleting/weakening assertions.

Map new/changed tests to **AC-1…AC-16**. Include Playwright coverage for: nav routes, employee modal, sticky timer presence across routes, calendar∥list toggle + week nav, empty states, report smoke.

### Docs / CODEMAP

tech-writer **out**. FE may update README if routes change. If CODEMAP/runbooks drift after verify → follow-up issue (`tech-debt` / `documentation`), not silent TODO.

## Acceptance criteria (done)

Mirror of `product.md` — **do not renumber**. Eng notes in italics do not change product meaning.

### Structure and navigation

- **AC-1.** Persistent nav menu for **Employees**, **Time entries**, **Report**; active section visually distinct.
- **AC-2.** Sections are separate screens/views with URL reflection (client-side routing); not required to be three stacked blocks on one scroll as in v1.
- **AC-3.** Visual structure reads as a coherent app (spacing, chrome, shadcn/Tailwind sections) — not a raw unbound CRUD form dump. *QA: checklist smoke + key controls present.*

### Employees

- **AC-4.** Create employee via **modal Dialog**: open → name → save → close; appears in list without full-page reload.
- **AC-5.** Employees section: list, edit, delete (edit preferably via dialog); baseline CRUD behavior preserved.

### Sticky timer

- **AC-6.** Timer is **sticky UI bottom-right** and remains available across section navigation (not only mid-page block).
- **AC-7.** Sticky timer: Start (employee + non-empty description), Stop, live elapsed `hh:mm:ss`, hide / one-time first-hide confirm / restore / Stop while collapsed (non-regression baseline AC-17).
- **AC-8.** Second Start for an employee with a running timer is **rejected** with a clear message in timer UI context (non-regression baseline AC-6); no second parallel running.

### Time entries — views

- **AC-9.** Time entries offers at least **List/table** and **Calendar** for the same entries.
- **AC-10.** User can switch Calendar ↔ List without unreasonable loss of period context (synced week/filter or shared period control).
- **AC-11.** Calendar shows a **week** (7 days) with day-bound entries; week navigation + jump to current week.
- **AC-12.** List/Table shows entries for selected period (employee, description, interval/duration) with **edit** and **delete**.
- **AC-13.** Empty period / empty week → **empty state**, app does not crash.

### Report and chrome

- **AC-14.** Report: period, entry list, per-employee totals, empty state, **CSV export** — not worse than baseline `time-tracking` (AC-8…10, AC-18 there).
- **AC-15.** Theme light/dark and locale ru/en from app chrome apply to nav, modals, sticky timer, calendar/list.

### FE / API

- **AC-16.** Calendar and list work on **existing** range API (`GET /api/time-entries?from=&to=` and related CRUD/timer endpoints). A **new backend endpoint is not required** for AC-1…AC-15; if API must change, that is a **blocker** on #6, not silent scope creep.

## Out of scope (explicit)

- Auth, RBAC, projects, tags, billing, approvals
- Timesheet / hour-axis / drag-resize / drag-create
- Month view as required (follow-up OK)
- Moving sticky timer to top bar
- Parallel running timers; auto-stop on second Start
- In-app AI; queues; UI port :8080
- Rewriting API “for UI” without a proven gap
- Changing baseline timer/report domain rules without a new product decision

## Follow-ups (filed, not in cast)

| Topic | Issue | Notes |
| --- | --- | --- |
| Month calendar view (optional) | [#13](https://github.com/AlexKovalko/time-tracking-demo/issues/13) | Product OOS default; `enhancement` (repo `tech-debt` label create 404 — noted in issue body) |
| Calendar click-to-create entry | [#14](https://github.com/AlexKovalko/time-tracking-demo/issues/14) | Nice-to-have; not AC |

## Next

1. **User confirmation required:** «можно начинать?» / «ок» / «делай»
2. Until then: **no** ui-ux / qa / frontend-dev production or test implementation work beyond planning docs already in cast order after OK
3. After OK, orchestrator runs cast in order: **ui-ux → qa write → frontend-dev → qa verify**
4. **qa verify** closes parent **#6** when AC matrix PASSes (devops/tech-writer skipped)

## Handoff notes for next roles

- **ui-ux:** Write `docs/specs/time-tracking-ui/ux.md` (or equivalent under this slug). Reuse hide-timer a11y from baseline ux; redesign chrome for routes + sticky panel; week calendar wireframes/contract; dialog patterns; mobile compact timer.
- **qa write:** Tests red against AC-1…AC-16; E2E base URL **:8081**.
- **frontend-dev:** `apps/web` (+ packages if needed); do not weaken QA tests; no API changes without blocker.
- **qa verify:** Matrix + baseline smoke; close stage + parent #6 on PASS.
