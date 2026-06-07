# TODO Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear the 8 items in `todo.md`: structured phone columns with a type dropdown, edit-dialog layout fixes, consistent approve/reject loading + reload UX across three admin pages, single-category selection, a services filter, and matching email obfuscation.

**Architecture:** Six independent change groups (A–F). Groups A–D are isolated UI/UX tweaks. Group E is a schema + app-wide refactor that replaces `businesses.phones text[]` with `phone_1/phone_1_type/phone_2/phone_2_type` (new `phone_type` enum), exposing a structured `Phone[]` to the app. Group F is a small edit-dialog layout change that builds on Group E.

**Tech Stack:** SvelteKit, Svelte 5 runes, Supabase (Postgres) via JS client, shadcn-svelte, Tailwind CSS v4, pnpm. No automated test runner — verification is `pnpm check`, the Svelte MCP autofixer for components, SQL checks via the Supabase MCP, and manual dev-server browser checks.

**Design decisions (confirmed with user):**
- Phones: **2 fixed slots**; enum **`mobile, home, work, fax`**; type dropdown flexed beside each number input.
- List refresh pattern (items 3/7/8): **inline "Working…" disabled button + `invalidateAll()`** server refetch.
- Filters button: **services only** (replaces category checkboxes).

---

## File Map

| Action | Path | Group | Responsibility |
|--------|------|-------|----------------|
| Modify | `src/lib/components/DirectoryTableView.svelte` | A, E | Email obfuscation + phone `.number` |
| Modify | `src/lib/components/FilterPopover.svelte` | B | Filter by service instead of category |
| Modify | `src/lib/components/DirectoryTable.svelte` | B | Derive services list, service filter |
| Modify | `src/lib/components/EditBusinessDialog.svelte` | C, E, F | Single category; phone inputs + type selects; layout |
| Modify | `src/routes/suggested-edits/+page.svelte` | D, E | Loading + invalidateAll; phones diff display |
| Modify | `src/routes/pending/+page.svelte` | D, E | Loading + invalidateAll; phone `.number` |
| Modify | `src/routes/features/+page.svelte` | D | invalidateAll after status update |
| Create | `supabase/migrations/structured_phones.sql` | E | DDL: enum + columns + backfill |
| Create | `src/lib/utils/phones.ts` | E | `buildPhones()` mapper + `PHONE_TYPES` |
| Modify | `src/lib/types.ts` | E | `Phone`, `PhoneType`; `Business.phones: Phone[]` |
| Modify | `src/lib/schemas.ts` | E | Replace `phones` with 4 phone fields |
| Modify | `src/routes/+page.server.ts` | E | Map columns→`Phone[]`; write columns |
| Modify | `src/routes/pending/+page.server.ts` | E | Map columns→`Phone[]` |
| Modify | `src/routes/suggested-edits/+page.server.ts` | E | Map nested business phones; approveEdit writes columns |
| Modify | `src/lib/utils/pdf.ts` | E | phone `.number` |
| Modify | `src/lib/components/DirectoryTreeView.svelte` | E | phone `.number` |
| Modify | `src/lib/components/DirectoryCardView.svelte` | E | phone `.number` |
| Modify | `src/lib/components/BusinessProfileDialog.svelte` | E | phone `.number` + type label |
| Modify | `src/lib/components/SuggestEditDialog.svelte` | E | phones → comma string from `.number` |

---

## Group A — Email obfuscation in the list view (todo item 4)

The card view (`DirectoryCardView.svelte:166-171`) renders the **real** email but only client-side (`{#if browser && business.email}`), so the SSR HTML contains no address for scrapers. The table view (`DirectoryTableView.svelte:210-220`) instead always renders an ugly `{u} [at] {d}`. Make the table view match the card view: show the real email, gated on `browser`.

### Task A1: Match list-view email rendering to card view

**Files:**
- Modify: `src/lib/components/DirectoryTableView.svelte`

- [ ] **Step 1: Ensure `browser` is imported**

Read the top `<script>` block of `src/lib/components/DirectoryTableView.svelte`. If it does not already import `browser`, add this line with the other imports:

```ts
import { browser } from '$app/environment';
```

- [ ] **Step 2: Replace the obfuscated email span with the real email, gated on `browser`**

Find this block (around lines 210-220):

```svelte
								{#if business.email}
									{@const [u, d] = emailParts(business.email)}
									<div class="flex items-center gap-1">
										<button
											class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
											title="Open email client"
											onclick={(e) => { e.stopPropagation(); window.location.href = `mailto:${business.email}`; }}
										>
											<Mail class="h-3 w-3 shrink-0" />
											<span class="truncate">{u} [at] {d}</span>
										</button>
```

Replace it with (gate on `browser`, show the real address):

```svelte
								{#if browser && business.email}
									<div class="flex items-center gap-1">
										<button
											class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
											title="Open email client"
											onclick={(e) => { e.stopPropagation(); window.location.href = `mailto:${business.email}`; }}
										>
											<Mail class="h-3 w-3 shrink-0" />
											<span class="truncate">{business.email}</span>
										</button>
```

Leave the copy-email button and the closing `</div>` / `{/if}` that follow unchanged.

- [ ] **Step 3: Remove the now-unused `emailParts` helper if nothing else references it**

Run: `grep -n "emailParts" src/lib/components/DirectoryTableView.svelte`
If the only remaining match is the function definition (around lines 87-90), delete the `emailParts` function. If other call sites remain, leave it.

- [ ] **Step 4: Verify**

Run: `pnpm check`
Expected: 0 errors (1 pre-existing a11y warning in `about/+page.svelte` is fine).

Then call the Svelte MCP autofixer (`mcp__svelte__svelte-autofixer`) on the file and fix any real issues.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/DirectoryTableView.svelte
git commit -m "fix: render list-view email like card view (client-side, un-obfuscated display)"
```

---

## Group B — Filters button filters services (todo item 6)

Categories are browsable via the card-view grouping, so the Filters popover should filter by **service** instead. Repurpose `FilterPopover.svelte` (its only consumer is `DirectoryTable.svelte`) and swap the category filter logic in `DirectoryTable` for services.

### Task B1: Repurpose FilterPopover to services

**Files:**
- Modify: `src/lib/components/FilterPopover.svelte`

- [ ] **Step 1: Replace the whole file**

Replace the entire contents of `src/lib/components/FilterPopover.svelte` with:

```svelte
<script lang="ts">
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';

	let {
		services,
		selectedServices = $bindable([])
	}: {
		services: string[];
		selectedServices: string[];
	} = $props();

	function toggle(svc: string) {
		if (selectedServices.includes(svc)) {
			selectedServices = selectedServices.filter((s) => s !== svc);
		} else {
			selectedServices = [...selectedServices, svc];
		}
	}
</script>

<Popover>
	<PopoverTrigger>
		{#snippet child({ props })}
			<Button {...props} variant="outline" size="icon" aria-label="Filter by service">
				<SlidersHorizontal class="h-4 w-4" />
			</Button>
		{/snippet}
	</PopoverTrigger>
	<PopoverContent class="w-64" align="end">
		<p class="mb-3 text-sm font-medium">Filter by service</p>
		{#if services.length === 0}
			<p class="text-xs text-muted-foreground">No services to filter by.</p>
		{:else}
			<div class="flex max-h-64 flex-col gap-2 overflow-y-auto">
				{#each services as svc (svc)}
					<div class="flex items-center gap-2">
						<Checkbox
							id={svc}
							checked={selectedServices.includes(svc)}
							onCheckedChange={() => toggle(svc)}
						/>
						<Label for={svc} class="cursor-pointer text-sm">{svc}</Label>
					</div>
				{/each}
			</div>
		{/if}
		{#if selectedServices.length > 0}
			<Button variant="ghost" class="mt-3 w-full text-xs" onclick={() => (selectedServices = [])}>
				Clear filters
			</Button>
		{/if}
	</PopoverContent>
</Popover>
```

Note: the unused `Tooltip` imports from the original file are intentionally dropped.

- [ ] **Step 2: Autofix + check**

Call the Svelte MCP autofixer on the file; fix real issues. Then `pnpm check` (expect 0 errors — `DirectoryTable` still passes the old props at this point, so a type error there is expected and fixed in Task B2; run check again after B2).

### Task B2: Wire service filtering into DirectoryTable

**Files:**
- Modify: `src/lib/components/DirectoryTable.svelte`

- [ ] **Step 1: Swap category-filter state for service-filter state**

Find (around lines 68-73):

```svelte
	let search = $state('');
	let selectedCategories = $state<string[]>([]);

	const categories = $derived(
		[...new Set(activeBusinesses.flatMap((b) => b.categories.map((c) => c.name)))].sort()
	);
```

Replace with:

```svelte
	let search = $state('');
	let selectedServices = $state<string[]>([]);

	const services = $derived(
		[...new Set(activeBusinesses.flatMap((b) => b.services.map((s) => s.name)))].sort()
	);
```

- [ ] **Step 2: Swap the filter predicate**

Find (around lines 87-95):

```svelte
				const matchesCategory =
					selectedCategories.length === 0 ||
					b.categories.some((c) => selectedCategories.includes(c.name));

				return matchesSearch && matchesCategory;
			})
	);

	const searching = $derived(search.length > 0 || selectedCategories.length > 0);
```

Replace with:

```svelte
				const matchesService =
					selectedServices.length === 0 ||
					b.services.some((s) => selectedServices.includes(s.name));

				return matchesSearch && matchesService;
			})
	);

	const searching = $derived(search.length > 0 || selectedServices.length > 0);
```

- [ ] **Step 3: Update the FilterPopover usage**

Find (around line 102):

```svelte
		<FilterPopover {categories} bind:selectedCategories />
```

Replace with:

```svelte
		<FilterPopover {services} bind:selectedServices />
```

- [ ] **Step 4: Verify**

Run: `pnpm check` — expect 0 errors. Call the autofixer on `DirectoryTable.svelte`.

Manual: `pnpm dev`, open the directory, click the Filters (sliders) icon — it should now list **services** with checkboxes; selecting one narrows the list to businesses offering that service; "Clear filters" resets.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/FilterPopover.svelte src/lib/components/DirectoryTable.svelte
git commit -m "feat: filter directory by service instead of category"
```

---

## Group C — Single category selection (todo item 5)

Keep the many-to-many schema, but constrain the edit dialog's category picker to a single selection. Selecting a category replaces the current one and closes the dropdown.

### Task C1: Make the category picker single-select

**Files:**
- Modify: `src/lib/components/EditBusinessDialog.svelte`

- [ ] **Step 1: Replace `toggleCategory` with a single-select setter**

Find (around lines 99-104):

```ts
  function toggleCategory(id: string, checked: boolean) {
    const next = new Set(selectedCategoryIds);
    if (checked) next.add(id); else next.delete(id);
    selectedCategoryIds = next;
    $form.categories = [...next].join(',');
  }
```

Replace with:

```ts
  function selectCategory(id: string) {
    selectedCategoryIds = new Set([id]);
    $form.categories = id;
  }
```

- [ ] **Step 2: Ensure the load snapshot keeps at most one category**

In the `$effect` that snapshots the business (around line 80), find:

```ts
      categoryIds: business.categories.map((c) => c.id),
```

Replace with (keep only the first, so pre-existing multi-category businesses load cleanly into single-select):

```ts
      categoryIds: business.categories.slice(0, 1).map((c) => c.id),
```

- [ ] **Step 3: Update the category trigger label (plural → singular)**

Find (around lines 182-190) the trigger snippet content:

```svelte
                  {#if selectedCategoryIds.size === 0}
                    <span class="text-muted-foreground">Select categories…</span>
                  {:else}
                    <div class="flex flex-wrap gap-1">
                      {#each lookupStore.categories.filter(c => selectedCategoryIds.has(c.id)) as cat (cat.id)}
                        <span class="rounded-sm bg-secondary px-1.5 py-0.5 text-xs">{cat.name}</span>
                      {/each}
                    </div>
                  {/if}
```

Replace with:

```svelte
                  {#if selectedCategoryIds.size === 0}
                    <span class="text-muted-foreground">Select a category…</span>
                  {:else}
                    <div class="flex flex-wrap gap-1">
                      {#each lookupStore.categories.filter(c => selectedCategoryIds.has(c.id)) as cat (cat.id)}
                        <span class="rounded-sm bg-secondary px-1.5 py-0.5 text-xs">{cat.name}</span>
                      {/each}
                    </div>
                  {/if}
```

- [ ] **Step 4: Update the category option buttons to call `selectCategory`**

Find (around lines 197-205):

```svelte
                {#each lookupStore.categories as cat (cat.id)}
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 whitespace-nowrap rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onclick={() => toggleCategory(cat.id, !selectedCategoryIds.has(cat.id))}
                  >
                    <Check class="h-4 w-4 {selectedCategoryIds.has(cat.id) ? 'opacity-100' : 'opacity-0'}" />
                    {cat.name}
                  </button>
```

Replace the `onclick` handler:

```svelte
                {#each lookupStore.categories as cat (cat.id)}
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 whitespace-nowrap rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onclick={() => selectCategory(cat.id)}
                  >
                    <Check class="h-4 w-4 {selectedCategoryIds.has(cat.id) ? 'opacity-100' : 'opacity-0'}" />
                    {cat.name}
                  </button>
```

(The services popover and `toggleService` are unchanged — services remain multi-select.)

- [ ] **Step 5: Verify**

Run: `pnpm check` — expect 0 errors. Call the autofixer on the file.

Manual: open the edit dialog, open Categories — selecting a category should replace any prior selection (only one chip shows). The hidden `categories` input holds a single id. Saving keeps one category (`businessSchema.categories` still requires `min(1)`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/EditBusinessDialog.svelte
git commit -m "feat: restrict category picker to a single selection"
```

---

## Group D — Consistent approve/reject loading + reload (todo items 3, 7, 8)

Apply one pattern everywhere: while a row's action is in flight, its button shows a "Working…"-style label and is disabled; on success, call `invalidateAll()` so the list is refetched from the server (dropping the now-resolved row). Replace the optimistic client-side `removedIds`/`removedSuggestionIds` removal with the server refetch.

### Task D1: Suggested-edits — loading + reload (item 3)

**Files:**
- Modify: `src/routes/suggested-edits/+page.svelte`

- [ ] **Step 1: Import `invalidateAll` and drop the local removal set**

Find (lines 1-7):

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';

  let { data } = $props();

  let removedIds = $state(new Set<string>());
  const suggestions = $derived(data.suggestions.filter((s: any) => !removedIds.has(s.id)));
```

Replace with:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();

  const suggestions = $derived(data.suggestions);
```

- [ ] **Step 2: Reject form — invalidateAll on success + loading label**

Find (lines 96-117):

```svelte
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
```

Replace with:

```svelte
              <form
                method="POST"
                action="/suggested-edits?/rejectEdit"
                use:enhance={() => {
                  submitting = suggestion.id;
                  return async ({ result }) => {
                    if (result.type === 'success') {
                      await invalidateAll();
                    } else if (result.type === 'failure') {
                      errors[suggestion.id] = (result.data as any)?.message ?? 'Error';
                    }
                    submitting = null;
                  };
                }}
              >
                <input type="hidden" name="id" value={suggestion.id} />
                <button
                  type="submit"
                  class="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                  disabled={submitting === suggestion.id}
                >{submitting === suggestion.id ? 'Working…' : 'Reject'}</button>
              </form>
```

- [ ] **Step 3: Approve form — invalidateAll on success + loading label**

Find (lines 118-139):

```svelte
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
```

Replace with:

```svelte
              <form
                method="POST"
                action="/suggested-edits?/approveEdit"
                use:enhance={() => {
                  submitting = suggestion.id;
                  return async ({ result }) => {
                    if (result.type === 'success') {
                      await invalidateAll();
                    } else if (result.type === 'failure') {
                      errors[suggestion.id] = (result.data as any)?.message ?? 'Error';
                    }
                    submitting = null;
                  };
                }}
              >
                <input type="hidden" name="id" value={suggestion.id} />
                <button
                  type="submit"
                  class="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  disabled={submitting === suggestion.id}
                >{submitting === suggestion.id ? 'Working…' : 'Approve'}</button>
              </form>
```

- [ ] **Step 4: Verify**

Run: `pnpm check` (expect 0 errors). Autofix the file. Manual check deferred until Group E is done (this page also renders a phones diff); functional check: approving/rejecting disables the button with "Working…" then the row disappears after the list refetches.

- [ ] **Step 5: Commit**

```bash
git add src/routes/suggested-edits/+page.svelte
git commit -m "feat: loading state + list reload on suggested-edit approve/reject"
```

### Task D2: Lookup suggestions — loading + reload (item 7)

**Files:**
- Modify: `src/routes/pending/+page.svelte`

- [ ] **Step 1: Import `invalidateAll`, add a `submittingSuggestionId`, drop the removal set**

Read the top `<script>` of `src/routes/pending/+page.svelte`. It currently imports `enhance` from `$app/forms` and declares `removedSuggestionIds` + a `suggestions` derived (added previously). Make these edits:

Add to the import list (with the other `$app` imports):

```ts
  import { invalidateAll } from '$app/navigation';
```

Find:

```ts
let removedSuggestionIds = $state(new Set<string>());
const suggestions = $derived(
  data.suggestions.filter((s: LookupSuggestion) => !removedSuggestionIds.has(s.id))
);
```

Replace with:

```ts
let submittingSuggestionId = $state<string | null>(null);
const suggestions = $derived(data.suggestions);
```

- [ ] **Step 2: Approve form — loading + invalidateAll**

Find the approve form (around lines 162-175):

```svelte
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
```

Replace with:

```svelte
          <form
            method="POST"
            action="/pending?/approveSuggestion"
            use:enhance={() => {
              submittingSuggestionId = suggestion.id;
              return async ({ result }) => {
                if (result.type === 'success') {
                  await invalidateAll();
                }
                submittingSuggestionId = null;
              };
            }}
          >
            <input type="hidden" name="id" value={suggestion.id} />
            <Button type="submit" size="sm" disabled={submittingSuggestionId === suggestion.id}>
              {submittingSuggestionId === suggestion.id ? 'Working…' : 'Approve'}
            </Button>
          </form>
```

- [ ] **Step 3: Reject form — loading + invalidateAll**

Find the reject form (around lines 176-189):

```svelte
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
```

Replace with:

```svelte
          <form
            method="POST"
            action="/pending?/rejectSuggestion"
            use:enhance={() => {
              submittingSuggestionId = suggestion.id;
              return async ({ result }) => {
                if (result.type === 'success') {
                  await invalidateAll();
                }
                submittingSuggestionId = null;
              };
            }}
          >
            <input type="hidden" name="id" value={suggestion.id} />
            <Button type="submit" size="sm" variant="outline" disabled={submittingSuggestionId === suggestion.id}>
              {submittingSuggestionId === suggestion.id ? 'Working…' : 'Reject'}
            </Button>
          </form>
```

- [ ] **Step 4: Verify**

Run: `pnpm check` (expect 0 errors). Autofix the file. Confirm `LookupSuggestion` is still imported and used (it now only types nothing in-script — if `pnpm check` flags it as unused, remove `LookupSuggestion` from the type import). Functional check deferred to Group E manual pass (this page also renders `business.phones`).

- [ ] **Step 5: Commit**

```bash
git add src/routes/pending/+page.svelte
git commit -m "feat: loading state + list reload on lookup-suggestion approve/reject"
```

### Task D3: Feature requests — reload after status update (item 8)

The features page already shows a "Saving…" loading label on the Update button (`features/+page.svelte:260-268`) but only updates `localStatuses` optimistically. Add `invalidateAll()` so the list reloads (and re-sorts) from the server after an admin updates a request's status.

**Files:**
- Modify: `src/routes/features/+page.svelte`

- [ ] **Step 1: Import `invalidateAll`**

In the top `<script>` of `src/routes/features/+page.svelte`, add with the other `$app` imports:

```ts
  import { invalidateAll } from '$app/navigation';
```

- [ ] **Step 2: Call invalidateAll after a successful status update**

Find (around lines 232-240):

```svelte
                use:enhance={() => {
                  statusUpdating = req.id;
                  return async ({ result }) => {
                    statusUpdating = null;
                    if (result.type === 'success') {
                      localStatuses[req.id] = (result.data as any).status;
                    }
                  };
                }}
```

Replace with:

```svelte
                use:enhance={() => {
                  statusUpdating = req.id;
                  return async ({ result }) => {
                    if (result.type === 'success') {
                      localStatuses[req.id] = (result.data as any).status;
                      await invalidateAll();
                    }
                    statusUpdating = null;
                  };
                }}
```

- [ ] **Step 3: Verify**

Run: `pnpm check` (expect 0 errors). Autofix the file.

Manual: `pnpm dev`, sign in as admin, go to `/features`, change a request's status and click Update — the button shows "Saving…", then the list refetches and re-sorts.

- [ ] **Step 4: Commit**

```bash
git add src/routes/features/+page.svelte
git commit -m "feat: reload feature requests list after status update"
```

---

## Group E — Structured phone columns with type (todo item 1)

Replace the free-form `businesses.phones text[]` with two structured slots — `phone_1`, `phone_1_type`, `phone_2`, `phone_2_type` — using a new `phone_type` enum (`mobile, home, work, fax`). The old `phones` column is **kept and backfilled** (not dropped) so the change is reversible; a deferred cleanup task drops it once production is verified. The app exposes a structured `Phone[]` (`{ number, type }`) on `Business`.

### Task E1: Migration — enum, columns, backfill

**Files:**
- Create: `supabase/migrations/structured_phones.sql`

- [ ] **Step 1: Pre-check how many businesses have >2 phones (informational)**

Run this via the Supabase MCP `execute_sql` and note the count (these businesses keep only their first two numbers; the rest remain in the retained `phones` column):

```sql
select count(*) as over_two_phones
from public.businesses
where array_length(phones, 1) > 2;
```

`log()` / report the number so nothing is silently dropped.

- [ ] **Step 2: Write the migration file**

Create `supabase/migrations/structured_phones.sql`:

```sql
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
```

- [ ] **Step 3: Apply the migration**

Apply via the Supabase MCP `apply_migration` (migration name `structured_phones`) using the SQL above. If the MCP is unauthenticated, instruct the user to paste `supabase/migrations/structured_phones.sql` into the Supabase SQL editor and run it.

- [ ] **Step 4: Verify columns + enum exist and backfill ran**

Run via `execute_sql`:

```sql
select column_name, data_type, udt_name
from information_schema.columns
where table_schema = 'public' and table_name = 'businesses'
  and column_name in ('phone_1','phone_1_type','phone_2','phone_2_type')
order by column_name;

select id, phones, phone_1, phone_2 from public.businesses limit 5;
```

Expected: four new columns present (`phone_1_type`/`phone_2_type` udt_name `phone_type`); `phone_1`/`phone_2` populated from the array.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/structured_phones.sql
git commit -m "feat: add structured phone columns and phone_type enum"
```

### Task E2: Shared phone types + mapper

**Files:**
- Create: `src/lib/utils/phones.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Create the phone util**

Create `src/lib/utils/phones.ts`:

```ts
import type { Phone, PhoneType } from '$lib/types';

export const PHONE_TYPES: PhoneType[] = ['mobile', 'home', 'work', 'fax'];

export const PHONE_TYPE_LABELS: Record<PhoneType, string> = {
  mobile: 'Mobile',
  home: 'Home',
  work: 'Work',
  fax: 'Fax'
};

/** Build the structured phone list from a raw businesses row's columns. */
export function buildPhones(row: {
  phone_1?: string | null;
  phone_1_type?: PhoneType | null;
  phone_2?: string | null;
  phone_2_type?: PhoneType | null;
}): Phone[] {
  const out: Phone[] = [];
  if (row.phone_1) out.push({ number: row.phone_1, type: row.phone_1_type ?? null });
  if (row.phone_2) out.push({ number: row.phone_2, type: row.phone_2_type ?? null });
  return out;
}
```

- [ ] **Step 2: Add the `Phone`/`PhoneType` types and switch `Business.phones`**

In `src/lib/types.ts`, add near the top (after `BusinessStatus`):

```ts
export type PhoneType = 'mobile' | 'home' | 'work' | 'fax';

export interface Phone {
  number: string;
  type: PhoneType | null;
}
```

Then in the `Business` interface, change:

```ts
  phones: string[];
```

to:

```ts
  phones: Phone[];
```

- [ ] **Step 3: Verify**

Run: `pnpm check` — expect type errors at the phone display/write sites (fixed in E3–E8). That is expected; do **not** commit yet. Confirm the errors are only about `phones` being `Phone[]` now (no errors in `types.ts` / `phones.ts` themselves).

- [ ] **Step 4: Commit the types + util only**

```bash
git add src/lib/types.ts src/lib/utils/phones.ts
git commit -m "feat: add structured Phone type and buildPhones mapper"
```

### Task E3: Map columns → Phone[] in all load functions

**Files:**
- Modify: `src/routes/+page.server.ts`
- Modify: `src/routes/pending/+page.server.ts`
- Modify: `src/routes/suggested-edits/+page.server.ts`

- [ ] **Step 1: Main page load**

In `src/routes/+page.server.ts`, add the import at the top (with the other imports):

```ts
import { buildPhones } from '$lib/utils/phones';
```

Find the load mapping (around lines 19-23):

```ts
	const mapped = (businesses ?? []).map((b) => ({
		...b,
		categories: (b.business_categories ?? []).map((bc: any) => bc.categories),
		services: (b.business_services ?? []).map((bs: any) => bs.services)
	}));
```

Replace with (override the spread `phones` with the structured array):

```ts
	const mapped = (businesses ?? []).map((b) => ({
		...b,
		phones: buildPhones(b),
		categories: (b.business_categories ?? []).map((bc: any) => bc.categories),
		services: (b.business_services ?? []).map((bs: any) => bs.services)
	}));
```

- [ ] **Step 2: Pending page load**

In `src/routes/pending/+page.server.ts`, add the import:

```ts
import { buildPhones } from '$lib/utils/phones';
```

Find the mapping (around lines 28-32):

```ts
  const mapped = (businesses ?? []).map((b: any) => ({
    ...b,
    categories: (b.business_categories ?? []).map((bc: any) => bc.categories),
    services: (b.business_services ?? []).map((bs: any) => bs.services),
  }));
```

Replace with:

```ts
  const mapped = (businesses ?? []).map((b: any) => ({
    ...b,
    phones: buildPhones(b),
    categories: (b.business_categories ?? []).map((bc: any) => bc.categories),
    services: (b.business_services ?? []).map((bs: any) => bs.services),
  }));
```

- [ ] **Step 3: Suggested-edits load (nested business)**

In `src/routes/suggested-edits/+page.server.ts`, add the import:

```ts
import { buildPhones } from '$lib/utils/phones';
```

Find the nested business mapping (around lines 70-79):

```ts
	const mapped = (suggestions ?? []).map((s) => ({
		...s,
		businesses: s.businesses
			? {
					...s.businesses,
					categories: (s.businesses.business_categories ?? []).map((bc: any) => bc.categories),
					services: (s.businesses.business_services ?? []).map((bs: any) => bs.services)
				}
			: null
	}));
```

Replace with (map the nested business's phone columns too):

```ts
	const mapped = (suggestions ?? []).map((s) => ({
		...s,
		businesses: s.businesses
			? {
					...s.businesses,
					phones: buildPhones(s.businesses),
					categories: (s.businesses.business_categories ?? []).map((bc: any) => bc.categories),
					services: (s.businesses.business_services ?? []).map((bs: any) => bs.services)
				}
			: null
	}));
```

Note: `suggested_edits.phones` (the suggestion's own array) is left untouched — the diff display handles it in Task E7.

- [ ] **Step 4: Verify**

Run: `pnpm check` — load functions should be clean now; remaining errors are in components/write paths (E4–E8). Do not commit yet — commit at end of E3 is fine for the server reads:

```bash
git add src/routes/+page.server.ts src/routes/pending/+page.server.ts src/routes/suggested-edits/+page.server.ts
git commit -m "feat: map phone columns into structured Phone[] on load"
```

### Task E4: Form schema + edit-dialog write path

**Files:**
- Modify: `src/lib/schemas.ts`
- Modify: `src/lib/components/EditBusinessDialog.svelte`
- Modify: `src/routes/+page.server.ts`

- [ ] **Step 1: Replace `phones` in the schema with four fields**

In `src/lib/schemas.ts`, find:

```ts
  phones: z.string().default(''),
```

Replace with:

```ts
  phone_1: z.string().default(''),
  phone_1_type: z.string().default(''),
  phone_2: z.string().default(''),
  phone_2_type: z.string().default(''),
```

- [ ] **Step 2: Update the edit-dialog snapshot to populate the four fields**

In `src/lib/components/EditBusinessDialog.svelte`, find in the `$effect` snapshot (around line 77):

```ts
        phones: business.phones.join(', '),
```

Replace with:

```ts
        phone_1: business.phones[0]?.number ?? '',
        phone_1_type: business.phones[0]?.type ?? '',
        phone_2: business.phones[1]?.number ?? '',
        phone_2_type: business.phones[1]?.type ?? '',
```

Then find where the snapshot is applied inside `untrack` (around line 89):

```ts
      $form.phones = snap.phones;
```

Replace with:

```ts
      $form.phone_1 = snap.phone_1;
      $form.phone_1_type = snap.phone_1_type;
      $form.phone_2 = snap.phone_2;
      $form.phone_2_type = snap.phone_2_type;
```

- [ ] **Step 3: Replace the phone Input markup with two number+type rows**

Add the `Select` import near the other UI imports at the top of `EditBusinessDialog.svelte` (if not already present):

```ts
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '$lib/components/ui/select/index.js';
  import { PHONE_TYPES, PHONE_TYPE_LABELS } from '$lib/utils/phones';
```

Find the current phones field block (around lines 158-162):

```svelte
        <div class="flex flex-col gap-1.5">
          <Label for="eb-phones">Phone numbers</Label>
          <Input id="eb-phones" name="phones" bind:value={$form.phones} placeholder="218-555-0101, 218-555-0202" />
          <p class="text-xs text-muted-foreground">Comma-separated</p>
        </div>
```

Replace with a full-width block holding two rows, each a number input flexed beside a type dropdown (this also satisfies Group F for phones — the block is `col-span-2`):

```svelte
        <div class="col-span-2 flex flex-col gap-1.5">
          <Label>Phone numbers</Label>
          <div class="flex items-center gap-2">
            <Input
              name="phone_1"
              bind:value={$form.phone_1}
              placeholder="218-555-0101"
              class="flex-1"
            />
            <Select type="single" name="phone_1_type" bind:value={$form.phone_1_type}>
              <SelectTrigger class="w-28">
                {$form.phone_1_type ? PHONE_TYPE_LABELS[$form.phone_1_type] : 'Type'}
              </SelectTrigger>
              <SelectContent>
                {#each PHONE_TYPES as t (t)}
                  <SelectItem value={t}>{PHONE_TYPE_LABELS[t]}</SelectItem>
                {/each}
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center gap-2">
            <Input
              name="phone_2"
              bind:value={$form.phone_2}
              placeholder="218-555-0202"
              class="flex-1"
            />
            <Select type="single" name="phone_2_type" bind:value={$form.phone_2_type}>
              <SelectTrigger class="w-28">
                {$form.phone_2_type ? PHONE_TYPE_LABELS[$form.phone_2_type] : 'Type'}
              </SelectTrigger>
              <SelectContent>
                {#each PHONE_TYPES as t (t)}
                  <SelectItem value={t}>{PHONE_TYPE_LABELS[t]}</SelectItem>
                {/each}
              </SelectContent>
            </Select>
          </div>
        </div>
```

Note on types: `$form.phone_1_type` is a string (possibly `''`). `PHONE_TYPE_LABELS[$form.phone_1_type]` is indexed by a `PhoneType`; since the value comes from the schema as `string`, cast at the index if `pnpm check` complains — use `PHONE_TYPE_LABELS[$form.phone_1_type as PhoneType]` and import `PhoneType` from `$lib/types`.

- [ ] **Step 4: Update `updateBusiness` to write the four columns**

In `src/routes/+page.server.ts`, find (around line 75):

```ts
		const { id, phones, categories, services, ...fields } = form.data;
```

Replace with:

```ts
		const { id, phone_1, phone_1_type, phone_2, phone_2_type, categories, services, ...fields } =
			form.data;
```

Then find the update payload (around lines 86-96):

```ts
		let query = locals.supabase
			.from('businesses')
			.update({
				...fields,
				phones: phones
					.split(',')
					.map((p: string) => p.trim())
					.filter(Boolean),
				updated_at: new Date().toISOString()
			})
			.eq('id', id);
```

Replace with (write the structured columns; empty strings → null):

```ts
		let query = locals.supabase
			.from('businesses')
			.update({
				...fields,
				phone_1: phone_1.trim() || null,
				phone_1_type: phone_1_type || null,
				phone_2: phone_2.trim() || null,
				phone_2_type: phone_2_type || null,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);
```

- [ ] **Step 5: Verify**

Run: `pnpm check` — expect 0 errors in these files. Call the autofixer on `EditBusinessDialog.svelte`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/schemas.ts src/lib/components/EditBusinessDialog.svelte src/routes/+page.server.ts
git commit -m "feat: edit business phones as two number+type slots"
```

### Task E5: Update simple display sites (`phones[0]` → `phones[0].number`)

**Files:**
- Modify: `src/lib/utils/pdf.ts`
- Modify: `src/lib/components/DirectoryCardView.svelte`
- Modify: `src/lib/components/DirectoryTreeView.svelte`
- Modify: `src/lib/components/DirectoryTableView.svelte`
- Modify: `src/routes/pending/+page.svelte`

- [ ] **Step 1: pdf.ts**

In `src/lib/utils/pdf.ts` find (line 93):

```ts
      if (b.phones.length > 0) contacts.push(b.phones[0]);
```

Replace with:

```ts
      if (b.phones.length > 0) contacts.push(b.phones[0].number);
```

- [ ] **Step 2: DirectoryCardView.svelte**

Find (lines 160-164):

```svelte
										{#if business.phones.length > 0}
											<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
												<Phone class="h-3 w-3 shrink-0" />
												<span class="truncate">{business.phones[0]}</span>
											</div>
										{/if}
```

Replace the inner span:

```svelte
										{#if business.phones.length > 0}
											<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
												<Phone class="h-3 w-3 shrink-0" />
												<span class="truncate">{business.phones[0].number}</span>
											</div>
										{/if}
```

- [ ] **Step 3: DirectoryTreeView.svelte**

Find (lines 117-121):

```svelte
							{#if business.phones[0]}
								<a
									href="tel:{business.phones[0].replace(/\D/g, '')}"
									class="..."
									title={business.phones[0]}
```

Replace the three `business.phones[0]` references so the guard checks the entry but the string ops use `.number`:

```svelte
							{#if business.phones[0]}
								<a
									href="tel:{business.phones[0].number.replace(/\D/g, '')}"
									class="..."
									title={business.phones[0].number}
```

(Keep the existing `class` value and the rest of the anchor unchanged — only the `href` and `title` expressions change. The `{#if business.phones[0]}` guard stays as-is.)

- [ ] **Step 4: DirectoryTableView.svelte**

Find (lines 200-208):

```svelte
								{#if business.phones[0]}
									<a
										href="tel:{business.phones[0].replace(/\D/g, '')}"
										class="flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
										onclick={(e) => e.stopPropagation()}
									>
										<Phone class="h-3 w-3 shrink-0" />
										<span class="truncate">{business.phones[0]}</span>
									</a>
								{/if}
```

Replace:

```svelte
								{#if business.phones[0]}
									<a
										href="tel:{business.phones[0].number.replace(/\D/g, '')}"
										class="flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
										onclick={(e) => e.stopPropagation()}
									>
										<Phone class="h-3 w-3 shrink-0" />
										<span class="truncate">{business.phones[0].number}</span>
									</a>
								{/if}
```

- [ ] **Step 5: pending/+page.svelte**

Find (lines 113-116):

```svelte
						{#if business.phones.length > 0}
							<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
								<Phone class="h-3 w-3 shrink-0" />
								<span class="truncate">{business.phones[0]}</span>
```

Replace the span:

```svelte
						{#if business.phones.length > 0}
							<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
								<Phone class="h-3 w-3 shrink-0" />
								<span class="truncate">{business.phones[0].number}</span>
```

- [ ] **Step 6: Verify**

Run: `pnpm check`. Autofix each edited `.svelte` file. Expect 0 errors here.

- [ ] **Step 7: Commit**

```bash
git add src/lib/utils/pdf.ts src/lib/components/DirectoryCardView.svelte src/lib/components/DirectoryTreeView.svelte src/lib/components/DirectoryTableView.svelte src/routes/pending/+page.svelte
git commit -m "fix: read phone number from structured Phone in display sites"
```

### Task E6: Business profile dialog — list numbers with type labels

**Files:**
- Modify: `src/lib/components/BusinessProfileDialog.svelte`

- [ ] **Step 1: Inspect the current phones block**

Read `src/lib/components/BusinessProfileDialog.svelte` around lines 100-110. It currently iterates `business.phones as phone` and renders `phone` (a string).

- [ ] **Step 2: Render `phone.number` and an optional type label**

Find (around lines 102-106):

```svelte
				{#if business.phones.length > 0}
					...
						{#each business.phones as phone, i (phone)}
```

Update the `{#each}` key (objects, not strings) and render `phone.number` plus the type. Add the import at the top of the file:

```ts
  import { PHONE_TYPE_LABELS } from '$lib/utils/phones';
```

Change the each-block key from `(phone)` to `(phone.number + i)` and replace the rendered `{phone}` text with:

```svelte
							<span>{phone.number}</span>
							{#if phone.type}
								<span class="ml-1 text-xs text-muted-foreground">({PHONE_TYPE_LABELS[phone.type]})</span>
							{/if}
```

Preserve the surrounding markup (the `tel:` link if present should use `phone.number.replace(/\D/g, '')`). If the existing block wraps each phone in a `tel:` anchor, update its `href` to `tel:{phone.number.replace(/\D/g, '')}` and its visible text to `phone.number`.

- [ ] **Step 3: Verify**

Run: `pnpm check` (expect 0 errors). Autofix the file.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/BusinessProfileDialog.svelte
git commit -m "feat: show phone numbers with type labels in profile dialog"
```

### Task E7: Suggested-edit flows — suggest dialog + phones diff + approveEdit

**Files:**
- Modify: `src/lib/components/SuggestEditDialog.svelte`
- Modify: `src/routes/suggested-edits/+page.svelte`
- Modify: `src/routes/suggested-edits/+page.server.ts`

The public "suggest an edit" flow keeps a simple comma-separated phones input writing to `suggested_edits.phones text[]` (unchanged table). Only the prefill and the approve mapping need updating.

- [ ] **Step 1: SuggestEditDialog prefill**

In `src/lib/components/SuggestEditDialog.svelte` find (line 41):

```ts
      phones = business.phones.join(', ');
```

Replace with:

```ts
      phones = business.phones.map((p) => p.number).join(', ');
```

- [ ] **Step 2: Suggested-edits diff — map business phones to numbers**

In `src/routes/suggested-edits/+page.svelte`, the `DIFF_FIELDS` entry for phones compares `suggestion.phones` (string[]) against `business.phones` (now `Phone[]`). Add a `businessKey` so the business side maps to numbers.

Find (line 12):

```ts
    { key: 'phones', label: 'Phones', array: true },
```

Replace with:

```ts
    { key: 'phones', label: 'Phones', array: true, businessKey: 'phones_display' },
```

Then in `businessDisplayRaw` (around lines 45-53) add a branch before the final `return`:

```ts
    if (field.businessKey === 'phones_display') {
      return (business?.phones ?? []).map((p: any) => p.number);
    }
```

And in `businessDisplay` (around lines 55-63) add the matching branch before the final `return`:

```ts
    if (field.businessKey === 'phones_display') {
      return display((business?.phones ?? []).map((p: any) => p.number), true);
    }
```

- [ ] **Step 3: approveEdit writes structured columns**

In `src/routes/suggested-edits/+page.server.ts` find the business update payload (around lines 100-111):

```ts
			const { error: updateError } = await locals.supabase
				.from('businesses')
				.update({
					name: suggestion.name,
					email: suggestion.email,
					phones: suggestion.phones,
					address: suggestion.address,
					website: suggestion.website,
					description: suggestion.description,
					updated_at: new Date().toISOString()
				})
				.eq('id', suggestion.business_id);
```

Replace the `phones:` line with the two structured slots (suggestions carry no type, so types are null):

```ts
			const { error: updateError } = await locals.supabase
				.from('businesses')
				.update({
					name: suggestion.name,
					email: suggestion.email,
					phone_1: suggestion.phones?.[0] ?? null,
					phone_1_type: null,
					phone_2: suggestion.phones?.[1] ?? null,
					phone_2_type: null,
					address: suggestion.address,
					website: suggestion.website,
					description: suggestion.description,
					updated_at: new Date().toISOString()
				})
				.eq('id', suggestion.business_id);
```

- [ ] **Step 4: Verify**

Run: `pnpm check` (expect 0 errors). Autofix the two `.svelte` files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/SuggestEditDialog.svelte src/routes/suggested-edits/+page.svelte src/routes/suggested-edits/+page.server.ts
git commit -m "feat: handle structured phones in suggest/approve edit flow"
```

### Task E8: Full phone manual verification + deferred cleanup note

**Files:** none (verification only)

- [ ] **Step 1: End-to-end browser check**

Run `pnpm dev` and verify:
1. Directory list/card/tree views show the first phone number correctly.
2. Edit a business: two phone rows each show a number input beside a type dropdown; the saved values round-trip (reopen the dialog → values persist). Confirm via SQL:
   ```sql
   select phone_1, phone_1_type, phone_2, phone_2_type from public.businesses where id = '<edited-id>';
   ```
3. Business profile dialog lists numbers with `(Mobile)` / `(Work)` etc. labels.
4. Suggested-edits page: the Phones diff row compares correctly (no `[object Object]`).
5. PDF export includes the first phone number.

- [ ] **Step 2: Record the deferred column drop**

The legacy `businesses.phones text[]` column is retained for rollback safety. Once production is verified, drop it:

```sql
alter table public.businesses drop column phones;
```

Do **not** run this now. Note it in `todo.md` (replace the completed item 1 line with: `- [ ] (deferred) drop legacy businesses.phones column once structured phones verified in production`).

- [ ] **Step 3: Commit the todo note**

```bash
git add todo.md
git commit -m "docs: note deferred drop of legacy phones column"
```

---

## Group F — Edit dialog: website & phones on their own lines (todo item 2)

Phones already became a full-width (`col-span-2`) block in Task E4. The remaining change is to move the Website field onto its own full-width line (it currently shares a grid row).

### Task F1: Website field full-width

**Files:**
- Modify: `src/lib/components/EditBusinessDialog.svelte`

- [ ] **Step 1: Make the website field span both columns**

Find the website field block (around lines 164-168 in the original; after Task E4 it follows the phones block):

```svelte
        <div class="flex flex-col gap-1.5">
          <Label for="eb-website">Website</Label>
          <Input id="eb-website" name="website" bind:value={$form.website} />
          {#if $errors.website}<p class="text-xs text-destructive">{$errors.website}</p>{/if}
        </div>
```

Replace the wrapper `class` to span the grid:

```svelte
        <div class="col-span-2 flex flex-col gap-1.5">
          <Label for="eb-website">Website</Label>
          <Input id="eb-website" name="website" bind:value={$form.website} />
          {#if $errors.website}<p class="text-xs text-destructive">{$errors.website}</p>{/if}
        </div>
```

- [ ] **Step 2: Verify**

Run: `pnpm check` (expect 0 errors). Autofix the file.

Manual: open the edit dialog — Business name, Phones (two rows), Website, Address, Categories, Services, and Description each occupy their own full-width line; no two fields share a row.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/EditBusinessDialog.svelte
git commit -m "fix: put website field on its own line in edit dialog"
```

---

## Self-Review

**Spec coverage (todo.md):**
- Item 1 (phone columns + enum + type dropdown side-by-side) → Group E (E1–E8). ✅
- Item 2 (website & phones on own lines) → phones full-width in E4; website full-width in F1. ✅
- Item 3 (suggested-edits feedback + reload) → D1. ✅
- Item 4 (list email obfuscation matches card) → A1. ✅
- Item 5 (single category select) → C1. ✅
- Item 6 (Filters button → services) → B1, B2. ✅
- Item 7 (lookup suggestions loading + refresh) → D2. ✅
- Item 8 (feature requests reload + loading) → D3. ✅

**Placeholder scan:** No TBD/TODO placeholders; every code step has concrete before/after. Two spots intentionally instruct a small in-context discovery (BusinessProfileDialog exact markup in E6; DirectoryTableView `browser` import presence in A1) because those exact lines weren't pinned — each gives the precise replacement to apply.

**Type consistency:**
- `Phone { number; type: PhoneType | null }` defined in E2; `buildPhones` returns it; consumed as `.number`/`.type` everywhere in E3–E7. ✅
- `PHONE_TYPES` / `PHONE_TYPE_LABELS` defined in `phones.ts` (E2), used in E4 and E6. ✅
- Schema fields `phone_1/phone_1_type/phone_2/phone_2_type` (E4 schema) match the form bindings (E4 dialog) and the destructure in `updateBusiness` (E4 server). ✅
- FilterPopover props renamed to `services`/`selectedServices` (B1) match the usage in DirectoryTable (B2). ✅

**Ordering note:** Groups A–D are independent and can ship in any order. Group E must precede Group F's verification (F builds on the E4 phone block). Within E, E1 (migration) must run before E3–E8 touch the columns; E2 (types) must precede E3–E7 (which depend on `Phone`/`buildPhones`).
