#!/bin/bash
# Stops the local throwaway Postgres (see docs/HANDOFF.md).
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
/opt/homebrew/opt/postgresql@16/bin/pg_ctl -D "$DIR/pgdata" stop -m fast
