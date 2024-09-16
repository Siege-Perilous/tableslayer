<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { SvelteHTMLElements } from 'svelte/elements';

  interface ColorModeProps {
    children: Snippet;
    mode: 'light' | 'dark';
    as?: keyof SvelteHTMLElements;
  }
  let { children, mode, as = 'div' }: ColorModeProps = $props();
</script>

<svelte:element this={as} class={mode}>
  {@render children()}
</svelte:element>
