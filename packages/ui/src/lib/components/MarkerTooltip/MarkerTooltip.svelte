<script lang="ts">
  import { MarkerVisibility } from '../Stage/components/MarkerLayer/types';
  import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom';
  import { Editor } from '../Editor';
  import { onMount, onDestroy } from 'svelte';
  import { IconPin, IconPinFilled } from '@tabler/icons-svelte';

  interface MarkerData {
    id: string;
    title?: string;
    note?: unknown;
    visibility?: MarkerVisibility;
    size?: number;
    tooltip?: {
      title?: string;
      content?: unknown;
    };
  }

  interface Props {
    marker: MarkerData | null;
    position: { x: number; y: number } | null;
    containerElement: HTMLElement | null;
    markerDiameter?: number;
    onTooltipHover?: (isHovering: boolean) => void;
    isDM?: boolean;
    isPinned?: boolean;
    onPinToggle?: (markerId: string, pinned: boolean) => void;
    existingTooltips?: Array<{ element: HTMLElement; bounds: DOMRect }>;
    preferredPlacement?: 'top' | 'bottom' | 'left' | 'right';
    onTooltipMount?: (element: HTMLElement, bounds: DOMRect) => void;
    onTooltipUnmount?: (element: HTMLElement) => void;
  }

  let {
    marker,
    position,
    containerElement,
    markerDiameter = 40,
    onTooltipHover,
    isDM = false,
    isPinned = false,
    onPinToggle,
    existingTooltips = [],
    preferredPlacement = 'top',
    onTooltipMount,
    onTooltipUnmount
  }: Props = $props();

  let tooltipElement = $state<HTMLDivElement>();
  let portalContainer: HTMLDivElement | undefined = $state();
  let cleanup: (() => void) | null = null;
  let currentPlacement = $state<'top' | 'bottom' | 'left' | 'right'>('top');

  function handleTooltipMouseEnter() {
    if (onTooltipHover) {
      onTooltipHover(true);
    }
  }

  function handleTooltipMouseLeave() {
    if (onTooltipHover) {
      onTooltipHover(false);
    }
  }

  const getMarkerContent = (marker: MarkerData | null) => {
    if (!marker) return null;

    if (marker.note) {
      return marker.note;
    }

    if (marker.tooltip?.content) {
      if (typeof marker.tooltip.content === 'string') {
        try {
          return JSON.parse(marker.tooltip.content);
        } catch {
          return marker.tooltip.content;
        }
      }
      return marker.tooltip.content;
    }

    return null;
  };

  const getMarkerTitle = (marker: MarkerData | null) => {
    if (!marker) return null;

    if (marker.title) {
      return marker.title;
    }

    if (marker.tooltip?.title) {
      return marker.tooltip.title;
    }

    return null;
  };

  let markerContent = $derived(getMarkerContent(marker));
  let markerTitle = $derived(getMarkerTitle(marker));

  function getEstimatedBounds(
    virtualEl: {
      getBoundingClientRect: () => {
        left: number;
        top: number;
        right: number;
        bottom: number;
        width: number;
        height: number;
        x: number;
        y: number;
      };
    },
    element: HTMLElement,
    placement: string,
    offset: number
  ) {
    const rect = virtualEl.getBoundingClientRect();
    const width = element.offsetWidth || 200;
    const height = element.offsetHeight || 100;

    let x = rect.left;
    let y = rect.top;

    switch (placement) {
      case 'top':
        x -= width / 2;
        y -= height + offset;
        break;
      case 'bottom':
        x -= width / 2;
        y += offset;
        break;
      case 'left':
        x -= width + offset;
        y -= height / 2;
        break;
      case 'right':
        x += offset;
        y -= height / 2;
        break;
    }

    return { x, y, width, height, left: x, top: y, right: x + width, bottom: y + height };
  }

  function calculateOverlap(
    rect1: DOMRect | { left: number; right: number; top: number; bottom: number },
    rect2: DOMRect | { left: number; right: number; top: number; bottom: number }
  ) {
    const xOverlap = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left));
    const yOverlap = Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top));
    return xOverlap * yOverlap;
  }

  function calculateTotalOverlap(
    testBounds: DOMRect | { left: number; right: number; top: number; bottom: number },
    existingTooltips: Array<{ bounds: DOMRect }>
  ) {
    return existingTooltips.reduce((total, tooltip) => {
      return total + calculateOverlap(testBounds, tooltip.bounds);
    }, 0);
  }

  function createPortalContainer() {
    const existingContainer = document.getElementById('markerTooltipPortal');
    if (existingContainer) {
      portalContainer = existingContainer as HTMLDivElement;
      return;
    }

    const container = document.createElement('div');
    container.id = 'markerTooltipPortal';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '0';
    container.style.height = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '1';
    document.body.appendChild(container);
    portalContainer = container;
  }

  onMount(() => {
    createPortalContainer();
  });

  onDestroy(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }

    if (onTooltipUnmount && tooltipElement) {
      onTooltipUnmount(tooltipElement);
    }

    if (tooltipElement && portalContainer && portalContainer.contains(tooltipElement)) {
      portalContainer.removeChild(tooltipElement);
    }

    if (portalContainer && portalContainer.childNodes.length === 0) {
      if (document.body.contains(portalContainer)) {
        document.body.removeChild(portalContainer);
      }
    }
  });

  $effect(() => {
    if (tooltipElement && position && containerElement && portalContainer) {
      if (!portalContainer.contains(tooltipElement)) {
        portalContainer.appendChild(tooltipElement);
      }

      if (cleanup) {
        cleanup();
        cleanup = null;
      }

      const virtualEl = {
        getBoundingClientRect() {
          const rect = containerElement.getBoundingClientRect();
          const viewportX = rect.left + position.x;
          const viewportY = rect.top + position.y;

          return {
            width: 0,
            height: 0,
            x: viewportX,
            y: viewportY,
            top: viewportY,
            left: viewportX,
            right: viewportX,
            bottom: viewportY
          };
        }
      };

      cleanup = autoUpdate(virtualEl, tooltipElement!, async () => {
        const markerRadius = markerDiameter / 2;
        const buffer = 10;
        const arrowSize = 8;
        const dynamicOffset = markerRadius + buffer + arrowSize;

        let bestPlacement = preferredPlacement;

        if (existingTooltips.length > 0 && tooltipElement && tooltipElement.offsetWidth > 0) {
          const placements: ('top' | 'bottom' | 'left' | 'right')[] = ['top', 'bottom', 'left', 'right'];
          let minOverlap = Infinity;

          for (const placement of placements) {
            const testBounds = getEstimatedBounds(virtualEl, tooltipElement!, placement, dynamicOffset);
            const overlap = calculateTotalOverlap(testBounds, existingTooltips);
            if (overlap < minOverlap) {
              minOverlap = overlap;
              bestPlacement = placement;
            }
          }
        }

        const fallbackOptions: ('top' | 'bottom' | 'left' | 'right')[] = ['bottom', 'left', 'right', 'top'];
        const middleware = [
          offset(dynamicOffset),
          flip({
            fallbackPlacements: fallbackOptions.filter((p) => p !== bestPlacement)
          }),
          shift({ padding: 10 })
        ];

        const { x, y, placement } = await computePosition(virtualEl, tooltipElement!, {
          placement: bestPlacement,
          middleware,
          strategy: 'fixed'
        });

        currentPlacement = placement.split('-')[0] as 'top' | 'bottom' | 'left' | 'right';

        Object.assign(tooltipElement!.style, {
          position: 'fixed',
          left: `${x}px`,
          top: `${y}px`,
          pointerEvents: 'auto'
        });

        if (onTooltipMount && tooltipElement) {
          setTimeout(() => {
            if (tooltipElement) {
              const bounds = tooltipElement.getBoundingClientRect();
              onTooltipMount(tooltipElement, bounds);
            }
          }, 100);
        }
      });

      tooltipElement.style.display = 'block';
    } else if (tooltipElement) {
      tooltipElement.style.display = 'none';
    }

    return () => {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    };
  });
</script>

{#if (markerContent || markerTitle) && position}
  <div
    bind:this={tooltipElement}
    class="markerTooltip"
    style="display: none;"
    role="tooltip"
    data-placement={currentPlacement}
    onmouseenter={handleTooltipMouseEnter}
    onmouseleave={handleTooltipMouseLeave}
  >
    <div class="markerTooltip__arrow markerTooltip__arrow--{currentPlacement}"></div>
    {#if isDM && onPinToggle && marker && marker.visibility !== MarkerVisibility.DM}
      <button
        class="markerTooltip__pin"
        onclick={() => onPinToggle(marker.id, !isPinned)}
        title={isPinned ? 'Unpin from player view' : 'Pin to player view'}
      >
        {#if isPinned}
          <IconPinFilled size={16} />
        {:else}
          <IconPin size={16} />
        {/if}
      </button>
    {/if}
    {#if markerTitle}
      <div class="markerTooltip__title {isDM ? 'markerTooltip__title--dm' : ''}">{markerTitle}</div>
    {/if}
    {#if markerContent}
      <Editor content={markerContent} editable={false} />
    {/if}
  </div>
{/if}

<style>
  .markerTooltip {
    max-width: 400px;
    background-color: var(--bg);
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 0.25rem;
    box-shadow: var(--shadow-3);
    position: relative;
  }

  .markerTooltip__pin {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: transparent;
    border: none;
    color: var(--fgMuted);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius);
    transition:
      color 0.2s,
      background 0.2s;
  }

  .markerTooltip__pin:hover {
    color: var(--fgPrimary);
    background: var(--bgHover);
  }

  .markerTooltip__title {
    font-weight: 600;
    font-size: 1rem;
    margin-bottom: 0.5rem;
    color: var(--fg);
  }
  .markerTooltip__title--dm {
    padding-right: 2rem;
  }

  .markerTooltip__title:last-child {
    margin-bottom: 0;
  }

  /* Arrow indicator */
  .markerTooltip__arrow {
    position: absolute;
    width: 0;
    height: 0;
    border-style: solid;
    pointer-events: none;
  }

  /* Arrow modifiers for different placements */
  .markerTooltip__arrow--top {
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 8px 8px 0 8px;
    border-color: var(--bg) transparent transparent transparent;
  }

  .markerTooltip__arrow--bottom {
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 0 8px 8px 8px;
    border-color: transparent transparent var(--bg) transparent;
  }

  .markerTooltip__arrow--left {
    right: -8px;
    top: 50%;
    transform: translateY(-50%);
    border-width: 8px 0 8px 8px;
    border-color: transparent transparent transparent var(--bg);
  }

  .markerTooltip__arrow--right {
    left: -8px;
    top: 50%;
    transform: translateY(-50%);
    border-width: 8px 8px 8px 0;
    border-color: transparent var(--bg) transparent transparent;
  }
</style>
