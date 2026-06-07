<script lang="ts">
  import DirectoryTable from '$lib/components/DirectoryTable.svelte';
  let { data } = $props();
</script>

<svelte:head>
  <title>Arrowhead Directory</title>
</svelte:head>

<DirectoryTable
  businesses={data.businesses}
  user={(data as any).user ?? null}
  formData={data.form}
  isAdmin={(data as any).isAdmin ?? false}
  allCategories={(data as any).allCategories ?? []}
  allServices={(data as any).allServices ?? []}
/>
