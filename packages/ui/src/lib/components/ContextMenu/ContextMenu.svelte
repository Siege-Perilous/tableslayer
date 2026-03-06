<script lang="ts">
  import { computePosition, flip, shift, offset, platform } from '@floating-ui/dom';
  import type { ContextMenuProps, ContextMenuItem } from './types';
  import { goto } from '$app/navigation';
  import { fly } from 'svelte/transition';
  import { tick, onDestroy } from 'svelte';
  import { Hr } from '../Hr';
  import Spacer from '../Spacer/Spacer.svelte';

  let { items, trigger }: ContextMenuProps = $props();

  let triggerElement: HTMLElement | null = null;
  let menuElement = $state<HTMLElement | null>(null);
  let isOpen = $state(false);
  let floatingStyles = $state('');
  let clickPosition = $state({ x: 0, y: 0 });

  const handleItemClick = (item: ContextMenuItem) => {
    isOpen = false;
    if (item.href) {
      goto(item.href);
    }
    if (item.onclick) {
      item.onclick();
    }
  };

  const updatePosition = async () => {
    if (!menuElement) return;

    const virtualEl = {
      getBoundingClientRect() {
        return {
          width: 0,
          height: 0,
          x: clickPosition.x,
          y: clickPosition.y,
          top: clickPosition.y,
          left: clickPosition.x,
          right: clickPosition.x,
          bottom: clickPosition.y
        };
      }
    };

    const { x, y, strategy } = await computePosition(virtualEl, menuElement, {
      placement: 'bottom-start',
      middleware: [offset(4), flip(), shift({ padding: 8 })],
      platform
    });

    floatingStyles = `position: ${strategy}; left: ${x}px; top: ${y}px;`;
  };

  const handleContextMenu = async (e: MouseEvent) => {
    e.preventDefault();
    clickPosition = { x: e.clientX, y: e.clientY };
    isOpen = true;
    await tick();
    updatePosition();
  };

  const handleGlobalClick = (e: MouseEvent) => {
    if (isOpen && menuElement && triggerElement) {
      const target = e.target as Node;
      if (!menuElement.contains(target) && !triggerElement.contains(target)) {
        isOpen = false;
      }
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
    }
  };

  onDestroy(() => {
    isOpen = false;
  });
</script>

<svelte:window onclick={handleGlobalClick} onkeydown={handleKeydown} />

<button bind:this={triggerElement} oncontextmenu={handleContextMenu} class="cMenuTrigger">
  {@render trigger()}
</button>

{#if isOpen}
  <div bind:this={menuElement} class="cMenu" style={floatingStyles} transition:fly={{ duration: 50 }} role="menu">
    {#each items as item}
      {#if item.type === 'divider'}
        <Spacer size="0.5rem" />
        <Hr />
        <Spacer size="0.5rem" />
      {:else}
        <button onclick={() => handleItemClick(item)} class="cMenuItem" role="menuitem">
          {item.label}
          {#if item.end}
            <div class="cMenuItemEnd">
              {@render item.end()}
            </div>
          {/if}
        </button>
      {/if}
    {/each}
  </div>
{/if}

<style>
  :global(.light) {
    --cMenuItemHover: var(--primary-50);
    --cMenuItemBorderHover: solid 2px var(--primary-600);
  }
  :global(.dark) {
    --cMenuItemHover: var(--primary-950);
    --cMenuItemBorderHover: solid 2px var(--primary-500);
  }
  .cMenu {
    z-index: 1000;
    background-color: var(--bg);
    border: var(--borderThin);
    border-radius: var(--radius-1);
    box-shadow: var(--shadow-2);
    padding: 0.5rem;
    min-width: 10rem;
  }
  .cMenuItem {
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: var(--size-1) var(--size-4);
    gap: var(--size-4);
    border-radius: var(--radius-1);
    width: 100%;
    border: solid 2px transparent;
    justify-content: space-between;
  }
  .cMenuItem:hover,
  .cMenuItem:focus,
  .cMenuItem:active {
    background-color: var(--menuItemHover);
    border: var(--menuItemBorderHover);
  }
  .cMenuItemEnd {
    justify-self: flex-end;
  }
  .cMenuTrigger {
    display: block;
  }
</style>
