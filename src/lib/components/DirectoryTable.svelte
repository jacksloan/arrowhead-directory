<script lang="ts">
	import { browser } from '$app/environment';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FilterPopover from './FilterPopover.svelte';
	import DirectoryCardView from './DirectoryCardView.svelte';
	import DirectoryTableView from './DirectoryTableView.svelte';
	import EditBusinessDialog from './EditBusinessDialog.svelte';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import LayoutList from '@lucide/svelte/icons/layout-list';
	import {
		Tooltip,
		TooltipContent,
		TooltipTrigger
	} from '$lib/components/ui/tooltip/index.js';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger,
	} from '$lib/components/ui/dropdown-menu/index.js';
	import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
	import FileDown from '@lucide/svelte/icons/file-down';
	import { downloadDirectoryPdf } from '$lib/utils/pdf';
	import type { Business } from '$lib/types';

	let {
		businesses,
		user,
		formData,
		isAdmin = false
	}: {
		businesses: Business[];
		user: { email: string | null } | null;
		formData: any;
		isAdmin: boolean;
	} = $props();

	let editingBusiness = $state<Business | null>(null);
	let dialogOpen = $state(false);
	let deletedIds = $state(new Set<string>());

	function openEdit(b: Business) {
		editingBusiness = b;
		dialogOpen = true;
	}

	function handleDelete(id: string) {
		deletedIds.add(id);
		dialogOpen = false;
	}

	const activeBusinesses = $derived(businesses.filter((b) => !deletedIds.has(b.id ?? '')));

	type View = 'compact' | 'full';
	const VIEWS: { id: View; label: string; Icon: typeof LayoutGrid }[] = [
		{ id: 'compact', label: 'Grid view', Icon: LayoutGrid },
		{ id: 'full', label: 'List view', Icon: LayoutList }
	];

	const stored = browser ? (localStorage.getItem('directory-view') as View | null) : null;
	let view = $state<View>(stored === 'compact' || stored === 'full' ? stored : 'compact');

	$effect(() => {
		if (browser) localStorage.setItem('directory-view', view);
	});

	let search = $state('');
	let selectedCategories = $state<string[]>([]);

	const categories = $derived([...new Set(activeBusinesses.map((b) => b.category))].sort());

	const filtered = $derived(
		activeBusinesses
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
</script>

<div class="flex flex-col gap-4">
	<!-- Toolbar -->
	<div class="flex items-center gap-2">
		<Input type="search" placeholder="Search businesses..." bind:value={search} class="max-w-sm" />
		<FilterPopover {categories} bind:selectedCategories />
		<!-- Three-dot menu -->
		<DropdownMenu>
			<DropdownMenuTrigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" size="icon" class="ml-auto" aria-label="More options">
						<MoreHorizontal class="h-4 w-4" />
					</Button>
				{/snippet}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onclick={() => downloadDirectoryPdf(filtered)}>
					<FileDown class="mr-2 h-4 w-4" />
					Download as PDF
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
		<!-- View switcher -->
		<div class="flex items-center rounded-md border bg-muted p-0.5">
			{#each VIEWS as { id, label, Icon } (id)}
				<Tooltip>
					<TooltipTrigger>
						{#snippet child({ props })}
							<button
								{...props}
								class="flex h-7 w-7 items-center justify-center rounded-sm transition-colors
									{view === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
								aria-label={label}
								aria-pressed={view === id}
								onclick={() => (view = id)}
							>
								<Icon class="h-3.5 w-3.5" />
							</button>
						{/snippet}
					</TooltipTrigger>
					<TooltipContent>{label}</TooltipContent>
				</Tooltip>
			{/each}
		</div>
	</div>

	{#if view === 'compact'}
		<DirectoryCardView {filtered} {user} {searching} compact={true} onedit={openEdit} {isAdmin} />
	{:else}
		<DirectoryTableView {filtered} {user} onedit={openEdit} {isAdmin} />
	{/if}
</div>

{#if editingBusiness}
	<EditBusinessDialog business={editingBusiness} {formData} bind:open={dialogOpen} ondelete={handleDelete} />
{/if}
