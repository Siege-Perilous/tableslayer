<script lang="ts">
  import { Label } from 'formsnap';
  import type { LabelProps } from './types';
  import classNames from 'classnames';
  let { children, ...restProps }: LabelProps = $props();

  const labelClasses = classNames('label', restProps.class ?? '');
</script>

<Label asChild let:labelAttrs>
  <label {...labelAttrs} {...restProps} class={labelClasses}>
    {@render children()}
  </label>
</Label>

<style>
  .label {
    display: block;
    font-weight: var(--font-weight-6);
    font-size: var(--font-size-1);
    cursor: pointer;
  }
</style>
