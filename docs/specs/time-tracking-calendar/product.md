# Time-tracking calendar — product intent

**Issue (active parent):** [#64](https://github.com/AlexKovalko/time-tracking-demo/issues/64) — scope amend: **profile charts + UX polish backlog**  
**Predecessor epic:** [#18](https://github.com/AlexKovalko/time-tracking-demo/issues/18) CLOSED (calendar / profile / report charts baseline)  
**Slug (work item):** `time-tracking-calendar`  
**Product slug:** `time-tracking-demo`  
**Project:** Time Tracking Demo (`time-tracking-demo`) — **не Queply**  
**Предшественники:**
- baseline `time-tracking` — [#1](https://github.com/AlexKovalko/time-tracking-demo/issues/1) CLOSED; `docs/specs/time-tracking/{product,agent,ux}.md`
- UI shell `time-tracking-ui` — [#6](https://github.com/AlexKovalko/time-tracking-demo/issues/6); `docs/specs/time-tracking-ui/{product,agent,ux}.md`
- epic `#18` CLOSED — departments + employee profile + Report charts (AC-20…32)

**UI port:** Compose / preview **:8081** (никогда :8080)  
**Статус решений:** planning — defaults **locked** ниже (критический grill не нужен; portfolio scope)  
**Scope amend (2026-11-03):** departments + employee profile + charts — **AC-20…30**; duration/interval display — **AC-31…32**; **AC-1…AC-19** без перенумерации.  
**Scope amend (#64, profile charts):** графики на **Employee profile** за тот же applied `from`/`to` — **AC-33…36**; **AC-1…AC-32** без перенумерации.
**Scope amend (#64, UX polish backlog):** **AC-37…45** (i18n «Подразделение», calendar side-by-side overlap, Report visual amend AC-39/40, entries filters, delete modal keys, profile info block). Data contracts AC-27/28 + PC-1 **stable**; Report **visual** form updates per AC-39/40. **AC-1…36** без перенумерации.

## Intent

Эволюция после `time-tracking-ui`: довести portfolio UX и качество демо-данных.

1. **Lazy loading + pagination** списков (entries / employees — где уместно).
2. **Календарь на всю ширину** с поведением ближе к Google Calendar / Toggl Calendar: week **и** day, hour grid, drag/select-create в разумных пределах portfolio (не полный клон GCal).
3. **Таймер:** по умолчанию только **иконка (FAB)**; панель открывается **по клику** (не постоянно развёрнутый sticky-блок).
4. **Фильтры** минимум: сотрудник + период; плюс поиск по тексту описания (locked ниже).
5. **Данные:** удалить тестовый/мусорный контент; seed с **реалистичными ФИО** и достаточным объёмом time entries для статистики/отчёта **и графиков**.
6. **Баг:** в селекте сотрудника таймера виден raw UUID вместо имени — селекты должны показывать **имя (ФИО)**.
7. **Departments** — сущность отдела + назначение сотрудника; поля профиля (должность / email / phone).
8. **Employee profile** — страница сотрудника: stats + time entries + фильтры периода/текста (паттерн AC-11) + **charts за applied период** (AC-33…36) + labeled info block (AC-43).
9. **Charts** — минимум демо: часы по дням/неделям + разбивка по сотрудникам / подразделениям (2 поверхности); Report visuals: compact over-time + pie/donut breakdown (AC-39/40).
10. **UX polish (#64):** RU «Отдел»→«Подразделение» (AC-37); calendar overlapping entries side-by-side (AC-38); entries filter names + backend pagination (AC-41); delete modal Enter/Esc (AC-42).

**Non-regression:** правила таймера, CRUD, report+CSV, theme/locale, SQLite, port :8081 из baseline + структура nav/routes/modals из `time-tracking-ui` сохраняются, кроме явно **superseded** решений ниже (календарная плотность и chrome таймера).

Нумерация AC этого slug — **AC-1…** заново при создании slug; baseline AC и AC `time-tracking-ui` **не перенумеровываем**. Scope amend **только добавляет AC-20+** — **AC-1…AC-19** остаются стабильными.

---

## Рынок / альтернативы → выбор

### Кого смотрели

| Продукт | Паттерн | Что берём | Что режем |
| --- | --- | --- | --- |
| [Google Calendar](https://medium.com/@khriziakamille/design-patterns-of-google-calendar-fa2823537b4c) | Week/Day; prev/next/today; **drag empty range → create** с префиллом start/end; move/resize событий | Week+Day + hour axis + drag-to-select create + period nav | Guests, recurrence, multi-calendar, year view, полный keyboard map |
| [Toggl Track Calendar](https://support.toggl.com/en-us/article/tracking-time-in-the-calendar-view-1fftm9r/) | Day / week (5-day); click или drag на пустом → entry; drag move + edge resize | Тот же «calendar feel» для time entries; list рядом | Split, projects/tags, Google/Outlook sync, 90-day limits product-copy |
| [Clockify](https://clockify.me/help/reports/filtering-reports) + API pagination | Фильтры period / user / description; **page + page-size** на списках | Employee + date range + description; paginated lists | Projects/clients/tags/approval status как обязательный MVP |
| [Clockify Summary / Dashboard](https://clockify.me/help/reports/summary-report) | Bar chart часов по **дням**; breakdown / pie по User / **Group**; grouping Date / Week / User / Group | Timeline bar (day/week) + breakdown User\|Department | Billable split, projects, 3-level nested grouping, scheduled emails |
| [Toggl Teams + Reports](https://docs.toggl.com/overview-of-the-teams-page) / [Reports](https://docs.toggl.com/overview-of-the-reports-page) | **Teams** как сущности; assign members; filter/group reports by team / member; bar/line + table | Department entity + assign + chart group-by dept/employee | Team leads, time-off, utilization/workload/profitability, custom Analytics dashboards, saved views, share |

**Рыночный вывод:** «календарность» в трекерах = **сетка часов** + навигация периода + прямое создание диапазона жестом. Списки и отчёты живут на **page/limit** и фильтрах. Таймер у Toggl — top bar; наш prior sticky panel OK, но user теперь хочет **icon → panel on click** (ближе к FAB, меньше визуального шума). Команды/отделы у Clockify (**Groups**) и Toggl (**Teams**) — **сущности**, не free-text; отчёты группируют часы по user **и** group/team + bar по датам. Для portfolio достаточно **2 chart surfaces**, не полный Analytics.

### Напряжение с LOCK `time-tracking-ui`

В `time-tracking-ui` было **locked C-A**: week columns **без** hour grid / без Toggl drag; C-C (full hour-axis + drag) — отклонено как OOS.

**Этот ticket supersede’ит** плотность календаря и chrome таймера по новому запросу user. Prior AC-11 (`time-tracking-ui`: week cards без hour grid) и prior AC-6 (всегда видимый sticky panel) для **этого** slug **заменяются** решениями ниже. Nav/routes/employee modal/list∥calendar dual-view/report shell — **сохраняются** (расширяются profile / charts / departments).

### Подходы

#### Календарь (плотность)

| # | Подход | Плюсы | Минусы | Вердикт |
| --- | --- | --- | --- | --- |
| C-1 | **GCal-lite portfolio:** full-width Week + Day, hour axis, prev/next/today, drag-select на пустой сетке → create с префиллом; click entry → edit; list сохраняется | Закрывает запрос user; узнаваемый UX; достижимо | Сложнее week-cards | **Рекомендуется (locked)** |
| C-2 | Оставить week cards без hour grid (`time-tracking-ui` lock) | Уже сделано | Не выполняет новый запрос | **Отклонено / superseded** |
| C-3 | Полный Toggl/GCal: resize edges, cross-day drag, 5-day workweek, month, undo toast, multi-select | Максимум fidelity | Вне portfolio бюджета | **OOS / follow-up** |
| C-4 | Только Day hour grid + week как cards | Половинчато | Слабее «Google Calendar-like» | Отклонено |

**В AC vs follow-up для календаря:**
- **В AC:** Week + Day; hour grid; full width контентной зоны; nav prev/next + today; drag (или эквивалентный select-range) на пустом → диалог/форма create с start/end; click по entry → просмотр/edit; empty day/week state.
- **Follow-up (не AC):** edge-resize существующей записи; drag-move на другой день/час; month view; 5-day workweek toggle; snap UI polish 15‑мин «как у GCal» сверх разумного; keyboard shortcuts GCal.

#### Chrome таймера

| # | Подход | Вердикт |
| --- | --- | --- |
| T-1 | **FAB/icon bottom-right → панель по клику**; при running — badge/elapsed на иконке; hide/restore/stop rules baseline | **Locked** (запрос user) |
| T-2 | Всегда развёрнутый sticky panel (`time-tracking-ui`) | **Superseded** |
| T-3 | Top persistent bar (Toggl) | Отклонено |

#### Pagination / lazy load

| # | Подход | Вердикт |
| --- | --- | --- |
| P-1 | **API offset/limit (или page/pageSize)** + UI pages / «Load more» для **Employees list** и **Time entries List**; календарь грузит **только видимый диапазон** (week/day) без постраничного UI | **Locked** |
| P-2 | Только client-side slice полного ответа | Отклонено (плохой craft API) |
| P-3 | Infinite scroll everywhere | Не обязателен; Load more / pages OK |

#### Фильтры (минимум)

| # | Набор | Вердикт |
| --- | --- | --- |
| F-1 | **Сотрудник** (все / один) + **период** (from/to, согласован с calendar nav) + **текст описания** (contains, optional empty = no text filter) | **Locked minimum** |
| F-2 | + status running/closed | **Follow-up** (не блокер demo) |
| F-3 | Projects/tags/billable как Clockify | OOS |

Где: раздел **Time entries** (list + влияние на calendar dataset); **Employee profile** entries reuse period + description (AC-11 pattern; employee fixed). Report уже имеет период — charts делят тот же period control.

#### Seed / данные

| # | Подход | Вердикт |
| --- | --- | --- |
| S-1 | **Purge** junk + **force reseed**: реалистичные **ФИО**, ≥~8–12 сотрудников, десятки закрытых entries за последние ~2–4 недели + разброс длительностей для report/stats **и charts**; **отделы** + profile fields | **Locked** |
| S-2 | Оставить текущий faker EN + мусор в volume | Отклонено (симптом UUID/junk) |

#### Departments

| # | Подход | Плюсы | Минусы | Вердикт |
| --- | --- | --- | --- | --- |
| D-1 | **Entity Department** (`id`, `name`) + employee.`departmentId`; seed ≥3–4 отделов; select на create/edit; лёгкий CRUD list (create/rename/delete пустого) | Как Clockify Groups / Toggl Teams; стабильные ключи для charts | Чуть больше API | **Locked** |
| D-2 | Free-text `department` string на employee | Быстрее | Ломает агрегацию charts; опечатки | **Отклонено** |
| D-3 | Full org: nested depts, managers, multi-membership | Enterprise fidelity | Вне portfolio | **OOS / follow-up** |

**CRUD depth (locked):** seed + select обязательны; **minimal CRUD** departments (list + create + rename + delete если нет / после снятия назначений). Отдельный богатый «Org chart» UI — OOS. Nav: Departments как подраздел Employees **или** простой list/modal — ui-ux выбирает; продукт требует управляемость сущности, не конкретный layout.

#### Employee profile fields

| Поле | Required? | Locked |
| --- | --- | --- |
| `name` (ФИО) | **Required** | Как baseline |
| `departmentId` | **Optional** в форме (null = «Без отдела» / Unassigned в charts); seed **всегда** назначает отдел | Locked |
| `title` (должность) | **Optional** | Locked — не блокирует create |
| `email` | **Optional** | Locked — формат email если непустое |
| `phone` | **Optional** | Locked — свободная строка |

#### Employee profile surface

| # | Подход | Вердикт |
| --- | --- | --- |
| EP-1 | **Отдельная страница/view** сотрудника: header (ФИО, title, dept, contacts) + **stats** (totals за период) + **список entries** с фильтрами **period + description** (employee зафиксирован; паттерн AC-11). **#64 extends** surface charts (**PC-1**), не заменяет EP-1 | **Locked** (+ charts via PC-1) |
| EP-2 | Только расширенный modal без route | Отклонено — слабее demo depth |
| EP-3 | Full HR dossier (docs, salary, history years) | OOS |

#### Charts

| # | Подход | Вердикт |
| --- | --- | --- |
| CH-1 | **Ровно 2 поверхности** на Report: (1) **Hours over time** — day\|week buckets (data = AC-27); (2) **Hours breakdown** — Employees \| Departments toggle (data = AC-28). **#64 visual amend:** over-time = **one compact chart** with X = day\|week (AC-39), **not** a tall list of per-day horizontal bars; breakdown = **pie/donut** (AC-40), not horizontal bars. RU label **Подразделения**. Profile charts remain separate **PC-1** | **Locked** (+ visual amend AC-39/40) |
| CH-2 | 3+ отдельные страницы Analytics / heatmaps / utilization | OOS |
| CH-3 | Только таблица без charts | Отклонено (запрос user) |
| CH-4 | Pie **and** bar **and** line simultaneously as full Toggl Analytics (extra surfaces beyond the 2) | OOS — follow-up; **pie replacing** breakdown bars on Report is **IN** via AC-40 |

**In-scope charts:** CH-1 two surfaces with AC-39/40 visuals; PC-1 profile bars; пустой период → empty state; seed даёт видимые ненулевые серии.  
**OOS charts:** billable vs non-billable, projects/clients/tags, utilization/capacity, custom dashboards, saved views, scheduled email, nested 3-level grouping, heatmaps, live «who is running now» team wall; third+ Report surface beyond AC-27/28.

#### Profile charts (scope amend #64)

**Рынок (кратко):** Clockify / Toggl не делают отдельный «employee profile charts» как first-class page — member insight = **Report filtered by user** + personal/team dashboard (hours over time; breakdown by project/activity). У нас нет projects → на профиле аналог personal view: **hours over time** + **breakdown по description** (ближайший activity-like сигнал). Report org-wide (**CH-1**) остаётся как есть.

| # | Подход | Pros | Cons | Вердикт |
| --- | --- | --- | --- | --- |
| PC-1 | **2 поверхности на профиле:** (1) **Hours over time** day\|week (как AC-27, scope = этот employee); (2) **Description breakdown** — bar hours by description (top-N + корзина пустого description); период = **тот же applied from/to**, что stats/entries | «Графики» plural; reuse BarChart language; demo depth; meaningful без projects | Чуть больше FE/BE | **Locked (default)** |
| PC-2 | Только **Hours over time** (1 chart) | Минимальный scope | Слабее запрос «графики»; нет «куда ушло время» | Отклонено для #64 |
| PC-3 | Копировать Report breakdown Employees\|Departments на профиль | Переиспользование UI | Бессмысленно для одного employee | **Отклонено** |
| PC-4 | Агрегация **только на клиенте** из уже загруженной (paginated) таблицы entries | Без нового API | Искажение из-за pagination / `q`; расхождение со stats | **Отклонено** |
| PC-5 | **BE aggregates** с `employeeId` (+ period); FE рисует BarChart | Паритет с Report craft; корректные totals | Небольшой API/contract work | **Locked (data)** |

**Связь с фильтрами профиля:** charts и stats используют **applied** `from`/`to` (после Apply, тот же контракт что AC-25/26). Текстовый **`q` / description filter влияет только на список entries**, не на charts (и обычно не на stats) — иначе поиск строки ломает картину периода.  
**Report:** CH-1 stays **exactly 2** org-wide surfaces (AC-27…29 data contracts). **#64 visual amend** only: AC-39 (compact over-time chart) + AC-40 (pie/donut breakdown). Profile = PC-1 (AC-33…36).

### Рекомендация (default) — locked

1. **Календарь C-1 (GCal-lite):** supersede week-cards-only; dual Week\|Day + hour grid + full width + drag-select create + click-to-edit; move/resize → follow-up.
2. **Таймер T-1:** icon-first FAB; panel after click; running state виден на иконке; baseline hide/stop rules адаптировать под новый chrome.
3. **Pagination P-1** на list employees + list entries; calendar range fetch.
4. **Filters F-1:** employee + period + description text на Time entries; profile reuse period + description.
5. **Seed S-1:** purge + realistic FIO + dense entries + **departments + profile fields**; все employee **selects** показывают **name**, не id/UUID.
6. **Departments D-1:** entity + assign + minimal CRUD; не free-text.
7. **Profile EP-1 + PC-1:** dedicated view + stats + filtered entries + **2 profile chart surfaces** (over time + description breakdown) на applied period.
8. **Charts CH-1:** 2 surfaces на **Report** — hours over time (day\|week) + breakdown (employees\|departments); **visuals** per AC-39/40 (compact chart + pie/donut).
9. **BE in cast:** pagination/filter query params + seed reset + department/profile/chart aggregates (**включая employee-scoped** profile charts) — ожидаются; FE — calendar/timer/filters/profile/charts/i18n/polish UI.
10. **UX polish AC-37…45** in #64 cast (i18n, overlap columns, report visuals, entries filter, delete keys, profile info block).

---

## Сущности

Расширение доменной модели (относительно baseline name-only employee):

- **Department** — `id`, `name`; minimal CRUD; seed ≥ **3–4** отделов с различимыми именами.
- **Employee** — `id`, `name` (required), `departmentId` (nullable), `title` (nullable), `email` (nullable), `phone` (nullable); CRUD + **profile view**.
- **Time entry / timer** — без изменения правил max-one-running-per-employee.
- **List query** — period, employeeId?, q/description?, page/limit (или cursor — eng choice, product: paginated); optional `departmentId` filter на employees list — **nice**, не отдельный AC unless free.
- **Calendar query** — from/to видимого Day/Week.
- **Report / charts query** — period from/to → aggregates: hours by day, by week, by employee, by department (eng: one or few endpoints; product: UI surfaces выше).

---

## FE vs BE

| Нужно | Где | Комментарий |
| --- | --- | --- |
| FAB timer chrome | FE | Те же `/api/timers/*` |
| Hour-grid Week/Day + drag-select create | FE (+ API create entry) | Create через существующий POST entry / timer rules |
| Filters employee/period/text | FE + **BE** query params | List должен фильтровать server-side при pagination |
| Pagination employees + entries | **BE** + FE | Обязательный craft |
| Purge + realistic seed (+ depts + profile + chart density) | **BE** / Compose seed | Force reseed path; документация eng/devops |
| Имена в selects | FE mapping + seed quality | AC покрывает UX |
| Department CRUD + assign | **BE** + FE | Entity + FK на employee |
| Employee profile page | FE (+ BE get employee + entries/stats) | Filters period/text |
| Charts 2 surfaces | FE (+ **BE** aggregates или client over filtered range — prefer **BE** aggregates for craft) | Report section |

**Architect:** не обязателен (границы ясны; PM может добавить если eng спорит об aggregate API). **ui-ux:** рекомендуется (calendar, FAB, profile, charts density).

---

## Диагноз бага UUID в селекте

Симптом: в панели «Таймер» поле «Сотрудник» показывает UUID (`a1183d33-…`) вместо ФИО.

Продуктово приемлемы оба класса причин (или оба сразу):

1. **UI mapping / SelectValue** — value=`id`, а label имени не попадает в trigger (пустое/отсутствующее имя в опции, рассинхрон списка).
2. **Качество данных** — junk rows, name=id, или устаревший volume с битыми записями.

**Locked acceptance:** во **всех** employee select’ах (таймер, фильтры, формы entries) пользователь видит **человекочитаемое имя**; UUID/id не являются display-label. Seed после purge даёт реалистичные ФИО. QA проверяет визуально/E2E по тексту имени, не по id.

---

## User journeys

### J1 — Icon timer → panel

1. На любом разделе видна **иконка таймера** (bottom-right), панель **закрыта**.
2. Клик по иконке → открывается панель (сотрудник, описание, Start / running controls).
3. При running: на иконке/badge видно, что таймер идёт (elapsed или индикатор); Stop/hide/restore — baseline rules в новом chrome.
4. Повторный клик / minimize → панель скрывается, сессия не обязана останавливаться.

### J2 — Calendar GCal-lite

1. Time entries → Calendar на **всю ширину** рабочей зоны.
2. Переключить **Week | Day**; prev / next / today.
3. Видна **ось часов**; entries как блоки по времени.
4. Drag (select range) по пустой области → create с префиллом start/end → сохранить → блок на сетке.
5. Click по блоку → edit/delete (как CRUD baseline).
6. Пустой день/неделя — empty, не ошибка.

### J3 — List + filters + pagination

1. Time entries → List: фильтр сотрудник, период, текст описания → Apply/авто.
2. Список постраничный или Load more; смена страницы не сбрасывает осмысленно фильтры без явного Clear.
3. Employees list также paginated при росте seed.

### J4 — Seed / report demo

1. После migrate/seed (или force reseed) — сотрудники с реалистичными ФИО, отделами и profile fields; selects показывают имена.
2. Report за период с seed-данными даёт ненулевую статистику (несколько сотрудников с totals) **и** читаемые charts.
3. Junk/test UUID-looking names в демо-данных отсутствуют.

### J5 — Non-regression shell

1. Nav Employees / Time entries / Report; employee create/edit; theme/locale; CSV — как `time-tracking-ui` + baseline (плюс profile / departments / charts).

### J6 — Departments + employee fields

1. В демо есть список отделов (seed); пользователь может создать/переименовать/удалить пустой отдел (minimal CRUD).
2. Create/edit сотрудника: select **отдел**, опционально **должность / email / phone**.
3. В списке сотрудников видны отдел и/или должность (достаточно одного secondary signal + name).

### J7 — Employee profile

1. Из списка сотрудников открыть **профиль** (route или full-page view).
2. Видны ФИО, отдел, title, email, phone (пустые optional — не «битые» placeholders).
3. **Stats** за выбранный период (хотя бы total hours / count entries).
4. Список time entries этого сотрудника с фильтрами **period + description** (паттерн AC-11; employee зафиксирован).
5. Пустой период / нет записей — empty state.
6. **Charts** за тот же applied period (см. J9).

### J9 — Profile charts (#64)

1. На профиле задать / Apply период `from`/`to` (default как у профиля, ~last 28 days).
2. Видны **две** chart-поверхности (reuse BarChart language где уместно):
   - **Hours over time** — bar по дням; toggle → недели; только entries **этого** employee.
   - **Description breakdown** — bar сравнения часов по description (top-N; пустой description → корзина вроде «Без описания» / Untitled).
3. Сменить период → Apply → charts (и stats) обновляются под новый диапазон; текстовый `q` меняет только таблицу entries.
4. Период без данных → **empty state** на charts, не crash.
5. Report charts (J8) остаются independently usable — non-regression.

### J8 — Charts on Report

1. Report → period picker (существующий или согласованный).
2. **Hours over time:** **один компактный** chart; X = дни; toggle → недели; серии ненулевые на seed-периоде (AC-39 visual).
3. **Breakdown:** toggle Employees | Departments (RU **Подразделения**) → **pie/donut** totals за тот же период (AC-40).
4. Empty period → empty state, не crash; tabular report + CSV non-regression рядом.

### J10 — UX polish (#64)

1. RU UI: везде «Подразделение(я)», не «Отдел(ы)» (включая unassigned).
2. Calendar: два пересекающихся entry в одном дне → колонки рядом.
3. Entries list: employee filter names; pagination/filters hit API.
4. Delete entry: Enter confirms (icon on button); Esc closes.
5. Profile: labeled Должность / Подразделение / Email / Телефон under name.

---

## Acceptance criteria

Нумерация **этого** slug: **AC-1…**  
**Scope amend:** AC-1…AC-19 **не менять номера**; новые требования — **AC-20+**.

### Таймер chrome

- **AC-1.** В покое таймер представлен **иконкой/FAB** в нижнем правом углу (панель **не** всегда развёрнута).
- **AC-2.** По **клику** на иконку открывается панель таймера (сотрудник, описание, Start / управление running); повторное закрытие/minimize скрывает панель без обязательного Stop.
- **AC-3.** При **running** состояние таймера обнаружимо без постоянно открытой панели (badge / elapsed на иконке или эквивалент); Stop / hide / first-hide confirm / restore — non-regression baseline (`time-tracking` AC-17), адаптированные к FAB chrome.
- **AC-4.** Правила **max один running на employee** и сообщения об отказе Start — non-regression (`time-tracking` AC-6) в новом UI.

### Календарь (supersede week-cards-only)

- **AC-5.** Календарь Time entries занимает **полную ширину** основной контентной зоны приложения (не узкая колонка/карточка на долю экрана без необходимости).
- **AC-6.** Доступны режимы **Week** и **Day** с навигацией **предыдущий / следующий** период и **сегодня** (или «текущая неделя» в week mode).
- **AC-7.** В Week и Day отображается **часовая сетка (hour axis)**; записи позиционируются по времени начала/длительности (не только «стопка чипов дня без часов»).
- **AC-8.** Пользователь может **жестом выделения диапазона** (drag/select) на пустой области сетки инициировать **создание** записи с **предзаполненными** start/end; завершение create добавляет запись на календарь (и в list/report после обновления данных).
- **AC-9.** **Клик** по существующей записи на сетке открывает просмотр/редактирование (edit/delete в рамках baseline CRUD).
- **AC-10.** Переключатель **Calendar | List** сохраняется; пустые состояния day/week/list — empty state, не падение.

### Фильтры и pagination

- **AC-11.** На Time entries (как минимум List; Calendar уважает те же фильтры employee/period/text где применимо) доступны фильтры: **сотрудник** (все или один), **период from/to**, **текст описания** (поиск contains; пустой = без текстового фильтра).
- **AC-12.** Список **time entries** поддерживает **пагинацию или lazy load** (серверные page/limit или эквивалент); UI позволяет получить следующую порцию без загрузки «всей истории» одним необязательным unbounded запросом как единственный путь.
- **AC-13.** Список **employees** поддерживает **пагинацию или lazy load** аналогично при объёме seed выше одной страницы (или готовность API+UI даже если одна страница дефолтная).

### Имена сотрудников и seed

- **AC-14.** Во всех UI-селектах сотрудника (таймер, фильтры, формы записей) **отображается имя (ФИО)**, а не raw **UUID/id** в качестве подписи опции/выбранного значения.
- **AC-15.** Демо-данные после seed: сотрудники с **реалистичными человекочитаемыми ФИО**; удалены / не показываются junk/test записи с UUID-подобными «именами» как основным display.
- **AC-16.** Seed создаёт **достаточный** набор закрытых time entries (несколько сотрудников, записи на горизонте roughly последних 2–4 недель) так, что **Report** за пересекающийся период показывает осмысленную статистику (ненулевые totals у ≥2 сотрудников при выборе подходящего периода).
- **AC-17.** Есть способ **пересоздать** демо-данные (force reseed / documented command или Compose hook), очищая прежний junk; повторный seed не оставляет битые select’ы с UUID-label.

### Shell / non-regression / port

- **AC-18.** Nav, routes, employee modal CRUD, Report+CSV, theme light/dark, locale ru/en, SQLite persistence — без регрессии относительно `time-tracking` + `time-tracking-ui` (smoke). *Amend implication:* shell расширяется profile / departments / charts без ломки существующих routes.
- **AC-19.** UI доступен на порту **:8081** (не :8080) в Compose/preview.

### Departments + profile fields (scope amend)

- **AC-20.** Существует сущность **Department** (`id`, `name`); доступен **minimal CRUD** (list + create + rename + delete, когда отдел можно удалить — пустой / после снятия назначений); free-text department на employee **не** является моделью.
- **AC-21.** У сотрудника есть поля: **name** (required), **departmentId** (optional, null = «Без отдела»), **title**, **email**, **phone** (все три optional). Create/edit UI позволяет задать отдел (select) и optional fields; email при непустом значении проходит базовую валидацию формата.
- **AC-22.** Seed создаёт **≥3 отдела** с различимыми именами и назначает **каждому** seeded employee отдел; у **большинства** seeded employees заполнены title и хотя бы одно из email/phone (достаточно для демо профиля).
- **AC-23.** В списке сотрудников помимо ФИО виден **secondary signal** отдела и/или должности (не только UUID).

### Employee profile (scope amend)

- **AC-24.** Из списка (или row action) открывается **профиль сотрудника** (dedicated page/view): header с ФИО, department, title, email, phone (пустые optional не показывают fake UUID).
- **AC-25.** На профиле есть **stats** за выбранный период (минимум: total hours и/или число entries — ненулевые на seed при подходящем period).
- **AC-26.** На профиле — список **time entries этого сотрудника** с фильтрами **period from/to** и **description text** (contains; пустой = без текстового фильтра) — тот же паттерн, что AC-11, без выбора другого employee; empty → empty state.

### Charts (scope amend)

- **AC-27.** На Report (или согласованном analytics block того же раздела) есть chart **Hours over time**: bar (или эквивалент) часов по **дням** выбранного периода с переключением агрегации на **недели**; на seed-периоде серии **видимы и ненулевы**.
- **AC-28.** Там же — chart **Hours breakdown** с toggle **Employees | Departments**: сравнение totals за тот же период; на seed — **≥2 сотрудников** и **≥2 отделов** с ненулевыми totals при подходящем period. Сотрудники без подразделения попадают в корзину «Без подразделения» / Unassigned (RU label per AC-37; was «Без отдела»), если такие есть.
- **AC-29.** Пустой / без данных период для charts → **empty state**, не crash; существующие табличный Report + CSV остаются (non-regression AC-16/18).
- **AC-30.** Force reseed (AC-17) также пересоздаёт **departments**, profile fields и объём entries, **достаточный для AC-27/28** (усиливает AC-15/16 без смены их ID): dense distribution across days/weeks **и** across employees/departments.


### Длительность и интервалы (display format)

- **AC-31.** Везде, где UI (и human-readable CSV/API display, если есть) показывает **длительность**, используется единый формат через **одну shared util** (FE + unit tests; BE — та же логика если отдаёт human-readable):
  - примеры: `48ч` · `4ч 20м` · `2м 5с`;
  - **ru:** суффиксы `ч` / `м` / `с`; **en:** `h` / `m` / `s`;
  - пропускать нулевые старшие/средние части осмысленно: нет `0ч`; ровно N часов без минут/секунд → только часы (`48ч` / `48h`); при наличии минут/секунд без часов — без часовой части (`2м 5с` / `2m 5s`);
  - **если есть часы — секунды не показывать** (truncate): `2ч 26м 19с` → `2ч 26м` / `2h 26m`; секунды OK только без часов (`2м 5с`, `5с`);
  - не показывать пустую строку для нулевой длительности — eng: `0с` / `0s` (или `0м` если округление до минут задокументировано в handoff).
- **AC-32.** **Интервал** start–end в UI (календарь, list, profile, report где показывается диапазон) через shared formatter:
  - **same calendar day (strict):** две строки —
    ```
    DD.MM.YYYY,
    HH:mm - HH:mm
    ```
    (дата с запятой на первой строке; время `HH:mm - HH:mm` на второй). Locale **ru** (default): `DD.MM.YYYY`. Locale **en:** `MM/DD/YYYY` + same newline time line (не ISO в UI).
  - **different calendar days:** одна компактная строка (или две строки без ломания same-day контракта):
    `DD.MM.YYYY HH:mm – DD.MM.YYYY HH:mm` (ru) / `MM/DD/YYYY HH:mm – MM/DD/YYYY HH:mm` (en); en-date order как выше.
  - Running entry без end: показывать start date/time + индикатор running / `…` — не выдумывать end; eng документирует точную строку в handoff.
  - QA asserts same-day layout (newline + comma) и locale suffixes for duration.

### Employee profile charts (scope amend #64)

- **AC-33.** На **Employee profile** есть chart **Hours over time** (bar / тот же visual language что Report): часы по **дням** applied периода с toggle агрегации на **недели**; scope = **только этот employee**; на seed при подходящем period серии **видимы и ненулевы**.
- **AC-34.** Там же — chart **Description breakdown**: bar часов по **description** за тот же applied period (top-N описаний; пустое description → корзина «Без описания» / Untitled или i18n-эквивалент); на seed у демо-сотрудника **≥2** различимых description buckets с ненулевыми totals при подходящем period.
- **AC-35.** Charts на профиле привязаны к **тому же applied `from`/`to`**, что stats и фильтр списка (AC-25/26). Текстовый description/`q` **не** фильтрует charts. Пустой / без данных период → **empty state**, не crash. **Report** data contracts (AC-27…29) **без регрессии**; visual form of Report charts may follow AC-39/40 without changing PC-1.
- **AC-36.** Force reseed (AC-17 / AC-30) сохраняет объём, **достаточный и для AC-33/34** (dense days/weeks **и** несколько description labels у ≥1 employee, чтобы профиль показал ненулевые серии без ручного ввода).

### UX polish backlog (scope amend #64)

- **AC-37.** Во всех RU locale strings и hardcoded RU в `apps/web`: «**Отдел**» → «**Подразделение**» (и согласования: «Отделы»→«Подразделения», «Без отдела»→«Без подразделения» и т.п.) — tabs, forms, charts, unassigned buckets, nav. EN может остаться Department(s) / Unassigned.
- **AC-38.** Calendar (Week и Day): пересекающиеся time entries в одной колонке дня отображаются **side-by-side columns** (делим ширину слота), **не** стопкой / непрозрачным наложением друг на друге.
- **AC-39.** Report **Hours over time:** **один компактный chart**, ось X = day\|week buckets (toggle day\|week). **Не** высокий список горизонтальных bar’ов «по одному ряду на день». Data/behavior AC-27 сохраняется (visual amend).
- **AC-40.** Report **Hours breakdown:** **pie/donut** вместо горизонтальных bars; toggle **Employees | Departments** сохраняется; RU label toggle/секции — **Подразделения** (см. AC-37). Data contract AC-28 сохраняется (visual amend). Pie on Report = **in scope** (supersedes prior OOS note that required pie).
- **AC-41.** Entries list: фильтр сотрудника показывает **имена (ФИО), не UUID**; фильтры и пагинация идут через backend query params `page` / `limit` / `employeeId` / `q` / `from` / `to` — проверить и закрыть gaps (если UI client-only — исправить).
- **AC-42.** Delete entry modal: **Enter** подтверждает удаление (иконка на confirm/primary кнопке); **Esc** закрывает модалку без удаления. Одинаково везде, где есть delete-entry dialog (минимум EntriesSection; ReportSection если там есть).
- **AC-43.** Employee profile: под именем — **labeled info block** с подписями **Должность**, **Подразделение**, **Email**, **Телефон** (не только compact bullet meta). Пустые optional — скрыть поле или показать «—» по eng convention; **новых API-полей нет**.
- **AC-44.** Week bucket labels (Report over-time week mode **и** Profile over-time week mode): **не** ISO `2026-W44`. Формат:
  `DD.MM.YYYY - DD.MM.YYYY (N неделя)` (ru), пример `27.10.2026 - 02.11.2026 (44 неделя)`;
  en: same date span with `(week N)`. Locale-aware via shared FE formatter (document path in eng handoff; prefer `apps/web/src/lib/format.ts` рядом с duration/interval).
- **AC-45.** UI color (FE): charts используют **distinct palette** для bars / pie slices (не монохром black); calendar entries — **distinct colors** per employee or stable hash-of-id palette so side-by-side overlap columns (AC-38) читаемы. Light/dark themes работают; CSS variables; coherent with existing shadcn/tailwind tokens; avoid purple-on-white cliché; **не** раскрашивать весь UI — приоритет charts + calendar (+ subtle accents OK).

---

## Вне scope (явно) / follow-ups

**OOS этого slug:**

- Auth, RBAC, projects, tags, billing, queues, in-app AI
- Полный клон GCal/Toggl: edge-resize, drag-move между днями, month/year, 5-day toggle, recurrence, external calendar sync, GCal keyboard map
- Status filter (running/closed) — **follow-up**
- Обязательный infinite scroll (pages / Load more достаточно)
- Смена порта на :8080
- Nested departments, dept managers, multi-department membership, org chart visualization
- Utilization / capacity / billable charts, project breakdown, custom dashboards, saved views, scheduled report emails, heatmaps
- Третий+ chart surface **на Report** beyond AC-27/28; pie **одновременно с** bar breakdown как лишняя поверхность (замена bars на pie = AC-40 **in scope**); utilization / billable на профиле; Employees|Departments breakdown **на профиле** (см. PC-3 отклонено)
- Full HR profile (docs, salary, attendance years)

**Рекомендуемые follow-up issues (PM/orchestrator создаёт при желании):**

1. Calendar drag-move + edge-resize существующих entries  
2. Month view  
3. Filter by entry status (running/closed)  
4. Report-level employee filter parity (если не сделают заодно)  
5. Department filter on Time entries / Report  
6. Extra chart types beyond AC-39/40 (e.g. utilization, dual pie+bar surfaces) / custom dashboard  
7. Nested org / dept managers  

---

## Locked decisions (сводка)

| Тема | Решение |
| --- | --- |
| Календарь | **GCal-lite** Week+Day + hour grid + full width + drag-select create; supersede week-cards-without-hours |
| Move/resize entries | **Не AC** — follow-up |
| Таймер | **Icon → panel on click**; supersede always-expanded sticky |
| Filters min | Employee + period + description text |
| Pagination | Server-backed lists employees + entries; calendar by visible range |
| Seed | Purge junk; realistic FIO; dense entries; departments + profile; force reseed; chart-ready |
| Selects | Always show **name**, never UUID as label |
| Department | **Entity** + assign + minimal CRUD; **not** free-text |
| Profile fields | title / email / phone **optional**; name required; departmentId optional (seed always set) |
| Profile UX | Dedicated view: stats + entries + period/text filters + **PC-1 charts** |
| Charts (Report) | **2 surfaces (CH-1):** AC-27/28 data; **visuals** AC-39 compact over-time + AC-40 pie/donut; RU **Подразделения** |
| Charts (Profile) | **PC-1:** hours over time (day\|week) + description breakdown; same applied period; BE `employeeId` aggregates; `q` не режет charts (**AC-33…36**) |
| Calendar overlap | **Side-by-side columns** for overlapping entries (AC-38) |
| i18n RU dept | «Отдел» → «Подразделение» everywhere (AC-37) |
| Profile info | Labeled block under name (AC-43); no new API fields |
| Delete modal | Enter confirms; Esc closes (AC-42) |
| Week bucket labels | `DD.MM.YYYY - DD.MM.YYYY (N неделя)` / en `(week N)` — not `YYYY-Www` (AC-44) |
| UI color | Charts + calendar distinct colors; CSS vars; light/dark (AC-45) |
| Entries filters | Names in select; backend `page`/`limit`/`employeeId`/`q`/`from`/`to` (AC-41) |
| UI port | **:8081** |
| Grill | Не блокирует — defaults locked |
| AC numbering | **AC-1…36 intact**; #64 polish = **AC-37…45** (33–36 profile charts; 44 week labels; 45 UI color) |
| Duration display | Shared util; ru `ч/м/с`, en `h/m/s`; skip zero higher parts |
| Interval same-day | `DD.MM.YYYY,` + newline + `HH:mm - HH:mm` (en date `MM/DD/YYYY`) |
| Interval cross-day | `date HH:mm – date HH:mm` with locale date order |

## Открытые вопросы

Блокирующих нет для #64 (PC-1 + polish AC-37…45 locked; user OK: «можно делать параллельно»). Мягкие (уже в `agent.md`):

1. Default calendar mode при первом заходе: **Week** (рекомендуется).  
2. Page size default: **20** (eng OK 10–50).  
3. Язык ФИО в seed: **ru-locale / русские ФИО** предпочтительно для ru UI demo (EN faker fullName допустим только если выглядят как люди, не UUID).  
4. Drag на touch/mobile: desktop-first; mobile — click slot / button create допустим как fallback без отдельного AC.  
5. Departments UI: отдельный nav item vs subsection under Employees — **ui-ux**.  
6. Charts library — eng; Report over-time compact chart + pie/donut; profile keeps bar language unless eng reuses shared.
7. Top-N для description breakdown на профиле: **default 8** (eng OK 5–10); остальное → «Прочее» / Other.
8. Placement charts на профиле: **между stats и entries table**.

## Handoff (PM done → eng)

- **Slug / issue:** `time-tracking-calendar` / **#64** (profile charts + UX polish; epic #18 CLOSED)
- **Спека:** `product.md` + `agent.md` (AC-33…45, API employee-scoped charts, stage + AC issues)
- **Cast:** `pm → qa write → backend-dev ∥ frontend-dev → qa verify`
- **User OK:** received («можно делать параллельно») — eng may start after qa write
- **AC in this ticket:** **AC-33…45** (1–32 historical/stable)
