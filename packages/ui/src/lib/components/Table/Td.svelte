<script lang="ts">
  import type { TdProps } from './types';
  import classNames from 'classnames';
  let { children, ...restProps }: TdProps = $props();
  const tdClasses = classNames('td', restProps.class ?? '');
</script>

<td {...restProps} class={tdClasses}>
  {@render children()}
</td>

<style>
  .td {
    text-align: left;
    padding: var(--size-1) var(--size-3);
    border-bottom: var(--border-1);
  }
</style>
