<script lang="ts">
  import { ColorMode, PropsTable, Title } from '@tableslayer/ui';
  import type { ExampleProps } from './types';
  let { children, propsName, title, ...restProps }: ExampleProps = $props();
</script>

<Title as="h2" size="md" style="margin-bottom: var(--size-5)">{title}</Title>

<div class="compare" {...restProps}>
  <ColorMode mode="light">
    <div class="compare__block">
      <Title as="h3" size="xs">Light mode</Title>
      <div class="compare__example">
        {@render children()}
      </div>
    </div>
  </ColorMode>

  <ColorMode mode="dark">
    <div class="compare__block">
      <Title as="h3" size="xs">Dark mode</Title>
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
</style>
