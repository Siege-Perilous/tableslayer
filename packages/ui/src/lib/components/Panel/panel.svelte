<script lang="ts">
  import type { PanelProps } from './types';
  let { variant = 'rounded', borderWidth = 1, children, ...restProps }: PanelProps = $props();
  let panelClasses = $derived(['panel', `panel--${variant}`, `border-${borderWidth}`, restProps.class ?? '']);
</script>

<div {...restProps} class={panelClasses}>
  {@render children()}
</div>

<style>
  .panel {
    background: var(--contrastLowest);
    border: var(--borderThin);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-1);
  }
</style>
