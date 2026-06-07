# Arrowhead Business Directory

A community business directory for the Arrowhead neighborhood.

**Live site:** https://arrowhead-directory.vercel.app

---

## Architecture

```
  Browser
    │
    ▼
┌─────────────────────────┐
│  Vercel                 │
│  (SvelteKit + adapter)  │
│                         │
│  • Hosts the app        │
│  • Runs server routes   │
│  • Preview URLs per PR  │
│                         │
│  Deploy: push to main   │
└────────────┬────────────┘
             │ Supabase JS client
             ▼
┌─────────────────────────┐
│  Supabase               │
│  (Postgres + Auth)      │
│                         │
│  • businesses table     │
│  • admins table         │
│  • suggested_edits      │
│  • feature_requests     │
│  • Auth (magic link)    │
└─────────────────────────┘
```

Deploys are automatic — every push to `main` triggers a production deploy on Vercel. Pull requests get a preview URL automatically.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) — `npm install -g pnpm`

### 1. Clone and install

```sh
git clone https://github.com/jacksloan/arrowhead-directory.git
cd arrowhead-directory
pnpm install
```

### 2. Set up environment variables

Create a `.env.local` file in the project root:

```sh
PUBLIC_SUPABASE_URL=https://ezmlamaygevdbkogjbvu.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<get from Supabase dashboard → Settings → API>
```

Ask a team member for the anon key, or find it in the [Supabase project settings](https://supabase.com/dashboard/project/ezmlamaygevdbkogjbvu/settings/api).

### 3. Start the dev server

```sh
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Project Structure

```
src/
  lib/
    components/       # Svelte components (UI + directory-specific)
    components/ui/    # shadcn-svelte primitives (Button, Input, Dialog, …)
    server/           # Server-only utilities (admin check, etc.)
    utils/            # Shared utilities (pdf.ts, …)
    types.ts          # Shared TypeScript types
  routes/
    +page.svelte      # Main directory page
    admin/            # Admin management (admins only)
    pending/          # Pending approvals (admins only)
    suggested-edits/  # Suggested edit review (admins only)
    features/         # Feature requests (public + voting)
    about/
    how-to/
```

## Key Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server at localhost:5173 |
| `pnpm build` | Production build |
| `pnpm check` | TypeScript + Svelte type check |
| `pnpm lint` | ESLint + Prettier check |
| `pnpm format` | Auto-format with Prettier |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | SvelteKit (Svelte 5 runes) |
| Styling | Tailwind CSS v4 |
| UI components | shadcn-svelte |
| Database + Auth | Supabase (Postgres, magic-link auth) |
| Hosting | Vercel |
| Forms | sveltekit-superforms + zod |
