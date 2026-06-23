-- Enable Row-Level Security on every public table.
--
-- Why: Supabase exposes a public PostgREST API over these tables. With RLS
-- disabled, anyone with the project's anon key can read/edit/delete data.
-- Enabling RLS with NO policies denies the anon/authenticated API roles by
-- default, while the table-owner role Prisma connects as bypasses RLS — so the
-- app keeps working and the public API is locked down.
--
-- Run: npx prisma db execute --file prisma/enable-rls.sql --schema prisma/schema.prisma

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    -- ENABLE (not FORCE): the owner role Prisma uses still bypasses RLS,
    -- but the public anon/authenticated API roles are denied.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;
