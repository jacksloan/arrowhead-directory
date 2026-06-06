<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import Link from '@lucide/svelte/icons/link';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import BusinessProfileDialog from './BusinessProfileDialog.svelte';
	import type { Business } from '$lib/types';

	let {
		filtered,
		user,
		searching,
		compact,
		onedit
	}: {
		filtered: Business[];
		user: { email: string | null } | null;
		searching: boolean;
		compact: boolean;
		onedit: (b: Business) => void;
	} = $props();

	const grouped = $derived.by(() => {
		const map = new SvelteMap<string, Business[]>();
		for (const b of filtered) {
			if (!map.has(b.category)) map.set(b.category, []);
			map.get(b.category)!.push(b);
		}
		return map;
	});

	const activeCategories = $derived(new SvelteSet(filtered.map((b) => b.category)));

	let expanded = new SvelteSet<string>();

	$effect(() => {
		if (searching) {
			for (const cat of activeCategories) expanded.add(cat);
		}
	});

	function toggle(cat: string) {
		if (expanded.has(cat)) expanded.delete(cat);
		else expanded.add(cat);
	}

	let selectedBusiness = $state<Business | null>(null);
	let profileOpen = $state(false);

	function openProfile(b: Business) {
		selectedBusiness = b;
		profileOpen = true;
	}

	function emailParts(email: string): [string, string] {
		const at = email.indexOf('@');
		return [email.slice(0, at), email.slice(at + 1)];
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
	<BusinessProfileDialog
		business={selectedBusiness}
		bind:open={profileOpen}
		onedit={user?.email && selectedBusiness.email && user.email === selectedBusiness.email ? onedit : undefined}
	/>
{/if}

{#if filtered.length === 0}
	<p class="py-12 text-center text-sm text-muted-foreground">No businesses match your search.</p>
{:else}
	<div class="flex flex-col gap-2">
		{#each [...grouped] as [category, businesses], ci (category)}
			{@const isOpen = expanded.has(category)}

			<!-- Category header -->
			<div class="overflow-hidden rounded-lg border">
				<button
					class="flex w-full items-center gap-2 bg-muted/40 px-4 py-3 text-left hover:bg-muted/70"
					onclick={() => toggle(category)}
					aria-expanded={isOpen}
				>
					<ChevronRight
						class="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 {isOpen ? 'rotate-90' : ''}"
					/>
					<span class="flex-1 text-sm font-semibold">{category}</span>
					<span class="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
						{businesses.length}
					</span>
				</button>

				{#if isOpen}
					<div class="border-t p-4">
						<div class="grid gap-3 {compact ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}">
							{#each businesses as business (business.id ?? business.name)}
								{@const isOwner = user?.email && business.email && user.email === business.email}
								<button
									class="flex w-full flex-col gap-2 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-primary"
									onclick={() => openProfile(business)}
								>
									<!-- Name + subcategories -->
									<div class="flex w-full items-start justify-between gap-2">
										<div class="min-w-0">
											<p class="text-sm font-semibold leading-snug">{business.name}</p>
											{#if business.subcategories.length > 0}
												<div class="mt-1 flex flex-wrap gap-1">
													{#each business.subcategories as sub (sub)}
														<span class="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] leading-tight text-muted-foreground">{sub}</span>
													{/each}
												</div>
											{/if}
										</div>
										{#if isOwner}
											<span class="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Owner</span>
										{/if}
									</div>

									{#if !compact && business.description}
										<p class="text-xs leading-relaxed text-muted-foreground line-clamp-3">{business.description}</p>
									{/if}

									<hr class="w-full border-border" />

									<!-- Contact preview -->
									<div class="flex w-full flex-col gap-1">
										{#if business.phones.length > 0}
											<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
												<Phone class="h-3 w-3 shrink-0" />
												<span class="truncate">{business.phones[0]}</span>
											</div>
										{/if}
										{#if business.email}
											{@const [u, d] = emailParts(business.email)}
											<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
												<Mail class="h-3 w-3 shrink-0" />
												<span class="truncate">{u} [at] {d}</span>
											</div>
										{/if}
										{#if business.website}
											<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
												<Link class="h-3 w-3 shrink-0" />
												<span class="truncate">{hostname(business.website)}</span>
											</div>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
