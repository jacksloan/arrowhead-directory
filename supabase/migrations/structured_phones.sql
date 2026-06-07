-- Migration: structured phone columns with type enum
-- Apply via Supabase SQL editor or apply_migration. The legacy `phones text[]`
-- column is intentionally retained and backfilled (drop later once verified).

create type public.phone_type as enum ('mobile', 'home', 'work', 'fax');

alter table public.businesses
  add column phone_1 text,
  add column phone_1_type public.phone_type,
  add column phone_2 text,
  add column phone_2_type public.phone_type;

-- Backfill from the existing text[] (Postgres arrays are 1-indexed).
update public.businesses
set phone_1 = phones[1],
    phone_2 = phones[2];
