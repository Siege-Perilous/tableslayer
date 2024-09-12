<script lang="ts">
  import { createTooltip, melt } from '@melt-ui/svelte';
  import type { Snippet } from 'svelte';
  import { fade } from 'svelte/transition';

  interface ToolTipProps {
    children: Snippet;
    positioning?: {
      placement: 'top' | 'right' | 'bottom' | 'left';
    };
    openDelay?: number;
    closeDelay?: number;
    closeOnPointerDown?: boolean;
    forceVisible?: boolean;
    toolTipContent: Snippet;
  }
  let {
    children,
    positioning = { placement: 'top' },
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
  .trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
</style>
