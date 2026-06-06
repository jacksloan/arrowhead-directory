# Directory Feature Bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add edit/delete for owners and admins, suggested edits for other users, a feature request voting page, and a PDF export button to the Arrowhead Directory SvelteKit app.

**Architecture:** Four independent feature groups (A–D) that can be implemented sequentially. All features use the existing Supabase session client with RLS enforcement. New DB tables are added via Supabase SQL editor migrations. UI components follow the existing shadcn-svelte + Svelte 5 runes patterns already in the codebase.

**Tech Stack:** Svelte 5, SvelteKit, Supabase (postgres + RLS), shadcn-svelte, Tailwind CSS v4, @lucide/svelte, sveltekit-superforms, jspdf

---

## Codebase Context

Key files to understand before starting:

- `src/lib/types.ts` — `Business` interface and `BusinessStatus` union type
- `src/lib/schemas.ts` — zod schema for business form validation
- `src/lib/server/admin.ts` — `getIsAdmin(supabase, email)` helper
- `src/routes/+page.server.ts` — loads approved businesses; has `updateBusiness`, `sendMagicLink`, `signOut` actions
- `src/routes/+layout.server.ts` — exposes `user` and `isAdmin` to all pages (merged into `data` in every `+page.svelte`)
- `src/lib/components/DirectoryTable.svelte` — top-level directory coordinator; manages `editingBusiness`/`dialogOpen` state for `EditBusinessDialog`
- `src/lib/components/DirectoryCardView.svelte` — card grid; manages `selectedBusiness`/`profileOpen` for `BusinessProfileDialog`; determines `isOwner` by comparing `user.email === business.email`
- `src/lib/components/DirectoryTableView.svelte` — table view; same pattern as CardView
- `src/lib/components/BusinessProfileDialog.svelte` — shows business details; accepts optional `onedit?: (b: Business) => void` callback; renders "Edit listing" text button at bottom when callback is provided
- `src/lib/components/EditBusinessDialog.svelte` — edit form using superforms; posts to `/?/updateBusiness`
- `src/lib/components/HamburgerSheet.svelte` — side nav; shows admin-only links when `isAdmin={true}`

**RLS prerequisite:** The `is_admin()` SECURITY DEFINER function and `admins` table must already exist in the database. The plan from the previous session covers creating those. Do NOT run those migrations again if they already exist.

---

## Feature A: Edit Icon + Soft Delete (Features 1 & 2)

### Task A1: DB migration — add 'deleted' to business_status enum

**Files:**
- SQL migration (run in Supabase SQL editor)

- [ ] **Step 1: Add 'deleted' value to the enum**

Run in Supabase SQL editor:

```sql
ALTER TYPE business_status ADD VALUE 'deleted';
```

Note: PostgreSQL does not allow removing enum values. If the migration already includes 'deleted', skip this step.

- [ ] **Step 2: Verify**

```sql
SELECT enum_range(NULL::business_status);
-- Should return: {approved,pending,rejected,deleted}
```

---

### Task A2: Add 'deleted' to TypeScript BusinessStatus type

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Update BusinessStatus union**

```ts
// src/lib/types.ts
export type BusinessStatus = 'approved' | 'pending' | 'rejected' | 'deleted';

export interface Business {
  id?: string;
  name: string;
  email: string | null;
  phones: string[];
  address: string | null;
  website: string | null;
  description: string | null;
  category: string;
  subcategories: string[];
  services: string[];
  image: string | null;
  status: BusinessStatus;
  created_at?: string;
  updated_at?: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /path/to/project && pnpm check
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add 'deleted' to BusinessStatus for soft delete"
```

---

### Task A3: Thread isAdmin through directory component hierarchy

The layout already exposes `isAdmin` in `data`. We need to pass it from `+page.svelte` → `DirectoryTable` → `DirectoryCardView` / `DirectoryTableView`.

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/lib/components/DirectoryTable.svelte`
- Modify: `src/lib/components/DirectoryCardView.svelte`
- Modify: `src/lib/components/DirectoryTableView.svelte`

- [ ] **Step 1: Pass isAdmin from page to DirectoryTable**

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import DirectoryTable from '$lib/components/DirectoryTable.svelte';
  let { data } = $props();
</script>

<svelte:head>
  <title>Arrowhead Directory</title>
</svelte:head>

<DirectoryTable
  businesses={data.businesses}
  user={(data as any).user ?? null}
  formData={data.form}
  isAdmin={(data as any).isAdmin ?? false}
/>
```

- [ ] **Step 2: Accept isAdmin in DirectoryTable and pass to views**

In `src/lib/components/DirectoryTable.svelte`, update the props type and pass `isAdmin` to both views:

```svelte
<!-- At the top of the script block, update props: -->
let {
  businesses,
  user,
  formData,
  isAdmin = false
}: {
  businesses: Business[];
  user: { email: string | null } | null;
  formData: any;
  isAdmin: boolean;
} = $props();
```

Update the two view usages in the template:

```svelte
{#if view === 'compact'}
  <DirectoryCardView {filtered} {user} {searching} compact={true} onedit={openEdit} {isAdmin} />
{:else}
  <DirectoryTableView {filtered} {user} onedit={openEdit} {isAdmin} />
{/if}
```

- [ ] **Step 3: Accept isAdmin in DirectoryCardView**

In `src/lib/components/DirectoryCardView.svelte`, update props:

```svelte
let {
  filtered,
  user,
  searching,
  compact,
  onedit,
  isAdmin = false
}: {
  filtered: Business[];
  user: { email: string | null } | null;
  searching: boolean;
  compact: boolean;
  onedit: (b: Business) => void;
  isAdmin: boolean;
} = $props();
```

Update the BusinessProfileDialog call (line ~70) to pass onedit when owner OR admin:

```svelte
{#if selectedBusiness}
  <BusinessProfileDialog
    business={selectedBusiness}
    bind:open={profileOpen}
    onedit={(isAdmin || (user?.email && selectedBusiness.email && user.email === selectedBusiness.email)) ? onedit : undefined}
  />
{/if}
```

Also update the "Owner" badge in the card to show for admin too:

```svelte
{#if isOwner || isAdmin}
  <span class="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
    {isAdmin && !isOwner ? 'Admin' : 'Owner'}
  </span>
{/if}
```

The `isOwner` const is already computed inside the `#each` loop: `{@const isOwner = user?.email && business.email && user.email === business.email}`.

- [ ] **Step 4: Accept isAdmin in DirectoryTableView**

In `src/lib/components/DirectoryTableView.svelte`, update props:

```svelte
let {
  filtered,
  user,
  onedit,
  isAdmin = false
}: {
  filtered: Business[];
  user: { email: string | null } | null;
  onedit: (b: Business) => void;
  isAdmin: boolean;
} = $props();
```

Update BusinessProfileDialog (line ~95):

```svelte
{#if selectedBusiness}
  <BusinessProfileDialog
    business={selectedBusiness}
    bind:open={profileOpen}
    onedit={(isAdmin || (user?.email && selectedBusiness.email && user.email === selectedBusiness.email)) ? onedit : undefined}
  />
{/if}
```

Update the "Edit" button in the table row (around line ~155) to show for admin too:

```svelte
{@const isOwner = user?.email && business.email && user.email === business.email}
<!-- ... inside the name cell: -->
{#if isOwner || isAdmin}
  <button
    class="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/80"
    onclick={(e) => { e.stopPropagation(); onedit(business); }}
  >Edit</button>
{/if}
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
pnpm check
```

- [ ] **Step 6: Commit**

```bash
git add src/routes/+page.svelte src/lib/components/DirectoryTable.svelte src/lib/components/DirectoryCardView.svelte src/lib/components/DirectoryTableView.svelte
git commit -m "feat: thread isAdmin prop through directory component hierarchy"
```

---

### Task A4: Replace "Edit listing" text button with pencil icon in BusinessProfileDialog header

Currently the edit button is a plain text button at the bottom of the dialog. Move it to a pencil icon in the header row.

**Files:**
- Modify: `src/lib/components/BusinessProfileDialog.svelte`

- [ ] **Step 1: Replace the current edit button**

The full updated component (replacing the existing file content):

```svelte
<script lang="ts">
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Copy from '@lucide/svelte/icons/copy';
  import Check from '@lucide/svelte/icons/check';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Phone from '@lucide/svelte/icons/phone';
  import Mail from '@lucide/svelte/icons/mail';
  import Link from '@lucide/svelte/icons/link';
  import Pencil from '@lucide/svelte/icons/pencil';
  import { browser } from '$app/environment';
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
  } from '$lib/components/ui/dialog/index.js';
  import type { Business } from '$lib/types';

  let {
    business,
    open = $bindable(false),
    onedit,
    onsuggestedit
  }: {
    business: Business;
    open: boolean;
    onedit?: (b: Business) => void;
    onsuggestedit?: (b: Business) => void;
  } = $props();

  let copied = $state(false);

  function copyEmail() {
    if (!business.email) return;
    navigator.clipboard.writeText(business.email).then(() => {
      copied = true;
      setTimeout(() => (copied = false), 1800);
    });
  }

  function hostname(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }
</script>

<Dialog bind:open>
  <DialogContent class="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto">
    <DialogHeader>
      <div class="flex items-start gap-2 pr-6">
        <DialogTitle class="flex-1 text-base leading-snug">{business.name}</DialogTitle>
        {#if onedit}
          <button
            class="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Edit listing"
            onclick={() => { open = false; onedit!(business); }}
          >
            <Pencil class="h-4 w-4" />
          </button>
        {/if}
      </div>
    </DialogHeader>

    <div class="flex flex-col gap-4">
      <!-- Category + subcategories -->
      <div class="flex flex-wrap gap-1.5">
        <span class="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {business.category}
        </span>
        {#each business.subcategories as sub (sub)}
          <span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{sub}</span>
        {/each}
      </div>

      <!-- Description -->
      {#if business.description}
        <p class="text-sm leading-relaxed text-foreground/80">{business.description}</p>
      {/if}

      <hr class="border-border" />

      <!-- Contact details -->
      <div class="flex flex-col gap-2">
        {#if business.phones.length > 0}
          <div class="flex flex-col gap-1">
            {#each business.phones as phone, i (phone)}
              <div class="flex items-center gap-2 text-sm">
                <span class="w-4 text-center text-muted-foreground">
                  {#if i === 0}<Phone class="inline h-3.5 w-3.5" />{:else}<span class="text-[10px]">alt</span>{/if}
                </span>
                <a
                  href="tel:{phone.replace(/\D/g, '')}"
                  class="text-foreground underline-offset-2 hover:underline"
                >{phone}</a>
              </div>
            {/each}
          </div>
        {/if}

        {#if browser && business.email}
          <div class="flex items-center gap-2 text-sm">
            <span class="w-4 text-center text-muted-foreground"><Mail class="inline h-3.5 w-3.5" /></span>
            <button
              class="flex-1 text-left text-foreground underline-offset-2 hover:underline"
              title="Open email client"
              onclick={() => { window.location.href = `mailto:${business.email}`; }}
            >{business.email}</button>
            <button
              class="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
              aria-label="Copy email"
              onclick={copyEmail}
            >
              {#if copied}
                <Check class="inline h-3 w-3 text-green-500" />
              {:else}
                <Copy class="inline h-3 w-3" />
              {/if}
            </button>
          </div>
        {/if}

        {#if business.website}
          <div class="flex items-center gap-2 text-sm">
            <span class="w-4 text-center text-muted-foreground"><Link class="inline h-3.5 w-3.5" /></span>
            <a
              href={business.website}
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1 text-primary underline-offset-2 hover:underline"
            >
              {hostname(business.website)}
              <ExternalLink class="h-3 w-3 shrink-0 opacity-60" />
            </a>
          </div>
        {/if}

        {#if business.address}
          <div class="flex items-start gap-2 text-sm">
            <span class="mt-0.5 w-4 text-center text-muted-foreground">
              <MapPin class="inline h-3.5 w-3.5" />
            </span>
            <a
              href="https://maps.google.com/?q={encodeURIComponent(business.address)}"
              target="_blank"
              rel="noopener noreferrer"
              class="text-foreground underline-offset-2 hover:underline"
            >{business.address}</a>
          </div>
        {/if}
      </div>

      <!-- Services -->
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

      <!-- Suggest edit (non-owner, non-admin, logged in) -->
      {#if onsuggestedit}
        <button
          class="mt-1 self-start rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
          onclick={() => { open = false; onsuggestedit!(business); }}
        >Suggest an edit</button>
      {/if}
    </div>
  </DialogContent>
</Dialog>
```

Note: The `onsuggestedit` prop is added here but wired up in Feature B (Task B4). For now it is accepted but won't be passed by callers yet.

- [ ] **Step 2: Verify no TypeScript errors**

```bash
pnpm check
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/BusinessProfileDialog.svelte
git commit -m "feat: replace edit text button with pencil icon in BusinessProfileDialog header"
```

---

### Task A5: Add soft delete action to +page.server.ts and update updateBusiness for admin

**Files:**
- Modify: `src/routes/+page.server.ts`

- [ ] **Step 1: Add import for getIsAdmin**

At the top of `src/routes/+page.server.ts`, add the import (if not already present):

```ts
import { getIsAdmin } from '$lib/server/admin';
```

- [ ] **Step 2: Update updateBusiness to allow admin edits**

Replace the existing `updateBusiness` action. The key change: remove the `.eq('email', user.email)` constraint for admins so they can edit any business.

```ts
updateBusiness: async ({ request, locals }) => {
  const { user } = await locals.safeGetSession();
  if (!user) return fail(401, { message: 'Not authenticated' });

  const form = await superValidate(request, zod4(businessSchema));
  if (!form.valid) return fail(400, { form });

  const isAdminUser = await getIsAdmin(locals.supabase, user.email);
  const { id, phones, subcategories, services, ...fields } = form.data;

  let query = locals.supabase
    .from('businesses')
    .update({
      ...fields,
      phones: phones.split(',').map((p: string) => p.trim()).filter(Boolean),
      subcategories: subcategories.split(',').map((s: string) => s.trim()).filter(Boolean),
      services: services.split(',').map((s: string) => s.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (!isAdminUser) {
    query = query.eq('email', user.email!);
  }

  const { error } = await query;
  if (error) return fail(500, { form, message: error.message });
  return { form };
},
```

- [ ] **Step 3: Add deleteBusiness action**

Add this action to the `actions` object in `+page.server.ts`:

```ts
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

  if (!isAdminUser) {
    query = query.eq('email', user.email!);
  }

  const { error } = await query;
  if (error) return fail(500, { message: error.message });
  return { success: true, deleted: true, id };
},
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
pnpm check
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/+page.server.ts
git commit -m "feat: add deleteBusiness action and allow admin to update any business"
```

---

### Task A6: Add gear icon + delete confirmation in EditBusinessDialog

Add a Settings gear icon in the dialog header that opens a dropdown with a "Delete" option. The Delete option opens an AlertDialog for confirmation before posting to `/?/deleteBusiness`.

**Files:**
- Modify: `src/lib/components/EditBusinessDialog.svelte`
- Modify: `src/lib/components/DirectoryTable.svelte`

- [ ] **Step 1: Update EditBusinessDialog**

Full replacement of `src/lib/components/EditBusinessDialog.svelte`:

```svelte
<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zod4 } from 'sveltekit-superforms/adapters';
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { businessSchema } from '$lib/schemas';
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
  } from '$lib/components/ui/dialog/index.js';
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from '$lib/components/ui/alert-dialog/index.js';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '$lib/components/ui/dropdown-menu/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';
  import Settings from '@lucide/svelte/icons/settings';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import type { Business } from '$lib/types';

  let {
    business,
    formData,
    open = $bindable(false),
    ondelete,
  }: {
    business: Business;
    formData: any;
    open: boolean;
    ondelete?: (id: string) => void;
  } = $props();

  let deleteConfirmOpen = $state(false);
  let deleting = $state(false);
  let deleteError = $state<string | null>(null);

  const { form, errors, enhance: formEnhance, submitting } = untrack(() => superForm(formData, {
    validators: zod4(businessSchema),
    onResult({ result }) {
      if (result.type === 'success') open = false;
    },
    resetForm: false,
  }));

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
</script>

<Dialog bind:open>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <div class="flex items-center gap-2 pr-6">
        <DialogTitle class="flex-1">Edit listing</DialogTitle>
        <DropdownMenu>
          <DropdownMenuTrigger>
            {#snippet child({ props })}
              <button
                {...props}
                class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="More options"
              >
                <Settings class="h-4 w-4" />
              </button>
            {/snippet}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              class="text-destructive focus:text-destructive"
              onclick={() => (deleteConfirmOpen = true)}
            >
              <Trash2 class="mr-2 h-4 w-4" />
              Delete listing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </DialogHeader>

    <form method="POST" action="/?/updateBusiness" use:formEnhance class="flex flex-col gap-4">
      <input type="hidden" name="id" bind:value={$form.id} />
      <input type="hidden" name="category" bind:value={$form.category} />

      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2 flex flex-col gap-1.5">
          <Label for="eb-name">Business name</Label>
          <Input id="eb-name" name="name" bind:value={$form.name} />
          {#if $errors.name}<p class="text-xs text-destructive">{$errors.name}</p>{/if}
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="eb-phones">Phone numbers</Label>
          <Input id="eb-phones" name="phones" bind:value={$form.phones} placeholder="218-555-0101, 218-555-0202" />
          <p class="text-xs text-muted-foreground">Comma-separated</p>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="eb-website">Website</Label>
          <Input id="eb-website" name="website" bind:value={$form.website} />
          {#if $errors.website}<p class="text-xs text-destructive">{$errors.website}</p>{/if}
        </div>

        <div class="col-span-2 flex flex-col gap-1.5">
          <Label for="eb-address">Address</Label>
          <Input id="eb-address" name="address" bind:value={$form.address} />
        </div>

        <div class="col-span-2 flex flex-col gap-1.5">
          <Label for="eb-description">Description</Label>
          <Textarea id="eb-description" name="description" rows={3} bind:value={$form.description} />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
        <Button type="submit" disabled={$submitting}>
          {$submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

<!-- Delete confirmation -->
<AlertDialog bind:open={deleteConfirmOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
      <AlertDialogDescription>
        This will remove <strong>{business.name}</strong> from the public directory. The record is kept for admin review and can be restored later.
      </AlertDialogDescription>
    </AlertDialogHeader>
    {#if deleteError}
      <p class="text-xs text-destructive">{deleteError}</p>
    {/if}
    <AlertDialogFooter>
      <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
      <form
        method="POST"
        action="/?/deleteBusiness"
        use:enhance={() => {
          deleting = true;
          deleteError = null;
          return async ({ result }) => {
            deleting = false;
            if (result.type === 'success' && (result.data as any)?.deleted) {
              deleteConfirmOpen = false;
              open = false;
              ondelete?.(business.id!);
              await invalidateAll();
            } else if (result.type === 'failure') {
              deleteError = (result.data as any)?.message ?? 'Something went wrong.';
            }
          };
        }}
      >
        <input type="hidden" name="id" value={business.id} />
        <AlertDialogAction type="submit" class="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleting}>
          {deleting ? 'Deleting…' : 'Yes, delete it'}
        </AlertDialogAction>
      </form>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 2: Update DirectoryTable to handle delete and pass ondelete**

In `src/lib/components/DirectoryTable.svelte`, add `deletedIds` state and a handler, then pass to EditBusinessDialog:

Add to the script block:
```ts
let deletedIds = $state(new Set<string>());

function handleDelete(id: string) {
  deletedIds.add(id);
  dialogOpen = false;
}
```

Change the `filtered` derived to exclude deleted businesses:

```ts
const activeBusinesses = $derived(businesses.filter((b) => !deletedIds.has(b.id ?? '')));

const filtered = $derived(
  activeBusinesses
    .map((b, i) => ({ ...b, id: b.id ?? `${b.name}-${i}` }))
    .filter((b) => {
      // ... same filter logic as before (search + categories)
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

Update the `categories` derived (it was based on `businesses`, update to `activeBusinesses`):
```ts
const categories = $derived([...new Set(activeBusinesses.map((b) => b.category))].sort());
```

Update the EditBusinessDialog usage in the template:
```svelte
{#if editingBusiness}
  <EditBusinessDialog business={editingBusiness} {formData} bind:open={dialogOpen} ondelete={handleDelete} />
{/if}
```

- [ ] **Step 3: Add $effect to auto-close profile dialogs in CardView when business is deleted**

In `src/lib/components/DirectoryCardView.svelte`, add after the existing state declarations:

```svelte
$effect(() => {
  if (selectedBusiness && !filtered.some((b) => b.id === selectedBusiness!.id)) {
    profileOpen = false;
    selectedBusiness = null;
  }
});
```

Do the same in `src/lib/components/DirectoryTableView.svelte`:

```svelte
$effect(() => {
  if (selectedBusiness && !filtered.some((b) => b.id === selectedBusiness!.id)) {
    profileOpen = false;
    selectedBusiness = null;
  }
});
```

- [ ] **Step 4: Run autofixer on both modified components**

Use the `mcp__svelte__svelte-autofixer` tool on `EditBusinessDialog.svelte`, `DirectoryCardView.svelte`, and `DirectoryTableView.svelte`. Fix any issues reported before committing.

- [ ] **Step 5: Verify no TypeScript errors**

```bash
pnpm check
```

- [ ] **Step 6: Manual test**

Start dev server (`pnpm dev`), log in, open a business you own, click the pencil icon to open EditBusinessDialog, click the gear icon, click "Delete listing", confirm. The business should disappear from the directory. Refresh to confirm it's gone server-side too.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/EditBusinessDialog.svelte src/lib/components/DirectoryTable.svelte src/lib/components/DirectoryCardView.svelte src/lib/components/DirectoryTableView.svelte
git commit -m "feat: add gear icon with delete confirmation in EditBusinessDialog"
```

---

## Feature B: Suggest Edit (Feature 3)

### Task B1: DB migration — create suggested_edits table

**Files:**
- SQL migration (run in Supabase SQL editor)

- [ ] **Step 1: Create the table and RLS policies**

```sql
CREATE TABLE suggested_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id),
  suggested_by text NOT NULL,
  status text NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  name text NOT NULL,
  email text,
  phones text[] NOT NULL DEFAULT '{}',
  address text,
  website text,
  description text,
  category text NOT NULL,
  subcategories text[] NOT NULL DEFAULT '{}',
  services text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

ALTER TABLE suggested_edits ENABLE ROW LEVEL SECURITY;

-- Authenticated users can submit suggestions
CREATE POLICY "authenticated can insert suggested_edits" ON suggested_edits
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND suggested_by = auth.jwt()->>'email'
  );

-- Users can read their own suggestions
CREATE POLICY "suggester can read own" ON suggested_edits
  FOR SELECT USING (suggested_by = auth.jwt()->>'email');

-- Admins can read all
CREATE POLICY "admins can read all suggested_edits" ON suggested_edits
  FOR SELECT USING (is_admin());

-- Admins can update status (approve/reject)
CREATE POLICY "admins can update suggested_edits" ON suggested_edits
  FOR UPDATE USING (is_admin());
```

- [ ] **Step 2: Verify**

```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'suggested_edits';
-- Should return one row
```

---

### Task B2: Add suggestEdit action to +page.server.ts

**Files:**
- Modify: `src/routes/+page.server.ts`

- [ ] **Step 1: Add suggestEdit action**

Add this to the `actions` object:

```ts
suggestEdit: async ({ request, locals }) => {
  const { user } = await locals.safeGetSession();
  if (!user) return fail(401, { message: 'Not authenticated' });

  const formData = await request.formData();
  const business_id = formData.get('business_id') as string;

  if (!business_id) return fail(400, { message: 'Missing business_id' });

  const phones = (formData.get('phones') as string ?? '')
    .split(',').map((p) => p.trim()).filter(Boolean);
  const subcategories = (formData.get('subcategories') as string ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const services = (formData.get('services') as string ?? '')
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
    category: formData.get('category') as string,
    subcategories,
    services,
  });

  if (dbError) return fail(500, { message: dbError.message });
  return { success: true };
},
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/+page.server.ts
git commit -m "feat: add suggestEdit server action"
```

---

### Task B3: Create SuggestEditDialog component

This is similar to EditBusinessDialog but posts to `/?/suggestEdit` instead of `/?/updateBusiness`, and uses plain `use:enhance` (not superforms) since it's a standalone form.

**Files:**
- Create: `src/lib/components/SuggestEditDialog.svelte`

- [ ] **Step 1: Create the component**

```svelte
<!-- src/lib/components/SuggestEditDialog.svelte -->
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
  import { Textarea } from '$lib/components/ui/textarea/index.js';
  import type { Business } from '$lib/types';

  let {
    business,
    open = $bindable(false),
  }: {
    business: Business;
    open: boolean;
  } = $props();

  let submitting = $state(false);
  let submitted = $state(false);
  let errorMsg = $state<string | null>(null);

  // Local editable copies, re-synced when dialog opens
  let name = $state('');
  let email = $state('');
  let phones = $state('');
  let address = $state('');
  let website = $state('');
  let description = $state('');
  let subcategories = $state('');
  let services = $state('');

  $effect(() => {
    if (open) {
      submitted = false;
      errorMsg = null;
      name = business.name;
      email = business.email ?? '';
      phones = business.phones.join(', ');
      address = business.address ?? '';
      website = business.website ?? '';
      description = business.description ?? '';
      subcategories = business.subcategories.join(', ');
      services = business.services.join(', ');
    }
  });
</script>

<Dialog bind:open>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Suggest an edit</DialogTitle>
    </DialogHeader>

    {#if submitted}
      <div class="py-6 text-center">
        <p class="text-sm font-medium">Thank you!</p>
        <p class="mt-1 text-sm text-muted-foreground">Your suggestion has been submitted for admin review.</p>
        <Button class="mt-4" onclick={() => (open = false)}>Close</Button>
      </div>
    {:else}
      <form
        method="POST"
        action="/?/suggestEdit"
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
        class="flex flex-col gap-4"
      >
        <input type="hidden" name="business_id" value={business.id} />
        <input type="hidden" name="category" bind:value={business.category} />

        <p class="text-xs text-muted-foreground">
          Edit the fields you'd like to suggest changes for. An admin will review your submission.
        </p>

        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2 flex flex-col gap-1.5">
            <Label for="se-name">Business name</Label>
            <Input id="se-name" name="name" bind:value={name} required />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="se-phones">Phone numbers</Label>
            <Input id="se-phones" name="phones" bind:value={phones} placeholder="218-555-0101, 218-555-0202" />
            <p class="text-xs text-muted-foreground">Comma-separated</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="se-website">Website</Label>
            <Input id="se-website" name="website" bind:value={website} />
          </div>

          <div class="col-span-2 flex flex-col gap-1.5">
            <Label for="se-email">Email</Label>
            <Input id="se-email" name="email" type="email" bind:value={email} />
          </div>

          <div class="col-span-2 flex flex-col gap-1.5">
            <Label for="se-address">Address</Label>
            <Input id="se-address" name="address" bind:value={address} />
          </div>

          <div class="col-span-2 flex flex-col gap-1.5">
            <Label for="se-description">Description</Label>
            <Textarea id="se-description" name="description" rows={3} bind:value={description} />
          </div>
        </div>

        {#if errorMsg}
          <p class="text-xs text-destructive">{errorMsg}</p>
        {/if}

        <DialogFooter>
          <Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit suggestion'}
          </Button>
        </DialogFooter>
      </form>
    {/if}
  </DialogContent>
</Dialog>
```

- [ ] **Step 2: Run autofixer**

Use `mcp__svelte__svelte-autofixer` on the new component. Fix any issues.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/SuggestEditDialog.svelte
git commit -m "feat: add SuggestEditDialog component"
```

---

### Task B4: Wire onsuggestedit through DirectoryCardView and DirectoryTableView

Users who are logged in but are neither the owner nor admin should see the "Suggest edit" button. This is determined by the calling code (not BusinessProfileDialog itself).

**Files:**
- Modify: `src/lib/components/DirectoryCardView.svelte`
- Modify: `src/lib/components/DirectoryTableView.svelte`

- [ ] **Step 1: Update DirectoryCardView**

Add import for SuggestEditDialog and new state:

```svelte
<script lang="ts">
  // ... existing imports ...
  import SuggestEditDialog from './SuggestEditDialog.svelte';

  // ... existing props (isAdmin is already added from Task A3) ...

  let suggestingBusiness = $state<Business | null>(null);
  let suggestOpen = $state(false);

  function openSuggest(b: Business) {
    suggestingBusiness = b;
    suggestOpen = true;
  }
  // ... existing code ...
</script>
```

Add the SuggestEditDialog below the BusinessProfileDialog:
```svelte
{#if suggestingBusiness}
  <SuggestEditDialog business={suggestingBusiness} bind:open={suggestOpen} />
{/if}
```

Update the BusinessProfileDialog call to pass `onsuggestedit`:

```svelte
{#if selectedBusiness}
  {@const isOwnerOfSelected = user?.email && selectedBusiness.email && user.email === selectedBusiness.email}
  <BusinessProfileDialog
    business={selectedBusiness}
    bind:open={profileOpen}
    onedit={(isAdmin || isOwnerOfSelected) ? onedit : undefined}
    onsuggestedit={(user && !isAdmin && !isOwnerOfSelected) ? openSuggest : undefined}
  />
{/if}
```

- [ ] **Step 2: Update DirectoryTableView**

Same changes as CardView — add SuggestEditDialog import, state, and wire into BusinessProfileDialog:

```svelte
<script lang="ts">
  // ... existing imports ...
  import SuggestEditDialog from './SuggestEditDialog.svelte';

  let suggestingBusiness = $state<Business | null>(null);
  let suggestOpen = $state(false);

  function openSuggest(b: Business) {
    suggestingBusiness = b;
    suggestOpen = true;
  }
</script>

<!-- Below the BusinessProfileDialog block: -->
{#if suggestingBusiness}
  <SuggestEditDialog business={suggestingBusiness} bind:open={suggestOpen} />
{/if}
```

Update the BusinessProfileDialog call (around line 91–97):

```svelte
{#if selectedBusiness}
  {@const isOwnerOfSelected = user?.email && selectedBusiness.email && user.email === selectedBusiness.email}
  <BusinessProfileDialog
    business={selectedBusiness}
    bind:open={profileOpen}
    onedit={(isAdmin || isOwnerOfSelected) ? onedit : undefined}
    onsuggestedit={(user && !isAdmin && !isOwnerOfSelected) ? openSuggest : undefined}
  />
{/if}
```

- [ ] **Step 3: Run autofixer on both components, fix any issues**

- [ ] **Step 4: Verify**

```bash
pnpm check
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/DirectoryCardView.svelte src/lib/components/DirectoryTableView.svelte
git commit -m "feat: wire suggest-edit flow through card and table views"
```

---

### Task B5: Create /suggested-edits admin review page

Admins see a list of pending suggestions with a field-by-field diff against the current business, and can approve or reject each.

**Files:**
- Create: `src/routes/suggested-edits/+page.server.ts`
- Create: `src/routes/suggested-edits/+page.svelte`

- [ ] **Step 1: Create server file**

```ts
// src/routes/suggested-edits/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getIsAdmin } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (!(await getIsAdmin(locals.supabase, user?.email))) throw error(403, 'Forbidden');

  const { data: suggestions, error: dbError } = await locals.supabase
    .from('suggested_edits')
    .select('*, businesses(*)')
    .eq('status', 'pending')
    .order('created_at');

  if (dbError) throw new Error(dbError.message);
  return { suggestions: suggestions ?? [] };
};

export const actions: Actions = {
  approveEdit: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!(await getIsAdmin(locals.supabase, user?.email))) return fail(403, { message: 'Forbidden' });

    const formData = await request.formData();
    const id = formData.get('id') as string;
    if (!id) return fail(400, { message: 'Missing id' });

    // Load the suggestion
    const { data: suggestion, error: loadError } = await locals.supabase
      .from('suggested_edits')
      .select('*')
      .eq('id', id)
      .single();
    if (loadError || !suggestion) return fail(404, { message: 'Suggestion not found' });

    // Apply to the business
    const { error: updateError } = await locals.supabase
      .from('businesses')
      .update({
        name: suggestion.name,
        email: suggestion.email,
        phones: suggestion.phones,
        address: suggestion.address,
        website: suggestion.website,
        description: suggestion.description,
        category: suggestion.category,
        subcategories: suggestion.subcategories,
        services: suggestion.services,
        updated_at: new Date().toISOString(),
      })
      .eq('id', suggestion.business_id);
    if (updateError) return fail(500, { message: updateError.message });

    // Mark suggestion approved
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

- [ ] **Step 2: Create page component**

```svelte
<!-- src/routes/suggested-edits/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';

  let { data } = $props();

  let removedIds = $state(new Set<string>());
  const suggestions = $derived(data.suggestions.filter((s) => !removedIds.has(s.id)));

  type Suggestion = (typeof data.suggestions)[number];
  type Business = NonNullable<Suggestion['businesses']>;

  const DIFF_FIELDS: { key: keyof Suggestion; label: string; array?: boolean }[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phones', label: 'Phones', array: true },
    { key: 'website', label: 'Website' },
    { key: 'address', label: 'Address' },
    { key: 'category', label: 'Category' },
    { key: 'subcategories', label: 'Subcategories', array: true },
    { key: 'services', label: 'Services', array: true },
    { key: 'description', label: 'Description' },
  ];

  function display(val: unknown, array?: boolean): string {
    if (val === null || val === undefined || val === '') return '—';
    if (array && Array.isArray(val)) return val.length === 0 ? '—' : val.join(', ');
    return String(val);
  }

  function hasChanged(s: Suggestion, b: Business, key: keyof Suggestion): boolean {
    const sv = display(s[key], true);
    const bv = display((b as any)[key], true);
    return sv !== bv;
  }

  let submitting = $state<string | null>(null);
  let errors = $state<Record<string, string>>({});
</script>

<svelte:head>
  <title>Suggested Edits — Arrowhead Directory</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
  <div class="mb-6">
    <h1 class="text-2xl font-bold">Suggested Edits</h1>
    <p class="mt-1 text-sm text-muted-foreground">
      {suggestions.length} pending suggestion{suggestions.length === 1 ? '' : 's'}
    </p>
  </div>

  {#if suggestions.length === 0}
    <p class="py-16 text-center text-sm text-muted-foreground">No pending suggestions.</p>
  {:else}
    <div class="flex flex-col gap-6">
      {#each suggestions as suggestion (suggestion.id)}
        {@const business = suggestion.businesses as Business}
        <div class="rounded-lg border bg-card">
          <div class="flex items-start justify-between gap-4 border-b px-4 py-3">
            <div>
              <p class="text-sm font-semibold">{suggestion.name}</p>
              <p class="text-xs text-muted-foreground">
                Suggested by {suggestion.suggested_by} · {new Date(suggestion.created_at).toLocaleDateString()}
              </p>
            </div>
            <div class="flex gap-2">
              <form
                method="POST"
                action="/suggested-edits?/rejectEdit"
                use:enhance={() => {
                  submitting = suggestion.id;
                  return async ({ result }) => {
                    submitting = null;
                    if (result.type === 'success') {
                      removedIds.add(suggestion.id);
                    } else if (result.type === 'failure') {
                      errors[suggestion.id] = (result.data as any)?.message ?? 'Error';
                    }
                  };
                }}
              >
                <input type="hidden" name="id" value={suggestion.id} />
                <button
                  type="submit"
                  class="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                  disabled={submitting === suggestion.id}
                >Reject</button>
              </form>
              <form
                method="POST"
                action="/suggested-edits?/approveEdit"
                use:enhance={() => {
                  submitting = suggestion.id;
                  return async ({ result }) => {
                    submitting = null;
                    if (result.type === 'success') {
                      removedIds.add(suggestion.id);
                    } else if (result.type === 'failure') {
                      errors[suggestion.id] = (result.data as any)?.message ?? 'Error';
                    }
                  };
                }}
              >
                <input type="hidden" name="id" value={suggestion.id} />
                <button
                  type="submit"
                  class="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
                  disabled={submitting === suggestion.id}
                >Approve</button>
              </form>
            </div>
          </div>

          {#if errors[suggestion.id]}
            <p class="px-4 py-2 text-xs text-destructive">{errors[suggestion.id]}</p>
          {/if}

          <!-- Diff table -->
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b bg-muted/40">
                  <th class="px-4 py-2 text-left font-medium text-muted-foreground w-24">Field</th>
                  <th class="px-4 py-2 text-left font-medium text-muted-foreground">Current</th>
                  <th class="px-4 py-2 text-left font-medium text-muted-foreground">Suggested</th>
                </tr>
              </thead>
              <tbody>
                {#each DIFF_FIELDS as field (field.key)}
                  {@const changed = business && hasChanged(suggestion, business, field.key)}
                  <tr class="border-b last:border-0 {changed ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}">
                    <td class="px-4 py-2 font-medium text-muted-foreground">{field.label}</td>
                    <td class="px-4 py-2 text-muted-foreground">
                      {business ? display((business as any)[field.key], field.array) : '—'}
                    </td>
                    <td class="px-4 py-2 {changed ? 'font-medium text-foreground' : 'text-muted-foreground'}">
                      {display(suggestion[field.key as keyof typeof suggestion], field.array)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
```

- [ ] **Step 3: Run autofixer on the page component, fix any issues**

- [ ] **Step 4: Commit**

```bash
git add src/routes/suggested-edits/
git commit -m "feat: add /suggested-edits admin review page for suggested edits"
```

---

### Task B6: Add Suggested Edits nav link

**Files:**
- Modify: `src/lib/components/HamburgerSheet.svelte`

- [ ] **Step 1: Add link in the admin section**

In the `{#if isAdmin}` block, after the "Admin Management" link:

```svelte
<a
  href="/suggested-edits"
  onclick={() => (open = false)}
  class="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
>
  Suggested Edits
</a>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/HamburgerSheet.svelte
git commit -m "feat: add Suggested Edits nav link for admins"
```

---

## Feature C: Feature Requests (Feature 4)

### Task C1: DB migration — create feature_requests and feature_request_votes tables

**Files:**
- SQL migration (run in Supabase SQL editor)

- [ ] **Step 1: Create tables and RLS policies**

```sql
CREATE TABLE feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  creator_email text NOT NULL,
  status text NOT NULL DEFAULT 'open',  -- open | planned | completed | rejected
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can read feature_requests" ON feature_requests
  FOR SELECT USING (true);

CREATE POLICY "authenticated can insert feature_requests" ON feature_requests
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND creator_email = auth.jwt()->>'email'
  );

CREATE POLICY "admins can update feature_requests" ON feature_requests
  FOR UPDATE USING (is_admin());

CREATE TABLE feature_request_votes (
  request_id uuid NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, user_email)
);

ALTER TABLE feature_request_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can read votes" ON feature_request_votes
  FOR SELECT USING (true);

CREATE POLICY "authenticated can insert vote" ON feature_request_votes
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND user_email = auth.jwt()->>'email'
  );

CREATE POLICY "user can delete own vote" ON feature_request_votes
  FOR DELETE USING (user_email = auth.jwt()->>'email');
```

- [ ] **Step 2: Verify**

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('feature_requests', 'feature_request_votes');
-- Should return two rows
```

---

### Task C2: Create /features server route

**Files:**
- Create: `src/routes/features/+page.server.ts`

- [ ] **Step 1: Create the file**

```ts
// src/routes/features/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getIsAdmin } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();

  const { data: requests, error } = await locals.supabase
    .from('feature_requests')
    .select('*, feature_request_votes(user_email)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const isAdmin = await getIsAdmin(locals.supabase, user?.email);

  return {
    requests: (requests ?? []).map((r) => ({
      ...r,
      voteCount: r.feature_request_votes.length,
      userVoted: user ? r.feature_request_votes.some((v) => v.user_email === user.email) : false,
    })),
    user: user ? { email: user.email ?? null } : null,
    isAdmin,
  };
};

export const actions: Actions = {
  submitRequest: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'You must be logged in to submit a request.' });

    const formData = await request.formData();
    const title = (formData.get('title') as string)?.trim();
    const description = (formData.get('description') as string)?.trim() || null;

    if (!title) return fail(400, { message: 'Title is required.' });

    const { data, error: dbError } = await locals.supabase
      .from('feature_requests')
      .insert({ title, description, creator_email: user.email! })
      .select('*, feature_request_votes(user_email)')
      .single();

    if (dbError) return fail(500, { message: dbError.message });
    return { success: true, request: { ...data, voteCount: 0, userVoted: false } };
  },

  vote: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'You must be logged in to vote.' });

    const formData = await request.formData();
    const request_id = formData.get('request_id') as string;
    if (!request_id) return fail(400, { message: 'Missing request_id' });

    const { error: dbError } = await locals.supabase
      .from('feature_request_votes')
      .insert({ request_id, user_email: user.email! });

    if (dbError) return fail(500, { message: dbError.message });
    return { success: true, request_id };
  },

  unvote: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'You must be logged in to unvote.' });

    const formData = await request.formData();
    const request_id = formData.get('request_id') as string;
    if (!request_id) return fail(400, { message: 'Missing request_id' });

    const { error: dbError } = await locals.supabase
      .from('feature_request_votes')
      .delete()
      .eq('request_id', request_id)
      .eq('user_email', user.email!);

    if (dbError) return fail(500, { message: dbError.message });
    return { success: true, request_id };
  },

  updateStatus: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!(await getIsAdmin(locals.supabase, user?.email))) return fail(403, { message: 'Forbidden' });

    const formData = await request.formData();
    const id = formData.get('id') as string;
    const status = formData.get('status') as string;

    const VALID = ['open', 'planned', 'completed', 'rejected'];
    if (!VALID.includes(status)) return fail(400, { message: 'Invalid status' });

    const { error: dbError } = await locals.supabase
      .from('feature_requests')
      .update({ status })
      .eq('id', id);

    if (dbError) return fail(500, { message: dbError.message });
    return { success: true, id, status };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/features/+page.server.ts
git commit -m "feat: add /features server load and actions"
```

---

### Task C3: Create /features page component

**Files:**
- Create: `src/routes/features/+page.svelte`

- [ ] **Step 1: Create the file**

```svelte
<!-- src/routes/features/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '$lib/components/ui/select/index.js';
  import ChevronUp from '@lucide/svelte/icons/chevron-up';

  let { data } = $props();

  type Request = (typeof data.requests)[number];

  // Track optimistic vote changes
  let votedIds = $state(new Set<string>());
  let unvotedIds = $state(new Set<string>());
  let newRequests = $state<Request[]>([]);

  const allRequests = $derived(
    [...newRequests, ...data.requests]
      .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i)
      .map((r) => ({
        ...r,
        voteCount:
          r.voteCount
          + (votedIds.has(r.id) ? 1 : 0)
          - (unvotedIds.has(r.id) ? 1 : 0),
        userVoted: votedIds.has(r.id)
          ? true
          : unvotedIds.has(r.id)
          ? false
          : r.userVoted,
      }))
      .sort((a, b) => b.voteCount - a.voteCount || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  );

  const STATUS_LABELS: Record<string, string> = {
    open: 'Open',
    planned: 'Planned',
    completed: 'Completed',
    rejected: 'Rejected',
  };

  const STATUS_COLORS: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    planned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  let showForm = $state(false);
  let titleInput = $state('');
  let descInput = $state('');
  let submitError = $state<string | null>(null);
  let submitting = $state(false);

  let votingId = $state<string | null>(null);
  let statusUpdating = $state<string | null>(null);
</script>

<svelte:head>
  <title>Feature Requests — Arrowhead Directory</title>
</svelte:head>

<div class="mx-auto max-w-2xl">
  <div class="mb-6 flex items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold">Feature Requests</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Vote for features you'd like to see, or submit your own idea.
      </p>
    </div>
    {#if data.user}
      <Button onclick={() => (showForm = !showForm)} variant={showForm ? 'outline' : 'default'}>
        {showForm ? 'Cancel' : 'Request a feature'}
      </Button>
    {/if}
  </div>

  <!-- Submit form -->
  {#if showForm}
    <div class="mb-6 rounded-lg border bg-card p-5">
      <h2 class="mb-4 text-sm font-semibold">New feature request</h2>
      <form
        method="POST"
        action="/features?/submitRequest"
        use:enhance={() => {
          submitting = true;
          submitError = null;
          return async ({ result }) => {
            submitting = false;
            if (result.type === 'success' && (result.data as any)?.request) {
              newRequests = [(result.data as any).request, ...newRequests];
              titleInput = '';
              descInput = '';
              showForm = false;
            } else if (result.type === 'failure') {
              submitError = (result.data as any)?.message ?? 'Something went wrong.';
            }
          };
        }}
        class="flex flex-col gap-4"
      >
        <div class="flex flex-col gap-1.5">
          <Label for="fr-title">Title <span class="text-destructive">*</span></Label>
          <Input id="fr-title" name="title" bind:value={titleInput} placeholder="Short description of the feature" required />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="fr-desc">Description</Label>
          <Textarea id="fr-desc" name="description" rows={3} bind:value={descInput} placeholder="More details about why this would be useful…" />
        </div>
        {#if submitError}
          <p class="text-xs text-destructive">{submitError}</p>
        {/if}
        <div class="flex justify-end">
          <Button type="submit" disabled={submitting || !titleInput}>
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        </div>
      </form>
    </div>
  {/if}

  <!-- Requests list -->
  {#if allRequests.length === 0}
    <p class="py-16 text-center text-sm text-muted-foreground">No feature requests yet. Be the first!</p>
  {:else}
    <div class="flex flex-col gap-3">
      {#each allRequests as req (req.id)}
        <div class="flex gap-4 rounded-lg border bg-card p-4">
          <!-- Vote button -->
          <div class="flex flex-col items-center gap-1">
            <form
              method="POST"
              action="/features?/{req.userVoted ? 'unvote' : 'vote'}"
              use:enhance={() => {
                votingId = req.id;
                return async ({ result }) => {
                  votingId = null;
                  if (result.type === 'success') {
                    if (req.userVoted) {
                      unvotedIds.add(req.id);
                      votedIds.delete(req.id);
                    } else {
                      votedIds.add(req.id);
                      unvotedIds.delete(req.id);
                    }
                  }
                };
              }}
            >
              <input type="hidden" name="request_id" value={req.id} />
              <button
                type="submit"
                disabled={!data.user || votingId === req.id}
                class="flex flex-col items-center gap-0.5 rounded-md border px-2 py-1.5 transition-colors
                  {req.userVoted
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}
                  disabled:opacity-40"
                title={data.user ? (req.userVoted ? 'Remove vote' : 'Upvote') : 'Log in to vote'}
              >
                <ChevronUp class="h-4 w-4" />
                <span class="text-xs font-medium">{req.voteCount}</span>
              </button>
            </form>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-start gap-2">
              <p class="text-sm font-semibold leading-snug">{req.title}</p>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-medium {STATUS_COLORS[req.status]}">
                {STATUS_LABELS[req.status]}
              </span>
            </div>
            {#if req.description}
              <p class="mt-1 text-xs leading-relaxed text-muted-foreground">{req.description}</p>
            {/if}
            <p class="mt-2 text-[10px] text-muted-foreground">
              Submitted by {req.creator_email} · {new Date(req.created_at).toLocaleDateString()}
            </p>

            <!-- Admin status controls -->
            {#if data.isAdmin}
              <form
                method="POST"
                action="/features?/updateStatus"
                class="mt-2"
                use:enhance={() => {
                  statusUpdating = req.id;
                  return async ({ result }) => {
                    statusUpdating = null;
                    if (result.type === 'failure') {
                      // silent fail — page data will be stale but still valid
                    }
                  };
                }}
              >
                <input type="hidden" name="id" value={req.id} />
                <Select
                  type="single"
                  value={req.status}
                  onValueChange={(v) => {
                    if (v) {
                      const form = document.querySelector(`form[data-req="${req.id}"]`) as HTMLFormElement;
                      // Handled via the form submit below
                    }
                  }}
                  name="status"
                >
                  <SelectTrigger class="h-7 w-36 text-xs">
                    {STATUS_LABELS[req.status]}
                  </SelectTrigger>
                  <SelectContent>
                    {#each Object.entries(STATUS_LABELS) as [val, label] (val)}
                      <SelectItem value={val}>{label}</SelectItem>
                    {/each}
                  </SelectContent>
                </Select>
                <Button type="submit" size="sm" variant="ghost" class="mt-1 h-6 text-xs" disabled={statusUpdating === req.id}>
                  {statusUpdating === req.id ? 'Saving…' : 'Update status'}
                </Button>
              </form>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
```

Note: The Select + hidden form submit for admin status updates uses a two-element approach (Select + explicit submit button). The Select's `name="status"` attribute captures the value directly in the form data.

- [ ] **Step 2: Run autofixer on this component, fix any issues reported**

The autofixer may flag patterns in the enhance callback. Fix any Svelte 5 rune issues before committing.

- [ ] **Step 3: Verify no TypeScript errors**

```bash
pnpm check
```

- [ ] **Step 4: Manual test**

Start dev server. Visit `/features`. Submit a request, upvote it, toggle the vote. Log out and confirm votes/list are still visible. Log in as admin and verify status dropdown appears.

- [ ] **Step 5: Commit**

```bash
git add src/routes/features/
git commit -m "feat: add /features page with voting and admin status management"
```

---

### Task C4: Add "Request a Feature" nav link

**Files:**
- Modify: `src/lib/components/HamburgerSheet.svelte`

- [ ] **Step 1: Add link in the public section (below FAQ)**

```svelte
<a
  href="/features"
  onclick={() => (open = false)}
  class="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
>
  Feature Requests
</a>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/HamburgerSheet.svelte
git commit -m "feat: add Feature Requests nav link"
```

---

## Feature D: PDF Export (Feature 5)

### Task D1: Install jspdf

**Files:**
- `package.json` (modified by pnpm)

- [ ] **Step 1: Install**

```bash
pnpm add jspdf
```

Expected: jspdf added to dependencies in package.json.

- [ ] **Step 2: Verify import works**

```bash
pnpm check
```

---

### Task D2: Create PDF generation utility

**Files:**
- Create: `src/lib/utils/pdf.ts`

- [ ] **Step 1: Create the file**

```ts
// src/lib/utils/pdf.ts
import type { Business } from '$lib/types';

export async function downloadDirectoryPdf(businesses: Business[], title = 'Arrowhead Business Directory') {
  // Dynamic import keeps jspdf out of the SSR bundle
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  const PAGE_H = doc.internal.pageSize.getHeight();
  const PAGE_W = doc.internal.pageSize.getWidth();
  const MARGIN = 14;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = MARGIN;

  function checkBreak(needed: number) {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleDateString()}  ·  ${businesses.length} listings`, MARGIN, y);
  doc.setTextColor(0);
  y += 12;

  // Group by category
  const grouped = new Map<string, Business[]>();
  for (const b of businesses) {
    if (!grouped.has(b.category)) grouped.set(b.category, []);
    grouped.get(b.category)!.push(b);
  }

  for (const [category, items] of grouped) {
    checkBreak(16);

    // Category header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(category.toUpperCase(), MARGIN, y);
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
    y += 6;

    for (const b of items) {
      checkBreak(22);

      // Business name
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(b.name, MARGIN + 4, y);
      y += 5;

      // Contact details
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80);

      const lines: string[] = [];
      if (b.phones.length > 0) lines.push(b.phones[0]);
      if (b.email) lines.push(b.email);
      if (b.website) {
        try {
          lines.push(new URL(b.website).hostname.replace(/^www\./, ''));
        } catch {
          lines.push(b.website);
        }
      }
      if (b.address) lines.push(b.address);

      for (const line of lines) {
        checkBreak(5);
        doc.text(line, MARGIN + 8, y);
        y += 4;
      }

      doc.setTextColor(0);
      y += 3;
    }

    y += 5;
  }

  doc.save('arrowhead-directory.pdf');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils/pdf.ts
git commit -m "feat: add PDF generation utility using jsPDF"
```

---

### Task D3: Add three-dot menu to DirectoryTable toolbar

**Files:**
- Modify: `src/lib/components/DirectoryTable.svelte`

- [ ] **Step 1: Add imports**

Add to the script block in `src/lib/components/DirectoryTable.svelte`:

```ts
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '$lib/components/ui/dropdown-menu/index.js';
import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
import FileDown from '@lucide/svelte/icons/file-down';
import { downloadDirectoryPdf } from '$lib/utils/pdf';
```

- [ ] **Step 2: Add menu to toolbar**

In the toolbar `<div class="flex items-center gap-2">`, add the three-dot menu after the FilterPopover and before the view switcher:

```svelte
<!-- Three-dot menu -->
<DropdownMenu>
  <DropdownMenuTrigger>
    {#snippet child({ props })}
      <Tooltip>
        <TooltipTrigger>
          {#snippet child({ props: tipProps })}
            <Button {...props} {...tipProps} variant="outline" size="icon" aria-label="More options">
              <MoreHorizontal class="h-4 w-4" />
            </Button>
          {/snippet}
        </TooltipTrigger>
        <TooltipContent>More options</TooltipContent>
      </Tooltip>
    {/snippet}
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onclick={() => downloadDirectoryPdf(filtered)}>
      <FileDown class="mr-2 h-4 w-4" />
      Download as PDF
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

<!-- View switcher (existing) -->
<div class="ml-auto flex items-center rounded-md border bg-muted p-0.5">
  ...
</div>
```

Note: Remove `ml-auto` from the view switcher div if the three-dot menu is placed before it, so spacing is correct. The three-dot menu should get `ml-auto` instead, pushing both it and the view switcher to the right:

```svelte
<!-- Three-dot menu gets ml-auto to push right -->
<DropdownMenu>
  <DropdownMenuTrigger>
    {#snippet child({ props })}
      <Button {...props} variant="outline" size="icon" class="ml-auto" aria-label="More options">
        <MoreHorizontal class="h-4 w-4" />
      </Button>
    {/snippet}
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onclick={() => downloadDirectoryPdf(filtered)}>
      <FileDown class="mr-2 h-4 w-4" />
      Download as PDF
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

<!-- View switcher (no ml-auto needed anymore) -->
<div class="flex items-center rounded-md border bg-muted p-0.5">
  ...
</div>
```

- [ ] **Step 3: Run autofixer on DirectoryTable.svelte, fix any issues**

- [ ] **Step 4: Verify no TypeScript errors**

```bash
pnpm check
```

- [ ] **Step 5: Manual test**

Click the three-dot menu. Click "Download as PDF". A file named `arrowhead-directory.pdf` should download. Open it and verify it contains the current filtered listing organized by category.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/DirectoryTable.svelte src/lib/utils/pdf.ts
git commit -m "feat: add PDF export via three-dot menu in directory toolbar"
```

---

## Final verification

- [ ] Run full type check: `pnpm check`
- [ ] Test as anonymous user: directory loads, no edit/suggest buttons visible
- [ ] Test as authenticated non-owner: "Suggest an edit" button visible in profile dialogs
- [ ] Test as business owner: pencil icon visible, gear+delete in edit dialog works
- [ ] Test as admin: pencil icon on all businesses, admin nav links visible, suggested edits page, feature requests status controls visible
- [ ] Verify PDF downloads correctly with filtered results
- [ ] Verify soft-deleted businesses do not appear in the public directory
