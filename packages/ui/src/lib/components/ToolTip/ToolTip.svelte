<script lang="ts">
  import { computePosition, offset, flip, shift, arrow as arrowMiddleware, platform } from '@floating-ui/dom';
  import { fade } from 'svelte/transition';
  import { tick, onDestroy } from 'svelte';
  import type { ToolTipProps } from './types';

  let {
    children,
    positioning = { placement: 'top' },
    defaultOpen = false,
    openDelay = 0,
    closeDelay = 0,
    closeOnPointerDown = false,
    forceVisible = true,
    disableHoverableContent = false,
    toolTipContent
  }: ToolTipProps = $props();

  let triggerElement: HTMLElement | null = null;
  let tooltipElement = $state<HTMLElement | null>(null);
  let arrowElement = $state<HTMLElement | null>(null);
  let isOpen = $state(defaultOpen);
  let floatingStyles = $state('');
  let arrowStyles = $state('');

  let openTimeout: ReturnType<typeof setTimeout> | null = null;
  let closeTimeout: ReturnType<typeof setTimeout> | null = null;

  const clearTimeouts = () => {
    if (openTimeout) {
      clearTimeout(openTimeout);
      openTimeout = null;
    }
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }
  };

  const updatePosition = async () => {
    if (!triggerElement || !tooltipElement) return;

    const desiredPlacement = positioning?.placement ?? 'top';
    const middleware = [offset(8), flip(), shift({ padding: 8 })];
    if (arrowElement) {
      middleware.push(arrowMiddleware({ element: arrowElement }));
    }

    const { x, y, placement, middlewareData, strategy } = await computePosition(triggerElement, tooltipElement, {
      placement: desiredPlacement,
      middleware,
      platform
    });

    floatingStyles = `position: ${strategy}; left: ${x}px; top: ${y}px;`;

    if (middlewareData.arrow && arrowElement) {
      const { x: arrowX, y: arrowY } = middlewareData.arrow;
      const staticSide = {
        top: 'bottom',
        right: 'left',
        bottom: 'top',
        left: 'right'
      }[placement.split('-')[0]] as string;

      arrowStyles = `left: ${arrowX != null ? `${arrowX}px` : ''}; top: ${arrowY != null ? `${arrowY}px` : ''}; ${staticSide}: -4px;`;
    }
  };

  const handleOpen = async () => {
    clearTimeouts();
    if (openDelay > 0) {
      openTimeout = setTimeout(async () => {
        isOpen = true;
        await tick();
        updatePosition();
      }, openDelay);
    } else {
      isOpen = true;
      await tick();
      updatePosition();
    }
  };

  const handleClose = () => {
    clearTimeouts();
    if (closeDelay > 0) {
      closeTimeout = setTimeout(() => {
        isOpen = false;
      }, closeDelay);
    } else {
      isOpen = false;
    }
  };

  const handleTriggerMouseEnter = () => {
    handleOpen();
  };

  const handleTriggerMouseLeave = () => {
    if (disableHoverableContent) {
      handleClose();
    } else {
      closeTimeout = setTimeout(
        () => {
          isOpen = false;
        },
        closeDelay > 0 ? closeDelay : 100
      );
    }
  };

  const handleContentMouseEnter = () => {
    if (!disableHoverableContent) {
      clearTimeouts();
    }
  };

  const handleContentMouseLeave = () => {
    handleClose();
  };

  const handlePointerDown = () => {
    if (closeOnPointerDown) {
      isOpen = false;
    }
  };

  onDestroy(() => {
    clearTimeouts();
  });
</script>

<div
  class="trigger"
  bind:this={triggerElement}
  onmouseenter={handleTriggerMouseEnter}
  onmouseleave={handleTriggerMouseLeave}
  onpointerdown={handlePointerDown}
  role="button"
  tabindex="0"
>
  {@render children()}
</div>

{#if isOpen || forceVisible}
  <div
    bind:this={tooltipElement}
    transition:fade={{ duration: 100 }}
    class="tooltip"
    style={floatingStyles}
    style:visibility={isOpen ? 'visible' : 'hidden'}
    role="tooltip"
    onmouseenter={handleContentMouseEnter}
    onmouseleave={handleContentMouseLeave}
  >
    <div bind:this={arrowElement} class="tooltip__arrow" style={arrowStyles}></div>
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
    position: absolute;
    top: 0;
    left: 0;
    padding: var(--size-1) var(--size-2);
    background: var(--tooltip-bg);
    color: var(--tooltip-color);
    border-radius: var(--radius-1);
    box-shadow: var(--shadow-1);
    z-index: 1000;
    text-align: center;
    text-wrap: balance;
    width: max-content;
  }
  .tooltip__arrow {
    position: absolute;
    width: 8px;
    height: 8px;
    background: var(--tooltip-bg);
    transform: rotate(45deg);
  }
  .trigger {
    display: inline-block;
  }
</style>
