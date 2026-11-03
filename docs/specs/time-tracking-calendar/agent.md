# Agent spec — time-tracking-calendar (#64 UX polish)

**Parent issue:** [#64](https://github.com/AlexKovalko/time-tracking-demo/issues/64)  
**Slug:** `time-tracking-calendar`  
**Product:** [`product.md`](./product.md)  
**UX:** [`ux.md`](./ux.md) (historical; no ui-ux in this cast)  
**Epic predecessor:** [#18](https://github.com/AlexKovalko/time-tracking-demo/issues/18) CLOSED  
**UI port:** **:8081** (never :8080)  
**Depth:** M  
**Status:** **USER OK** («можно делать параллельно») — run eng cast now. PM stage done.

## Goal (#64)

1. Profile charts PC-1 (AC-33…36) + employee-scoped chart API.
2. UX polish: i18n Подразделение, calendar overlap columns, report compact/pie charts, entries filter names+backend paging, delete modal Enter/Esc, profile labeled info (AC-37…43).
3. Week bucket labels locale format (AC-44).
4. UI color for charts + calendar (AC-45).

## Role cast (ordered)

```
pm (DONE) → qa write → backend-dev ∥ frontend-dev → qa verify
```

| Role | In/Out | Notes |
| --- | --- | --- |
| business-analyst | DONE | AC-33…36 in product |
| **pm** | **DONE** | this agent.md + AC issues |
| ui-ux / marketer / architect / security / devops / tech-writer | **OUT** | — |
| **qa** write | **IN** | red tests AC-33…45 |
| **backend-dev** | **IN** ∥ FE | API charts employeeId + entries filters gaps |
| **frontend-dev** | **IN** ∥ BE | web UI + locales + formatters + colors |
| **qa** verify | **IN** | AC matrix; close AC issues that pass; close parent #64 |

**Parallel:** backend-dev ∥ frontend-dev (non-overlapping trees). `packages/**` unlikely; if shared util → serialize (backend-dev owns create). FE may internally parallelize calendar vs report vs profile vs i18n but **serialize shared files** (e.g. `format.ts`, `BarChart.tsx`, locales).

## Ticket policy (#64) — user override LOCKED

- Parent epic: **#64**. Roles work via cast + handoff comments on #64 with **handoff-meta**.
- **AC child issues only:** #67–#79 (AC-33…45). Map below.
- **Do NOT** create role/stage issues titled `[time-tracking-calendar] · <role>` (qa write, backend-dev, frontend-dev, qa verify, pm, …). #80–#83 closed as not planned — do not recreate.
- Task briefs / handoff-meta: `issue: #64`; `stage_issue` = AC ticket(s) being worked, `#64`, or `n/a` / omit — never invent role-stage issues.
- Close AC issues on qa verify PASS. Close parent #64 when cast done.

### AC → GitHub issue map

| AC | Issue | Summary |
| --- | --- | --- |
| AC-33 | [#67](https://github.com/AlexKovalko/time-tracking-demo/issues/67) | Profile hours over time |
| AC-34 | [#68](https://github.com/AlexKovalko/time-tracking-demo/issues/68) | Profile description breakdown |
| AC-35 | [#69](https://github.com/AlexKovalko/time-tracking-demo/issues/69) | Profile charts period binding / empty |
| AC-36 | [#70](https://github.com/AlexKovalko/time-tracking-demo/issues/70) | Reseed supports profile charts |
| AC-37 | [#71](https://github.com/AlexKovalko/time-tracking-demo/issues/71) | RU Отдел → Подразделение |
| AC-38 | [#72](https://github.com/AlexKovalko/time-tracking-demo/issues/72) | Calendar overlap side-by-side |
| AC-39 | [#73](https://github.com/AlexKovalko/time-tracking-demo/issues/73) | Report over-time compact chart |
| AC-40 | [#74](https://github.com/AlexKovalko/time-tracking-demo/issues/74) | Report breakdown pie/donut |
| AC-41 | [#75](https://github.com/AlexKovalko/time-tracking-demo/issues/75) | Entries filter names + backend paging |
| AC-42 | [#76](https://github.com/AlexKovalko/time-tracking-demo/issues/76) | Delete modal Enter/Esc |
| AC-43 | [#77](https://github.com/AlexKovalko/time-tracking-demo/issues/77) | Profile labeled info block |
| AC-44 | [#78](https://github.com/AlexKovalko/time-tracking-demo/issues/78) | Week bucket label format |
| AC-45 | [#79](https://github.com/AlexKovalko/time-tracking-demo/issues/79) | Charts + calendar UI colors |

## Ownership

| Zone | Owner |
| --- | --- |
| `apps/api` | backend-dev only |
| `apps/web` | frontend-dev only |
| Locale JSON ru/en | **frontend-dev only** |
| `apps/web/src/lib/format.ts` | frontend-dev (week labels AC-44 + existing duration/interval) |
| `packages/**` | none expected; if needed backend-dev then FE (sequential) |
| Port | :8081 |

## Soft defaults

1. Profile charts between stats and entries table
2. Description breakdown top-N = **8** (+ Other bucket)
3. pageSize default **20**
4. Calendar entry color: stable hash of employeeId (or entry id fallback)
5. Chart palette: CSS variables, distinct segments, light/dark OK
6. Week label formatter in `apps/web/src/lib/format.ts` (confirm in FE handoff)

## API contract (backend-dev; FE consumes)

### Employee-scoped charts (AC-33…36)

Prefer extend existing:

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/reports/charts` | Add optional `employeeId`. When set: org-wide breakdown may be omitted; return `overTime` (day\|week via `bucket`) + `descriptionBreakdown` (top-N≈8, empty→Untitled key). `from`/`to` required. `q` does **not** apply. |
| alt | `GET /api/employees/:id/charts` | Same payload shape if cleaner — pick one; document in handoff |

### Report org-wide charts (AC-27…29 + visual AC-39/40)

Existing `GET /api/reports/charts` without employeeId unchanged data-wise. FE changes visuals.

### Entries list (AC-41)

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/time-entries` | Must support `page`,`limit`,`employeeId`,`q`,`from`,`to` + total. Fix gaps if missing. Response includes employee **name** (or FE joins from employees list — prefer DTO with name for filter display). |

### Seed (AC-36)

Force reseed keeps density for profile description buckets + chart series.

## UI boundaries (frontend-dev)

- EmployeeProfile: charts AC-33…35, labeled info AC-43, week labels AC-44
- ReportSection: compact over-time AC-39, pie AC-40, week labels AC-44, colors AC-45
- EntriesSection / calendar: overlap columns AC-38, colors AC-45, filter names+paging AC-41, delete modal AC-42
- Locales: AC-37
- formatWeekBucketLabel (or similar) in `lib/format.ts` — AC-44
- BarChart / new PieChart: colored segments AC-45

## Acceptance (this ticket)

**AC-33…45** as in `product.md`. AC-1…32 stable / non-regression where touched.

## Tests

qa write: red tests mapped to AC-33…45. Playwright against `http://localhost:8081`. Eng must not weaken tests.

## Next

Orchestrator: **qa write** → **backend-dev ∥ frontend-dev** → **qa verify** → close #64 + closeout retro.
