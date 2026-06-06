<script lang="ts">
	import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table/index.js';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table/index.js';
	import {
		getCoreRowModel,
		getSortedRowModel,
		type ColumnDef,
		type SortingState
	} from '@tanstack/table-core';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import type { Business } from '$lib/types';

	let {
		filtered,
		user,
		onedit
	}: {
		filtered: Business[];
		user: { email: string | null } | null;
		onedit: (b: Business) => void;
	} = $props();

	let sorting = $state<SortingState>([{ id: 'name', desc: false }]);
	let copied = $state<string | null>(null);

	const columns: ColumnDef<Business>[] = [
		{ id: 'name', accessorKey: 'name', header: 'Business', enableSorting: true },
		{ id: 'category', accessorKey: 'category', header: 'Category', enableSorting: true },
		{ id: 'phones', header: 'Phone', enableSorting: false, accessorFn: (b) => b.phones[0] ?? '' },
		{ id: 'email', header: 'Email', enableSorting: false, accessorFn: (b) => b.email ?? '' },
		{ id: 'website', header: 'Website', enableSorting: false, accessorFn: (b) => b.website ?? '' },
		{ id: 'edit', header: '', enableSorting: false, accessorFn: () => '' }
	];

	const table = createSvelteTable({
		get data() {
			return filtered;
		},
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: (updater) => {
			sorting = typeof updater === 'function' ? updater(sorting) : updater;
		},
		get state() {
			return { sorting };
		}
	});

	function emailParts(email: string): [string, string] {
		const at = email.indexOf('@');
		return [email.slice(0, at), email.slice(at + 1)];
	}

	function copyEmail(business: Business) {
		if (!business.email) return;
		navigator.clipboard.writeText(business.email).then(() => {
			copied = business.id ?? business.name;
			setTimeout(() => (copied = null), 1800);
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

<div class="rounded-md border">
	<Table>
		<TableHeader>
			{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
				<TableRow>
					{#each headerGroup.headers as header (header.id)}
						<TableHead class={header.id === 'edit' ? 'w-10' : ''}>
							{#if header.column.getCanSort()}
								<button
									class="flex items-center gap-1 hover:text-foreground"
									onclick={header.column.getToggleSortingHandler()}
								>
									<FlexRender
										content={header.column.columnDef.header}
										context={header.getContext()}
									/>
									{#if header.column.getIsSorted() === 'asc'}
										<ChevronUp class="h-3 w-3" />
									{:else if header.column.getIsSorted() === 'desc'}
										<ChevronDown class="h-3 w-3" />
									{:else}
										<ChevronsUpDown class="h-3 w-3 opacity-40" />
									{/if}
								</button>
							{:else}
								<FlexRender
									content={header.column.columnDef.header}
									context={header.getContext()}
								/>
							{/if}
						</TableHead>
					{/each}
				</TableRow>
			{/each}
		</TableHeader>
		<TableBody>
			{#if table.getRowModel().rows.length === 0}
				<TableRow>
					<TableCell colspan={6} class="py-12 text-center text-sm text-muted-foreground">
						No businesses match your search.
					</TableCell>
				</TableRow>
			{:else}
				{#each table.getRowModel().rows as row (row.id)}
					{@const business = row.original}
					{@const isOwner = user?.email && business.email && user.email === business.email}
					{@const emailKey = business.id ?? business.name}
					<TableRow>
						<!-- Name + subcategory pills -->
						<TableCell>
							<p class="text-sm font-medium leading-snug">{business.name}</p>
							{#if business.subcategories.length > 0}
								<div class="mt-1 flex flex-wrap gap-1">
									{#each business.subcategories as sub (sub)}
										<span
											class="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] leading-tight text-muted-foreground"
											>{sub}</span
										>
									{/each}
								</div>
							{/if}
						</TableCell>

						<!-- Category -->
						<TableCell class="whitespace-nowrap text-sm text-muted-foreground">
							{business.category}
						</TableCell>

						<!-- Phone -->
						<TableCell>
							{#if business.phones[0]}
								<a
									href="tel:{business.phones[0].replace(/\D/g, '')}"
									class="whitespace-nowrap text-sm underline-offset-2 hover:underline"
								>
									{business.phones[0]}
								</a>
							{:else}
								<span class="text-muted-foreground/40">—</span>
							{/if}
						</TableCell>

						<!-- Email (obfuscated) -->
						<TableCell>
							{#if business.email}
								{@const [u, d] = emailParts(business.email)}
								<div class="flex items-center gap-1.5">
									<button
										class="whitespace-nowrap text-sm underline-offset-2 hover:underline"
										title="Open email client"
										onclick={() => {
											window.location.href = `mailto:${business.email}`;
										}}
									>{u} [at] {d}</button>
									<button
										class="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
										aria-label="Copy email"
										onclick={() => copyEmail(business)}
									>
										{#if copied === emailKey}
											<Check class="inline h-3 w-3 text-green-500" />
										{:else}
											<Copy class="inline h-3 w-3" />
										{/if}
									</button>
								</div>
							{:else}
								<span class="text-muted-foreground/40">—</span>
							{/if}
						</TableCell>

						<!-- Website -->
						<TableCell>
							{#if business.website}
								<a
									href={business.website}
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-0.5 whitespace-nowrap text-sm text-primary underline-offset-2 hover:underline"
								>
									{hostname(business.website)}
									<ExternalLink class="h-3 w-3 shrink-0 opacity-60" />
								</a>
							{:else}
								<span class="text-muted-foreground/40">—</span>
							{/if}
						</TableCell>

						<!-- Edit -->
						<TableCell class="text-right">
							{#if isOwner}
								<button
									class="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/80"
									onclick={() => onedit(business)}
								>Edit</button>
							{/if}
						</TableCell>
					</TableRow>
				{/each}
			{/if}
		</TableBody>
	</Table>
</div>
