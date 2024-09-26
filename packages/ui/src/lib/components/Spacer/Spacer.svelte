<script lang="ts">
  import type { SpacerProps } from './types';
  let { size = 4, ...restProps }: SpacerProps = $props();
  import classNames from 'classnames';

  const spacerClasses = classNames('spacer', `spacer-${size}`, restProps.class ?? '');
</script>

<div class={spacerClasses} {...restProps}></div>

<style>
  .spacer {
    display: block;
  }

  .spacer-1 {
    height: var(--size-1);
  }

  .spacer-2 {
    height: var(--size-2);
  }

  .spacer-3 {
    height: var(--size-3);
  }

  .spacer-4 {
    height: var(--size-4);
  }

  .spacer-5 {
    height: var(--size-5);
  }

  .spacer-6 {
    height: var(--size-6);
  }

  .spacer-7 {
    height: var(--size-7);
  }

  .spacer-8 {
    height: var(--size-8);
  }
</style>
