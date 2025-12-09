<script lang="ts">
  import type { RadialMenuProps, RadialMenuItemProps, SubmenuLayout, TableFilterOption } from './types';
  import RadialMenuItem from './RadialMenuItem.svelte';
  import { Select } from '../Select';

  const { visible = false, position, items, backIcon, onItemSelect, onClose, onReposition }: RadialMenuProps = $props();

  let activeSubmenu: RadialMenuItemProps[] | null = $state(null);
  let activeSubmenuLayout: SubmenuLayout = $state('radial');
  let activeSubmenuFilterOptions: TableFilterOption[] | undefined = $state(undefined);
  let activeSubmenuFilterKey: string | undefined = $state(undefined);
  let selectedFilter: string[] = $state([]);
  let menuContainer: HTMLDivElement | null = $state(null);
  let adjustedPosition = $state({ x: position.x, y: position.y });
  let menuRotation = $state(0); // 0, 90, 180, or 270 degrees
  const TABLE_COLUMN_COUNT = 3; // Fixed number of columns in table layout

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
      // Show submenu with its layout type
      activeSubmenu = selectedItem.submenu;
      activeSubmenuLayout = selectedItem.submenuLayout || 'radial';
      activeSubmenuFilterOptions = selectedItem.submenuFilterOptions;
      activeSubmenuFilterKey = selectedItem.submenuFilterKey;
      // Set initial filter selection
      if (selectedItem.submenuFilterDefault) {
        selectedFilter = [selectedItem.submenuFilterDefault];
      } else if (selectedItem.submenuFilterOptions && selectedItem.submenuFilterOptions.length > 0) {
        selectedFilter = [selectedItem.submenuFilterOptions[0].value];
      } else {
        selectedFilter = [];
      }
    } else {
      // No submenu, trigger selection and close
      if (onItemSelect) {
        onItemSelect(itemId);
      }
      handleClose();
    }
  }

  function resetSubmenuState() {
    activeSubmenu = null;
    activeSubmenuLayout = 'radial';
    activeSubmenuFilterOptions = undefined;
    activeSubmenuFilterKey = undefined;
    selectedFilter = [];
  }

  function handleClose() {
    resetSubmenuState();
    if (onClose) {
      onClose();
    }
  }

  function handleBackdropClick() {
    if (activeSubmenu) {
      // If submenu is open, go back to main menu
      resetSubmenuState();
    } else {
      // Otherwise close the menu
      handleClose();
    }
  }

  function handleBackdropContextMenu(e: MouseEvent) {
    e.preventDefault();
    if (onReposition) {
      // Reset to main menu when repositioning
      resetSubmenuState();
      onReposition({ x: e.clientX, y: e.clientY });
    }
  }

  // Two-finger touch tracking for repositioning
  let twoFingerTouchStart: { x: number; y: number } | null = null;
  let twoFingerHoldTimer: ReturnType<typeof setTimeout> | null = null;

  function handleBackdropTouchStart(e: TouchEvent) {
    if (e.touches.length === 2 && onReposition) {
      // Calculate center point of two fingers
      const x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      twoFingerTouchStart = { x, y };

      // Start hold timer (500ms like the original gesture detector)
      twoFingerHoldTimer = setTimeout(() => {
        if (twoFingerTouchStart && onReposition) {
          // Reset to main menu when repositioning
          resetSubmenuState();
          onReposition(twoFingerTouchStart);
        }
        twoFingerTouchStart = null;
      }, 500);
    }
  }

  function handleBackdropTouchEnd() {
    twoFingerTouchStart = null;
    if (twoFingerHoldTimer) {
      clearTimeout(twoFingerHoldTimer);
      twoFingerHoldTimer = null;
    }
  }

  function handleBackdropTouchMove(e: TouchEvent) {
    // Cancel if fingers moved too much or finger count changed
    if (twoFingerTouchStart && e.touches.length !== 2) {
      handleBackdropTouchEnd();
    }
  }

  // Reset submenu when menu visibility changes
  $effect(() => {
    if (!visible) {
      resetSubmenuState();
    }
  });

  // Filter submenu items based on selected filter
  const filteredSubmenu = $derived.by(() => {
    if (!activeSubmenu) return [];
    if (!activeSubmenuFilterKey || selectedFilter.length === 0) return activeSubmenu;
    const filterValue = selectedFilter[0];
    return activeSubmenu.filter((item) => {
      const itemValue = (item as Record<string, unknown>)[activeSubmenuFilterKey as string];
      return itemValue === filterValue;
    });
  });

  // Helper to organize table items into fixed 3 columns, distributed evenly
  const tableColumns = $derived.by(() => {
    if (!filteredSubmenu.length || activeSubmenuLayout !== 'table') return [];

    // Always create exactly 3 columns, distributing items evenly
    const columns: RadialMenuItemProps[][] = [[], [], []];
    filteredSubmenu.forEach((item, index) => {
      columns[index % TABLE_COLUMN_COUNT].push(item);
    });
    return columns;
  });

  // Table rotation needs left/right swapped compared to radial menu
  const tableRotation = $derived.by(() => {
    if (menuRotation === 90) return 270; // Right edge: swap to -90
    if (menuRotation === 270) return 90; // Left edge: swap to 90
    return menuRotation; // Top (180) and bottom (0) stay the same
  });

  // Track last calculated position to avoid redundant calculations
  let lastCalculatedPosition = { x: 0, y: 0 };
  let lastVisibleState = false;

  // Update position and rotation to orient menu toward nearest edge
  $effect(() => {
    // Skip if nothing changed
    if (
      visible === lastVisibleState &&
      position.x === lastCalculatedPosition.x &&
      position.y === lastCalculatedPosition.y
    ) {
      return;
    }

    lastVisibleState = visible;
    lastCalculatedPosition = { x: position.x, y: position.y };

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
      menuRotation = rotation;
    } else {
      // Reset to original position when hidden
      adjustedPosition = { x: position.x, y: position.y };
      menuRotation = 0;
    }
  });

  const currentItems = $derived(activeSubmenu || items);
  const menuRadius = 120; // Distance from center to items
</script>

{#if visible}
  <div class="radialMenu">
    <!-- Backdrop to catch clicks outside menu -->
    <button
      class="radialMenu__backdrop"
      onclick={handleBackdropClick}
      oncontextmenu={handleBackdropContextMenu}
      ontouchstart={handleBackdropTouchStart}
      ontouchend={handleBackdropTouchEnd}
      ontouchmove={handleBackdropTouchMove}
      ontouchcancel={handleBackdropTouchEnd}
      type="button"
      aria-label="Close menu"
    ></button>

    <!-- Menu container positioned at touch point -->
    <div
      bind:this={menuContainer}
      class="radialMenu__container"
      class:radialMenu__container--table={activeSubmenuLayout === 'table'}
      style:left="{adjustedPosition.x}px"
      style:top="{adjustedPosition.y}px"
    >
      {#if activeSubmenu && activeSubmenuLayout === 'table'}
        <!-- Table layout for submenus like scene lists -->
        <div class="radialMenu__table" style="transform: rotate({tableRotation}deg);">
          <div class="radialMenu__tableHeader">
            <button class="radialMenu__tableBack" onclick={() => resetSubmenuState()} type="button">
              {#if backIcon}
                {@const BackIcon = backIcon}
                <BackIcon size={18} stroke={2} />
              {:else}
                ←
              {/if}
            </button>
            {#if activeSubmenuFilterOptions && activeSubmenuFilterOptions.length > 0}
              <div class="radialMenu__tableFilter">
                <Select
                  options={activeSubmenuFilterOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
                  bind:selected={selectedFilter}
                  variant="transparent"
                />
              </div>
            {/if}
          </div>
          <div class="radialMenu__tableColumns">
            {#each tableColumns as column, colIndex (colIndex)}
              <div class="radialMenu__tableColumn">
                {#each column as item (item.id)}
                  <button
                    class="radialMenu__tableItem"
                    class:radialMenu__tableItem--disabled={item.disabled}
                    onclick={() => handleItemSelect(item.id)}
                    type="button"
                    disabled={item.disabled}
                  >
                    {#if item.icon}
                      {@const ItemIcon = item.icon}
                      <span class="radialMenu__tableItemIcon">
                        <ItemIcon size={18} stroke={2} />
                      </span>
                    {/if}
                    <span class="radialMenu__tableItemLabel">{item.label}</span>
                  </button>
                {/each}
              </div>
            {/each}
          </div>
        </div>
      {:else}
        {#if activeSubmenu}
          <!-- Back button in center for radial submenu -->
          <button
            class="radialMenu__centerBtn"
            onclick={() => {
              activeSubmenu = null;
              activeSubmenuLayout = 'radial';
            }}
            type="button"
          >
            {#if backIcon}
              {@const BackIcon = backIcon}
              <BackIcon size={20} stroke={2} />
            {:else}
              Back
            {/if}
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
      {/if}
    </div>
  </div>
{/if}

<style>
  .radialMenu {
    position: fixed;
    inset: 0;
    pointer-events: auto;
    z-index: 1000;
  }

  .radialMenu__backdrop {
    position: absolute;
    inset: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .radialMenu__container {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .radialMenu__container--table {
    transform: translate(-50%, -50%);
  }

  .radialMenu__centerBtn {
    position: absolute;
    top: 0;
    left: 0;
    width: 3rem;
    height: 3rem;
    padding: 0;
    background: var(--bg);
    border: 1px solid var(--fgMuted);
    border-radius: 50%;
    color: var(--fg);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .radialMenu__centerBtn:hover {
    background: var(--fgPrimary);
    color: var(--bg);
  }

  .radialMenu__table {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: var(--bg);
    border: 1px solid var(--fgMuted);
    border-radius: 0.5rem;
    padding: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    pointer-events: auto;
  }

  .radialMenu__tableHeader {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-bottom: 1px solid var(--fgMuted);
    padding-bottom: 0.5rem;
  }

  .radialMenu__tableBack {
    width: 2rem;
    height: 2rem;
    padding: 0;
    background: transparent;
    border: 1px solid var(--fgMuted);
    border-radius: 50%;
    color: var(--fgMuted);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .radialMenu__tableBack:hover {
    color: var(--fg);
    border-color: var(--fg);
  }

  .radialMenu__tableFilter {
    flex: 1;
    min-width: 0;
  }

  .radialMenu__tableColumns {
    display: flex;
    gap: 0.25rem;
    max-height: 20rem;
    overflow-y: auto;
  }

  .radialMenu__tableColumn {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 8rem;
  }

  .radialMenu__tableItem {
    padding: 0.5rem 1rem;
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    color: var(--fg);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .radialMenu__tableItem:hover {
    background: var(--fgPrimary);
    color: var(--bg);
  }

  .radialMenu__tableItem--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .radialMenu__tableItem--disabled:hover {
    background: transparent;
    color: var(--fg);
  }

  .radialMenu__tableItemIcon {
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .radialMenu__tableItemLabel {
    font-family: inherit;
  }
</style>
