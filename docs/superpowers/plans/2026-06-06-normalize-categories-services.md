# Normalize Categories and Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the denormalized `category` (string) and `subcategories`/`services` (string arrays) columns on `businesses` with proper lookup tables (`categories`, `services`) and many-to-many link tables (`business_categories`, `business_services`).

**Architecture:** The DB migration extracts distinct values from existing string columns into lookup tables, then creates link records. The existing `suggested_edits` table stays denormalized (category/service names stored as text) — on approval the server resolves names to IDs. All queries join through the link tables and the `Business` TypeScript type gains `categories: Category[]` and `services: Service[]`, removing the old scalar fields.

**Tech Stack:** Supabase (Postgres), SvelteKit server actions, sveltekit-superforms + zod, Svelte 5 runes

---

## Scope note on `suggested_edits`

`suggested_edits` is kept denormalized intentionally:
- `category text` → stores the primary category name (for the diff display)
- `subcategories text[]` → repurposed: stores **all category names** (used on approval to resolve IDs)
- `services text[]` → stores all service names (unchanged semantically)

No DB schema change to `suggested_edits`. Only the server code and UI hidden inputs change.

---

## File Map

| File | Change |
|---|---|
| Supabase SQL editor | Task 1 — create lookup + link tables, migrate data, drop old columns |
| `src/lib/types.ts` | Task 2 — add `Category`, `Service`; update `Business` |
| `src/lib/schemas.ts` | Task 2 — replace `category`/`subcategories` with `categories` |
| `src/routes/+page.server.ts` | Task 3 — new load query + updateBusiness + suggestEdit actions |
| `src/routes/pending/+page.server.ts` | Task 4 — load query with joins |
| `src/routes/suggested-edits/+page.server.ts` | Task 4 — load query with joins + approveEdit resolves IDs |
| `src/lib/components/DirectoryTable.svelte` | Task 5 — category derivation + filter |
| `src/lib/components/FilterPopover.svelte` | Task 5 — no change needed (still string[]) |
| `src/lib/components/DirectoryCardView.svelte` | Task 6 — group by `categories[0].name`, render services |
| `src/lib/components/DirectoryTableView.svelte` | Task 6 — services pills instead of subcategories |
| `src/lib/components/BusinessProfileDialog.svelte` | Task 7 — categories + services rendering |
| `src/lib/components/EditBusinessDialog.svelte` | Task 7 — form fields for categories + services |
| `src/lib/components/SuggestEditDialog.svelte` | Task 8 — hidden inputs for categories + services |
| `src/lib/utils/pdf.ts` | Task 8 — group by `categories[0].name` |
| `src/routes/suggested-edits/+page.svelte` | Task 9 — DIFF_FIELDS labels, HTML display |

---

## Task 1: DB Migration (run in Supabase SQL editor — manual step)

**This task is manual.** Paste the SQL below into the Supabase SQL editor and run it.

- [ ] **Step 1: Create lookup tables**

```sql
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  shortname text unique not null,
  name text unique not null,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  shortname text unique not null,
  name text unique not null,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 2: Create link tables**

```sql
create table public.business_categories (
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (business_id, category_id)
);

create table public.business_services (
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (business_id, service_id)
);
```

- [ ] **Step 3: Migrate existing category data**

```sql
-- Populate categories lookup from existing business category strings
insert into public.categories (shortname, name)
select distinct
  lower(regexp_replace(trim(category), '\s+', '_', 'g')) as shortname,
  trim(category) as name
from public.businesses
where category is not null and trim(category) != '';

-- Link each business to its category
insert into public.business_categories (business_id, category_id)
select b.id, c.id
from public.businesses b
join public.categories c on c.name = trim(b.category)
where b.category is not null and trim(b.category) != '';
```

- [ ] **Step 4: Migrate existing subcategories + services into normalized services**

```sql
-- Populate services lookup from both subcategories and services arrays
insert into public.services (shortname, name)
select distinct
  lower(regexp_replace(trim(val), '\s+', '_', 'g')) as shortname,
  trim(val) as name
from (
  select unnest(subcategories) as val from public.businesses
  union all
  select unnest(services) as val from public.businesses
) all_vals
where trim(val) != ''
on conflict (shortname) do nothing;

-- Link each business to its services (from both old arrays)
insert into public.business_services (business_id, service_id)
select distinct b.id, s.id
from public.businesses b
cross join unnest(b.subcategories || b.services) as svc_name
join public.services s on s.name = trim(svc_name)
where trim(svc_name) != '';
```

- [ ] **Step 5: Add RLS policies and grants**

```sql
-- categories: public read, authenticated insert (for upsert), admin-only update/delete
alter table public.categories enable row level security;
create policy "public can read categories"
  on public.categories for select using (true);
create policy "authenticated can insert categories"
  on public.categories for insert
  with check (auth.role() = 'authenticated');
create policy "admins can update categories"
  on public.categories for update
  using (exists (select 1 from public.admins where email = (auth.jwt() ->> 'email')));
create policy "admins can delete categories"
  on public.categories for delete
  using (exists (select 1 from public.admins where email = (auth.jwt() ->> 'email')));

grant all on table public.categories to anon;
grant all on table public.categories to authenticated;
grant all on table public.categories to service_role;

-- services: same pattern as categories
alter table public.services enable row level security;
create policy "public can read services"
  on public.services for select using (true);
create policy "authenticated can insert services"
  on public.services for insert
  with check (auth.role() = 'authenticated');
create policy "admins can update services"
  on public.services for update
  using (exists (select 1 from public.admins where email = (auth.jwt() ->> 'email')));
create policy "admins can delete services"
  on public.services for delete
  using (exists (select 1 from public.admins where email = (auth.jwt() ->> 'email')));

grant all on table public.services to anon;
grant all on table public.services to authenticated;
grant all on table public.services to service_role;

-- business_categories: public read, owner or admin insert/delete (no update — delete+insert instead)
alter table public.business_categories enable row level security;
create policy "public can read business_categories"
  on public.business_categories for select using (true);
create policy "owner or admin can insert business_categories"
  on public.business_categories for insert
  with check (
    exists (select 1 from public.businesses where id = business_id and email = (auth.jwt() ->> 'email'))
    or exists (select 1 from public.admins where email = (auth.jwt() ->> 'email'))
  );
create policy "owner or admin can delete business_categories"
  on public.business_categories for delete
  using (
    exists (select 1 from public.businesses where id = business_id and email = (auth.jwt() ->> 'email'))
    or exists (select 1 from public.admins where email = (auth.jwt() ->> 'email'))
  );

grant all on table public.business_categories to anon;
grant all on table public.business_categories to authenticated;
grant all on table public.business_categories to service_role;

-- business_services: same pattern as business_categories
alter table public.business_services enable row level security;
create policy "public can read business_services"
  on public.business_services for select using (true);
create policy "owner or admin can insert business_services"
  on public.business_services for insert
  with check (
    exists (select 1 from public.businesses where id = business_id and email = (auth.jwt() ->> 'email'))
    or exists (select 1 from public.admins where email = (auth.jwt() ->> 'email'))
  );
create policy "owner or admin can delete business_services"
  on public.business_services for delete
  using (
    exists (select 1 from public.businesses where id = business_id and email = (auth.jwt() ->> 'email'))
    or exists (select 1 from public.admins where email = (auth.jwt() ->> 'email'))
  );

grant all on table public.business_services to anon;
grant all on table public.business_services to authenticated;
grant all on table public.business_services to service_role;
```

- [ ] **Step 6: Verify migration counts**

```sql
select count(*) from public.categories;
select count(*) from public.services;
select count(*) from public.business_categories;
select count(*) from public.business_services;
-- Spot-check: pick a known business and confirm its links exist
select b.name, c.name as category
from public.businesses b
join public.business_categories bc on bc.business_id = b.id
join public.categories c on c.id = bc.category_id
limit 10;
```

- [ ] **Step 7: Drop old columns from businesses**

Only run this after verifying counts in Step 6 look correct.

```sql
alter table public.businesses
  drop column category,
  drop column subcategories,
  drop column services;
```

---

## Task 2: Update TypeScript types and form schema

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/schemas.ts`

- [ ] **Step 1: Replace `src/lib/types.ts`**

```ts
export type BusinessStatus = 'approved' | 'pending' | 'rejected' | 'deleted';

export interface Category {
  id: string;
  shortname: string;
  name: string;
}

export interface Service {
  id: string;
  shortname: string;
  name: string;
}

export interface Business {
  id?: string;
  name: string;
  email: string | null;
  phones: string[];
  address: string | null;
  website: string | null;
  description: string | null;
  categories: Category[];
  services: Service[];
  image: string | null;
  status: BusinessStatus;
  created_at?: string;
  updated_at?: string;
}
```

- [ ] **Step 2: Replace `src/lib/schemas.ts`**

```ts
import { z } from 'zod';

export const businessSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().nullable().optional(),
  phones: z.string().default(''),
  address: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  categories: z.string().min(1, 'At least one category is required'),
  services: z.string().default(''),
});

export type BusinessFormData = z.infer<typeof businessSchema>;
```

Note: `categories` replaces both the old `category` and `subcategories` fields. `services` stays but now represents the normalized services lookup (not the old free-text services array).

- [ ] **Step 3: Run type check**

```sh
cd /Users/jack/dev/git/arrowhead-directory && pnpm check
```

Expected: TypeScript errors in several files (the old fields are now missing). These will be fixed in subsequent tasks. The types themselves must be error-free.

- [ ] **Step 4: Commit**

```sh
git add src/lib/types.ts src/lib/schemas.ts
git commit -m "feat: add Category and Service types, update Business and businessSchema for normalized categories/services"
```

---

## Task 3: Update main page server load and actions

**Files:**
- Modify: `src/routes/+page.server.ts`

The load function now joins through the link tables. The `updateBusiness` action resolves category/service names to IDs via upsert, then replaces link records. The `suggestEdit` action stores category names in the denormalized `suggested_edits` columns.

Helper: shortname is `name.toLowerCase().replace(/\s+/g, '_')`.

- [ ] **Step 1: Replace `src/routes/+page.server.ts`**

```ts
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { businessSchema } from '$lib/schemas';
import { getIsAdmin } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();

  const { data: businesses, error } = await locals.supabase
    .from('businesses')
    .select(`
      *,
      business_categories ( categories (*) ),
      business_services ( services (*) )
    `)
    .eq('status', 'approved')
    .order('name');

  if (error) throw new Error(error.message);

  const mapped = (businesses ?? []).map((b) => ({
    ...b,
    categories: (b.business_categories ?? []).map((bc: any) => bc.categories),
    services: (b.business_services ?? []).map((bs: any) => bs.services),
  }));

  const form = await superValidate(zod4(businessSchema));
  const isAdmin = await getIsAdmin(locals.supabase, user?.email);
  return { businesses: mapped, user, form, isAdmin };
};

function toShortname(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_');
}

async function upsertAndLinkCategories(
  supabase: any,
  businessId: string,
  categoryNames: string[]
) {
  const ids: string[] = [];
  for (const name of categoryNames) {
    const shortname = toShortname(name);
    const { data, error } = await supabase
      .from('categories')
      .upsert({ shortname, name }, { onConflict: 'shortname' })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    ids.push(data.id);
  }
  await supabase.from('business_categories').delete().eq('business_id', businessId);
  if (ids.length > 0) {
    const { error } = await supabase
      .from('business_categories')
      .insert(ids.map((category_id) => ({ business_id: businessId, category_id })));
    if (error) throw new Error(error.message);
  }
}

async function upsertAndLinkServices(
  supabase: any,
  businessId: string,
  serviceNames: string[]
) {
  const ids: string[] = [];
  for (const name of serviceNames) {
    const shortname = toShortname(name);
    const { data, error } = await supabase
      .from('services')
      .upsert({ shortname, name }, { onConflict: 'shortname' })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    ids.push(data.id);
  }
  await supabase.from('business_services').delete().eq('business_id', businessId);
  if (ids.length > 0) {
    const { error } = await supabase
      .from('business_services')
      .insert(ids.map((service_id) => ({ business_id: businessId, service_id })));
    if (error) throw new Error(error.message);
  }
}

export const actions: Actions = {
  sendMagicLink: async ({ request, locals, url }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const { error } = await locals.supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${url.origin}/login/verify` },
    });
    if (error) return fail(500, { message: error.message });
    return { message: 'Check your email for a login link.' };
  },

  signOut: async ({ locals }) => {
    await locals.supabase.auth.signOut();
    throw redirect(303, '/');
  },

  updateBusiness: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });

    const form = await superValidate(request, zod4(businessSchema));
    if (!form.valid) return fail(400, { form });

    const isAdminUser = await getIsAdmin(locals.supabase, user.email);
    const { id, phones, categories, services, ...fields } = form.data;

    const categoryNames = categories.split(',').map((s) => s.trim()).filter(Boolean);
    const serviceNames = services.split(',').map((s) => s.trim()).filter(Boolean);

    let query = locals.supabase
      .from('businesses')
      .update({
        ...fields,
        phones: phones.split(',').map((p: string) => p.trim()).filter(Boolean),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (!isAdminUser) query = query.eq('email', user.email!);

    const { error } = await query;
    if (error) return fail(500, { form, message: error.message });

    try {
      await upsertAndLinkCategories(locals.supabase, id, categoryNames);
      await upsertAndLinkServices(locals.supabase, id, serviceNames);
    } catch (e: any) {
      return fail(500, { form, message: e.message });
    }

    return { form };
  },

  deleteBusiness: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });

    const formData = await request.formData();
    const id = formData.get('id') as string;
    if (!id) return fail(400, { message: 'Missing business id' });

    const isAdminUser = await getIsAdmin(locals.supabase, user.email);
    let query = locals.supabase
      .from('businesses')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!isAdminUser) query = query.eq('email', user.email!);

    const { error } = await query;
    if (error) return fail(500, { message: error.message });
    return { success: true, deleted: true, id };
  },

  suggestEdit: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });

    const formData = await request.formData();
    const business_id = formData.get('business_id') as string;
    if (!business_id) return fail(400, { message: 'Missing business_id' });

    const phones = ((formData.get('phones') as string) ?? '')
      .split(',').map((p) => p.trim()).filter(Boolean);

    // subcategories column repurposed: stores all category names
    const subcategories = ((formData.get('subcategories') as string) ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean);

    const services = ((formData.get('services') as string) ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean);

    const { error: dbError } = await locals.supabase.from('suggested_edits').insert({
      business_id,
      suggested_by: user.email!,
      name: formData.get('name') as string,
      email: (formData.get('email') as string) || null,
      phones,
      address: (formData.get('address') as string) || null,
      website: (formData.get('website') as string) || null,
      description: (formData.get('description') as string) || null,
      category: (formData.get('category') as string) || '',
      subcategories, // all category names
      services,      // all service names
    });

    if (dbError) return fail(500, { message: dbError.message });
    return { success: true };
  },
};
```

- [ ] **Step 2: Run type check**

```sh
pnpm check
```

Expected: errors only in the Svelte component files that still use the old `Business` fields. The server file itself should be clean.

- [ ] **Step 3: Commit**

```sh
git add src/routes/+page.server.ts
git commit -m "feat: update main page server to join categories/services through link tables"
```

---

## Task 4: Update pending and suggested-edits server routes

**Files:**
- Modify: `src/routes/pending/+page.server.ts`
- Modify: `src/routes/suggested-edits/+page.server.ts`

### pending/+page.server.ts

The load only needs to join the new tables. The `updateStatus` action doesn't touch categories/services.

- [ ] **Step 1: Update load in `src/routes/pending/+page.server.ts`**

Replace the load function body:

```ts
export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (!(await getIsAdmin(locals.supabase, user?.email))) throw error(403, 'Forbidden');

  const { data: businesses, error: dbError } = await locals.supabase
    .from('businesses')
    .select(`
      *,
      business_categories ( categories (*) ),
      business_services ( services (*) )
    `)
    .eq('status', 'pending')
    .order('created_at');

  if (dbError) throw new Error(dbError.message);

  const mapped = (businesses ?? []).map((b) => ({
    ...b,
    categories: (b.business_categories ?? []).map((bc: any) => bc.categories),
    services: (b.business_services ?? []).map((bs: any) => bs.services),
  }));

  return { businesses: mapped };
};
```

Keep the existing `updateStatus` action unchanged.

### suggested-edits/+page.server.ts

The load joins the new tables on the businesses side. The `approveEdit` action must resolve category/service names (from the denormalized suggestion) into IDs and update the link tables instead of writing the old columns.

- [ ] **Step 2: Replace `src/routes/suggested-edits/+page.server.ts`**

```ts
import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getIsAdmin } from '$lib/server/admin';

function toShortname(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_');
}

async function upsertAndLinkCategories(
  supabase: any,
  businessId: string,
  categoryNames: string[]
) {
  const ids: string[] = [];
  for (const name of categoryNames) {
    const shortname = toShortname(name);
    const { data, error: e } = await supabase
      .from('categories')
      .upsert({ shortname, name }, { onConflict: 'shortname' })
      .select('id')
      .single();
    if (e) throw new Error(e.message);
    ids.push(data.id);
  }
  await supabase.from('business_categories').delete().eq('business_id', businessId);
  if (ids.length > 0) {
    const { error: e } = await supabase
      .from('business_categories')
      .insert(ids.map((category_id) => ({ business_id: businessId, category_id })));
    if (e) throw new Error(e.message);
  }
}

async function upsertAndLinkServices(
  supabase: any,
  businessId: string,
  serviceNames: string[]
) {
  const ids: string[] = [];
  for (const name of serviceNames) {
    const shortname = toShortname(name);
    const { data, error: e } = await supabase
      .from('services')
      .upsert({ shortname, name }, { onConflict: 'shortname' })
      .select('id')
      .single();
    if (e) throw new Error(e.message);
    ids.push(data.id);
  }
  await supabase.from('business_services').delete().eq('business_id', businessId);
  if (ids.length > 0) {
    const { error: e } = await supabase
      .from('business_services')
      .insert(ids.map((service_id) => ({ business_id: businessId, service_id })));
    if (e) throw new Error(e.message);
  }
}

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (!(await getIsAdmin(locals.supabase, user?.email))) throw error(403, 'Forbidden');

  const { data: suggestions, error: dbError } = await locals.supabase
    .from('suggested_edits')
    .select(`
      *,
      businesses (
        *,
        business_categories ( categories (*) ),
        business_services ( services (*) )
      )
    `)
    .eq('status', 'pending')
    .order('created_at');

  if (dbError) throw new Error(dbError.message);

  const mapped = (suggestions ?? []).map((s) => ({
    ...s,
    businesses: s.businesses
      ? {
          ...s.businesses,
          categories: (s.businesses.business_categories ?? []).map((bc: any) => bc.categories),
          services: (s.businesses.business_services ?? []).map((bs: any) => bs.services),
        }
      : null,
  }));

  return { suggestions: mapped };
};

export const actions: Actions = {
  approveEdit: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!(await getIsAdmin(locals.supabase, user?.email))) return fail(403, { message: 'Forbidden' });

    const formData = await request.formData();
    const id = formData.get('id') as string;
    if (!id) return fail(400, { message: 'Missing id' });

    const { data: suggestion, error: loadError } = await locals.supabase
      .from('suggested_edits')
      .select('*')
      .eq('id', id)
      .single();
    if (loadError || !suggestion) return fail(404, { message: 'Suggestion not found' });

    // Update core fields (no category/subcategories/services columns on businesses anymore)
    const { error: updateError } = await locals.supabase
      .from('businesses')
      .update({
        name: suggestion.name,
        email: suggestion.email,
        phones: suggestion.phones,
        address: suggestion.address,
        website: suggestion.website,
        description: suggestion.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', suggestion.business_id);
    if (updateError) return fail(500, { message: updateError.message });

    // Resolve category names (suggestion.subcategories stores all category names)
    try {
      await upsertAndLinkCategories(locals.supabase, suggestion.business_id, suggestion.subcategories ?? []);
      await upsertAndLinkServices(locals.supabase, suggestion.business_id, suggestion.services ?? []);
    } catch (e: any) {
      return fail(500, { message: e.message });
    }

    const { error: approveError } = await locals.supabase
      .from('suggested_edits')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (approveError) return fail(500, { message: approveError.message });

    return { success: true, id };
  },

  rejectEdit: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!(await getIsAdmin(locals.supabase, user?.email))) return fail(403, { message: 'Forbidden' });

    const formData = await request.formData();
    const id = formData.get('id') as string;
    if (!id) return fail(400, { message: 'Missing id' });

    const { error: dbError } = await locals.supabase
      .from('suggested_edits')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (dbError) return fail(500, { message: dbError.message });

    return { success: true, id };
  },
};
```

- [ ] **Step 3: Run type check**

```sh
pnpm check
```

Expected: fewer errors than before. Server files should be clean.

- [ ] **Step 4: Commit**

```sh
git add src/routes/pending/+page.server.ts src/routes/suggested-edits/+page.server.ts
git commit -m "feat: update pending and suggested-edits server routes for normalized categories/services"
```

---

## Task 5: Update DirectoryTable category derivation

**Files:**
- Modify: `src/lib/components/DirectoryTable.svelte`

The `categories` derived value was `[...new Set(businesses.map(b => b.category))].sort()`. Now it must pull from `b.categories[0].name` (or all category names). The filter must match businesses where **any** of their categories matches a selected one.

- [ ] **Step 1: Update category derivation and filter in DirectoryTable**

Find these lines in `src/lib/components/DirectoryTable.svelte`:

```ts
const categories = $derived([...new Set(activeBusinesses.map((b) => b.category))].sort());

const filtered = $derived(
  activeBusinesses
    .map((b, i) => ({ ...b, id: b.id ?? `${b.name}-${i}` }))
    .filter((b) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.subcategories.some((s) => s.toLowerCase().includes(q)) ||
        (b.description ?? '').toLowerCase().includes(q) ||
        b.services.some((s) => s.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(b.category);

      return matchesSearch && matchesCategory;
    })
);
```

Replace with:

```ts
const categories = $derived(
  [...new Set(activeBusinesses.flatMap((b) => b.categories.map((c) => c.name)))].sort()
);

const filtered = $derived(
  activeBusinesses
    .map((b, i) => ({ ...b, id: b.id ?? `${b.name}-${i}` }))
    .filter((b) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.categories.some((c) => c.name.toLowerCase().includes(q)) ||
        b.services.some((s) => s.name.toLowerCase().includes(q)) ||
        (b.description ?? '').toLowerCase().includes(q);

      const matchesCategory =
        selectedCategories.length === 0 ||
        b.categories.some((c) => selectedCategories.includes(c.name));

      return matchesSearch && matchesCategory;
    })
);
```

- [ ] **Step 2: Run svelte-autofixer**

Call `mcp__svelte__svelte-autofixer` on `src/lib/components/DirectoryTable.svelte`. Fix any issues.

- [ ] **Step 3: Run type check**

```sh
pnpm check
```

- [ ] **Step 4: Commit**

```sh
git add src/lib/components/DirectoryTable.svelte
git commit -m "feat: derive categories from normalized Business.categories array"
```

---

## Task 6: Update card and table view components

**Files:**
- Modify: `src/lib/components/DirectoryCardView.svelte`
- Modify: `src/lib/components/DirectoryTableView.svelte`

### DirectoryCardView

Groups by `b.category` (string). Now groups by `b.categories[0]?.name ?? 'Uncategorized'`. The subcategory pills are replaced by service name pills (since services replaces subcategories).

- [ ] **Step 1: Update DirectoryCardView grouping**

Find in `DirectoryCardView.svelte`:

```ts
const grouped = $derived.by(() => {
  const map = new SvelteMap<string, Business[]>();
  for (const b of filtered) {
    if (!map.has(b.category)) map.set(b.category, []);
    map.get(b.category)!.push(b);
  }
  return map;
});

const activeCategories = $derived(new SvelteSet(filtered.map((b) => b.category)));
```

Replace with:

```ts
const grouped = $derived.by(() => {
  const map = new SvelteMap<string, Business[]>();
  for (const b of filtered) {
    const key = b.categories[0]?.name ?? 'Uncategorized';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(b);
  }
  return map;
});

const activeCategories = $derived(
  new SvelteSet(filtered.map((b) => b.categories[0]?.name ?? 'Uncategorized'))
);
```

- [ ] **Step 2: Update subcategory pills to service pills in DirectoryCardView**

Find the subcategory pills section in the card button template:

```svelte
{#if business.subcategories.length > 0}
  <div class="mt-1 flex flex-wrap gap-1">
    {#each business.subcategories as sub (sub)}
      <span class="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] leading-tight text-muted-foreground">{sub}</span>
    {/each}
  </div>
{/if}
```

Replace with:

```svelte
{#if business.services.length > 0}
  <div class="mt-1 flex flex-wrap gap-1">
    {#each business.services as svc (svc.id)}
      <span class="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] leading-tight text-muted-foreground">{svc.name}</span>
    {/each}
  </div>
{/if}
```

### DirectoryTableView

Renders `business.subcategories` as pills in the table cell. Replace with `business.services`.

- [ ] **Step 3: Update subcategory pills in DirectoryTableView**

Find in `DirectoryTableView.svelte`:

```svelte
{#if business.subcategories.length > 0}
  <div class="mt-0.5 flex flex-nowrap gap-1 overflow-hidden">
    {#each business.subcategories.slice(0, 2) as sub (sub)}
      <span class="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] leading-tight text-muted-foreground">{sub}</span>
    {/each}
    {#if business.subcategories.length > 2}
      <span class="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] leading-tight text-muted-foreground">+{business.subcategories.length - 2} more</span>
    {/if}
  </div>
{/if}
```

Replace with:

```svelte
{#if business.services.length > 0}
  <div class="mt-0.5 flex flex-nowrap gap-1 overflow-hidden">
    {#each business.services.slice(0, 2) as svc (svc.id)}
      <span class="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] leading-tight text-muted-foreground">{svc.name}</span>
    {/each}
    {#if business.services.length > 2}
      <span class="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] leading-tight text-muted-foreground">+{business.services.length - 2} more</span>
    {/if}
  </div>
{/if}
```

- [ ] **Step 4: Run svelte-autofixer on both files**

Call `mcp__svelte__svelte-autofixer` on `DirectoryCardView.svelte` and `DirectoryTableView.svelte`. Fix issues.

- [ ] **Step 5: Run type check**

```sh
pnpm check
```

- [ ] **Step 6: Commit**

```sh
git add src/lib/components/DirectoryCardView.svelte src/lib/components/DirectoryTableView.svelte
git commit -m "feat: update card and table views for normalized categories and services"
```

---

## Task 7: Update BusinessProfileDialog and EditBusinessDialog

**Files:**
- Modify: `src/lib/components/BusinessProfileDialog.svelte`
- Modify: `src/lib/components/EditBusinessDialog.svelte`

### BusinessProfileDialog

Currently renders `business.category` as a primary pill and `business.subcategories` as secondary pills, then `business.services` in a separate section. Now renders `business.categories` as primary pills and `business.services` in the services section (no separate subcategories section).

- [ ] **Step 1: Update BusinessProfileDialog category + services display**

Find the category/subcategories section:

```svelte
<div class="flex flex-wrap gap-1.5">
  <span class="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
    {business.category}
  </span>
  {#each business.subcategories as sub (sub)}
    <span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{sub}</span>
  {/each}
</div>
```

Replace with:

```svelte
<div class="flex flex-wrap gap-1.5">
  {#each business.categories as cat (cat.id)}
    <span class="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      {cat.name}
    </span>
  {/each}
</div>
```

Find the services section:

```svelte
{#if business.services.length > 0}
  <div class="flex flex-col gap-1.5">
    <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Services</p>
    <div class="flex flex-wrap gap-1">
      {#each business.services as service (service)}
        <span class="rounded-sm bg-muted/60 px-2 py-0.5 text-xs text-foreground/70">{service}</span>
      {/each}
    </div>
  </div>
{/if}
```

Replace with:

```svelte
{#if business.services.length > 0}
  <div class="flex flex-col gap-1.5">
    <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Services</p>
    <div class="flex flex-wrap gap-1">
      {#each business.services as svc (svc.id)}
        <span class="rounded-sm bg-muted/60 px-2 py-0.5 text-xs text-foreground/70">{svc.name}</span>
      {/each}
    </div>
  </div>
{/if}
```

### EditBusinessDialog

The form currently has:
- `<input type="hidden" name="category" bind:value={$form.category} />` — hidden, not editable
- An `<Input>` for `subcategories` (comma-sep)
- An `<Input>` for `services` (comma-sep)

Now there is no hidden category field. Categories are editable (comma-sep). Services are also editable (comma-sep). The `$effect` that seeds the form on open must also change.

- [ ] **Step 2: Update the $effect in EditBusinessDialog**

Find the `$effect` that seeds the form:

```ts
$effect(() => {
  if (open) {
    $form.id = business.id!;
    $form.name = business.name;
    $form.email = business.email ?? null;
    $form.phones = business.phones.join(', ');
    $form.address = business.address ?? null;
    $form.website = business.website ?? null;
    $form.description = business.description ?? null;
    $form.category = business.category;
    $form.subcategories = business.subcategories.join(', ');
    $form.services = business.services.join(', ');
  }
});
```

Replace with:

```ts
$effect(() => {
  if (open) {
    $form.id = business.id!;
    $form.name = business.name;
    $form.email = business.email ?? null;
    $form.phones = business.phones.join(', ');
    $form.address = business.address ?? null;
    $form.website = business.website ?? null;
    $form.description = business.description ?? null;
    $form.categories = business.categories.map((c) => c.name).join(', ');
    $form.services = business.services.map((s) => s.name).join(', ');
  }
});
```

- [ ] **Step 3: Update the form fields in EditBusinessDialog**

Find the hidden category input and the subcategories/services inputs in the form body:

```svelte
<input type="hidden" name="category" bind:value={$form.category} />

...

<!-- subcategories field -->
<div class="flex flex-col gap-1.5">
  <Label for="eb-subcategories">Subcategories</Label>
  <Input id="eb-subcategories" name="subcategories" bind:value={$form.subcategories} placeholder="Residential, Commercial" />
  <p class="text-xs text-muted-foreground">Comma-separated</p>
</div>

<div class="flex flex-col gap-1.5">
  <Label for="eb-services">Services</Label>
  <Input id="eb-services" name="services" bind:value={$form.services} placeholder="Pipe repair, Water heater" />
  <p class="text-xs text-muted-foreground">Comma-separated</p>
</div>
```

Replace with (remove hidden category, replace subcategories with categories):

```svelte
<div class="col-span-2 flex flex-col gap-1.5">
  <Label for="eb-categories">Categories</Label>
  <Input id="eb-categories" name="categories" bind:value={$form.categories} placeholder="Plumbing, Electrical" />
  <p class="text-xs text-muted-foreground">Comma-separated</p>
  {#if $errors.categories}<p class="text-xs text-destructive">{$errors.categories}</p>{/if}
</div>

<div class="col-span-2 flex flex-col gap-1.5">
  <Label for="eb-services">Services</Label>
  <Input id="eb-services" name="services" bind:value={$form.services} placeholder="Pipe repair, Water heater installation" />
  <p class="text-xs text-muted-foreground">Comma-separated</p>
</div>
```

Note: The old `<input type="hidden" name="category">` is removed entirely. The `name="categories"` Input replaces it and sends the data to the server.

- [ ] **Step 4: Run svelte-autofixer on both files**

Call `mcp__svelte__svelte-autofixer` on `BusinessProfileDialog.svelte` and `EditBusinessDialog.svelte`. Fix issues.

- [ ] **Step 5: Run type check**

```sh
pnpm check
```

- [ ] **Step 6: Commit**

```sh
git add src/lib/components/BusinessProfileDialog.svelte src/lib/components/EditBusinessDialog.svelte
git commit -m "feat: update profile and edit dialogs for normalized categories and services"
```

---

## Task 8: Update SuggestEditDialog and pdf.ts

**Files:**
- Modify: `src/lib/components/SuggestEditDialog.svelte`
- Modify: `src/lib/utils/pdf.ts`

### SuggestEditDialog

Hidden inputs must now derive values from `business.categories` and `business.services` (arrays of objects).

- [ ] **Step 1: Update hidden inputs in SuggestEditDialog**

Find the hidden inputs:

```svelte
<input type="hidden" name="business_id" value={business.id} />
<input type="hidden" name="category" value={business.category} />
<input type="hidden" name="subcategories" value={business.subcategories.join(', ')} />
<input type="hidden" name="services" value={business.services.join(', ')} />
```

Replace with:

```svelte
<input type="hidden" name="business_id" value={business.id} />
<input type="hidden" name="category" value={business.categories[0]?.name ?? ''} />
<input type="hidden" name="subcategories" value={business.categories.map((c) => c.name).join(', ')} />
<input type="hidden" name="services" value={business.services.map((s) => s.name).join(', ')} />
```

Note:
- `category` = first category name (used for the diff display field)
- `subcategories` = all category names (used by `approveEdit` to resolve category IDs)
- `services` = all service names (used by `approveEdit` to resolve service IDs)

### pdf.ts

Groups by `b.category` (string). Now must group by `b.categories[0]?.name ?? 'Uncategorized'`.

- [ ] **Step 2: Update grouping in pdf.ts**

In `src/lib/utils/pdf.ts`, find:

```ts
const grouped = new Map<string, Business[]>();
for (const b of businesses) {
  if (!grouped.has(b.category)) grouped.set(b.category, []);
  grouped.get(b.category)!.push(b);
}
```

Replace with:

```ts
const grouped = new Map<string, Business[]>();
for (const b of businesses) {
  const key = b.categories[0]?.name ?? 'Uncategorized';
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key)!.push(b);
}
```

Also update the services lines in the PDF body. Find:

```ts
const tags = [...(b.subcategories ?? []), ...(b.services ?? [])];
if (tags.length > 0) {
  doc.setTextColor(100);
  const tagLine = tags.join(' · ');
```

Replace with:

```ts
const tags = b.services.map((s) => s.name);
if (tags.length > 0) {
  doc.setTextColor(100);
  const tagLine = tags.join(' · ');
```

- [ ] **Step 3: Run svelte-autofixer on SuggestEditDialog**

Call `mcp__svelte__svelte-autofixer` on `src/lib/components/SuggestEditDialog.svelte`. Fix issues.

- [ ] **Step 4: Run type check**

```sh
pnpm check
```

Expected: 0 errors, 1 pre-existing warning.

- [ ] **Step 5: Commit**

```sh
git add src/lib/components/SuggestEditDialog.svelte src/lib/utils/pdf.ts
git commit -m "feat: update suggest-edit hidden inputs and pdf export for normalized categories/services"
```

---

## Task 9: Update suggested-edits diff view

**Files:**
- Modify: `src/routes/suggested-edits/+page.svelte`

The diff view has a `DIFF_FIELDS` array with entries for `category`, `subcategories`, and `services`. After normalization:
- `category` field: display label stays "Category" — shows the primary category name
- `subcategories` field: rename display label to "Categories" — now stores all category names
- `services` field: unchanged label

The `suggested_edits` rows now join `businesses` which has the new `categories`/`services` shape. The `businesses` key in the suggestion contains the mapped business (with `categories: Category[]` and `services: Service[]` from the server load). We need to display these correctly in the "Current" column.

- [ ] **Step 1: Read the current suggested-edits +page.svelte**

Read `src/routes/suggested-edits/+page.svelte` before editing to understand the current DIFF_FIELDS structure, `display()` helper, and diff table markup.

- [ ] **Step 2: Update DIFF_FIELDS**

Find the `DIFF_FIELDS` array. It currently has entries for `category`, `subcategories`, `services`. Update:

```ts
const DIFF_FIELDS: { key: string; label: string; array: boolean; html?: boolean; businessKey?: string }[] = [
  { key: 'name', label: 'Name', array: false },
  { key: 'email', label: 'Email', array: false },
  { key: 'phones', label: 'Phones', array: true },
  { key: 'address', label: 'Address', array: false },
  { key: 'website', label: 'Website', array: false },
  { key: 'description', label: 'Description', array: false, html: true },
  { key: 'category', label: 'Category', array: false },
  { key: 'subcategories', label: 'Categories', array: true, businessKey: 'categories_display' },
  { key: 'services', label: 'Services', array: true, businessKey: 'services_display' },
];
```

The `businessKey` tells the diff renderer to read a different key when comparing against the current business data (since the business now has `categories: Category[]` and `services: Service[]` instead of arrays of strings).

- [ ] **Step 3: Update the suggestion type and business display helpers**

Add a helper `businessDisplay()` that converts the normalized business fields to strings for comparison:

```ts
function businessDisplay(business: any, field: typeof DIFF_FIELDS[number]): string {
  if (field.businessKey === 'categories_display') {
    return display((business?.categories ?? []).map((c: any) => c.name), true);
  }
  if (field.businessKey === 'services_display') {
    return display((business?.services ?? []).map((s: any) => s.name), true);
  }
  return display(business?.[field.key], field.array);
}
```

- [ ] **Step 4: Update the diff table to use businessDisplay()**

In the diff table, the "Current value" column reads from `business[field.key]`. For the normalized fields, replace those reads with `businessDisplay(business, field)`.

Find the Current column cell (it reads the business value). Replace the cell content:

```svelte
<td class="... {hasChanged(...) ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}">
  {#if field.html}
    <div class="...">
      {@html businessDisplay(suggestion.businesses, field)}
    </div>
  {:else}
    {businessDisplay(suggestion.businesses, field)}
  {/if}
</td>
```

The Suggested column cell still reads from `suggestion[field.key]` directly (the suggestion stores denormalized strings), and uses `display(suggestion[field.key], field.array)` unchanged.

- [ ] **Step 5: Update hasChanged to use businessDisplay**

`hasChanged` currently compares `display(businessVal, ...)` vs `display(suggestionVal, ...)`. Update the call site for each field to pass the right business value:

```ts
hasChanged(
  field.businessKey ? businessDisplayRaw(suggestion.businesses, field) : suggestion.businesses?.[field.key],
  suggestion[field.key],
  field.array,
  field.html
)
```

Where `businessDisplayRaw` returns the raw value (array of names for categories/services):

```ts
function businessDisplayRaw(business: any, field: typeof DIFF_FIELDS[number]): any {
  if (field.businessKey === 'categories_display') {
    return (business?.categories ?? []).map((c: any) => c.name);
  }
  if (field.businessKey === 'services_display') {
    return (business?.services ?? []).map((s: any) => s.name);
  }
  return business?.[field.key];
}
```

- [ ] **Step 6: Run svelte-autofixer**

Call `mcp__svelte__svelte-autofixer` on `src/routes/suggested-edits/+page.svelte`. Fix any issues.

- [ ] **Step 7: Run type check**

```sh
pnpm check
```

Expected: 0 errors, 1 pre-existing warning.

- [ ] **Step 8: Commit**

```sh
git add src/routes/suggested-edits/+page.svelte
git commit -m "feat: update suggested-edits diff view for normalized categories and services"
```

---

## Self-Review

**Spec coverage:**
- [x] `categories` lookup table (id, shortname, name) → Task 1
- [x] `services` lookup table (id, shortname, name) → Task 1
- [x] `business_categories` many-to-many link → Task 1
- [x] `business_services` many-to-many link → Task 1
- [x] Data migration from existing string columns → Task 1
- [x] Drop old `category`, `subcategories`, `services` columns → Task 1
- [x] TypeScript `Business` type updated → Task 2
- [x] Form schema updated → Task 2
- [x] Main page load with joins → Task 3
- [x] `updateBusiness` upserts + relinks → Task 3
- [x] `suggestEdit` stores denormalized names → Task 3
- [x] Pending page load → Task 4
- [x] `approveEdit` resolves names to IDs → Task 4
- [x] Directory filter by category → Task 5
- [x] Card view grouping + service pills → Task 6
- [x] Table view service pills → Task 6
- [x] Profile dialog categories + services → Task 7
- [x] Edit dialog form fields → Task 7
- [x] Suggest edit hidden inputs → Task 8
- [x] PDF grouping + services tags → Task 8
- [x] Diff view labels + business value rendering → Task 9

**Type consistency:**
- `Category.id/shortname/name` defined in Task 2, used in Tasks 6, 7, 8, 9 — consistent
- `Service.id/shortname/name` defined in Task 2, used in Tasks 6, 7, 8 — consistent
- `businessSchema.categories` (string) defined in Task 2, read as `form.data.categories` in Task 3 — consistent
- `upsertAndLinkCategories`/`upsertAndLinkServices` defined in Task 3, duplicated in Task 4 — intentional duplication to avoid cross-file imports between route modules
