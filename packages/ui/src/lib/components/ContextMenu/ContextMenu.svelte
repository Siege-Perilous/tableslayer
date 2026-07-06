<script lang="ts">
  import { computePosition, flip, shift, offset, platform } from '@floating-ui/dom';
  import { IconCheck } from '@tabler/icons-svelte';
  import type { ContextMenuProps, ContextMenuItem } from './types';
  import { goto } from '$app/navigation';
  import { fly } from 'svelte/transition';
  import { tick, onDestroy } from 'svelte';
  import { Hr } from '../Hr';
  import { Icon } from '../Icon';
  import Spacer from '../Spacer/Spacer.svelte';

  let { items, trigger }: ContextMenuProps = $props();

  let triggerElement = $state<HTMLElement | null>(null);
  let menuElement = $state<HTMLElement | null>(null);
  let isOpen = $state(false);
  let floatingStyles = $state('');
  let clickPosition = $state({ x: 0, y: 0 });

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return;
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

  // Stops propagation so the window-level close handlers never see the
  // opening event itself
  export const open = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clickPosition = { x: e.clientX, y: e.clientY };
    isOpen = true;
    await tick();
    updatePosition();
  };

  export const close = () => {
    isOpen = false;
  };

  const handleGlobalPointer = (e: MouseEvent) => {
    if (!isOpen || !menuElement) return;
    const target = e.target as Node;
    if (menuElement.contains(target)) return;
    if (triggerElement?.contains(target)) return;
    isOpen = false;
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

<svelte:window onclick={handleGlobalPointer} oncontextmenu={handleGlobalPointer} onkeydown={handleKeydown} />

{#if trigger}
  <button bind:this={triggerElement} oncontextmenu={open} class="cMenuTrigger">
    {@render trigger()}
  </button>
{/if}

{#if isOpen}
  <div bind:this={menuElement} class="cMenu" style={floatingStyles} transition:fly={{ duration: 50 }} role="menu">
    {#each items as item (item)}
      {#if item.type === 'divider'}
        <Spacer size="0.5rem" />
        <Hr />
        <Spacer size="0.5rem" />
      {:else if item.type === 'label'}
        <div class="cMenuLabel">{item.label}</div>
      {:else}
        <button
          onclick={() => handleItemClick(item)}
          class={['cMenuItem', item.variant === 'danger' && 'cMenuItem--danger']}
          disabled={item.disabled}
          role="menuitem"
        >
          <span class="cMenuItemLabel">
            {#if item.selected !== undefined}
              <span class="cMenuItemCheck">
                {#if item.selected}
                  <Icon Icon={IconCheck} size="1rem" />
                {/if}
              </span>
            {/if}
            {item.label}
          </span>
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
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    background-color: var(--bg);
    border: var(--borderThin);
    border-radius: var(--radius-1);
    box-shadow: var(--shadow-2);
    padding: 0.5rem;
    min-width: 10rem;
    width: max-content;
  }
  .cMenuItem {
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 0.25rem 1rem;
    gap: 1rem;
    border-radius: var(--radius-1);
    width: 100%;
    border: solid 2px transparent;
    justify-content: space-between;
  }
  .cMenuItem:hover:not(:disabled),
  .cMenuItem:focus:not(:disabled),
  .cMenuItem:active:not(:disabled) {
    background-color: var(--cMenuItemHover);
    border: var(--cMenuItemBorderHover);
  }
  .cMenuItem:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  .cMenuItem--danger {
    color: var(--fgDanger);
  }
  .cMenuItemLabel {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .cMenuItemCheck {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
  }
  .cMenuItemEnd {
    justify-self: flex-end;
  }
  .cMenuLabel {
    padding: 0.25rem 1rem;
    font-size: 0.875rem;
    color: var(--fgMuted);
  }
  .cMenuTrigger {
    display: block;
  }
</style>
