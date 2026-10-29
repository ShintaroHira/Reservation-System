#!/usr/bin/env bash
# Project-local PostgreSQL for development: no Docker or sudo required.
#
#   bash scripts/db.sh start    # create the cluster on first run, then start it
#   bash scripts/db.sh stop
#   bash scripts/db.sh status
#   bash scripts/db.sh psql     # open a psql shell as the app user
#
# Data lives in ./.pgdata and the server only listens on 127.0.0.1.
# The credentials below are for local development only; they match backend/.env.example.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${RESERVATION_PGDATA:-$ROOT/.pgdata}"
PORT="${RESERVATION_PGPORT:-5433}"
DB_NAME="reservation"
DB_USER="reservation"
DB_PASSWORD="reservation"

find_bin() {
  if [[ -n "${PG_BIN:-}" && -x "$PG_BIN/pg_ctl" ]]; then echo "$PG_BIN"; return; fi
  if command -v pg_ctl >/dev/null 2>&1; then dirname "$(command -v pg_ctl)"; return; fi
  # Debian/Ubuntu install the server binaries outside PATH.
  local candidate
  candidate="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -n 1 || true)"
  if [[ -n "$candidate" && -x "$candidate/pg_ctl" ]]; then echo "$candidate"; return; fi
  echo "PostgreSQL server binaries (pg_ctl, initdb) not found. Install PostgreSQL 14+ or set PG_BIN." >&2
  exit 1
}

BIN="$(find_bin)"
PSQL_SUPER=("$BIN/psql" -h "$DATA_DIR" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -qtA)

is_running() { "$BIN/pg_ctl" -D "$DATA_DIR" status >/dev/null 2>&1; }

init_cluster() {
  echo "Creating PostgreSQL cluster in $DATA_DIR"
  "$BIN/initdb" -D "$DATA_DIR" -U postgres -E UTF8 --no-locale \
    --auth-local=trust --auth-host=scram-sha-256 >/dev/null
  cat >>"$DATA_DIR/postgresql.conf" <<CONF

# --- reservation project (local development) ---
listen_addresses = '127.0.0.1'
port = $PORT
unix_socket_directories = '$DATA_DIR'
CONF
}

ensure_app_database() {
  if [[ "$("${PSQL_SUPER[@]}" -c "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'")" != "1" ]]; then
    "${PSQL_SUPER[@]}" -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASSWORD'"
  fi
  if [[ "$("${PSQL_SUPER[@]}" -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'")" != "1" ]]; then
    "${PSQL_SUPER[@]}" -c "CREATE DATABASE $DB_NAME OWNER $DB_USER"
  fi
}

case "${1:-}" in
  start)
    [[ -f "$DATA_DIR/PG_VERSION" ]] || init_cluster
    if is_running; then
      echo "PostgreSQL is already running on 127.0.0.1:$PORT"
    else
      "$BIN/pg_ctl" -D "$DATA_DIR" -l "$DATA_DIR/server.log" -w start >/dev/null
      echo "PostgreSQL started on 127.0.0.1:$PORT (log: $DATA_DIR/server.log)"
    fi
    ensure_app_database
    echo "DATABASE_URL=postgres://$DB_USER:$DB_PASSWORD@127.0.0.1:$PORT/$DB_NAME"
    ;;
  stop)
    if is_running; then
      "$BIN/pg_ctl" -D "$DATA_DIR" -m fast -w stop >/dev/null
      echo "PostgreSQL stopped"
    else
      echo "PostgreSQL is not running"
    fi
    ;;
  status)
    if is_running; then echo "running on 127.0.0.1:$PORT ($DATA_DIR)"; else echo "stopped"; fi
    ;;
  psql)
    PGPASSWORD="$DB_PASSWORD" exec "$BIN/psql" -h 127.0.0.1 -p "$PORT" -U "$DB_USER" "$DB_NAME"
    ;;
  *)
    echo "Usage: bash scripts/db.sh {start|stop|status|psql}" >&2
    exit 2
    ;;
esac
