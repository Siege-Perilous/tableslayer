<script lang="ts">
  import type { LinkOverlayProps } from './types';
  let { href, children }: LinkOverlayProps = $props();
</script>

<a {href} class="linkOverlay">
  {@render children()}
</a>

<style>
  .linkOverlay::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
  }
</style>
