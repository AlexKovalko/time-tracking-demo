# Agent spec — time-tracking-calendar

**Issue:** [#18](https://github.com/AlexKovalko/time-tracking-demo/issues/18)  
**Slug (work item):** `time-tracking-calendar`  
**Product slug:** `time-tracking-demo`  
**Project:** Time Tracking Demo (`time-tracking-demo`) — **not Queply**  
**Product:** [`product.md`](./product.md) (BA — **AC-1…AC-32**)  
**UX:** [`ux.md`](./ux.md) (ui-ux — pending #19)  
**Predecessors:**
- baseline `time-tracking` — [#1](https://github.com/AlexKovalko/time-tracking-demo/issues/1)
- UI shell `time-tracking-ui` — [#6](https://github.com/AlexKovalko/time-tracking-demo/issues/6)
**UI port:** **:8081** (never :8080)  
**Depth:** M  
**Status:** **user OK received** («делай») — continue cast with scope amends (depts/profile/charts + display formats)

## Goal

1. Timer FAB → panel on click; GCal-lite calendar; filters + pagination; realistic seed (AC-1…19).
2. Departments entity + employee profile fields; employee profile view + stats/entries filters; 2 report charts (AC-20…30).
3. Shared **duration** + **interval** formatters (AC-31…32).
4. Fix UUID-in-select → names.

## Role cast (ordered)

```
ui-ux → qa write → backend-dev ∥ frontend-dev → qa verify → devops
```

| Role | In/Out | Stage |
| --- | --- | --- |
| business-analyst | DONE | product.md |
| pm | DONE (this amend) | agent.md |
| **ui-ux** | **IN** | [#19](https://github.com/AlexKovalko/time-tracking-demo/issues/19) |
| **qa** write | **IN** | [#20](https://github.com/AlexKovalko/time-tracking-demo/issues/20) |
| **backend-dev** | **IN** ∥ FE | [#21](https://github.com/AlexKovalko/time-tracking-demo/issues/21) |
| **frontend-dev** | **IN** ∥ BE | [#22](https://github.com/AlexKovalko/time-tracking-demo/issues/22) |
| **qa** verify | **IN** | [#23](https://github.com/AlexKovalko/time-tracking-demo/issues/23) |
| **devops** | **IN** | [#24](https://github.com/AlexKovalko/time-tracking-demo/issues/24) — closes **#18** after verify PASS |
| architect / security / marketer / tech-writer | **OUT** | — |

**Parallel:** only backend-dev ∥ frontend-dev (non-overlapping trees; `packages/**` → backend-dev only, no parallel FE).

## Ownership

| Zone | Owner |
| --- | --- |
| `apps/api` | backend-dev |
| `apps/web` | frontend-dev |
| Shared duration/interval util | Prefer `apps/web` util + unit tests; if shared package needed → **backend-dev** creates under `packages/**` then FE consumes (**sequentially**, not parallel). CSV human-readable duration on BE: same algorithm (copy or package). |
| Locale JSON ru/en | **frontend-dev only** |
| Compose / reseed docs | devops after eng |
| Port | **:8081** |

## Soft defaults

1. Default calendar mode: **Week**
2. pageSize default: **20** (clamp 10–50)
3. Seed FIO: **ru-locale** preferred
4. Drag: desktop-first; mobile click-slot fallback OK
5. Departments UI: ui-ux chooses nav item vs Employees subsection
6. Charts: 2 surfaces only (AC-27/28)
7. Duration zero: `0с` / `0s`
8. Interval same-day: strict two-line format (AC-32); en dates `MM/DD/YYYY`

## API contract (backend-dev; FE consumes)

### Existing extended

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/employees` | Pagination `page`+`limit` (default 20) + `total`. DTO includes `name`, `departmentId`, `title`, `email`, `phone`, nested `department?: {id,name}` preferred |
| `POST/PATCH/DELETE` | `/api/employees` | Accept profile fields; email basic validate if non-empty |
| `GET` | `/api/time-entries` | `from`,`to`,`employeeId`,`q`, `page`,`limit`; calendar = visible range |
| CRUD/timers/report/CSV | existing | Non-regression; CSV duration column use AC-31 if human-readable |

### Departments (AC-20)

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/departments` | list (+ optional pagination if needed) |
| `POST` | `/api/departments` | `{ name }` |
| `PATCH` | `/api/departments/:id` | rename |
| `DELETE` | `/api/departments/:id` | only if unused / after unassign — document rule |

### Profile stats (AC-25)

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/employees/:id` | detail with department |
| `GET` | `/api/employees/:id/stats` **or** report query | `from`,`to` → `{ totalDurationSeconds, entryCount, … }` — eng picks one; document in handoff |
| Entries on profile | `GET /api/time-entries?employeeId=&from=&to=&q=` | AC-26 |

### Charts (AC-27…29)

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/reports/charts` **or** extend summary | Query `from`,`to`,`bucket=day\|week`, `breakdown=employees\|departments`. Return series suitable for bars. Unassigned dept bucket labeled for FE i18n. |

### Seed (AC-15…17, AC-22, AC-30)

Force reseed purges + inserts ≥3 departments, ≥8–12 employees with FIO + dept + mostly title/contact, dense entries 2–4 weeks across employees/depts/days. Document CLI/env; devops Compose volume caveat.

## UI boundaries (frontend-dev)

- FAB timer; GCal-lite; filters+pagination; name labels (AC-1…19)
- Departments minimal CRUD UI; employee modal fields; list secondary dept/title (AC-20…23)
- Route `/employees/:id` (or equivalent) profile: header, stats, filtered entries (AC-24…26)
- Report: 2 charts + toggles; empty state (AC-27…29)
- **formatDuration** + **formatInterval** shared util + i18n suffixes; use everywhere durations/intervals show (AC-31…32)
- Locale JSON keys for ч/м/с and h/m/s; interval layout

## Acceptance criteria (done) — mirror product, do not renumber

### AC-1…19
As in `product.md` (timer FAB, GCal-lite, filters/pagination, names/seed, shell, :8081).

### AC-20…30
Departments CRUD; employee profile fields; seed depts/profile; list secondary signal; profile view+stats+filtered entries; charts over time + breakdown; empty charts; reseed densifies chart data.

### AC-31 Duration display
Shared util; ru `ч/м/с`, en `h/m/s`; examples `48ч`, `4ч 20м`, `2м 5с`; skip zero higher parts; no `0ч`; QA asserts format.

### AC-32 Interval display
Same-day strict:
```
DD.MM.YYYY,
HH:mm - HH:mm
```
(en: `MM/DD/YYYY,` + newline + `HH:mm - HH:mm`). Cross-day: `date HH:mm – date HH:mm` with locale date order. Running: start + running indicator. Shared formatter + QA.

## Tests

**qa write** maps tests to **AC-1…AC-32**. Playwright `http://localhost:8081`. Include duration/interval unit or E2E assertions. Eng must not weaken tests.

## Follow-ups (filed, not in cast)

#25 move/resize · #26 month · #27 status filter · #28 report employee filter

## Next

Orchestrator: **ui-ux (#19)** → qa write → BE∥FE → qa verify → devops → close #18 + retro.

## Handoff notes

- **ui-ux:** `ux.md` covering FAB, GCal-lite, filters, depts/profile/charts, duration/interval display chrome, a11y, i18n key proposals.
- **qa write:** red tests AC-1…32.
- **backend-dev:** API + seed; packages if shared format util extracted.
- **frontend-dev:** apps/web + locales; formatters; make tests green.
- **qa verify:** AC matrix 1…32; leave #18 open for devops.
- **devops:** reseed + :8081; close #24 and **#18**.
