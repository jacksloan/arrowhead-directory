# Suggest a Category / Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authenticated users suggest new categories or services from the Edit Business dialog; admins review and approve/reject suggestions from the Pending page.

**Architecture:** A `lookup_suggestions` table stores pending suggestions. A shared `SuggestLookupDialog` component handles the submission UI — it mounts as a sibling dialog inside `EditBusinessDialog`, following the same pattern as the existing delete-confirm AlertDialog. The admin review section is appended to `/pending` (load + actions extended). Approving a suggestion inserts a new row into `categories` or `services`.

**Tech Stack:** SvelteKit, Svelte 5 runes, Supabase JS client, shadcn-svelte Dialog, Tailwind CSS v4, pnpm

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/components/SuggestLookupDialog.svelte` | Secondary modal: text input + form POST |
| Modify | `src/lib/components/EditBusinessDialog.svelte` | Add "Suggest" buttons + mount SuggestLookupDialog |
| Modify | `src/lib/types.ts` | Add `LookupSuggestion` interface |
| Modify | `src/routes/+page.server.ts` | Add `suggestLookup` action |
| Modify | `src/routes/pending/+page.server.ts` | Load suggestions, add approve/reject actions |
| Modify | `src/routes/pending/+page.svelte` | Suggestions review section |

---

### Task 1: DB Migration — `lookup_suggestions` table

**Files:**
- No source files — applied via Supabase MCP `apply_migration`

- [ ] **Step 1: Apply migration via Supabase MCP**

Call `apply_migration` with the following SQL. Migration name: `create_lookup_suggestions`.

```sql
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
```

- [ ] **Step 2: Verify via execute_sql**

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'lookup_suggestions'
order by ordinal_position;
```

Expected: rows for `id`, `type`, `name`, `suggested_by`, `business_id`, `status`, `created_at`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add lookup_suggestions table with RLS"
```

---

### Task 2: Add `LookupSuggestion` type

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add the interface**

Open `src/lib/types.ts` and append after the `Business` interface:

```ts
export interface LookupSuggestion {
  id: string;
  type: 'category' | 'service';
  name: string;
  suggested_by: string;
  business_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add LookupSuggestion type"
```

---

### Task 3: Server action — `suggestLookup`

**Files:**
- Modify: `src/routes/+page.server.ts`

- [ ] **Step 1: Add the action**

Open `src/routes/+page.server.ts`. Inside the `actions` object (after the last existing action), add:

```ts
suggestLookup: async ({ request, locals }) => {
  const { user } = await locals.safeGetSession();
  if (!user) return fail(401, { message: 'Not authenticated' });

  const formData = await request.formData();
  const type = formData.get('type') as string;
  const name = (formData.get('name') as string)?.trim();
  const business_id = (formData.get('business_id') as string) || null;

  if (!['category', 'service'].includes(type)) {
    return fail(400, { message: 'Invalid suggestion type.' });
  }
  if (!name) return fail(400, { message: 'Name is required.' });

  const { error: dbError } = await locals.supabase.from('lookup_suggestions').insert({
    type,
    name,
    suggested_by: user.email!,
    business_id,
  });

  if (dbError) return fail(500, { message: dbError.message });
  return { success: true };
},
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/+page.server.ts
git commit -m "feat: add suggestLookup server action"
```

---

### Task 4: `SuggestLookupDialog` component

**Files:**
- Create: `src/lib/components/SuggestLookupDialog.svelte`

- [ ] **Step 1: Create the component**

Create `src/lib/components/SuggestLookupDialog.svelte` with the following content:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
  } from '$lib/components/ui/dialog/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';

  let {
    type,
    businessId,
    open = $bindable(false),
  }: {
    type: 'category' | 'service';
    businessId: string;
    open: boolean;
  } = $props();

  let name = $state('');
  let submitted = $state(false);
  let submitting = $state(false);
  let errorMsg = $state<string | null>(null);

  $effect(() => {
    if (!open) {
      name = '';
      submitted = false;
      submitting = false;
      errorMsg = null;
    }
  });
</script>

<Dialog bind:open>
  <DialogContent class="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle>Suggest a {type}</DialogTitle>
    </DialogHeader>

    {#if submitted}
      <p class="py-2 text-sm text-muted-foreground">
        Thanks! Your suggestion has been sent to admins for review.
      </p>
      <DialogFooter>
        <Button onclick={() => (open = false)}>Close</Button>
      </DialogFooter>
    {:else}
      <form
        method="POST"
        action="/?/suggestLookup"
        class="flex flex-col gap-4"
        use:enhance={() => {
          submitting = true;
          errorMsg = null;
          return async ({ result }) => {
            submitting = false;
            if (result.type === 'success') {
              submitted = true;
            } else if (result.type === 'failure') {
              errorMsg = (result.data as any)?.message ?? 'Something went wrong.';
            }
          };
        }}
      >
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="business_id" value={businessId} />
        <div class="flex flex-col gap-1.5">
          <Label for="suggest-name">{type === 'category' ? 'Category' : 'Service'} name</Label>
          <Input
            id="suggest-name"
            name="name"
            bind:value={name}
            placeholder={type === 'category' ? 'e.g. Automotive' : 'e.g. Oil Change'}
            required
          />
        </div>
        {#if errorMsg}
          <p class="text-xs text-destructive">{errorMsg}</p>
        {/if}
        <DialogFooter>
          <Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? 'Sending…' : 'Send suggestion'}
          </Button>
        </DialogFooter>
      </form>
    {/if}
  </DialogContent>
</Dialog>
```

- [ ] **Step 2: Run svelte-autofixer**

Call `mcp__svelte__svelte-autofixer` with the component code above. Fix any reported issues before proceeding.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/SuggestLookupDialog.svelte
git commit -m "feat: add SuggestLookupDialog component"
```

---

### Task 5: Wire `SuggestLookupDialog` into `EditBusinessDialog`

**Files:**
- Modify: `src/lib/components/EditBusinessDialog.svelte`

There are four changes: (a) import the new component, (b) add two open-state variables, (c) update the Categories label row, (d) update the Services label row, (e) mount two dialog instances at the bottom of the file.

- [ ] **Step 1: Add import and state**

In `src/lib/components/EditBusinessDialog.svelte`, add the import after the existing `lookupStore` import line (line 40):

```ts
import SuggestLookupDialog from './SuggestLookupDialog.svelte';
```

Then add two state variables after `let deleteError = $state<string | null>(null);` (line 115):

```ts
let suggestCategoryOpen = $state(false);
let suggestServiceOpen = $state(false);
```

- [ ] **Step 2: Update the Categories label row**

Find this block (around line 175–176):

```svelte
        <div class="col-span-2 flex flex-col gap-1.5">
          <Label>Categories</Label>
```

Replace it with:

```svelte
        <div class="col-span-2 flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <Label>Categories</Label>
            <button
              type="button"
              class="text-xs text-muted-foreground hover:text-foreground"
              onclick={() => (suggestCategoryOpen = true)}
            >
              Suggest a category
            </button>
          </div>
```

- [ ] **Step 3: Update the Services label row**

Find this block (around line 215–216):

```svelte
        <div class="col-span-2 flex flex-col gap-1.5">
          <Label>Services</Label>
```

Replace it with:

```svelte
        <div class="col-span-2 flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <Label>Services</Label>
            <button
              type="button"
              class="text-xs text-muted-foreground hover:text-foreground"
              onclick={() => (suggestServiceOpen = true)}
            >
              Suggest a service
            </button>
          </div>
```

- [ ] **Step 4: Mount SuggestLookupDialog instances**

At the very bottom of `EditBusinessDialog.svelte`, after the closing `</AlertDialog>` tag, append:

```svelte
<SuggestLookupDialog
  type="category"
  businessId={business.id!}
  bind:open={suggestCategoryOpen}
/>

<SuggestLookupDialog
  type="service"
  businessId={business.id!}
  bind:open={suggestServiceOpen}
/>
```

- [ ] **Step 5: Run svelte-autofixer**

Call `mcp__svelte__svelte-autofixer` with the full updated file content. Fix any issues.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 7: Manual browser test**

Start the dev server (`pnpm dev`) and:
1. Log in, open the Edit dialog for any business.
2. Verify "Suggest a category" link appears to the right of the "Categories" label.
3. Verify "Suggest a service" link appears to the right of the "Services" label.
4. Click "Suggest a category" — a secondary dialog should open titled "Suggest a category".
5. Type a name and click "Send suggestion" — success message should appear.
6. Verify a row appears in `lookup_suggestions` via `execute_sql`:
   ```sql
   select * from public.lookup_suggestions order by created_at desc limit 5;
   ```

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/EditBusinessDialog.svelte
git commit -m "feat: add suggest category/service buttons to EditBusinessDialog"
```

---

### Task 6: Admin review — server (load + actions)

**Files:**
- Modify: `src/routes/pending/+page.server.ts`

- [ ] **Step 1: Update load to fetch pending suggestions**

In `src/routes/pending/+page.server.ts`, update the `load` function to also query `lookup_suggestions`:

```ts
import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getIsAdmin } from '$lib/server/admin';
import type { BusinessStatus } from '$lib/types';

const VALID_STATUSES: BusinessStatus[] = ['approved', 'pending', 'rejected'];

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (!(await getIsAdmin(locals.supabase, user?.email))) throw error(403, 'Forbidden');

  const [{ data: businesses, error: bizError }, { data: suggestions, error: sugError }] =
    await Promise.all([
      locals.supabase
        .from('businesses')
        .select('*, business_categories ( categories (*) ), business_services ( services (*) )')
        .eq('status', 'pending')
        .order('created_at'),
      locals.supabase
        .from('lookup_suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at'),
    ]);

  if (bizError) throw new Error(bizError.message);
  if (sugError) throw new Error(sugError.message);

  const mapped = (businesses ?? []).map((b: any) => ({
    ...b,
    categories: (b.business_categories ?? []).map((bc: any) => bc.categories),
    services: (b.business_services ?? []).map((bs: any) => bs.services),
  }));

  return { businesses: mapped, suggestions: suggestions ?? [] };
};
```

- [ ] **Step 2: Add approve and reject actions**

In the same file, inside the `actions` object, add after the existing `updateStatus` action:

```ts
approveSuggestion: async ({ request, locals }) => {
  const { user } = await locals.safeGetSession();
  if (!(await getIsAdmin(locals.supabase, user?.email))) return fail(403, { message: 'Forbidden' });

  const formData = await request.formData();
  const id = formData.get('id') as string;
  if (!id) return fail(400, { message: 'Missing suggestion id' });

  const { data: suggestion, error: fetchError } = await locals.supabase
    .from('lookup_suggestions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !suggestion) return fail(404, { message: 'Suggestion not found' });

  const shortname = suggestion.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const table = suggestion.type === 'category' ? 'categories' : 'services';
  const { error: insertError } = await locals.supabase
    .from(table)
    .insert({ shortname, name: suggestion.name });

  if (insertError) return fail(500, { message: insertError.message });

  const { error: updateError } = await locals.supabase
    .from('lookup_suggestions')
    .update({ status: 'approved' })
    .eq('id', id);

  if (updateError) return fail(500, { message: updateError.message });
  return { success: true, id };
},

rejectSuggestion: async ({ request, locals }) => {
  const { user } = await locals.safeGetSession();
  if (!(await getIsAdmin(locals.supabase, user?.email))) return fail(403, { message: 'Forbidden' });

  const formData = await request.formData();
  const id = formData.get('id') as string;
  if (!id) return fail(400, { message: 'Missing suggestion id' });

  const { error: dbError } = await locals.supabase
    .from('lookup_suggestions')
    .update({ status: 'rejected' })
    .eq('id', id);

  if (dbError) return fail(500, { message: dbError.message });
  return { success: true, id };
},
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/pending/+page.server.ts
git commit -m "feat: load and approve/reject lookup suggestions in pending page"
```

---

### Task 7: Admin review — UI

**Files:**
- Modify: `src/routes/pending/+page.svelte`

- [ ] **Step 1: Import LookupSuggestion type and add suggestion state**

In the `<script>` block of `src/routes/pending/+page.svelte`, add `LookupSuggestion` to the type import:

```ts
import type { Business, BusinessStatus, LookupSuggestion } from '$lib/types';
```

Then add this state variable after `let errorMsg = $state<string | null>(null);`:

```ts
let removedSuggestionIds = $state(new Set<string>());
const suggestions = $derived(
  data.suggestions.filter((s: LookupSuggestion) => !removedSuggestionIds.has(s.id))
);
```

- [ ] **Step 2: Add suggestion review section to the template**

At the bottom of the template in `src/routes/pending/+page.svelte`, after the closing `{/if}` of the businesses section (but before `<!-- Status modal -->`), add:

```svelte
<!-- Lookup suggestions section -->
{#if suggestions.length > 0}
  <div class="mt-12">
    <div class="mb-4">
      <h2 class="text-xl font-bold">Lookup Suggestions</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        {suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'} awaiting review
      </p>
    </div>
    <div class="flex flex-col gap-2">
      {#each suggestions as suggestion (suggestion.id)}
        <div class="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
          <div class="flex items-center gap-3 min-w-0">
            <span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium
              {suggestion.type === 'category'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'}">
              {suggestion.type}
            </span>
            <span class="truncate text-sm font-medium">{suggestion.name}</span>
            <span class="shrink-0 text-xs text-muted-foreground">by {suggestion.suggested_by}</span>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <form
              method="POST"
              action="/pending?/approveSuggestion"
              use:enhance={() => {
                return async ({ result }) => {
                  if (result.type === 'success' && (result.data as any)?.id) {
                    removedSuggestionIds.add((result.data as any).id);
                  }
                };
              }}
            >
              <input type="hidden" name="id" value={suggestion.id} />
              <Button type="submit" size="sm">Approve</Button>
            </form>
            <form
              method="POST"
              action="/pending?/rejectSuggestion"
              use:enhance={() => {
                return async ({ result }) => {
                  if (result.type === 'success' && (result.data as any)?.id) {
                    removedSuggestionIds.add((result.data as any).id);
                  }
                };
              }}
            >
              <input type="hidden" name="id" value={suggestion.id} />
              <Button type="submit" size="sm" variant="outline">Reject</Button>
            </form>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
```

Note: `enhance` is already imported from `$app/forms` at the top of the file.

- [ ] **Step 3: Run svelte-autofixer**

Call `mcp__svelte__svelte-autofixer` with the full updated `+page.svelte` content. Fix any issues.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 5: Manual browser test**

1. Insert a test suggestion row directly via SQL:
   ```sql
   insert into public.lookup_suggestions (type, name, suggested_by)
   values ('category', 'Test Category', 'test@example.com');
   ```
2. Navigate to `/pending` as an admin.
3. Verify the "Lookup Suggestions" section appears with the test suggestion, showing a "category" badge, the name, and Approve/Reject buttons.
4. Click "Approve" — row disappears from the list.
5. Verify the new category was inserted:
   ```sql
   select * from public.categories where name = 'Test Category';
   ```
   Expected: one row with `shortname = 'test-category'`.
6. Insert another test suggestion and click "Reject" — verify the row disappears and `status = 'rejected'` in the DB:
   ```sql
   select status from public.lookup_suggestions where name like 'Test%';
   ```

- [ ] **Step 6: Commit**

```bash
git add src/routes/pending/+page.svelte
git commit -m "feat: show lookup suggestions review section on pending page"
```

---

## Self-Review

**Spec coverage:**
- ✅ "Suggest a category" button flexed to the right of the Categories label — Task 5
- ✅ "Suggest a service" button flexed to the right of the Services label — Task 5
- ✅ Secondary modal with simple text input — Task 4
- ✅ Suggestions stored for admin review — Tasks 1–3
- ✅ Admin review UI — Tasks 6–7
- ✅ Approve inserts into categories/services — Task 6

**Placeholder scan:** None found.

**Type consistency:**
- `LookupSuggestion` defined in Task 2 (`types.ts`), used in Task 7 (`+page.svelte`) — consistent.
- `approveSuggestion` / `rejectSuggestion` action names match between Task 6 (server) and Task 7 (form actions).
- `suggestLookup` action name matches between Task 3 (server) and Task 4 (`SuggestLookupDialog` form action).
