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
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import Link from '@lucide/svelte/icons/link';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import { browser } from '$app/environment';
	import BusinessProfileDialog from './BusinessProfileDialog.svelte';
	import SuggestEditDialog from './SuggestEditDialog.svelte';
	import type { Business } from '$lib/types';

	let {
		filtered,
		user,
		onedit,
		isAdmin = false
	}: {
		filtered: Business[];
		user: { email: string | null } | null;
		onedit: (b: Business) => void;
		isAdmin: boolean;
	} = $props();

	let sorting = $state<SortingState>([{ id: 'name', desc: false }]);
	let copied = $state<string | null>(null);
	let selectedBusiness = $state<Business | null>(null);
	let profileOpen = $state(false);

	function openProfile(b: Business) {
		selectedBusiness = b;
		profileOpen = true;
	}

	let suggestingBusiness = $state<Business | null>(null);
	let suggestOpen = $state(false);

	function openSuggest(b: Business) {
		suggestingBusiness = b;
		suggestOpen = true;
	}

	$effect(() => {
		if (selectedBusiness && !filtered.some((b) => b.id === selectedBusiness!.id)) {
			profileOpen = false;
			selectedBusiness = null;
		}
	});

	const columns: ColumnDef<Business>[] = [
		{ id: 'name', accessorKey: 'name', header: 'Business', enableSorting: true },
		{ id: 'details', header: 'Details', enableSorting: false, accessorFn: () => '' }
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

{#if selectedBusiness}
	{@const isOwnerOfSelected = user?.email && selectedBusiness.email && user.email === selectedBusiness.email}
	<BusinessProfileDialog
		business={selectedBusiness}
		bind:open={profileOpen}
		onedit={(isAdmin || isOwnerOfSelected) ? onedit : undefined}
		onsuggestedit={(user && !isAdmin && !isOwnerOfSelected) ? openSuggest : undefined}
	/>
{/if}

{#if suggestingBusiness}
	<SuggestEditDialog business={suggestingBusiness} bind:open={suggestOpen} />
{/if}

<div class="overflow-x-auto rounded-md border">
	<Table class="table-fixed">
		<TableHeader>
			{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
				<TableRow>
					{#each headerGroup.headers as header (header.id)}
						<TableHead class="w-1/2">
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
					<TableCell colspan={2} class="py-12 text-center text-sm text-muted-foreground">
						No businesses match your search.
					</TableCell>
				</TableRow>
			{:else}
				{#each table.getRowModel().rows as row (row.id)}
					{@const business = row.original}
					{@const isOwner = user?.email && business.email && user.email === business.email}
					{@const emailKey = business.id ?? business.name}
					<TableRow
						class="group cursor-pointer"
						onclick={() => openProfile(business)}
					>
						<!-- Name + service pills -->
						<TableCell class="overflow-hidden">
							<div class="flex items-center gap-2">
								<p class="truncate text-sm font-medium leading-snug underline-offset-2 group-hover:underline">{business.name}</p>
								{#if isOwner || isAdmin}
									<button
										class="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/80"
										onclick={(e) => { e.stopPropagation(); onedit(business); }}
									>Edit</button>
								{/if}
							</div>
							{#if business.services.length > 0}
								<div class="mt-0.5 flex flex-nowrap gap-1 overflow-hidden">
									{#each business.services.slice(0, 2) as svc (svc.id)}
										<span class="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] leading-tight text-muted-foreground">{svc.name}</span>
									{/each}
									{#if business.services.length > 2}
										<span class="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] leading-tight text-muted-foreground">+{business.services.length - 2} more</span>
									{/if}
								</div>
							{/if}
						</TableCell>

						<!-- Details: phone, email, website -->
						<TableCell class="w-1/2">
							<div class="flex flex-col gap-1">
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
										<button
											class="shrink-0 rounded border border-border px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
											aria-label="Copy email"
											onclick={(e) => { e.stopPropagation(); copyEmail(business); }}
										>
											{#if copied === emailKey}
												<Check class="inline h-3 w-3 text-green-500" />
											{:else}
												<Copy class="inline h-3 w-3" />
											{/if}
										</button>
									</div>
								{/if}
								{#if business.website}
									<a
										href={business.website}
										target="_blank"
										rel="noopener noreferrer"
										class="flex items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline"
										onclick={(e) => e.stopPropagation()}
									>
										<Link class="h-3 w-3 shrink-0" />
										<span class="truncate">{hostname(business.website)}</span>
										<ExternalLink class="h-3 w-3 shrink-0 opacity-60" />
									</a>
								{/if}
							</div>
						</TableCell>
					</TableRow>
				{/each}
			{/if}
		</TableBody>
	</Table>
</div>
