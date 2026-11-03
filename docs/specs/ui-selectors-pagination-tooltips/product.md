# UI polish: selectors, pagination, chart tooltips — product intent

**Issue:** [#84](https://github.com/AlexKovalko/time-tracking-demo/issues/84)  
**Slug:** `ui-selectors-pagination-tooltips`  
**App surface:** `apps/web` (Vite React dashboard; **not** `apps/dashboard`)  
**Related closed:** [#64](https://github.com/AlexKovalko/time-tracking-demo/issues/64) (prior UX polish: charts, calendar, filters)  
**Status:** planning — defaults **locked** below (grill not required for this polish batch)

## Intent

Пакет **UI/UX polish** без изменения доменной модели: починить сломанные/неудобные селекторы сотрудников и отделов, расширить пагинацию списков, убрать визуальный шум подписей на графиках профиля и отчётов за счёт **тултипов**. Цель — сделать повседневные сценарии (создание сотрудника/записи, фильтр записей, просмотр графиков) предсказуемыми на уровне portfolio-демо, не раздувая scope в новый design system и не требуя BE search в v1 этого пакета.

Non-regression: CRUD сотрудников/записей, таймер, отчёты/CSV, i18n ru/en, тема, API pagination `limit` 1–50 — поведение данных не ломаем; меняем **контролы и плотность подписей**.

## Рынок / альтернативы → выбор

### Кого смотрели (паттерны)

| Тема | Источники / класс | Что берём |
| --- | --- | --- |
| Searchable select / combobox | Staffbase Spark Searchable Single Select; Flair Pickers; SaaS dropdown/combobox guides | Combobox, когда список людей > ~10–12 или пользователь знает имя и хочет печатать; обычный Select — для коротких фиксированных списков (отделы) |
| Pagination page size | Elastic UI table pagination; accessible data-table guidance | «Rows per page» + range summary; опции порядка 10 / 20–25 / 50; смена размера → page 1; без infinite scroll |
| Chart labels → tooltips | Primer data viz; Flourish text-in-viz; micro-chart patterns (Appian-like) | Плотные оси/легенды не дублировать полными длинными лейблами; hover/focus tooltip = категория + значение; ось — коротко или опущена при плотности |

### Подходы (сравнение)

#### A. Employee picker (фильтр entries + create/edit time entry)

| # | Подход | Плюсы | Минусы | Вердикт |
| --- | --- | --- | --- | --- |
| E-A | **Client Combobox / typeahead** поверх уже загруженного списка (`listAllEmployees`) | Закрывает broken Select; поиск по имени без BE; единый паттерн для filter + form | При очень больших штатах список тяжелее; нет server `q` | **Рекомендуется (locked)** для этого пакета |
| E-B | Чинить только Base UI Select (без поиска) | Меньше кода | Не решает «найти сотрудника по имени» при росте списка; backlog явно просит text/typeahead | Отклонено |
| E-C | Server search `GET /employees?q=` сразу | Масштабируется | Нужен BE + контракт; для demo-объёмов избыточно | **Отложено** → follow-up, если штат / perf покажет необходимость |

#### B. Department selector (create/edit employee)

| # | Подход | Плюсы | Минусы | Вердикт |
| --- | --- | --- | --- | --- |
| D-A | **Починить Select в Dialog** (portal/positioning, placeholder, sentinel «без отдела», orphan `departmentId`) | Отделы обычно короткие; Select уместен; минимальный scope | Не добавляет поиск | **Рекомендуется (locked)** |
| D-B | Combobox и для отделов | Единообразие | Overkill для короткого списка | Отклонено как default |

#### C. Pagination

| # | Подход | Плюсы | Минусы | Вердикт |
| --- | --- | --- | --- | --- |
| P-A | **Page-size select 10 / 20 / 50** + существующие Prev/Next + range; default **20**; смена размера → page 1; cap **50** (= API) | Совпадает с API; закрывает «только 20»; привычный SaaS паттерн | Нет numbered pages | **Рекомендуется (locked)** |
| P-B | Numbered page links + ellipsis | Удобно прыгать далеко | Больше UI; не запрошено явно | OOS / follow-up |
| P-C | Infinite scroll | «Современно» | Плохо для CRUD-таблиц, позиции и a11y | Отклонено |
| P-D | Поднять API max > 50 | Больше строк на экране | Меняет контракт; риск perf | Отклонено в этом пакете |

#### D. Chart labels (profile + reports)

| # | Подход | Плюсы | Минусы | Вердикт |
| --- | --- | --- | --- | --- |
| C-A | **Убрать/сжать плотные X-лейблы**; полный label + formatted value в **tooltip** (hover + keyboard/focus где применимо); легенда не дублирует длинные имена категорий | Чистый compact chart; совпадает с backlog #3 и #6 | Touch: tap-to-show tooltip нужен | **Рекомендуется (locked)** на `CompactBarChart` (+ согласованность Pie/Bar если они шумят так же) |
| C-B | Оставить rotated dense axis labels + title attribute | Уже частично есть | Всё ещё clutter; title-tooltip слабый a11y | Отклонено как целевое состояние |
| C-C | Внешняя chart library | Богатые тултипы | Вне polish-scope | Отклонено |

### Рекомендация (default) — locked

1. **Employee filter** (time entries) и **employee field** (new/edit time entry): общий **searchable combobox** (typeahead), client-side filter по загруженному списку; clear / empty / no-results; Escape без смены значения; i18n.
2. **Department** на create/edit employee: **Select**, но исправленный (видимый, кликабельный в Dialog, понятный «без отдела», корректный submit `null` / id).
3. **PaginationBar** (+ секции Employees / Entries / Profile entries): выбор **10 / 20 / 50**, default 20, range + Prev/Next; page reset при смене size. Persistence выбранного size — **nice-to-have session** (не блокер AC).
4. **Profile + Report charts**: подписи категорий/серий **через tooltip**, не через плотную ось/легенду; значение в человекочитаемом формате длительности где уместно.
5. **BE в этом пакете не обязателен.** Server `q` для employees — только follow-up, если client list станет узким местом. Менять `limit` max > 50 — не делать.
6. Ownership реализации: **frontend** `apps/web`; locales `ru.json` / `en.json`. Architect не обязателен для polish (границы уже ясны); ui-ux может уточнить визуальный контракт combobox/tooltip по желанию PM.

## Journeys

### J1 — Создать / редактировать сотрудника (отдел)

1. Пользователь открывает Dialog create или edit employee.
2. Видит поле отдела с понятным placeholder / текущим значением (в т.ч. «без отдела»).
3. Открывает список отделов **поверх** диалога, выбирает значение или «без отдела».
4. Сохраняет: `departmentId` уходит корректно (`null` или id); orphan id не ломает UI (fallback / безопасное отображение).

### J2 — Листать списки с нужным размером страницы

1. На Employees / Time entries (list) / entries на профиле видит range («N–M of T») и Prev/Next.
2. Меняет page size на 10, 20 или 50 → список перезапрашивается с новым `limit`, страница сбрасывается на 1, range обновляется.
3. При `total ≤` выбранного size навигация Next disabled / осмысленно неактивна.

### J3 — Фильтр записей по сотруднику

1. На Time entries пользователь фокусирует фильтр сотрудника и **печатает** часть имени.
2. Список опций сужается; выбирает сотрудника → список записей фильтруется.
3. Может очистить фильтр → снова все (в рамках прочих фильтров периода и т.д.).
4. Нет совпадений → явное empty/no-results, не «пустой сломанный select».

### J4 — Новая запись времени: выбрать сотрудника

1. В Dialog/форме new (и edit, если то же поле) сотрудник выбирается через **тот же combobox-паттерн**, что и фильтр (поиск + выбор обязательного employee).
2. Без выбора сотрудника submit блокируется / валидация как сейчас по правилам формы (не ослаблять).

### J5 — Графики профиля и отчётов

1. Пользователь открывает профиль сотрудника или раздел Report с chart data.
2. Ось/легенда **не** завалены длинными повёрнутыми лейблами.
3. Hover (и tap на touch) по столбику/сегменту показывает **tooltip**: категория + значение.
4. Empty state графиков без изменений смысла (нет данных → empty copy).

## Acceptance (AC-N)

Карта 1:1 к backlog items эпика #84.

### AC-1 — Department selector (create/edit employee)

- В create/edit employee Dialog селектор отдела **открывается и позволяет выбрать** отдел или «без отдела».
- Placeholder / пустое состояние понятны; выбранное значение видно после выбора.
- Сохранение с «без отдела» пишет `departmentId: null`; с отделом — корректный id.
- Orphan / неизвестный `departmentId` не роняет форму (безопасный fallback, без silent wrong department name).
- Клавиатура: Select остаётся usable (focus, open, choose) в контексте Dialog.

### AC-2 — Pagination page sizes

- `PaginationBar` (или эквивалент в затронутых секциях) даёт выбор размера страницы **10, 20, 50** (labels i18n).
- Default size **20** (как текущий API default).
- Смена size вызывает загрузку с новым `limit`, **page = 1**, range summary обновляется.
- Prev/Next и disabled-состояния согласованы с новым `limit` и `total`.
- Не предлагать size > 50 без изменения API (в этом пакете не меняем cap).

### AC-3 — Profile charts: labels via tooltips

- На графиках профиля (`CompactBarChart` / связанные) плотные длинные подписи оси **не** загромождают chart.
- При наведении / фокусе (и tap на touch) показываются **категория + значение** в tooltip.
- Empty chart state сохраняется.
- Не регрессировать смысл bucket-форматов (day/week), уже принятых ранее.

### AC-4 — Time entries: employee filter typeahead

- Фильтр сотрудника на Time entries — **text input / typeahead (combobox)**, не «сломанный» plain Select.
- Фильтрация опций по вводу (client-side по загруженному списку employees).
- Выбор применяет фильтр записей; clear сбрасывает фильтр сотрудника.
- No-results и loading/empty списка сотрудников — явные состояния (i18n).

### AC-5 — New time entry: employee selector

- Поле сотрудника при создании (и edit, если то же control) использует **searchable combobox** (тот же UX-паттерн, что AC-4).
- Обязательность сотрудника и ошибки валидации не ослаблены.
- Выбор из списка коммитит employee id в форму; Escape / dismiss popup без выбора не подменяет уже выбранное значение неожиданно.

### AC-6 — Reports charts: labels via tooltips

- Графики в Report применяют тот же принцип, что AC-3: читаемый chart + **tooltip** с категорией и значением вместо плотных axis/legend labels.
- Согласованность с profile charts (один визуальный язык тултипа).
- Empty / no-data states без регрессии.

## FE vs BE

| Область | Решение |
| --- | --- |
| Combobox employees | **FE-only** поверх `listAllEmployees` (или эквивалент полного списка) |
| `GET /employees?q=` | **Не в scope** пакета; follow-up при росте данных / perf |
| Pagination `limit` | Уже 1–50 — FE передаёт выбранный size; **не** поднимать cap |
| Charts tooltips | FE SVG/components only |
| Locales | `apps/web` `ru` / `en` |

## Out of scope

- Новый design system / замена всех Select в приложении
- Numbered pagination, infinite scroll, page size > 50
- Server-side employee search
- Переписывание charts на стороннюю библиотеку
- Изменение бизнес-правил таймера, прав, CSV, календарного view
- Роль-stage GitHub issues (только parent #84 + AC children от PM)

## Open questions (non-blocking)

Зафиксированы defaults; **не блокируют** PM/eng. PM может уточнить в `agent.md` без повторного grill:

1. Session-persist выбранного page size — **nice-to-have**, не обязателен для PASS AC-2.
2. Нужен ли отдельный shared `EmployeeCombobox` компонент vs inline — **eng decision**, продукт требует единого UX filter+form.
3. Точный a11y контракт tooltip на touch (tap toggle) — ui-ux may refine; минимум: desktop hover + доступное имя/описание значения.

## Handoff to PM

- Создать AC child issues AC-1…AC-6 → #84 map в `agent.md`.
- Cast suggestion (hint only): после user OK → `qa write` → `frontend-dev` → `qa verify`; ui-ux optional; backend-dev / architect **не** нужны, пока не откроют follow-up на `q`.
- Следующий шаг пайплайна: **pm**.
