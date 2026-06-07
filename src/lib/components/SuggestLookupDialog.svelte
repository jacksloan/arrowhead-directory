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

  let {
    type,
    businessId,
    open = $bindable(false),
  }: {
    type: 'category' | 'service';
    businessId: string;
    open: boolean;
  } = $props();

  let name = $state('');
  let submitted = $state(false);
  let submitting = $state(false);
  let errorMsg = $state<string | null>(null);

  $effect(() => {
    if (!open) {
      name = '';
      submitted = false;
      submitting = false;
      errorMsg = null;
    }
  });
</script>

<Dialog bind:open>
  <DialogContent class="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle>Suggest a {type}</DialogTitle>
    </DialogHeader>

    {#if submitted}
      <p class="py-2 text-sm text-muted-foreground">
        Thanks! Your suggestion has been sent to admins for review.
      </p>
      <DialogFooter>
        <Button onclick={() => (open = false)}>Close</Button>
      </DialogFooter>
    {:else}
      <form
        method="POST"
        action="/?/suggestLookup"
        class="flex flex-col gap-4"
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
      >
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="business_id" value={businessId} />
        <div class="flex flex-col gap-1.5">
          <Label for="suggest-name">{type === 'category' ? 'Category' : 'Service'} name</Label>
          <Input
            id="suggest-name"
            name="name"
            bind:value={name}
            placeholder={type === 'category' ? 'e.g. Automotive' : 'e.g. Oil Change'}
            required
          />
        </div>
        {#if errorMsg}
          <p class="text-xs text-destructive">{errorMsg}</p>
        {/if}
        <DialogFooter>
          <Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? 'Sending…' : 'Send suggestion'}
          </Button>
        </DialogFooter>
      </form>
    {/if}
  </DialogContent>
</Dialog>
