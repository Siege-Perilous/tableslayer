<script lang="ts">
  import type { LinkBoxProps } from './types';
  let { as, children }: LinkBoxProps = $props();
</script>

<svelte:element this={as} class="linkBox">
  {@render children()}
</svelte:element>

<style>
  .linkBox {
    position: relative;
  }
  :global {
    .linkBox a:not(.linkOverlay) {
      position: relative;
      z-index: 1;
    }
  }
</style>
