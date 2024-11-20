<script lang="ts">
  import classNames from 'classnames';
  import type { TextProps } from './types';
  let { children, as = 'p', size = 'md', style, ...restProps }: TextProps = $props();
  const titleClasses = classNames('text', `text-${size}`, restProps.class ?? '');
</script>

<svelte:element this={as} {...restProps} class={titleClasses} {style}>
  {@render children()}
</svelte:element>

<style>
  .text {
    line-height: 1.5;
  }

  .text-xs {
    font-size: 0.75rem;
  }

  .text-sm {
    font-size: 0.875rem;
  }

  .text-md {
    font-size: 1rem;
  }

  .text-lg {
    font-size: 1.125rem;
  }

  .text-xl {
    font-size: 1.75rem;
  }
</style>
