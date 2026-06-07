<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '$lib/components/ui/select/index.js';
  import ChevronUp from '@lucide/svelte/icons/chevron-up';
  import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
  } from '$lib/components/ui/tooltip/index.js';

  let { data } = $props();

  type Request = (typeof data.requests)[number];

  let votedIds = $state(new Set<string>());
  let unvotedIds = $state(new Set<string>());
  let newRequests = $state<Request[]>([]);

  const allRequests = $derived(
    [...newRequests, ...data.requests]
      .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i)
      .map((r) => ({
        ...r,
        voteCount:
          r.voteCount + (votedIds.has(r.id) ? 1 : 0) - (unvotedIds.has(r.id) ? 1 : 0),
        userVoted: votedIds.has(r.id) ? true : unvotedIds.has(r.id) ? false : r.userVoted,
      }))
      .sort(
        (a, b) =>
          b.voteCount - a.voteCount ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
  );

  const STATUS_LABELS: Record<string, string> = {
    open: 'Open',
    planned: 'Planned',
    completed: 'Completed',
    rejected: 'Rejected',
  };

  const STATUS_COLORS: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    planned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  let showForm = $state(false);
  let titleInput = $state('');
  let descInput = $state('');
  let submitError = $state<string | null>(null);
  let submitting = $state(false);

  let votingId = $state<string | null>(null);
  let statusUpdating = $state<string | null>(null);
  let localStatuses = $state<Record<string, string>>({});
</script>

<svelte:head>
  <title>Feature Requests — Arrowhead Directory</title>
</svelte:head>

<div class="mx-auto max-w-2xl">
  <div class="mb-6 flex items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold">Feature Requests</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Vote for features you'd like to see, or submit your own idea.
      </p>
    </div>
    {#if data.user}
      <Button onclick={() => (showForm = !showForm)} variant={showForm ? 'outline' : 'default'}>
        {showForm ? 'Cancel' : 'Request a feature'}
      </Button>
    {/if}
  </div>

  {#if showForm}
    <div class="mb-6 rounded-lg border bg-card p-5">
      <h2 class="mb-4 text-sm font-semibold">New feature request</h2>
      <form
        method="POST"
        action="/features?/submitRequest"
        use:enhance={() => {
          submitting = true;
          submitError = null;
          return async ({ result }) => {
            submitting = false;
            if (result.type === 'success' && (result.data as any)?.request) {
              newRequests = [(result.data as any).request, ...newRequests];
              titleInput = '';
              descInput = '';
              showForm = false;
            } else if (result.type === 'failure') {
              submitError = (result.data as any)?.message ?? 'Something went wrong.';
            }
          };
        }}
        class="flex flex-col gap-4"
      >
        <div class="flex flex-col gap-1.5">
          <Label for="fr-title">Title <span class="text-destructive">*</span></Label>
          <Input
            id="fr-title"
            name="title"
            bind:value={titleInput}
            placeholder="Short description of the feature"
            required
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="fr-desc">Description</Label>
          <Textarea
            id="fr-desc"
            name="description"
            rows={3}
            bind:value={descInput}
            placeholder="More details about why this would be useful…"
          />
        </div>
        {#if submitError}
          <p class="text-xs text-destructive">{submitError}</p>
        {/if}
        <div class="flex justify-end">
          <Button type="submit" disabled={submitting || !titleInput}>
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        </div>
      </form>
    </div>
  {/if}

  {#if allRequests.length === 0}
    <p class="py-16 text-center text-sm text-muted-foreground">
      No feature requests yet. Be the first!
    </p>
  {:else}
    <div class="flex flex-col gap-3">
      {#each allRequests as req (req.id)}
        {@const displayStatus = localStatuses[req.id] ?? req.status}
        <div class="flex gap-4 rounded-lg border bg-card p-4">
          <!-- Vote button -->
          <div class="flex flex-col items-center gap-1">
            <form
              method="POST"
              action="/features?/{req.userVoted ? 'unvote' : 'vote'}"
              use:enhance={() => {
                votingId = req.id;
                return async ({ result }) => {
                  votingId = null;
                  if (result.type === 'success') {
                    if (req.userVoted) {
                      unvotedIds.add(req.id);
                      votedIds.delete(req.id);
                    } else {
                      votedIds.add(req.id);
                      unvotedIds.delete(req.id);
                    }
                  }
                };
              }}
            >
              <input type="hidden" name="request_id" value={req.id} />
              {#if !data.user}
                <Tooltip>
                  <TooltipTrigger>
                    {#snippet child({ props })}
                      <button
                        {...props}
                        type="button"
                        disabled
                        class="flex flex-col items-center gap-0.5 rounded-md border border-border px-2 py-1.5 text-muted-foreground opacity-40"
                      >
                        <ChevronUp class="h-4 w-4" />
                        <span class="text-xs font-medium">{req.voteCount}</span>
                      </button>
                    {/snippet}
                  </TooltipTrigger>
                  <TooltipContent>Log in to vote</TooltipContent>
                </Tooltip>
              {:else}
                <button
                  type="submit"
                  disabled={votingId === req.id}
                  class="flex flex-col items-center gap-0.5 rounded-md border px-2 py-1.5 transition-colors
                    {req.userVoted
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}
                    disabled:opacity-40"
                  title={req.userVoted ? 'Remove vote' : 'Upvote'}
                >
                  <ChevronUp class="h-4 w-4" />
                  <span class="text-xs font-medium">{req.voteCount}</span>
                </button>
              {/if}
            </form>
          </div>

          <!-- Content -->
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-start gap-2">
              <p class="text-sm font-semibold leading-snug">{req.title}</p>
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-medium {STATUS_COLORS[displayStatus]}"
              >
                {STATUS_LABELS[displayStatus]}
              </span>
            </div>
            {#if req.description}
              <p class="mt-1 text-xs leading-relaxed text-muted-foreground">{req.description}</p>
            {/if}
            <p class="mt-2 text-[10px] text-muted-foreground">
              Submitted by {req.creator_email} · {new Date(req.created_at).toLocaleDateString()}
            </p>

            <!-- Admin status controls -->
            {#if data.isAdmin}
              <form
                method="POST"
                action="/features?/updateStatus"
                class="mt-2 flex items-center gap-2"
                use:enhance={() => {
                  statusUpdating = req.id;
                  return async ({ result }) => {
                    if (result.type === 'success') {
                      localStatuses[req.id] = (result.data as any).status;
                      await invalidateAll();
                    }
                    statusUpdating = null;
                  };
                }}
              >
                <input type="hidden" name="id" value={req.id} />
                <Select
                  type="single"
                  name="status"
                  value={localStatuses[req.id] ?? req.status}
                  onValueChange={(v) => {
                    if (v) localStatuses[req.id] = v;
                  }}
                >
                  <SelectTrigger class="h-7 w-36 text-xs">
                    {STATUS_LABELS[localStatuses[req.id] ?? req.status]}
                  </SelectTrigger>
                  <SelectContent>
                    {#each Object.entries(STATUS_LABELS) as [val, label] (val)}
                      <SelectItem value={val}>{label}</SelectItem>
                    {/each}
                  </SelectContent>
                </Select>
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  class="h-7 text-xs"
                  disabled={statusUpdating === req.id}
                >
                  {statusUpdating === req.id ? 'Saving…' : 'Update'}
                </Button>
              </form>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
