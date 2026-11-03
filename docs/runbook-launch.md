# Runbook — launch (Time Tracking Demo)

Operator notes for demo / QA. Package manager: **pnpm only**.

## Compose (preferred)

```bash
pnpm install
docker compose up --build
```

| URL | Service |
| --- | --- |
| http://127.0.0.1:8081 | UI (nginx) |
| http://127.0.0.1:3000/api | API direct |
| http://127.0.0.1:8081/api/… | API via nginx proxy |

Health: Compose `api` → `GET /api/employees`; `nginx` → `wget` `/`. Volume key `sqlite_data` / Docker name **`time_tracking_demo_sqlite_data`** → `/data/time-tracking-demo.sqlite` keeps data across `down`/`up` without `-v` (**AC-11**). Wipe: `docker compose down -v`.

**Force reseed (AC-17 / AC-30 densify):** `SEED_ON_BOOT` alone does not purge existing volume data. One-shot: `SEED_FORCE=1 docker compose up -d api` (then unset). Local: `pnpm --filter api seed -- --force`. Dense seed includes departments, profiles, and chart/report-ready entries.

Env catalog: [`docs/env.md`](env.md), template [`.env.example`](../.env.example).

### Ports — do not confuse stacks

| Port | this app? | Note |
| --- | --- | --- |
| **8081** | Yes (Compose nginx) | Documented default UI; Vite preview / E2E helpers default here too |
| **8082** | Optional overflow | If 8081 busy — set `WEB_BASE_URL=http://127.0.0.1:8082` |
| **8080** | No | Frequently another project (other local stacks); not this app |
| **3000** | Yes (API) | Nest |

**Exclusive :8081:** do not run Compose `nginx` and Vite preview on the same host port at once — the second binder fails / nginx exits, and mid-suite `compose up` recreate can flap UI under E2E. Prefer one UI path: Compose nginx **or** `vite preview --port 8081` (overflow → **8082** + `WEB_BASE_URL`).

Smoke after `up`:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/employees   # 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8081/                 # 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8081/api/employees    # 200
docker compose ps   # api + nginx healthy
```

## Local API + preview

```bash
pnpm --filter api start:dev   # or start:prod with SQLITE_PATH / SEED_ON_BOOT
pnpm --filter web build
pnpm --filter web exec vite preview --host 127.0.0.1 --port 8081
# if 8081 busy: --port 8082 and WEB_BASE_URL=http://127.0.0.1:8082
```

## QA smoke

```bash
pnpm run test:structure
API_BASE_URL=http://127.0.0.1:3000/api pnpm run test:api
WEB_BASE_URL=http://127.0.0.1:8081 pnpm run test:e2e   # Compose UI; use :8082 if preview on overflow
```

Reset e2e DB files:

```bash
./scripts/reset-e2e-sqlite.sh
```

## Image build note (`better-sqlite3`)

API Dockerfile (Debian slim) installs **python3**, **make**, **g++** so pnpm can compile `better-sqlite3`. Root `pnpm-workspace.yaml` allowlists the package under `onlyBuiltDependencies` / `allowBuilds`. Without that, Compose `api` build fails on native install.
