# employee-search-case-insensitive

**Issue:** #107 (https://github.com/AlexKovalko/time-tracking-demo/issues/107)
**Slug:** employee-search-case-insensitive
**Related:** #93

## Role cast (bug fast-path)
1. qa write
2. backend-dev
3. qa verify

Skipped: BA, PM, architect, ui-ux, marketer, frontend-dev, security, devops, tech-writer

## Ownership
- `apps/api` — backend-dev only
- packages — n/a unless needed (backend-dev)

## AC map
- AC-1 → #108
- AC-2 → #109
- AC-3 → #110
- AC-4 → #111

## Acceptance
- AC-1: Cyrillic lowercase q finds titled name (`борис` → `Борис Смирнов`)
- AC-2: Latin case-insensitive preserved
- AC-3: Filter + create Combobox (UI) show match
- AC-4: empty / no-results OK

## Root cause
SQLite COLLATE NOCASE / lower() ASCII-only; need Unicode-aware fold (e.g. better-sqlite3 custom `unicode_lower` + LIKE).

## API contract
`GET /employees?q=` — contains filter, Unicode case-insensitive on `name`.
