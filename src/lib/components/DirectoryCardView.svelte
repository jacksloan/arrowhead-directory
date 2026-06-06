<script lang="ts">
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import type { Business } from '$lib/types';

	let {
		filtered,
		user
	}: {
		filtered: Business[];
		user: { email: string | null } | null;
	} = $props();

	// Per-card copy state: stores which email was just copied (by business name)
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

	function openMailto(email: string) {
		window.location.href = `mailto:${email}`;
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
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each filtered as business (business.id ?? business.name)}
			{@const isOwner = user?.email && business.email && user.email === business.email}
			<div class="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
				<!-- Header -->
				<div class="flex items-start justify-between gap-2">
					<div>
						<p class="text-sm font-semibold leading-snug">{business.name}</p>
						{#if business.subcategories.length > 0}
							<p class="mt-0.5 text-xs text-muted-foreground">{business.subcategories.join(' · ')}</p>
						{/if}
					</div>
					{#if isOwner}
						<span class="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Edit</span>
					{/if}
				</div>

				<span class="inline-block w-fit rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
					{business.category}
				</span>

				{#if business.description}
					<p class="line-clamp-2 text-xs text-muted-foreground">{business.description}</p>
				{/if}

				<hr class="border-border" />

				<!-- Contact rows -->
				<div class="flex flex-col gap-1.5">
					<!-- Phones -->
					{#if business.phones.length > 0}
						<div class="flex flex-col gap-1">
							{#each business.phones as phone, i}
								<div class="flex items-center gap-1.5 text-xs">
									{#if i === 0}
										<span class="w-4 text-center text-muted-foreground">📞</span>
									{:else}
										<span class="w-4 text-center text-[9px] text-muted-foreground">alt</span>
									{/if}
									<!-- tel: link assembled inline — no obfuscation needed for phones -->
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

					<!-- Email — obfuscated: [at] in DOM, real address only in JS handlers -->
					{#if business.email}
						{@const [u, d] = emailParts(business.email)}
						<div class="flex items-center gap-1.5 text-xs">
							<span class="w-4 text-center text-muted-foreground">✉</span>
							<!-- Visible text uses [at] — crawlers can't harvest a plain @-address -->
							<button
								class="truncate text-foreground underline-offset-2 hover:underline"
								title="Open email client"
								onclick={() => openMailto(business.email!)}
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

					<!-- Website -->
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
{/if}
