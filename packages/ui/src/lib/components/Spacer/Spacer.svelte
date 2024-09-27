<script lang="ts">
  import type { SpacerProps } from './types';
  let { size = 4, ...restProps }: SpacerProps = $props();
  import classNames from 'classnames';

  const spacerClasses = classNames('spacer', restProps.class ?? '');
</script>

<div {...restProps} class={spacerClasses} style={`height: var(--size-${size})`}></div>

<style>
  .spacer {
    display: block;
  }
</style>
