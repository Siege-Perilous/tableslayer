<script lang="ts">
  import type { TableProps } from './types';
  import classNames from 'classnames';
  const tableClasses = classNames('table');
  let { children, ...restProps }: TableProps = $props();
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
