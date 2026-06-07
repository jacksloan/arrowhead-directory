<script lang="ts">
  import { enhance } from '$app/forms';

  let { data } = $props();

  let removedIds = $state(new Set<string>());
  const suggestions = $derived(data.suggestions.filter((s: any) => !removedIds.has(s.id)));

  const DIFF_FIELDS: { key: string; label: string; array?: boolean; html?: boolean; businessKey?: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phones', label: 'Phones', array: true },
    { key: 'website', label: 'Website' },
    { key: 'address', label: 'Address' },
    { key: 'category', label: 'Category' },
    { key: 'subcategories', label: 'Categories', array: true, businessKey: 'categories_display' },
    { key: 'services', label: 'Services', array: true, businessKey: 'services_display' },
    { key: 'description', label: 'Description', html: true },
  ];

  function stripHtml(html: string | null): string {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
  }

  function display(val: unknown, array?: boolean): string {
    if (val === null || val === undefined || val === '') return '—';
    if (array && Array.isArray(val)) return val.length === 0 ? '—' : val.join(', ');
    return String(val);
  }

  function hasChanged(
    suggestion: any,
    business: any,
    key: string,
    isArray: boolean = false,
    isHtml: boolean = false
  ): boolean {
    if (isHtml) {
      return stripHtml(suggestion[key]) !== stripHtml(business[key]);
    }
    return display(suggestion[key], isArray) !== display(business[key], isArray);
  }

  function businessDisplayRaw(business: any, field: typeof DIFF_FIELDS[number]): any {
    if (field.businessKey === 'categories_display') {
      return (business?.categories ?? []).map((c: any) => c.name);
    }
    if (field.businessKey === 'services_display') {
      return (business?.services ?? []).map((s: any) => s.name);
    }
    return business?.[field.key];
  }

  function businessDisplay(business: any, field: typeof DIFF_FIELDS[number]): string {
    if (field.businessKey === 'categories_display') {
      return display((business?.categories ?? []).map((c: any) => c.name), true);
    }
    if (field.businessKey === 'services_display') {
      return display((business?.services ?? []).map((s: any) => s.name), true);
    }
    return display(business?.[field.key], field.array);
  }

  let submitting = $state<string | null>(null);
  let errors = $state<Record<string, string>>({});
</script>

<svelte:head>
  <title>Suggested Edits — Arrowhead Directory</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
  <div class="mb-6">
    <h1 class="text-2xl font-bold">Suggested Edits</h1>
    <p class="mt-1 text-sm text-muted-foreground">
      {suggestions.length} pending suggestion{suggestions.length === 1 ? '' : 's'}
    </p>
  </div>

  {#if suggestions.length === 0}
    <p class="py-16 text-center text-sm text-muted-foreground">No pending suggestions.</p>
  {:else}
    <div class="flex flex-col gap-6">
      {#each suggestions as suggestion (suggestion.id)}
        {@const business = suggestion.businesses}
        <div class="rounded-lg border bg-card">
          <div class="flex items-start justify-between gap-4 border-b px-4 py-3">
            <div>
              <p class="text-sm font-semibold">{suggestion.name}</p>
              <p class="text-xs text-muted-foreground">
                Suggested by {suggestion.suggested_by} · {new Date(suggestion.created_at).toLocaleDateString()}
              </p>
            </div>
            <div class="flex gap-2">
              <form
                method="POST"
                action="/suggested-edits?/rejectEdit"
                use:enhance={() => {
                  submitting = suggestion.id;
                  return async ({ result }) => {
                    submitting = null;
                    if (result.type === 'success') {
                      removedIds.add(suggestion.id);
                    } else if (result.type === 'failure') {
                      errors[suggestion.id] = (result.data as any)?.message ?? 'Error';
                    }
                  };
                }}
              >
                <input type="hidden" name="id" value={suggestion.id} />
                <button
                  type="submit"
                  class="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                  disabled={submitting === suggestion.id}
                >Reject</button>
              </form>
              <form
                method="POST"
                action="/suggested-edits?/approveEdit"
                use:enhance={() => {
                  submitting = suggestion.id;
                  return async ({ result }) => {
                    submitting = null;
                    if (result.type === 'success') {
                      removedIds.add(suggestion.id);
                    } else if (result.type === 'failure') {
                      errors[suggestion.id] = (result.data as any)?.message ?? 'Error';
                    }
                  };
                }}
              >
                <input type="hidden" name="id" value={suggestion.id} />
                <button
                  type="submit"
                  class="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
                  disabled={submitting === suggestion.id}
                >Approve</button>
              </form>
            </div>
          </div>

          {#if errors[suggestion.id]}
            <p class="px-4 py-2 text-xs text-destructive">{errors[suggestion.id]}</p>
          {/if}

          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b bg-muted/40">
                  <th class="w-24 px-4 py-2 text-left font-medium text-muted-foreground">Field</th>
                  <th class="px-4 py-2 text-left font-medium text-muted-foreground">Current</th>
                  <th class="px-4 py-2 text-left font-medium text-muted-foreground">Suggested</th>
                </tr>
              </thead>
              <tbody>
                {#each DIFF_FIELDS as field (field.key)}
                  {@const businessRaw = businessDisplayRaw(business, field)}
                  {@const changed = business && (field.html
                    ? stripHtml(suggestion[field.key]) !== stripHtml(businessRaw)
                    : display(suggestion[field.key], field.array) !== display(businessRaw, field.array))}
                  <tr class="border-b last:border-0 {changed ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}">
                    <td class="px-4 py-2 font-medium text-muted-foreground">{field.label}</td>
                    <td class="px-4 py-2 text-muted-foreground">
                      {#if field.html}
                        <div class="[&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4">
                          {@html business ? businessDisplay(business, field) : '—'}
                        </div>
                      {:else}
                        {business ? businessDisplay(business, field) : '—'}
                      {/if}
                    </td>
                    <td class="px-4 py-2 {changed ? 'font-medium text-foreground' : 'text-muted-foreground'}">
                      {#if field.html}
                        <div class="[&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4">
                          {@html display(suggestion[field.key], field.array)}
                        </div>
                      {:else}
                        {display(suggestion[field.key], field.array)}
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
