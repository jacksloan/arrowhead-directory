<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zod4 } from 'sveltekit-superforms/adapters';
  import { untrack } from 'svelte';
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
  import { Textarea } from '$lib/components/ui/textarea/index.js';
  import type { Business } from '$lib/types';

  let {
    business,
    formData,
    open = $bindable(false),
  }: {
    business: Business;
    formData: any;
    open: boolean;
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
      $form.category = business.category;
      $form.subcategories = business.subcategories.join(', ');
      $form.services = business.services.join(', ');
    }
  });
</script>

<Dialog bind:open>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Edit listing</DialogTitle>
    </DialogHeader>

    <form method="POST" action="/?/updateBusiness" use:enhance class="flex flex-col gap-4">
      <input type="hidden" name="id" bind:value={$form.id} />
      <input type="hidden" name="category" bind:value={$form.category} />

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
          <Label for="eb-description">Description</Label>
          <Textarea id="eb-description" name="description" rows={3} bind:value={$form.description} />
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
