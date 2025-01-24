<script lang="ts">
  import type { SpacerProps } from './types';
  let { size = 4, ...restProps }: SpacerProps = $props();

  let spacerClasses = $derived(['spacer', restProps.class ?? '']);
</script>

<div {...restProps} class={spacerClasses} style={`height: var(--size-${size})`}></div>

<style>
  .spacer {
    display: block;
  }
</style>
