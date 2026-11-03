# Runbook — launch (falconai)

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

Health: Compose `api` → `GET /api/employees`; `nginx` → `wget` `/`. Volume key `sqlite_data` / Docker name **`falconai_sqlite_data`** → `/data/falconai.sqlite` keeps data across `down`/`up` without `-v` (**AC-11**). Wipe: `docker compose down -v`.

Env catalog: [`docs/env.md`](env.md), template [`.env.example`](../.env.example).

### Ports — do not confuse stacks

| Port | falconai? | Note |
| --- | --- | --- |
| **8081** | Yes (Compose nginx) | Documented default UI; Vite preview / E2E helpers default here too |
| **8082** | Optional overflow | If 8081 busy — set `WEB_BASE_URL=http://127.0.0.1:8082` |
| **8080** | No | Frequently another project (e.g. Queply); not falconai |
| **3000** | Yes (API) | Nest |

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
