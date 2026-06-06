<script lang="ts">
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import UserPlus from '@lucide/svelte/icons/user-plus';

	let { data } = $props();

	let addedEmails = $state<string[]>([]);
	let removedEmails = $state(new Set<string>());
	const admins = $derived(
		[...data.admins.map((a) => a.email).filter((e) => !removedEmails.has(e)), ...addedEmails].sort()
	);
	let emailInput = $state('');
	let submitting = $state(false);
	let errorMsg = $state<string | null>(null);
</script>

<svelte:head>
	<title>Admin Management — Arrowhead Directory</title>
</svelte:head>

<div class="mx-auto max-w-lg">
	<h1 class="mb-1 text-2xl font-bold">Admin Management</h1>
	<p class="mb-8 text-sm text-muted-foreground">Admins can approve, reject, and manage all business listings.</p>

	<!-- Add admin form -->
	<div class="mb-8 rounded-lg border p-5">
		<h2 class="mb-4 text-sm font-semibold">Add admin</h2>
		<form
			method="POST"
			action="/admin?/addAdmin"
			class="flex gap-2"
			use:enhance={() => {
				submitting = true;
				errorMsg = null;
				return async ({ result, update }) => {
					submitting = false;
					if (result.type === 'success' && result.data?.email) {
						addedEmails = [...addedEmails, result.data.email as string];
						emailInput = '';
					} else if (result.type === 'failure') {
						errorMsg = (result.data as any)?.message ?? 'Something went wrong.';
					} else {
						await update();
					}
				};
			}}
		>
			<Input
				type="email"
				name="email"
				placeholder="email@example.com"
				bind:value={emailInput}
				class="flex-1"
				required
			/>
			<Button type="submit" disabled={submitting || !emailInput}>
				<UserPlus class="mr-1.5 h-4 w-4" />
				{submitting ? 'Adding…' : 'Add'}
			</Button>
		</form>
		{#if errorMsg}
			<p class="mt-2 text-xs text-destructive">{errorMsg}</p>
		{/if}
	</div>

	<!-- Current admins list -->
	<div class="rounded-lg border">
		<div class="border-b px-4 py-3">
			<h2 class="text-sm font-semibold">Current admins</h2>
		</div>
		{#if admins.length === 0}
			<p class="px-4 py-6 text-sm text-muted-foreground">No admins found.</p>
		{:else}
			<ul>
				{#each admins as email, i (email)}
					<li class="flex items-center justify-between gap-2 px-4 py-2.5 {i < admins.length - 1 ? 'border-b' : ''}">
						<span class="text-sm">{email}</span>
						<form
							method="POST"
							action="/admin?/removeAdmin"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success' && result.data?.email) {
										removedEmails.add(result.data.email as string);
									} else {
										await update();
									}
								};
							}}
						>
							<input type="hidden" name="email" value={email} />
							<button
								type="submit"
								class="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
								aria-label="Remove {email}"
							>
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
