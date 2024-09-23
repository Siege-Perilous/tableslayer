<script lang="ts">
  import { ColorMode, PropsTable, Title } from '@tableslayer/ui';
  import type { ExampleProps } from './types';
  let { children, propsName, title, layout, ...restProps }: ExampleProps = $props();
  import classNames from 'classnames';

  const contentClasses = classNames('ex__content', layout && `ex__content--${layout}`);
</script>

<Title as="h2" size="md" style="margin-bottom: var(--size-5)">{title}</Title>

<div class="ex" {...restProps}>
  <ColorMode mode="light">
    <div class="ex__block">
      <Title as="h3" size="xs">Light mode</Title>
      <div class={contentClasses}>
        {@render children()}
      </div>
    </div>
  </ColorMode>

  <ColorMode mode="dark">
    <div class="ex__block">
      <Title as="h3" size="xs">Dark mode</Title>
      <div class={contentClasses}>
        {@render children()}
      </div>
    </div>
  </ColorMode>
</div>

{#if propsName}
  <PropsTable componentName={propsName} />
{/if}

<style>
  .ex {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    border: var(--border-1);
  }
  .ex__block {
    padding: var(--size-5);
    background: var(--bg);
    min-height: 20vh;
    display: flex;
    flex-direction: column;
  }
  .ex__content {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--size-4);
    justify-content: center;
  }
  .ex__content--column {
    flex-direction: column;
  }
  .ex__content--row {
    flex-direction: row;
  }
</style>
