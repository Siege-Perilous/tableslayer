<script lang="ts">
  import type { TableProps } from './types';
  let { children, ...restProps }: TableProps = $props();
  const tableClasses = $derived(['table', restProps.class ?? '']);
</script>

<table {...restProps} class={tableClasses}>
  {@render children()}
</table>

<style>
  .table {
    width: 100%;
    border-collapse: collapse;
  }
</style>
