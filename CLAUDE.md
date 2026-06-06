## Project Configuration

- **Language**: TypeScript
- **Framework**: Svelte 5 + SvelteKit (adapter-vercel)
- **Package Manager**: pnpm
- **UI Library**: shadcn-svelte (built on bits-ui)
- **Styling**: Tailwind CSS v4
- **Icons**: @lucide/svelte
- **Forms**: sveltekit-superforms + formsnap + zod
- **Database**: Supabase (postgres)
- **Supabase client**: @supabase/supabase-js + @supabase/ssr

No ORM — queries go through the Supabase JS client directly. The `businesses` table is the primary data model (see `src/lib/types.ts` for the `Business` interface).

---

## MCP Servers

Two MCP servers are configured in `.mcp.json`:

### Supabase MCP

Connected to project `ezmlamaygevdbkogjbvu`. Use it to:
- Execute SQL (`execute_sql`) for queries, seed operations, or schema inspection
- List tables (`list_tables`) to understand schema
- Apply migrations (`apply_migration`) for DDL changes
- Get logs and advisors for debugging

Prefer `execute_sql` over running the seed script when the service role key isn't available locally.

### Svelte MCP

Use it for Svelte 5 / SvelteKit documentation. Tools:

**1. list-sections** — call FIRST to discover relevant docs. Returns titles, use_cases, and paths.

**2. get-documentation** — fetch full docs for one or more sections. After `list-sections`, fetch ALL sections relevant to the task.

**3. svelte-autofixer** — analyzes Svelte code and returns issues. Call before finalizing any Svelte component. Keep calling until no issues remain.

**4. playground-link** — generates a Svelte Playground URL. Only call after user confirms, and never when code has already been written to project files.

---

## Key patterns

- Components live in `src/lib/components/`. UI primitives (Button, Input, Dialog, etc.) are shadcn-svelte components in `src/lib/components/ui/`.
- Use `$state`, `$derived`, `$effect`, and `$props()` — this is Svelte 5 runes syntax throughout.
- `SvelteMap` / `SvelteSet` (from `svelte/reactivity`) for reactive collections.
- Supabase client is available via `locals.supabase` in server load/action functions (see `src/hooks.server.ts`).
- Auth uses Supabase magic link. Session is available on `locals.session`.
- Forms use sveltekit-superforms with zod schemas and formsnap for accessible field bindings.
- Tailwind v4 — no `tailwind.config.js`; config lives in CSS via `@theme` directives.
