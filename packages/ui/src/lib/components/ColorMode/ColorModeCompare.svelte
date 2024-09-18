<script lang="ts">
  import { ColorMode } from './';
  import type { ColorModeCompareProps } from './types';
  let { children }: ColorModeCompareProps = $props();
</script>

<div class="compare">
  <ColorMode mode="light">
    <div class="compare__block">
      <h2>Light mode</h2>
      <div class="compare__example">
        {@render children()}
      </div>
    </div></ColorMode
  >

  <ColorMode mode="dark">
    <div class="compare__block compare__block-border">
      <h2>Dark mode</h2>
      <div class="compare__example">
        {@render children()}
      </div>
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
    display: flex;
    flex-direction: column;
  }
  .compare__example {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .compare__block-border {
    border-right: var(--border-1);
  }
  h2 {
    font-size: var(--font-size-3);
    font-weight: var(--font-weight-6);
    margin-bottom: var(--size-5);
  }
</style>
