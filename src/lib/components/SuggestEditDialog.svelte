<script lang="ts">
  import { enhance } from '$app/forms';
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
    open = $bindable(false),
  }: {
    business: Business;
    open: boolean;
  } = $props();

  let submitting = $state(false);
  let submitted = $state(false);
  let errorMsg = $state<string | null>(null);

  let name = $state('');
  let email = $state('');
  let phones = $state('');
  let address = $state('');
  let website = $state('');
  let description = $state('');

  $effect(() => {
    if (open) {
      submitted = false;
      errorMsg = null;
      name = business.name;
      email = business.email ?? '';
      phones = business.phones.join(', ');
      address = business.address ?? '';
      website = business.website ?? '';
      description = business.description ?? '';
    }
  });
</script>

<Dialog bind:open>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Suggest an edit</DialogTitle>
    </DialogHeader>

    {#if submitted}
      <div class="py-6 text-center">
        <p class="text-sm font-medium">Thank you!</p>
        <p class="mt-1 text-sm text-muted-foreground">Your suggestion has been submitted for admin review.</p>
        <Button class="mt-4" onclick={() => (open = false)}>Close</Button>
      </div>
    {:else}
      <form
        method="POST"
        action="/?/suggestEdit"
        use:enhance={() => {
          submitting = true;
          errorMsg = null;
          return async ({ result }) => {
            submitting = false;
            if (result.type === 'success') {
              submitted = true;
            } else if (result.type === 'failure') {
              errorMsg = (result.data as any)?.message ?? 'Something went wrong.';
            }
          };
        }}
        class="flex flex-col gap-4"
      >
        <input type="hidden" name="business_id" value={business.id} />
        <input type="hidden" name="category" value={business.category} />

        <p class="text-xs text-muted-foreground">
          Edit the fields you'd like to suggest changes for. An admin will review your submission.
        </p>

        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2 flex flex-col gap-1.5">
            <Label for="se-name">Business name</Label>
            <Input id="se-name" name="name" bind:value={name} required />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="se-phones">Phone numbers</Label>
            <Input id="se-phones" name="phones" bind:value={phones} placeholder="218-555-0101, 218-555-0202" />
            <p class="text-xs text-muted-foreground">Comma-separated</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="se-website">Website</Label>
            <Input id="se-website" name="website" bind:value={website} />
          </div>

          <div class="col-span-2 flex flex-col gap-1.5">
            <Label for="se-email">Email</Label>
            <Input id="se-email" name="email" type="email" bind:value={email} />
          </div>

          <div class="col-span-2 flex flex-col gap-1.5">
            <Label for="se-address">Address</Label>
            <Input id="se-address" name="address" bind:value={address} />
          </div>

          <div class="col-span-2 flex flex-col gap-1.5">
            <Label for="se-description">Description</Label>
            <Textarea id="se-description" name="description" rows={3} bind:value={description} />
          </div>
        </div>

        {#if errorMsg}
          <p class="text-xs text-destructive">{errorMsg}</p>
        {/if}

        <DialogFooter>
          <Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit suggestion'}
          </Button>
        </DialogFooter>
      </form>
    {/if}
  </DialogContent>
</Dialog>
