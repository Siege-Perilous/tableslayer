<script lang="ts">
  import type { SpacerProps } from './types';
  let { size = '1rem', ...restProps }: SpacerProps = $props();

  let spacerClasses = $derived(['spacer', restProps.class ?? '']);
</script>

<div {...restProps} class={spacerClasses} style={`height: ${size}`}></div>

<style>
  .spacer {
    display: block;
  }
</style>
