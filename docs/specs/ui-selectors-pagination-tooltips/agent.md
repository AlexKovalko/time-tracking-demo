# Agent spec — ui-selectors-pagination-tooltips

**Issue (parent epic):** [#84](https://github.com/AlexKovalko/time-tracking-demo/issues/84)  
**Slug:** `ui-selectors-pagination-tooltips`  
**Product:** `docs/specs/ui-selectors-pagination-tooltips/product.md`  
**App surface:** `apps/web` (Vite React dashboard — **not** `apps/dashboard`)  
**Related closed:** [#64](https://github.com/AlexKovalko/time-tracking-demo/issues/64)  
**Depth:** M  
**Status:** planning — **STOP for user OK** («можно начинать?») before ui-ux / qa / eng  
**agentmemory:** unavailable for this run — skipped (no `memory_save` / `memory_recall`)

## Goal

Dashboard UI polish batch (no domain-model change):

1. Fix department **Select** in create/edit employee Dialog (keep Select, not Combobox)
2. Pagination page sizes **10 / 20 / 50**, default **20**, Prev/Next + range
3. Profile charts — category/value via **tooltips** (reduce axis clutter)
4. Time entries employee filter — client **Combobox/typeahead** over `listAllEmployees`
5. New/edit time entry employee field — same Combobox pattern
6. Reports charts — labels via **tooltips** (aligned with profile)

Non-regression: employee/entry CRUD, timer, reports/CSV, i18n ru/en, theme, API `limit` 1–50.

## Role cast

### Ordered cast (full history)

1. **business-analyst** — done (`product.md`, AC-1…AC-6, locked recommendations)
2. **pm** — this doc + AC child issues + parent handoff; **STOP for user «можно начинать?»**
3. *(after user OK only)* **ui-ux** — brief UX contract: Combobox (filter + form), PaginationBar page-size control, chart tooltip (hover/focus/tap) a11y
4. **qa** `phase: write` — failing tests mapped to **AC-1…AC-6** (+ light non-regression smoke)
5. **frontend-dev** — implement in `apps/web` (+ `packages/**` only if needed); make QA tests green without weakening them
6. **qa** `phase: verify` — re-run; AC matrix `AC-N → pass|fail|gap`; close passed AC children; close parent **#84** when PASS (no later cast roles)

**Cast line (after user OK):**  
`ui-ux → qa write → frontend-dev → qa verify`

### In / out

| Role | In/out | Why |
| --- | --- | --- |
| business-analyst | done | Product locked; grill not required |
| pm | this stage | Cast + `agent.md` + AC children; wait for user OK |
| **ui-ux** | **IN** | Brief contract for Combobox / pagination / chart tooltips (touch + a11y) |
| **qa write** | **IN** | Red tests before eng (`docs-before-code`) |
| **frontend-dev** | **IN** | Sole eng owner — `apps/web` + locale JSON |
| **qa verify** | **IN** | AC matrix; close AC children + parent #84 |
| backend-dev | **OUT** | Client Combobox + existing `limit`≤50 suffice; server `q` → follow-up [#91](https://github.com/AlexKovalko/time-tracking-demo/issues/91) |
| architect | **OUT** | No new cross-layer boundaries; FE-only polish |
| marketer | **OUT** | No sellability/landing; copy proposals stay in ui-ux docs if any; locale JSON = FE |
| security | **OUT** | No auth/oauth/webhooks/PII/new public endpoints |
| devops | **OUT** | No infra/env/deploy change |
| tech-writer | **OUT** | No CODEMAP/ops/public API docs required for this polish |

**Parallel marks:** none — single FE tree; sequential stages.

### Ticket policy (LOCKED)

- **Parent epic:** #84 only for role coordination (handoff comments on parent).
- **AC child issues:** one per `AC-N` (map below). Roles close AC children on PASS (typically qa verify).
- **Do NOT** create role/stage GitHub issues (`[<slug>] · qa write`, `frontend-dev`, etc.).
- Task briefs: `issue: #84`; `stage_issue:` = AC ticket(s) being worked, `#84`, or `n/a`.

### AC → issue map

| AC | Issue | Title (short) |
| --- | --- | --- |
| AC-1 | [#85](https://github.com/AlexKovalko/time-tracking-demo/issues/85) | Department selector in create/edit employee Dialog |
| AC-2 | [#86](https://github.com/AlexKovalko/time-tracking-demo/issues/86) | Pagination page sizes 10/20/50 default 20 |
| AC-3 | [#87](https://github.com/AlexKovalko/time-tracking-demo/issues/87) | Profile charts labels via tooltips |
| AC-4 | [#88](https://github.com/AlexKovalko/time-tracking-demo/issues/88) | Time entries employee filter Combobox/typeahead |
| AC-5 | [#89](https://github.com/AlexKovalko/time-tracking-demo/issues/89) | New time entry employee Combobox selector |
| AC-6 | [#90](https://github.com/AlexKovalko/time-tracking-demo/issues/90) | Reports charts labels via tooltips |

### Eng / packages / i18n owners

| Zone | Owner |
| --- | --- |
| `apps/web` | **frontend-dev** |
| `apps/api` | **Do not change** in this cast (BE search deferred to #91) |
| `packages/**` | **frontend-dev** if touched (dashboard-facing); prefer `apps/web` only |
| Locale JSON (`ru` / `en`) | **frontend-dev only** (ui-ux may propose copy in `docs/specs/ui-selectors-pagination-tooltips/`) |

## Implementation contract

### Locked product defaults (from BA)

1. **AC-1 Department:** Fix **Select** in Dialog (portal/positioning, placeholder, «no department» sentinel, orphan `departmentId` safe fallback). Not Combobox.
2. **AC-2 Pagination:** Sizes **10 / 20 / 50**; default **20**; Prev/Next + range; size change → `limit` + **page = 1**; API cap **50** unchanged. Session-persist size = nice-to-have, not required for PASS.
3. **AC-3 / AC-6 Charts:** Reduce dense axis/legend clutter; full category + formatted value in **tooltip** (hover + focus; tap on touch). Align profile + report visual language (`CompactBarChart` and related).
4. **AC-4 / AC-5 Employees:** Shared **searchable Combobox** UX (filter + form); client-side filter over `listAllEmployees` (or equivalent full list); clear / empty / no-results; Escape without unexpected value replace; i18n. Shared `EmployeeCombobox` vs inline = **eng decision**; product requires same UX.
5. **BE:** Not in cast. Do not raise `limit` max > 50. Do not implement `GET /employees?q=` here → [#91](https://github.com/AlexKovalko/time-tracking-demo/issues/91).

### API / UI boundaries

| Area | Boundary |
| --- | --- |
| Employee Combobox | **FE-only** over existing list-all employees API |
| Pagination | FE passes chosen `limit` (1–50); reuse existing list endpoints |
| Charts | FE SVG/components only |
| Department Select | FE Dialog + Select fix only |
| New public API / auth | **Out** |

If an unexpected API gap blocks an AC → post `## blocker` on #84; do **not** silently expand cast to backend-dev without PM/user update.

### Non-regression

QA verify must smoke: employee/entry CRUD, timer, report/CSV, theme, locale ru/en, existing pagination Prev/Next still works with new sizes.

### Tests

Owned by **qa** (`write` then `verify`). Map new/changed tests to **AC-1…AC-6**. Eng makes green without deleting/weakening assertions.

### Docs

tech-writer **out**. FE may touch locale keys only as needed. If CODEMAP drifts → follow-up issue, not silent TODO.

## Acceptance criteria (done)

Mirror of `product.md` — **do not renumber**.

### AC-1 — Department selector (create/edit employee)

- In create/edit employee Dialog, department Select **opens and allows** choosing a department or «no department».
- Placeholder / empty state clear; selected value visible after choose.
- Save with «no department» → `departmentId: null`; with department → correct id.
- Orphan / unknown `departmentId` does not break the form (safe fallback; no silent wrong name).
- Keyboard: Select remains usable (focus, open, choose) inside Dialog.

### AC-2 — Pagination page sizes

- Page-size control offers **10, 20, 50** (i18n); default **20**.
- Changing size reloads with new `limit`, **page = 1**, range summary updates.
- Prev/Next disabled states consistent with `limit` and `total`.
- Do not offer size > 50 without API change (cap unchanged this package).
- Session-persist of size is optional (not required for PASS).

### AC-3 — Profile charts: labels via tooltips

- Dense long axis labels no longer clutter profile charts (`CompactBarChart` / related).
- Hover/focus (and tap on touch) shows **category + value** in tooltip.
- Empty chart state preserved; day/week bucket formats not regressed.

### AC-4 — Time entries: employee filter typeahead

- Employee filter is **Combobox/typeahead**, not a broken plain Select.
- Options filter client-side over loaded employees list.
- Selection applies entries filter; clear resets employee filter.
- No-results and loading/empty list states explicit (i18n).

### AC-5 — New time entry: employee selector

- Create (and edit if same control) uses the **same searchable Combobox** pattern as AC-4.
- Required-employee validation not weakened.
- Choosing commits employee id; Escape/dismiss without selection does not unexpectedly replace an already selected value.

### AC-6 — Reports charts: labels via tooltips

- Report charts: readable chart + **tooltip** (category + value) instead of dense axis/legend labels.
- Visual language consistent with profile (AC-3).
- Empty / no-data states without regression.

## Out of scope

- New design system / replace all Selects app-wide
- Numbered pagination, infinite scroll, `limit` > 50
- Server-side employee search (see #91)
- Rewriting charts on a third-party library
- Timer/permissions/CSV/calendar domain rule changes
- Role-stage GitHub issues

## Follow-ups (filed, not in cast)

| Topic | Issue | Notes |
| --- | --- | --- |
| Server employee search `GET /employees?q=` | [#91](https://github.com/AlexKovalko/time-tracking-demo/issues/91) | Deferred from BA; reopen BE cast only if product expands |
| Numbered pagination | — | Product OOS; file later if requested |
| Session-persist page size | — | Nice-to-have; eng may do without new issue if trivial |

## Waiting for

**User OK** («ок» / «можно начинать?» / «делай») before launching cast after pm: **ui-ux → qa write → frontend-dev → qa verify**.  
PM/orchestrator must **not** authorize production code until then.
