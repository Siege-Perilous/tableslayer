<script lang="ts">
  import type { RadialMenuItemProps } from './types';

  interface Props {
    item: RadialMenuItemProps;
    angle: number;
    radius: number;
    counterRotation: number;
    onSelect: (itemId: string) => void;
  }

  const { item, angle, radius, counterRotation, onSelect }: Props = $props();

  // Calculate position using polar to cartesian conversion
  const x = $derived(Math.cos(angle) * radius);
  const y = $derived(Math.sin(angle) * radius);

  // Determine if this is an icon-only button (has icon but no label)
  const isIconOnly = $derived(item.icon && !item.label && !item.color);

  function handleClick() {
    if (!item.disabled) {
      onSelect(item.id);
    }
  }
</script>

<button
  class="radialMenu__item"
  class:radialMenu__item--disabled={item.disabled}
  class:radialMenu__item--colorOnly={item.color && !item.label}
  class:radialMenu__item--iconOnly={isIconOnly}
  style="transform: translate({x}px, {y}px) rotate({-counterRotation}deg);"
  onclick={handleClick}
  type="button"
>
  {#if item.color}
    <span class="radialMenu__itemSwatch" style="background-color: {item.color};"></span>
  {:else if item.icon}
    <span class="radialMenu__itemIcon">
      <item.icon size={24} stroke={2} />
    </span>
  {/if}
  {#if item.label}
    <span class="radialMenu__itemLabel">{item.label}</span>
  {/if}
</button>

<style>
  .radialMenu__item {
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
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .radialMenu__item:hover {
    background: var(--fgPrimary);
    color: var(--bg);
    border-color: var(--fgPrimary);
  }

  .radialMenu__item--disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .radialMenu__itemIcon {
    font-size: 1.125rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .radialMenu__itemLabel {
    font-family: inherit;
  }

  .radialMenu__itemSwatch {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    border: 2px solid var(--bg);
    box-shadow: 0 0 0 1px var(--fgMuted);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .radialMenu__item--colorOnly {
    padding: 0.5rem;
  }

  .radialMenu__item--colorOnly .radialMenu__itemSwatch {
    width: 2rem;
    height: 2rem;
  }

  .radialMenu__item--iconOnly {
    width: 3rem;
    height: 3rem;
    padding: 0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
