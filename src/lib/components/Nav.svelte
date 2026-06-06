<script lang="ts">
	import HamburgerSheet from './HamburgerSheet.svelte';
	import ProfilePopover from './ProfilePopover.svelte';

	let { user }: { user: { email: string } | null } = $props();
</script>

<nav class="flex h-14 items-center justify-between border-b px-4">
	<HamburgerSheet />
	<span class="text-sm font-semibold tracking-wide">Arrowhead Directory</span>
	<ProfilePopover {user} />
</nav>
