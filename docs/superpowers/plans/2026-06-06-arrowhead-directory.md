# Arrowhead Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public business directory for the Arrowhead region with magic-link auth and owner-only inline editing, implemented across three phases using parallel sub-agents.

**Architecture:** Phase 1 runs a Python parser to produce `src/data/directory.json` — the shared data contract all Phase 2 agents build against. Phase 2 fans four parallel sub-agents into isolated git worktrees (shell/nav, directory page, about page, auth); they merge in order: A+D first, then B, then C. Phase 3 adds inline editing and a Supabase seed script after Phase 2 is fully merged.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes mode, shadcn-svelte, Tailwind v4, Supabase JS client (`@supabase/supabase-js` + `@supabase/ssr`), sveltekit-superforms, Zod, python-docx, Vercel

---

## File Map

### Phase 1 — Parser
| File | Action | Purpose |
|------|--------|---------|
| `tools/parse-directory/parse.py` | Create | Reads DOCX, outputs structured JSON |
| `tools/parse-directory/requirements.txt` | Create | python-docx dependency |
| `tools/parse-directory/test_parse.py` | Create | pytest unit tests |
| `src/data/directory.json` | Create (output) | Business records — shared data contract |

### Phase 2A — Shell & Nav (branch: `feat/shell`)
| File | Action | Purpose |
|------|--------|---------|
| `src/routes/+layout.svelte` | Modify | Add Nav component, keep ModeWatcher |
| `src/routes/+layout.server.ts` | Create | Load session for all pages |
| `src/lib/components/Nav.svelte` | Create | Top bar: hamburger left, profile icon right |
| `src/lib/components/HamburgerSheet.svelte` | Create | Left slide-in sheet with nav links |
| `src/lib/components/ProfilePopover.svelte` | Create | Right popover: login form, dark mode toggle, sign-out |

### Phase 2B — Directory Page (branch: `feat/directory`)
| File | Action | Purpose |
|------|--------|---------|
| `src/lib/types.ts` | Create | `Business` interface — shared type contract |
| `src/routes/+page.svelte` | Modify | Replace demo content with directory page |
| `src/routes/+page.server.ts` | Create | Load businesses from JSON |
| `src/lib/components/DirectoryTable.svelte` | Create | Table with client-side search + filter |
| `src/lib/components/FilterPopover.svelte` | Create | Category/subcategory filter UI |

### Phase 2C — About Page (branch: `feat/about`)
| File | Action | Purpose |
|------|--------|---------|
| `src/routes/about/+page.svelte` | Create | About page with coffee links |

### Phase 2D — Auth (branch: `feat/auth`)
| File | Action | Purpose |
|------|--------|---------|
| `src/lib/supabase.ts` | Create | Browser Supabase client |
| `src/lib/server/supabase.ts` | Create | Server Supabase client factory |
| `src/hooks.server.ts` | Create | Session middleware, token refresh |
| `src/app.d.ts` | Modify | Add `Locals` and `PageData` types |
| `src/routes/login/verify/+page.server.ts` | Create | Magic link callback — exchange code for session |

### Phase 3 — Inline Editing + Seed (branch: `feat/editing`)
| File | Action | Purpose |
|------|--------|---------|
| `src/lib/schemas.ts` | Create | Zod schema for business edit form |
| `src/routes/+page.server.ts` | Modify | Add `updateBusiness` form action |
| `src/lib/components/EditBusinessDialog.svelte` | Create | shadcn Dialog modal with superforms |
| `tools/seed-supabase.ts` | Create | Reads JSON, upserts all records to Supabase |

---

## Phase 1 — Parser

### Task 1: Inspect the source document

**Files:**
- Read: `laundromat-bulletin-board.docx`

- [ ] **Step 1: Install python-docx and inspect the document structure**

```bash
cd tools/parse-directory
python3 -m venv venv && source venv/bin/activate
pip install python-docx
```

```python
# run this interactively to understand the doc structure
from docx import Document
doc = Document('../../laundromat-bulletin-board.docx')
for i, para in enumerate(doc.paragraphs[:60]):
    print(f"{i:3} style={para.style.name!r:30} text={para.text[:80]!r}")
```

- [ ] **Step 2: Note the heading styles used for categories vs subcategories**

Look for patterns like:
- `Heading 1` or bold paragraphs = category (e.g. "PERSON to PERSON")
- `Heading 2` or sub-bold = subcategory (e.g. "Childcare")
- `Normal` paragraphs = business entries

Record the exact style names — you'll need them in the parser.

---

### Task 2: Create the parser

**Files:**
- Create: `tools/parse-directory/requirements.txt`
- Create: `tools/parse-directory/parse.py`

- [ ] **Step 1: Create requirements.txt**

```
python-docx==1.1.2
pytest==8.3.4
```

- [ ] **Step 2: Write the failing test first**

Create `tools/parse-directory/test_parse.py`:

```python
import json
import pytest
from parse import parse_business_text, normalize_phone, normalize_url

def test_parse_business_text_full():
    text = "Ace Plumbing | 218-555-0101 | ace@example.com | aceplumbing.com | Drain cleaning and water heaters"
    result = parse_business_text(text)
    assert result["name"] == "Ace Plumbing"
    assert result["phone"] == "218-555-0101"
    assert result["email"] == "ace@example.com"
    assert result["website"] == "https://aceplumbing.com"

def test_parse_business_text_name_only():
    result = parse_business_text("Betty's Childcare")
    assert result["name"] == "Betty's Childcare"
    assert result["phone"] is None
    assert result["email"] is None

def test_normalize_phone():
    assert normalize_phone("(218) 555-0101") == "218-555-0101"
    assert normalize_phone("218.555.0101") == "218-555-0101"
    assert normalize_phone(None) is None

def test_normalize_url():
    assert normalize_url("aceplumbing.com") == "https://aceplumbing.com"
    assert normalize_url("https://aceplumbing.com") == "https://aceplumbing.com"
    assert normalize_url(None) is None
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
source venv/bin/activate
pytest test_parse.py -v
```

Expected: `ImportError` — parse module doesn't exist yet.

- [ ] **Step 4: Create the parser**

Create `tools/parse-directory/parse.py`. Adapt the heading style names from Task 1's inspection:

```python
import json
import re
import sys
from pathlib import Path
from docx import Document

# Adjust these constants based on Task 1 inspection findings
CATEGORY_STYLES = {"Heading 1", "Heading 2"}   # styles that mark a new category
SUBCATEGORY_STYLES = {"Heading 3", "Heading 4"} # styles that mark a new subcategory


def normalize_phone(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 10:
        return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    if len(digits) == 11 and digits[0] == "1":
        d = digits[1:]
        return f"{d[:3]}-{d[3:6]}-{d[6:]}"
    return raw.strip() or None


def normalize_url(raw: str | None) -> str | None:
    if not raw:
        return None
    raw = raw.strip()
    if not raw:
        return None
    if not raw.startswith("http"):
        return f"https://{raw}"
    return raw


def parse_business_text(text: str) -> dict:
    """
    Parse a single business entry line into a structured dict.
    Handles common separators: |, ;, newlines within the paragraph.
    Extracts phone, email, website via regex; remainder is name + description.
    """
    phone_re = re.compile(r"(\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})")
    email_re = re.compile(r"[\w.\-+]+@[\w.\-]+\.\w+")
    url_re = re.compile(r"(?:https?://)?(?:www\.)?[\w\-]+\.(?:com|net|org|us|info|biz|co|io)(?:/\S*)?")

    phone_match = phone_re.search(text)
    email_match = email_re.search(text)

    # Find URL but exclude emails
    url_match = None
    for m in url_re.finditer(text):
        if "@" not in m.group():
            url_match = m
            break

    # Remove matched fields to isolate name/description
    remainder = text
    for m in filter(None, [phone_match, email_match, url_match]):
        remainder = remainder.replace(m.group(), "")

    # Clean separators and split name from description
    parts = re.split(r"[|\n;–—]+", remainder)
    parts = [p.strip() for p in parts if p.strip()]
    name = parts[0] if parts else text.strip()
    description = " ".join(parts[1:]) if len(parts) > 1 else None

    return {
        "name": name,
        "email": email_match.group() if email_match else None,
        "phone": normalize_phone(phone_match.group() if phone_match else None),
        "address": None,  # rarely in the bulletin board format
        "website": normalize_url(url_match.group() if url_match else None),
        "description": description,
        "services": [],
    }


def parse_docx(docx_path: str) -> list[dict]:
    doc = Document(docx_path)
    businesses = []
    current_category = ""
    current_subcategory = ""

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        style = para.style.name

        if style in CATEGORY_STYLES:
            current_category = text
            current_subcategory = ""
            continue

        if style in SUBCATEGORY_STYLES:
            current_subcategory = text
            continue

        # Everything else is a business entry
        if current_category:
            business = parse_business_text(text)
            business["category"] = current_category
            business["subcategory"] = current_subcategory or None
            business["image"] = None
            businesses.append(business)

    return businesses


def main():
    docx_path = Path(__file__).parent.parent.parent / "laundromat-bulletin-board.docx"
    businesses = parse_docx(str(docx_path))

    # Verification summary
    print(f"\n=== Parse Summary ===")
    print(f"Total businesses: {len(businesses)}")

    categories = {}
    for b in businesses:
        categories.setdefault(b["category"], 0)
        categories[b["category"]] += 1

    print(f"\nCategories ({len(categories)}):")
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count}")

    missing_phone = [b for b in businesses if not b["phone"]]
    missing_email = [b for b in businesses if not b["email"]]
    print(f"\nMissing phone: {len(missing_phone)}")
    print(f"Missing email: {len(missing_email)}")

    if missing_phone:
        print("  Samples:", [b["name"] for b in missing_phone[:5]])

    out_path = Path(__file__).parent.parent.parent / "src" / "data" / "directory.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(businesses, indent=2, ensure_ascii=False))
    print(f"\nWrote {len(businesses)} businesses to {out_path}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Run the tests**

```bash
pytest test_parse.py -v
```

Expected: all 4 tests pass.

- [ ] **Step 6: Run the parser against the real file**

```bash
python parse.py
```

Review the summary output. If categories look wrong (e.g., every paragraph became a category, or categories are empty), go back and correct `CATEGORY_STYLES` / `SUBCATEGORY_STYLES` based on what the inspection revealed in Task 1.

- [ ] **Step 7: Inspect the output**

```bash
python -c "
import json
data = json.load(open('../../src/data/directory.json'))
print(json.dumps(data[:3], indent=2))
"
```

Verify the first few records look correct — names are clean, phones are formatted, categories are right.

- [ ] **Step 8: Commit**

```bash
git add tools/parse-directory/ src/data/directory.json
git commit -m "feat: add docx parser and verified directory.json"
```

**GATE: Human reviews `src/data/directory.json` before Phase 2 starts. Phase 2 agents must not begin until this commit is merged and the JSON is approved.**

---

## Phase 2 — Parallel Sub-Agents

**Setup for each Phase 2 agent:** Each agent creates its own worktree from `main` before starting:

```bash
# Agent A example — repeat for B, C, D with their branch names
git worktree add ../arrowhead-shell feat/shell
cd ../arrowhead-shell
pnpm install
```

---

### Task 3 (Agent A): Shell & Nav

**Files:**
- Modify: `src/routes/+layout.svelte`
- Create: `src/routes/+layout.server.ts`
- Create: `src/lib/components/Nav.svelte`
- Create: `src/lib/components/HamburgerSheet.svelte`
- Create: `src/lib/components/ProfilePopover.svelte`

- [ ] **Step 1: Create the Nav component**

Create `src/lib/components/Nav.svelte`:

```svelte
<script lang="ts">
  import HamburgerSheet from './HamburgerSheet.svelte';
  import ProfilePopover from './ProfilePopover.svelte';

  let { user }: { user: { email: string } | null } = $props();
</script>

<nav class="flex h-14 items-center justify-between border-b px-4">
  <HamburgerSheet />
  <span class="text-sm font-semibold tracking-wide">Arrowhead Directory</span>
  <ProfilePopover {user} />
</nav>
```

- [ ] **Step 2: Create HamburgerSheet**

Create `src/lib/components/HamburgerSheet.svelte`. Uses shadcn-svelte Sheet (already installed via bits-ui):

```svelte
<script lang="ts">
  import { Sheet, SheetContent, SheetTrigger } from '$lib/components/ui/sheet/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Menu } from '@lucide/svelte';

  let open = $state(false);
</script>

<Sheet bind:open>
  <SheetTrigger>
    <Button variant="ghost" size="icon" aria-label="Open menu">
      <Menu class="h-5 w-5" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left" class="w-64">
    <nav class="mt-8 flex flex-col gap-2">
      <a
        href="/"
        onclick={() => (open = false)}
        class="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
      >
        Directory
      </a>
      <a
        href="/about"
        onclick={() => (open = false)}
        class="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
      >
        About
      </a>
    </nav>
  </SheetContent>
</Sheet>
```

- [ ] **Step 3: Create ProfilePopover**

Create `src/lib/components/ProfilePopover.svelte`. The login/logout form actions live on the root `+page.server.ts` and are submitted via `action="/?/sendMagicLink"` and `action="/?/signOut"` (added in Phase 3 / Task 9):

```svelte
<script lang="ts">
  import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Toggle } from '$lib/components/ui/toggle/index.js';
  import { User, Sun, Moon } from '@lucide/svelte';
  import { toggleMode, mode } from 'mode-watcher';

  let { user }: { user: { email: string } | null } = $props();
  let email = $state('');
  let sent = $state(false);
</script>

<Popover>
  <PopoverTrigger>
    <Button variant="ghost" size="icon" aria-label="Account">
      <User class="h-5 w-5" />
    </Button>
  </PopoverTrigger>
  <PopoverContent class="w-64" align="end">
    <div class="flex flex-col gap-4">
      <!-- Dark mode toggle -->
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">Dark mode</span>
        <Button variant="ghost" size="icon" onclick={toggleMode} aria-label="Toggle theme">
          {#if $mode === 'dark'}
            <Moon class="h-4 w-4" />
          {:else}
            <Sun class="h-4 w-4" />
          {/if}
        </Button>
      </div>

      <div class="border-t pt-3">
        {#if user}
          <p class="mb-3 truncate text-xs text-muted-foreground">{user.email}</p>
          <form method="POST" action="/?/signOut">
            <Button type="submit" variant="outline" class="w-full text-sm">Sign out</Button>
          </form>
        {:else if sent}
          <p class="text-sm text-muted-foreground">Check your email for a login link.</p>
        {:else}
          <form
            method="POST"
            action="/?/sendMagicLink"
            onsubmit={() => (sent = true)}
            class="flex flex-col gap-2"
          >
            <Label for="email" class="text-sm">Sign in with email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              bind:value={email}
              required
              class="text-sm"
            />
            <Button type="submit" class="w-full text-sm">Send link</Button>
          </form>
        {/if}
      </div>
    </div>
  </PopoverContent>
</Popover>
```

- [ ] **Step 4: Create the layout server load**

Create `src/routes/+layout.server.ts`:

```typescript
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  // locals.safeGetSession is added by the auth agent (Task 6)
  // Until auth lands, return null user — layout still renders fine
  const session = 'safeGetSession' in locals
    ? await (locals as any).safeGetSession()
    : { user: null };
  return { user: session.user ?? null };
};
```

- [ ] **Step 5: Update +layout.svelte**

Replace the contents of `src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import { ModeWatcher } from 'mode-watcher';
  import Nav from '$lib/components/Nav.svelte';

  let { children, data } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />
<div class="flex min-h-screen flex-col">
  <Nav user={data.user} />
  <main class="flex-1 px-4 py-6">
    {@render children()}
  </main>
</div>
```

- [ ] **Step 6: Start dev server and verify**

```bash
pnpm dev
```

Open http://localhost:5173. Verify:
- Nav bar appears with hamburger left and user icon right
- Hamburger opens a left sheet with Directory + About links
- User icon opens a popover with dark mode toggle and email form
- Dark mode toggle works
- No console errors

- [ ] **Step 7: Commit**

```bash
git add src/routes/+layout.svelte src/routes/+layout.server.ts src/lib/components/Nav.svelte src/lib/components/HamburgerSheet.svelte src/lib/components/ProfilePopover.svelte
git commit -m "feat: add nav shell with hamburger sheet and profile popover"
```

---

### Task 4 (Agent B): Directory Page

**Files:**
- Create: `src/lib/types.ts`
- Modify: `src/routes/+page.svelte`
- Create: `src/routes/+page.server.ts`
- Create: `src/lib/components/DirectoryTable.svelte`
- Create: `src/lib/components/FilterPopover.svelte`

- [ ] **Step 1: Create shared types**

Create `src/lib/types.ts`:

```typescript
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
  created_at?: string;
  updated_at?: string;
}
```

- [ ] **Step 2: Create the page server load**

Create `src/routes/+page.server.ts`:

```typescript
import type { PageServerLoad } from './$types';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Business } from '$lib/types';

export const load: PageServerLoad = async () => {
  const raw = readFileSync(resolve('src/data/directory.json'), 'utf-8');
  const businesses: Business[] = JSON.parse(raw);
  return { businesses };
};
```

- [ ] **Step 3: Create FilterPopover**

Create `src/lib/components/FilterPopover.svelte`:

```svelte
<script lang="ts">
  import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Checkbox } from '$lib/components/ui/checkbox/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { SlidersHorizontal } from '@lucide/svelte';

  let {
    categories,
    selectedCategories = $bindable([]),
  }: {
    categories: string[];
    selectedCategories: string[];
  } = $props();

  function toggle(cat: string) {
    if (selectedCategories.includes(cat)) {
      selectedCategories = selectedCategories.filter((c) => c !== cat);
    } else {
      selectedCategories = [...selectedCategories, cat];
    }
  }
</script>

<Popover>
  <PopoverTrigger>
    <Button variant="outline" size="icon" aria-label="Filter">
      <SlidersHorizontal class="h-4 w-4" />
    </Button>
  </PopoverTrigger>
  <PopoverContent class="w-64" align="end">
    <p class="mb-3 text-sm font-medium">Filter by category</p>
    <div class="flex max-h-64 flex-col gap-2 overflow-y-auto">
      {#each categories as cat (cat)}
        <div class="flex items-center gap-2">
          <Checkbox
            id={cat}
            checked={selectedCategories.includes(cat)}
            onCheckedChange={() => toggle(cat)}
          />
          <Label for={cat} class="cursor-pointer text-sm">{cat}</Label>
        </div>
      {/each}
    </div>
    {#if selectedCategories.length > 0}
      <Button
        variant="ghost"
        class="mt-3 w-full text-xs"
        onclick={() => (selectedCategories = [])}
      >
        Clear filters
      </Button>
    {/if}
  </PopoverContent>
</Popover>
```

- [ ] **Step 4: Create DirectoryTable**

Create `src/lib/components/DirectoryTable.svelte`:

```svelte
<script lang="ts">
  import { Input } from '$lib/components/ui/input/index.js';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/ui/table/index.js';
  import FilterPopover from './FilterPopover.svelte';
  import type { Business } from '$lib/types';

  let {
    businesses,
    user,
  }: {
    businesses: Business[];
    user: { email: string } | null;
  } = $props();

  let search = $state('');
  let selectedCategories = $state<string[]>([]);

  const categories = $derived([...new Set(businesses.map((b) => b.category))].sort());

  const filtered = $derived(
    businesses.filter((b) => {
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
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-center gap-2">
    <Input
      type="search"
      placeholder="Search businesses..."
      bind:value={search}
      class="max-w-sm"
    />
    <FilterPopover {categories} bind:selectedCategories />
    <span class="ml-auto text-sm text-muted-foreground">
      {filtered.length} of {businesses.length}
    </span>
  </div>

  <div class="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Business</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Website</TableHead>
          <TableHead class="w-16"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each filtered as business (business.id ?? business.name)}
          <TableRow>
            <TableCell class="font-medium">
              <div>{business.name}</div>
              {#if business.subcategories.length > 0}
                <div class="text-xs text-muted-foreground">{business.subcategories.join(', ')}</div>
              {/if}
            </TableCell>
            <TableCell class="text-sm">{business.category}</TableCell>
            <TableCell class="text-sm">{business.phones[0] ?? '—'}</TableCell>
            <TableCell class="text-sm">
              {#if business.website}
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary underline-offset-4 hover:underline"
                >
                  {new URL(business.website).hostname.replace('www.', '')}
                </a>
              {:else}
                —
              {/if}
            </TableCell>
            <TableCell>
              {#if user?.email && business.email && user.email === business.email}
                <span class="text-xs text-muted-foreground">Edit</span>
              {/if}
            </TableCell>
          </TableRow>
        {/each}
        {#if filtered.length === 0}
          <TableRow>
            <TableCell colspan={5} class="py-8 text-center text-muted-foreground">
              No businesses match your search.
            </TableCell>
          </TableRow>
        {/if}
      </TableBody>
    </Table>
  </div>
</div>
```

- [ ] **Step 5: Replace the root page**

Replace `src/routes/+page.svelte`:

```svelte
<script lang="ts">
  import DirectoryTable from '$lib/components/DirectoryTable.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>Arrowhead Directory</title>
</svelte:head>

<DirectoryTable businesses={data.businesses} user={data.user ?? null} />
```

- [ ] **Step 6: Start dev server and verify**

```bash
pnpm dev
```

Open http://localhost:5173. Verify:
- Table renders with businesses from the JSON file
- Typing in search filters results in real time
- Filter popover shows categories, checkboxes work, Clear resets
- Count updates as filters change
- Website links open correctly
- No console errors

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/routes/+page.svelte src/routes/+page.server.ts src/lib/components/DirectoryTable.svelte src/lib/components/FilterPopover.svelte
git commit -m "feat: add directory page with search and filter table"
```

---

### Task 5 (Agent C): About Page

**Files:**
- Create: `src/routes/about/+page.svelte`

- [ ] **Step 1: Create the about page**

Create `src/routes/about/+page.svelte`:

```svelte
<svelte:head>
  <title>About — Arrowhead Directory</title>
</svelte:head>

<div class="mx-auto max-w-prose">
  <h1 class="mb-6 text-2xl font-bold">About Arrowhead Directory</h1>

  <p class="mb-6 text-muted-foreground">
    Arrowhead Directory is a community-maintained listing of businesses and tradespeople
    in the Arrowhead region of Minnesota. It started as a bulletin board on the
    Laundromat Facebook group and grew into something the whole community could use.
  </p>

  <div class="mb-8 rounded-lg border p-6">
    <h2 class="mb-2 text-lg font-semibold">Chuck Heller — Primary Admin</h2>
    <p class="mb-4 text-sm text-muted-foreground">
      Chuck has been maintaining this directory and keeping the community connected.
    </p>
    <div class="flex flex-col gap-2 sm:flex-row">
      <a
        href="mailto:chuck@example.com"
        class="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
      >
        ✉ chuck@example.com
      </a>
      <a
        href="https://buymeacoffee.com/chuck"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-2 text-sm font-medium text-yellow-900 hover:bg-yellow-300"
      >
        ☕ Buy Chuck a coffee
      </a>
    </div>
  </div>

  <div class="rounded-lg border p-6">
    <h2 class="mb-2 text-lg font-semibold">Jack Sloan — Developer</h2>
    <p class="mb-4 text-sm text-muted-foreground">
      Built the site. Drinks 3 cracked pepper cortados a day. It's expensive.
    </p>
    <a
      href="https://buymeacoffee.com/jacksloan"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-2 text-sm font-medium text-yellow-900 hover:bg-yellow-300"
    >
      ☕ Buy Jack a coffee
    </a>
  </div>
</div>
```

> **Note:** Replace `chuck@example.com` and the Buy Me a Coffee URLs with Chuck's real contact info before going live.

- [ ] **Step 2: Start dev server and verify**

```bash
pnpm dev
```

Navigate to http://localhost:5173/about. Verify:
- Page renders with correct layout
- Both coffee links are present
- No console errors

- [ ] **Step 3: Commit**

```bash
git add src/routes/about/+page.svelte
git commit -m "feat: add about page with contact and coffee links"
```

---

### Task 6 (Agent D): Auth

**Files:**
- Modify: `src/app.d.ts`
- Create: `src/lib/supabase.ts`
- Create: `src/lib/server/supabase.ts`
- Create: `src/hooks.server.ts`
- Create: `src/routes/login/verify/+page.server.ts`

- [ ] **Step 1: Install Supabase packages**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Add environment variables**

Create `.env` (do not commit this file):

```
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from your Supabase project dashboard → Settings → API.

- [ ] **Step 3: Update app.d.ts**

Replace `src/app.d.ts`:

```typescript
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      safeGetSession(): Promise<{ session: Session | null; user: User | null }>;
    }
    interface PageData {
      session: Session | null;
      user: User | null;
    }
  }
}

export {};
```

- [ ] **Step 4: Create the browser Supabase client**

Create `src/lib/supabase.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
```

- [ ] **Step 5: Create the server Supabase client factory**

Create `src/lib/server/supabase.ts`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Cookies } from '@sveltejs/kit';

export function createSupabaseServerClient(cookies: Cookies) {
  return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookies.set(name, value, { ...options, path: '/' })
        );
      },
    },
  });
}
```

- [ ] **Step 6: Create hooks.server.ts**

Create `src/hooks.server.ts`:

```typescript
import { createSupabaseServerClient } from '$lib/server/supabase';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const supabaseHandle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createSupabaseServerClient(event.cookies);

  event.locals.safeGetSession = async () => {
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession();

    if (!session) return { session: null, user: null };

    const {
      data: { user },
      error,
    } = await event.locals.supabase.auth.getUser();

    if (error) return { session: null, user: null };

    return { session, user };
  };

  return resolve(event, {
    filterSerializedResponseHeaders: (name) =>
      name === 'content-range' || name === 'x-supabase-api-version',
  });
};

export const handle: Handle = sequence(supabaseHandle);
```

- [ ] **Step 7: Create the magic link verify callback**

Create `src/routes/login/verify/+page.server.ts`:

```typescript
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
  const code = url.searchParams.get('code');

  if (code) {
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
    if (!error) throw redirect(303, '/');
  }

  // Invalid or missing code — redirect home anyway
  throw redirect(303, '/');
};
```

- [ ] **Step 8: Update layout server load to use real session**

Update `src/routes/+layout.server.ts` (created by Agent A) to use the real session now that auth is available. If merging after Agent A, replace the file:

```typescript
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  return { user };
};
```

- [ ] **Step 9: Configure Supabase to redirect to the verify URL**

In your Supabase dashboard → Authentication → URL Configuration:
- Add `http://localhost:5173/login/verify` to Redirect URLs (for local dev)
- Add `https://your-production-domain.com/login/verify` (for production)

- [ ] **Step 10: Start dev server and verify**

```bash
pnpm dev
```

Open http://localhost:5173. Verify:
- Profile popover email form submits without error
- After submitting email, popover shows "Check your email" message
- Clicking the magic link in the email redirects to `/login/verify` and then to `/`
- After login, popover shows the user's email and a Sign out button
- Sign out clears the session and profile reverts to the login form

- [ ] **Step 11: Commit**

```bash
git add src/app.d.ts src/lib/supabase.ts src/lib/server/supabase.ts src/hooks.server.ts src/routes/login/ src/routes/+layout.server.ts
git commit -m "feat: add Supabase magic link auth with session middleware"
```

---

## Merge Order

After all Phase 2 agents are done:

```bash
# 1. Merge shell (A) and auth (D) first — these are the foundation
git checkout main
git merge feat/shell
git merge feat/auth

# 2. Merge directory page (B) — needs layout + session to be present
git merge feat/directory

# 3. Merge about page (C) — independent, merge any time
git merge feat/about

# 4. Run dev server and do a full pass
pnpm dev
```

Verify after merge: nav works, directory loads, search/filter work, auth flow works, about page renders, no type errors (`pnpm check`).

---

## Phase 3 — Inline Editing + Seed

**Branch:** `feat/editing` — create from `main` after Phase 2 is merged.

### Task 7: Supabase schema

Before writing code, create the `businesses` table in Supabase. Run this SQL in the Supabase dashboard → SQL editor:

```sql
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phones        text[]      default '{}',
  address text,
  website text,
  description text,
  category text not null,
  subcategories text[]      default '{}',
  services text[] default '{}',
  image text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Public read
create policy "public read" on businesses
  for select using (true);

-- Owner update
create policy "owner update" on businesses
  for update using (auth.jwt()->>'email' = email);

alter table businesses enable row level security;
```

- [ ] **Step 1: Run the SQL in Supabase dashboard**

Paste and run the SQL above. Verify the table appears in Table Editor.

---

### Task 8: Seed script

**Files:**
- Create: `tools/seed-supabase.ts`

- [ ] **Step 1: Install tsx for running TypeScript scripts**

```bash
pnpm add -D tsx
```

- [ ] **Step 2: Create the seed script**

Create `tools/seed-supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const raw = readFileSync(resolve('src/data/directory.json'), 'utf-8');
const businesses = JSON.parse(raw);

const { data, error } = await supabase
  .from('businesses')
  .upsert(businesses, { onConflict: 'name' })
  .select('id');

if (error) {
  console.error('Seed failed:', error.message);
  process.exit(1);
}

console.log(`Seeded ${data.length} businesses.`);
```

- [ ] **Step 3: Run the seed script**

Get your Supabase service role key from dashboard → Settings → API → service_role key.

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_KEY=your-service-role-key \
pnpm tsx tools/seed-supabase.ts
```

Expected: `Seeded N businesses.`

- [ ] **Step 4: Verify in Supabase Table Editor**

Open the `businesses` table in Supabase and confirm records are present with correct categories and phone numbers.

- [ ] **Step 5: Commit**

```bash
git add tools/seed-supabase.ts
git commit -m "feat: add Supabase seed script"
```

---

### Task 9: Update page to read from Supabase and add form actions

**Files:**
- Modify: `src/routes/+page.server.ts`

- [ ] **Step 1: Update page server load and add form actions**

Replace `src/routes/+page.server.ts`:

```typescript
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { businessSchema } from '$lib/schemas';

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  const { data: businesses, error } = await locals.supabase
    .from('businesses')
    .select('*')
    .order('category')
    .order('name');

  if (error) throw new Error(error.message);

  const form = await superValidate(zod(businessSchema));
  return { businesses: businesses ?? [], user, form };
};

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

    const form = await superValidate(request, zod(businessSchema));
    if (!form.valid) return fail(400, { form });

    const { id, ...fields } = form.data;

    const { error } = await locals.supabase
      .from('businesses')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('email', user.email); // RLS also enforces this server-side

    if (error) return fail(500, { form, message: error.message });
    return { form };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/+page.server.ts
git commit -m "feat: load businesses from Supabase, add auth + update actions"
```

---

### Task 10: Business edit schema and dialog

**Files:**
- Create: `src/lib/schemas.ts`
- Create: `src/lib/components/EditBusinessDialog.svelte`
- Modify: `src/lib/components/DirectoryTable.svelte`

- [ ] **Step 1: Install zod**

`sveltekit-superforms` requires `zod` as a peer dependency — install it explicitly:

```bash
pnpm add zod
```

- [ ] **Step 2: Create the Zod schema**

Create `src/lib/schemas.ts`:

```typescript
import { z } from 'zod';

export const businessSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().nullable().optional(),
  phones: z.array(z.string()).default([]),
  address: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().min(1),
  subcategories: z.array(z.string()).default([]),
  services: z.array(z.string()).default([]),
});
```

- [ ] **Step 3: Create EditBusinessDialog**

Create `src/lib/components/EditBusinessDialog.svelte`:

```svelte
<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zod } from 'sveltekit-superforms/adapters';
  import { businessSchema } from '$lib/schemas';
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
  import type { SuperValidated } from 'sveltekit-superforms';

  let {
    business,
    formData,
    open = $bindable(false),
  }: {
    business: Business;
    formData: SuperValidated<typeof businessSchema>;
    open: boolean;
  } = $props();

  const { form, errors, enhance, submitting } = superForm(formData, {
    validators: zod(businessSchema),
    onResult({ result }) {
      if (result.type === 'success') open = false;
    },
  });

  $effect(() => {
    if (open) {
      $form = {
        id: business.id!,
        name: business.name,
        email: business.email,
        phones: business.phones,
        address: business.address,
        website: business.website,
        description: business.description,
        category: business.category,
        subcategories: business.subcategories,
        services: business.services,
      };
    }
  });
</script>

<Dialog bind:open>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Edit listing</DialogTitle>
    </DialogHeader>

    <form method="POST" action="/?/updateBusiness" use:enhance class="flex flex-col gap-4">
      <input type="hidden" name="id" bind:value={$form.id} />
      <input type="hidden" name="category" bind:value={$form.category} />

      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2 flex flex-col gap-1.5">
          <Label for="name">Business name</Label>
          <Input id="name" name="name" bind:value={$form.name} />
          {#if $errors.name}<p class="text-xs text-destructive">{$errors.name}</p>{/if}
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="phones">Phone numbers</Label>
          <Input id="phones" name="phones" bind:value={$form.phones} placeholder="218-555-0101, 218-555-0202" />
          <p class="text-xs text-muted-foreground">Comma-separated</p>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="website">Website</Label>
          <Input id="website" name="website" bind:value={$form.website} />
          {#if $errors.website}<p class="text-xs text-destructive">{$errors.website}</p>{/if}
        </div>

        <div class="col-span-2 flex flex-col gap-1.5">
          <Label for="address">Address</Label>
          <Input id="address" name="address" bind:value={$form.address} />
        </div>

        <div class="col-span-2 flex flex-col gap-1.5">
          <Label for="description">Description</Label>
          <Textarea id="description" name="description" rows={3} bind:value={$form.description} />
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
```

- [ ] **Step 4: Wire Edit button into DirectoryTable**

Update `src/lib/components/DirectoryTable.svelte` — add the dialog import, an `editingBusiness` state variable, a `formData` prop, and replace the placeholder Edit cell:

```svelte
<script lang="ts">
  import { Input } from '$lib/components/ui/input/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/ui/table/index.js';
  import FilterPopover from './FilterPopover.svelte';
  import EditBusinessDialog from './EditBusinessDialog.svelte';
  import type { Business } from '$lib/types';
  import type { SuperValidated } from 'sveltekit-superforms';
  import { businessSchema } from '$lib/schemas';

  let {
    businesses,
    user,
    formData,
  }: {
    businesses: Business[];
    user: { email: string } | null;
    formData: SuperValidated<typeof businessSchema>;
  } = $props();

  let search = $state('');
  let selectedCategories = $state<string[]>([]);
  let editingBusiness = $state<Business | null>(null);
  let dialogOpen = $state(false);

  const categories = $derived([...new Set(businesses.map((b) => b.category))].sort());

  const filtered = $derived(
    businesses.filter((b) => {
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

  function openEdit(business: Business) {
    editingBusiness = business;
    dialogOpen = true;
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-center gap-2">
    <Input
      type="search"
      placeholder="Search businesses..."
      bind:value={search}
      class="max-w-sm"
    />
    <FilterPopover {categories} bind:selectedCategories />
    <span class="ml-auto text-sm text-muted-foreground">
      {filtered.length} of {businesses.length}
    </span>
  </div>

  <div class="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Business</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Website</TableHead>
          <TableHead class="w-16"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each filtered as business (business.id ?? business.name)}
          <TableRow>
            <TableCell class="font-medium">
              <div>{business.name}</div>
              {#if business.subcategories.length > 0}
                <div class="text-xs text-muted-foreground">{business.subcategories.join(', ')}</div>
              {/if}
            </TableCell>
            <TableCell class="text-sm">{business.category}</TableCell>
            <TableCell class="text-sm">{business.phones[0] ?? '—'}</TableCell>
            <TableCell class="text-sm">
              {#if business.website}
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary underline-offset-4 hover:underline"
                >
                  {new URL(business.website).hostname.replace('www.', '')}
                </a>
              {:else}
                —
              {/if}
            </TableCell>
            <TableCell>
              {#if user?.email && business.email && user.email === business.email}
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-7 px-2 text-xs"
                  onclick={() => openEdit(business)}
                >
                  Edit
                </Button>
              {/if}
            </TableCell>
          </TableRow>
        {/each}
        {#if filtered.length === 0}
          <TableRow>
            <TableCell colspan={5} class="py-8 text-center text-muted-foreground">
              No businesses match your search.
            </TableCell>
          </TableRow>
        {/if}
      </TableBody>
    </Table>
  </div>
</div>

{#if editingBusiness}
  <EditBusinessDialog
    business={editingBusiness}
    {formData}
    bind:open={dialogOpen}
  />
{/if}
```

- [ ] **Step 5: Pass formData through the page**

Update `src/routes/+page.svelte` to pass `formData` down:

```svelte
<script lang="ts">
  import DirectoryTable from '$lib/components/DirectoryTable.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>Arrowhead Directory</title>
</svelte:head>

<DirectoryTable businesses={data.businesses} user={data.user ?? null} formData={data.form} />
```

- [ ] **Step 6: Start dev server and test the full edit flow**

```bash
pnpm dev
```

1. Sign in via the profile popover
2. Navigate to the directory — find a row whose email matches your login email
3. Verify the Edit button is visible on that row only
4. Click Edit — modal opens with pre-filled fields
5. Change the description, click Save
6. Verify the row updates (page reloads with new data)
7. Sign out — Edit button disappears from all rows

- [ ] **Step 7: Run type check**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/schemas.ts src/lib/components/EditBusinessDialog.svelte src/lib/components/DirectoryTable.svelte src/routes/+page.svelte
git commit -m "feat: add inline edit dialog for business owners"
```

---

## Final Merge

```bash
git checkout main
git merge feat/editing
pnpm check
pnpm build
```

Verify build succeeds. Deploy to Vercel: `git push origin main`.
