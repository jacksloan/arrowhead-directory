<script lang="ts">
  import { onMount } from 'svelte';

  let {
    value = $bindable(''),
    name,
    placeholder = 'Enter a description…',
    class: className = '',
  }: {
    value?: string;
    name?: string;
    placeholder?: string;
    class?: string;
  } = $props();

  let container: HTMLDivElement;
  let quill: any;
  let syncing = false;

  onMount(async () => {
    const [{ default: Quill }] = await Promise.all([
      import('quill'),
      import('quill/dist/quill.snow.css'),
    ]);

    quill = new Quill(container, {
      theme: 'snow',
      placeholder,
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['clean'],
        ],
      },
    });

    if (value) quill.root.innerHTML = value;

    quill.on('text-change', () => {
      if (syncing) return;
      const html = quill.root.innerHTML;
      value = html === '<p><br></p>' ? '' : html;
    });
  });

  $effect(() => {
    if (!quill) return;
    const html = value || '';
    if (quill.root.innerHTML !== html) {
      syncing = true;
      quill.root.innerHTML = html;
      syncing = false;
    }
  });
</script>

{#if name}
  <input type="hidden" {name} {value} />
{/if}
<div bind:this={container} class={className}></div>
