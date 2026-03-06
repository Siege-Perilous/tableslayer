<script lang="ts">
  import { computePosition, offset, flip, shift, platform } from '@floating-ui/dom';
  import { fade } from 'svelte/transition';
  import { tick, onDestroy } from 'svelte';
  import type { PopoverProps } from './types';
  import type { HTMLBaseAttributes } from 'svelte/elements';

  let {
    isOpen = $bindable(false),
    onIsOpenChange,
    trigger,
    content,
    triggerClass,
    triggerTestId,
    contentClass,
    positioning = { placement: 'bottom' },
    portal = null,
    closeOnOutsideClick = true
  }: PopoverProps & HTMLBaseAttributes = $props();

  let triggerElement: HTMLElement | null = null;
  let popoverElement = $state<HTMLElement | null>(null);
  let portalContainer: HTMLDivElement | null = null;
  let floatingStyles = $state('');

  $effect(() => {
    if (isOpen && portal && popoverElement) {
      const targetEl = typeof portal === 'string' ? document.querySelector(portal) : null;
      if (targetEl && popoverElement.parentNode !== targetEl) {
        if (!portalContainer) {
          portalContainer = document.createElement('div');
          portalContainer.style.display = 'contents';
        }
        portalContainer.appendChild(popoverElement);
        targetEl.appendChild(portalContainer);
      }
    }
  });

  onDestroy(() => {
    if (portalContainer?.parentNode) {
      portalContainer.parentNode.removeChild(portalContainer);
    }
  });

  const updatePosition = async () => {
    if (!triggerElement || !popoverElement) return;

    const { x, y, strategy } = await computePosition(triggerElement, popoverElement, {
      placement: positioning.placement,
      middleware: [offset(positioning.offset ?? 8), flip(), shift({ padding: 8 })],
      platform
    });

    floatingStyles = `position: ${strategy}; left: ${x}px; top: ${y}px;`;
  };

  const toggleOpen = async () => {
    isOpen = !isOpen;
    onIsOpenChange?.(isOpen);
    if (isOpen) {
      await tick();
      updatePosition();
    }
  };

  const closePopover = () => {
    isOpen = false;
    onIsOpenChange?.(false);
  };

  const handleGlobalClick = (e: MouseEvent) => {
    if (!closeOnOutsideClick) return;
    if (isOpen && popoverElement && triggerElement) {
      const target = e.target as Node;
      if (!popoverElement.contains(target) && !triggerElement.contains(target)) {
        closePopover();
      }
    }
  };

  const contentProps = {
    close: closePopover
  };
</script>

<svelte:window onclick={handleGlobalClick} />

<button
  type="button"
  class={['popTrigger', triggerClass ?? '']}
  data-testid={triggerTestId}
  bind:this={triggerElement}
  onclick={toggleOpen}
  aria-label="Toggle popover"
  aria-expanded={isOpen}
>
  {@render trigger()}
</button>

{#if isOpen}
  <div
    bind:this={popoverElement}
    transition:fade={{ duration: 100 }}
    class={['popContent', contentClass ?? '']}
    style={floatingStyles}
  >
    {@render content({ contentProps })}
    <button class="popClose" onclick={closePopover}>close</button>
  </div>
{/if}

<style>
  .popTrigger {
    cursor: pointer;
  }
  .popContent {
    position: absolute;
    top: 0;
    left: 0;
    width: max-content;
    padding: var(--size-2);
    background: var(--popoverBg);
    color: var(--fg);
    border: var(--borderThin);
    border-radius: var(--radius-1);
    box-shadow: var(--shadow-1);
    z-index: 1000;
  }
  /* TODO: Maybe I should use this */
  .popClose {
    display: none;
  }
</style>
