#!/usr/bin/env bash
# Reset e2e SQLite files without zsh NULL_GLOB failures on missing globs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="${ROOT}/apps/api/data"
mkdir -p "${DATA_DIR}"
# Explicit paths — do not use unquoted *.sqlite* under zsh nomatch.
rm -f \
  "${DATA_DIR}/e2e-time-tracking-demo.sqlite" \
  "${DATA_DIR}/e2e-time-tracking-demo.sqlite-wal" \
  "${DATA_DIR}/e2e-time-tracking-demo.sqlite-shm"
echo "Cleared e2e SQLite under ${DATA_DIR}"
