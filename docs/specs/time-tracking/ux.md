# UX / UI contract — time-tracking

**Issue:** [#1](https://github.com/AlexKovalko/time-tracking-demo/issues/1)  
**Slug:** `time-tracking`  
**Project:** falconai  
**Role:** ui-ux  
**Status:** done — contract for frontend-dev  
**Sources:** `product.md`, `agent.md`, `docs/STACK.md`  
**Marketer:** out of cast — copy keys + suggested RU/EN strings documented here; **locale JSON owned by frontend-dev only**

## 1. Primary user job

Один оператор (без логина) ведёт учёт времени вымышленных сотрудников: CRUD людей → Start/Stop таймера с описанием и live elapsed (hide/restore) → отчёт за период с итогами и CSV → правка/удаление записей. Тема light/dark и язык ru/en — preference в UI.

**Happy path:** открыл app → (seed или create сотрудника) → выбрал сотрудника + описание → Start → видит `hh:mm:ss` → Stop → в отчёте видна запись → Export CSV.

## 2. Information architecture

### Layout (locked)

Одна страница (`apps/web`), три вертикальных блока (якоря `#employees` / `#timer` / `#report` допустимы). Без отдельных route-экранов для CRUD.

| Order | Block id | Title keys | Purpose |
| --- | --- | --- | --- |
| 0 | **App chrome** | — | Brand/title, theme toggle, locale switcher |
| 1 | **Employees** | `employees.title` | List + create/edit/delete |
| 2 | **Timer** | `timer.title` | Select employee, description, Start/Stop, live elapsed, hide/restore |
| 3 | **Report** | `report.title` | Period, entry list, per-employee totals, empty, CSV, entry edit/delete |

**Mobile:** одна колонка, блоки стеком; chrome sticky top OK. Не дробить в tabs/wizard.

**Visual language (greenfield):** Tailwind + shadcn/ui defaults (neutral surfaces, semantic destructive for delete). Не изобретать отдельный brand-system. Light/dark через `class` на `<html>` (shadcn `next-themes`-style или свой `data-theme` / `.dark`). Контраст текста/кнопок обязан проходить WCAG AA на обеих темах.

### What FE must NOT invent

- Login / roles / multi-page wizard
- Projects, tags, calendar grid, Pomodoro
- Auto-stop on second Start
- Confirm dialog on every hide after first «Hide» choice
- FE-only CSV dual path when API export exists (`GET /api/reports/export`)
- In-app AI chrome

## 3. App chrome

| Control | Behavior | AC |
| --- | --- | --- |
| App title | Static product name (e.g. «Учёт времени» / «Time tracking») | AC-2 |
| Theme toggle | Switch light ↔ dark; apply to page bg, cards/sections, inputs, dialogs, tables | AC-19 |
| Locale switcher | `ru` ↔ `en`; all UI strings from locale JSON | AC-20 |

**Persistence (soft):** `localStorage` keys (suggested):

| Key | Values | Notes |
| --- | --- | --- |
| `falconai.theme` | `light` \| `dark` | Default: system or `light` |
| `falconai.locale` | `ru` \| `en` | Default: `ru` (TZ language) or browser — document choice in README |
| `falconai.timer.hideConfirmDone` | `true` | After first hide-confirm answered with **Hide** (or End session — see §5); session minimum; prefer persist so reload doesn’t re-prompt |
| `falconai.timer.preferCollapsed` | `true` \| omit | Optional: after Hide, keep collapsed across reload while that timer still running |

No API for theme/locale.

## 4. Block — Employees (AC-1, AC-15)

### Structure

```
[Employees]
  [Input: name] [Button: Add]
  List:
    row: name | [Edit] [Delete]
  Empty: empty employees message
```

### Flows

| Flow | UI | Success | Error / edge |
| --- | --- | --- | --- |
| **Create** | Name input + submit; disable while pending | Invalidate employees query; clear input; new row visible; employee appears in timer select | Empty name → client validation, no POST; API error → toast/inline |
| **Edit** | Inline edit or Dialog: name field + Save/Cancel | List + timer select + report names refresh | Empty name rejected |
| **Delete** | Confirm Dialog (shadcn `AlertDialog`): irreversible; note cascade of time entries | Row gone; if deleted employee had running timer → timer UI resets to idle for that context; select no longer offers employee | Cancel closes dialog |

**Empty state:** `employees.empty` — CTA is the create form above (no separate screen).

**shadcn:** `Input`, `Button`, `AlertDialog`, optional `Dialog` for edit, list as simple stacked rows or `Table` if preferred — keep dense, not card-grid spam.

## 5. Block — Timer (AC-4, AC-5, AC-6, AC-7, AC-17)

### Structure (expanded / running visible)

```
[Timer]
  [Select: employee]  [Input: description]
  [Button: Start]  [Button: Stop]   // Stop enabled only when selected employee has running timer
  Live region: elapsed hh:mm:ss (+ employee name + description optional)
  [Button: Hide]                    // only when running & expanded
```

### Structure (collapsed while running)

```
[Timer] (compact bar)
  Short label: employee name + elapsed (or «Timer running» + elapsed)
  [Button: Restore]  [Button: Stop]
  // No full description field required in collapsed chrome; Start form may stay below or stay hidden — prefer keep form visible but elapsed chrome collapsed
```

**Recommendation (locked for FE):** Keep the Start form (select + description + Start) always in the Timer block. Collapse **only** the live-elapsed indicator strip (and Hide control). Collapsed strip always exposes **Restore** + **Stop**.

### Live elapsed

- Source of truth: server `start` ISO/timestamp; client ticks every 1s via `requestAnimationFrame` or `setInterval`.
- Format: **`hh:mm:ss`** (zero-padded). Hours may exceed 24 (no day rollover required).
- Expose to AT: `aria-live="off"` on the ticking digits (avoid spam); announce Start/Stop via polite live region once (`timer.started` / `timer.stopped`).

### Start / Stop rules

| Action | Preconditions | Behavior |
| --- | --- | --- |
| Start | Employee selected; description trimmed non-empty | POST start; show elapsed; enable Stop/Hide |
| Start blocked (empty description) | — | Client validation; focus description; message `timer.errors.descriptionRequired` |
| Start blocked (no employee) | — | `timer.errors.employeeRequired` |
| Start rejected (already running) | API 409 / stable code | **Do not** create second timer; show message **near Timer actions** (see §5.1) |
| Stop (expanded or collapsed) | Running for selected employee (or known running id) | POST stop; clear live strip; report invalidate |
| Start after Stop | Same employee | Allowed (**AC-7**) |

### 5.1 Reject second Start — message placement (AC-6)

- Place error **inline under the Start button row** (or immediately below the Timer form), not only as a transient toast that disappears before QA can assert.
- Toast **optional** as secondary; primary = persistent inline alert until next successful Start, employee change, or dismiss.
- Use `role="alert"` on the reject message.
- Copy key: `timer.errors.alreadyRunning`.

### 5.2 Hide-timer UX — detailed (AC-17)

**States**

| State id | Meaning |
| --- | --- |
| `idle` | No running timer for context (or none globally shown) |
| `running-expanded` | Running; live elapsed visible; Hide available |
| `running-collapsed` | Running; elapsed chrome hidden/compact; Restore + Stop available |
| `hide-confirm-open` | First-hide dialog open |

**First hide (one-time confirm)**

1. User clicks **Hide** while `running-expanded`.
2. If `falconai.timer.hideConfirmDone !== true` (or in-memory flag equivalent for session): open **AlertDialog** — do **not** collapse yet.
3. Dialog choices (two primary actions + cancel optional):
   - **End session** → run Stop path; close dialog; leave `idle`; set `hideConfirmDone=true` (user already saw the choice — no need to ask again this session / prefer persist).
   - **Hide timer** → close dialog; enter `running-collapsed`; set `hideConfirmDone=true`; optional `preferCollapsed=true`.
   - **Cancel / Esc / overlay** (if provided) → stay `running-expanded`; **do not** set `hideConfirmDone` (so next Hide still shows confirm).
4. Choosing **End session** = Stop (**AC-5** / **AC-17**), not a separate API.

**After Hide chosen**

- Subsequent **Hide** (if user Restored then Hides again): **no dialog** — immediately collapse.
- **Restore:** `running-collapsed` → `running-expanded`; timer still running; elapsed continues from same `start`.
- **Stop while collapsed:** Stop control visible and keyboard-reachable in collapsed strip; after Stop → `idle`; collapsed chrome removed.
- Reload while running + `preferCollapsed`: restore UI into `running-collapsed` without re-confirm if `hideConfirmDone` set.

**Wireframe — first-hide dialog**

```
┌─────────────────────────────────────────────┐
│  Hide timer?                                │
│  The session is still running. End it or    │
│  only hide the indicator?                   │
│                                             │
│  [ End session ]   [ Hide timer ]  [Cancel] │
└─────────────────────────────────────────────┘
```

- `End session` = destructive/secondary emphasis OK (`variant="destructive"` or outline).
- `Hide timer` = primary confirm for “just hide”.
- Focus: trap inside dialog; initial focus on **Hide timer** (non-destructive default) or first focusable — prefer **Hide timer** so Enter doesn’t accidentally Stop. Esc = Cancel.

### Timer empty / edge

- No employees yet: disable Start; hint `timer.hints.needEmployee` linking scroll to Employees.
- Multiple employees can have running timers **per AC-6** (max one **per** employee). UI may show the running state for the **currently selected** employee; optional list of all active from `GET /api/timers/active` — nice-to-have, not required for AC. Minimum: when selecting an employee who is already running, show their elapsed + Stop/Hide.

## 6. Block — Report (AC-8, AC-9, AC-10, AC-16, AC-18)

### Structure

```
[Report]
  [Date from] [Date to]  [Button: Apply / auto-fetch on change]
  [Button: Export CSV]
  Totals panel: per-employee rows + grand total
  Entries table/list: employee | description | start–stop | duration | [Edit] [Delete]
  Empty state when no rows
```

### Period

- Inclusive `YYYY-MM-DD` from/to matching API.
- Default suggestion: current calendar week or today→today — FE choice; document in UI via labels only.
- Invalid range (from > to): client message `report.errors.invalidRange`; no request or show empty with error.

### List (AC-8)

Columns minimum: employee name, description, interval (start–stop localized short) **or** duration `hh:mm:ss`. Prefer both interval + duration if space allows.

### Totals (AC-9)

- From `GET /api/reports/summary` (or compute client-side only if summary missing — prefer API).
- Show each employee with entries; `grandTotalSeconds` as `report.totals.grand`.
- Empty period: totals section shows zeros or hides employee rows + shows empty (**AC-10**).

### Empty state (AC-10)

- Not an error banner. Illustration optional; text `report.empty` + short hint to widen period or track time.
- Export may be disabled or still allowed (empty CSV) — prefer **disable Export** when zero rows + tooltip `report.export.disabledEmpty`.

### CSV export (AC-18)

- Control: Button `report.export` in report header.
- Trigger: `GET /api/reports/export?from=&to=` → download blob / navigation with `Content-Disposition`.
- Loading: disable button + spinner.
- Failure: inline/toast `report.export.failed`.

### Time-entry edit / delete (AC-16)

| Action | UI | Rules |
| --- | --- | --- |
| **Edit** | Dialog: description, start, stop (datetime-local or separate date+time). Save → PATCH; invalidate report + timers | Reject UX that would create two running for one employee — surface API error with `entries.errors.conflictRunning` |
| **Delete** | AlertDialog confirm → DELETE; refresh list/totals | — |
| **Manual create** (optional) | Secondary button «Add entry» opening same dialog with empty/create mode | Must obey AC-6; if out of FE capacity, timer-only create is enough if PATCH/DELETE exist — product prefers create via timer **and/or** explicit; minimum for AC-16: edit + delete + create-via-timer |

**Running entries in report:** if API returns running (`stop: null`), show duration as live or «Running»; edit carefully (prefer edit description only while running, or stop first) — FE may disable interval edit while running to avoid AC-6 footguns.

## 7. Component / section map (frontend-dev + shadcn)

| UI piece | Suggested shadcn / pattern |
| --- | --- |
| Page shell | Tailwind container `max-w-5xl` / `max-w-6xl`, `space-y-8` |
| Section | `<section aria-labelledby=…>` + `h2` |
| Employees form | `Input` + `Button` |
| Employees list | plain list or `Table` |
| Confirm delete (employee/entry) | `AlertDialog` |
| Edit employee / entry | `Dialog` + form |
| Employee select | `Select` or `Combobox` |
| Timer actions | `Button` variants |
| Hide confirm | `AlertDialog` (focus trap built-in) |
| Inline AC-6 error | `Alert` (`destructive`) under Start |
| Dates | `Input type="date"` or shadcn date picker if already added |
| Report table | `Table` |
| Theme | `Button` icon toggle or `DropdownMenu`; toggle `.dark` |
| Locale | `ToggleGroup` or `Select` with `ru` / `en` |
| Toasts (optional) | `sonner` / shadcn toast — secondary to inline errors |
| Loading | Button `disabled` + spinner; Query `isPending` skeletons optional |

**TanStack Query:** invalidate `employees`, `timers/active`, `time-entries`, `reports/summary` after mutations as appropriate.

## 8. Accessibility checklist

| Area | Requirement |
| --- | --- |
| Structure | One `h1` (app title); section `h2`s for three blocks |
| Labels | Every input/`Select` has visible `<Label>` or `aria-label` (i18n) |
| Dialogs | Focus trap; Esc closes (Cancel); restore focus to trigger (Hide / Delete / Edit) on close |
| Hide confirm | `role="alertdialog"` (AlertDialog); labelled by title; described by body text |
| Keyboard | All actions reachable; Start/Stop/Hide/Restore/Export operable via keyboard |
| AC-6 error | `role="alert"`; not color-only |
| Live elapsed | Don’t `aria-live` every tick; announce state changes once |
| Theme | Dark theme: text/icon contrast ≥ AA on backgrounds; focus rings visible on both themes |
| Locale | `lang` on `<html>` updates with locale switch |
| Hit targets | Collapsed Stop/Restore ≥ ~44px touch-friendly on mobile |
| Delete | Confirm before destructive; don’t use color alone |

## 9. Motion

Minimal: dialog enter/exit per shadcn default. **No** continuous animation on elapsed digits beyond text update. Optional 150–200ms fade on collapse/expand of timer strip — not required.

## 10. i18n key catalog (proposed)

Frontend-dev owns JSON files (e.g. `apps/web/src/locales/ru.json`, `en.json`). Nested object OK; keys below use dot paths.

### Suggested RU / EN

| Key | RU | EN |
| --- | --- | --- |
| `app.title` | Учёт рабочего времени | Time tracking |
| `app.theme.light` | Светлая тема | Light theme |
| `app.theme.dark` | Тёмная тема | Dark theme |
| `app.theme.toggle` | Переключить тему | Toggle theme |
| `app.locale.label` | Язык | Language |
| `app.locale.ru` | Русский | Russian |
| `app.locale.en` | English | English |
| `employees.title` | Сотрудники | Employees |
| `employees.nameLabel` | Имя | Name |
| `employees.namePlaceholder` | Имя сотрудника | Employee name |
| `employees.add` | Добавить | Add |
| `employees.edit` | Изменить | Edit |
| `employees.save` | Сохранить | Save |
| `employees.cancel` | Отмена | Cancel |
| `employees.delete` | Удалить | Delete |
| `employees.deleteConfirmTitle` | Удалить сотрудника? | Delete employee? |
| `employees.deleteConfirmBody` | Будут удалены связанные записи времени. Это действие нельзя отменить. | Related time entries will be deleted. This cannot be undone. |
| `employees.empty` | Пока нет сотрудников. Добавьте первого. | No employees yet. Add the first one. |
| `employees.errors.nameRequired` | Укажите имя | Name is required |
| `employees.errors.saveFailed` | Не удалось сохранить сотрудника | Could not save employee |
| `employees.errors.deleteFailed` | Не удалось удалить сотрудника | Could not delete employee |
| `timer.title` | Таймер | Timer |
| `timer.employeeLabel` | Сотрудник | Employee |
| `timer.employeePlaceholder` | Выберите сотрудника | Select employee |
| `timer.descriptionLabel` | Описание задачи | Task description |
| `timer.descriptionPlaceholder` | Что делаете? | What are you working on? |
| `timer.start` | Старт | Start |
| `timer.stop` | Стоп | Stop |
| `timer.hide` | Скрыть | Hide |
| `timer.restore` | Показать | Restore |
| `timer.elapsedLabel` | Прошло | Elapsed |
| `timer.collapsedLabel` | Таймер идёт | Timer running |
| `timer.hints.needEmployee` | Сначала добавьте сотрудника | Add an employee first |
| `timer.errors.descriptionRequired` | Введите описание задачи | Enter a task description |
| `timer.errors.employeeRequired` | Выберите сотрудника | Select an employee |
| `timer.errors.alreadyRunning` | У этого сотрудника уже идёт таймер. Остановите его, прежде чем запускать новый. | This employee already has a running timer. Stop it before starting a new one. |
| `timer.errors.startFailed` | Не удалось запустить таймер | Could not start timer |
| `timer.errors.stopFailed` | Не удалось остановить таймер | Could not stop timer |
| `timer.hideConfirm.title` | Скрыть таймер? | Hide timer? |
| `timer.hideConfirm.body` | Сессия продолжает идти. Завершить её или только скрыть индикатор? | The session keeps running. End it, or only hide the indicator? |
| `timer.hideConfirm.endSession` | Завершить сессию | End session |
| `timer.hideConfirm.hide` | Скрыть таймер | Hide timer |
| `timer.hideConfirm.cancel` | Отмена | Cancel |
| `timer.a11y.started` | Таймер запущен | Timer started |
| `timer.a11y.stopped` | Таймер остановлен | Timer stopped |
| `report.title` | Отчёт | Report |
| `report.fromLabel` | С | From |
| `report.toLabel` | По | To |
| `report.apply` | Показать | Show |
| `report.export` | Экспорт CSV | Export CSV |
| `report.export.disabledEmpty` | Нет данных для экспорта | No data to export |
| `report.export.failed` | Не удалось скачать CSV | Could not download CSV |
| `report.empty` | За выбранный период записей нет | No entries for this period |
| `report.totals.title` | Итого по сотрудникам | Totals by employee |
| `report.totals.grand` | Всего | Grand total |
| `report.columns.employee` | Сотрудник | Employee |
| `report.columns.description` | Описание | Description |
| `report.columns.interval` | Интервал | Interval |
| `report.columns.duration` | Длительность | Duration |
| `report.columns.actions` | Действия | Actions |
| `report.errors.invalidRange` | Дата «с» не может быть позже «по» | Start date cannot be after end date |
| `report.errors.loadFailed` | Не удалось загрузить отчёт | Could not load report |
| `entries.edit` | Изменить запись | Edit entry |
| `entries.delete` | Удалить запись | Delete entry |
| `entries.deleteConfirmTitle` | Удалить запись времени? | Delete time entry? |
| `entries.deleteConfirmBody` | Запись будет удалена без возможности восстановления. | The entry will be permanently deleted. |
| `entries.save` | Сохранить | Save |
| `entries.cancel` | Отмена | Cancel |
| `entries.create` | Добавить запись | Add entry |
| `entries.errors.conflictRunning` | Нельзя сохранить: у сотрудника уже есть активный таймер | Cannot save: this employee already has a running timer |
| `entries.errors.saveFailed` | Не удалось сохранить запись | Could not save entry |
| `entries.errors.deleteFailed` | Не удалось удалить запись | Could not delete entry |
| `common.loading` | Загрузка… | Loading… |
| `common.retry` | Повторить | Retry |
| `common.confirm` | Подтвердить | Confirm |

FE may nest (`timer.errors.alreadyRunning`) or flatten — keep stable key paths for E2E `getByRole` / text assertions; prefer `data-testid` for critical controls (suggested below).

## 11. Suggested `data-testid` (for QA / Playwright)

| Test id | Element |
| --- | --- |
| `employees-name-input` | Create name field |
| `employees-add-button` | Create submit |
| `employees-list` | List container |
| `timer-employee-select` | Employee select |
| `timer-description-input` | Description |
| `timer-start-button` | Start |
| `timer-stop-button` | Stop (expanded; same id OK on collapsed Stop) |
| `timer-elapsed` | Live elapsed text |
| `timer-hide-button` | Hide |
| `timer-restore-button` | Restore |
| `timer-collapsed` | Collapsed strip root |
| `timer-already-running-error` | AC-6 alert |
| `timer-hide-confirm` | Hide AlertDialog content |
| `timer-hide-confirm-end` | End session button |
| `timer-hide-confirm-hide` | Hide timer button |
| `report-from` | From date |
| `report-to` | To date |
| `report-entries` | Entries list/table |
| `report-totals` | Totals panel |
| `report-empty` | Empty state |
| `report-export-button` | CSV export |
| `theme-toggle` | Theme control |
| `locale-switcher` | Locale control group |
| `locale-ru` | Switch UI to Russian |
| `locale-en` | Switch UI to English |

## 12. AC ↔ UX coverage

| AC | UX coverage |
| --- | --- |
| AC-1 | Employees create + list refresh |
| AC-2 | No auth chrome; all blocks available on load |
| AC-4 | Timer Start requires description + employee |
| AC-5 | Stop expanded + collapsed |
| AC-6 | Inline reject message placement |
| AC-7 | Start enabled again after Stop |
| AC-8 | Report list columns |
| AC-9 | Per-employee totals + grand |
| AC-10 | Empty report state |
| AC-15 | Edit/delete employee + confirms |
| AC-16 | Entry edit/delete from report |
| AC-17 | Hide confirm / restore / stop-collapsed / no re-confirm |
| AC-18 | CSV export control |
| AC-19 | Theme toggle + dark surfaces |
| AC-20 | Locale switcher + key catalog |

## 13. Open design risks (non-blocking)

1. **Several concurrent runnings (different employees):** minimum UX shows selected employee’s timer; global “active timers” strip is optional — clarify in FE if QA asserts multi-employee parallel.
2. **Editing running entry intervals** can fight AC-6 — prefer lock interval fields while `stop === null`.
3. **Cascade delete copy** assumes BE cascade — if BE nullifies instead, adjust `employees.deleteConfirmBody` (contract still valid).
4. **Default locale** (`ru` vs browser) — soft; README note.

## 14. Handoff

- **Paths:** `docs/specs/time-tracking/ux.md`
- **Next:** qa `phase: write` (map tests to AC + testids)
- **Then:** backend-dev ∥ frontend-dev per `agent.md`
- Marketer tips: N/A (out of cast)
