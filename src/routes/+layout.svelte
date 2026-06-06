<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import Nav from '$lib/components/Nav.svelte';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />
<div class="flex min-h-screen flex-col">
	<Nav user={data.user} />
	<main class="flex-1 px-4 py-6">
		{@render children()}
	</main>
</div>
