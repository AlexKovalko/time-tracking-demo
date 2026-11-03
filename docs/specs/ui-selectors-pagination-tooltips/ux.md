# UX / UI contract — ui-selectors-pagination-tooltips

**Issue:** [#84](https://github.com/AlexKovalko/time-tracking-demo/issues/84)  
**Slug:** `ui-selectors-pagination-tooltips`  
**App surface:** `apps/web` (Vite React — **not** `apps/dashboard`)  
**Role:** ui-ux  
**AC children:** [#85](https://github.com/AlexKovalko/time-tracking-demo/issues/85)–[#90](https://github.com/AlexKovalko/time-tracking-demo/issues/90)  
**Status:** done — contract for qa write → frontend-dev  
**Sources:** `product.md`, `agent.md`  
**Marketer:** OUT — copy keys proposed here; **locale JSON owned by frontend-dev only**  
**agentmemory:** skipped (unavailable)

## 1. Primary user jobs

| Job | Surface | AC |
| --- | --- | --- |
| Assign / clear department on employee create/edit | Dialog + **Select** | AC-1 |
| Change rows-per-page on lists | `PaginationBar` | AC-2 |
| Read dense chart values without axis clutter | Profile + Report charts | AC-3, AC-6 |
| Find employee by typing (filter + entry form) | Shared **Combobox** | AC-4, AC-5 |

**Happy path:** create employee with department Select that opens in Dialog → list employees with page size 50 → filter entries by typing a name → create entry via same Combobox → hover/focus/tap a chart bar/slice → tooltip shows category + duration.

**Non-regression:** employee/entry CRUD, timer, report/CSV, theme, locale ru/en, API `limit` ≤ 50. No BE search (`#91` OOS). No new design system.

## 2. Visual language (locked)

- Stay inside existing shadcn/Base UI + Tailwind (neutral surfaces, `Popover`/`Dialog` tokens).
- **Do not** invent a second select look: Combobox trigger should feel like `SelectTrigger` (same height/border/radius); popup like `SelectContent` / popover.
- Chart tooltip: compact floating panel (popover-like: `bg-popover`, border/ring, `text-sm`, shadow) — **same** chrome on profile and report.
- Motion: open/close popup ≤ ~150ms fade/zoom already used by Select; no decorative chart animation.
- Touch hit targets for page-size, Combobox clear, chart segments ≥ ~44px where practical.

### What FE must NOT invent

- Department **Combobox** (AC-1 stays Select)
- Numbered page links / infinite scroll / `limit` > 50
- Server `GET /employees?q=` (follow-up [#91](https://github.com/AlexKovalko/time-tracking-demo/issues/91))
- Third-party chart library
- Replacing all Selects app-wide
- Native SVG `<title>` alone as the only tooltip (insufficient for tap + a11y)
- Session-persist page size as a **required** AC (optional polish OK)

---

## 3. AC-1 — Department Select in Dialog

### Control

Keep Base UI **Select** (`apps/web/src/components/ui/select.tsx`) inside create/edit employee Dialog. Reuse existing sentinel `NONE_DEPT = "__none__"` and testid `employee-department-select`.

### Must fix

| Concern | Contract |
| --- | --- |
| Portal / stacking | Popup **portals above** Dialog (`z-index` > Dialog overlay/content, or nest portal so list is clickable). User can open, scroll, choose without clipping under dialog or backdrop eating clicks. |
| Trigger width | Full width of form column (`w-full`) — already present; keep. |
| Placeholder / empty | When value is «no department», trigger shows `employees.department.none` (via `SelectValue` placeholder or item label) — never blank/broken. |
| Sentinel | First item = «No department»; on choose → form `departmentId: null`. |
| Known departments | Items from loaded departments list; label = department name. |
| Orphan `departmentId` | If id is set but **not** in list: do **not** crash; do **not** silently show another department’s name. Show a dedicated fallback item (disabled or selectable only to clear) with `employees.department.unknown` **and** keep id until user picks a real dept or «none». Prefer: display fallback label in trigger; include orphan as one `SelectItem` so controlled value stays valid. |
| Keyboard | Focus trigger → Enter/Space/Arrow open → arrows move → Enter choose → Escape closes **without** Dialog dismiss if popup was open (popup consumes Escape first). Tab order stays in Dialog. |

### Empty / error

| State | UI |
| --- | --- |
| Departments list empty | Still show sentinel «No department»; optional muted hint OK; do not block save. |
| Departments loading | Trigger disabled or show loading text; no flicker to wrong value. |
| Save validation | Unchanged (name/email rules). |

### testids

| testid | Element |
| --- | --- |
| `employee-department-select` | Select trigger (keep) |
| `employee-department-select-content` | Popup/list root (add if missing — helps QA) |
| `employee-department-none` | «No department» item (optional; QA may use role+name) |

---

## 4. AC-2 — PaginationBar page size

### Layout

```
[ range: N–M of T ]     [ Rows per page ▾ 20 ]  [ Prev ] [ Next ]
```

Wrap OK on narrow screens: range on first row; size + Prev/Next on second. Keep muted `text-sm` chrome.

### Behavior

| Rule | Detail |
| --- | --- |
| Options | **10 / 20 / 50** only |
| Default | **20** (current) |
| Change size | Set `limit` → **page = 1** → refetch; range updates |
| Prev / Next | Existing disabled rules vs `total` + new `limit` |
| Surfaces | Employees list, Time entries list, Employee profile entries — all use shared `PaginationBar` API |
| Cap | Never offer > 50 |

### Props / API (FE guidance)

Extend `PaginationBar` with e.g. `onLimitChange?: (limit: number) => void` and controlled `limit` (already passed). Size control lives **inside** `PaginationBar` so all three call sites stay consistent.

### testids

| testid | Element |
| --- | --- |
| `{testId}` | Root (unchanged): `employees-pagination`, `entries-pagination`, `employee-profile-pagination` |
| `{testId}-prev` / `-next` | Unchanged |
| `{testId}-page-size` | Page-size Select/Combobox **trigger** |
| `{testId}-page-size-content` | Optional popup root |

---

## 5. AC-4 / AC-5 — Shared Employee Combobox

**Product:** same UX pattern for filter and form. Shared component vs duplicated markup = eng decision; behavior must match.

There is **no Combobox** in the project yet — introduce one (Base UI Combobox / Popover+Command-style) consistent with Select chrome. Prefer `apps/web/src/components/ui/combobox.tsx` + thin `EmployeeCombobox` wrapper, or one `EmployeeCombobox` that embeds primitives.

### Variants

| Variant | Where | Value model | Clear |
| --- | --- | --- | --- |
| **filter** | Time entries filters | `all` \| employeeId | Clear → `all` (or dedicated clear control); «All employees» is a first-class option |
| **form** | Create (and edit if same field) time entry | required employeeId \| empty | Clear → empty; submit validation unchanged (`entries.errors.employeeRequired`) |

### Interaction contract

1. Focus trigger/input → type to filter **client-side** over `listAllEmployees` (name match; case-insensitive; trim). Optionally match email if shown — name is enough for v1.
2. Open list shows filtered options; highlight matches optional (not required).
3. Choose option → commit id; close popup; for **filter**, selection updates filter draft (Apply still required if current filter UX uses Apply — **do not change Apply/Clear filter semantics** beyond replacing the employee Select with Combobox). Prefer: selecting employee in filter updates `filterEmployeeId` the same way Select `onValueChange` did today.
4. **Escape** / click-outside / dismiss **without** choosing: restore input to display of **previously committed** value; do **not** replace committed id with partial typed text.
5. Typing after a selection: either clear selection until re-pick (common) **or** keep committed id until new pick — pick one and keep consistent. Locked preference: **committed value stays until a new option is chosen or Clear**; query string is ephemeral for filtering the list only. Blur without choose → revert query to selected label / «All».
6. Keyboard: ArrowUp/Down, Enter select, Escape dismiss (see above), Home/End optional.

### States

| State | Copy key (proposed) | UI |
| --- | --- | --- |
| Loading employees | `combobox.employee.loading` | Disabled or spinner in popup |
| Empty roster | `combobox.employee.empty` | Message in popup; form cannot pick |
| No filter matches | `combobox.employee.noResults` | Message; keep query; no fake first item |
| Filter «all» | `entries.filter.employeeAll` | Existing |
| Placeholder (form) | `entries.employeePlaceholder` or reuse `timer.employeePlaceholder` | Visible until chosen |
| Clear (a11y name) | `combobox.employee.clear` | Icon button when value ≠ all/empty |

### Filter vs form differences

- Filter includes **All employees** option at top when query empty (hide when query non-empty OR keep pinned — prefer **pinned only when query empty**).
- Form does **not** include «all»; empty = invalid for submit.

### testids

| testid | Element |
| --- | --- |
| `entries-filter-employee` | Filter Combobox trigger/input root (keep) |
| `entries-filter-employee-input` | Typeahead input (if split from trigger) |
| `entries-filter-employee-list` | Popup listbox |
| `entries-filter-employee-clear` | Clear control (when visible) |
| `entries-create-employee` | Create-dialog Combobox root/trigger (**add** — missing today) |
| `entries-create-employee-input` | Typeahead input |
| `entries-create-employee-list` | Popup listbox |
| `entries-edit-employee` | Edit dialog equivalent if same control (add if edit has employee field) |

---

## 6. AC-3 / AC-6 — Chart labels via tooltips

### Problem today

`CompactBarChart` draws **rotated dense X labels** + SVG `<title>` only. Reports use the same compact chart + `PieChart` with side legend (truncated names OK as secondary).

### Target visual language (profile + report)

| Element | Contract |
| --- | --- |
| X-axis labels on `CompactBarChart` | **Remove** dense rotated full labels. Allowed: no labels, or **sparse** ticks (e.g. first/middle/last, or every Nth when count > ~8) with short text. Prefer **no** per-bar axis text when `rows.length > 6`. |
| Bottom padding | Reduce `PAD_B` once labels gone so chart is less sparse vertically. |
| Bar / slice interaction | Hover **and** keyboard focus **and** tap (touch) show **tooltip**: `{category}: {formattedDuration}`. |
| Tooltip chrome | Single shared pattern (portal or absolutely positioned near pointer/segment); dismiss on pointer leave, blur, Escape, or second tap outside. |
| Value format | Existing `formatDuration` + locale — do not invent new units. |
| Week/day buckets | Keep existing `bucket` / `formatWeekBucketLabel` semantics (non-regression). |
| `PieChart` | Keep compact legend (truncate OK). Ensure slice hover/focus/tap uses **same tooltip chrome** with full label + duration (not only `<title>`). Legend row may also show tooltip on truncated text focus/hover (nice-to-have). |
| `BarChart` (horizontal list) | Already shows label+value — **not** required to strip; optional tooltip if truncated. Do not regress. |
| Empty | Existing empty dashed region + empty testids unchanged. |
| SR | Keep `sr-only` full list **or** expose tooltip text via `aria-label` on focused segment (`{label}: {duration}`). Segment should be focusable (`tabIndex={0}` or equivalent). |

### Interaction details

- Pointer: mouseenter segment → show; mouseleave → hide (unless moving onto tooltip).
- Keyboard: Tab to segment → show; blur → hide; Escape hides tooltip without leaving chart region if possible.
- Touch: first tap shows tooltip and selects segment; tap outside / second tap elsewhere dismisses. Do not require long-press.
- Only one tooltip visible at a time.

### testids

| testid | Element |
| --- | --- |
| Existing chart roots | Keep: `employee-profile-chart-over-time`, `report-chart-over-time`, pie roots, empty ids |
| `chart-tooltip` | Visible tooltip panel (shared id OK — one in DOM) |
| `data-segment` | Keep on bars/slices |
| `data-segment-label` | Keep (full category string for QA) |

---

## 7. Proposed locale keys

FE owns JSON. Suggested keys (RU/EN meaning):

| Key | EN (suggested) | RU (suggested) |
| --- | --- | --- |
| `pagination.pageSize` | Rows per page | Строк на странице |
| `pagination.pageSize.option` | `{{n}}` | `{{n}}` |
| `employees.department.unknown` | Unknown department | Неизвестный отдел |
| `employees.department.placeholder` | Select department | Выберите отдел |
| `combobox.employee.placeholder` | Search employee… | Найти сотрудника… |
| `combobox.employee.loading` | Loading employees… | Загрузка сотрудников… |
| `combobox.employee.empty` | No employees yet | Нет сотрудников |
| `combobox.employee.noResults` | No employees found | Сотрудники не найдены |
| `combobox.employee.clear` | Clear selection | Очистить выбор |
| `charts.tooltip.a11y` | `{{label}}: {{value}}` | `{{label}}: {{value}}` |

Reuse existing: `employees.department.none`, `entries.filter.employeeAll`, `entries.employeeLabel`, `timer.employeePlaceholder`, `pagination.range` / `prev` / `next`, `charts.empty`, duration formatting.

Do **not** require marketer review.

---

## 8. A11y checklist

- [ ] All new controls have visible `<Label>` or `aria-label` (page size, Combobox, department).
- [ ] Combobox: `role="combobox"` + listbox/options pattern (or Base UI defaults); `aria-expanded`, `aria-controls`, `aria-activedescendant` as provided by primitive.
- [ ] Combobox Escape does not wipe committed value; does not close parent Dialog while popup open (popup first).
- [ ] Department Select usable with keyboard inside Dialog; popup above dialog; focus trap of Dialog intact.
- [ ] Page-size Select: name via label `pagination.pageSize`; changing size announced implicitly by updated range text (range in same toolbar is enough; no live region required).
- [ ] Chart segments keyboard-focusable; tooltip or `aria-label` exposes category + duration.
- [ ] Touch: tap shows tooltip without needing hover.
- [ ] Contrast AA for tooltip text on popover bg (light + dark).
- [ ] Clear buttons have accessible names (`combobox.employee.clear`).
- [ ] Do not rely solely on SVG `<title>` for AC-3/AC-6.

---

## 9. Empty / error matrix (quick)

| Surface | Empty | Error / edge |
| --- | --- | --- |
| Dept Select | Only «No department» | Orphan id → unknown fallback |
| Page size | n/a | `total=0` → range `0–0 of 0`; Prev/Next disabled |
| Employee Combobox filter | `combobox.employee.empty` / noResults | Loading state |
| Employee Combobox form | empty roster blocks meaningful choose | Required validation on submit |
| Charts | existing empty copy/testids | Zero-value bars: no bogus tooltip required |

---

## 10. QA mapping hints

| AC | Issue | Primary assertions |
| --- | --- | --- |
| AC-1 | #85 | Open create/edit Dialog → open `employee-department-select` → choose dept / none → save payload; orphan safe |
| AC-2 | #86 | `{pagination}-page-size` options 10/20/50; default 20; change → page 1 + range |
| AC-3 | #87 | Profile compact chart: no dense rotated labels; tooltip on hover/focus/tap |
| AC-4 | #88 | `entries-filter-employee` typeahead filters; clear/all; noResults |
| AC-5 | #89 | `entries-create-employee` Combobox; Escape keeps value; required validation |
| AC-6 | #90 | Report charts same tooltip language as profile |

---

## 11. Open design risks

1. **Select z-index vs Dialog** — both use `z-50` today; eng must verify popup clickability (likely raise Select portal z or use `modal={false}` patterns). Blocker only if Base UI cannot stack — then post on #84.
2. **Filter Apply semantics** — Combobox should not silently bypass Apply if other filters still use Apply; keep parity with current Select → draft state → Apply.
3. **Touch tooltip vs scroll** — chart horizontal scroll on compact bars: tooltip should not block scrolling unintentionally (prefer show on tap of segment only).
4. **Large employee lists** — client filter OK for demo; perf → #91, not this cast.

## 12. Next

**qa write** (`phase: write`) against AC-1…AC-6 using testids above → then **frontend-dev**.
