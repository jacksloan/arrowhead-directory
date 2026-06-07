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

  $effect(() => {
    if (open) {
      $form.id = business.id!;
      $form.name = business.name;
      $form.email = business.email ?? null;
      $form.phones = business.phones.join(', ');
      $form.address = business.address ?? null;
      $form.website = business.website ?? null;
      $form.description = business.description ?? null;
      $form.categories = business.categories.map((c) => c.name).join(', ');
      $form.services = business.services.map((s) => s.name).join(', ');
    }
  });

  let deleteConfirmOpen = $state(false);
  let deleting = $state(false);
  let deleteError = $state<string | null>(null);
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
                class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="More options"
              >
                <Settings class="h-4 w-4" />
              </button>
            {/snippet}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              class="text-destructive focus:text-destructive"
              onclick={() => (deleteConfirmOpen = true)}
            >
              <Trash2 class="mr-2 h-4 w-4" />
              Delete listing
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

        <div class="flex flex-col gap-1.5">
          <Label for="eb-phones">Phone numbers</Label>
          <Input id="eb-phones" name="phones" bind:value={$form.phones} placeholder="218-555-0101, 218-555-0202" />
          <p class="text-xs text-muted-foreground">Comma-separated</p>
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
          <Label for="eb-categories">Categories</Label>
          <Input id="eb-categories" name="categories" bind:value={$form.categories} placeholder="Plumbing, Electrical" />
          <p class="text-xs text-muted-foreground">Comma-separated</p>
          {#if $errors.categories}<p class="text-xs text-destructive">{$errors.categories}</p>{/if}
        </div>

        <div class="col-span-2 flex flex-col gap-1.5">
          <Label for="eb-services">Services</Label>
          <Input id="eb-services" name="services" bind:value={$form.services} placeholder="Drain cleaning, Water heater repair" />
          <p class="text-xs text-muted-foreground">Comma-separated</p>
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
