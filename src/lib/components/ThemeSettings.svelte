<script lang="ts">
	import { onMount } from 'svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { Slider } from '$lib/components/ui/slider';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';

	// ── Shape ──────────────────────────────────────────────────────────────
	let radius = $state([0.625]); // rem

	// ── Colors ─────────────────────────────────────────────────────────────
	let cBackground = $state('#ffffff');
	let cForeground = $state('#000000');
	let cCard = $state('#ffffff');
	let cPrimary = $state('#000000');
	let cPrimaryFg = $state('#ffffff');
	let cSecondary = $state('#f4f4f5');
	let cSecondaryFg = $state('#18181b');
	let cMuted = $state('#f4f4f5');
	let cMutedFg = $state('#71717a');
	let cAccent = $state('#f4f4f5');
	let cDestructive = $state('#ef4444');
	let cBorder = $state('#e4e4e7');
	let cInput = $state('#e4e4e7');
	let cRing = $state('#000000');

	// ── Shadows ────────────────────────────────────────────────────────────
	let shadowOpacity = $state([0]);
	let shadowBlur = $state([0]);
	let shadowSpread = $state([0]);
	let shadowOffsetX = $state([0]);
	let shadowOffsetY = $state([2]);

	// ── Typography ─────────────────────────────────────────────────────────
	let letterSpacing = $state([0]); // em
	let spacing = $state([0.25]); // rem

	// ── Lifecycle ──────────────────────────────────────────────────────────
	let mounted = $state(false);
	let open = $state(false);

	/** Convert any resolved CSS color string to #rrggbb hex */
	function toHex(css: string): string {
		// Use canvas to handle oklch, rgba, hsl, etc.
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 1;
		const ctx = canvas.getContext('2d');
		if (!ctx) return '#808080';
		ctx.fillStyle = css;
		ctx.fillRect(0, 0, 1, 1);
		const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
		return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
	}

	/** Resolve a CSS custom property to a hex color */
	function resolveColor(varName: string): string {
		const el = document.createElement('div');
		el.style.cssText = `position:fixed;width:1px;height:1px;background:var(--${varName});visibility:hidden`;
		document.body.appendChild(el);
		const bg = getComputedStyle(el).backgroundColor;
		document.body.removeChild(el);
		return toHex(bg);
	}

	/** Read a numeric CSS variable, stripping a unit suffix */
	function readNum(varName: string, fallback = 0): number {
		const root = document.documentElement;
		const raw = (
			root.style.getPropertyValue(`--${varName}`) ||
			getComputedStyle(root).getPropertyValue(`--${varName}`)
		).trim();
		return parseFloat(raw) || fallback;
	}

	function syncFromDOM() {
		radius = [readNum('radius', 0.625)];
		letterSpacing = [readNum('letter-spacing', 0)];
		spacing = [readNum('spacing', 0.25)];
		shadowOpacity = [readNum('shadow-opacity', 0)];
		shadowBlur = [readNum('shadow-blur', 0)];
		shadowSpread = [readNum('shadow-spread', 0)];
		shadowOffsetX = [readNum('shadow-offset-x', 0)];
		shadowOffsetY = [readNum('shadow-offset-y', 2)];

		cBackground = resolveColor('background');
		cForeground = resolveColor('foreground');
		cCard = resolveColor('card');
		cPrimary = resolveColor('primary');
		cPrimaryFg = resolveColor('primary-foreground');
		cSecondary = resolveColor('secondary');
		cSecondaryFg = resolveColor('secondary-foreground');
		cMuted = resolveColor('muted');
		cMutedFg = resolveColor('muted-foreground');
		cAccent = resolveColor('accent');
		cDestructive = resolveColor('destructive');
		cBorder = resolveColor('border');
		cInput = resolveColor('input');
		cRing = resolveColor('ring');
	}

	onMount(() => {
		syncFromDOM();
		mounted = true;
	});

	// Re-read when popover opens so values reflect any theme the picker applied
	$effect(() => {
		if (open && mounted) syncFromDOM();
	});

	// Apply all settings to :root whenever any value changes
	$effect(() => {
		if (!mounted) return;
		const r = document.documentElement;
		r.style.setProperty('--radius', `${radius[0]}rem`);
		r.style.setProperty('--letter-spacing', `${letterSpacing[0]}em`);
		r.style.setProperty('--spacing', `${spacing[0]}rem`);
		r.style.setProperty('--shadow-opacity', String(shadowOpacity[0]));
		r.style.setProperty('--shadow-blur', `${shadowBlur[0]}px`);
		r.style.setProperty('--shadow-spread', `${shadowSpread[0]}px`);
		r.style.setProperty('--shadow-offset-x', `${shadowOffsetX[0]}px`);
		r.style.setProperty('--shadow-offset-y', `${shadowOffsetY[0]}px`);
		r.style.setProperty('--background', cBackground);
		r.style.setProperty('--foreground', cForeground);
		r.style.setProperty('--card', cCard);
		r.style.setProperty('--card-foreground', cForeground);
		r.style.setProperty('--popover', cCard);
		r.style.setProperty('--popover-foreground', cForeground);
		r.style.setProperty('--primary', cPrimary);
		r.style.setProperty('--primary-foreground', cPrimaryFg);
		r.style.setProperty('--secondary', cSecondary);
		r.style.setProperty('--secondary-foreground', cSecondaryFg);
		r.style.setProperty('--muted', cMuted);
		r.style.setProperty('--muted-foreground', cMutedFg);
		r.style.setProperty('--accent', cAccent);
		r.style.setProperty('--accent-foreground', cSecondaryFg);
		r.style.setProperty('--destructive', cDestructive);
		r.style.setProperty('--border', cBorder);
		r.style.setProperty('--input', cInput);
		r.style.setProperty('--ring', cRing);
	});

	function reset() {
		const root = document.documentElement;
		const keys: string[] = [];
		for (let i = 0; i < root.style.length; i++) {
			const p = root.style.item(i);
			if (p.startsWith('--')) keys.push(p);
		}
		for (const k of keys) root.style.removeProperty(k);
		syncFromDOM();
	}

	// ── Color rows ─────────────────────────────────────────────────────────
	type ColorRow = { label: string; bind: () => string; set: (v: string) => void };

	const colorRows: ColorRow[] = [
		{ label: 'Background', bind: () => cBackground, set: (v) => (cBackground = v) },
		{ label: 'Foreground', bind: () => cForeground, set: (v) => (cForeground = v) },
		{ label: 'Card', bind: () => cCard, set: (v) => (cCard = v) },
		{ label: 'Primary', bind: () => cPrimary, set: (v) => (cPrimary = v) },
		{ label: 'Primary Text', bind: () => cPrimaryFg, set: (v) => (cPrimaryFg = v) },
		{ label: 'Secondary', bind: () => cSecondary, set: (v) => (cSecondary = v) },
		{ label: 'Secondary Text', bind: () => cSecondaryFg, set: (v) => (cSecondaryFg = v) },
		{ label: 'Muted', bind: () => cMuted, set: (v) => (cMuted = v) },
		{ label: 'Muted Text', bind: () => cMutedFg, set: (v) => (cMutedFg = v) },
		{ label: 'Accent', bind: () => cAccent, set: (v) => (cAccent = v) },
		{ label: 'Destructive', bind: () => cDestructive, set: (v) => (cDestructive = v) },
		{ label: 'Border', bind: () => cBorder, set: (v) => (cBorder = v) },
		{ label: 'Input', bind: () => cInput, set: (v) => (cInput = v) },
		{ label: 'Ring', bind: () => cRing, set: (v) => (cRing = v) },
	];
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button variant="ghost" size="icon" aria-label="Theme settings" {...props}>
				<SlidersHorizontalIcon class="size-4" />
			</Button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content align="end" class="w-80 p-0">
		<!-- Header -->
		<div class="flex items-center justify-between border-b px-4 py-3">
			<div class="flex items-center gap-2">
				<SlidersHorizontalIcon class="text-muted-foreground size-4" />
				<span class="text-sm font-semibold">Theme Settings</span>
			</div>
			<Button variant="ghost" size="sm" onclick={reset} class="h-7 gap-1 px-2 text-xs">
				<RotateCcwIcon class="size-3" />
				Reset
			</Button>
		</div>

		<!-- Scrollable body -->
		<div class="max-h-[520px] overflow-y-auto p-4 space-y-5">

			<!-- ── Shape ── -->
			<section class="space-y-3">
				<h3 class="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Shape</h3>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<div class="text-sm">Border Radius</div>
						<span class="text-muted-foreground w-14 text-right text-xs tabular-nums">{radius[0].toFixed(3)}rem</span>
					</div>
					<Slider type="multiple" bind:value={radius} min={0} max={2} step={0.025} />
				</div>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<div class="text-sm">Spacing</div>
						<span class="text-muted-foreground w-14 text-right text-xs tabular-nums">{spacing[0].toFixed(3)}rem</span>
					</div>
					<Slider type="multiple" bind:value={spacing} min={0} max={0.5} step={0.005} />
				</div>
			</section>

			<Separator />

			<!-- ── Colors ── -->
			<section class="space-y-3">
				<h3 class="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Colors</h3>
				<div class="grid grid-cols-2 gap-x-4 gap-y-2">
					{#each colorRows as row}
						<label class="flex cursor-pointer items-center gap-2">
							<span
								class="relative size-6 shrink-0 overflow-hidden rounded-md border shadow-sm"
								style="background:{row.bind()}"
							>
								<input
									type="color"
									value={row.bind()}
									oninput={(e) => row.set((e.currentTarget as HTMLInputElement).value)}
									class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
								/>
							</span>
							<span class="truncate text-sm">{row.label}</span>
						</label>
					{/each}
				</div>
			</section>

			<Separator />

			<!-- ── Typography ── -->
			<section class="space-y-3">
				<h3 class="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Typography</h3>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<div class="text-sm">Letter Spacing</div>
						<span class="text-muted-foreground w-14 text-right text-xs tabular-nums">{letterSpacing[0].toFixed(3)}em</span>
					</div>
					<Slider type="multiple" bind:value={letterSpacing} min={-0.05} max={0.1} step={0.005} />
				</div>
			</section>

			<Separator />

			<!-- ── Shadows ── -->
			<section class="space-y-3">
				<h3 class="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Shadows</h3>
				{#each [
					{ label: 'Opacity',   bind: shadowOpacity,  set: (v: number[]) => (shadowOpacity = v),  min: 0, max: 1,   step: 0.01,  unit: '' },
					{ label: 'Blur',      bind: shadowBlur,     set: (v: number[]) => (shadowBlur = v),     min: 0, max: 30,  step: 1,     unit: 'px' },
					{ label: 'Spread',    bind: shadowSpread,   set: (v: number[]) => (shadowSpread = v),   min: 0, max: 20,  step: 1,     unit: 'px' },
					{ label: 'Offset X',  bind: shadowOffsetX,  set: (v: number[]) => (shadowOffsetX = v),  min: -10, max: 10, step: 1,    unit: 'px' },
					{ label: 'Offset Y',  bind: shadowOffsetY,  set: (v: number[]) => (shadowOffsetY = v),  min: -10, max: 10, step: 1,    unit: 'px' },
				] as row}
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<div class="text-sm">{row.label}</div>
							<span class="text-muted-foreground w-14 text-right text-xs tabular-nums">
								{row.bind[0].toFixed(row.unit === '' ? 2 : 0)}{row.unit}
							</span>
						</div>
						<Slider
							type="multiple"
							value={row.bind}
							onValueChange={row.set}
							min={row.min}
							max={row.max}
							step={row.step}
						/>
					</div>
				{/each}
			</section>
		</div>
	</Popover.Content>
</Popover.Root>
