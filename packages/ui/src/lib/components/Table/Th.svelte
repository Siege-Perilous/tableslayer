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
    padding: 0.25rem 0.75rem;
    border-bottom: var(--borderThin);
  }
</style>
