<script lang="ts">
  import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Checkbox } from '$lib/components/ui/checkbox/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';

  let {
    categories,
    selectedCategories = $bindable([]),
  }: {
    categories: string[];
    selectedCategories: string[];
  } = $props();

  function toggle(cat: string) {
    if (selectedCategories.includes(cat)) {
      selectedCategories = selectedCategories.filter((c) => c !== cat);
    } else {
      selectedCategories = [...selectedCategories, cat];
    }
  }
</script>

<Popover>
  <PopoverTrigger>
    {#snippet child({ props })}
      <Button {...props} variant="outline" size="icon" aria-label="Filter">
        <SlidersHorizontal class="h-4 w-4" />
      </Button>
    {/snippet}
  </PopoverTrigger>
  <PopoverContent class="w-64" align="end">
    <p class="mb-3 text-sm font-medium">Filter by category</p>
    <div class="flex max-h-64 flex-col gap-2 overflow-y-auto">
      {#each categories as cat (cat)}
        <div class="flex items-center gap-2">
          <Checkbox
            id={cat}
            checked={selectedCategories.includes(cat)}
            onCheckedChange={() => toggle(cat)}
          />
          <Label for={cat} class="cursor-pointer text-sm">{cat}</Label>
        </div>
      {/each}
    </div>
    {#if selectedCategories.length > 0}
      <Button
        variant="ghost"
        class="mt-3 w-full text-xs"
        onclick={() => (selectedCategories = [])}
      >
        Clear filters
      </Button>
    {/if}
  </PopoverContent>
</Popover>
