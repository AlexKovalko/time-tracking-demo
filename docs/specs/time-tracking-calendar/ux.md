# UX / UI contract — time-tracking-calendar

**Issue:** [#18](https://github.com/AlexKovalko/time-tracking-demo/issues/18)  
**Slug:** `time-tracking-calendar`  
**Project:** Time Tracking Demo (`time-tracking-demo`) — **not Queply**  
**Role:** ui-ux  
**Status:** done — contract for qa write / frontend-dev / backend-dev  
**Sources:** `product.md`, `agent.md`, predecessor `docs/specs/time-tracking-ui/ux.md`, baseline `docs/specs/time-tracking/ux.md`  
**UI port:** **:8081** (never :8080)  
**Marketer:** out of cast — copy keys + RU/EN suggested here; **locale JSON owned by frontend-dev only**  
**AC tickets locked by this UX:** #32–#42 (AC-1…11 chrome/calendar/filters), #51–#52, #54–#59 (AC-20…21, 23–28), #62–#63 (AC-31…32). Seed/API/port AC (#43–#50, #53, #60–#61) referenced for UI readiness, not layout invention.

---

## 1. Primary user job

Один оператор (без логина) ведёт учёт времени в cabinet с разделами: Employees (люди + departments) → FAB-таймер на любом экране → Time entries (List ∥ **GCal-lite** Week/Day) → Report (таблица + CSV + **2 charts**) → Employee **profile**. Тема light/dark, locale ru/en.

**Happy path:** :8081 → Employees (seed ФИО) → FAB Start → Stop → Entries Calendar drag-create → Report charts ненулевые → открыть профиль сотрудника → stats + filtered entries.

**Supersedes from `time-tracking-ui`:**
- Always-expanded sticky timer → **FAB icon → panel on click** (AC-1…3)
- Week day-cards without hour grid → **Week|Day hour grid + drag-select create** (AC-5…9)
- Employee name-only → **department + profile fields + dedicated profile route** (AC-20…26)
- Report table-only → **+ 2 chart surfaces** (AC-27…29)
- Ad-hoc duration/interval strings → **shared formatters** (AC-31…32)

**Non-regression:** max-one-running, hide/restore/stop-collapsed + first-hide confirm, CRUD dialogs, Report+CSV, theme/locale, routes `/employees` `/entries` `/report`, port :8081 — from baseline + `time-tracking-ui`.

---

## 2. Information architecture

### Routes (locked)

| Path | Section | Nav | Notes |
| --- | --- | --- | --- |
| `/employees` | Employees | `nav.employees` | Default `/` redirect. **Tabs:** People (default) \| Departments |
| `/employees/:id` | Employee profile | — | Dedicated profile (AC-24…26). Not a modal-only surface |
| `/entries` | Time entries | `nav.entries` | List ∥ Calendar; filters + pagination |
| `/report` | Report | `nav.report` | Period + totals + CSV + **2 charts** |

- **Primary nav stays 3 items** (horizontal header). Do **not** add top-level «Departments».
- **Departments placement (locked):** tab **Departments** on `/employees` (`employees.tabs.people` / `employees.tabs.departments`). Minimal CRUD lives here — not a separate nav item, not buried only inside employee modal.
- Sticky/FAB timer + app chrome **outside** route outlet.

### App shell wireframe

```
┌──────────────────────────────────────────────────────────┐
│ Chrome: title | Nav (3) | theme | locale                 │
├──────────────────────────────────────────────────────────┤
│  Route outlet                                            │
│                                                          │
│                                      ┌──┐                │
│                                      │FAB│  ← icon/badge │
│                                      └──┘                │
│                           (panel overlays when open)     │
└──────────────────────────────────────────────────────────┘
```

| Zone | Behavior |
| --- | --- |
| Chrome | Sticky top `z-40`; brand + horizontal nav + theme + locale (unchanged from UI shell) |
| Main | Prefer **wider** content for calendar: `max-w-7xl` or full content width on `/entries` calendar mode; lists/report may keep `max-w-6xl`. One `h1` per route |
| FAB | Fixed bottom-right `z-50`; panel portals above content |

### Visual language

Reuse shadcn/ui + Tailwind (neutral, destructive delete). No new brand. Light/dark via existing theme. WCAG AA. Charts: readable bars, not decorative gradients/glow.

### What FE must NOT invent

- Top persistent Toggl timer bar; always-open sticky panel as default idle chrome
- 4th primary nav «Departments» / org-chart page
- Month view, edge-resize, drag-move existing entries, 5-day workweek toggle
- Status filter (running/closed) — follow-up #27
- 3rd+ chart surface, pie-as-required, heatmaps, utilization
- Auth, projects, tags, billable
- UUID / raw id as **visible** select labels or list primary text
- Port **:8080**
- Locale JSON edits by non-frontend roles
- Weakening duration/interval rules for «prettier» one-line same-day

---

## 3. FAB timer (AC-1…AC-4)

### Placement & chrome

- **Idle (panel closed):** only **FAB/icon** bottom-right (`fixed bottom-4 right-4` + safe-area). Panel **not** always expanded (supersedes UI-shell sticky panel).
- **Click FAB** → open panel (employee select, description, Start / running controls).
- **Close / minimize** (FAB again, Escape, or panel collapse control) → panel hides; **does not** require Stop.
- Max width panel ~ `min(22rem, calc(100vw - 2rem))`. Reserve `pb-24` on main so lists aren’t permanently covered.

### Running without open panel (AC-3)

| Signal | Requirement |
| --- | --- |
| Badge / ring on FAB | Visible «running» affordance (dot, pulse-once OK, or count `1`) |
| Elapsed on FAB | Show compact elapsed **or** include in `aria-label` + short text on FAB; preferred: small elapsed under/ beside icon when running and panel closed |
| Panel open | Full: employee context, description, live `hh:mm:ss` (`timer-elapsed`), Stop, Hide |

### Behavioral contract (baseline adapted)

| Rule | UX |
| --- | --- |
| Max one running per employee | Start failure → inline `role="alert"` in **panel** (`timer-already-running-error`); do not silent-fail |
| Hide | First Hide → AlertDialog (End session / Hide timer / Cancel); persist `hideConfirmDone` |
| After Hide | Panel closed; FAB shows running badge/elapsed; **Restore** = open panel (or restore expanded state) |
| Stop from collapsed | Stop reachable from panel **and** from running-FAB overflow/menu **or** long-press — **minimum:** open panel via FAB then Stop; preferred: running FAB click opens panel with Stop primary. Optional compact popover with Stop — OK if a11y labeled |
| Live elapsed | Text update; **no** per-tick `aria-live` |

### States

| State | Chrome |
| --- | --- |
| `idle-closed` | FAB only (`timer-fab`) |
| `idle-open` | FAB + panel Start form |
| `running-closed` | FAB with badge/elapsed; panel hidden |
| `running-open` | FAB + panel Stop/Hide/elapsed |
| `hide-confirm-open` | AlertDialog above |

### Mobile

- Desktop-first drag calendar; FAB same corner.
- Prefer panel as sheet/card; do not cover primary CTAs permanently — close control always visible.
- Touch: FAB 44×44px min hit target.

### testids

| testid | Element |
| --- | --- |
| `timer-fab` | FAB / icon button (closed chrome) |
| `timer-panel` | Open panel root |
| `timer-employee-select` | Employee select (labels = **names**) |
| `timer-description-input` | Description |
| `timer-start-button` / `timer-stop-button` | Actions |
| `timer-elapsed` | Live elapsed in panel |
| `timer-hide-button` / `timer-restore-button` | Hide / restore |
| `timer-fab-badge` | Running indicator on FAB (optional if elapsed text on FAB is enough — then mark elapsed container) |
| `timer-already-running-error` | Alert |
| `timer-hide-confirm` (+ `-end` / `-hide`) | Confirm dialog |

Reuse prior `timer-launcher` / `timer-collapsed` only if FE maps them as aliases; **canonical for this slug:** `timer-fab` + `timer-panel`.

---

## 4. GCal-lite calendar (AC-5…AC-10)

### Layout

- Calendar occupies **full width** of main content zone in Calendar mode (AC-5) — not a narrow card column.
- Dual view toggle **Calendar | List** preserved (`entries-view-calendar` / `entries-view-list`).
- Default mode on first visit: **Week** (soft lock). Persist view optional (`time-tracking-demo.entries.view`).

### Toolbar

```
[List | Calendar]   [Week | Day]   [←] [Today] [→]   period label
[+ Add entry]       filters row (see §5)
```

| Control | testid | Behavior |
| --- | --- | --- |
| Week / Day | `entries-mode-week`, `entries-mode-day` | Mode switch; fetch visible range |
| Prev / Next | `entries-period-prev`, `entries-period-next` | Shift by 1 week or 1 day |
| Today | `entries-period-today` | Jump to week containing today / today day |
| Period label | `entries-period-label` | Human range text |

**Deprecation note:** prior `entries-week-prev|next|current` may remain as aliases; prefer new period-* ids for Day+Week.

### Hour grid (AC-7)

```
        Mon 3   Tue 4   …   Sun 9     (Week)
 08:00  ┌─────┬─────┬─────┬─────┐
 09:00  │ blk │     │ blk │     │
 …      └─────┴─────┴─────┴─────┘

Day: single column + denser hour labels
```

- Vertical **hour axis** (at least 00–23 or business 06–22 with scroll for rest — eng OK if full 24h scrollable).
- Entries = **positioned blocks** by start + duration (not day-chip stacks only).
- Overlap: side-by-side or slight indent; truncate title; tooltip/`title` with full description + interval.
- Block label: employee name + description truncate + duration via **formatDuration** (AC-31).
- Interval in edit dialog / list: **formatInterval** (AC-32).

### Drag-select create (AC-8)

- **Desktop:** pointer drag on **empty** grid → rubber-band range → on release open **create Dialog** with start/end **prefilled**; Save → block appears; Cancel → no create.
- Snap: prefer 15-min; eng may use 15 or 30 — document in FE handoff; not a separate AC.
- **Mobile / no-drag:** click empty slot → create dialog with start = slot, end = start+1h (or same dialog via **Add entry**). Satisfies create path without drag AC on touch.
- Do **not** require edge-resize or drag-move (follow-ups #25).

### Click entry (AC-9)

- Click / Enter on block → edit Dialog (view fields + Save / Delete). Delete → AlertDialog.

### Empty (AC-10)

- Empty day/week: `entries.calendar.empty` inside calendar region — not error/crash.
- List empty: `entries.empty`.

### Data fetch

- Calendar loads **visible range only** (`from`/`to` of Week or Day) — no pagination UI on calendar.
- List uses pagination (§5). Same **filters** (employee, period, text) apply to both where applicable: Calendar period nav **is** the period filter when in calendar mode; List may show from/to inputs aligned with filter bar.

### Calendar testids

| testid | Element |
| --- | --- |
| `entries-calendar` | Grid root |
| `entries-calendar-block-{id}` | Entry block |
| `entries-drag-select` | Active selection overlay (optional) |
| `entries-empty` | Empty state |

---

## 5. Filters & pagination (AC-11…AC-13)

### Filter bar (Time entries — List mandatory; Calendar applies employee + text when set)

| Filter | Control | Notes |
| --- | --- | --- |
| Employee | Select: All + names | **Never UUID labels** (AC-14) |
| Period from/to | Date inputs | List: explicit; Calendar: driven by Week/Day nav (keep from/to in sync or hide duplicate when Calendar — prefer single source: nav updates filter state) |
| Description `q` | Text input | Contains; empty = no text filter |
| Apply | Button **or** debounce auto-apply | Either OK; document; Clear filters control recommended |

**Profile** reuses period + description only (employee fixed) — see §8.

### Pagination

| List | Default | UI |
| --- | --- | --- |
| Time entries | `pageSize` **20** (clamp 10–50) | Prev/Next **or** page numbers **or** Load more — pick one pattern and keep for employees |
| Employees | same | Show when `total > pageSize`; API must support even if one page |

- Changing page **must not** reset filters unless user Clears.
- Show range hint: `pagination.range` e.g. «1–20 of 47».

### testids

| testid | Element |
| --- | --- |
| `entries-filter-employee` | Employee filter |
| `entries-filter-from` / `entries-filter-to` | Period |
| `entries-filter-q` | Description search |
| `entries-filter-apply` | Apply (if not auto) |
| `entries-filter-clear` | Clear |
| `entries-pagination` | Pagination root |
| `employees-pagination` | Employees pagination |
| `entries-list` / `employees-list` | List roots |

---

## 6. Names ≠ UUID (AC-14, AC-15)

**Hard rule:** every employee **Select** and list primary label shows **human name (ФИО)**.

| Surface | Display |
| --- | --- |
| Timer select | `employee.name` |
| Entries filter select | name |
| Entry create/edit employee select | name |
| Calendar blocks / list rows | name |
| Charts breakdown (employees) | name |
| Department assign select on employee form | department **name** |
| Fallback if name missing | em dash / `employees.unnamed` — **never** raw UUID as the intended label |

QA: assert visible text is name-like, not UUID regex.

---

## 7. Departments CRUD (AC-20…AC-22) — placement locked

### Placement

On `/employees`, **Tabs**:

1. **People** (default) — employee list + Add employee  
2. **Departments** — minimal CRUD list  

```
[Employees h1]
[ People | Departments ]     ← tabs
  People: [Add employee] list…
  Departments: [Add department] list…
```

**Why not top nav:** keeps 3-item chrome; departments are supporting entity for employees/charts.

### Departments tab flows

| Flow | UI |
| --- | --- |
| List | Name + Edit + Delete |
| Create | Dialog: name required |
| Rename | Dialog or inline |
| Delete | AlertDialog; enable only if unused **or** after confirm that assignments will block — follow API rule (delete only if unused). Disabled delete + tooltip if in use |

### Employee modal fields (AC-21) — People tab

| Field | Required | Control |
| --- | --- | --- |
| name | yes | Input |
| departmentId | no | Select departments + «Без отдела» (`employees.department.none`) |
| title | no | Input |
| email | no | Input; client validate format if non-empty |
| phone | no | Input free string |

### Employee list secondary (AC-23)

Each row: **primary** = name; **secondary** = department name and/or title (at least one). Example: `Иванов Иван` + muted `Engineering · Senior Dev`. Never UUID.

### Departments testids

| testid | Element |
| --- | --- |
| `employees-tab-people` / `employees-tab-departments` | Tabs |
| `departments-list` | List |
| `departments-add-open` | Open create |
| `departments-name-input` | Name field |
| `departments-add-button` | Save create |
| `employee-department-select` | On employee dialog |
| `employee-title-input` / `employee-email-input` / `employee-phone-input` | Profile fields |
| `employee-row-secondary` | Secondary signal container (or per-row) |

---

## 8. Employee profile page (AC-24…AC-26)

### Route

`/employees/:id` — full page (not modal-only).

**Entry points:** row click **or** explicit «Open profile» / name link on People list. Edit/Delete remain available (row actions or profile header menus) without removing list CRUD.

### Structure

```
[← Back to employees]
[Header: FIO]
  title · department
  email · phone          ← omit empty optionals; no fake placeholders / UUIDs
[Period from/to] [q description] [Apply]
[Stats: total duration | entry count]
[Entries list — this employee only]
  empty state if none
```

| Block | Rules |
| --- | --- |
| Header | name required visible; dept/title/contacts if present |
| Stats (AC-25) | At least **total duration** (`formatDuration`) **and/or** entry count for selected period; seed → non-zero with suitable period |
| Entries (AC-26) | Filters: **from/to + q** only; employee fixed (no employee select). Pagination OK if long |
| Empty | `profile.entries.empty` / `profile.stats.empty` — not crash |
| Duration/interval in rows | AC-31 / AC-32 |

### Profile testids

| testid | Element |
| --- | --- |
| `employee-profile` | Page root |
| `employee-profile-back` | Back link |
| `employee-profile-name` | Header name |
| `employee-profile-stats` | Stats region |
| `employee-profile-filter-from` / `-to` / `-q` | Filters |
| `employee-profile-entries` | List |
| `employee-profile-empty` | Empty |

---

## 9. Charts on Report (AC-27…AC-29)

### Placement

`/report` **above or beside** existing tabular totals — same period controls (`report-from` / `report-to`). **Exactly 2 surfaces:**

1. **Hours over time** (AC-27) — bar by **day**; toggle → **week** buckets  
2. **Hours breakdown** (AC-28) — bar; toggle **Employees | Departments**

```
[Report h1]
[from] [to] [Export CSV]
[Hours over time]  [Day | Week]
  [======== bar chart ========]
[Hours breakdown]  [Employees | Departments]
  [======== bar chart ========]
[Totals table…]
[Entries…]
```

| Rule | UX |
| --- | --- |
| Shared period | Charts use same from/to as report table |
| Seed | Visible non-zero series; ≥2 employees & ≥2 depts on suitable period |
| Unassigned | Bucket label `charts.unassigned` («Без отдела» / Unassigned) |
| Empty period (AC-29) | Empty state in chart region — no crash; table/CSV still work |
| Library | Recharts / Chart.js / CSS bars — eng choice; must be keyboard-focusable summary or text alternative |

### Chart a11y

- Each chart in a region with `aria-label` from i18n  
- Toggle groups: `aria-pressed` / `role="group"`  
- Provide **text summary** or data table toggle optional; minimum: non-color-only (axis labels + values on bar or tooltip + sr text)

### Charts testids

| testid | Element |
| --- | --- |
| `report-chart-over-time` | Surface 1 |
| `report-chart-over-time-day` / `-week` | Bucket toggle |
| `report-chart-breakdown` | Surface 2 |
| `report-chart-breakdown-employees` / `-departments` | Breakdown toggle |
| `report-chart-empty` | Empty state |
| Existing | `report-from`, `report-to`, `report-totals`, `report-entries`, `report-export-button`, `report-empty` |

---

## 10. Duration display — AC-31

### Shared util

- **One** FE helper e.g. `formatDuration(totalSeconds, locale)` used **everywhere** durations show: list, calendar blocks, profile stats, report totals, timer optional compact (timer live may stay `hh:mm:ss` — **locked exception:** live running clock stays `hh:mm:ss`; **closed** durations use AC-31).
- CSV human-readable duration column (if present): same algorithm on BE or shared package.
- Unit tests required (qa write).

### Rules

| Case | ru | en |
| --- | --- | --- |
| Hours only | `48ч` | `48h` |
| Hours + minutes | `4ч 20м` | `4h 20m` |
| Minutes + seconds (no hours) | `2м 5с` | `2m 5s` |
| Seconds only | `45с` | `45s` |
| Zero | `0с` | `0s` |
| Skip zero higher parts | no `0ч` / `0h` prefix | same |

Join parts with single space. No empty string for zero.

### i18n suffixes (keys)

| Key | RU | EN |
| --- | --- | --- |
| `duration.suffix.hours` | ч | h |
| `duration.suffix.minutes` | м | m |
| `duration.suffix.seconds` | с | s |

Util may hardcode suffixes from locale map reading these keys — FE must not scatter literals.

---

## 11. Interval display — AC-32

### Shared util

`formatInterval(start, end | null, locale)` → `string` (may include `\n` for same-day).

### Same calendar day (strict)

```
DD.MM.YYYY,
HH:mm - HH:mm
```

- Line 1: date + **comma**  
- Line 2: times with hyphen-minus ` - ` (spaces around)  
- **ru:** `DD.MM.YYYY`  
- **en:** `MM/DD/YYYY` (not ISO)

UI: preserve newline (CSS `whitespace-pre-line` on cell / block subtitle).

### Cross-day

One compact line (en date order as above):

- ru: `DD.MM.YYYY HH:mm – DD.MM.YYYY HH:mm`  
- en: `MM/DD/YYYY HH:mm – MM/DD/YYYY HH:mm`  
- Use en-dash `–` between ends (or document ASCII `-` if font issues — prefer `–`).

### Running (no end)

- Show start date/time + running indicator; **do not** invent end.  
- Suggested: same-day style line1 date, line2 `HH:mm - …` with `entries.interval.running` / or single line + badge «Running».  
- Eng documents exact string in handoff; QA asserts no fake end time.

### Where applied

List rows, profile entries, report entry rows, calendar edit dialog summary, anywhere start–end is shown as text (calendar block may show duration-only for density — dialog/list must use interval formatter).

---

## 12. Accessibility checklist

| Area | Requirement |
| --- | --- |
| Nav | `nav` landmark; `aria-current="page"` |
| Headings | One `h1` per route; profile name as `h1` |
| FAB | Accessible name: idle `timer.fab.open`; running includes employee + elapsed |
| Panel | Focus trap optional; Esc closes panel (not Stop); restore focus to FAB |
| Labels | All inputs/selects labelled via i18n |
| Dialogs | Focus trap; Esc = Cancel |
| Hide confirm | `role="alertdialog"` |
| Already-running | `role="alert"`; not color-only |
| Live elapsed | No per-tick live region |
| Calendar | Keyboard: arrows optional; blocks activatable (button/link); drag not required for keyboard — provide Add entry |
| Drag | Announce create dialog on release; don’t rely on drag alone for a11y path |
| Charts | Named regions; toggles pressed state; empty not color-only |
| Lists / pagination | Controls named; status of page in text |
| Theme | Focus rings light/dark; AA contrast |
| Locale | `lang` on `<html>` |
| Touch | FAB ≥ 44px; don’t block profile Back |

---

## 13. Motion

- FAB panel: 150–200ms fade/scale — optional  
- Charts: no continuous animation; short bar mount OK  
- No decorative calendar motion  
- Drag rubber-band: light opacity fill only  

---

## 14. i18n key list (proposed deltas)

Keep `time-tracking-ui` + baseline keys. **New / changed** for this slug:

### Timer FAB

| Key | RU | EN |
| --- | --- | --- |
| `timer.fab.open` | Открыть таймер | Open timer |
| `timer.fab.close` | Закрыть панель таймера | Close timer panel |
| `timer.fab.running` | Таймер идёт: {{name}}, {{elapsed}} | Timer running: {{name}}, {{elapsed}} |
| `timer.panel.title` | Таймер | Timer |

### Entries / calendar / filters

| Key | RU | EN |
| --- | --- | --- |
| `entries.mode.week` | Неделя | Week |
| `entries.mode.day` | День | Day |
| `entries.mode.aria` | Режим календаря | Calendar mode |
| `entries.period.prev` | Назад | Previous |
| `entries.period.next` | Вперёд | Next |
| `entries.period.today` | Сегодня | Today |
| `entries.filter.employee` | Сотрудник | Employee |
| `entries.filter.employeeAll` | Все сотрудники | All employees |
| `entries.filter.from` | С | From |
| `entries.filter.to` | По | To |
| `entries.filter.q` | Описание | Description |
| `entries.filter.apply` | Применить | Apply |
| `entries.filter.clear` | Сбросить | Clear |
| `entries.calendar.empty` | Нет записей за этот период | No entries for this period |
| `entries.empty` | Записей нет | No entries |
| `entries.dragCreate.hint` | Выделите диапазон, чтобы создать запись | Drag a range to create an entry |
| `pagination.range` | {{from}}–{{to}} из {{total}} | {{from}}–{{to}} of {{total}} |
| `pagination.prev` | Назад | Previous |
| `pagination.next` | Далее | Next |
| `pagination.loadMore` | Загрузить ещё | Load more |

### Departments / employees

| Key | RU | EN |
| --- | --- | --- |
| `employees.tabs.people` | Сотрудники | People |
| `employees.tabs.departments` | Отделы | Departments |
| `employees.department` | Отдел | Department |
| `employees.department.none` | Без отдела | No department |
| `employees.titleField` | Должность | Title |
| `employees.email` | Email | Email |
| `employees.phone` | Телефон | Phone |
| `employees.unnamed` | Без имени | Unnamed |
| `employees.openProfile` | Профиль | Profile |
| `departments.title` | Отделы | Departments |
| `departments.addOpen` | Добавить отдел | Add department |
| `departments.createTitle` | Новый отдел | New department |
| `departments.editTitle` | Переименовать отдел | Rename department |
| `departments.empty` | Отделов пока нет | No departments yet |
| `departments.deleteBlocked` | Нельзя удалить: есть сотрудники | Cannot delete: employees assigned |
| `departments.name` | Название | Name |

### Profile

| Key | RU | EN |
| --- | --- | --- |
| `profile.back` | К списку сотрудников | Back to employees |
| `profile.stats.totalDuration` | Всего времени | Total time |
| `profile.stats.entryCount` | Записей | Entries |
| `profile.stats.empty` | Нет данных за период | No data for this period |
| `profile.entries.empty` | Нет записей по фильтру | No entries match filters |

### Charts

| Key | RU | EN |
| --- | --- | --- |
| `charts.overTime.title` | Часы по времени | Hours over time |
| `charts.overTime.day` | По дням | By day |
| `charts.overTime.week` | По неделям | By week |
| `charts.breakdown.title` | Разбивка часов | Hours breakdown |
| `charts.breakdown.employees` | Сотрудники | Employees |
| `charts.breakdown.departments` | Отделы | Departments |
| `charts.empty` | Нет данных для графика за период | No chart data for this period |
| `charts.unassigned` | Без отдела | Unassigned |
| `charts.a11y.overTime` | Диаграмма часов по времени | Hours over time chart |
| `charts.a11y.breakdown` | Диаграмма разбивки часов | Hours breakdown chart |

### Duration / interval

| Key | RU | EN |
| --- | --- | --- |
| `duration.suffix.hours` | ч | h |
| `duration.suffix.minutes` | м | m |
| `duration.suffix.seconds` | с | s |
| `entries.interval.running` | идёт | running |

---

## 15. AC ↔ UX matrix

| AC | UX coverage |
| --- | --- |
| AC-1 | FAB idle icon only §3 |
| AC-2 | Click FAB → panel; close without Stop |
| AC-3 | Badge/elapsed on FAB when running |
| AC-4 | Max-one-running alert in panel |
| AC-5 | Full-width calendar |
| AC-6 | Week\|Day + prev/next/today |
| AC-7 | Hour axis + positioned blocks |
| AC-8 | Drag-select → create prefill; mobile click fallback |
| AC-9 | Click block → edit |
| AC-10 | List\|Calendar toggle; empty states |
| AC-11 | Employee + period + q filters |
| AC-12 | Entries pagination |
| AC-13 | Employees pagination |
| AC-14 | Name labels in all selects |
| AC-15…17 | Seed quality / reseed — UI consumes names; no junk UUID labels |
| AC-18 | Shell non-regression + extensions |
| AC-19 | :8081 |
| AC-20 | Departments tab CRUD |
| AC-21 | Employee modal fields |
| AC-22 | Seed — UI shows depts/fields |
| AC-23 | List secondary dept/title |
| AC-24…26 | Profile route + stats + filters |
| AC-27…29 | Two charts + empty |
| AC-30 | Reseed density — charts/profile ready |
| AC-31 | formatDuration + suffix keys |
| AC-32 | formatInterval same-day two-line + cross-day |

---

## 16. Open design risks (non-blocking)

1. **List vs Calendar period sync** — duplicate from/to vs calendar nav; FE should single-source to avoid drift.  
2. **Overlap density** on Week — many blocks; truncate + tooltip; follow-up polish OK.  
3. **Delete department while assigned** — disable vs force-unassign; follow API; show `departments.deleteBlocked`.  
4. **Timer Stop from FAB-only** — if only open-panel-then-Stop, ensure discoverable.  
5. **Chart lib bundle size** — prefer lightweight; a11y text summary if canvas.  
6. **Same-day interval newline** in tight table columns — `whitespace-pre-line` + min row height.

---

## 17. Marketer tips

N/A — marketer out of cast. Copy in §14 by ui-ux.

---

## 18. Handoff

- **Paths:** `docs/specs/time-tracking-calendar/ux.md`
- **Departments:** tab under `/employees` (not top nav)
- **Profile:** `/employees/:id`
- **Timer:** FAB → panel; running badge on FAB
- **Calendar:** GCal-lite Week|Day hour grid + drag-create
- **Formatters:** AC-31 / AC-32 shared utils + i18n suffixes
- **Next:** **qa write** — map red tests → AC-1…32 / issues #32–#63; E2E base `http://localhost:8081`
- **Then:** backend-dev ∥ frontend-dev → qa verify → devops → close #18

### handoff-meta (spec mirror)

- slug: time-tracking-calendar  
- issue: #18  
- stage_issue: #32,#33,#34,#36,#37,#38,#39,#40,#41,#42,#51,#52,#54,#55,#56,#57,#58,#59,#62,#63  
- role: ui-ux  
- status: done  
- paths: docs/specs/time-tracking-calendar/ux.md  
- next: qa write  
