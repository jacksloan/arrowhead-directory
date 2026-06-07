<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zod4 } from 'sveltekit-superforms/adapters';
  import { untrack } from 'svelte';
  import { enhance as appEnhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { businessSchema } from '$lib/schemas';
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
  } from '$lib/components/ui/dialog/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '$lib/components/ui/select/index.js';
  import { PHONE_TYPES, PHONE_TYPE_LABELS } from '$lib/utils/phones';
  import type { PhoneType } from '$lib/types';
  import RichTextEditor from './RichTextEditor.svelte';
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from '$lib/components/ui/alert-dialog/index.js';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '$lib/components/ui/dropdown-menu/index.js';
  import Settings from '@lucide/svelte/icons/settings';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Check from '@lucide/svelte/icons/check';
  import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover/index.js';
  import { lookupStore, ensureLookupLoaded } from '$lib/stores/lookup.svelte';
  import SuggestLookupDialog from './SuggestLookupDialog.svelte';
  import type { Business } from '$lib/types';

  let {
    business,
    formData,
    open = $bindable(false),
    ondelete,
  }: {
    business: Business;
    formData: any;
    open: boolean;
    ondelete?: (id: string) => void;
  } = $props();

  // superForm must be initialized from the snapshot value, not a reactive reference.
  // untrack() makes the intentional one-time capture explicit to Svelte's compiler.
  const { form, errors, enhance, submitting } = untrack(() => superForm(formData, {
    validators: zod4(businessSchema),
    onResult({ result }) {
      if (result.type === 'success') open = false;
    },
    resetForm: false,
  }));

  let selectedCategoryIds = $state<Set<string>>(new Set());
  let selectedServiceIds = $state<Set<string>>(new Set());

  $effect(() => {
    if (!open) return;
    // Read all reactive sources before untrack so the effect re-runs
    // when open or business changes, but not when form state changes.
    const snap = {
      id: business.id!,
      name: business.name,
      email: business.email ?? null,
      phone_1: business.phones[0]?.number ?? '',
      phone_1_type: business.phones[0]?.type ?? '',
      phone_2: business.phones[1]?.number ?? '',
      phone_2_type: business.phones[1]?.type ?? '',
      address: business.address ?? null,
      website: business.website ?? null,
      description: business.description ?? null,
      categoryIds: business.categories.slice(0, 1).map((c) => c.id),
      serviceIds: business.services.map((s) => s.id),
    };
    untrack(() => {
      ensureLookupLoaded();
      $form.id = snap.id;
      $form.name = snap.name;
      $form.email = snap.email;
      $form.phone_1 = snap.phone_1;
      $form.phone_1_type = snap.phone_1_type;
      $form.phone_2 = snap.phone_2;
      $form.phone_2_type = snap.phone_2_type;
      $form.address = snap.address;
      $form.website = snap.website;
      $form.description = snap.description;
      selectedCategoryIds = new Set(snap.categoryIds);
      selectedServiceIds = new Set(snap.serviceIds);
      $form.categories = snap.categoryIds.join(',');
      $form.services = snap.serviceIds.join(',');
    });
  });

  function selectCategory(id: string) {
    selectedCategoryIds = new Set([id]);
    $form.categories = id;
  }

  function toggleService(id: string, checked: boolean) {
    const next = new Set(selectedServiceIds);
    if (checked) next.add(id); else next.delete(id);
    selectedServiceIds = next;
    $form.services = [...next].join(',');
  }

  let deleteConfirmOpen = $state(false);
  let deleting = $state(false);
  let deleteError = $state<string | null>(null);
  let suggestCategoryOpen = $state(false);
  let suggestServiceOpen = $state(false);
</script>

<Dialog bind:open>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <div class="flex items-center gap-2 pr-10">
        <DialogTitle class="flex-1">Edit listing</DialogTitle>
        <DropdownMenu>
          <DropdownMenuTrigger>
            {#snippet child({ props })}
              <button
                {...props}
                class="rounded-md -mt-2 -mr-2 p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="More options"
              >
                <Settings class="h-4 w-4" />
              </button>
            {/snippet}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              class="text-destructive focus:text-destructive flex items-center gap-2 px-2 text-nowrap"
              onclick={() => (deleteConfirmOpen = true)}
            >
              <Trash2 class="h-4 w-4" />
              Delete Listing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </DialogHeader>

    <form method="POST" action="/?/updateBusiness" use:enhance class="flex flex-col gap-4">
      <input type="hidden" name="id" bind:value={$form.id} />

      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2 flex flex-col gap-1.5">
          <Label for="eb-name">Business name</Label>
          <Input id="eb-name" name="name" bind:value={$form.name} />
          {#if $errors.name}<p class="text-xs text-destructive">{$errors.name}</p>{/if}
        </div>

        <div class="col-span-2 flex flex-col gap-1.5">
          <Label>Phone numbers</Label>
          <div class="flex items-center gap-2">
            <Input
              name="phone_1"
              bind:value={$form.phone_1}
              placeholder="218-555-0101"
              class="flex-1"
            />
            <Select type="single" name="phone_1_type" bind:value={$form.phone_1_type}>
              <SelectTrigger class="w-28">
                {$form.phone_1_type ? PHONE_TYPE_LABELS[$form.phone_1_type as PhoneType] : 'Type'}
              </SelectTrigger>
              <SelectContent>
                {#each PHONE_TYPES as t (t)}
                  <SelectItem value={t}>{PHONE_TYPE_LABELS[t]}</SelectItem>
                {/each}
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center gap-2">
            <Input
              name="phone_2"
              bind:value={$form.phone_2}
              placeholder="218-555-0202"
              class="flex-1"
            />
            <Select type="single" name="phone_2_type" bind:value={$form.phone_2_type}>
              <SelectTrigger class="w-28">
                {$form.phone_2_type ? PHONE_TYPE_LABELS[$form.phone_2_type as PhoneType] : 'Type'}
              </SelectTrigger>
              <SelectContent>
                {#each PHONE_TYPES as t (t)}
                  <SelectItem value={t}>{PHONE_TYPE_LABELS[t]}</SelectItem>
                {/each}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="eb-website">Website</Label>
          <Input id="eb-website" name="website" bind:value={$form.website} />
          {#if $errors.website}<p class="text-xs text-destructive">{$errors.website}</p>{/if}
        </div>

        <div class="col-span-2 flex flex-col gap-1.5">
          <Label for="eb-address">Address</Label>
          <Input id="eb-address" name="address" bind:value={$form.address} />
        </div>

        <div class="col-span-2 flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <Label>Categories</Label>
            <button
              type="button"
              class="text-xs text-muted-foreground hover:text-foreground"
              onclick={() => (suggestCategoryOpen = true)}
            >
              Suggest a category
            </button>
          </div>
          <input type="hidden" name="categories" value={$form.categories} />
          <Popover>
            <PopoverTrigger>
              {#snippet child({ props })}
                <Button variant="outline" {...props} class="h-auto min-h-9 w-full justify-between px-3 font-normal">
                  {#if selectedCategoryIds.size === 0}
                    <span class="text-muted-foreground">Select a category…</span>
                  {:else}
                    <div class="flex flex-wrap gap-1">
                      {#each lookupStore.categories.filter(c => selectedCategoryIds.has(c.id)) as cat (cat.id)}
                        <span class="rounded-sm bg-secondary px-1.5 py-0.5 text-xs">{cat.name}</span>
                      {/each}
                    </div>
                  {/if}
                  <ChevronDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              {/snippet}
            </PopoverTrigger>
            <PopoverContent class="w-auto min-w-32 p-1" align="start">
              <div class="max-h-52 overflow-y-auto">
                {#each lookupStore.categories as cat (cat.id)}
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 whitespace-nowrap rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onclick={() => selectCategory(cat.id)}
                  >
                    <Check class="h-4 w-4 {selectedCategoryIds.has(cat.id) ? 'opacity-100' : 'opacity-0'}" />
                    {cat.name}
                  </button>
                {:else}
                  <p class="px-2 py-3 text-center text-xs text-muted-foreground">No categories yet.</p>
                {/each}
              </div>
            </PopoverContent>
          </Popover>
          {#if $errors.categories}<p class="text-xs text-destructive">{$errors.categories}</p>{/if}
        </div>

        <div class="col-span-2 flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <Label>Services</Label>
            <button
              type="button"
              class="text-xs text-muted-foreground hover:text-foreground"
              onclick={() => (suggestServiceOpen = true)}
            >
              Suggest a service
            </button>
          </div>
          <input type="hidden" name="services" value={$form.services} />
          <Popover>
            <PopoverTrigger>
              {#snippet child({ props })}
                <Button variant="outline" {...props} class="h-auto min-h-9 w-full justify-between px-3 font-normal">
                  {#if selectedServiceIds.size === 0}
                    <span class="text-muted-foreground">Select services…</span>
                  {:else}
                    <div class="flex flex-wrap gap-1">
                      {#each lookupStore.services.filter(s => selectedServiceIds.has(s.id)) as svc (svc.id)}
                        <span class="rounded-sm bg-secondary px-1.5 py-0.5 text-xs">{svc.name}</span>
                      {/each}
                    </div>
                  {/if}
                  <ChevronDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              {/snippet}
            </PopoverTrigger>
            <PopoverContent class="w-auto min-w-32 p-1" align="start">
              <div class="max-h-52 overflow-y-auto">
                {#each lookupStore.services as svc (svc.id)}
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 whitespace-nowrap rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onclick={() => toggleService(svc.id, !selectedServiceIds.has(svc.id))}
                  >
                    <Check class="h-4 w-4 {selectedServiceIds.has(svc.id) ? 'opacity-100' : 'opacity-0'}" />
                    {svc.name}
                  </button>
                {:else}
                  <p class="px-2 py-3 text-center text-xs text-muted-foreground">No services yet.</p>
                {/each}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div class="col-span-2 flex flex-col gap-1.5">
          <Label for="eb-description">Description</Label>
          <RichTextEditor
            name="description"
            bind:value={$form.description}
            placeholder="Describe this business…"
            class="rounded-md border border-input bg-background"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
        <Button type="submit" disabled={$submitting}>
          {$submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

<AlertDialog bind:open={deleteConfirmOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
      <AlertDialogDescription>
        This will remove <strong>{business.name}</strong> from the public directory. The record is kept for admin review and can be restored later.
      </AlertDialogDescription>
    </AlertDialogHeader>
    {#if deleteError}
      <p class="text-xs text-destructive">{deleteError}</p>
    {/if}
    <AlertDialogFooter>
      <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
      <form
        method="POST"
        action="/?/deleteBusiness"
        use:appEnhance={() => {
          deleting = true;
          deleteError = null;
          return async ({ result }) => {
            deleting = false;
            if (result.type === 'success' && (result.data as any)?.deleted) {
              deleteConfirmOpen = false;
              open = false;
              ondelete?.(business.id!);
              await invalidateAll();
            } else if (result.type === 'failure') {
              deleteError = (result.data as any)?.message ?? 'Something went wrong.';
            }
          };
        }}
      >
        <input type="hidden" name="id" value={business.id} />
        <AlertDialogAction
          type="submit"
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Yes, delete it'}
        </AlertDialogAction>
      </form>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

<SuggestLookupDialog
  type="category"
  businessId={business.id!}
  bind:open={suggestCategoryOpen}
/>

<SuggestLookupDialog
  type="service"
  businessId={business.id!}
  bind:open={suggestServiceOpen}
/>
