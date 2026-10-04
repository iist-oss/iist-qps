#!/bin/bash
# Runs migrations + seed + pgTAP-style tests on a LOCAL plain Postgres (no Supabase needed), using
# stub.sql (fake auth/storage schemas + a tiny pgTAP shim). Handy when GitHub Actions is not available.
# Usage: PGHOST=/tmp PGPORT=5499 PGUSER=postgres tools/local-db-test/run.sh
# Needs a running Postgres 15+ with the pg_trgm contrib extension. Creates/drops a database named qps_test.
# CAUTION: stub.sql creates cluster-wide roles anon/authenticated/service_role; use a throwaway server.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/../.."
P="psql -q -v ON_ERROR_STOP=0"
$P -d postgres -c "drop database if exists qps_test" -c "create database qps_test" >/dev/null
P="$P -d qps_test"
$P -f "$HERE/stub.sql" 2>&1 | grep -i error | grep -v "already exists"
$P -c "create extension pg_trgm"
for f in "$ROOT"/supabase/migrations/*.sql; do echo "--- $(basename "$f")"; $P -f "$f" 2>&1 | grep -iE "error|fatal"; done
echo "--- seed.sql"; $P -f "$ROOT/supabase/seed.sql" 2>&1 | grep -i error
for f in "$ROOT"/supabase/tests/*.sql; do echo "--- TEST $(basename "$f")"; $P -At -f "$f" 2>&1 | grep -vE "NOTICE|^\{|^$"; done
echo "(expect every line 'ok', and '# plan N, ran N, failed 0')"
