<script lang="ts">
  import type { RadialMenuProps, RadialMenuItem as RadialMenuItemType } from './types';
  import RadialMenuItem from './RadialMenuItem.svelte';

  interface Props extends RadialMenuProps {}

  const { visible = false, position, items, onItemSelect, onClose }: Props = $props();

  let activeSubmenu: RadialMenuItemType[] | null = $state(null);
  let submenuParentId: string | null = $state(null);

  // Calculate angle for each item in the radial menu
  function getItemAngle(index: number, total: number): number {
    // Start from top (270 degrees / -90 degrees)
    // Distribute items evenly around the circle
    const angleStep = (2 * Math.PI) / total;
    return -Math.PI / 2 + angleStep * index;
  }

  function handleItemSelect(itemId: string) {
    // Find the selected item
    const currentItems = activeSubmenu || items;
    const selectedItem = currentItems.find((item) => item.id === itemId);

    if (selectedItem?.submenu && selectedItem.submenu.length > 0) {
      // Show submenu
      activeSubmenu = selectedItem.submenu;
      submenuParentId = selectedItem.id;
    } else {
      // No submenu, trigger selection and close
      if (onItemSelect) {
        onItemSelect(itemId);
      }
      handleClose();
    }
  }

  function handleClose() {
    activeSubmenu = null;
    submenuParentId = null;
    if (onClose) {
      onClose();
    }
  }

  function handleBackdropClick() {
    if (activeSubmenu) {
      // If submenu is open, go back to main menu
      activeSubmenu = null;
      submenuParentId = null;
    } else {
      // Otherwise close the menu
      handleClose();
    }
  }

  // Reset submenu when menu visibility changes
  $effect(() => {
    if (!visible) {
      activeSubmenu = null;
      submenuParentId = null;
    }
  });

  const currentItems = $derived(activeSubmenu || items);
  const menuRadius = 120; // Distance from center to items
</script>

{#if visible}
  <div class="radialMenu" class:radialMenu--visible={visible}>
    <!-- Backdrop to catch clicks outside menu -->
    <button class="radialMenuBackdrop" onclick={handleBackdropClick} type="button" aria-label="Close menu"></button>

    <!-- Menu container positioned at touch point -->
    <div class="radialMenuContainer" style="left: {position.x}px; top: {position.y}px;">
      {#if activeSubmenu}
        <!-- Back button in center for submenu -->
        <button
          class="radialMenuCenterBtn"
          onclick={() => {
            activeSubmenu = null;
            submenuParentId = null;
          }}
          type="button"
        >
          Back
        </button>
      {/if}

      <!-- Render menu items in a circle -->
      {#each currentItems as item, index (item.id)}
        <RadialMenuItem
          {item}
          angle={getItemAngle(index, currentItems.length)}
          radius={menuRadius}
          onSelect={handleItemSelect}
        />
      {/each}
    </div>
  </div>
{/if}

<style>
  .radialMenu {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
  }

  .radialMenu--visible {
    opacity: 1;
    pointer-events: auto;
  }

  .radialMenuBackdrop {
    position: absolute;
    inset: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .radialMenuContainer {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .radialMenuCenterBtn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 1rem 1.5rem;
    background: var(--bg);
    border: 2px solid var(--fgPrimary);
    border-radius: 50%;
    color: var(--fg);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    pointer-events: auto;
    transition: all 0.15s ease-in-out;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .radialMenuCenterBtn:hover {
    background: var(--fgPrimary);
    color: var(--bg);
    transform: translate(-50%, -50%) scale(1.1);
  }
</style>
