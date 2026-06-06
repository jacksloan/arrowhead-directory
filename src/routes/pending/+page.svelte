<script lang="ts">
	import { enhance } from '$app/forms';
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import Link from '@lucide/svelte/icons/link';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogFooter
	} from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger
	} from '$lib/components/ui/select/index.js';
	import type { Business, BusinessStatus } from '$lib/types';

	let { data } = $props();

	let removedIds = $state(new Set<string>());
	const businesses = $derived(data.businesses.filter((b) => !removedIds.has(b.id!)));
	let selected = $state<Business | null>(null);
	let dialogOpen = $state(false);
	let chosenStatus = $state<BusinessStatus>('approved');
	let submitting = $state(false);
	let errorMsg = $state<string | null>(null);

	function openDialog(b: Business) {
		selected = b;
		chosenStatus = 'approved';
		errorMsg = null;
		dialogOpen = true;
	}

	function hostname(url: string): string {
		try {
			return new URL(url).hostname.replace(/^www\./, '');
		} catch {
			return url;
		}
	}

	function emailParts(email: string): [string, string] {
		const at = email.indexOf('@');
		return [email.slice(0, at), email.slice(at + 1)];
	}

	const statusLabels: Record<BusinessStatus, string> = {
		approved: 'Approved',
		pending: 'Pending',
		rejected: 'Rejected'
	};

	const statusColors: Record<BusinessStatus, string> = {
		approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
		pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
		rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
	};
</script>

<svelte:head>
	<title>Pending Approvals — Arrowhead Directory</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Pending Approvals</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				{businesses.length} listing{businesses.length === 1 ? '' : 's'} awaiting review
			</p>
		</div>
	</div>

	{#if businesses.length === 0}
		<p class="py-16 text-center text-sm text-muted-foreground">No pending listings — you're all caught up.</p>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each businesses as business (business.id)}
				<button
					class="flex w-full flex-col gap-2 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-primary"
					onclick={() => openDialog(business)}
				>
					<div class="min-w-0">
						<p class="truncate text-sm font-semibold leading-snug">{business.name}</p>
						<p class="mt-0.5 text-xs text-muted-foreground">{business.category}</p>
						{#if business.subcategories.length > 0}
							<div class="mt-1 flex flex-wrap gap-1">
								{#each business.subcategories.slice(0, 3) as sub (sub)}
									<span class="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] leading-tight text-muted-foreground">{sub}</span>
								{/each}
							</div>
						{/if}
					</div>

					{#if business.description}
						<p class="text-xs leading-relaxed text-muted-foreground line-clamp-2">{business.description}</p>
					{/if}

					<hr class="w-full border-border" />

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
	{/if}
</div>

<!-- Status modal -->
{#if selected}
	<Dialog bind:open={dialogOpen}>
		<DialogContent class="sm:max-w-sm">
			<DialogHeader>
				<DialogTitle class="pr-6 leading-snug">{selected.name}</DialogTitle>
			</DialogHeader>

			<div class="flex flex-col gap-4">
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<span>Current status:</span>
					<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusColors[selected.status]}">
						{statusLabels[selected.status]}
					</span>
				</div>

				<div class="flex flex-col gap-1.5">
					<label class="text-sm font-medium" for="status-select">Set status</label>
					<Select
						type="single"
						value={chosenStatus}
						onValueChange={(v) => { if (v) chosenStatus = v as BusinessStatus; }}
					>
						<SelectTrigger id="status-select" class="w-full">
							{statusLabels[chosenStatus]}
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="approved">Approved</SelectItem>
							<SelectItem value="pending">Pending</SelectItem>
							<SelectItem value="rejected">Rejected</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{#if errorMsg}
					<p class="text-xs text-destructive">{errorMsg}</p>
				{/if}
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
				<form
					method="POST"
					action="/pending?/updateStatus"
					use:enhance={() => {
						submitting = true;
						errorMsg = null;
						return async ({ result }) => {
							submitting = false;
							if (result.type === 'success') {
								removedIds.add(selected!.id!);
								dialogOpen = false;
							} else if (result.type === 'failure') {
								errorMsg = (result.data as any)?.message ?? 'Something went wrong.';
							}
						};
					}}
				>
					<input type="hidden" name="id" value={selected.id} />
					<input type="hidden" name="status" value={chosenStatus} />
					<Button type="submit" disabled={submitting}>
						{submitting ? 'Saving…' : 'Confirm'}
					</Button>
				</form>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
