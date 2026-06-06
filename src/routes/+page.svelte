<script lang="ts">
  import DirectoryTable from '$lib/components/DirectoryTable.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>Arrowhead Directory</title>
</svelte:head>

<DirectoryTable businesses={data.businesses} user={(data as { businesses: typeof data.businesses; user?: { email: string } | null }).user ?? null} />
