# Push local Supabase data to cloud

You can run the automated script (recommended):

```bash
# Set remote DB URL (in env or .env as REMOTE_DB_URL)
export REMOTE_DB_URL="postgresql://postgres.xxxx:password@host:6543/postgres"

# Push data only
npm run supabase:push-data

# Push schema first, then data
npm run supabase:push-data -- --schema

# Replace remote data entirely (truncate then load)
npm run supabase:push-data -- --replace

# Include auth.users so user-scoped data (profiles, storage_boxes, miniatures, etc.) works
npm run supabase:push-data -- --replace --with-auth
```

**After pushing data, sync storage (images) so photos work on remote:**

```bash
# Get local service role key: supabase status
export LOCAL_SUPABASE_URL="http://127.0.0.1:54321"
export LOCAL_SUPABASE_SERVICE_ROLE_KEY="<from supabase status>"

npm run supabase:sync-storage
```

Or follow the manual steps below.

## Prerequisites

- Local Supabase running: `npm run supabase:start` (or `supabase start`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- Project linked to remote: `supabase link --project-ref <your-project-ref>`
- `pg_dump` and `psql` on your PATH (from Postgres client tools)

## 1. Push schema (migrations)

```bash
supabase db push
```

This applies your local migrations to the remote database so the schema matches.

## 2. Dump local data

From the project root, with local Supabase running:

```bash
pg_dump "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  --data-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  -f supabase/tmp_local_data.sql
```

- Uses default local DB URL (port `54322` from `supabase/config.toml`).
- If your local DB has a different password, change it in the URL.
- Creates `supabase/tmp_local_data.sql` (add this path to `.gitignore` if you want).

## 3. Get the remote database URL

1. Supabase Dashboard → your project → **Settings** → **Database**.
2. Under **Connection string** choose **URI**.
3. Copy the URI and replace `[YOUR-PASSWORD]` with your database password (or use the one from **Project API keys** / env).

It looks like:

```text
postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

For a one-off data load you can use the **direct** (non-pooler) connection on port `5432` if you prefer.

## 4. Restore data to the remote database

If you see check constraint errors (e.g. `factions_army_type_check`), the remote schema is behind local. Run the script with `--schema` so migrations are applied first: `./scripts/push-local-to-remote.sh --replace --schema`.

**Warning:** This will **add or overwrite** rows in the remote `public` schema. It does not clear tables first. If you need a clean copy of local, consider resetting or truncating the remote `public` schema first (see below).

```bash
psql "<REMOTE_DATABASE_URI>" -f supabase/tmp_local_data.sql
```

Example (replace with your URI and password):

```bash
psql "postgresql://postgres.xxxx:yourpassword@aws-0-eu-west-1.pooler.supabase.com:6543/postgres" -f supabase/tmp_local_data.sql
```

## Optional: full replace of public schema (wipe then load)

If you want the remote to be an exact copy of local (same rows, no extra remote-only rows):

1. **Danger:** Truncate all tables in `public` on the remote (or drop and re-run migrations). Easiest is to use the SQL editor in the Dashboard or:

   ```bash
   psql "<REMOTE_DATABASE_URI>" -c "
   DO \$\$
   DECLARE r RECORD;
   BEGIN
     FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
     LOOP
       EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE';
     END LOOP;
   END \$\$;
   "
   ```

2. Then run the restore from step 4 above.

## Cleanup

```bash
rm supabase/tmp_local_data.sql
```

## One-liner (after setting REMOTE_DB_URL)

```bash
export REMOTE_DB_URL="postgresql://postgres.xxxx:password@host:6543/postgres"
pg_dump "postgresql://postgres:postgres@127.0.0.1:54322/postgres" --data-only --no-owner --no-privileges --schema=public -f supabase/tmp_local_data.sql && \
psql "$REMOTE_DB_URL" -f supabase/tmp_local_data.sql
```
