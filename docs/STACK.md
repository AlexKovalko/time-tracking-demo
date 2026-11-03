# Стек приложения

Учёт рабочего времени (тестовое задание).

| Слой | Технология | Версия / примечание |
| --- | --- | --- |
| Runtime | Node.js | ≥ 24 |
| Package manager | pnpm | `packageManager` в корневом `package.json`; workspace + build allowlist (`onlyBuiltDependencies` / `allowBuilds`) в `pnpm-workspace.yaml` (поле `pnpm` в package.json pnpm 11 **игнорирует**). Команды: `pnpm …` / `pnpm exec …` (не npm/npx) |
| Backend | NestJS | latest |
| БД | SQLite | — |
| Frontend | React | latest |
| FE static / proxy | nginx | раздача сборки React, proxy к API |
| Data fetching (FE) | TanStack Query | — |
| Язык | TypeScript | — |
| Стили | Tailwind CSS | — |
| UI-компоненты | shadcn/ui | — |
| Локальный запуск | Docker Compose | API **:3000** + nginx UI **:8081** (+ volume key `sqlite_data`, Docker name `falconai_sqlite_data`). Не путать с чужим **:8080**. E2E/preview: **:8081** (или **:8082** через `WEB_BASE_URL`) |

## Кратко по слоям

- **API:** NestJS + TypeScript, Node.js ≥ 24
- **БД:** SQLite (сохранение данных после перезапуска)
- **UI:** React + TypeScript, Tailwind CSS, shadcn/ui; в Docker — статическая сборка через **nginx** (proxy к API)
- **Клиентский кэш / запросы к API:** TanStack Query
- **Запуск:** Docker Compose поднимает API и nginx с UI; SQLite — через volume, чтобы данные переживали перезапуск контейнеров
