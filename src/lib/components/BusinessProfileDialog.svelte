<script lang="ts">
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import Link from '@lucide/svelte/icons/link';
	import { browser } from '$app/environment';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import type { Business } from '$lib/types';

	let {
		business,
		open = $bindable(false),
		onedit
	}: {
		business: Business;
		open: boolean;
		onedit?: (b: Business) => void;
	} = $props();

	let copied = $state(false);

	function copyEmail() {
		if (!business.email) return;
		navigator.clipboard.writeText(business.email).then(() => {
			copied = true;
			setTimeout(() => (copied = false), 1800);
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

<Dialog bind:open>
	<DialogContent class="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto">
		<DialogHeader>
			<DialogTitle class="pr-6 text-base leading-snug">{business.name}</DialogTitle>
		</DialogHeader>

		<div class="flex flex-col gap-4">
			<!-- Category + subcategories -->
			<div class="flex flex-wrap gap-1.5">
				<span class="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
					{business.category}
				</span>
				{#each business.subcategories as sub (sub)}
					<span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{sub}</span>
				{/each}
			</div>

			<!-- Description -->
			{#if business.description}
				<p class="text-sm leading-relaxed text-foreground/80">{business.description}</p>
			{/if}

			<hr class="border-border" />

			<!-- Contact details -->
			<div class="flex flex-col gap-2">
				<!-- Phones -->
				{#if business.phones.length > 0}
					<div class="flex flex-col gap-1">
						{#each business.phones as phone, i (phone)}
							<div class="flex items-center gap-2 text-sm">
								<span class="w-4 text-center text-muted-foreground">
									{#if i === 0}<Phone class="inline h-3.5 w-3.5" />{:else}<span class="text-[10px]">alt</span>{/if}
								</span>
								<a
									href="tel:{phone.replace(/\D/g, '')}"
									class="text-foreground underline-offset-2 hover:underline"
								>{phone}</a>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Email -->
				{#if browser && business.email}
					<div class="flex items-center gap-2 text-sm">
						<span class="w-4 text-center text-muted-foreground"><Mail class="inline h-3.5 w-3.5" /></span>
						<button
							class="flex-1 text-left text-foreground underline-offset-2 hover:underline"
							title="Open email client"
							onclick={() => { window.location.href = `mailto:${business.email}`; }}
						>{business.email}</button>
						<button
							class="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
							aria-label="Copy email"
							onclick={copyEmail}
						>
							{#if copied}
								<Check class="inline h-3 w-3 text-green-500" />
							{:else}
								<Copy class="inline h-3 w-3" />
							{/if}
						</button>
					</div>
				{/if}

				<!-- Website -->
				{#if business.website}
					<div class="flex items-center gap-2 text-sm">
						<span class="w-4 text-center text-muted-foreground"><Link class="inline h-3.5 w-3.5" /></span>
						<a
							href={business.website}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-1 text-primary underline-offset-2 hover:underline"
						>
							{hostname(business.website)}
							<ExternalLink class="h-3 w-3 shrink-0 opacity-60" />
						</a>
					</div>
				{/if}

				<!-- Address -->
				{#if business.address}
					<div class="flex items-start gap-2 text-sm">
						<span class="mt-0.5 w-4 text-center text-muted-foreground">
							<MapPin class="inline h-3.5 w-3.5" />
						</span>
						<a
							href="https://maps.google.com/?q={encodeURIComponent(business.address)}"
							target="_blank"
							rel="noopener noreferrer"
							class="text-foreground underline-offset-2 hover:underline"
						>{business.address}</a>
					</div>
				{/if}
			</div>

			<!-- Services -->
			{#if business.services.length > 0}
				<div class="flex flex-col gap-1.5">
					<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Services</p>
					<div class="flex flex-wrap gap-1">
						{#each business.services as service (service)}
							<span class="rounded-sm bg-muted/60 px-2 py-0.5 text-xs text-foreground/70">{service}</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Edit link (owner only) -->
			{#if onedit}
				<button
					class="mt-1 self-start rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
					onclick={() => { open = false; onedit!(business); }}
				>Edit listing</button>
			{/if}
		</div>
	</DialogContent>
</Dialog>
