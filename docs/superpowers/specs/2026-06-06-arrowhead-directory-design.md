# Arrowhead Directory — Design Spec

**Date:** 2026-06-06  
**Status:** Approved

---

## Overview

A simple, responsive directory of businesses and tradespeople in the Arrowhead region, sourced from the Laundromat Bulletin Board Facebook group. Users browse and search the directory publicly; registered business owners can edit their own listing via magic-link auth.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 (runes mode) |
| UI | shadcn-svelte + Tailwind v4 |
| Auth + DB | Supabase JS client (no Prisma) |
| Forms | sveltekit-superforms |
| Deploy | Vercel (adapter-vercel) |

---

## Data Model

### `businesses` table (Supabase / Postgres)

```sql
id            uuid        primary key  default gen_random_uuid()
name          text        not null
email         text
phones        text[]      default '{}'
address       text
website       text
description   text
category      text        not null
subcategories text[]      default '{}'
services      text[]      default '{}'
image         text
created_at    timestamptz default now()
updated_at    timestamptz default now()
```

**RLS policies:**
- `SELECT` — public (anyone)
- `UPDATE` — `auth.jwt()->>'email' = email` (owner only)

No `business_services` or `business_metadata` tables — dropped for MVP. Dynamic per-category metadata fields are a future enhancement.

**Schema decisions:**
- `phones text[]` — captures all phone numbers per listing (primary at index 0, secondary at index 1+)
- `subcategories text[]` — a business may appear under multiple subcategories (e.g. a contractor listed under Excavating, Septic, and Landscaping); one row per business, not one row per subcategory

### JSON contract (`src/data/directory.json`)

Produced by the Phase 1 parser; consumed by Phase 2 agents and the seed script.

```json
[
  {
    "name": "Ace Plumbing",
    "email": "ace@example.com",
    "phones": ["218-555-0101", "218-555-0202"],
    "address": "123 Main St, Ely MN",
    "website": "https://aceplumbing.com",
    "description": "Full service plumbing...",
    "category": "HOME SERVICES",
    "subcategories": ["Plumbing", "Water Heaters"],
    "services": [],
    "image": null
  }
]
```

---

## Routes

```
src/routes/
  +layout.svelte          ← nav shell
  +page.svelte            ← directory (home)
  +page.server.ts         ← loads businesses (JSON in Phase 1, Supabase in Phase 2)
  about/
    +page.svelte          ← about page
  login/
    verify/
      +page.svelte        ← Supabase magic link callback handler
```

---

## Layout / Nav

- **Left:** hamburger icon → slide-in sheet with navigation links (Home, About)
- **Right:** profile icon → popover containing:
  - Magic link email input (when logged out)
  - Dark mode toggle (always visible, powered by `mode-watcher`)
  - Sign out + user email display (when logged in)

No standalone `/login` page — auth lives entirely in the profile popover.

---

## Directory Page

- **Load:** `+page.server.ts` reads `src/data/directory.json` (Phase 1) or queries Supabase (Phase 2)
- **Search:** single search bar, client-side reactive filter across name, category, subcategories, description — no server round-trips (dataset small enough)
- **Filter:** filter icon beside search opens a shadcn Popover with category checkboxes (subcategories are too numerous for a checkbox list)
- **Display:** shadcn Table with columns: Business (name + subcategories as tags), Category, Phone (first phone), Website, Edit
- **Edit button:** visible only on rows where `row.email && row.email === session?.user?.email`; clicking opens a centered shadcn Dialog modal with all editable fields, submitted via a superforms form action

---

## Auth Flow

- Profile popover → email input → `signInWithOtp()` → "check your email" confirmation state
- Supabase redirects to `/login/verify` with token → `exchangeCodeForSession()` → redirect to `/`
- Session stored in cookie via Supabase SSR helpers; available in all `+page.server.ts` load functions

---

## About Page

- Chuck Heller's email address
- Buy Chuck a coffee link
- Buy Jack a coffee link (3 cracked pepper cortados a day, it's expensive)

---

## Sub-agent Implementation Plan

### Phase 1 — Parser (sequential, blocks Phase 2)

**1 agent:** Read `laundromat-bulletin-board.docx`, extract all businesses into `src/data/directory.json` matching the JSON contract above. Print verification summary: total count, records missing phone/email, categories found, any malformed records. Human reviews JSON before Phase 2 starts.

Script lives at `tools/parse-directory/parse.py`.

### Phase 2 — Four parallel agents (worktree-isolated)

All four start after JSON is approved. Each works in an isolated git worktree.

| Agent | Branch | Scope |
|---|---|---|
| **A — Shell & Nav** | `feat/shell` | `+layout.svelte`, hamburger sheet, profile icon + popover (magic link form, dark mode toggle, sign-out), `mode-watcher` integration, routing skeleton |
| **B — Directory page** | `feat/directory` | `+page.svelte` + `+page.server.ts`, loads from JSON, shadcn Table, client-side search + filter popover, Edit button (hidden when no session or email mismatch) |
| **C — About page** | `feat/about` | `/about/+page.svelte`, Chuck's email, coffee links, minimal prose layout |
| **D — Auth** | `feat/auth` | `src/lib/supabase.ts` client setup, magic link send action, `/login/verify` callback, session cookie via Supabase SSR helpers |

**Merge order:** A and D first (shell + auth needed as foundation), then B (needs layout + session), C any time.

### Phase 3 — Inline editing (after A + B + D merged)

**1 agent:** Add edit modal to directory page — shadcn Dialog, superforms form action for UPDATE, Supabase client write (RLS enforces ownership). Also adds `tools/seed-supabase.ts` that reads `src/data/directory.json` and upserts all records into Supabase.

---

## Simplifications vs. Original PLAN.md

| Original | This spec |
|---|---|
| Prisma ORM | Dropped — Supabase JS client directly |
| `business_services` table | Dropped — `services text[]` column on `businesses` |
| `business_metadata` dynamic table | Dropped — plain `description` text field for MVP |
| Separate `/login` page | Replaced by profile icon popover in nav |
| "Backend API" routes | Replaced by SvelteKit form actions + superforms |
| Super admin role | Deferred — not needed for MVP |

---

## Out of Scope (MVP)

- Business suggestion submissions
- Feature suggestion / voting system
- Super admin role
- Per-category dynamic metadata fields
- Business image uploads
