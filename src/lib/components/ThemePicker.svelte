<script lang="ts">
	import { mode } from 'mode-watcher';
	import { defaultPresets } from '$lib/theme-presets';
	import * as Popover from '$lib/components/ui/popover';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';

	let open = $state(false);
	let search = $state('');
	let activeKey = $state<string | null>(null);

	const presets = Object.entries(defaultPresets);

	const filtered = $derived(
		search.trim()
			? presets.filter(([, p]) => p.label.toLowerCase().includes(search.toLowerCase()))
			: presets
	);

	// Apply the active preset's CSS variables whenever the key or mode changes
	$effect(() => {
		const currentMode = mode.current;
		if (!activeKey) return;
		const preset = defaultPresets[activeKey];
		if (!preset) return;
		const styles = currentMode === 'dark' ? preset.styles.dark : preset.styles.light;
		const root = document.documentElement;
		for (const [prop, value] of Object.entries(styles)) {
			root.style.setProperty(`--${prop}`, value);
		}
	});

	function select(key: string) {
		activeKey = key;
		open = false;
		search = '';
	}

	function reset() {
		activeKey = null;
		// Remove all inline CSS vars so the stylesheet defaults take over
		const root = document.documentElement;
		const toRemove: string[] = [];
		for (let i = 0; i < root.style.length; i++) {
			const prop = root.style.item(i);
			if (prop.startsWith('--')) toRemove.push(prop);
		}
		for (const prop of toRemove) {
			root.style.removeProperty(prop);
		}
		open = false;
		search = '';
	}

	const activeLabel = $derived(activeKey ? defaultPresets[activeKey]?.label : null);
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				variant={activeKey ? 'secondary' : 'ghost'}
				size="icon"
				aria-label="Pick theme"
				title={activeLabel ? `Theme: ${activeLabel}` : 'Pick theme'}
				{...props}
			>
				<PaletteIcon class="size-4" />
			</Button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content align="end" class="w-72 p-0">
		<!-- Search header -->
		<div class="flex items-center gap-2 border-b px-3 py-2">
			<PaletteIcon class="text-muted-foreground size-4 shrink-0" />
			<Input
				bind:value={search}
				placeholder="Search themes…"
				class="h-7 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
			/>
			{#if search}
				<button onclick={() => (search = '')} class="text-muted-foreground hover:text-foreground">
					<XIcon class="size-3.5" />
				</button>
			{/if}
		</div>

		<!-- Scrollable list -->
		<div class="max-h-80 overflow-y-auto p-1">
			{#if activeKey}
				<button
					onclick={reset}
					class="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent"
				>
					<XIcon class="size-3" />
					Reset to default
				</button>
				<div class="my-1 border-t"></div>
			{/if}

			{#if filtered.length === 0}
				<p class="text-muted-foreground py-4 text-center text-xs">No themes found.</p>
			{:else}
				{#each filtered as [key, preset]}
					{@const light = preset.styles.light}
					{@const isActive = activeKey === key}
					<button
						onclick={() => select(key)}
						class={cn(
							'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent',
							isActive && 'bg-accent'
						)}
					>
						<!-- Color swatch row -->
						<span class="flex shrink-0 gap-0.5 rounded-sm overflow-hidden border border-black/10 dark:border-white/10">
							{#each [light.background, light.primary, light['secondary'] ?? light.accent, light.border] as color}
								<span class="block size-4" style="background:{color}"></span>
							{/each}
						</span>

						<span class="flex-1 truncate">{preset.label}</span>

						{#if isActive}
							<CheckIcon class="text-primary size-3.5 shrink-0" />
						{/if}
					</button>
				{/each}
			{/if}
		</div>

		<!-- Footer: count -->
		<div class="text-muted-foreground border-t px-3 py-1.5 text-xs">
			{filtered.length} of {presets.length} themes
		</div>
	</Popover.Content>
</Popover.Root>
