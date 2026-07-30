<script lang="ts">
  import { ToolType, type StageProps } from '@tableslayer/stage';
  let { stageProps }: { stageProps: StageProps } = $props();
  const activeLayer = $derived(stageProps.activeLayer);
  const isPolygonFogTool = $derived(stageProps.fogOfWar.tool.type === ToolType.Polygon);
  const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
</script>

<div class="hints">
  {#if activeLayer === 1}
    {#if isPolygonFogTool}
      {#if isTouch}
        Tap to outline a fog room. <span>Double-tap</span>
        completes it.
        <span>Double-tap</span>
        a room to toggle it,
        <span>press and hold</span>
        to remove it.
      {:else}
        Click to outline a fog room. <span>Enter</span>
        completes it,
        <span>Esc</span>
        cancels.
        <span>Right-click</span>
        toggles a room,
        <span>Delete</span>
        while hovering removes it.
      {/if}
    {:else}
      Click and drag to reveal the fog. <span>F</span>
      to clear,
      <span>Shift + F</span>
      to reset.
    {/if}
  {:else if activeLayer === 2}
    Left-click an empty space to add a new marker. <span>Shift + M</span>
    to exit marker mode.
  {:else if activeLayer === 3}
    Toggle drawing mode with <span>D</span>
    . Use
    <span>mouse wheel</span>
    to adjust size.
  {:else if activeLayer === 4}
    Left-click and drag to measure distance. Use <span>T</span>
    to toggle.
  {/if}
</div>

<style>
  .hints {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    padding: 1rem;
    flex-direction: column;
    font-size: 0.875rem;
    font-weight: 600;
    gap: 1rem;
    z-index: 100;
    color: var(--fgDanger);
    text-shadow:
      0 0 2px rgba(0, 0, 0, 0.8),
      0 0 8px rgba(0, 0, 0, 0.5);
    white-space: nowrap;
  }
  .hints span {
    font-family: var(--font-mono);
    background: var(--contrastLow);
    padding: 0 4px;
    display: inline-block;
    color: var(--fg);
  }

  /* On narrow stages the hint wraps, so anchor it to the bottom away from the toolbar */
  @container stageWrapper (max-width: 768px) {
    .hints {
      white-space: normal;
      text-wrap: balance;
      width: 100%;
      text-align: center;
      top: auto;
      bottom: 3.5rem;
    }
  }
</style>
