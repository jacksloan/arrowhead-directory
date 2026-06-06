<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
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

	let copied = $state<string | null>(null);

	function emailParts(email: string): [string, string] {
		const at = email.indexOf('@');
		return [email.slice(0, at), email.slice(at + 1)];
	}

	function copyEmail(business: Business) {
		if (!business.email) return;
		navigator.clipboard.writeText(business.email).then(() => {
			copied = business.name;
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
								<div class="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
									<!-- Name + edit -->
									<div class="flex items-start justify-between gap-2">
										<div>
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
											<button
												class="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/80"
												onclick={() => onedit(business)}
											>Edit</button>
										{/if}
									</div>

	

									<hr class="border-border" />

									<!-- Contact -->
									<div class="flex flex-col gap-1.5">
										{#if business.phones.length > 0}
											<div class="flex flex-col gap-1">
												{#each business.phones as phone, i (phone)}
													<div class="flex items-center gap-1.5 text-xs">
														{#if i === 0}
															<span class="w-4 text-center text-muted-foreground">📞</span>
														{:else}
															<span class="w-4 text-center text-[9px] text-muted-foreground">alt</span>
														{/if}
														<a
															href="tel:{phone.replace(/\D/g, '')}"
															class="text-foreground underline-offset-2 hover:underline"
														>{phone}</a>
													</div>
												{/each}
											</div>
										{:else}
											<div class="flex items-center gap-1.5 text-xs text-muted-foreground/40">
												<span class="w-4 text-center">📞</span><span>—</span>
											</div>
										{/if}

										{#if business.email}
											{@const [u, d] = emailParts(business.email)}
											<div class="flex items-center gap-1.5 text-xs">
												<span class="w-4 text-center text-muted-foreground">✉</span>
												<button
													class="truncate text-foreground underline-offset-2 hover:underline"
													title="Open email client"
													onclick={() => { window.location.href = `mailto:${business.email}`; }}
												>{u} [at] {d}</button>
												<button
													class="ml-auto shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
													aria-label="Copy email"
													onclick={() => copyEmail(business)}
												>
													{#if copied === business.name}
														<Check class="inline h-3 w-3 text-green-500" />
													{:else}
														<Copy class="inline h-3 w-3" />
													{/if}
												</button>
											</div>
										{:else}
											<div class="flex items-center gap-1.5 text-xs text-muted-foreground/40">
												<span class="w-4 text-center">✉</span><span>—</span>
											</div>
										{/if}

										{#if business.website}
											<div class="flex items-center gap-1.5 text-xs">
												<span class="w-4 text-center text-muted-foreground">🔗</span>
												<a
													href={business.website}
													target="_blank"
													rel="noopener noreferrer"
													class="flex items-center gap-0.5 text-primary underline-offset-2 hover:underline"
												>
													{hostname(business.website)}
													<ExternalLink class="h-2.5 w-2.5 shrink-0 opacity-60" />
												</a>
											</div>
										{:else}
											<div class="flex items-center gap-1.5 text-xs text-muted-foreground/40">
												<span class="w-4 text-center">🔗</span><span>—</span>
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
