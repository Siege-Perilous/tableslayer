<script lang="ts">
  import type { Marker } from '../Stage/components/MarkerLayer/types';
  import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom';
  import { Editor } from '../Editor';
  import { onMount, onDestroy } from 'svelte';
  import { IconPin, IconPinFilled } from '@tabler/icons-svelte';

  interface Props {
    marker: any | null; // Can be either Marker or HoveredMarker
    position: { x: number; y: number } | null;
    containerElement: HTMLElement | null;
    markerDiameter?: number;
    onTooltipHover?: (isHovering: boolean) => void;
    isDM?: boolean;
    isPinned?: boolean;
    onPinToggle?: (markerId: string, pinned: boolean) => void;
  }

  let {
    marker,
    position,
    containerElement,
    markerDiameter = 40,
    onTooltipHover,
    isDM = false,
    isPinned = false,
    onPinToggle
  }: Props = $props();

  let tooltipElement = $state<HTMLDivElement>();
  let portalContainer: HTMLDivElement | undefined = $state();
  let cleanup: (() => void) | null = null;

  function handleTooltipMouseEnter() {
    console.log('[MarkerTooltip] Mouse entered tooltip');
    if (onTooltipHover) {
      onTooltipHover(true);
    }
  }

  function handleTooltipMouseLeave() {
    console.log('[MarkerTooltip] Mouse left tooltip');
    if (onTooltipHover) {
      onTooltipHover(false);
    }
  }

  // Get the content whether it's from marker.note or marker.tooltip.content
  const getMarkerContent = (marker: any) => {
    if (!marker) return null;

    // Check for marker.note (Marker type)
    if (marker.note) {
      return marker.note;
    }

    // Check for marker.tooltip.content (HoveredMarker type)
    if (marker.tooltip?.content) {
      // Parse JSON string back to JSONContent if needed
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

  // Get the title from either marker.title or marker.tooltip.title
  const getMarkerTitle = (marker: any) => {
    if (!marker) return null;

    // Check for marker.title (Marker type)
    if (marker.title) {
      return marker.title;
    }

    // Check for marker.tooltip.title (HoveredMarker type)
    if (marker.tooltip?.title) {
      return marker.tooltip.title;
    }

    return null;
  };

  let markerContent = $derived(getMarkerContent(marker));
  let markerTitle = $derived(getMarkerTitle(marker));
  let markerSize = $derived(marker?.size || 1);

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
    container.style.zIndex = '10000';
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
        const buffer = 20; // Increased from 10 to 20 for more spacing
        const dynamicOffset = markerRadius + buffer;

        const { x, y } = await computePosition(virtualEl, tooltipElement!, {
          placement: 'top',
          middleware: [offset(dynamicOffset), flip(), shift({ padding: 10 })],
          strategy: 'fixed'
        });

        Object.assign(tooltipElement!.style, {
          position: 'fixed',
          left: `${x}px`,
          top: `${y}px`,
          pointerEvents: 'auto'
        });
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
    class="marker-tooltip"
    style="display: none;"
    role="tooltip"
    onmouseenter={handleTooltipMouseEnter}
    onmouseleave={handleTooltipMouseLeave}
  >
    {#if isDM && onPinToggle && marker}
      <button
        class="marker-tooltip__pin"
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
      <div class="marker-tooltip__title">{markerTitle}</div>
    {/if}
    {#if markerContent}
      <Editor content={markerContent} editable={false} />
    {/if}
  </div>
{/if}

<style>
  .marker-tooltip {
    max-width: 400px;
    background: var(--bg);
    padding: 1rem;
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border);
    border-radius: 0.25rem;
    box-shadow: var(--shadow-3);
    position: relative;
  }

  .marker-tooltip__pin {
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

  .marker-tooltip__pin:hover {
    color: var(--fgPrimary);
    background: var(--bgHover);
  }

  .marker-tooltip__title {
    font-weight: 600;
    font-size: var(--text-md);
    margin-bottom: 0.5rem;
    color: var(--fgPrimary);
    padding-right: 2rem; /* Make room for pin button */
  }

  .marker-tooltip__title:last-child {
    margin-bottom: 0;
  }
</style>
