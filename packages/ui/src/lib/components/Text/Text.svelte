<script lang="ts">
  import classNames from 'classnames';
  import type { TextProps } from './types';
  let { children, as = 'p', size = '1rem', color = 'var(--fg)', weight = 400, ...restProps }: TextProps = $props();
  const titleClasses = classNames('text', restProps.class ?? '');
</script>

<svelte:element
  this={as}
  {...restProps}
  class={titleClasses}
  style="--textFontWeight: {weight}; --textColor: {color}; --textSize: {size}"
>
  {@render children()}
</svelte:element>

<style>
  .text {
    line-height: 1.5;
    font-size: var(--textSize);
    color: var(--textColor);
    font-weight: var(--textFontWeight);
  }
</style>
