<script lang="ts">
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';

	let {
		services,
		selectedServices = $bindable([])
	}: {
		services: string[];
		selectedServices: string[];
	} = $props();

	function toggle(svc: string) {
		if (selectedServices.includes(svc)) {
			selectedServices = selectedServices.filter((s) => s !== svc);
		} else {
			selectedServices = [...selectedServices, svc];
		}
	}
</script>

<Popover>
	<PopoverTrigger>
		{#snippet child({ props })}
			<Button {...props} variant="outline" size="icon" aria-label="Filter by service">
				<SlidersHorizontal class="h-4 w-4" />
			</Button>
		{/snippet}
	</PopoverTrigger>
	<PopoverContent class="w-64" align="end">
		<p class="mb-3 text-sm font-medium">Filter by service</p>
		{#if services.length === 0}
			<p class="text-xs text-muted-foreground">No services to filter by.</p>
		{:else}
			<div class="flex max-h-64 flex-col gap-2 overflow-y-auto">
				{#each services as svc (svc)}
					<div class="flex items-center gap-2">
						<Checkbox
							id={svc}
							checked={selectedServices.includes(svc)}
							onCheckedChange={() => toggle(svc)}
						/>
						<Label for={svc} class="cursor-pointer text-sm">{svc}</Label>
					</div>
				{/each}
			</div>
		{/if}
		{#if selectedServices.length > 0}
			<Button variant="ghost" class="mt-3 w-full text-xs" onclick={() => (selectedServices = [])}>
				Clear filters
			</Button>
		{/if}
	</PopoverContent>
</Popover>
