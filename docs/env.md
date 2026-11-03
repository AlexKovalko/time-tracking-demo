# Environment variables — falconai

Catalog for local and Docker Compose runs. Placeholders only — see root `.env.example`.

## Application (API)

| Variable | Default | Where used | Notes |
| --- | --- | --- | --- |
| `PORT` | `3000` | Nest listen | Compose sets `3000`. |
| `SQLITE_PATH` | `apps/api/data/falconai.sqlite` (local) | better-sqlite3 file | Compose: `/data/falconai.sqlite` on volume `falconai_sqlite_data` (**AC-11**). |
| `SEED_ON_BOOT` | `true` (Compose) | Seed on API boot | Set `false` to skip faker seed. Force re-seed: `pnpm --filter api seed -- --force`. |

Optional root `.env` is loaded by Compose (`env_file`, not required). Compose `environment` still pins `PORT` and `SQLITE_PATH` for the container.

## Host ports (Compose)

| Service | Host | Container | URL |
| --- | --- | --- | --- |
| `api` | `3000` | `3000` | `http://localhost:3000/api` |
| `nginx` (UI) | **`8081`** | `80` | `http://localhost:8081` (`/api` proxied to API) |

**Why 8081:** host `:8080` is often occupied by another nginx (e.g. unrelated stacks) and may return **403**. Compose and Vite preview default to **8081**. Override only if you change `docker-compose.yml` and `WEB_BASE_URL` together.

## Test / tooling (not app runtime)

| Variable | Default | Notes |
| --- | --- | --- |
| `API_BASE_URL` | `http://localhost:3000/api` | `pnpm run test:api` |
| `WEB_BASE_URL` | `http://localhost:8081` | Playwright E2E (Compose or Vite preview) |

## Package manager

**pnpm only** (Corepack / `packageManager` in root `package.json`). Dockerfiles use `corepack prepare pnpm@…` — do not switch images or scripts to npm/npx.

## Volume / data

- Compose key: `sqlite_data` (in `docker-compose.yml` `volumes:`).
- Docker volume name: **`falconai_sqlite_data`** (`name: falconai_sqlite_data`) → `/data` in `api` (`SQLITE_PATH=/data/falconai.sqlite`).
- Healthchecks: `api` polls `GET /api/employees`; `nginx` `wget` `/`.
- Restart / `down` without `-v`: data (employees, entries, running timers) remains (**AC-11**).
- Wipe demo DB: `docker compose down -v` (destroys the volume) then `docker compose up --build`.
