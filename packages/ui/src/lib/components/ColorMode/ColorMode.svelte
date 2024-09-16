<script lang="ts">
  import type { ColorModeProps } from './types';
  let { children, mode, as = 'div', ...restProps }: ColorModeProps = $props();
</script>

<svelte:element this={as} class={mode} {...restProps}>
  {@render children()}
</svelte:element>
