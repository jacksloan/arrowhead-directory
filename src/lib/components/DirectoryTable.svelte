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
    businesses
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

  function hostname(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
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
                  {hostname(business.website)}
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
