<script lang="ts">
  import type { ThProps } from './types';
  let { children, ...restProps }: ThProps = $props();
  let thClasses = $derived(['th', restProps.class ?? '']);
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
