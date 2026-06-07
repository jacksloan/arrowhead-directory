# TODO Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix five outstanding UI/UX issues: sidenav overlap, GitHub link, login-gate feedback on votes, icon alignment in dialogs, and a Quill rich-text editor for business descriptions.

**Architecture:** Each task is self-contained and touches 1–2 files. Tasks 1–4 are pure UI fixes with no data-model changes. Task 5 (Quill) introduces a new component and changes how descriptions are stored/rendered (HTML instead of plain text).

**Tech Stack:** Svelte 5 runes, SvelteKit, shadcn-svelte, Tailwind CSS v4, Quill v2, @lucide/svelte

---

## File Map

| File | Change |
|---|---|
| `src/lib/components/HamburgerSheet.svelte` | Task 1 (nav padding) + Task 2 (GitHub link) |
| `src/routes/features/+page.svelte` | Task 3 (tooltip on vote) |
| `src/lib/components/BusinessProfileDialog.svelte` | Task 4 (alignment) + Task 5 (render HTML) |
| `src/lib/components/EditBusinessDialog.svelte` | Task 4 (alignment) + Task 5 (Quill) |
| `src/lib/components/SuggestEditDialog.svelte` | Task 5 (Quill) |
| `src/lib/components/RichTextEditor.svelte` | Task 5 (new component) |
| `src/routes/suggested-edits/+page.svelte` | Task 5 (HTML diff display) |

---

## Task 1: Fix sidenav close button overlap

**Problem:** `SheetContent` renders its X button at `absolute top-4 right-4`. Nav items are full-width flex children — their hover backgrounds extend edge-to-edge and visually appear behind the X button.

**Fix:** Add `pr-10` (40 px) to the `<nav>` element. The X button is `size="icon-sm"` (~28 px) positioned at `right-4` (16 px) — total ~44 px from the right edge. `pr-10` clears it with a small gap. Each `<a>` inside the nav already has `px-3`, so left padding is unaffected.

**Files:**
- Modify: `src/lib/components/HamburgerSheet.svelte:19`

- [ ] **Step 1: Open the file and locate the nav element**

In `src/lib/components/HamburgerSheet.svelte`, the nav is on line 19:
```svelte
<nav class="mt-8 flex flex-col gap-2">
```

- [ ] **Step 2: Add right padding to the nav**

Replace that line with:
```svelte
<nav class="mt-8 flex flex-col gap-2 pr-10">
```

- [ ] **Step 3: Verify visually**

Run `pnpm dev`, open the hamburger menu. The X button should no longer overlap the hover highlight of any nav item. Check all items including the admin-only ones.

- [ ] **Step 4: Check types**

```sh
pnpm check
```

Expected: 0 errors, 1 pre-existing warning.

- [ ] **Step 5: Commit**

```sh
git add src/lib/components/HamburgerSheet.svelte
git commit -m "fix: add right padding to sidenav so X button does not overlap item hovers"
```

---

## Task 2: Add GitHub link to sidenav

**Goal:** Show a GitHub icon link in the public nav section. Clicking it opens the repo. A small note below explains the project accepts contributions and links to the README contributors guide.

**Files:**
- Modify: `src/lib/components/HamburgerSheet.svelte`

- [ ] **Step 1: Add Github icon import**

In `src/lib/components/HamburgerSheet.svelte`, the current imports are:
```svelte
<script lang="ts">
  import { Sheet, SheetContent, SheetTrigger } from '$lib/components/ui/sheet/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import MenuIcon from '@lucide/svelte/icons/menu';
```

Add the Github icon import:
```svelte
<script lang="ts">
  import { Sheet, SheetContent, SheetTrigger } from '$lib/components/ui/sheet/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import MenuIcon from '@lucide/svelte/icons/menu';
  import Github from '@lucide/svelte/icons/github';
```

- [ ] **Step 2: Add the GitHub link at the bottom of the public nav section**

In the nav, after the Feature Requests link and before `{#if isAdmin}`, add:

```svelte
        <a
          href="https://github.com/jacksloan/arrowhead-directory"
          target="_blank"
          rel="noopener noreferrer"
          onclick={() => (open = false)}
          class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          <Github class="h-4 w-4 shrink-0" />
          Open Source
        </a>
        <p class="px-3 text-[11px] text-muted-foreground">
          Contributions welcome —
          <a
            href="https://github.com/jacksloan/arrowhead-directory#contributing"
            target="_blank"
            rel="noopener noreferrer"
            class="underline underline-offset-2 hover:text-foreground"
          >
            see the guide
          </a>
        </p>
```

The full nav block after this change (for reference):

```svelte
      <nav class="mt-8 flex flex-col gap-2 pr-10">
        <a href="/" onclick={() => (open = false)} class="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
          Directory
        </a>
        <a href="/about" onclick={() => (open = false)} class="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
          About
        </a>
        <a href="/how-to" onclick={() => (open = false)} class="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
          FAQ
        </a>
        <a href="/features" onclick={() => (open = false)} class="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
          Feature Requests
        </a>
        <a
          href="https://github.com/jacksloan/arrowhead-directory"
          target="_blank"
          rel="noopener noreferrer"
          onclick={() => (open = false)}
          class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          <Github class="h-4 w-4 shrink-0" />
          Open Source
        </a>
        <p class="px-3 text-[11px] text-muted-foreground">
          Contributions welcome —
          <a
            href="https://github.com/jacksloan/arrowhead-directory#contributing"
            target="_blank"
            rel="noopener noreferrer"
            class="underline underline-offset-2 hover:text-foreground"
          >
            see the guide
          </a>
        </p>
        {#if isAdmin}
          ...admin links...
        {/if}
      </nav>
```

- [ ] **Step 3: Run svelte-autofixer**

Call `mcp__svelte__svelte-autofixer` on `src/lib/components/HamburgerSheet.svelte`. Fix any reported issues. Re-run until no issues.

- [ ] **Step 4: Check types**

```sh
pnpm check
```

Expected: 0 errors.

- [ ] **Step 5: Verify visually**

Open the hamburger menu. Confirm the GitHub link appears, opens the repo in a new tab, and the "see the guide" link anchors to the `#contributing` section of the README.

- [ ] **Step 6: Commit**

```sh
git add src/lib/components/HamburgerSheet.svelte
git commit -m "feat: add GitHub open source link and contributing note to sidenav"
```

---

## Task 3: Show tooltip when logged-out user tries to vote

**Problem:** The vote button has `disabled={!data.user}` and a `title` attribute, but browser tooltips are inconsistent (hidden on mobile, delayed on desktop). Logged-out users get no clear feedback.

**Fix:** Wrap the vote `<button>` in a shadcn-svelte `Tooltip` that shows "Log in to vote" when the user is not authenticated. The `TooltipProvider` is already in the root layout (`+layout.svelte`), so no extra setup is needed.

**Files:**
- Modify: `src/routes/features/+page.svelte`

- [ ] **Step 1: Add Tooltip imports**

In `src/routes/features/+page.svelte`, add to the existing imports:

```svelte
  import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
  } from '$lib/components/ui/tooltip/index.js';
```

- [ ] **Step 2: Wrap the vote button with a Tooltip**

Find the vote `<button>` element (currently around line 169). It looks like:

```svelte
              <button
                type="submit"
                disabled={!data.user || votingId === req.id}
                class="flex flex-col items-center gap-0.5 rounded-md border px-2 py-1.5 transition-colors
                  {req.userVoted
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}
                  disabled:opacity-40"
                title={data.user
                  ? req.userVoted
                    ? 'Remove vote'
                    : 'Upvote'
                  : 'Log in to vote'}
              >
                <ChevronUp class="h-4 w-4" />
                <span class="text-xs font-medium">{req.voteCount}</span>
              </button>
```

Replace it with a Tooltip-wrapped version. When logged out, the Tooltip fires. When logged in, no Tooltip wrapper is needed (keep `title` for logged-in hover feedback):

```svelte
              {#if !data.user}
                <Tooltip>
                  <TooltipTrigger>
                    {#snippet child({ props })}
                      <button
                        {...props}
                        type="button"
                        disabled
                        class="flex flex-col items-center gap-0.5 rounded-md border border-border px-2 py-1.5 text-muted-foreground opacity-40"
                      >
                        <ChevronUp class="h-4 w-4" />
                        <span class="text-xs font-medium">{req.voteCount}</span>
                      </button>
                    {/snippet}
                  </TooltipTrigger>
                  <TooltipContent>Log in to vote</TooltipContent>
                </Tooltip>
              {:else}
                <button
                  type="submit"
                  disabled={votingId === req.id}
                  class="flex flex-col items-center gap-0.5 rounded-md border px-2 py-1.5 transition-colors
                    {req.userVoted
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}
                    disabled:opacity-40"
                  title={req.userVoted ? 'Remove vote' : 'Upvote'}
                >
                  <ChevronUp class="h-4 w-4" />
                  <span class="text-xs font-medium">{req.voteCount}</span>
                </button>
              {/if}
```

Note: The logged-out button uses `type="button"` (not `type="submit"`) so that clicking it doesn't accidentally trigger the form. The Tooltip fires on hover and on focus for accessibility.

- [ ] **Step 3: Run svelte-autofixer**

Call `mcp__svelte__svelte-autofixer` on `src/routes/features/+page.svelte`. Fix any issues. Re-run until clean.

- [ ] **Step 4: Check types**

```sh
pnpm check
```

Expected: 0 errors.

- [ ] **Step 5: Verify visually**

Run `pnpm dev`. Visit `/features` while logged out. Hover over the vote button — tooltip "Log in to vote" should appear. Log in, confirm vote button works normally with no tooltip.

- [ ] **Step 6: Commit**

```sh
git add src/routes/features/+page.svelte
git commit -m "fix: show tooltip instead of title attr when logged-out user hovers vote button"
```

---

## Task 4: Fix icon alignment in profile and edit dialogs

**Problem:** In `BusinessProfileDialog`, the flex container uses `items-start`, so the pencil edit icon aligns to the top of the title. Since the dialog's X close button is absolute and vertically centred in the header area, the pencil and X appear misaligned. In `EditBusinessDialog`, the gear icon has only `pr-6` (24 px) reserved — but the dialog's X button is ~28 px at `right-4` (16 px), so total ~44 px from the right edge. `pr-6` leaves the gear icon partially behind the X.

**Files:**
- Modify: `src/lib/components/BusinessProfileDialog.svelte:54`
- Modify: `src/lib/components/EditBusinessDialog.svelte:84`

- [ ] **Step 1: Fix BusinessProfileDialog header alignment**

In `src/lib/components/BusinessProfileDialog.svelte`, find line 54:

```svelte
        <div class="flex items-start gap-2 pr-6">
```

Change `items-start` to `items-center`:

```svelte
        <div class="flex items-center gap-2 pr-6">
```

- [ ] **Step 2: Fix EditBusinessDialog gear icon spacing**

In `src/lib/components/EditBusinessDialog.svelte`, find line 84:

```svelte
      <div class="flex items-center gap-2 pr-6">
```

The gear icon button is to the left of the X close button. `pr-6` (24 px) is not enough space — the X button needs ~44 px. Change to `pr-10`:

```svelte
      <div class="flex items-center gap-2 pr-10">
```

- [ ] **Step 3: Check types**

```sh
pnpm check
```

Expected: 0 errors.

- [ ] **Step 4: Verify visually**

- Open a business profile dialog. The pencil icon should be vertically centred with the dialog's X close button.
- Open the edit dialog. The gear icon should sit clearly to the left of the X close button with no overlap.

- [ ] **Step 5: Commit**

```sh
git add src/lib/components/BusinessProfileDialog.svelte src/lib/components/EditBusinessDialog.svelte
git commit -m "fix: align edit/gear icons with dialog X close button in profile and edit views"
```

---

## Task 5: Quill rich-text editor for business description

**Goal:** Replace the `<Textarea>` for description in EditBusinessDialog and SuggestEditDialog with a Quill rich-text editor. Descriptions are stored as HTML. The profile view renders them with `{@html}`.

**Quill v2 API notes:**
- Install: `pnpm add quill`
- CSS: dynamic import `'quill/dist/quill.snow.css'` inside `onMount` (SSR-safe in Vite/SvelteKit)
- Init: `new Quill(el, { theme: 'snow', modules: { toolbar: [...] } })`
- Get HTML: `quill.root.innerHTML`
- Set HTML: `quill.root.innerHTML = html`
- Events: `quill.on('text-change', handler)`
- Empty state: `quill.root.innerHTML === '<p><br></p>'`

**Files:**
- Install: `quill` package
- Create: `src/lib/components/RichTextEditor.svelte`
- Modify: `src/lib/components/EditBusinessDialog.svelte`
- Modify: `src/lib/components/SuggestEditDialog.svelte`
- Modify: `src/lib/components/BusinessProfileDialog.svelte`
- Modify: `src/routes/suggested-edits/+page.svelte`

---

### Task 5a: Install Quill

- [ ] **Step 1: Install**

```sh
pnpm add quill
```

- [ ] **Step 2: Verify**

Check `package.json` — `"quill"` should appear in `dependencies`.

---

### Task 5b: Create RichTextEditor component

- [ ] **Step 1: Create the file**

Create `src/lib/components/RichTextEditor.svelte` with the following content:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let {
    value = $bindable(''),
    name,
    placeholder = 'Enter a description…',
    class: className = '',
  }: {
    value?: string;
    name?: string;
    placeholder?: string;
    class?: string;
  } = $props();

  let container: HTMLDivElement;
  let quill: any;
  let syncing = false;

  onMount(async () => {
    const [{ default: Quill }] = await Promise.all([
      import('quill'),
      import('quill/dist/quill.snow.css'),
    ]);

    quill = new Quill(container, {
      theme: 'snow',
      placeholder,
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['clean'],
        ],
      },
    });

    if (value) quill.root.innerHTML = value;

    quill.on('text-change', () => {
      if (syncing) return;
      const html = quill.root.innerHTML;
      value = html === '<p><br></p>' ? '' : html;
    });
  });

  $effect(() => {
    if (!quill) return;
    const html = value || '';
    if (quill.root.innerHTML !== html) {
      syncing = true;
      quill.root.innerHTML = html;
      syncing = false;
    }
  });
</script>

{#if name}
  <input type="hidden" {name} {value} />
{/if}
<div bind:this={container} class={className}></div>
```

**Why `syncing` flag:** When `$effect` sets `quill.root.innerHTML`, Quill fires `text-change`. Without the flag, the event handler would update `value`, which would re-trigger `$effect`, causing an infinite loop.

**Why `Promise.all` with CSS import:** The CSS must be loaded before Quill initializes so the editor renders correctly. Dynamic CSS import in Vite injects the stylesheet into `<head>` at runtime.

- [ ] **Step 2: Run svelte-autofixer**

Call `mcp__svelte__svelte-autofixer` on `src/lib/components/RichTextEditor.svelte`. Fix any issues.

- [ ] **Step 3: Check types**

```sh
pnpm check
```

Expected: 0 errors (Quill's types are bundled with the package).

---

### Task 5c: Use RichTextEditor in EditBusinessDialog

The `EditBusinessDialog` uses `sveltekit-superforms`. The description field is `$form.description` (a string). We bind `value={$form.description}` and use `$bindable` so Quill keeps the superform state up to date. No hidden input is needed because the `name` prop on `RichTextEditor` emits one automatically.

- [ ] **Step 1: Add RichTextEditor import**

In `src/lib/components/EditBusinessDialog.svelte`, in the `<script>` block, add after the existing imports:

```ts
  import RichTextEditor from './RichTextEditor.svelte';
```

- [ ] **Step 2: Replace the description Textarea**

Find this block (around line 139–143):

```svelte
        <div class="col-span-2 flex flex-col gap-1.5">
          <Label for="eb-description">Description</Label>
          <Textarea id="eb-description" name="description" rows={3} bind:value={$form.description} />
        </div>
```

Replace with:

```svelte
        <div class="col-span-2 flex flex-col gap-1.5">
          <Label for="eb-description">Description</Label>
          <RichTextEditor
            name="description"
            bind:value={$form.description}
            placeholder="Describe this business…"
            class="rounded-md border border-input bg-background"
          />
        </div>
```

Remove the `Textarea` import from the import list if it is no longer used elsewhere in this file. Check by searching for other `<Textarea` usages — if none remain, remove the import.

- [ ] **Step 3: Run svelte-autofixer**

Call `mcp__svelte__svelte-autofixer` on `src/lib/components/EditBusinessDialog.svelte`. Fix any issues.

- [ ] **Step 4: Check types**

```sh
pnpm check
```

Expected: 0 errors.

---

### Task 5d: Use RichTextEditor in SuggestEditDialog

`SuggestEditDialog` does not use superforms — it has a plain `description = $state('')` variable. Bind `value` to that directly. The `name="description"` prop emits a hidden input which is picked up by the `suggestEdit` form action.

- [ ] **Step 1: Add RichTextEditor import**

In `src/lib/components/SuggestEditDialog.svelte`, add after existing imports:

```ts
  import RichTextEditor from './RichTextEditor.svelte';
```

- [ ] **Step 2: Replace the description Textarea**

Find this block (around line 113–116):

```svelte
          <div class="col-span-2 flex flex-col gap-1.5">
            <Label for="se-description">Description</Label>
            <Textarea id="se-description" name="description" rows={3} bind:value={description} />
          </div>
```

Replace with:

```svelte
          <div class="col-span-2 flex flex-col gap-1.5">
            <Label for="se-description">Description</Label>
            <RichTextEditor
              name="description"
              bind:value={description}
              placeholder="Describe the changes you'd like to suggest…"
              class="rounded-md border border-input bg-background"
            />
          </div>
```

Remove the `Textarea` import if unused elsewhere in this file.

- [ ] **Step 3: Run svelte-autofixer**

Call `mcp__svelte__svelte-autofixer` on `src/lib/components/SuggestEditDialog.svelte`. Fix any issues.

- [ ] **Step 4: Check types**

```sh
pnpm check
```

Expected: 0 errors.

---

### Task 5e: Render HTML description in BusinessProfileDialog

Currently `BusinessProfileDialog` renders `{business.description}` as plain text. Now that descriptions may contain HTML, switch to `{@html}`. Quill's own sanitizer constrains output to the toolbar's allowed tags (bold, italic, underline, ordered/unordered lists), so the risk surface is minimal.

- [ ] **Step 1: Update the description render**

In `src/lib/components/BusinessProfileDialog.svelte`, find the description block (around line 80–82):

```svelte
        {#if business.description}
          <p class="text-sm leading-relaxed text-foreground/80">{business.description}</p>
        {/if}
```

Replace with:

```svelte
        {#if business.description}
          <div class="prose prose-sm max-w-none text-sm leading-relaxed text-foreground/80 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
            {@html business.description}
          </div>
        {/if}
```

The Tailwind arbitrary variants (`[&_ul]`, `[&_ol]`) restore list bullet/number rendering that Tailwind resets by default.

- [ ] **Step 2: Run svelte-autofixer**

Call `mcp__svelte__svelte-autofixer` on `src/lib/components/BusinessProfileDialog.svelte`. Fix any issues.

- [ ] **Step 3: Check types**

```sh
pnpm check
```

Expected: 0 errors.

---

### Task 5f: Update suggested-edits diff to handle HTML description

The diff view in `src/routes/suggested-edits/+page.svelte` compares business and suggestion field values and highlights changed cells. The `display()` helper formats values for display. For description, we now want to:
1. Show HTML rendered (not raw tags) in the diff cells
2. Compare stripped text for change detection

- [ ] **Step 1: Read the current display helper and diff table**

In `src/routes/suggested-edits/+page.svelte`, the relevant code is the `display()` helper and `DIFF_FIELDS` array. The description field entry looks like:

```ts
  { key: 'description', label: 'Description', array: false },
```

And cells render like:
```svelte
<td ...>{display(business[field.key], field.array)}</td>
<td ...>{display(suggestion[field.key], field.array)}</td>
```

- [ ] **Step 2: Add a stripHtml helper**

In the `<script>` block, add:

```ts
  function stripHtml(html: string | null): string {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
  }
```

- [ ] **Step 3: Update hasChanged to strip HTML for description comparison**

Find the `hasChanged` function. It currently calls `display()` to compare values. For description, we need to compare stripped text instead of raw HTML to avoid false positives from HTML formatting differences. Update `DIFF_FIELDS` to include an optional `html: boolean` flag:

```ts
  const DIFF_FIELDS: { key: keyof SuggestedEdit; label: string; array: boolean; html?: boolean }[] = [
    { key: 'name', label: 'Name', array: false },
    { key: 'email', label: 'Email', array: false },
    { key: 'phones', label: 'Phones', array: true },
    { key: 'address', label: 'Address', array: false },
    { key: 'website', label: 'Website', array: false },
    { key: 'description', label: 'Description', array: false, html: true },
    { key: 'subcategories', label: 'Subcategories', array: true },
    { key: 'services', label: 'Services', array: true },
  ];
```

Update `hasChanged`:

```ts
  function hasChanged(
    businessVal: any,
    suggestionVal: any,
    isArray: boolean,
    isHtml: boolean = false
  ): boolean {
    if (isHtml) {
      return stripHtml(businessVal) !== stripHtml(suggestionVal);
    }
    return display(businessVal, isArray) !== display(suggestionVal, isArray);
  }
```

Update all call sites of `hasChanged` to pass `field.html`:

```svelte
hasChanged(business[field.key], suggestion[field.key], field.array, field.html)
```

- [ ] **Step 4: Render description cells as HTML**

In the diff table cells, conditionally use `{@html}` for HTML fields:

```svelte
<td class="...">
  {#if field.html}
    <div class="prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
      {@html display(business[field.key], field.array)}
    </div>
  {:else}
    {display(business[field.key], field.array)}
  {/if}
</td>
<td class="...">
  {#if field.html}
    <div class="prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
      {@html display(suggestion[field.key], field.array)}
    </div>
  {:else}
    {display(suggestion[field.key], field.array)}
  {/if}
</td>
```

- [ ] **Step 5: Run svelte-autofixer**

Call `mcp__svelte__svelte-autofixer` on `src/routes/suggested-edits/+page.svelte`. Fix any issues.

- [ ] **Step 6: Check types**

```sh
pnpm check
```

Expected: 0 errors.

---

### Task 5g: Commit all Quill changes

- [ ] **Step 1: Stage and commit**

```sh
git add \
  src/lib/components/RichTextEditor.svelte \
  src/lib/components/EditBusinessDialog.svelte \
  src/lib/components/SuggestEditDialog.svelte \
  src/lib/components/BusinessProfileDialog.svelte \
  src/routes/suggested-edits/+page.svelte \
  package.json pnpm-lock.yaml
git commit -m "feat: add Quill rich-text editor for business description"
```

---

## Self-Review

**Spec coverage:**
- [x] Sidenav close icon overlap → Task 1
- [x] GitHub link + contributing note → Task 2
- [x] Login feedback on vote → Task 3
- [x] X and edit icon alignment → Task 4
- [x] Quill rich text for description → Tasks 5a–5g

**Placeholder scan:** None found. All steps contain complete code.

**Type consistency:**
- `RichTextEditor` props: `value`, `name`, `placeholder`, `class` — used consistently in Tasks 5b, 5c, 5d
- `hasChanged` signature updated in Task 5f to `(businessVal, suggestionVal, isArray, isHtml)` — call sites updated in same task
- `DIFF_FIELDS` type extended with `html?: boolean` — consistent throughout Task 5f
