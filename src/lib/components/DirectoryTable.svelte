<script lang="ts">
	import { browser } from '$app/environment';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table/index.js';
	import FilterPopover from './FilterPopover.svelte';
	import DirectoryCardView from './DirectoryCardView.svelte';
	import DirectoryTreeView from './DirectoryTreeView.svelte';
	import Table2 from '@lucide/svelte/icons/table-2';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import List from '@lucide/svelte/icons/list';
	import type { Business } from '$lib/types';

	let {
		businesses,
		user
	}: {
		businesses: Business[];
		user: { email: string | null } | null;
	} = $props();

	type View = 'table' | 'card' | 'tree';
	const VIEWS: { id: View; label: string; Icon: typeof Table2 }[] = [
		{ id: 'table', label: 'Table view', Icon: Table2 },
		{ id: 'card', label: 'Card view', Icon: LayoutGrid },
		{ id: 'tree', label: 'Tree view', Icon: List }
	];

	const stored = browser ? (localStorage.getItem('directory-view') as View | null) : null;
	let view = $state<View>(stored ?? 'table');

	$effect(() => {
		if (browser) localStorage.setItem('directory-view', view);
	});

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

	const searching = $derived(search.length > 0 || selectedCategories.length > 0);

	function hostname(url: string): string {
		try {
			return new URL(url).hostname.replace(/^www\./, '');
		} catch {
			return url;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<!-- Toolbar -->
	<div class="flex items-center gap-2">
		<Input type="search" placeholder="Search businesses..." bind:value={search} class="max-w-sm" />
		<FilterPopover {categories} bind:selectedCategories />
		<span class="ml-auto text-sm text-muted-foreground">
			{filtered.length} of {businesses.length}
		</span>
		<!-- View switcher -->
		<div class="flex items-center rounded-md border bg-muted p-0.5">
			{#each VIEWS as { id, label, Icon }}
				<button
					class="flex h-7 w-7 items-center justify-center rounded-sm transition-colors
						{view === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
					aria-label={label}
					aria-pressed={view === id}
					onclick={() => (view = id)}
				>
					<Icon class="h-3.5 w-3.5" />
				</button>
			{/each}
		</div>
	</div>

	<!-- Table view -->
	{#if view === 'table'}
		<div class="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Business</TableHead>
						<TableHead>Phone</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Website</TableHead>
						<TableHead class="w-16"></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each filtered as business (business.id ?? business.name)}
						<TableRow>
							<TableCell class="font-medium">
								<div class="max-w-75 truncate">{business.name}</div>
								{#if business.subcategories.length > 0}
									<div class="text-xs text-muted-foreground">
										{business.subcategories.join(', ')}
									</div>
								{/if}
							</TableCell>
							<TableCell class="text-sm">{business.phones[0] ?? '—'}</TableCell>
							<TableCell class="text-sm">{business.email ?? '—'}</TableCell>
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
	{:else if view === 'card'}
		<DirectoryCardView {filtered} {user} />
	{:else}
		<DirectoryTreeView {filtered} {user} {searching} />
	{/if}
</div>
