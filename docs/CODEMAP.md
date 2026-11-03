# CODEMAP — falconai

Краткая карта репозитория после стадии `time-tracking` (issue [#1](https://github.com/AlexKovalko/falconai/issues/1)). Пакетный менеджер: **pnpm@11.9.0** only.

## Apps

| Path | Role | Notes |
| --- | --- | --- |
| `apps/api` | NestJS API | Modules: `employees`, `timers`, `time-entries`, `reports`, `seed`, `database` (`better-sqlite3`). Prefix `/api`. |
| `apps/api/Dockerfile` | API image | Corepack **pnpm@11.9.0**; `python3`/`make`/`g++` for native `better-sqlite3`. |
| `apps/web` | React SPA | TanStack Query, Tailwind, shadcn/ui; sections Employees / Timer / Report; theme + ru/en locales. |
| `apps/web/Dockerfile` + `nginx.conf` | UI image | Static dist; `/api` → Compose service `api`; image HEALTHCHECK on `/`. |

## Compose / data

| Path | Notes |
| --- | --- |
| `docker-compose.yml` | Project `name: falconai`. `api` host **3000** (healthcheck `GET /api/employees`); `nginx` host **8081→80** (healthcheck `wget /`). Compose key `sqlite_data` → Docker name **`falconai_sqlite_data`** → `/data/falconai.sqlite` (**AC-11**). `restart: unless-stopped`. |
| `.env.example` / `docs/env.md` | Env catalog (PORT, SQLITE_PATH, SEED_ON_BOOT, test URLs). |
| `apps/api/data/*.sqlite` | Local / E2E DB files (not the Compose volume). |

**Port policy:** Compose UI = **8081**. Host **8080** is not falconai (often another stack → 403). Playwright / Vite preview: default helpers **8081**; overflow **8082** via `WEB_BASE_URL`.

## Tests & tooling

| Path | Notes |
| --- | --- |
| `tests/api` | Vitest HTTP contract (`pnpm run test:api`) |
| `tests/structure` | AC-12/13/14 static checks (`pnpm run test:structure`) |
| `tests/e2e` | Playwright journeys (`pnpm run test:e2e`) |
| `pnpm run test:qa` | structure → api → e2e |
| `scripts/reset-e2e-sqlite.sh` | Safe delete of e2e SQLite paths |
| `pnpm-workspace.yaml` | `onlyBuiltDependencies` / `allowBuilds` includes `better-sqlite3` |

## Specs & docs

| Path | Notes |
| --- | --- |
| `docs/TZ.md`, `docs/STACK.md` | Source brief + stack lock |
| `docs/specs/time-tracking/product.md` | Intent + AC-1…AC-20 |
| `docs/specs/time-tracking/agent.md` | Cast, ownership, HTTP contract |
| `docs/specs/time-tracking/ux.md` | UI / a11y / `data-testid` |
| `docs/env.md` | Env + ports + volume names |
| `docs/runbook-launch.md` | Operator launch / health / ports |
| Root `README.md` | Launch + AI workflow (**AC-12**); AI is process-only |
|