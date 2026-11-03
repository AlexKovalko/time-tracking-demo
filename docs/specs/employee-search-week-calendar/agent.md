# Agent spec — employee-search-week-calendar

**Issue (parent epic):** [#93](https://github.com/AlexKovalko/time-tracking-demo/issues/93)  
**Slug:** `employee-search-week-calendar`  
**Product:** `docs/specs/employee-search-week-calendar/product.md`  
**App surface:** `apps/web` (Vite React — **not** `apps/dashboard`) + `apps/api`  
**Absorbs:** [#91](https://github.com/AlexKovalko/time-tracking-demo/issues/91) (`GET /employees?q=`) — closed as tracked under #93  
**Supersedes framing:** [#92](https://github.com/AlexKovalko/time-tracking-demo/issues/92) CLOSED; draft `docs/specs/pagination-lazyload/` — **out of this stage** (follow-up filed)  
**Related:** closed [#84](https://github.com/AlexKovalko/time-tracking-demo/issues/84)  
**Depth:** M  
**Status:** done — cast executed; qa verify PASS; parent #93 closed; follow-up #102 open  
**agentmemory:** unavailable for this run — skipped (`memory_save` / `memory_recall` N/A)

## Goal

One coherent UX stage:

1. **(A) Backend employee search** — `GET /employees?q=` (+ existing `page`/`limit`); wire `EmployeeCombobox` to debounced server search + lazy option pages; keep selected label; replace `listAllEmployees` as primary path in pickers (entries filter, create/edit entry, Timer).
2. **(C) Week calendar = resource matrix** — left column = employee FIO rows; top = days; **no** hour axis on week; create via empty cell click (or documented equivalent); **day** view unchanged (hour grid + drag-create).
3. **(B) List/report PaginationBar lazyload** — **OUT of scope** this stage.

**Non-regression:** list view entries, day calendar, CRUD, period/description filters, PaginationBar 10/20/50 (#84), i18n ru/en, `limit` ≤ 50, report/CSV.

## Role cast

### Ordered cast (full history)

1. **business-analyst** — done (`product.md`, AC-1…AC-8, locked A/C; B out)
2. **pm** — this doc + AC child issues + parent handoff; **STOP for user «можно начинать?»**
3. *(after user OK only)* **qa** `phase: write` — failing tests mapped to **AC-1…AC-8** (+ light non-regression smoke)
4. **backend-dev** ∥ **frontend-dev** — parallel (non-overlapping trees); shared contract below; make QA tests green without weakening them
5. **qa** `phase: verify` — re-run; AC matrix `AC-N → pass|fail|gap`; close passed AC children; close parent **#93** when PASS (no later cast roles)

**Cast line (after user OK):**  
`qa write → backend-dev ∥ frontend-dev → qa verify`

### In / out

| Role | In/out | Why |
| --- | --- | --- |
| business-analyst | done | Product locked; grill not required |
| pm | this stage | Cast + `agent.md` + AC children; wait for user OK |
| **qa write** | **IN** | Red tests before eng (`docs-before-code`) |
| **backend-dev** | **IN** | `GET /employees?q=` + API tests; `packages/**` default owner if shared types needed |
| **frontend-dev** | **IN** | `EmployeeCombobox` async search, pickers, week resource layout, locales |
| **qa verify** | **IN** | AC matrix; close AC children + parent #93 |
| architect | **OUT** | API shape trivial (`q` + page/limit); no new cross-layer boundaries |
| ui-ux | **OUT** | Week matrix + create gesture locked in `product.md`; no open UX disputes |
| marketer | **OUT** | No sellability/landing; locale JSON = frontend-dev |
| security | **OUT** | Existing authenticated list endpoint + optional `q` filter; no auth/oauth/webhooks/new public surface |
| devops | **OUT** | No infra/env/deploy change |
| tech-writer | **OUT** | No CODEMAP/ops/public API docs required for this stage; follow-up if CODEMAP drifts |

**Parallel marks:** `backend-dev ∥ frontend-dev` after qa write. Do **not** parallel-edit the same `packages/**` tree — packages owner is **backend-dev** (default); FE waits if BE adds shared query types, or FE types locally in `apps/web` if no package change.

### Ticket policy (LOCKED)

- **Parent epic:** #93 only for role coordination (handoff comments on parent).
- **AC child issues:** one per `AC-N` (map below). Roles close AC children on PASS (typically qa verify).
- **Do NOT** create role/stage GitHub issues (`[<slug>] · qa write`, `backend-dev`, `frontend-dev`, etc.).
- Task briefs: `issue: #93`; `stage_issue:` = AC ticket(s) being worked, `#93`, or `n/a`.

### AC → issue map

| AC | Issue | Title (short) |
| --- | --- | --- |
| AC-1 | [#94](https://github.com/AlexKovalko/time-tracking-demo/issues/94) | Backend employee text search `q` |
| AC-2 | [#95](https://github.com/AlexKovalko/time-tracking-demo/issues/95) | EmployeeCombobox debounced server search |
| AC-3 | [#96](https://github.com/AlexKovalko/time-tracking-demo/issues/96) | Combobox lazy option pages |
| AC-4 | [#97](https://github.com/AlexKovalko/time-tracking-demo/issues/97) | Selected employee stays visible |
| AC-5 | [#98](https://github.com/AlexKovalko/time-tracking-demo/issues/98) | Week calendar FIO left column |
| AC-6 | [#99](https://github.com/AlexKovalko/time-tracking-demo/issues/99) | Week cells employee×day without hour axis |
| AC-7 | [#100](https://github.com/AlexKovalko/time-tracking-demo/issues/100) | Week create / day non-regression |
| AC-8 | [#101](https://github.com/AlexKovalko/time-tracking-demo/issues/101) | Empty / loading / no-results for search |

**Follow-up (out of cast):** [#102](https://github.com/AlexKovalko/time-tracking-demo/issues/102) — list/report PaginationBar loading polish (ex-#92).

### Eng / packages / i18n owners

| Zone | Owner |
| --- | --- |
| `apps/api` (employees list `q`, DTO, service filter, API tests) | **backend-dev** |
| `apps/web` (`EmployeeCombobox`, `EntriesSection` week calendar, Timer pickers, `api.listEmployees` `q`, locales) | **frontend-dev** |
| `packages/**` | **backend-dev** if shared types needed; prefer no touch — FE may extend client params in `apps/web` only |
| Locale JSON (`ru` / `en`) | **frontend-dev only** |

## Implementation contract

### Locked product defaults (from BA)

1. **BE `q`:** Optional string on `GET /employees`; case-insensitive **contains** on employee name; empty/omit `q` = unfiltered paginated browse. Keep `page`/`limit` (max **50**). Response shape unchanged (`items`, `total`, …).
2. **FE Combobox:** Debounce **~250–300 ms**; fetch page 1 on open / on `q` change; append next pages near scroll end while `hasMore`; cancel/ignore stale responses; **selected employee always labeled** (selection cache and/or `GET /employees/:id`).
3. **Replace `listAllEmployees`** as primary path for EmployeeCombobox consumers: entries filter («Сотрудник» / «Все сотрудники»), create/edit entry dialog, Timer picker, any other picker using full crawl. `/employees` table may keep paginated `listEmployees` without requiring `q`.
4. **Week calendar:** Left = FIO resource rows; top = days; **no** hour axis on week; chips in cells show description and/or time (name not primary in chip). Row set: filter «all» → employees with ≥1 entry in visible week; filter one → that employee row even if empty. Empty full-roster rows not required.
5. **Week create:** Click empty employee×day cell → create dialog with employee + date prefills (sensible default duration, e.g. 1h) **or** explicit equivalent documented in handoff; existing blocks → edit. **No** required hour-axis drag on week.
6. **Day view:** Unchanged — hour axis + drag-range create hint.
7. **(B) PaginationBar / report paging:** No AC this stage.

### API / UI boundaries

| Area | Boundary |
| --- | --- |
| `GET /employees?q=&page=&limit=` | **backend-dev** — extend `ListEmployeesQueryDto` + service; ownership of any shared DTO in `packages/**` |
| Client `api.listEmployees({ q, page, limit })` | **frontend-dev** — wire `q`; stop using `listAllEmployees` in pickers |
| `EmployeeCombobox` async UX | **frontend-dev** — debounce, lazy pages, selected cache, loading/empty/no-results |
| Week resource layout | **frontend-dev** — `EntriesSection` (or calendar child); day grid untouched in meaning |
| New auth / public endpoints | **Out** |
| List/report PaginationBar polish | **Out** → follow-up issue |

If API contract gap blocks FE → post `## blocker` on #93; do not silently expand cast.

### Non-regression

QA verify must smoke: employee/entry CRUD, timer start/stop, day calendar drag-create, list filters, report/CSV, theme, locale ru/en, PaginationBar 10/20/50 on lists (#84).

### Tests

Owned by **qa** (`write` then `verify`). Map new/changed tests to **AC-1…AC-8**. Eng makes green without deleting/weakening assertions. Prefer API tests for AC-1 under `apps/api` ownership; Combobox/calendar under FE/e2e as qa chooses.

### Docs

tech-writer **out**. FE may touch locale keys as needed. If CODEMAP/API docs drift → follow-up issue, not silent TODO.

## Acceptance criteria (done)

Mirror `product.md` — **do not renumber**.

### AC-1 — Backend employee text search

`GET /employees` accepts optional `q` (and existing `page`/`limit`). Case-insensitive contains on name. Empty/omit `q` = prior paginated list. Response still paginated. Owner: **backend-dev**.

### AC-2 — EmployeeCombobox: debounced server search

Combobox on entries filter, create (and edit if same picker), and Timer does **not** use `listAllEmployees` as primary path: requests API with `q` + debounce; empty query = browse first page. Owner: **frontend-dev** (needs AC-1).

### AC-3 — Combobox lazy option pages

Open options + more pages available → scroll near end loads `page+1` with same `q` and **appends**; new `q` resets to page 1. Owner: **frontend-dev**.

### AC-4 — Selected employee stays visible

After selection, label remains even if employee absent from current search page (cache and/or fetch by id). Filter retains «Все сотрудники». Owner: **frontend-dev**.

### AC-5 — Week calendar: FIO left column

**Week** mode: left column = employee FIO (resource rows); top = weekdays; hour axis as sole Y-axis for week **removed**. Names readable in left column. Owner: **frontend-dev**.

### AC-6 — Week cells: entries without relying on hour axis

Entries in employee×day cells (chips/blocks with description and/or time; title/tooltip full text). Row set per locked filter rules. Owner: **frontend-dev**.

### AC-7 — Week create / day non-regression

Week: create without required hour-axis drag (empty-cell click → prefills **or** documented equivalent). Day: hour axis + drag-select create preserved. List view + PaginationBar #84 no regression. Owner: **frontend-dev** (+ qa smoke).

### AC-8 — Empty / loading / no-results for search

Combobox distinguishes loading, browse-empty («no employees»), and query no-results. Week empty state remains clear. Owner: **frontend-dev**.

## Out of scope / follow-ups

- List/report PaginationBar skeleton / report table page-fetch (ex-#92 / `pagination-lazyload`) — follow-up issue (see handoff).
- Infinite scroll on list tables — rejected (#84).
- Resource time-grid week (hours × employees), month view, edge-resize, drag-move — future.
- Day view as resource layout — out.
- Min-chars-before-search, fuzzy/translit beyond contains — future unless trivial eng win.

## Open questions

**None blocking.** User may override before eng (e.g. week create gesture). Waiting for user **«ок / можно начинать?»**.
