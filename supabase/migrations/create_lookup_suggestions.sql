-- Migration: create lookup_suggestions table
-- Apply via Supabase SQL editor at https://supabase.com/dashboard/project/ezmlamaygevdbkogjbvu/sql

create table public.lookup_suggestions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('category', 'service')),
  name text not null,
  suggested_by text not null,
  business_id uuid references public.businesses(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.lookup_suggestions enable row level security;

-- Authenticated users can insert suggestions (must own the suggested_by field)
create policy "authenticated can insert suggestions" on public.lookup_suggestions
  for insert with check (
    auth.role() = 'authenticated'
    and suggested_by = (auth.jwt() ->> 'email')
  );

-- Admins can read all pending suggestions
create policy "admins can select suggestions" on public.lookup_suggestions
  for select using (
    exists (select 1 from public.admins where email = (auth.jwt() ->> 'email'))
  );

-- Admins can update status (approve / reject)
create policy "admins can update suggestions" on public.lookup_suggestions
  for update using (
    exists (select 1 from public.admins where email = (auth.jwt() ->> 'email'))
  );
