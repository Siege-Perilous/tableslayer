<script lang="ts">
  import { createLabel, melt } from '@melt-ui/svelte';
  import type { LabelProps } from './types';
  import classNames from 'classnames';
  let { id, children, ...restProps }: LabelProps = $props();

  const labelClasses = classNames('label', restProps.class ?? '');

  const {
    elements: { root }
  } = createLabel();
</script>

<label for={id} use:melt={$root} {...restProps} class={labelClasses}>{@render children()}</label>

<style>
  .label {
    font-weight: var(--font-weight-6);
    font-size: var(--font-size-1);
    cursor: pointer;
  }
</style>
