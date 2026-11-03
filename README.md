# falconai — учёт рабочего времени

Портфолио-демо: сотрудники, таймер start/stop, отчёт за период и CSV-экспорт. Стек: NestJS + SQLite (`better-sqlite3`), React + TanStack Query + Tailwind + shadcn/ui, Docker Compose (API + nginx). Авторизации нет; данные вымышленные (faker seed).

**ИИ — только в процессе разработки**, не как фича приложения.

Пакетный менеджер: **только pnpm** (`packageManager: pnpm@11.9.0`). Не используйте npm/npx.

## Запуск

Требования: **Node.js ≥ 24**, **pnpm**, Docker (для Compose).  
Env: [`.env.example`](.env.example), каталог [`docs/env.md`](docs/env.md).

### Docker Compose (основной путь для демо) — AC-11 / AC-14

```bash
pnpm install   # на хосте для тестов; образы ставят зависимости через pnpm сами
docker compose up --build
```

| Сервис | Host | Назначение |
| --- | --- | --- |
| `api` | `http://127.0.0.1:3000` | NestJS; префикс `/api` |
| `nginx` | `http://127.0.0.1:8081` | UI + proxy `/api` → API |
| volume `sqlite_data` → **`falconai_sqlite_data`** | `/data/falconai.sqlite` в контейнере | персистентность после restart (**AC-11**) |

**Порты UI:** Compose публикует nginx на **8081→80**. Не ожидайте falconai на **8080** — порт часто занят чужим стеком (например Queply) и даёт чужой 403. Vite preview / Playwright: дефолт helpers — `8081`; если занят — другой порт + явный `WEB_BASE_URL`.

Образы: **только pnpm** (`corepack prepare pnpm@11.9.0`). Native `better-sqlite3`: в API Dockerfile — `python3`/`make`/`g++`; в `pnpm-workspace.yaml` — `onlyBuiltDependencies` / `allowBuilds`. Healthchecks: API (`GET /api/employees`), nginx (`wget` `/`).

Опционально: `.env.example` → `.env` (например `SEED_ON_BOOT=false`). Compose читает `.env`, если файл есть.  
Сброс демо-БД: `docker compose down -v` (удаляет volume), затем `up --build`.

Проверка volume (данные остаются после `down` **без** `-v` + `up`):

```bash
curl -s http://127.0.0.1:3000/api/employees | head
docker compose down
docker compose up -d
curl -s http://127.0.0.1:3000/api/employees | head
```

Подробнее: [`docs/runbook-launch.md`](docs/runbook-launch.md) (tech-writer), [`docs/env.md`](docs/env.md). Карта репо: [`docs/CODEMAP.md`](docs/CODEMAP.md).

### Локально (без Compose)

```bash
pnpm install
pnpm --filter api start:dev
# другой терминал — UI:
pnpm --filter web dev
# или production-like preview (совпадает с Compose UI-портом, если свободен):
pnpm --filter web build
pnpm --filter web exec vite preview --host 127.0.0.1 --port 8081
```

- API: `http://127.0.0.1:3000/api`
- SQLite по умолчанию: `apps/api/data/falconai.sqlite`
- Env: `PORT`, `SQLITE_PATH`, `SEED_ON_BOOT=false` (отключить seed на boot) — см. `docs/env.md`
Повторный seed (force):

```bash
pnpm --filter api seed -- --force
```

Сброс E2E SQLite (без zsh-glob pitfalls):

```bash
./scripts/reset-e2e-sqlite.sh
```

### Тесты (pnpm)

```bash
pnpm run test:structure
API_BASE_URL=http://127.0.0.1:3000/api pnpm run test:api
# UI уже слушает WEB_BASE_URL (Compose nginx :8081 или Vite preview)
WEB_BASE_URL=http://127.0.0.1:8081 pnpm run test:e2e
```

Chromium для Playwright (один раз): `pnpm run playwright:install`.

## HTTP API (кратко)

Префикс `/api`, JSON, без auth.

| Область | Пути |
| --- | --- |
| Employees | `GET/POST /employees`, `PATCH/DELETE /employees/:id` |
| Timers | `GET /timers/active`, `POST /timers/start`, `POST /timers/stop` |
| Time entries | `GET /time-entries?from=&to=`, `POST/PATCH/DELETE` |
| Reports | `GET /reports/summary`, `GET /reports/export` (CSV) |

Второй `Start` для сотрудника с уже бегущим таймером → **409**. Удаление сотрудника каскадно удаляет его записи.

CSV-колонки: `employee,description,start,stop,durationSeconds`.

Спека и контракт: `docs/specs/time-tracking/` (`product.md`, `agent.md`, `ux.md`).

## AI workflow (AC-12)

### Инструменты и модели

- **Cursor Agent (Composer)** — оркестрация ролей BA → PM → ui-ux → qa write → backend-dev ∥ frontend-dev → qa verify → devops → tech-writer
- Custom subagents в `.cursor/agents/` + issue handoff через `gh issue comment`
- GitHub Issues: parent [#1](https://github.com/AlexKovalko/time-tracking-demo/issues/1), stage issues для cast
- Модели: Cursor Agent / Composer (режимы Agent + Task subagents); без отдельного in-app LLM

### Примеры промптов

1. «Собери команду по `docs/specs/time-tracking/agent.md`, issue #1 — после user OK: ui-ux → qa write → BE∥FE → qa verify → devops → tech-writer.»
2. «qa write, phase: write, issue #1: failing Playwright + API + structure тесты по AC-1…AC-20; не пиши production apps.»
3. «backend-dev: NestJS `/api` из agent.md, SQLite volume, сделай `pnpm run test:api` зелёным; только pnpm; не ослабляй QA.»
4. «frontend-dev: `apps/web` по ux.md, nginx на Compose **8081**, E2E с `WEB_BASE_URL` если 8080 занят чужим стеком.»
5. «tech-writer: синхронизируй README/CODEMAP/runbook с фактическими портами 8081/8082; закрой stage #4 и parent #1.»

### Что ИИ сделал хорошо

- Разложил HTTP-контракт и AC по модулям Nest до реализации
- QA harness (API + structure + Playwright) написан **до** eng (docs-before-code / red→green)
- Подсказал pnpm workspace + native allowBuilds для `better-sqlite3`
- UX-контракт hide-timer (confirm / restore / stop-collapsed) зафиксирован до FE

### Где ИИ слабее / что правили вручную

- Стартовый Nest scaffold (`AppController` hello) — заменён на доменные модули
- Коллизия host **:8080** с чужим nginx (Queply): Compose/docs переведены на **8081**, E2E — явный `WEB_BASE_URL` (часто **8082**)
- Границы Compose: API volume vs FE nginx — нужна явная сериализация в prompt
- Правило «только pnpm» — без constraint легко уехать на npm/npx
- zsh `rm …sqlite*` / NULL_GLOB — вынесен в `scripts/reset-e2e-sqlite.sh` с явными путями
- Период отчёта в UTC `YYYY-MM-DD` — фильтр по `start`, чтобы empty-window (напр. 2099) не ломался seed'ом
- API Dockerfile: toolchain `python3`/`make`/`g++` для сборки `better-sqlite3` в slim-образе

## Структура

```
apps/api              — NestJS + SQLite + seed + Dockerfile
apps/web              — React SPA + nginx image
tests/                — QA: api / structure / e2e (Playwright)
docs/specs/time-tracking/ — product + agent + ux
docs/CODEMAP.md       — карта модулей
docs/env.md           — каталог env / порты / volume
docs/runbook-launch.md — операторский запуск / порты
scripts/              — reset-e2e-sqlite.sh
docker-compose.yml    — api :3000 + nginx :8081 + falconai_sqlite_data
```
