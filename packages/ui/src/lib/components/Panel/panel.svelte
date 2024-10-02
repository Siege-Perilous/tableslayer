<script lang="ts">
  import type { PanelProps } from './types';
  let { variant = 'rounded', borderWidth = 1, children, ...restProps }: PanelProps = $props();
  import classNames from 'classnames';
  const panelClasses = classNames('panel', `panel--${variant}`, `border-${borderWidth}`, restProps.class ?? '');
</script>

<div {...restProps} class={panelClasses}>
  {@render children()}
</div>

<style>
  .panel {
    background: var(--contrastLowest);
    border: var(--borderThin);
    border-color: var(--contrastEmpty);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-1);
  }
</style>
