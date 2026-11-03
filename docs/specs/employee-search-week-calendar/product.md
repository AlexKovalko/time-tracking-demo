# Employee search + week resource calendar — product intent

**Issue (parent):** [#93](https://github.com/AlexKovalko/time-tracking-demo/issues/93)  
**Slug:** `employee-search-week-calendar`  
**App surface:** `apps/web` (Vite React; **not** `apps/dashboard`)  
**Absorbs:** [#91](https://github.com/AlexKovalko/time-tracking-demo/issues/91) (`GET /employees?q=`)  
**Supersedes framing:** [#92](https://github.com/AlexKovalko/time-tracking-demo/issues/92) CLOSED + draft `docs/specs/pagination-lazyload/product.md` (list `PaginationBar` lazyload / report table pagination — **wrong primary intent**; obsolete input for this stage)  
**Related:** closed [#84](https://github.com/AlexKovalko/time-tracking-demo/issues/84) (client Combobox over `listAllEmployees`; infinite scroll for tables **rejected**)  
**Status:** planning — defaults **locked** below (grill not required for ship)

## Intent

Один связный UX-этап:

1. **(A) Серверный поиск сотрудников** — Combobox «Сотрудник» (фильтр записей, диалог «Новая запись», Timer и прочие call sites `listAllEmployees`) переводится на **debounced** `GET /employees?q=` + `page`/`limit`, с подгрузкой следующих страниц опций в дропдауне при скролле/наборе; выбранный сотрудник остаётся видимым, даже если его нет на текущей странице поиска.
2. **(C) Недельный календарь = resource week** — слева колонка **ФИО сотрудников** (строки), сверху дни недели; убрать у week-view ось часов слева и truncation имён внутри чипов.
3. **(B) List-page «lazyload для пагинации»** — **вне scope** этого этапа (см. Out of scope); primary evidence пользователя = Combobox + calendar shot, не `PaginationBar`.

**Non-regression:** list view entries, day calendar (time-grid + drag-create), CRUD, фильтры period/description, PaginationBar 10/20/50 на списках (#84), i18n ru/en, cap `limit` ≤ 50, report/CSV.

## Ownership (для PM cast)

| Зона | Owner |
| --- | --- |
| `GET /employees?q=` (+ page/limit), поиск по имени на BE | **backend-dev** (`apps/api`) |
| `EmployeeCombobox` async search, `api.listEmployees` `q`, уход от `listAllEmployees` в pickers, week resource layout | **frontend-dev** (`apps/web`) |
| `packages/**` | не трогать, если не потребуется общий тип query — тогда owner в `agent.md` (default backend) |

## As-is (проверено)

| Поверхность | Сейчас | Gap |
| --- | --- | --- |
| `GET /employees` | `page`/`limit` only (`ListEmployeesQueryDto`) | Нет `q` |
| `EmployeeCombobox` | Client filter над массивом `employees` | Родители кормят `listAllEmployees` (цикл страниц) |
| Entries filter / create dialog / Timer | `listAllEmployees` | Нужен BE typeahead |
| Calendar week | Days top, **hour axis left**, chips с truncated ФИО | Нужен resource matrix employee × day |
| Calendar day | Same time-grid | **Оставить** (locked) |
| List PaginationBar loading polish / report table page | Draft #92 | **Не** в этом stage |

---

## Рынок / альтернативы → выбор

### A) Typeahead / Combobox server search

| Источник / класс | Паттерн | Что берём |
| --- | --- | --- |
| Async combobox libs (Selkit, wingo-ui, use-filters) | Debounce ~250–300 ms; `AbortSignal` / stale discard; empty / loading / no-results; page append on scroll near bottom; reset page on new `q` | Debounced BE `q` + lazy option pages |
| #84 prior | Client Combobox OK для demo-scale | **Superseded** как primary data path для pickers — server `q` теперь in-scope (#91 → #93) |
| Table infinite scroll | Rejected in #84 | **Не** переносить на таблицы списков |

#### Подходы (A)

| # | Подход | Плюсы | Минусы | Вердикт |
| --- | --- | --- | --- | --- |
| A-1 | **Debounced `GET /employees?q=&page=&limit=` + Combobox lazy pages; keep selected label** | Закрывает user «поиск через бэкенд»; масштабируется; совпадает со скринами Combobox | Нужен BE + FE wiring; stale race handling | **Locked** |
| A-2 | Оставить `listAllEmployees` + client filter | Уже есть | Не выполняет запрос; лишний full crawl | **Отклонено** |
| A-3 | Только first-page search без scroll-load-more | Проще FE | Длинный штат обрежется без UX | Отклонено (lazy pages in AC) |
| A-4 | Min 2–3 chars before search | Меньше запросов | Хуже «открыл → увидел список» | Отклонено: **empty `q` = первая страница** (browse), typing filters |

### C) Week calendar layout

| Источник / класс | Паттерн | Что берём |
| --- | --- | --- |
| FullCalendar resource / resourceTimeline; RevoGrid resource rows | Resources = rows, time/days = columns; empty resource rows optional | **Employee FIO left, days top** for week |
| FullCalendar timeGridWeek / Toggl / GCal | Hour axis left, days columns | Оставляем для **day** view only |
| Prior calendar epic (`time-tracking-calendar`) | Week = hour time-grid | **Superseded for week only** by this stage |

#### Подходы (C)

| # | Подход | Плюсы | Минусы | Вердикт |
| --- | --- | --- | --- | --- |
| C-1 | **Week = employee × day matrix, без hour axis**; блоки/чипы внутри ячейки (время + описание в chip / `title`); day view = текущий time-grid + drag-range | Читаемые ФИО; типичный resource week; достижимо | Week без вертикального «часа» — время в chip | **Locked** |
| C-2 | Week = resource time-grid (ФИО rows + hour axis still vertical per day) | Точное время по Y | Высота × число сотрудников; сложно; не просили | Отклонено (portfolio) |
| C-3 | Horizontal resource timeline (time L→R) | Industry scheduler | Ломает текущий week chrome (days top) | Отклонено |
| C-4 | Менять day view тоже на resource | Единообразие | User evidence = week shot; day drag-create уже работает | **Отклонено** — day **без изменений** смысла |

#### Create gesture on week (locked with C-1)

- **Week:** drag-range по hour axis **не** требуется. Создание: клик по пустой ячейке employee×day → диалог create с префиллом сотрудника и даты (разумный default start/end, напр. 1 ч); либо кнопка «Добавить запись». Существующие блоки — click → edit.
- **Day:** сохранить текущий hint «Выделите диапазон…» + pointer drag на hour grid.

#### Rows set (locked)

- Фильтр «Все сотрудники»: строки = сотрудники, у которых есть ≥1 запись в видимой неделе (из загруженного calendar range).
- Фильтр один сотрудник: одна строка этого сотрудника (даже если пусто за неделю).
- Пустые строки «всего штата» без записей — **не** обязательны (создание через Combobox/кнопку).

### B) List pagination lazyload

| # | Подход | Вердикт |
| --- | --- | --- |
| B-1 | Epic skeleton/loading на `/employees` `/entries` `/report` PaginationBar | **Out of scope** этого stage → follow-up issue (draft `pagination-lazyload` obsolete as primary) |
| B-2 | Tiny AC «skeleton on page change» | **Не** держим — размывает фокус Combobox+calendar |
| B-3 | Report table PaginationBar | **Не** в этом stage |

---

## Locked recommendations (summary)

1. **BE:** `GET /employees?q=` (optional string; case-insensitive contains on name) + existing `page`/`limit` (max 50). Empty/`omit` `q` = unfiltered page (browse).
2. **FE Combobox:** debounce (~250–300 ms); fetch page 1 on open / on `q` change; append next pages when list scrolled near end while `hasMore`; cancel/ignore stale; **selected employee always labeled** (cache selection or `GET /employees/:id` if needed).
3. **Replace `listAllEmployees`** for EmployeeCombobox consumers (entries filter, create/edit entry, Timer picker, any other picker using full crawl). List pages `/employees` continue paginated `listEmployees` without requiring `q` for table (optional later).
4. **Week calendar:** left = FIO rows; top = days; **no** hour axis on week; chips in cells show description/time (name not primary in chip). **Day view unchanged** (hour axis + drag-create).
5. **B:** no AC in this stage — PM may file follow-up from obsolete #92 draft if still wanted.

---

## Journeys

### J1 — Фильтр записей: найти сотрудника через бэкенд

1. На `/entries` открывает Combobox «Сотрудник» (значение «Все сотрудники»).
2. Видит первую страницу опций (без обязательного ввода).
3. Печатает часть ФИО → после debounce приходит отфильтрованный список с API; при пустом результате — «нет результатов», не ложный empty всего штата.
4. Скроллит список опций → подгружается следующая страница при наличии.
5. Выбирает сотрудника → Apply фильтрует list/calendar; выбранное имя видно в поле после закрытия списка.

### J2 — Новая запись / Timer: выбрать сотрудника без full crawl

1. «Добавить запись» или Timer: Combobox «Выберите сотрудника» с тем же async search.
2. Выбранный сотрудник остаётся на лейбле даже если смена `q` убрала его из текущей страницы опций.
3. Сохранение / старт таймера работают с выбранным `employeeId`.

### J3 — Недельный календарь: ФИО слева

1. `/entries` → Календарь → Неделя.
2. Слева колонка с ФИО; сверху пн–вс; нет оси 00:00… как главной Y для week.
3. Записи лежат в ячейках employee×day; ФИО читаются в левой колонке (не truncated-only в chip).
4. Клик по пустой ячейке → create с префиллом employee + день; клик по блоку → edit.
5. Переключение на **День** — прежний time-grid + drag-range (non-regression).

### J4 — Ошибка / loading поиска

1. Пока идёт первый fetch опций — loading в Combobox, не «пустой штат».
2. Ошибка сети — понятный error/retry pattern (или существующий error секции), без тихой подмены «сотрудников нет».

---

## Acceptance (AC-N)

### AC-1 — Backend employee text search

`GET /employees` принимает optional `q` (и существующие `page`/`limit`). Поиск по имени сотрудника (case-insensitive contains). Без `q` / пустой `q` — прежняя постраничная выдача. Ответ по-прежнему paginated (`items`, `total`, …). Ownership: **backend-dev**.

### AC-2 — EmployeeCombobox: debounced server search

Combobox на фильтре entries, в диалоге создания (и edit, если тот же picker), и в Timer **не** опирается на `listAllEmployees` как primary path: запрашивает API с `q` + debounce; empty query = browse first page.

### AC-3 — Combobox lazy option pages

При открытом списке опций и наличии следующей страницы скролл к низу (или эквивалент) подгружает `page+1` с тем же `q` и **дописывает** опции; новый ввод `q` сбрасывает на page 1.

### AC-4 — Selected employee stays visible

После выбора сотрудник отображается в закрытом/открытом поле даже если его нет в текущем результате поиска/странице (локальный cache выбора и/или fetch by id). Опция «Все сотрудники» на фильтре сохраняется.

### AC-5 — Week calendar: FIO left column

В режиме **Неделя** левая колонка — ФИО сотрудников (resource rows), верх — дни недели. Ось часов как единственная Y-ось week **убрана**. Имена в левой колонке читаемы (не только truncated chip).

### AC-6 — Week cells: entries without relying on hour axis

В week view записи отображаются в ячейках employee×day (чипы/блоки с описанием и/или временем; `title`/tooltip с полным текстом). Набор строк — по locked rules выше (filter all vs one).

### AC-7 — Week create / day non-regression

Week: создание без обязательного drag по часовой оси (клик пустой ячейки → create prefills **или** явный эквивалент, задокументированный в UX/agent). Day view: hour axis + drag-select create hint **сохраняются**. List view и PaginationBar #84 без регрессии.

### AC-8 — Empty / loading / no-results for search

Combobox различает loading, «нет сотрудников в системе» (browse empty), и «нет результатов по запросу». Calendar week empty state (нет строк/записей) остаётся понятным.

---

## Out of scope / follow-ups

- List/report **PaginationBar** skeleton / report table page-fetch epic (obsolete `pagination-lazyload` / #92 framing) — **follow-up issue**, не AC этого stage.
- Infinite scroll на таблицах списков — по-прежнему rejected (#84).
- Resource time-grid week (hours × employees), month view, edge-resize, drag-move entries — follow-up.
- Changing day view to resource layout — out of scope.
- Min-chars-before-search, fuzzy/transliteration beyond contains — follow-up unless eng finds trivial win.
- Architect: только если PM увидит спорный API shape; default contract `q`+page/limit достаточно без отдельного architect stage.

## Open questions

**Нет блокирующих.** Defaults locked; user/PM может override до eng start (особенно week create = cell click vs keep some mini-drag).

## Note for PM

- Создать AC child issues AC-1…AC-8; role cast: минимум `qa write` → `backend-dev` ∥ `frontend-dev` → `qa verify` (ui-ux optional для week matrix; architect optional skip).
- Закрыть/связать #91 после absorb (AC живут под #93).
- Пометить `docs/specs/pagination-lazyload/product.md` как superseded by this slug (можно оставить файл + ссылка сюда).
