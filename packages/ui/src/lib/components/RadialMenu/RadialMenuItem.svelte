<script lang="ts">
  import type { RadialMenuItem } from './types';

  interface Props {
    item: RadialMenuItem;
    angle: number;
    radius: number;
    onSelect: (itemId: string) => void;
  }

  const { item, angle, radius, onSelect }: Props = $props();

  // Calculate position using polar to cartesian conversion
  const x = $derived(Math.cos(angle) * radius);
  const y = $derived(Math.sin(angle) * radius);

  function handleClick() {
    if (!item.disabled) {
      onSelect(item.id);
    }
  }
</script>

<button
  class="radialMenuItem"
  class:radialMenuItem--disabled={item.disabled}
  style="transform: translate({x}px, {y}px);"
  onclick={handleClick}
  type="button"
>
  {#if item.icon}
    <span class="radialMenuItemIcon">{item.icon}</span>
  {/if}
  <span class="radialMenuItemLabel">{item.label}</span>
</button>

<style>
  .radialMenuItem {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: center;
    padding: 0.75rem 1rem;
    background: var(--bg);
    border: 1px solid var(--fgMuted);
    border-radius: 0.5rem;
    color: var(--fg);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    pointer-events: auto;
    transition: all 0.15s ease-in-out;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .radialMenuItem:hover {
    background: var(--fgPrimary);
    color: var(--bg);
    transform: translate(var(--x), var(--y)) scale(1.05);
    border-color: var(--fgPrimary);
  }

  .radialMenuItem--disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .radialMenuItemIcon {
    font-size: 1.125rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .radialMenuItemLabel {
    font-family: inherit;
  }
</style>
