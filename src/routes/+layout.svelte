<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import { TooltipProvider } from '$lib/components/ui/tooltip/index.js';
	import Nav from '$lib/components/Nav.svelte';
	import { onNavigate } from '$app/navigation';

	let { children, data } = $props();

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>☎️</text></svg>">
</svelte:head>

<ModeWatcher />
<TooltipProvider delayDuration={400}>
	<div class="flex min-h-screen flex-col">
		<Nav user={data.user} isAdmin={data.isAdmin} />
		<main class="flex-1 px-4 py-6">
			{@render children()}
		</main>
	</div>
</TooltipProvider>
