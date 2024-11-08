<script lang="ts">
  import classNames from 'classnames';
  import type { TitleProps } from './types';
  let { children, as = 'p', size, style, ...restProps }: TitleProps = $props();
  const titleClasses = classNames('title', `title-${size}`, restProps.class ?? '');
</script>

<svelte:element this={as} {...restProps} class={titleClasses} {style}>
  {@render children()}
</svelte:element>

<style>
  .title {
    font-family: var(--font-serif);
    font-weight: 900;
  }

  .title-xs {
    font-size: var(--font-size-3);
  }

  .title-sm {
    font-size: var(--font-size-4);
  }

  .title-md {
    font-size: var(--font-size-6);
  }

  .title-lg {
    font-size: var(--font-size-7);
    font-feature-settings: 'ss02' 1;
  }

  .title-xl {
    font-size: var(--font-size-10);
    font-feature-settings: 'ss02' 1;
  }
</style>
