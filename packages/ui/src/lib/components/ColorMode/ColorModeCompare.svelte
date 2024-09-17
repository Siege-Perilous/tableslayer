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
    <div class="compare__block compare__block-border">
      {@render children()}
    </div>
  </ColorMode>
</div>

<style>
  .compare {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    border-bottom: var(--border-1);
  }
  .compare__block {
    padding: var(--size-5);
    background: var(--bg);
    min-height: 20vh;
  }
  .compare__block-border {
    border-right: var(--border-1);
  }
</style>
