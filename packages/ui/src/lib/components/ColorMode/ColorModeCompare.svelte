<script lang="ts">
  import { ColorMode } from './';
  import type { ColorModeCompareProps } from './types';
  let { children }: ColorModeCompareProps = $props();
</script>

<div class="compare">
  <ColorMode mode="light">
    <div class="compare__block">
      {@render children()}
      <div></div>
    </div></ColorMode
  >

  <ColorMode mode="dark">
    <div class="compare__block">
      {@render children()}
    </div>
  </ColorMode>
</div>

<style>
  .compare {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--size-4);
  }
  .compare__block {
    padding: var(--size-4);
    border-radius: var(--radius-1);
    background: var(--bg);
  }
</style>
