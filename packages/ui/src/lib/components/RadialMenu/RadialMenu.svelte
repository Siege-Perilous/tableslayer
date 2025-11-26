<script lang="ts">
  import type { RadialMenuProps, RadialMenuItemProps } from './types';
  import RadialMenuItem from './RadialMenuItem.svelte';

  const { visible = false, position, items, onItemSelect, onClose }: RadialMenuProps = $props();

  let activeSubmenu: RadialMenuItemProps[] | null = $state(null);
  let menuContainer: HTMLDivElement | null = $state(null);
  let adjustedPosition = $state({ x: position.x, y: position.y });
  let menuRotation = $state(0); // 0, 90, 180, or 270 degrees

  // Calculate which edge is closest and determine rotation
  // The menu should rotate so items face the nearest edge (where the player is viewing from)
  function calculateRotationFromEdge(x: number, y: number, viewportWidth: number, viewportHeight: number): number {
    const distanceToTop = y;
    const distanceToBottom = viewportHeight - y;
    const distanceToLeft = x;
    const distanceToRight = viewportWidth - x;

    const minDistance = Math.min(distanceToTop, distanceToBottom, distanceToLeft, distanceToRight);

    // Determine which edge is closest and return corresponding rotation
    // Default orientation is items starting at top (facing down toward bottom edge)
    if (minDistance === distanceToBottom) return 0; // Bottom edge - default orientation (items face up)
    if (minDistance === distanceToRight) return 90; // Right edge - rotate 90° clockwise (items face left)
    if (minDistance === distanceToTop) return 180; // Top edge - rotate 180° (items face down)
    return 270; // Left edge - rotate 270° clockwise (items face right)
  }

  // Calculate angle for each item in the radial menu
  function getItemAngle(index: number, total: number, rotationDegrees: number): number {
    // Start from top (270 degrees / -90 degrees)
    // Distribute items evenly around the circle
    const angleStep = (2 * Math.PI) / total;
    const baseAngle = -Math.PI / 2 + angleStep * index;

    // Apply rotation offset (convert degrees to radians)
    const rotationRadians = (rotationDegrees * Math.PI) / 180;
    return baseAngle + rotationRadians;
  }

  function handleItemSelect(itemId: string) {
    // Find the selected item
    const currentItems = activeSubmenu || items;
    const selectedItem = currentItems.find((item) => item.id === itemId);

    if (selectedItem?.submenu && selectedItem.submenu.length > 0) {
      // Show submenu
      activeSubmenu = selectedItem.submenu;
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
    if (onClose) {
      onClose();
    }
  }

  function handleBackdropClick() {
    if (activeSubmenu) {
      // If submenu is open, go back to main menu
      activeSubmenu = null;
    } else {
      // Otherwise close the menu
      handleClose();
    }
  }

  // Reset submenu when menu visibility changes
  $effect(() => {
    if (!visible) {
      activeSubmenu = null;
    }
  });

  // Update position and rotation to orient menu toward nearest edge
  $effect(() => {
    if (visible) {
      // Account for the radial menu items extending in all directions
      // Items can extend menuRadius + some padding for the item size
      const itemPadding = 80; // Approximate max item width/height
      const totalRadius = menuRadius + itemPadding;
      const padding = 10; // Additional screen edge padding

      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Start with the click position
      let x = position.x;
      let y = position.y;

      // Clamp X position to keep items in viewport
      const minX = totalRadius + padding;
      const maxX = viewportWidth - totalRadius - padding;
      x = Math.max(minX, Math.min(maxX, x));

      // Clamp Y position to keep items in viewport
      const minY = totalRadius + padding;
      const maxY = viewportHeight - totalRadius - padding;
      y = Math.max(minY, Math.min(maxY, y));

      adjustedPosition = { x, y };

      // Calculate rotation based on nearest edge
      const rotation = calculateRotationFromEdge(position.x, position.y, viewportWidth, viewportHeight);
      console.log('RadialMenu rotation calculation:', {
        position: { x: position.x, y: position.y },
        viewport: { width: viewportWidth, height: viewportHeight },
        rotation
      });
      menuRotation = rotation;
    } else {
      // Reset to original position when hidden
      adjustedPosition = { x: position.x, y: position.y };
      menuRotation = 0;
    }
  });

  const currentItems = $derived(activeSubmenu || items);
  const menuRadius = 120; // Distance from center to items

  // Debug: Log rotation changes
  $effect(() => {
    console.log('Menu rotation state changed to:', menuRotation);
  });
</script>

{#if visible}
  <div class="radialMenu" class:radialMenu--visible={visible}>
    <!-- Backdrop to catch clicks outside menu -->
    <button class="radialMenuBackdrop" onclick={handleBackdropClick} type="button" aria-label="Close menu"></button>

    <!-- Menu container positioned at touch point -->
    <div
      bind:this={menuContainer}
      class="radialMenuContainer"
      style:left="{adjustedPosition.x}px"
      style:top="{adjustedPosition.y}px"
    >
      {#if activeSubmenu}
        <!-- Back button in center for submenu -->
        <button
          class="radialMenuCenterBtn"
          onclick={() => {
            activeSubmenu = null;
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
          angle={getItemAngle(index, currentItems.length, menuRotation)}
          radius={menuRadius}
          counterRotation={menuRotation}
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
