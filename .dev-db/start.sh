#!/bin/bash
# Starts the local throwaway Postgres used by .env.local (see docs/HANDOFF.md).
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
/opt/homebrew/opt/postgresql@16/bin/pg_ctl -D "$DIR/pgdata" -l "$DIR/pg.log" -o "-p 55432" start
