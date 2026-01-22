<script lang="ts">
  import {
    performanceMetrics,
    getAverageFps,
    get1PercentLowFps,
    getFrameTimes
  } from '../../helpers/performanceMetrics.svelte';

  interface Props {
    visible?: boolean;
    disabledLayers?: string[];
  }

  const { visible = true, disabledLayers = [] }: Props = $props();

  const metrics = $derived(performanceMetrics.value);
  const frameTimes = $derived(getFrameTimes());
  const avgFps = $derived(getAverageFps());
  const lowFps = $derived(get1PercentLowFps());

  // Graph dimensions
  const GRAPH_WIDTH = 200;
  const GRAPH_HEIGHT = 60;
  const MAX_FRAME_TIME = 50; // Cap at 50ms (20fps) for graph scale

  // Generate SVG path for frame time graph
  const graphPath = $derived(() => {
    if (frameTimes.length < 2) return '';

    const points = frameTimes.map((ft, i) => {
      const x = (i / (frameTimes.length - 1)) * GRAPH_WIDTH;
      const y = GRAPH_HEIGHT - Math.min(ft / MAX_FRAME_TIME, 1) * GRAPH_HEIGHT;
      return `${x},${y}`;
    });

    return `M${points.join(' L')}`;
  });

  // Color based on FPS
  const fpsColor = $derived(() => {
    const fps = metrics.fps;
    if (fps >= 55) return 'var(--fgSuccess)';
    if (fps >= 30) return 'var(--fgWarning)';
    return 'var(--fgDanger)';
  });
</script>

{#if visible}
  <div class="perfOverlay">
    <div class="perfOverlay__header">Performance</div>

    <div class="perfOverlay__section">
      <div class="perfOverlay__row">
        <span class="perfOverlay__label">FPS</span>
        <span class="perfOverlay__value" style="color: {fpsColor()}">{metrics.fps.toFixed(0)}</span>
      </div>
      <div class="perfOverlay__row">
        <span class="perfOverlay__label">Avg</span>
        <span class="perfOverlay__value">{avgFps.toFixed(0)}</span>
      </div>
      <div class="perfOverlay__row">
        <span class="perfOverlay__label">1% Low</span>
        <span class="perfOverlay__value">{lowFps.toFixed(0)}</span>
      </div>
    </div>

    <div class="perfOverlay__graph">
      <svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT} class="perfOverlay__svg">
        <!-- 60fps line (16.67ms) -->
        <line
          x1="0"
          y1={GRAPH_HEIGHT - (16.67 / MAX_FRAME_TIME) * GRAPH_HEIGHT}
          x2={GRAPH_WIDTH}
          y2={GRAPH_HEIGHT - (16.67 / MAX_FRAME_TIME) * GRAPH_HEIGHT}
          stroke="var(--fgSuccess)"
          stroke-opacity="0.3"
          stroke-width="1"
          stroke-dasharray="4,4"
        />
        <!-- 30fps line (33.33ms) -->
        <line
          x1="0"
          y1={GRAPH_HEIGHT - (33.33 / MAX_FRAME_TIME) * GRAPH_HEIGHT}
          x2={GRAPH_WIDTH}
          y2={GRAPH_HEIGHT - (33.33 / MAX_FRAME_TIME) * GRAPH_HEIGHT}
          stroke="var(--fgWarning)"
          stroke-opacity="0.3"
          stroke-width="1"
          stroke-dasharray="4,4"
        />
        <!-- Frame time path -->
        <path d={graphPath()} fill="none" stroke="var(--fgPrimary)" stroke-width="1.5" />
      </svg>
    </div>

    <div class="perfOverlay__section">
      <div class="perfOverlay__row">
        <span class="perfOverlay__label">Frame</span>
        <span class="perfOverlay__value">{metrics.frameTime.toFixed(2)}ms</span>
      </div>
      <div class="perfOverlay__row">
        <span class="perfOverlay__label">Composer</span>
        <span class="perfOverlay__value">{metrics.composerTime.toFixed(2)}ms</span>
      </div>
      <div class="perfOverlay__row">
        <span class="perfOverlay__label">Overlay</span>
        <span class="perfOverlay__value">{metrics.overlayTime.toFixed(2)}ms</span>
      </div>
    </div>

    <div class="perfOverlay__section">
      <div class="perfOverlay__row">
        <span class="perfOverlay__label">Draw calls</span>
        <span class="perfOverlay__value">{metrics.drawCalls}</span>
      </div>
      <div class="perfOverlay__row">
        <span class="perfOverlay__label">Triangles</span>
        <span class="perfOverlay__value">{metrics.triangles}</span>
      </div>
      <div class="perfOverlay__row">
        <span class="perfOverlay__label">Textures</span>
        <span class="perfOverlay__value">{metrics.textures}</span>
      </div>
      <div class="perfOverlay__row">
        <span class="perfOverlay__label">Geometries</span>
        <span class="perfOverlay__value">{metrics.geometries}</span>
      </div>
    </div>

    {#if disabledLayers.length > 0}
      <div class="perfOverlay__section">
        <div class="perfOverlay__sublabel">Disabled layers</div>
        {#each disabledLayers as layer}
          <div class="perfOverlay__disabledLayer">{layer}</div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .perfOverlay {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    background: rgba(0, 0, 0, 0.85);
    color: var(--fg);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    padding: 0.5rem;
    border-radius: var(--radius-2);
    z-index: 1000;
    pointer-events: none;
    min-width: 14rem;
  }

  .perfOverlay__header {
    font-weight: var(--font-weight-7);
    margin-bottom: 0.5rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--fgMuted);
  }

  .perfOverlay__section {
    margin-bottom: 0.5rem;
  }

  .perfOverlay__section:last-child {
    margin-bottom: 0;
  }

  .perfOverlay__row {
    display: flex;
    justify-content: space-between;
    line-height: var(--font-lineheight-2);
  }

  .perfOverlay__label {
    color: var(--fgMuted);
  }

  .perfOverlay__value {
    font-weight: var(--font-weight-5);
  }

  .perfOverlay__sublabel {
    color: var(--fgMuted);
    font-size: 0.625rem;
    margin-bottom: 0.125rem;
  }

  .perfOverlay__disabledLayer {
    color: var(--fgWarning);
    font-size: 0.625rem;
    padding-left: 0.5rem;
  }

  .perfOverlay__graph {
    margin: 0.5rem 0;
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-1);
    overflow: hidden;
  }

  .perfOverlay__svg {
    display: block;
  }
</style>
