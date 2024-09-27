<script lang="ts">
  import type { ThProps } from './types';
  import classNames from 'classnames';
  let { children, ...restProps }: ThProps = $props();
  const thClasses = classNames('th', restProps.class ?? '');
</script>

<th {...restProps} class={thClasses}>
  {@render children()}
</th>

<style>
  .th {
    text-align: left;
    font-weight: var(--font-weight-6);
    padding: var(--size-1) var(--size-3);
    border-bottom: var(--borderThin);
  }
</style>
