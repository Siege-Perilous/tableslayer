<script lang="ts">
  import { createContextMenu, melt } from '@melt-ui/svelte';
  import type { ContextMenuProps, ContextMenuItem } from './types';
  import { goto } from '$app/navigation';
  let { items, trigger }: ContextMenuProps = $props();
  import { fly } from 'svelte/transition';
  import { Hr } from '../Hr';
  import Spacer from '../Spacer/Spacer.svelte';
  const {
    elements: { menu, item: meltItem, trigger: meltTrigger }
  } = createContextMenu();

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.href) {
      goto(item.href);
    }
    if (item.onclick) {
      item.onclick();
    }
  };
</script>

<button use:melt={$meltTrigger} class="cMenuTrigger">
  {@render trigger()}
</button>
<div use:melt={$menu} class="cMenu" transition:fly={{ duration: 50 }}>
  {#each items as item}
    {#if item.type === 'divider'}
      <Spacer size={2} />
      <Hr />
      <Spacer size={2} />
    {:else}
      <button use:melt={$meltItem} onclick={() => handleItemClick(item)} class="cMenuItem">
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
  .cMenuItem:hover {
    background-color: var(--menuItemHover);
    border: var(--menuItemBorderHover);
  }
  .cMenuItemEnd {
    justify-self: flex-end;
  }
</style>
