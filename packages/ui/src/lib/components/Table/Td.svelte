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
    padding: 0.25rem 0.75rem;
    border-bottom: var(--borderThin);
  }
</style>
