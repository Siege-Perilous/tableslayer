<script lang="ts">
  import type { LabelProps } from './types';
  import classNames from 'classnames';
  let { children, props, ...restProps }: LabelProps = $props();

  const labelClasses = classNames('label', restProps.class ?? '');
</script>

<label {...props} {...restProps} class={labelClasses}>
  {@render children()}
</label>

<style>
  .label {
    display: block;
    font-weight: var(--font-weight-6);
    font-size: var(--font-size-1);
    cursor: pointer;
  }
</style>
