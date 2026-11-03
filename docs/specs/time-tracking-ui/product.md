# Time-tracking UI — product intent

**Issue:** [#6](https://github.com/AlexKovalko/time-tracking-demo/issues/6)  
**Slug:** `time-tracking-ui`  
**Project:** falconai (не Queply)  
**Предшественник:** slug `time-tracking` — parent [#1](https://github.com/AlexKovalko/time-tracking-demo/issues/1) CLOSED; спеки `docs/specs/time-tracking/{product,agent,ux}.md`, стек `docs/STACK.md`  
**UI port:** Compose / preview **:8081** (никогда :8080)  
**Статус решений:** planning — defaults **locked** ниже (grill не блокирует; portfolio scope)

## Intent

Эволюция UI уже работающего учёта времени: уйти от «сырого» single-page с тремя стековыми CRUD-блоками к **нормальной структуре приложения** — меню навигации по разделам, добавление сотрудника через **модалку**, **sticky-таймер** в нижнем правом углу, просмотр всех записей времени в **двух вью** (календарь и список/таблица). Визуал и IA подтянуть до аккуратного portfolio-уровня на существующем стеке (React + Tailwind + shadcn/ui).

Это **намеренное** изменение UX-контракта `time-tracking` (там: одна страница / три блока / таймер in-page; calendar/timesheet grid был OOS). Не баг и не «вернуть как было» — **re-open calendar как view** рядом со списком.

**Функциональные гарантии v1 не ломаем** (non-regression): правила таймера (в т.ч. max один running на employee, live elapsed, hide/restore/stop-collapsed + one-time first-hide confirm), полный CRUD сотрудников и записей, отчёт за период + CSV, тема light/dark, i18n ru/en, persistence SQLite. Новые **AC-1…** этого slug описывают **структуру UI**; старые AC-1…AC-20 из `time-tracking` **не перенумеровываем** — ссылаемся как на baseline.

## Рынок / альтернативы → выбор

### Кого смотрели (паттерны)

| Продукт / класс | Nav + timer | Views записей | Что берём / что режем |
| --- | --- | --- | --- |
| [Toggl Track](https://support.toggl.com/en-us/article/the-timer-page-x46p31/) | Sidebar nav; **persistent timer bar сверху** страницы Timer | Calendar / List / Timesheet на одной зоне; week/day calendar с hour grid, drag-create | Nav + переключатель Calendar∥List — да. Top bar и timesheet/drag — нет (user: sticky **bottom-right**; timesheet OOS) |
| Clockify / аналоги | Боковое или верхнее меню разделов; таймер часто в шапке или на отдельной странице Track | List + Calendar; отчёты отдельно | Разделение **Employees / Time / Report** + отдельный report — да |
| Prior falconai v1 | Нет меню; 3 блока на одной странице; таймер в середине main | Только list в Report | Базовый CRUD/API оставляем; IA и chrome меняем |

**Рыночный вывод:** зрелые трекеры отделяют **навигацию разделов**, держат **таймер всегда доступным** при смене view, и дают **несколько представлений** одних и тех же entries (list + calendar). Для multi-employee portfolio без проектов/тегов достаточно week-колонок с карточками дней + таблица — без hour-axis и drag-resize как у Toggl.

### Подходы (сравнение)

#### Навигация

| # | Подход | Плюсы | Минусы | Вердикт |
| --- | --- | --- | --- | --- |
| N-A | **Client routes** (`/employees`, `/entries`, `/report`) + nav menu | Понятная IA; deep-link; чище E2E; portfolio «как настоящее app» | Нужен router | **Рекомендуется (locked)** |
| N-B | Одна страница + hash/якоря + sticky nav | Меньше зависимостей | Слабее ощущение разделов; URL менее явный | Отклонено |
| N-C | Только tabs без URL | Быстро | Хуже a11y/history; не масштабируется | Отклонено |

#### Sticky timer

| # | Подход | Плюсы | Минусы | Вердикт |
| --- | --- | --- | --- | --- |
| T-A | **Floating panel bottom-right** (compact card / FAB-panel) | Совпадает с запросом user; виден на любом разделе | Не перекрывать контент/CTA на mobile | **Рекомендуется (locked)** |
| T-B | Top persistent bar (Toggl) | Привычно рынку | Против явного запроса user | Отклонено |
| T-C | Full-width bottom bar | Всегда на виду | Занимает ширину; конфликтует с mobile safe-area | Отклонено |

#### Календарь vs list

| # | Подход | Плюсы | Минусы | Вердикт |
| --- | --- | --- | --- | --- |
| C-A | **Week view**: 7 колонок дней, entries как chips/cards (без hour grid) + **List/Table** toggle | Достаточно «календарности»; FE-only на `from`/`to`; умеренный scope | Нет визуализации часа дня | **Рекомендуется (locked)** |
| C-B | Month grid + chips по дням | Хороший overview месяца | Хуже для «что было в течение дня»; больше пустых ячеек | Отклонено как default (можно follow-up) |
| C-C | Full hour-axis week + drag-create (Toggl) | Богатый UX | Высокая сложность; почти timesheet — OOS для portfolio | Отклонено |
| C-D | Только list (как v1) | Просто | Не выполняет запрос user | Отклонено |

#### Create employee

| # | Подход | Вердикт |
| --- | --- | --- |
| E-A | **Modal (Dialog)** для create (и желательно edit) | **Locked** — запрос user |
| E-B | Inline form вверху списка (как v1) | Отклонено для create |

### Рекомендация (default) — locked

1. **SPA с client-side routes** + постоянное **nav menu** (Employees · Time entries · Report) + app chrome (тема, локаль).
2. **Create employee** — только через **модалку**; список на разделе Employees без inline-create strip.
3. **Timer** — **sticky floating panel** в **нижнем правом** углу на всех разделах; логика hide/restore/Stop/AC-6 из v1 сохраняется (адаптировать chrome под floating, не in-page block).
4. Раздел **Time entries**: переключатель **Calendar | List (table)**; календарь = **неделя** (карточки по дням); list = таблица/список с CRUD edit/delete (и ручное create — как в v1, через dialog OK).
5. **Report** остаётся отдельным разделом: период, итоги, CSV (не смешивать с dual-view entries без нужды).
6. Визуал: spacing, typography, surfaces shadcn — «приложение», не сырой CRUD; без нового brand-system.
7. **BE:** новых эндпоинтов **не требуется** — календарь и list используют существующий `GET /api/time-entries?from=&to=` (и summary/export для Report). См. § FE vs BE.

## Сущности

Без изменения доменной модели v1:

- **Employee** — name; full CRUD.
- **Time entry / timer** — employee, description, start, stop?, duration; rules AC-6 / AC-17 baseline.
- **Report period** — inclusive from/to; list + per-employee totals + CSV.

Меняется только **представление и навигация**, не схема данных.

## FE vs BE

| Нужно | Где | Комментарий |
| --- | --- | --- |
| Nav + routes + layout polish | **FE only** | React Router (или аналог в стеке) |
| Employee create/edit modal | **FE only** | Те же `POST/PATCH /api/employees` |
| Sticky timer panel | **FE only** | Те же `/api/timers/*` + `GET /api/timers/active` |
| Calendar week + list toggle | **FE only** | `GET /api/time-entries?from=&to=` на видимую неделю / выбранный период list; агрегация по дням на клиенте |
| Report + CSV | **FE** (UI shell) | Уже есть `GET /api/reports/summary`, `GET /api/reports/export` |
| Новые API / миграции | **Не ожидаются** | Если eng обнаружит gap (например, обязательный `from`/`to` уже есть) — уточнение в issue, не invent endpoints «на всякий случай» |

**Итог для PM cast:** вероятный путь **frontend-heavy**; backend в cast только если verify/API smoke или найден gap. Architect не обязателен.

## Non-regression (ссылка на v1, не новые номера)

Сохранить поведение из `docs/specs/time-tracking/product.md` (AC-1…AC-20 там):

- Таймер: start с описанием; stop; **max один running на employee** (reject + сообщение); live `hh:mm:ss`; hide + one-time confirm; restore; Stop в collapsed.
- CRUD employees + time entries; cascade/consistency UI.
- Report period + empty state + CSV.
- Theme light/dark; locale ru/en; no auth; SQLite persistence; Compose UI **:8081**.

Новые AC ниже **не заменяют** эти правила — дополняют UI-структуру. QA verify этого slug должен включать smoke non-regression ключевых timer/CRUD/report сценариев.

## User journeys

### J1 — Навигация по разделам

1. Открыть UI (:8081) → виден **nav** (Employees / Time entries / Report) и chrome (тема, язык).
2. Перейти в каждый раздел → контент раздела, URL отражает раздел (route).
3. Sticky timer остаётся доступным при смене раздела (если есть running или форма старта — см. J3).

### J2 — Сотрудник через модалку

1. Раздел Employees → **Add** открывает **модалка** (не inline strip).
2. Ввести имя → Save → модалка закрывается; сотрудник в списке; доступен в таймере.
3. Edit — через модалку (или согласованный dialog); Delete — с confirm (как v1).

### J3 — Sticky timer (bottom-right)

1. На любом разделе виден sticky panel (или компактный launcher, раскрывающий panel) **снизу справа**.
2. Выбрать сотрудника, описание → Start → live elapsed в panel.
3. Hide / first-hide confirm / Restore / Stop-while-collapsed — как baseline AC-17.
4. Повторный Start при running того же сотрудника — reject + сообщение (baseline AC-6), сообщение видно в контексте timer panel.
5. Panel не должен делать основной контент нечитаемым на desktop; на узком экране — не перекрывать критичные primary actions без возможности свернуть.

### J4 — Time entries: list и calendar

1. Раздел Time entries → default **List/Table** (или last used — soft; default = List OK).
2. Переключить на **Calendar** → неделя с днями; entries отображаются по дням (chip/card: сотрудник/описание/длительность — минимум читаемый).
3. Навигация prev/next week + «сегодня/эта неделя».
4. Из list (и желательно из calendar click) — edit/delete entry; итоги/инвалидация согласованы.
5. Пустая неделя / пустой list — empty state, не ошибка.

### J5 — Report (без регрессии)

1. Раздел Report → период, список, totals, empty, CSV — как v1.
2. После Stop / CRUD entries данные отчёта обновляются при запросе периода.

### J6 — Тема и язык

1. Переключение theme/locale из chrome доступно на всех разделах; применяется к nav, модалкам, timer panel, calendar/list.

## Acceptance criteria

Нумерация **этого** slug начинается с **AC-1** (не продолжать и не перенумеровывать AC `time-tracking`).

### Структура и навигация

- **AC-1.** В UI есть **постоянное меню навигации** минимум по разделам: **Employees**, **Time entries**, **Report**. Активный раздел визуально отличим.
- **AC-2.** Разделы открываются как **отдельные экраны/views** с отражением в URL (client-side routing). Контент не обязан быть тремя блоками на одной прокрутке как в v1.
- **AC-3.** Визуальная структура выглядит как целостное приложение (согласованные отступы, chrome, секции на shadcn/Tailwind) — не «сырой» набор несвязанных CRUD-форм без IA. (Качественный критерий; QA: checklist smoke + отсутствие регрессии ключевых controls.)

### Сотрудники

- **AC-4.** **Создание сотрудника** выполняется через **модальное окно** (Dialog): открытие → ввод имени → сохранение → закрытие и появление в списке без full-page reload.
- **AC-5.** На разделе Employees доступны **просмотр списка**, **редактирование** и **удаление** сотрудника (edit предпочтительно тоже через dialog); поведение baseline CRUD сохраняется.

### Sticky timer

- **AC-6.** Таймер представлен как **sticky UI в нижнем правом углу** viewport и остаётся доступным при навигации между разделами (не только как блок посередине страницы Employees/Report).
- **AC-7.** Sticky timer поддерживает Start (сотрудник + непустое описание), Stop, **live elapsed** (`hh:mm:ss`), и правила **hide / one-time first-hide confirm / restore / Stop while collapsed** (non-regression baseline AC-17 из `time-tracking`).
- **AC-8.** Пока у сотрудника есть running-таймер, повторный Start для него **отклоняется** с понятным сообщением в контексте timer UI (non-regression baseline AC-6 из `time-tracking`); второй parallel running не создаётся.

### Записи времени — views

- **AC-9.** Раздел Time entries предоставляет как минимум два представления одних и тех же записей: **список/таблица** и **календарь**.
- **AC-10.** Пользователь может **переключаться** между Calendar и List без потери выбранного контекста периода разумным образом (например, видимая неделя календаря согласована с фильтром дат list — или явным общим period control).
- **AC-11.** **Календарное** представление показывает **неделю** (7 дней) с записями, привязанными к дням; доступна навигация по неделям и возврат к текущей неделе.
- **AC-12.** **List/Table** показывает записи за выбранный период (сотрудник, описание, интервал/длительность) с возможностью **редактировать** и **удалять** запись (baseline CRUD entries).
- **AC-13.** Пустые состояния: нет записей за период / пустая неделя — **empty state**, приложение не падает.

### Report и chrome (shell + non-regression)

- **AC-14.** Раздел Report: выбор периода, список записей периода, **итоги по сотрудникам**, empty state, **CSV export** — поведение не хуже baseline `time-tracking` (AC-8…10, AC-18 там).
- **AC-15.** Переключение **темы** light/dark и **локали** ru/en доступно из app chrome и применяется к новым поверхностям (nav, modals, sticky timer, calendar/list).

### FE/API expectation

- **AC-16.** Календарь и list Time entries работают на **существующем** API диапазона (`GET /api/time-entries?from=&to=` и связанные CRUD/timer endpoints). **Новый backend endpoint не является обязательным** для выполнения AC-1…AC-15; если без доработки API нельзя — это blocker в issue, не тихий scope creep.

## Вне scope (явно)

- Auth, RBAC, проекты, теги, billing, approvals
- Timesheet grid / hour-axis / drag-resize / drag-create как у Toggl (calendar = week cards, не full calendar editor)
- Month view как обязательный (follow-up OK)
- Перенос sticky timer вверх (top bar) против AC-6 этого slug
- Параллельные running-таймеры; auto-stop при втором Start
- In-app AI; queues; смена порта UI на :8080
- Переписывание API «ради UI» без gap
- Изменение доменных правил timer/report baseline без отдельного product decision

## Открытые вопросы

Блокирующих нет. Мягкие defaults (PM может зафиксировать в `agent.md` без user grill):

1. **Default view** на Time entries: **List** (Calendar — один клик).  
2. **Edit employee**: dialog (как create) — **да**.  
3. **Manual create time entry**: dialog с раздела Time entries (list) — **да**, если уже было в v1; calendar click-to-create — **nice-to-have / OOS** (не AC).  
4. **Sticky panel на mobile:** свёрнутый compact chip по умолчанию при running — **рекомендуется** ui-ux/FE.  
5. Нужен ли **ui-ux** в cast: **да, рекомендуется** (nav IA, sticky a11y, calendar week layout) — решает PM.

## Handoff для PM

- **Slug / issue:** `time-tracking-ui` / **#6**; stage BA **#7** (CLOSED).
- **PM:** `docs/specs/time-tracking-ui/agent.md`; stage **#8**.
- **Cast (after user OK):** `ui-ux → qa write → frontend-dev → qa verify` — stages **#9 / #10 / #11 / #12**. **backend-dev OUT**.
- **Follow-ups:** month calendar [#13]; calendar click-to-create [#14].
- **Рекомендация:** routes+nav · employee create modal · sticky bottom-right timer · Time entries Calendar(week cards)∥List · Report отдельным разделом · FE-only на существующем API.
- **AC:** **AC-1…AC-16** (этот slug); baseline `time-tracking` AC-1…AC-20 — non-regression constraints.
- **BE:** out unless API gap blocker.
- **Следующий:** **STOP for user OK** («можно начинать?»); затем orchestrator запускает cast. Eng/qa не стартуют до OK.
)