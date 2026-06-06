<script lang="ts">
	import { Sheet, SheetContent, SheetTrigger } from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import MenuIcon from '@lucide/svelte/icons/menu';

	let open = $state(false);
</script>

<Sheet bind:open>
	<SheetTrigger>
		{#snippet child({ props })}
			<Button variant="ghost" size="icon" aria-label="Open menu" {...props}>
				<MenuIcon class="h-5 w-5" />
			</Button>
		{/snippet}
	</SheetTrigger>
	<SheetContent side="left" class="w-64">
		<nav class="mt-8 flex flex-col gap-2">
			<a
				href="/"
				onclick={() => (open = false)}
				class="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
			>
				Directory
			</a>
			<a
				href="/about"
				onclick={() => (open = false)}
				class="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
			>
				About
			</a>
			<a
				href="/how-to"
				onclick={() => (open = false)}
				class="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
			>
				How-To
			</a>
		</nav>
	</SheetContent>
</Sheet>
