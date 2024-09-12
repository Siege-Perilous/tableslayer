<script lang="ts">
  import type { Snippet } from 'svelte';

  interface ColorModeProps {
    children: Snippet;
    mode: 'light' | 'dark';
    as?: keyof HTMLElementTagNameMap;
  }
  let { children, mode, as = 'div' }: ColorModeProps = $props();
</script>

<svelte:element this={as} class={mode}>
  {@render children()}
</svelte:element>
