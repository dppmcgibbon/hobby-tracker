#!/usr/bin/env bash
# Push all data from local Supabase to remote Supabase.
# Requires: pg_dump, psql, local Supabase running, REMOTE_DB_URL set.
# See scripts/push-local-to-remote.md for full docs.

set -e

REMOTE_DB_URL="${REMOTE_DB_URL:-}"
LOCAL_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DUMP_FILE="supabase/tmp_local_data.sql"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPLACE=false
PUSH_SCHEMA=false
WITH_AUTH=false
AUTH_DUMP_FILE="supabase/tmp_auth_users.sql"
USER_ID_MAPPING_FILE="supabase/tmp_user_id_mapping.txt"

usage() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Push local Supabase data to remote. Set REMOTE_DB_URL in .env.local, .env, or the environment."
  echo ""
  echo "Options:"
  echo "  --replace    Truncate all tables in remote public schema before loading (exact copy of local)"
  echo "  --schema     Run 'supabase db push' first to sync migrations to remote"
  echo "  --with-auth  Sync auth.users from local to remote (required for user-scoped data: profiles, storage_boxes, miniatures, etc.)"
  echo "  -h, --help   Show this help"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --replace)   REPLACE=true; shift ;;
    --schema)    PUSH_SCHEMA=true; shift ;;
    --with-auth) WITH_AUTH=true; shift ;;
    -h|--help)   usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

cd "$REPO_ROOT"

# Load REMOTE_DB_URL from .env.local or .env if present and not set
load_env() {
  local f="$1"
  [[ -f "$f" ]] || return
  local line
  line=$(grep -E '^[[:space:]]*REMOTE_DB_URL[[:space:]]*=' "$f" 2>/dev/null | head -1)
  [[ -n "$line" ]] || return
  local val="${line#*=}"
  val="${val%%#*}"   # strip trailing comment
  val=$(echo "$val" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["\x27]//' -e 's/["\x27]$//')
  [[ -n "$val" ]] && export REMOTE_DB_URL="$val"
}
if [[ -z "$REMOTE_DB_URL" ]]; then
  load_env .env.local
fi
if [[ -z "$REMOTE_DB_URL" ]]; then
  load_env .env
fi

if [[ -z "$REMOTE_DB_URL" ]]; then
  echo "Error: REMOTE_DB_URL is not set."
  echo "  Add to .env.local:  REMOTE_DB_URL=postgresql://postgres.xxx:password@host:6543/postgres"
  echo "  Or run:             REMOTE_DB_URL='...' ./scripts/push-local-to-remote.sh"
  exit 1
fi

# Ensure PostgreSQL client tools are on PATH (pg_dump, psql)
# Homebrew installs them to a path that may not be in default PATH
if ! command -v pg_dump &>/dev/null || ! command -v psql &>/dev/null; then
  if [[ -x /opt/homebrew/opt/libpq/bin/pg_dump ]]; then
    export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
  elif [[ -x /usr/local/opt/libpq/bin/pg_dump ]]; then
    export PATH="/usr/local/opt/libpq/bin:$PATH"
  else
    echo "Error: pg_dump and psql are required but not found."
    echo "  Install with Homebrew:  brew install libpq"
    echo "  Then add to your PATH:  export PATH=\"\$(brew --prefix libpq)/bin:\$PATH\""
    exit 1
  fi
fi

echo "→ Local DB:  $LOCAL_DB_URL"
echo "→ Remote:    ${REMOTE_DB_URL%%@*}@***"
echo ""

if [[ "$PUSH_SCHEMA" == "true" ]]; then
  echo "→ Pushing schema (supabase db push)..."
  supabase db push
  echo ""
fi

echo "→ Dumping local data (public schema only)..."
pg_dump "$LOCAL_DB_URL" \
  --data-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  -f "$DUMP_FILE"
echo "  Wrote $DUMP_FILE"
echo ""

if [[ "$REPLACE" == "true" ]]; then
  echo "→ Truncating remote public tables (--replace)..."
  psql "$REMOTE_DB_URL" -v ON_ERROR_STOP=1 -c "
DO \$\$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
  LOOP
    EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END \$\$;
"
  echo ""
  # Drop legacy check constraints if they still exist (remote schema may be behind local migrations)
  echo "→ Dropping legacy constraints on remote if present..."
  psql "$REMOTE_DB_URL" -v ON_ERROR_STOP=1 -c "
    ALTER TABLE public.factions DROP CONSTRAINT IF EXISTS factions_army_type_check;
    ALTER TABLE public.miniature_status DROP CONSTRAINT IF EXISTS miniature_status_status_check;
  "
  echo ""

  # Sync auth.users from local so user_id FKs in public tables can be satisfied
  if [[ "$WITH_AUTH" == "true" ]]; then
    echo "→ Dumping local auth.users..."
    pg_dump "$LOCAL_DB_URL" --data-only --no-owner --no-privileges -t auth.users -f "$AUTH_DUMP_FILE"
    echo "→ Syncing auth.users to remote (existing users kept, new ones added)..."
    # Use CTAS so temp table has no generated columns (remote auth.users may have e.g. confirmed_at as GENERATED)
    psql "$REMOTE_DB_URL" -v ON_ERROR_STOP=1 -c "DROP TABLE IF EXISTS public._auth_users_import; CREATE TABLE public._auth_users_import AS SELECT * FROM auth.users LIMIT 0;"
    sed 's/COPY auth\.users/COPY public._auth_users_import/' "$AUTH_DUMP_FILE" | psql "$REMOTE_DB_URL" -v ON_ERROR_STOP=1 -q
    # Where same email exists on remote, rewrite public dump so local user_id -> remote user_id (avoids duplicate email and satisfies FK)
    psql "$REMOTE_DB_URL" -t -A -F ' ' -c "SELECT i.id, u.id FROM public._auth_users_import i JOIN auth.users u ON u.email = i.email AND i.email IS NOT NULL" -o "$USER_ID_MAPPING_FILE" 2>/dev/null || true
    if [[ -s "$USER_ID_MAPPING_FILE" ]]; then
      echo "→ Rewriting public dump to use existing remote user ids where email matches..."
      tmp_dump="${DUMP_FILE}.rewrite"
      cp "$DUMP_FILE" "$tmp_dump"
      while read -r local_id remote_id; do
        if [[ -n "$local_id" && -n "$remote_id" ]]; then
          sed "s/$local_id/$remote_id/g" "$tmp_dump" > "${tmp_dump}.n" && mv "${tmp_dump}.n" "$tmp_dump"
        fi
      done < "$USER_ID_MAPPING_FILE"
      mv "$tmp_dump" "$DUMP_FILE"
      rm -f "$USER_ID_MAPPING_FILE"
    fi
    # Insert only non-generated columns; skip rows that already exist by id or email
    psql "$REMOTE_DB_URL" -v ON_ERROR_STOP=1 -c "
DO \$\$
DECLARE cols text; cols_prefixed text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position),
         string_agg('i.' || quote_ident(column_name), ', ' ORDER BY ordinal_position)
  INTO cols, cols_prefixed
  FROM information_schema.columns
  WHERE table_schema = 'auth' AND table_name = 'users'
  AND (is_generated = 'NEVER' OR is_generated IS NULL);
  EXECUTE format(
    'INSERT INTO auth.users (%s) SELECT %s FROM public._auth_users_import i WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = i.id OR (u.email = i.email AND i.email IS NOT NULL))',
    cols, cols_prefixed
  );
END \$\$;"
    psql "$REMOTE_DB_URL" -v ON_ERROR_STOP=1 -c "DROP TABLE IF EXISTS public._auth_users_import;"
    rm -f "$AUTH_DUMP_FILE" "$USER_ID_MAPPING_FILE"
    echo ""
  fi
fi

if [[ "$REPLACE" != "true" ]]; then
  echo "→ Restoring data to remote (append). Use --replace to overwrite remote with local if you get duplicate key errors."
else
  echo "→ Restoring data to remote..."
fi
psql "$REMOTE_DB_URL" -v ON_ERROR_STOP=1 -f "$DUMP_FILE"
echo ""

echo "→ Removing dump file..."
rm -f "$DUMP_FILE"

echo "✅ Done. Local data has been pushed to remote."
