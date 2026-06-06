<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import type { Business } from '$lib/types';

	let {
		filtered,
		user,
		searching,
		onedit
	}: {
		filtered: Business[];
		user: { email: string | null } | null;
		searching: boolean;
		onedit: (b: Business) => void;
	} = $props();

	// Group: category → subcategory (first subcategory or '' for none) → businesses
	const grouped = $derived.by(() => {
		const map = new SvelteMap<string, SvelteMap<string, Business[]>>();
		for (const b of filtered) {
			if (!map.has(b.category)) map.set(b.category, new SvelteMap());
			const sub = b.subcategories[0] ?? '';
			const catMap = map.get(b.category)!;
			if (!catMap.has(sub)) catMap.set(sub, []);
			catMap.get(sub)!.push(b);
		}
		return map;
	});

	// Categories present in filtered results
	const activeCategories = $derived(new SvelteSet(filtered.map((b) => b.category)));

	// Expand all when searching; otherwise start collapsed
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

	function copyEmail(email: string, key: string) {
		navigator.clipboard.writeText(email).then(() => {
			copied = key;
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
	<div class="overflow-hidden rounded-md border">
		{#each [...grouped] as [category, subcatMap], ci (category)}
			{@const isOpen = expanded.has(category)}
			{@const total = [...subcatMap.values()].reduce((s, arr) => s + arr.length, 0)}

			<!-- Category header -->
			<button
				class="flex w-full items-center gap-2 border-b bg-muted/40 px-4 py-2.5 text-left hover:bg-muted/70 {ci > 0 ? 'border-t' : ''}"
				onclick={() => toggle(category)}
				aria-expanded={isOpen}
			>
				<ChevronRight
					class="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150 {isOpen ? 'rotate-90' : ''}"
				/>
				<span class="flex-1 text-xs font-semibold tracking-wide">{category}</span>
				<span class="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{total}</span>
			</button>

			<!-- Expanded content -->
			{#if isOpen}
				{#each [...subcatMap] as [subcat, businesses] (subcat)}
					<!-- Subcategory label (only if named) -->
					{#if subcat}
						<div class="border-b bg-background px-4 py-1.5 pl-9">
							<span class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{subcat}</span>
						</div>
					{/if}

					<!-- Business rows -->
					{#each businesses as business (business.id ?? business.name)}
						{@const isOwner = user?.email && business.email && user.email === business.email}
						<div class="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 border-b px-4 py-2 pl-9 text-xs hover:bg-muted/20 last:border-0">
							<span class="truncate font-medium">{business.name}</span>

							<!-- Phone -->
							{#if business.phones[0]}
								<a
									href="tel:{business.phones[0].replace(/\D/g, '')}"
									class="text-muted-foreground hover:text-foreground"
									title={business.phones[0]}
								><Phone class="h-3.5 w-3.5" /></a>
							{:else}
								<span class="opacity-25"><Phone class="h-3.5 w-3.5" /></span>
							{/if}

							<!-- Email — mailto assembled in JS, [at] in DOM -->
							{#if business.email}
								{@const [u, d] = emailParts(business.email)}
								{@const key = `tree-${business.name}`}
								<span class="flex items-center gap-1">
									<button
										title="{u} [at] {d}"
										onclick={() => { window.location.href = `mailto:${business.email}`; }}
										class="text-muted-foreground hover:text-foreground"
									><Mail class="h-3.5 w-3.5" /></button>
									<button
										aria-label="Copy email"
										onclick={() => copyEmail(business.email!, key)}
										class="text-muted-foreground hover:text-foreground"
									>
										{#if copied === key}
											<Check class="h-3 w-3 text-green-500" />
										{:else}
											<Copy class="h-3 w-3" />
										{/if}
									</button>
								</span>
							{:else}
								<span class="opacity-25"><Mail class="h-3.5 w-3.5" /></span>
							{/if}

							<!-- Website -->
							{#if business.website}
								<a
									href={business.website}
									target="_blank"
									rel="noopener noreferrer"
									title={hostname(business.website)}
									class="text-primary hover:opacity-80"
								>
									<ExternalLink class="h-3.5 w-3.5" />
								</a>
							{:else}
								<span class="opacity-25"><ExternalLink class="h-3.5 w-3.5" /></span>
							{/if}

							<!-- Edit -->
							{#if isOwner}
								<button
									class="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/80"
									onclick={() => onedit(business)}
								>Edit</button>
							{:else}
								<span></span>
							{/if}
						</div>
					{/each}
				{/each}
			{/if}
		{/each}
	</div>
{/if}
