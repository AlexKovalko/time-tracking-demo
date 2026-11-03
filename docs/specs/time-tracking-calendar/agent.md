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

| Role | In/Out | Notes |
| --- | --- | --- |
| business-analyst | DONE | product.md |
| pm | DONE | agent.md |
| **ui-ux** | **IN** | handoff on #18; close related AC tickets when UX locked for them |
| **qa** write | **IN** | handoff on #18; map tests → AC issues |
| **backend-dev** | **IN** ∥ FE | handoff on #18 |
| **frontend-dev** | **IN** ∥ BE | handoff on #18 |
| **qa** verify | **IN** | AC matrix; close verified AC issues |
| **devops** | **IN** | after verify; closes parent **#18** when cast done |
| architect / security / marketer / tech-writer | **OUT** | — |

**Parallel:** only backend-dev ∥ frontend-dev (non-overlapping trees; `packages/**` → backend-dev only, no parallel FE).


## Ticket policy (user override)

- **Parent epic only for roles:** [#18](https://github.com/AlexKovalko/time-tracking-demo/issues/18)
- **Do NOT** create role/stage issues (`[time-tracking-calendar] · ui-ux|qa write|…`). Closed as not planned: #19–#24.
- **Child issues = AC tickets only**, title `AC-N …`. Roles work via cast + handoff comments on **#18**.
- In Task briefs / handoff-meta: `issue: #18`, `stage_issue: #<AC-ticket>` when working a specific AC (or comma-list when a role batch covers several).

### AC → GitHub issue map

| AC | Issue |
| --- | --- |
| AC-1 | [#32](https://github.com/AlexKovalko/time-tracking-demo/issues/32) |
| AC-2 | [#33](https://github.com/AlexKovalko/time-tracking-demo/issues/33) |
| AC-3 | [#34](https://github.com/AlexKovalko/time-tracking-demo/issues/34) |
| AC-4 | [#35](https://github.com/AlexKovalko/time-tracking-demo/issues/35) |
| AC-5 | [#36](https://github.com/AlexKovalko/time-tracking-demo/issues/36) |
| AC-6 | [#37](https://github.com/AlexKovalko/time-tracking-demo/issues/37) |
| AC-7 | [#38](https://github.com/AlexKovalko/time-tracking-demo/issues/38) |
| AC-8 | [#39](https://github.com/AlexKovalko/time-tracking-demo/issues/39) |
| AC-9 | [#40](https://github.com/AlexKovalko/time-tracking-demo/issues/40) |
| AC-10 | [#41](https://github.com/AlexKovalko/time-tracking-demo/issues/41) |
| AC-11 | [#42](https://github.com/AlexKovalko/time-tracking-demo/issues/42) |
| AC-12 | [#43](https://github.com/AlexKovalko/time-tracking-demo/issues/43) |
| AC-13 | [#44](https://github.com/AlexKovalko/time-tracking-demo/issues/44) |
| AC-14 | [#45](https://github.com/AlexKovalko/time-tracking-demo/issues/45) |
| AC-15 | [#46](https://github.com/AlexKovalko/time-tracking-demo/issues/46) |
| AC-16 | [#47](https://github.com/AlexKovalko/time-tracking-demo/issues/47) |
| AC-17 | [#48](https://github.com/AlexKovalko/time-tracking-demo/issues/48) |
| AC-18 | [#49](https://github.com/AlexKovalko/time-tracking-demo/issues/49) |
| AC-19 | [#50](https://github.com/AlexKovalko/time-tracking-demo/issues/50) |
| AC-20 | [#51](https://github.com/AlexKovalko/time-tracking-demo/issues/51) |
| AC-21 | [#52](https://github.com/AlexKovalko/time-tracking-demo/issues/52) |
| AC-22 | [#53](https://github.com/AlexKovalko/time-tracking-demo/issues/53) |
| AC-23 | [#54](https://github.com/AlexKovalko/time-tracking-demo/issues/54) |
| AC-24 | [#55](https://github.com/AlexKovalko/time-tracking-demo/issues/55) |
| AC-25 | [#56](https://github.com/AlexKovalko/time-tracking-demo/issues/56) |
| AC-26 | [#57](https://github.com/AlexKovalko/time-tracking-demo/issues/57) |
| AC-27 | [#58](https://github.com/AlexKovalko/time-tracking-demo/issues/58) |
| AC-28 | [#59](https://github.com/AlexKovalko/time-tracking-demo/issues/59) |
| AC-29 | [#60](https://github.com/AlexKovalko/time-tracking-demo/issues/60) |
| AC-30 | [#61](https://github.com/AlexKovalko/time-tracking-demo/issues/61) |
| AC-31 | [#62](https://github.com/AlexKovalko/time-tracking-demo/issues/62) |
| AC-32 | [#63](https://github.com/AlexKovalko/time-tracking-demo/issues/63) |


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

Orchestrator: **ui-ux** → qa write → BE∥FE → qa verify → devops → close #18 + retro. (AC tickets #32–#63; no role stages.)

## Handoff notes

- **ui-ux:** `ux.md`; handoff on #18; `stage_issue` = primary AC issues touched (e.g. #32–#41 chrome).
- **qa write:** red tests AC-1…32; handoff on #18.
- **backend-dev:** API + seed; handoff on #18.
- **frontend-dev:** apps/web + locales; formatters; handoff on #18.
- **qa verify:** AC matrix 1…32; close AC issues that pass; leave #18 for devops.
- **devops:** reseed + :8081; close AC-17/19/30 as applicable; close parent **#18**.
