<script lang="ts">
  import type { TdProps } from './types';
  let { children, ...restProps }: TdProps = $props();
  let tdClasses = $derived(['td', restProps.class ?? '']);
</script>

<td {...restProps} class={tdClasses}>
  {@render children()}
</td>

<style>
  .td {
    text-align: left;
    padding: var(--size-1) var(--size-3);
    border-bottom: var(--borderThin);
  }
</style>
