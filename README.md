# Arrowhead Business Directory

A community business directory for the Arrowhead region.

**Live site:** https://arrowhead.directory

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

---

## Contributing

Contributions are welcome! Before you write any code, please **open an issue** to describe what you'd like to change or add. This keeps effort from going to waste — if something isn't planned or doesn't fit the direction of the project, it's much better to find that out before you spend time building it.

Once your idea has been discussed and given the thumbs up, fork the repo, make your changes, and open a pull request.

### Commit format

We use [Conventional Commits](https://www.conventionalcommits.org/). Every commit message should follow this pattern:

```
<type>(<optional scope>): <short description>

<optional body>
```

**Types:**

| Type | When to use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace — no logic change |
| `refactor` | Code change that isn't a fix or feature |
| `chore` | Dependency updates, tooling, config |
| `revert` | Reverting a previous commit |

**Examples:**

```
feat: add business search by phone number
fix: prevent duplicate votes on feature requests
docs: update getting started guide
chore: upgrade jspdf to 5.0
```

Keep the description lowercase, imperative ("add", not "added" or "adds"), and under 72 characters. If more context is needed, add it in the commit body.
