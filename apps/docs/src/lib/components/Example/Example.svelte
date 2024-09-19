<script lang="ts">
  import { ColorMode, PropsTable } from '@tableslayer/ui';
  import type { ExampleProps } from './types';
  let { children, propsName, title }: ExampleProps = $props();
</script>

<h2>{title}</h2>

<div class="compare">
  <ColorMode mode="light">
    <div class="compare__block">
      <h3>Light mode</h3>
      <div class="compare__example">
        {@render children()}
      </div>
    </div></ColorMode
  >

  <ColorMode mode="dark">
    <div class="compare__block">
      <h3>Dark mode</h3>
      <div class="compare__example">
        {@render children()}
      </div>
    </div>
  </ColorMode>
</div>

{#if propsName}
  <PropsTable componentName={propsName} />
{/if}

<style>
  .compare {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    border: var(--border-1);
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
  h2 {
    font-size: var(--font-size-3);
    font-weight: var(--font-weight-6);
    margin-bottom: var(--size-5);
  }
  h3 {
    font-size: var(--font-size-2);
    font-weight: var(--font-weight-6);
    margin-bottom: var(--size-5);
  }
</style>
