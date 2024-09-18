<script lang="ts">
  import { createTooltip, melt } from '@melt-ui/svelte';
  import { fade } from 'svelte/transition';
  import type { ToolTipProps } from './types';

  let {
    children,
    positioning = { placement: 'top' },
    defaultOpen = false,
    openDelay = 0,
    closeDelay = 0,
    closeOnPointerDown = false,
    forceVisible = true,
    toolTipContent
  }: ToolTipProps = $props();

  const {
    elements: { trigger, content, arrow },
    states: { open }
  } = createTooltip({
    positioning,
    defaultOpen,
    openDelay,
    closeDelay,
    closeOnPointerDown,
    forceVisible
  });
</script>

<button type="button" class="trigger" use:melt={$trigger} aria-label="Add">
  {@render children()}
</button>

{#if $open}
  <div use:melt={$content} transition:fade={{ duration: 100 }} class="tooltip">
    <div use:melt={$arrow}></div>
    {@render toolTipContent()}
  </div>
{/if}

<style>
  :global(.dark) {
    color-scheme: dark;
    --tooltip-bg: var(--fg);
    --tooltip-color: var(--bg);
  }
  :global(.light) {
    color-scheme: light;
    --tooltip-bg: var(--fg);
    --tooltip-color: var(--bg);
  }
  .tooltip {
    padding: var(--size-1) var(--size-2);
    background: var(--tooltip-bg);
    color: var(--tooltip-color);
    border-radius: var(--radius-1);
    box-shadow: var(--shadow-1);
    z-index: 1000;
  }
  .trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
</style>
