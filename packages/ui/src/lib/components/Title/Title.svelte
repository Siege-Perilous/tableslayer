<script lang="ts">
  import classNames from 'classnames';
  import type { TitleProps } from './types';
  let { children, as = 'p', size, ...restProps }: TitleProps = $props();
  const titleClasses = classNames('title', `title-${size}`);
</script>

<svelte:element this={as} class={titleClasses} {...restProps}>
  {@render children()}
</svelte:element>

<style>
  .title {
    font-weight: var(--font-weight-6);
  }

  .title-xs {
    font-size: var(--font-size-1);
  }

  .title-sm {
    font-size: var(--font-size-2);
  }

  .title-md {
    font-size: var(--font-size-3);
  }

  .title-lg {
    font-size: var(--font-size-5);
  }

  .title-xl {
    font-size: var(--font-size-6);
  }
</style>
