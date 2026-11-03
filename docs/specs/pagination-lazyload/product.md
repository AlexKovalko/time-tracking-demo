> **SUPERSEDED** by [`employee-search-week-calendar`](../employee-search-week-calendar/product.md) (parent [#93](https://github.com/AlexKovalko/time-tracking-demo/issues/93)). Primary user intent was Combobox server search + week FIO column, not list PaginationBar lazyload. Keep this file only as historical draft; do not implement as this stage.

# Lazyload for pagination — product intent

**Issue:** [#92](https://github.com/AlexKovalko/time-tracking-demo/issues/92)  
**Slug:** `pagination-lazyload`  
**App surface:** `apps/web` (Vite React; **not** `apps/dashboard`)  
**Related:** closed [#84](https://github.com/AlexKovalko/time-tracking-demo/issues/84) (`PaginationBar` 10/20/50, default 20; infinite scroll **rejected**); open [#91](https://github.com/AlexKovalko/time-tracking-demo/issues/91) (`GET /employees?q=` — **out of scope** here)  
**Status:** planning — defaults **locked** below

## Intent

Сделать загрузку данных **ленивой относительно пагинации** на `/employees`, `/entries` (list) и `/report`: при смене страницы / page size (и при первом показе страницы) запрашивается **только текущая страница**, с явным loading (skeleton / spinner), без «ложного empty» и без подтягивания всего списка «на всякий случай».

**Не** цель: infinite scroll / «подгрузка при скролле». Контролы `PaginationBar` (Prev/Next + size 10/20/50) остаются; lazyload = **on-demand page fetch** + loading UX.

Non-regression: CRUD, фильтры entries, calendar view, таймер, CSV export, i18n ru/en, cap `limit` ≤ 50, контракт #84 для `PaginationBar`.

## As-is (проверено в коде)

| Поверхность | Сейчас | Gap |
| --- | --- | --- |
| `/employees` | `listEmployees({ page, limit })` через react-query | Fetch по странице уже есть; **нет** skeleton/`aria-busy`; при `items=[]` во время load может мигать empty |
| `/entries` (list) | `listTimeEntries` с `page`+`limit` | Fetch по странице есть; empty учитывает `isLoading`, но **нет** скелетона при refetch / смене page; stale vs blank — не зафиксировано |
| `/entries` (calendar) | `listTimeEntriesRange` без page UI | **Вне scope** пагинации (диапазон дня/недели) |
| `/report` | Таблица: `listTimeEntriesRange` → **весь** период одним массивом; **нет** `PaginationBar`. Charts + summary — отдельные query по `applied` from/to | Главный gap: таблица report **eager full-range**. Aggregates уже «по Apply», но loading UI слабый |
| Combobox / `listAllEmployees` | Цикл страниц для селектов | **Не расширять** в #91; не трогать в этом эпике |
| Profile entries | Есть `PaginationBar` | Не в user routes списка; polish loading — **follow-up**, не блокер |

## Рынок / альтернативы → выбор

### Кого смотрели

| Источник / класс | Вывод |
| --- | --- |
| Cognite Aura / SaaS table pagination | Page load без full reload; loader/skeleton; Prev/Next + rows-per-page |
| Protocore / UI Potion data tables | Пока loading — skeleton rows + `aria-busy`; pagination disabled; empty ≠ loading |
| NN/g + LogRocket (pagination vs infinite) | Infinite scroll — для discovery feeds; **плохо** для lookup/CRUD/audit таблиц |

### Подходы

| # | Подход | Плюсы | Минусы | Вердикт |
| --- | --- | --- | --- | --- |
| A | **Page-on-demand + PaginationBar + skeleton/spinner** (сохранить #84) | Совпадает с user «lazyload для пагинации»; a11y; позиция в списке; уже есть API `page`/`limit` | Нужен loading UX на FE; report таблицу перевести на paginated fetch | **Рекомендуется (locked)** |
| B | Infinite scroll / load-more | Меньше кликов на mobile | Отвергнуто в #84; CRUD-таблицы; footer/a11y | **Отклонено** |
| C | Keep-as-is («уже lazy на employees/entries») | Минимум работы | Report всё ещё full-range; нет скелетонов; ложный empty | Отклонено как целевое — gap остаётся |
| D | Prefetch соседних страниц в фоне | Чуть быстрее Next | Лишний трафик; усложнение; не запрошено | Отклонено (не default) |

### Рекомендация (locked)

1. **Контролы:** оставить `PaginationBar` (10 / 20 / 50, default **20**, смена size → page 1). Infinite scroll — нет.
2. **Employees + Entries list:** убедиться, что каждый page/size change бьёт API только с текущими `page`+`limit`; показать **loading** (skeleton rows или эквивалентный spinner в зоне списка) при initial load и при смене страницы; **не** показывать empty, пока идёт загрузка; по возможности `aria-busy` / disabled pagination на время fetch.
3. **Report таблица записей:** добавить тот же `PaginationBar`; грузить страницу через уже существующий paginated `GET /api/time-entries?from&to&page&limit` (не full-range array). Charts / summary / totals — по-прежнему от **applied** периода (Apply); при Apply и смене bucket/breakdown — явный loading, без подмены loading → empty.
4. **BE:** новый endpoint **не обязателен** — `page`/`limit` уже есть у employees и time-entries. Менять calendar/range contract (omit page/limit → full array) не нужно. `#91` server `q` — не трогать.
5. Ownership: преимущественно **frontend** `apps/web`; backend только если verify найдёт реальный gap контракта (не предполагать заранее).

## Journeys

### J1 — Employees: листать страницы без полной загрузки

1. Открывает `/employees` → видит loading в зоне списка, затем первую страницу (default size 20).
2. Жмёт Next / меняет page size → снова loading в списке; приходит только запрошенная страница; range «N–M of T» обновляется.
3. Пока идёт fetch, не показывается «пустой штат», если это не настоящий `total === 0` после успеха.

### J2 — Entries list: то же при фильтрах периода

1. На `/entries` в list view листает страницы / меняет size — on-demand fetch с текущими фильтрами (`from`/`to`/employee/`q`).
2. Loading явный; empty только после успешного ответа с `total === 0`.
3. Calendar view без изменений смысла (не пагинируется этим эпиком).

### J3 — Report: таблица по страницам + aggregates по Apply

1. На `/report` задаёт период, жмёт Apply → charts / summary / totals грузятся для периода (loading, не мгновенный ложный empty).
2. Таблица записей показывает **страницу** с `PaginationBar` (10/20/50); Next/size → новый page fetch, не весь период в DOM.
3. Export CSV по-прежнему для **всего** applied периода (полный отчёт), не только текущей страницы таблицы — поведение экспорта не сужаем до page.

### J4 — Ошибка сети при смене страницы

1. При ошибке fetch пользователь видит понятное error/retry (или существующий error pattern секции), а не вечный skeleton и не пустой список как «нет данных».

## Acceptance (AC-N)

### AC-1 — Employees: page-on-demand + loading

- Список людей на `/employees` запрашивается с `page` + `limit` (выбранный size); **нет** обязательной полной выгрузки всех сотрудников для таблицы.
- При первой загрузке и при смене page / page size виден **loading** (skeleton или spinner в зоне списка).
- Empty state («нет сотрудников») только после успешного ответа с нулевым total / пустой страницей при total=0 — не во время pending.
- `PaginationBar`: 10/20/50, default 20, range, Prev/Next — без регрессии #84.

### AC-2 — Entries list: page-on-demand + loading

- List view на `/entries` использует paginated fetch (`page`+`limit`) с учётом applied фильтров.
- Loading при initial / page / size change; empty только после успешного пустого результата.
- Calendar view не ломаем и не вводим infinite scroll.
- `PaginationBar` как в #84.

### AC-3 — Report entries table: PaginationBar + lazy pages

- Таблица записей на `/report` **не** обязана загружать все entries периода одним full-range запросом для UI.
- Есть `PaginationBar` (10/20/50, default 20); смена page/size → on-demand page fetch + loading в зоне таблицы.
- `total` / range summary отражают число записей периода (с учётом API total), не только длину текущей страницы.
- Edit/delete строки на текущей странице сохраняются; после мутации список/отчёт инвалидируются согласованно с сегодняшним поведением.

### AC-4 — Report aggregates: load on apply + loading

- Summary / charts / totals зависят от **applied** from–to (кнопка Apply), не от «сырых» незакоммиченных дат в инпутах.
- При Apply и при смене bucket/breakdown — видимый loading для соответствующих панелей; не подменять pending ложным empty chart/totals, если данные ещё грузятся.
- CSV export остаётся full-period для applied диапазона (не page-scoped).

### AC-5 — Нет infinite scroll; единообразие loading

- На `/employees`, `/entries` (list), `/report` (entries table) **нет** infinite scroll / auto load-more по скроллу.
- Паттерн loading согласован (skeleton **или** spinner — eng выбирает один язык UI на три поверхности).
- Пока идёт page fetch, контролы пагинации disabled или эквивалентно не дают двойных запросов; желательно `aria-busy` на регионе списка.

## FE vs BE

| Область | Решение |
| --- | --- |
| Employees / entries page fetch | API уже есть — FE loading UX + не показывать false empty |
| Report table | FE: paginated `listTimeEntries` (+ PaginationBar); **не** `listTimeEntriesRange` для таблицы |
| Report charts/summary | Существующие endpoints; loading on apply |
| Calendar / range omit page\|limit | Не менять контракт |
| `GET /employees?q=` | **OOS** → #91 |
| `listAllEmployees` для combobox | Не трогать в этом эпике |
| New BE endpoints | **Не требуются** по умолчанию |

## Out of scope

- Infinite scroll / virtualized endless list
- Numbered page links / teleport page input (follow-up если понадобится)
- Prefetch соседних страниц
- Server employee search (#91)
- Переписывание calendar на page UI
- Employee profile entries loading polish (рекомендуемый follow-up tech-debt issue от PM при желании единообразия)
- Поднятие API `limit` > 50
- Role-stage GitHub issues

## Open questions

**Нет блокирующих.** Defaults locked:

1. Export CSV = весь applied период — **locked** (не page).
2. Skeleton vs spinner — eng/ui-ux выбор одного паттерна; AC требует явный loading, не конкретный компонент.
3. Profile entries — OOS; PM может завести follow-up.

## Handoff to PM

- Создать AC child issues **AC-1…AC-5** → map в `agent.md`.
- Cast hint: после user OK → `qa write` → `frontend-dev` → `qa verify`; backend-dev / architect обычно **не** нужны; ui-ux optional для skeleton language.
- Следующий шаг: **pm**.
