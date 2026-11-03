# UX / UI contract — time-tracking-ui

**Issue:** [#6](https://github.com/AlexKovalko/falconai/issues/6)  
**Slug:** `time-tracking-ui`  
**Project:** falconai (not Queply)  
**Role:** ui-ux  
**Stage:** [#9](https://github.com/AlexKovalko/falconai/issues/9)  
**Status:** done — contract for frontend-dev / qa write  
**Sources:** `product.md`, `agent.md`, baseline `docs/specs/time-tracking/ux.md`  
**UI port:** **:8081** (never :8080)  
**Marketer:** out of cast — copy keys + RU/EN suggested here; **locale JSON owned by frontend-dev only**

## 1. Primary user job

Один оператор (без логина) ведёт учёт времени сотрудников в **приложении с разделами**: Employees → sticky Start/Stop таймер на любом экране → Time entries (List ∥ Calendar week) → Report (итоги + CSV). Тема light/dark и язык ru/en — в app chrome.

**Happy path:** открыл UI (:8081) → Employees → Add (modal) → sticky timer Start → elapsed → Stop → Time entries List/Calendar видит запись → Report Export CSV.

**Baseline non-regression:** timer hide/restore/stop-collapsed + one-time confirm, max one running per employee, employee/entry CRUD, report+CSV, theme/locale — правила из `docs/specs/time-tracking/ux.md` **сохраняются**; меняется chrome/IA (routes, sticky panel, dual view).

## 2. Information architecture

### Routes (locked)

| Path | Section | Nav label key | Notes |
| --- | --- | --- | --- |
| `/employees` | Employees | `nav.employees` | Default landing for `/` redirect |
| `/entries` | Time entries | `nav.entries` | **Chosen over** `/time-entries` — shorter, matches product soft default |
| `/report` | Report | `nav.report` | Period + totals + CSV |

- Client-side routing (React Router or equivalent already acceptable in stack).
- **`/` → redirect to `/employees`.**
- Deep-link each section; browser Back works between sections.
- Sticky timer + app chrome **outside** route outlet (persist across navigations).

**Why `/entries`:** product/agent soft default; shorter URL; AC-2 only requires URL reflection, not a specific slug. Documented here so FE/QA do not invent `/time-entries` or `/time`.

### App shell

```
┌──────────────────────────────────────────────────────────┐
│ App chrome (sticky top): title | Nav | theme | locale    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Route outlet (Employees | Entries | Report)             │
│                                                          │
│                                      ┌─────────────────┐ │
│                                      │ Sticky timer    │ │
│                                      │ (bottom-right)  │ │
│                                      └─────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

| Zone | Behavior |
| --- | --- |
| **Chrome** | Sticky top `z-40`; brand/title + **horizontal nav** + theme + locale |
| **Nav** | Links to three routes; **active** = `aria-current="page"` + distinct visual (e.g. `variant="default"` vs outline / underline) |
| **Main** | `max-w-5xl` / `max-w-6xl` container; page `h1` may be section title **or** keep app title as `h1` and section as `h2` — pick one and keep consistent (prefer: app title in chrome stays brand text; each route main starts with **one** `h1` = section title; chrome brand can be `p`/`span` or link home without second `h1`) |
| **Sticky timer** | Fixed / sticky **bottom-right**, `z-50`; above content; not in route scroll column |

**Nav placement (locked):** horizontal links **in the sticky header** (not sidebar). Three items — sidebar would waste space and fight mobile.

**Mobile chrome:** nav may wrap under title or sit in a compact row; do **not** invent a hamburger drawer for three links unless space truly breaks — prefer wrap / horizontal scroll of nav pills.

### Visual language

Reuse existing shadcn/ui + Tailwind (neutral surfaces, destructive for delete). No new brand system. Light/dark via existing theme toggle (`.dark`). WCAG AA contrast on both themes. Spacing reads as one app (consistent `gap` / section headers), not three raw CRUD dumps (AC-3).

### What FE must NOT invent

- Top persistent timer bar (Toggl-style) — AC-6 is **bottom-right**
- Sidebar nav, hash-only IA, or keeping three stacked blocks as primary IA
- Inline employee create strip (v1) — create is **Dialog only**
- Hour-axis week, drag-resize, drag-create, timesheet grid
- Month calendar as required view (follow-up [#13](https://github.com/AlexKovalko/falconai/issues/13))
- Calendar **click-to-create** (follow-up [#14](https://github.com/AlexKovalko/falconai/issues/14))
- New API endpoints “for UI” without blocker on #6 (AC-16)
- Auth, projects, tags, Pomodoro, AI chrome
- Auto-stop on second Start; confirm dialog on every Hide after first confirmed Hide
- FE-only CSV dual path when `GET /api/reports/export` exists
- UI on port **:8080**

## 3. App chrome + nav (AC-1, AC-2, AC-15)

| Control | Behavior | testid |
| --- | --- | --- |
| App brand / title | Link or static to `/employees`; string `app.title` | — |
| Nav Employees | Navigate `/employees` | `nav-employees` |
| Nav Time entries | Navigate `/entries` | `nav-entries` |
| Nav Report | Navigate `/report` | `nav-report` |
| Theme toggle | light ↔ dark; applies to chrome, pages, dialogs, sticky timer, calendar/list | `theme-toggle` |
| Locale | `ru` ↔ `en`; all new surfaces use i18n | `locale-switcher`, `locale-ru`, `locale-en` |

**Persistence (reuse baseline):**

| Key | Values | Notes |
| --- | --- | --- |
| `falconai.theme` | `light` \| `dark` | unchanged |
| `falconai.locale` | `ru` \| `en` | unchanged |
| `falconai.timer.hideConfirmDone` | `true` | unchanged |
| `falconai.timer.preferCollapsed` | `true` \| omit | unchanged; drives collapsed / mobile chip after Hide |
| `falconai.entries.view` | `list` \| `calendar` | **optional** polish — default **List** if absent (AC default). Persist = follow-up [#15](https://github.com/AlexKovalko/falconai/issues/15), not required for AC |

## 4. Employees route (AC-4, AC-5)

### Structure

```
[Employees h1]
  [Button: Add employee]          ← opens create Dialog (no inline strip)
  List / empty state
  Dialog: create | edit
  AlertDialog: delete confirm
```

### Flows

| Flow | UI | Success | Error / edge |
| --- | --- | --- | --- |
| **Create** | Primary **Add** → `Dialog`: name + Save/Cancel | Close dialog; list refresh; employee in timer select | Empty name → client validation; API error → inline in dialog |
| **Edit** | Row Edit → same/dialog pattern with name | List + timer select + entries/report names refresh | Empty name rejected |
| **Delete** | `AlertDialog` cascade warning (baseline copy) | Row gone; if had running timer → timer returns to idle for that employee | Cancel closes |

**Empty:** `employees.empty` + primary CTA = Add (opens modal).

**shadcn:** `Button`, `Dialog`, `AlertDialog`, `Input`, `Label`; list as stacked rows or `Table` (keep dense).

**testid deltas vs baseline:**

| testid | Element |
| --- | --- |
| `employees-add-open` | Button that **opens** create dialog (replaces page-level inline submit as primary create entry) |
| `employees-name-input` | Name field **inside** create (and edit) dialog |
| `employees-add-button` | Save/submit inside **create** dialog (keep id for QA continuity) |
| `employees-create-dialog` | Create dialog content root |
| `employees-edit-dialog` | Edit dialog content root |
| `employees-list` | List container (unchanged) |

## 5. Sticky timer — bottom-right (AC-6, AC-7, AC-8)

Redesign chrome only. **Behavioral contract** from baseline §5 / §5.1 / §5.2 is **authoritative** (hide confirm, restore, stop-collapsed, already-running inline alert, live `hh:mm:ss`, a11y announcements). Do not discard those rules.

### Placement

- Viewport-fixed **bottom-right** (`fixed bottom-4 right-4` + safe-area insets).
- Max width ~ `min(22rem, calc(100vw - 2rem))` on desktop expanded panel.
- Reserve bottom padding on main content (`pb-24` or similar) so last rows are not permanently covered on desktop.
- `z-50`; hide-confirm `AlertDialog` portals above panel.

### States (chrome mapping)

| State | Desktop chrome | Mobile chrome |
| --- | --- | --- |
| `idle` | Expanded **panel** with Start form (select + description + Start). Optional compact “Timer” header with collapse chevron — if collapsed while idle, show small launcher chip that re-opens form | Prefer **compact launcher chip** (`timer.chip.idle`) that expands to panel for Start; do not leave a large opaque card covering primary CTAs |
| `running-expanded` | Full panel: form (or selected employee context) + live elapsed + **Stop** + **Hide** | Same content in panel; user may collapse |
| `running-collapsed` | **Compact chip**: employee name + `hh:mm:ss` + **Restore** + **Stop** | **Default when running on narrow viewports** (and when `preferCollapsed`) — same chip |
| `hide-confirm-open` | Baseline AlertDialog (End session / Hide timer / Cancel) | Same |

**Locked mobile rule:** when a timer is **running** and viewport is narrow (`md` down), default chrome = **compact sticky chip** (bottom-right), not the full panel — unless user just expanded via Restore / launcher. After Hide → chip. After Start on mobile → may briefly show expanded then allow collapse; **prefer** landing in chip after Start on mobile to protect content (document: FE may start expanded for one paint then auto-collapse — optional; minimum AC: chip available and not blocking Add/Export).

### Expanded panel wireframe

```
┌─ Timer ───────────────────── [−] ┐
│ Employee [Select        v]       │
│ Description [.............]      │
│ [Start]  [Stop]  [Hide]          │
│ Elapsed  01:23:45                │
│ (alert: already running…)        │
└──────────────────────────────────┘
```

### Collapsed / mobile chip wireframe

```
┌──────────────────────────────┐
│ Name · 01:23:45  [Show][Stop]│
└──────────────────────────────┘
```

- Hit targets Restore/Stop ≥ ~44px on touch.
- Same `data-testid`s as baseline for actions where possible (`timer-stop-button`, `timer-restore-button`, `timer-elapsed`, …).
- New roots: `timer-panel` (expanded floating root), `timer-collapsed` (chip root — reuse baseline id), `timer-launcher` (idle compact open control on mobile).

### Live elapsed / Start / Stop / Hide

Identical to baseline `time-tracking/ux.md` §5–5.2:

- Tick from server `start`; format `hh:mm:ss`; no per-tick `aria-live`.
- Announce Start/Stop once via polite region (`timer.a11y.started` / `stopped`).
- Second Start while running → **inline** `role="alert"` near Start in panel (`timer-already-running-error`); toast optional secondary.
- First Hide → AlertDialog; End session = Stop; Hide timer → collapsed/chip; Cancel does not set `hideConfirmDone`.
- Subsequent Hide: no dialog.
- Stop while collapsed/chip always available.

### Empty / edge

- No employees: disable Start; hint `timer.hints.needEmployee` (may link to `/employees`).
- Multiple runnings (different employees): show state for **selected** employee; optional “other active” list — still nice-to-have / follow-up [#16](https://github.com/AlexKovalko/falconai/issues/16).

## 6. Time entries — Calendar ∥ List (AC-9…AC-13)

### Shared toolbar (period + view)

```
[Time entries h1]
  [List | Calendar] toggle
  [← Prev week]  [This week]  [Next week →]
  Period label: e.g. 3–9 Nov 2026
  (+ List: [Add entry] opens create Dialog)
```

**Default view (locked):** **List**. Calendar is one click.

### Shared period (AC-10) — locked

- Single source of truth: **visible week** `[weekStart, weekEnd]` (inclusive dates).
- Week boundaries: **Monday–Sunday** (ISO-8601). Document in README if needed; do not switch to locale-first-day without product change.
- **List** fetches `GET /api/time-entries?from={weekStart}&to={weekEnd}` (same range as calendar).
- **Calendar** aggregates the same payload **client-side** into 7 day buckets (by entry start local date).
- Switching List ↔ Calendar **does not** reset the week.
- Prev / Next / This week update both views’ data.
- Do **not** invent a second independent date-range control on List that drifts from the week (keeps AC-10 simple). Report keeps its own from/to on `/report`.

### List view (AC-12, AC-13)

- Table/list columns: employee, description, interval and/or duration, actions Edit / Delete.
- **Add entry** → Dialog (create) — same field rules as baseline report entry dialog.
- Edit → Dialog; Delete → AlertDialog.
- Empty week: `entries.empty` (list) — not an error.
- Running rows (`stop: null`): show live/“Running”; prefer lock interval edit while running (baseline risk).

### Calendar view (AC-11, AC-13)

```
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │ Sun  │
│ 3    │ 4    │ 5    │ 6    │ 7    │ 8    │ 9    │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ chip │      │ chip │ …    │      │      │      │
│ chip │      │      │      │      │      │      │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

**Locked calendar rules:**

- **7 day columns/cards** — responsive: on narrow screens, horizontal scroll of columns **or** stacked day sections (prefer horizontal scroll of equal columns to keep “week” mental model).
- Entry = **chip/card**: employee name, description (truncate), duration — readable minimum.
- **No** hour axis, **no** drag, **no** resize, **no** click-empty-to-create (OOS #14).
- **Chip interaction (in scope):** click chip → open **edit** Dialog (or menu Edit/Delete). This is **not** create-on-empty-day.
- Empty week: calendar empty state `entries.calendar.empty` inside the grid region (AC-13).
- “This week” jumps to week containing today.

### testids (entries)

| testid | Element |
| --- | --- |
| `entries-view-list` | List toggle control |
| `entries-view-calendar` | Calendar toggle control |
| `entries-week-prev` | Previous week |
| `entries-week-next` | Next week |
| `entries-week-current` | This week |
| `entries-period-label` | Visible period text |
| `entries-list` | List/table root |
| `entries-calendar` | Week calendar root |
| `entries-empty` | Shared/empty state (list or calendar; OK to reuse) |
| `entries-add-open` | Open create entry dialog |
| `entry-row-{id}` | List row (reuse pattern from report) |

## 7. Report route (AC-14)

Shell move of baseline Report block to `/report` — **behavior unchanged**:

- from / to, apply or auto-fetch, totals, entries, empty, CSV export, entry edit/delete dialogs.
- Keep existing report testids (`report-from`, `report-to`, `report-entries`, `report-totals`, `report-empty`, `report-export-button`).
- Period is **independent** of Time entries week (report is analysis; entries week is browsing). Soft: optional “use entries week” is **out** — do not invent.

## 8. Component map (existing → evolve)

| UI piece | Pattern |
| --- | --- |
| Router layout | Chrome + `<Outlet />` + sticky `TimerPanel` |
| Nav | `Button` asLink / `NavLink` in header |
| Employees create/edit | `Dialog` (create no longer inline) |
| Delete employee/entry | `AlertDialog` (exists) |
| Sticky timer | Fixed panel + chip; reuse Select/Input/Button/Alert |
| Hide confirm | `AlertDialog` (exists) — focus: prefer initial focus **Hide timer** |
| Entries toggle | `ToggleGroup` or two `Button`s with `aria-pressed` |
| Week calendar | CSS grid `grid-cols-7`; chips = buttons or links |
| Entries / report tables | `Table` (exists) |
| Theme / locale | existing `AppChrome` controls + nav |

**API (AC-16):** only existing endpoints — `employees`, `timers/*`, `time-entries?from=&to=`, `reports/summary`, `reports/export`. Calendar day bucketing is client-side.

## 9. Accessibility checklist

| Area | Requirement |
| --- | --- |
| Nav | `nav` landmark; links keyboard-reachable; active `aria-current="page"` |
| Headings | One page `h1` per route (section title); no skipped levels |
| Labels | Every input/Select labelled (i18n) |
| Dialogs | Focus trap; Esc = Cancel; restore focus to trigger |
| Hide confirm | `role="alertdialog"`; labelled/described; baseline button semantics |
| Timer panel | Expand/collapse controls have accessible names (`timer.a11y.expand` / `collapse`) |
| Chip | Stop/Restore reachable; name includes employee + elapsed via `aria-label` if visual truncation |
| AC-8 error | `role="alert"`; not color-only |
| Live elapsed | No per-tick live region |
| Theme | Focus rings visible light/dark; AA contrast |
| Locale | `lang` on `<html>` |
| Calendar | Day headers associated; chips keyboard activatable; empty state not only color |
| Mobile | Chip does not trap scroll; primary route CTAs remain usable when chip shown |

## 10. Motion

Minimal: shadcn dialog defaults; optional 150–200ms fade on panel ↔ chip. **No** decorative motion on calendar. No continuous animation on digits beyond text update.

## 11. i18n — reuse + deltas

Keep all baseline keys from `docs/specs/time-tracking/ux.md` §10 unless unused after refactor. FE may leave unused keys until cleanup follow-up — do not silent-delete if E2E still references copy.

### New / changed keys (proposed)

| Key | RU | EN |
| --- | --- | --- |
| `nav.employees` | Сотрудники | Employees |
| `nav.entries` | Записи времени | Time entries |
| `nav.report` | Отчёт | Report |
| `nav.aria` | Основная навигация | Main navigation |
| `employees.addOpen` | Добавить сотрудника | Add employee |
| `employees.createTitle` | Новый сотрудник | New employee |
| `employees.editTitle` | Изменить сотрудника | Edit employee |
| `entries.title` | Записи времени | Time entries |
| `entries.view.list` | Список | List |
| `entries.view.calendar` | Календарь | Calendar |
| `entries.view.aria` | Вид записей | Entries view |
| `entries.week.prev` | Предыдущая неделя | Previous week |
| `entries.week.next` | Следующая неделя | Next week |
| `entries.week.current` | Эта неделя | This week |
| `entries.periodLabel` | Период | Period |
| `entries.empty` | За эту неделю записей нет | No entries for this week |
| `entries.calendar.empty` | На этой неделе пока нет записей | No entries this week yet |
| `entries.addOpen` | Добавить запись | Add entry |
| `entries.createTitle` | Новая запись времени | New time entry |
| `timer.panel.title` | Таймер | Timer |
| `timer.launcher.open` | Открыть таймер | Open timer |
| `timer.a11y.expand` | Развернуть таймер | Expand timer |
| `timer.a11y.collapse` | Свернуть таймер | Collapse timer |
| `timer.chip.idle` | Таймер | Timer |

Baseline timer/employees/report/entries.edit|delete|errors keys remain valid.

## 12. Suggested `data-testid` catalog (full for this slug)

**Chrome / nav:** `nav-employees`, `nav-entries`, `nav-report`, `theme-toggle`, `locale-switcher`, `locale-ru`, `locale-en`

**Employees:** `employees-add-open`, `employees-create-dialog`, `employees-edit-dialog`, `employees-name-input`, `employees-add-button`, `employees-list`, `employee-row-{id}`

**Timer:** `timer-panel`, `timer-launcher`, `timer-employee-select`, `timer-description-input`, `timer-start-button`, `timer-stop-button`, `timer-elapsed`, `timer-hide-button`, `timer-restore-button`, `timer-collapsed`, `timer-already-running-error`, `timer-hide-confirm`, `timer-hide-confirm-end`, `timer-hide-confirm-hide`

**Entries:** `entries-view-list`, `entries-view-calendar`, `entries-week-prev`, `entries-week-next`, `entries-week-current`, `entries-period-label`, `entries-list`, `entries-calendar`, `entries-empty`, `entries-add-open`

**Report:** baseline report testids unchanged

## 13. AC ↔ UX matrix

| AC | UX coverage |
| --- | --- |
| AC-1 | Header nav Employees / Time entries / Report; active state |
| AC-2 | Routes `/employees`, `/entries`, `/report`; `/` → employees |
| AC-3 | Shell + consistent sections/shadcn; checklist smoke |
| AC-4 | Create employee Dialog only |
| AC-5 | List + edit Dialog + delete AlertDialog |
| AC-6 | Fixed bottom-right timer on all routes |
| AC-7 | Start/Stop/elapsed + hide/confirm/restore/stop-collapsed (baseline) |
| AC-8 | Inline already-running alert in timer panel |
| AC-9 | List ∥ Calendar toggle on `/entries` |
| AC-10 | Shared ISO week period across views |
| AC-11 | 7 day columns + week nav + this week |
| AC-12 | List CRUD edit/delete (+ create dialog) |
| AC-13 | Empty list/week states |
| AC-14 | Report route shell = baseline report behavior |
| AC-15 | Theme/locale apply to nav, modals, timer, entries views |
| AC-16 | FE note: reuse `GET /api/time-entries?from=&to=` (+ existing CRUD/timer/report); no new endpoint required; gap → blocker on #6 |

## 14. Open design risks (non-blocking)

1. **Mobile panel vs chip:** auto-collapse after Start may surprise power users — Restore is one tap; revisit if QA finds flake.
2. **Calendar chip density:** many entries/day → scroll inside day column; truncate description with title tooltip.
3. **Multi-employee parallel runnings:** still selected-employee-centric; global strip = [#16](https://github.com/AlexKovalko/falconai/issues/16).
4. **View persistence:** default List always until [#15](https://github.com/AlexKovalko/falconai/issues/15).
5. **Main `h1` vs chrome brand:** avoid dual `h1`; FE picks one pattern from §2.

## 15. Marketer tips

N/A — marketer out of cast. Copy proposed in §11 by ui-ux.

## 16. Handoff

- **Paths:** `docs/specs/time-tracking-ui/ux.md`
- **Route choice:** `/employees`, `/entries`, `/report` (`/` → `/employees`)
- **Sticky:** floating bottom-right panel; mobile running → compact chip
- **Calendar:** week day cards only; chip → edit OK; create-on-day OOS #14; month OOS #13
- **Next:** qa `phase: write` (stage [#10](https://github.com/AlexKovalko/falconai/issues/10)) — map tests to AC-1…AC-16 + testids; E2E base **:8081**
- **Then:** frontend-dev (stage #11) → qa verify (#12)
