#!/bin/sh
set -e

# ── 1. Construct DATABASE_URL from individual PG* variables if not already set ─
if [ -z "$DATABASE_URL" ]; then
    if [ -n "$PGHOST" ]; then
        DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${PGDATABASE}"
        export DATABASE_URL
        echo "[start] Built DATABASE_URL from PG* variables (host: $PGHOST)"
    else
        echo "[start] ERROR: DATABASE_URL is not set and no PGHOST available"
        exit 1
    fi
fi

# Normalise postgres:// → postgresql:// (Railway Postgres plugin uses the old scheme)
DATABASE_URL=$(echo "$DATABASE_URL" | sed 's|^postgres://|postgresql://|')
export DATABASE_URL

# ── 2. Wait for the database to accept connections (up to 60 s) ────────────────
echo "[start] Waiting for database..."
python3 - <<'PYEOF'
import os, sys, time
import psycopg2

url = os.environ["DATABASE_URL"]
for attempt in range(20):
    try:
        conn = psycopg2.connect(url, connect_timeout=5)
        conn.close()
        print(f"[start] Database ready after {attempt + 1} attempt(s)", flush=True)
        sys.exit(0)
    except Exception as exc:
        print(f"[start] Attempt {attempt + 1}/20: {exc}", flush=True)
        time.sleep(3)

print("[start] ERROR: database not available after 60 s")
sys.exit(1)
PYEOF

# ── 3. Run Alembic migrations ──────────────────────────────────────────────────
echo "[start] Running Alembic migrations..."
alembic upgrade head

# ── 4. Start the server ────────────────────────────────────────────────────────
echo "[start] Starting Uvicorn on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
