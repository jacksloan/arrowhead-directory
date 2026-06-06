<script lang="ts">
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import UserIcon from '@lucide/svelte/icons/user';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { toggleMode } from 'mode-watcher';

	let { user }: { user: { email: string } | null } = $props();
	let email = $state('');
	let sent = $state(false);
</script>

<Popover>
	<PopoverTrigger>
		{#snippet child({ props })}
			<Button variant="ghost" size="icon" aria-label="Account" {...props}>
				<UserIcon class="h-5 w-5" />
			</Button>
		{/snippet}
	</PopoverTrigger>
	<PopoverContent class="w-64" align="end">
		<div class="flex flex-col gap-4">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium">Dark mode</span>
				<Button variant="ghost" size="icon" onclick={toggleMode} aria-label="Toggle theme">
					<SunIcon class="dark:hidden h-4 w-4" />
					<MoonIcon class="hidden dark:block h-4 w-4" />
				</Button>
			</div>

			<div class="border-t pt-3">
				{#if user}
					<p class="mb-3 truncate text-xs text-muted-foreground">{user.email}</p>
					<form method="POST" action="/?/signOut">
						<Button type="submit" variant="outline" class="w-full text-sm">Sign out</Button>
					</form>
				{:else if sent}
					<p class="text-sm text-muted-foreground">Check your email for a login link.</p>
				{:else}
					<form
						method="POST"
						action="/?/sendMagicLink"
						onsubmit={() => (sent = true)}
						class="flex flex-col gap-2"
					>
						<Label for="email" class="text-sm">Sign in with email</Label>
						<Input
							id="email"
							name="email"
							type="email"
							placeholder="you@example.com"
							bind:value={email}
							required
							class="text-sm"
						/>
						<Button type="submit" class="w-full text-sm">Send link</Button>
					</form>
				{/if}
			</div>
		</div>
	</PopoverContent>
</Popover>
